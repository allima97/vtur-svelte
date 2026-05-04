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

const SUPABASE_IN_BATCH_SIZE = 100;
const DEFAULT_LIST_LIMIT = 300;
const MAX_LIST_LIMIT = 500;

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

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
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

    const vendedorTagIds =
      !scope.isAdmin && scope.usoIndividual ? [user.id] : [];
    const cacheKey = buildReadModelCacheKey("viagens:list", {
      status,
      periodo,
      ordenar,
      companyIds,
      page,
      limit,
      userId: user.id,
      isAdmin: scope.isAdmin,
      usoIndividual: scope.usoIndividual,
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
        let query = client
          .from("viagens")
          .select(
            `
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
      `,
          )
          .range(from, to);

        if (ordenar === "embarque_desc") {
          query = query
            .order("data_inicio", { ascending: false, nullsFirst: false })
            .order("data_fim", { ascending: false, nullsFirst: false });
        } else if (ordenar === "retorno_asc") {
          query = query
            .order("data_fim", { ascending: true, nullsFirst: false })
            .order("data_inicio", { ascending: true, nullsFirst: false });
        } else if (ordenar === "cadastro_desc") {
          query = query
            .order("created_at", { ascending: false, nullsFirst: false })
            .order("data_inicio", { ascending: true, nullsFirst: false });
        } else {
          query = query
            .order("data_inicio", { ascending: true, nullsFirst: false })
            .order("data_fim", { ascending: true, nullsFirst: false });
        }

        // Filtro por empresa — igual ao vtur-app
        if (companyIds.length > 0) {
          query = query.in("company_id", companyIds);
        }

        // Uso individual (vendedor que só vê as próprias viagens) — igual ao vtur-app
        // Gestor/Master veem todas da empresa; apenas uso_individual restringe por responsável
        if (!scope.isAdmin && scope.usoIndividual) {
          query = query.eq("responsavel_user_id", user.id);
        }

        const normalizedStatus = normalizeViagemStatus(status);
        const hasStatusFilter =
          Boolean(String(status || "").trim()) &&
          String(status || "")
            .trim()
            .toLowerCase() !== "todas";

        const periodoFilter = getPeriodoFilter(periodo);
        if (periodoFilter?.from && periodoFilter?.to) {
          query = query
            .gte("data_inicio", periodoFilter.from)
            .lte("data_inicio", periodoFilter.to + "T23:59:59");
        }

        const { data, error } = await query;
        if (error) throw error;
        const scopedData = data || [];
        const resolvedStatuses = await syncViagensStatus(
          client,
          scopedData as any[],
        );

        const clienteIds = [
          ...new Set(
            (scopedData || []).map((v: any) => v.cliente_id).filter(Boolean),
          ),
        ];
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

        const responsavelIds = [
          ...new Set(
            (scopedData || [])
              .map((v: any) => v.responsavel_user_id)
              .filter(Boolean),
          ),
        ];
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

        const vendaIds = [
          ...new Set(
            (scopedData || []).map((v: any) => v.venda_id).filter(Boolean),
          ),
        ];
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
