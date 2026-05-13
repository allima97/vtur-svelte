import { json } from "@sveltejs/kit";
import {
  getDefaultFollowUpRange,
  isIsoDate,
  resolveFollowUpFilters,
} from "$lib/server/agenda";
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import { syncViagensStatus } from "$lib/server/viagensStatus";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from "$lib/server/httpCache";
import { chunkArray, cleanStringSet, uniqueCleanStrings } from "$lib/utils/array";

type FollowUpClienteRow = {
  id?: string | null;
  nome?: string | null;
  whatsapp?: string | null;
  telefone?: string | null;
};

type FollowUpDestinoRow = {
  id?: string | null;
  nome?: string | null;
};

type FollowUpVendaRow = {
  id?: string | null;
  data_embarque?: string | null;
  data_final?: string | null;
  vendedor_id?: string | null;
  cancelada?: boolean | null;
  cliente_id?: string | null;
  clientes?: FollowUpClienteRow | null;
  destino_cidade?: FollowUpDestinoRow | null;
};

type DashboardFollowUpRow = {
  id?: string | null;
  venda_id?: string | null;
  company_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  status?: string | null;
  follow_up_text?: string | null;
  follow_up_fechado?: boolean | null;
  updated_at?: string | null;
  venda?: FollowUpVendaRow | FollowUpVendaRow[] | null;
  __allClosed?: boolean;
};

type DashboardFollowUpGroupRow = Omit<DashboardFollowUpRow, "venda"> & {
  venda: FollowUpVendaRow | null;
};

function normalizeStatusFilter(value: string | null) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "fechados") return "fechados";
  if (raw === "todos") return "todos";
  return "abertos";
}

function clampIntParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function getVendaFromRow(row: DashboardFollowUpRow) {
  const venda = Array.isArray(row?.venda) ? row.venda[0] : row?.venda;
  return venda && typeof venda === "object" ? venda : null;
}

function hasLinkedVenda(row: DashboardFollowUpRow) {
  return Boolean(
    String(row?.venda_id || getVendaFromRow(row)?.id || "").trim(),
  );
}

