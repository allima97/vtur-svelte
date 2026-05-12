import { json } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import { addDaysISODate, todayISODateLocal } from "$lib/date";
import { normalizeViagemStatus } from "$lib/viagens/status";
import { syncViagensStatus } from "$lib/server/viagensStatus";
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";
import { chunkArray, SUPABASE_IN_BATCH_SIZE } from "$lib/utils/array";

const DEFAULT_LIST_LIMIT = 300;
const MAX_LIST_LIMIT = 500;
const VIAGENS_LIST_SELECT = `
  id,
  venda_id,
  orcamento_id,
  cliente_id,
  company_id,
  responsavel_user_id,
  origem,
  destino,
  data_inicio,
  data_fim,
  status,
  observacoes,
  follow_up_text,
  follow_up_fechado,
  recibo_id,
  created_at,
  updated_at
`;

function clampInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function getPeriodoFilter(
  periodo: string | null,
): { from?: string; to?: string } | null {
  if (!periodo) return null;

  const hojeStr = todayISODateLocal();

  switch (periodo) {
    case "hoje": {
      return { from: hojeStr, to: hojeStr };
    }
    case "semana": {
      return { from: hojeStr, to: addDaysISODate(hojeStr, 7) };
    }
    case "quinzena": {
      return { from: hojeStr, to: addDaysISODate(hojeStr, 15) };
    }
    case "mes": {
      return { from: hojeStr, to: addDaysISODate(hojeStr, 30) };
    }
    case "proximos_30": {
      return { from: hojeStr, to: addDaysISODate(hojeStr, 30) };
    }
    default:
      return null;
  }
}

function compareNullableDate(
  a: string | null | undefined,
  b: string | null | undefined,
  ascending: boolean,
) {
  const left = String(a || "").trim();
  const right = String(b || "").trim();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return ascending ? left.localeCompare(right) : right.localeCompare(left);
}

function sortViagemRows(rows: any[], ordenar: string) {
  return [...rows].sort((a, b) => {
    if (ordenar === "embarque_desc") {
      return (
        compareNullableDate(a?.data_inicio, b?.data_inicio, false) ||
        compareNullableDate(a?.data_fim, b?.data_fim, false)
      );
    }
    if (ordenar === "retorno_asc") {
      return (
        compareNullableDate(a?.data_fim, b?.data_fim, true) ||
        compareNullableDate(a?.data_inicio, b?.data_inicio, true)
      );
    }
    if (ordenar === "cadastro_desc") {
      return (
        compareNullableDate(a?.created_at, b?.created_at, false) ||
        compareNullableDate(a?.data_inicio, b?.data_inicio, true)
      );
    }
    return (
      compareNullableDate(a?.data_inicio, b?.data_inicio, true) ||
      compareNullableDate(a?.data_fim, b?.data_fim, true)
    );
  });
}

