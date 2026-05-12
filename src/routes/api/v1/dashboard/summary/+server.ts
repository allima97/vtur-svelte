import { json } from "@sveltejs/kit";
import {
  getAdminClient,
  getMonthRange,
  hasModuloAccess,
  fetchRankingVendedoresByCompanyIds,
  isRankingEligibleUser,
  parseUuidList,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import { fetchVendasKpiReciboContributionsRaw } from "$lib/server/vendas-kpis";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";
import { cleanStringSet, chunkArray, SUPABASE_IN_BATCH_SIZE, uniqueCleanStrings } from "$lib/utils/array";
import { toFiniteNumber as toNum } from "$lib/utils/values";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DashboardQuoteRow = {
  id: string;
  created_at: string | null;
  status: string | null;
  status_negociacao: string | null;
  total: number | null;
  client_id: string | null;
  cliente?: { id?: string | null; nome?: string | null } | null;
  quote_item?: Array<{
    id?: string | null;
    title?: string | null;
    product_name?: string | null;
    item_type?: string | null;
    city_name?: string | null;
  }> | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DASHBOARD_QUOTES_LIMIT = 20;
const NO_MATCH_USER_ID = "00000000-0000-0000-0000-000000000000";

function dedupeDashboardQuotes(rows: DashboardQuoteRow[]) {
  const map = new Map<string, DashboardQuoteRow>();
  for (const row of rows) {
    const id = String(row?.id || "").trim();
    if (id && !map.has(id)) map.set(id, row);
  }
  return Array.from(map.values())
    .sort((left, right) =>
      String(right.created_at || "").localeCompare(String(left.created_at || "")),
    )
    .slice(0, DASHBOARD_QUOTES_LIMIT);
}

function toDateKey(value?: string | null) {
  return String(value || "").slice(0, 10);
}

async function fetchGestorCompanyScopeIds(
  client: any,
  options: { companyIds?: string[]; userIds?: string[] },
) {
  const companyIds = uniqueCleanStrings(options.companyIds || []);
  const companyIdSet = cleanStringSet(companyIds);
  const userIds = uniqueCleanStrings(options.userIds || []);

  if (userIds.length === 0 && companyIds.length > 0) {
    return getCachedReadModel<string[]>({
      key: buildReadModelCacheKey("dashboard-summary:scope-users-ranking", {
        companyIds,
      }),
      tags: [
        READ_MODEL_TAGS.users,
        ...scopeCacheTags({ companyIds }),
      ],
      ttlMs: 30_000,
      staleTtlMs: 120_000,
      loader: async () =>
        uniqueCleanStrings(
          (await fetchRankingVendedoresByCompanyIds(client, companyIds)).map(
            (row: any) => row?.id,
          ),
        ),
    });
  }

  return getCachedReadModel<string[]>({
    key: buildReadModelCacheKey("dashboard-summary:scope-users", {
      companyIds,
      userIds,
    }),
    tags: [
      READ_MODEL_TAGS.users,
      ...scopeCacheTags({ companyIds, vendedorIds: userIds }),
    ],
    ttlMs: 30_000,
    staleTtlMs: 120_000,
    loader: async () => {
      try {
        const rows: any[] = [];
        const idBatches =
          userIds.length > 0 ? chunkArray(userIds) : companyIds.length > 0 ? [] : [null];
        const companyBatches =
          userIds.length === 0 && companyIds.length > 0 ? chunkArray(companyIds) : [];

        const fetchBatch = async (filters?: { userIds?: string[] | null; companyIds?: string[] | null }) => {
          let query = client
            .from("users")
            .select(
              "id, nome_completo, email, active, uso_individual, participa_ranking, user_types(name), company_id",
            )
            .limit(1000);

          if (filters?.userIds && filters.userIds.length > 0) {
            query =
              filters.userIds.length === 1
                ? query.eq("id", filters.userIds[0])
                : query.in("id", filters.userIds);
          } else if (filters?.companyIds && filters.companyIds.length > 0) {
            query =
              filters.companyIds.length === 1
                ? query.eq("company_id", filters.companyIds[0])
                : query.in("company_id", filters.companyIds);
          }

          const { data, error } = await query;
          if (error) throw error;
          rows.push(...(data || []));
        };

        for (const idBatch of idBatches) await fetchBatch({ userIds: idBatch });
        for (const companyBatch of companyBatches) await fetchBatch({ companyIds: companyBatch });

        const eligibleRows = rows
          .filter((row: any) => {
            if (!row?.id) return false;
            if (row?.active === false) return false;
            if (row?.uso_individual === true) return false;
            if (!isRankingEligibleUser(row)) return false;
            if (companyIds.length > 0)
              return companyIdSet.has(String(row?.company_id || "").trim());
            return true;
          });
        return uniqueCleanStrings(eligibleRows.map((row: any) => row?.id));
      } catch {
        return [];
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const { searchParams } = event.url;
    const { inicio: defaultInicio, fim: defaultFim } = getMonthRange();
    const inicio = String(searchParams.get("inicio") || defaultInicio).trim();
    const fim = String(searchParams.get("fim") || defaultFim).trim();
    const includeOrcamentos =
      String(searchParams.get("include_orcamentos") || "1").trim() === "1";

    const requestedCompanyId = searchParams.get("company_id");
    const requestedVendedorRaw =
      searchParams.get("vendedor_ids") || searchParams.get("vendedor_id");
    const hasRequestedVendedorFilter =
      String(requestedVendedorRaw || "").trim().length > 0;
    const requestedVendedorIds = parseUuidList(requestedVendedorRaw);

    const tipoNome = String(scope.tipoNome || "").toUpperCase();
    const isAdminByType = tipoNome.includes("ADMIN");
    const isFinanceiroByType = tipoNome.includes("FINANCEIRO");
    const isGestorByType = tipoNome.includes("GESTOR");
    const isMasterByType = tipoNome.includes("MASTER");
    const responsePapel = isAdminByType
      ? "ADMIN"
      : isMasterByType
        ? "MASTER"
        : isFinanceiroByType
          ? "FINANCEIRO"
          : isGestorByType
            ? "GESTOR"
            : "VENDEDOR";

    let companyIds: string[] = [];
    let vendedorIds: string[] = [];

    if (isAdminByType) {
      companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
      vendedorIds = requestedVendedorIds;
    } else if (isFinanceiroByType) {
      companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
      const allowedFinanceiroIds = await fetchGestorCompanyScopeIds(client, {
        companyIds,
      });
      const allowedFinanceiroIdSet = new Set(allowedFinanceiroIds);

      vendedorIds =
        hasRequestedVendedorFilter
          ? requestedVendedorIds.filter((id) =>
              allowedFinanceiroIdSet.has(id),
            )
          : [];
      if (hasRequestedVendedorFilter && vendedorIds.length === 0) {
        vendedorIds = [NO_MATCH_USER_ID];
      }
    } else if (isGestorByType) {
      companyIds = scope.companyId
        ? [scope.companyId]
        : resolveScopedCompanyIds(scope, requestedCompanyId);
      const allowedGestorIds = await fetchGestorCompanyScopeIds(client, {
        companyIds,
      });
      const allowedGestorIdSet = new Set(allowedGestorIds);
      vendedorIds =
        hasRequestedVendedorFilter
          ? requestedVendedorIds.filter((id) => allowedGestorIdSet.has(id))
          : allowedGestorIds;
      if (hasRequestedVendedorFilter && vendedorIds.length === 0) {
        vendedorIds = [NO_MATCH_USER_ID];
      }
    } else if (isMasterByType) {
      companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
      const allowedMasterIds = await fetchGestorCompanyScopeIds(client, {
        companyIds,
      });
      const allowedMasterIdSet = new Set(allowedMasterIds);

      if (hasRequestedVendedorFilter) {
        vendedorIds = requestedVendedorIds.filter((id) =>
          allowedMasterIdSet.has(id),
        );
        if (vendedorIds.length === 0) vendedorIds = [NO_MATCH_USER_ID];
      } else {
        vendedorIds = allowedMasterIds;
      }
    } else {
      companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
      vendedorIds = [scope.userId];
    }

    const canOperacao =
      scope.isAdmin || hasModuloAccess(scope, ["operacao"], 1);
    const canConsultoria =
      scope.isAdmin ||
      hasModuloAccess(scope, ["consultoria_online", "consultoria"], 1);

    const dashboardCacheKey = buildReadModelCacheKey("dashboard-summary", {
      userId: user.id,
      papel: responsePapel,
      inicio,
      fim,
      includeOrcamentos,
      companyIds: [...companyIds].sort(),
      vendedorIds: [...vendedorIds].sort(),
    });

    const payload = await getCachedReadModel({
      key: dashboardCacheKey,
      ttlMs: 60_000,      // era 15s — aumentado para 60s; dados de dashboard não precisam de refresh sub-minuto
      staleTtlMs: 300_000, // stale por até 5min enquanto recarrega em background
      tags: [
        READ_MODEL_TAGS.dashboard,
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.conciliacao,
        READ_MODEL_TAGS.quote,
        READ_MODEL_TAGS.metas,
        ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
      ],
      loader: async () => {
        const accessibleClientIds =
          !scope.isAdmin && vendedorIds.length === 0 && companyIds.length === 0
          ? await resolveAccessibleClientIds(client, {
              companyIds,
              vendedorIds,
            })
          : [];
        // -------------------------------------------------------------------------
        // 4-7. Disparar vendas KPIs, metas, orçamentos e widget prefs em paralelo.
        // Antes eram executados sequencialmente: vendas → metas → orçamentos → prefs.
        // Agora rodamos os 4 ao mesmo tempo, reduzindo o tempo total de resposta
        // ao tempo da query mais lenta (geralmente fetchVendasKpiReciboContributions).
        // -------------------------------------------------------------------------

        const buildMetasQuery = () =>
          client
            .from("metas_vendedor")
            .select(
              "id, vendedor_id, periodo, meta_geral, meta_diferenciada, ativo, scope",
            )
            .eq("ativo", true)
            .gte("periodo", inicio)
            .lte("periodo", fim)
            .limit(500);

        const fetchMetasParallel = async (): Promise<any[]> => {
          const rows: any[] = [];
          if (vendedorIds.length > 0) {
            for (const vendedorBatch of chunkArray(vendedorIds)) {
              const { data, error: metasError } = await buildMetasQuery().in("vendedor_id", vendedorBatch);
              if (metasError) throw metasError;
              rows.push(...(data || []));
            }
          } else {
            const { data, error: metasError } = await buildMetasQuery();
            if (metasError) throw metasError;
            rows.push(...(data || []));
          }
          return rows;
        };

        const buildQuotesQuery = () =>
          client
            .from("quote")
            .select(
              `
          id, created_at, status, status_negociacao, total, client_id,
          cliente:client_id (id, nome),
          quote_item (id, title, product_name, item_type, city_name)
        `,
            )
            .gte("created_at", `${inicio}T00:00:00`)
            .lte("created_at", `${fim}T23:59:59.999`)
            .order("created_at", { ascending: false })
            .limit(DASHBOARD_QUOTES_LIMIT);

        const fetchQuotesByIds = async (field: "created_by" | "client_id", ids: string[]) => {
          const normalizedIds = uniqueCleanStrings(ids);
          if (normalizedIds.length === 0) return [] as DashboardQuoteRow[];
          if (normalizedIds.length <= SUPABASE_IN_BATCH_SIZE) {
            const { data, error } = await buildQuotesQuery().in(field, normalizedIds);
            if (error) throw error;
            return (data || []) as DashboardQuoteRow[];
          }
          const rows: DashboardQuoteRow[] = [];
          for (const batch of chunkArray(normalizedIds)) {
            const { data, error } = await buildQuotesQuery().in(field, batch);
            if (error) throw error;
            rows.push(...((data || []) as DashboardQuoteRow[]));
          }
          return dedupeDashboardQuotes(rows);
        };

        const fetchOrcamentosParallel = async (): Promise<DashboardQuoteRow[]> => {
          if (!includeOrcamentos) return [];
          if (vendedorIds.length > 0) {
            return fetchQuotesByIds("created_by", vendedorIds);
          } else if (companyIds.length > 0) {
            const creatorIds = await fetchGestorCompanyScopeIds(client, { companyIds });
            return fetchQuotesByIds("created_by", creatorIds);
          } else {
            const { data: quotesData, error: quotesError } = await buildQuotesQuery();
            if (quotesError) throw quotesError;
            return (quotesData || []) as DashboardQuoteRow[];
          }
        };

        const fetchWidgetPrefsParallel = async () => {
          const { data } = await client
            .from("dashboard_widgets")
            .select("widget, ordem, visivel, settings")
            .eq("usuario_id", user.id)
            .order("ordem", { ascending: true })
            .limit(100);
          return data;
        };

        const [vendasCanonical, metasData, orcamentos, widgetPrefsData] =
          await Promise.all([
            fetchVendasKpiReciboContributionsRaw(client, {
              dataInicio: inicio,
              dataFim: fim,
              companyIds,
              vendedorIds,
              accessibleClientIds,
            }),
            fetchMetasParallel(),
            fetchOrcamentosParallel(),
            fetchWidgetPrefsParallel(),
          ]);

        const vendasKpis = vendasCanonical.agg;

        const timelineMap = new Map<string, number>();
        const destinoMap = new Map<string, number>();
        const destinoCountMap = new Map<string, number>();
        const produtoMap = new Map<
          string,
          { id: string; name: string; value: number }
        >();
        const destinoReceiptCount = new Set<string>();

        vendasCanonical.contributions.forEach((contribution) => {
          const bruto = toNum(contribution.bruto);
          if (bruto <= 0) return;

          const reciboDate = toDateKey(contribution.reciboDate);
          if (reciboDate) {
            timelineMap.set(
              reciboDate,
              (timelineMap.get(reciboDate) || 0) + bruto,
            );
          }

          const destinoNome =
            String(contribution.destinoNome || "").trim() ||
            "Destino nao informado";
          destinoMap.set(
            destinoNome,
            (destinoMap.get(destinoNome) || 0) + bruto,
          );

          const destinoKey = [
            destinoNome,
            contribution.vendaKey,
            contribution.reciboId || contribution.reciboNumero,
          ].join("|");
          if (!destinoReceiptCount.has(destinoKey)) {
            destinoReceiptCount.add(destinoKey);
            destinoCountMap.set(
              destinoNome,
              (destinoCountMap.get(destinoNome) || 0) + 1,
            );
          }

          const productId =
            String(contribution.produtoId || "").trim() || "sem-produto";
          const productName =
            String(contribution.produtoNome || "").trim() || "Produto";
          const curProd = produtoMap.get(productId) || {
            id: productId,
            name: productName,
            value: 0,
          };
          produtoMap.set(productId, {
            ...curProd,
            value: curProd.value + bruto,
          });
        });

        return {
          inicio,
          fim,
          userCtx: {
            usuarioId: user.id,
            nome: scope.nome,
            papel: responsePapel,
            vendedorIds,
          },
          podeVerOperacao: canOperacao,
          podeVerConsultoria: canConsultoria,
          vendasAgg: {
            totalVendas: vendasKpis.totalVendas,
            totalTaxas: vendasKpis.totalTaxas,
            totalLiquido: vendasKpis.totalLiquido,
            totalSeguro: vendasKpis.totalSeguro,
            qtdVendas: vendasKpis.countAtivas,
            ticketMedio:
              vendasKpis.countAtivas > 0
                ? vendasKpis.totalVendas / vendasKpis.countAtivas
                : 0,
            timeline: Array.from(timelineMap.entries()).map(
              ([date, value]) => ({ date, value }),
            ),
            topDestinos: Array.from(destinoMap.entries())
              .map(([name, value]) => ({
                name,
                value,
                count: destinoCountMap.get(name) || 0,
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5),
            porProduto: Array.from(produtoMap.values())
              .sort((a, b) => b.value - a.value)
              .slice(0, 6),
          },
          metas: metasData || [],
          orcamentos,
          widgetPrefs: widgetPrefsData || [],
        };
      },
    });

    return json(payload, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar dashboard.");
  }
}