function isFollowUpAllowedForVendedores(
  row: DashboardFollowUpRow,
  vendedorIdSet: ReadonlySet<string>,
) {
  const venda = getVendaFromRow(row);

  if (hasLinkedVenda(row)) {
    if (!venda || venda.cancelada === true) return false;
    if (vendedorIdSet.size === 0) return true;
    return vendedorIdSet.has(String(venda.vendedor_id || "").trim());
  }

  // Viagem avulsa não tem venda para comprovar vendedor. Quando há escopo de
  // vendedor, ela não deve aparecer no acompanhamento comercial.
  return vendedorIdSet.size === 0;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    // Follow-up do dashboard é acessível a qualquer usuário autenticado
    // (a verificação de módulo detalhada fica nas rotas de operação completas)

    const defaults = getDefaultFollowUpRange();
    const inicio = String(
      event.url.searchParams.get("inicio") || defaults.inicio,
    ).trim();
    const fim = String(
      event.url.searchParams.get("fim") || defaults.fim,
    ).trim();
    const statusFilter = normalizeStatusFilter(
      event.url.searchParams.get("status"),
    );
    const hasExplicitLimit = event.url.searchParams.has("limit");
    const outputLimit = clampIntParam(
      event.url.searchParams.get("limit"),
      500,
      1,
      500,
    );
    const candidateLimit = hasExplicitLimit
      ? Math.max(40, outputLimit * 8)
      : 500;
    const detailLimit = hasExplicitLimit
      ? Math.max(80, outputLimit * 12)
      : 5000;

    if (!isIsoDate(inicio) || !isIsoDate(fim)) {
      return json(
        { error: "inicio e fim devem estar no formato YYYY-MM-DD." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { companyIds, vendedorIds } = await resolveFollowUpFilters(
      client,
      scope,
      event.url.searchParams,
    );
    const vendaJoin =
      vendedorIds.length > 0 ? "venda:vendas!inner" : "venda:vendas";
    const cacheKey = buildReadModelCacheKey("dashboard:follow-ups", {
      inicio,
      fim,
      statusFilter,
      outputLimit,
      candidateLimit,
      detailLimit,
      companyIds,
      vendedorIds,
      userId: user.id,
    });
    const payload = await getCachedReadModel({
      key: cacheKey,
      tags: [
        READ_MODEL_TAGS.trips,
        READ_MODEL_TAGS.dashboard,
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.clients,
        ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
      ],
      ttlMs: 60_000,
      staleTtlMs: 300_000,
      loader: async () => {
        const vendedorIdSet = cleanStringSet(vendedorIds);
        const buildBaseQuery = (limit: number) =>
          client
            .from("viagens")
            .select(
              `
          id,
          venda_id,
          company_id,
          data_inicio,
          data_fim,
          status,
          follow_up_text,
          follow_up_fechado,
          updated_at,
          ${vendaJoin} (
            id,
            data_embarque,
            data_final,
            vendedor_id,
            cancelada,
            cliente_id,
            clientes:clientes (id, nome, whatsapp, telefone),
            destino_cidade:cidades!destino_cidade_id (id, nome)
          )
        `,
            )
            .not("data_fim", "is", null)
            .or("status.is.null,status.neq.Fechado")
            .eq("venda.cancelada", false)
            .order("data_fim", { ascending: false })
            .limit(limit);

        const applyCommonFilters = (
          query: any,
          options: {
            companyBatch?: string[] | null;
            vendedorBatch?: string[] | null;
            vendaBatch?: string[] | null;
            usePeriod?: boolean;
          },
        ) => {
          let scopedQuery = query;
          if (options.usePeriod !== false) {
            scopedQuery = scopedQuery.gte("data_fim", inicio).lte("data_fim", fim);
          }
          if (statusFilter === "abertos") {
            scopedQuery = scopedQuery.or(
              "follow_up_fechado.is.null,follow_up_fechado.eq.false",
            );
          } else if (statusFilter === "fechados") {
            scopedQuery = scopedQuery.eq("follow_up_fechado", true);
          }
          if (options.companyBatch) scopedQuery = scopedQuery.in("company_id", options.companyBatch);
          if (options.vendedorBatch)
            scopedQuery = scopedQuery.in("venda.vendedor_id", options.vendedorBatch);
          if (options.vendaBatch) scopedQuery = scopedQuery.in("venda_id", options.vendaBatch);
          return scopedQuery;
        };

        const companyBatches = companyIds.length > 0 ? chunkArray(companyIds) : [null];
        const vendedorBatches = vendedorIds.length > 0 ? chunkArray(vendedorIds) : [null];
        const candidatasData: DashboardFollowUpRow[] = [];

        for (const companyBatch of companyBatches) {
          for (const vendedorBatch of vendedorBatches) {
            const { data, error: candidatasError } = await applyCommonFilters(
              buildBaseQuery(candidateLimit),
              { companyBatch, vendedorBatch },
            );
            if (candidatasError) throw candidatasError;
            candidatasData.push(...((data || []) as DashboardFollowUpRow[]));
          }
        }

        const candidatas = candidatasData.filter((row) =>
          isFollowUpAllowedForVendedores(row, vendedorIdSet),
        );
        await syncViagensStatus(client, candidatas);

        const vendaIds = uniqueCleanStrings(
          candidatas.map((row) => row?.venda_id || getVendaFromRow(row)?.id),
        );

        const avulsas = candidatas.filter((row) => !hasLinkedVenda(row));

        let detalhadas: DashboardFollowUpRow[] = [];
        if (vendaIds.length > 0) {
          const detalheRows: DashboardFollowUpRow[] = [];
          for (const vendaBatch of chunkArray(vendaIds)) {
            for (const companyBatch of companyBatches) {
              for (const vendedorBatch of vendedorBatches) {
                const { data, error: detalhadasError } = await applyCommonFilters(
                  buildBaseQuery(detailLimit),
                  { companyBatch, vendedorBatch, vendaBatch, usePeriod: false },
                );
                if (detalhadasError) throw detalhadasError;
                detalheRows.push(...((data || []) as DashboardFollowUpRow[]));
              }
            }
          }
          detalhadas = detalheRows.filter((row) =>
            isFollowUpAllowedForVendedores(row, vendedorIdSet),
          );
          await syncViagensStatus(client, detalhadas);
        }

        const grupos = new Map<string, DashboardFollowUpGroupRow>();

        for (const sourceItem of [...detalhadas, ...avulsas]) {
          const item: DashboardFollowUpGroupRow = {
            ...sourceItem,
            venda: getVendaFromRow(sourceItem),
          };
          const key = String(
            item?.venda_id || item?.venda?.id || item?.id || "",
          ).trim();
          if (!key) continue;

          const fechado = item?.follow_up_fechado === true;
          const existing = grupos.get(key);

          if (!existing) {
            grupos.set(key, {
              ...item,
              __allClosed: fechado,
            });
            continue;
          }

          existing.__allClosed = Boolean(existing.__allClosed) && fechado;
          if (
            item?.data_inicio &&
            (!existing.data_inicio || item.data_inicio < existing.data_inicio)
          ) {
            existing.data_inicio = item.data_inicio;
          }
          if (
            item?.data_fim &&
            (!existing.data_fim || item.data_fim > existing.data_fim)
          ) {
            const savedStart = existing.data_inicio;
            const allClosed = existing.__allClosed;
            Object.assign(existing, item);
            existing.data_inicio = savedStart;
            existing.__allClosed = allClosed;
          }
          if (!existing.follow_up_text && item?.follow_up_text) {
            existing.follow_up_text = item.follow_up_text;
          }
          if (!existing.updated_at && item?.updated_at) {
            existing.updated_at = item.updated_at;
          }
        }

        const items = Array.from(grupos.values())
          .filter((item) => {
            if (statusFilter === "abertos") return item.__allClosed !== true;
            if (statusFilter === "fechados") return item.__allClosed === true;
            return true;
          })
          .filter((item) => {
            const retorno = String(
              item?.data_fim || item?.venda?.data_final || "",
            ).trim();
            return Boolean(retorno) && retorno >= inicio && retorno <= fim;
          })
          .sort((a, b) =>
            String(b?.data_fim || "").localeCompare(String(a?.data_fim || "")),
          )
          .slice(0, outputLimit)
          .map((item) => ({
            id: String(item.id),
            venda_id: item?.venda_id
              ? String(item.venda_id)
              : item?.venda?.id
                ? String(item.venda.id)
                : null,
            cliente_id: item?.venda?.cliente_id
              ? String(item.venda.cliente_id)
              : item?.venda?.clientes?.id
                ? String(item.venda.clientes.id)
                : null,
            cliente_nome: String(
              item?.venda?.clientes?.nome || "Cliente sem nome",
            ),
            cliente_whatsapp: item?.venda?.clientes?.whatsapp
              ? String(item.venda.clientes.whatsapp)
              : null,
            cliente_telefone: item?.venda?.clientes?.telefone
              ? String(item.venda.clientes.telefone)
              : null,
            destino_nome: item?.venda?.destino_cidade?.nome
              ? String(item.venda.destino_cidade.nome)
              : null,
            data_inicio: item?.data_inicio ? String(item.data_inicio) : null,
            data_fim: item?.data_fim ? String(item.data_fim) : null,
            data_embarque: item?.venda?.data_embarque
              ? String(item.venda.data_embarque)
              : null,
            data_final: item?.venda?.data_final
              ? String(item.venda.data_final)
              : null,
            vendedor_id: item?.venda?.vendedor_id
              ? String(item.venda.vendedor_id)
              : null,
            follow_up_fechado: item.__allClosed === true,
            follow_up_text: item?.follow_up_text
              ? String(item.follow_up_text)
              : null,
            updated_at: item?.updated_at ? String(item.updated_at) : null,
          }));

        return { inicio, fim, items };
      },
    });

    return json(payload, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar follow-ups.");
  }
}