function mergeUniqueViagemRows(...groups: any[][]) {
  const byId = new Map<string, any>();
  groups.flat().forEach((row) => {
    const id = String(row?.id || "").trim();
    if (id && !byId.has(id)) byId.set(id, row);
  });
  return Array.from(byId.values());
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ["operacao_viagens", "Viagens", "viagens", "operacao"],
        1,
        "Sem acesso a Viagens.",
      );
    }

    const { searchParams } = event.url;
    const status = searchParams.get("status");
    const periodo = searchParams.get("periodo");
    const ordenar = String(searchParams.get("ordenar") || "embarque_asc")
      .trim()
      .toLowerCase();
    const companyIds = resolveScopedCompanyIds(
      scope,
      searchParams.get("empresa_id"),
    );
    const page = clampInt(searchParams.get("page"), 1, 1, 10_000);
    const limit = clampInt(
      searchParams.get("limit"),
      DEFAULT_LIST_LIMIT,
      1,
      MAX_LIST_LIMIT,
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Guard: sem empresa identificada, retorna vazio (exceto admin)
    if (!scope.isAdmin && companyIds.length === 0) {
      return json({ items: [], total: 0 }, { headers: DYNAMIC_READ_HEADERS });
    }

    const vendedorTagIds = scope.isVendedor ? [user.id] : [];
    const cacheKey = buildReadModelCacheKey("viagens:list", {
      status,
      periodo,
      ordenar,
      companyIds,
      page,
      limit,
      userId: user.id,
      isAdmin: scope.isAdmin,
      isVendedor: scope.isVendedor,
    });
    const payload = await getCachedReadModel({
      key: cacheKey,
      tags: [
        READ_MODEL_TAGS.trips,
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.clients,
        READ_MODEL_TAGS.users,
        READ_MODEL_TAGS.dashboard,
        ...scopeCacheTags({
          companyIds,
          vendedorIds: vendedorTagIds,
          userId: user.id,
        }),
      ],
      ttlMs: 20_000,
      staleTtlMs: 90_000,
      loader: async () => {
        const normalizedStatus = normalizeViagemStatus(status);
        const hasStatusFilter =
          Boolean(String(status || "").trim()) &&
          String(status || "")
            .trim()
            .toLowerCase() !== "todas";

        const periodoFilter = getPeriodoFilter(periodo);

        const applyOrdering = (query: any) => {
          if (ordenar === "embarque_desc") {
            return query
              .order("data_inicio", { ascending: false, nullsFirst: false })
              .order("data_fim", { ascending: false, nullsFirst: false });
          }
          if (ordenar === "retorno_asc") {
            return query
              .order("data_fim", { ascending: true, nullsFirst: false })
              .order("data_inicio", { ascending: true, nullsFirst: false });
          }
          if (ordenar === "cadastro_desc") {
            return query
              .order("created_at", { ascending: false, nullsFirst: false })
              .order("data_inicio", { ascending: true, nullsFirst: false });
          }
          return query
            .order("data_inicio", { ascending: true, nullsFirst: false })
            .order("data_fim", { ascending: true, nullsFirst: false });
        };

        const buildQuery = (selectFields: string, companyIdsFilter = companyIds) => {
          let query = client.from("viagens").select(selectFields);

          if (companyIdsFilter.length > 0) {
            query = query.in("company_id", companyIdsFilter);
          }

          if (periodoFilter?.from && periodoFilter?.to) {
            query = query
              .gte("data_inicio", periodoFilter.from)
              .lte("data_inicio", periodoFilter.to + "T23:59:59");
          }

          return applyOrdering(query);
        };

        const fetchBatchedViagens = async (
          selectFields: string,
          configure: (query: any) => any,
          limitRows: number,
        ) => {
          const companyBatches = companyIds.length > SUPABASE_IN_BATCH_SIZE ? chunkArray(companyIds) : [companyIds];
          const rows: any[] = [];
          for (const batch of companyBatches) {
            const result = await configure(buildQuery(selectFields, batch)).limit(limitRows);
            if (result.error) throw result.error;
            rows.push(...(result.data || []));
          }
          return rows;
        };

        let scopedData: any[] = [];

        if (scope.isVendedor) {
          const candidateLimit = Math.min(
            MAX_LIST_LIMIT,
            Math.max(limit, to + 1),
          );
          const [responsavelRows, vendaRows] = await Promise.all([
            fetchBatchedViagens(
              VIAGENS_LIST_SELECT,
              (query) => query.eq("responsavel_user_id", user.id),
              candidateLimit,
            ),
            fetchBatchedViagens(
              `${VIAGENS_LIST_SELECT}, venda:vendas!inner(id, vendedor_id)`,
              (query) => query.eq("venda.vendedor_id", user.id),
              candidateLimit,
            ),
          ]);

          scopedData = sortViagemRows(
            mergeUniqueViagemRows(
              responsavelRows,
              vendaRows,
            ),
            ordenar,
          ).slice(from, to + 1);
        } else if (companyIds.length > SUPABASE_IN_BATCH_SIZE) {
          const rows = await fetchBatchedViagens(VIAGENS_LIST_SELECT, (query) => query, to + 1);
          scopedData = sortViagemRows(mergeUniqueViagemRows(rows), ordenar).slice(from, to + 1);
        } else {
          const { data, error } = await buildQuery(VIAGENS_LIST_SELECT).range(
            from,
            to,
          );
          if (error) throw error;
          scopedData = data || [];
        }

        const resolvedStatuses = await syncViagensStatus(
          client,
          scopedData as any[],
        );

        const clienteIdSet = new Set<string>();
        for (const viagem of scopedData || []) {
          if (viagem.cliente_id) clienteIdSet.add(viagem.cliente_id);
        }
        const clienteIds = Array.from(clienteIdSet);
        const clientesMap = new Map<string, string>();
        if (clienteIds.length > 0) {
          for (const batch of chunkArray(clienteIds)) {
            const { data: clientesData, error: clientesError } = await client
              .from("clientes")
              .select("id, nome")
              .in("id", batch);
            if (clientesError) throw clientesError;
            (clientesData || []).forEach((c: any) =>
              clientesMap.set(c.id, c.nome),
            );
          }
        }

        const responsavelIdSet = new Set<string>();
        for (const viagem of scopedData || []) {
          if (viagem.responsavel_user_id) responsavelIdSet.add(viagem.responsavel_user_id);
        }
        const responsavelIds = Array.from(responsavelIdSet);
        const responsaveisMap = new Map<string, string>();
        if (responsavelIds.length > 0) {
          for (const batch of chunkArray(responsavelIds)) {
            const { data: responsaveisData, error: responsaveisError } =
              await client
                .from("users")
                .select("id, nome_completo")
                .in("id", batch);
            if (responsaveisError) throw responsaveisError;
            (responsaveisData || []).forEach((u: any) =>
              responsaveisMap.set(u.id, u.nome_completo),
            );
          }
        }

        const viagemIds = (scopedData || []).map((v: any) => v.id);
        const passageirosCountMap = new Map<string, number>();
        if (viagemIds.length > 0) {
          for (const batch of chunkArray(viagemIds)) {
            const { data: passageirosData, error: passageirosError } =
              await client
                .from("viagem_passageiros")
                .select("viagem_id")
                .in("viagem_id", batch);
            if (passageirosError) throw passageirosError;
            (passageirosData || []).forEach((p: any) => {
              passageirosCountMap.set(
                p.viagem_id,
                (passageirosCountMap.get(p.viagem_id) || 0) + 1,
              );
            });
          }
        }

        const vendaIdSet = new Set<string>();
        for (const viagem of scopedData || []) {
          if (viagem.venda_id) vendaIdSet.add(viagem.venda_id);
        }
        const vendaIds = Array.from(vendaIdSet);
        const vendasMap = new Map<string, number>();
        if (vendaIds.length > 0) {
          for (const batch of chunkArray(vendaIds)) {
            const { data: vendasData, error: vendasError } = await client
              .from("vendas")
              .select("id, valor_total")
              .in("id", batch);
            if (vendasError) throw vendasError;
            (vendasData || []).forEach((v: any) =>
              vendasMap.set(v.id, v.valor_total),
            );
          }
        }

        const internacionalKeywords = [
          "europa",
          "asia",
          "africa",
          "oceania",
          "américa do norte",
          "eua",
          "canada",
          "mexico",
          "caribe",
          "orlando",
          "miami",
          "new york",
          "paris",
          "londres",
          "italia",
          "espanha",
          "portugal",
        ];

        const items = (scopedData || [])
          .map((row: any) => {
            const resolvedStatus =
              resolvedStatuses.get(row.id) || normalizeViagemStatus(row.status);
            const numPassageiros = passageirosCountMap.get(row.id) || 1;
            const valorVenda = row.venda_id
              ? vendasMap.get(row.venda_id) || 0
              : 0;
            const tipoViagem =
              row.destino &&
              internacionalKeywords.some((k) =>
                row.destino.toLowerCase().includes(k),
              )
                ? "internacional"
                : "nacional";

            return {
              id: row.id,
              venda_id: row.venda_id,
              orcamento_id: row.orcamento_id,
              cliente_id: row.cliente_id,
              cliente_nome:
                clientesMap.get(row.cliente_id) || "Cliente não encontrado",
              destino: row.destino || row.origem || "Destino não informado",
              origem: row.origem,
              data_inicio: row.data_inicio,
              data_fim: row.data_fim,
              status: resolvedStatus,
              observacoes: row.observacoes || "",
              follow_up_text: row.follow_up_text || "",
              follow_up_fechado: row.follow_up_fechado || false,
              recibo_id: row.recibo_id,
              numero_passageiros: numPassageiros,
              tipo_viagem: tipoViagem,
              valor_total: valorVenda,
              responsavel_nome:
                responsaveisMap.get(row.responsavel_user_id) || "Não atribuído",
              created_at: row.created_at,
            };
          })
          .filter(
            (item: any) => !hasStatusFilter || item.status === normalizedStatus,
          );

        return {
          items,
          total: items.length,
          page,
          limit,
          hasMore: scopedData.length === limit,
        };
      },
    });

    return json(payload, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar viagens.");
  }
}
