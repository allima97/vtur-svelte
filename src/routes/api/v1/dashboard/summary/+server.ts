import { json } from "@sveltejs/kit";
import {
  getAdminClient,
  getMonthRange,
  hasModuloAccess,
  fetchGestorEquipeIdsComGestor,
  fetchRankingVendedoresByCompanyIds,
  isRankingEligibleUser,
  parseUuidList,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import { fetchVendasKpiReciboContributions } from "$lib/server/vendas-kpis";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";

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

const SUPABASE_IN_BATCH_SIZE = 100;
const DASHBOARD_QUOTES_LIMIT = 20;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function dedupeDashboardQuotes(rows: DashboardQuoteRow[]) {
  const map = new Map<string, DashboardQuoteRow>();
  rows.forEach((row) => {
    const id = String(row?.id || "").trim();
    if (id && !map.has(id)) map.set(id, row);
  });
  return Array.from(map.values())
    .sort((left, right) =>
      String(right.created_at || "").localeCompare(String(left.created_at || "")),
    )
    .slice(0, DASHBOARD_QUOTES_LIMIT);
}

function toNum(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function toDateKey(value?: string | null) {
  return String(value || "").slice(0, 10);
}

async function fetchGestorCompanyScopeIds(
  client: any,
  options: { companyIds?: string[]; userIds?: string[] },
) {
  const companyIds = Array.from(
    new Set(
      (options.companyIds || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );
  const userIds = Array.from(
    new Set(
      (options.userIds || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );

  if (userIds.length === 0 && companyIds.length > 0) {
    return (await fetchRankingVendedoresByCompanyIds(client, companyIds))
      .map((row: any) => String(row?.id || "").trim())
      .filter(Boolean);
  }

  let query = client
    .from("users")
    .select(
      "id, nome_completo, email, active, uso_individual, participa_ranking, user_types(name), company_id",
    )
    .limit(1000);

  if (userIds.length === 1) {
    query = query.eq("id", userIds[0]);
  } else if (userIds.length > 1) {
    query = query.in("id", userIds);
  } else if (companyIds.length === 1) {
    query = query.eq("company_id", companyIds[0]);
  } else if (companyIds.length > 1) {
    query = query.in("company_id", companyIds);
  }

  try {
    const { data, error } = await query;
    if (error) throw error;

    return (data || [])
      .filter((row: any) => {
        if (!row?.id) return false;
        if (row?.active === false) return false;
        if (row?.uso_individual === true) return false;
        if (!isRankingEligibleUser(row)) return false;
        if (companyIds.length > 0)
          return companyIds.includes(String(row?.company_id || "").trim());
        return true;
      })
      .map((row: any) => String(row?.id || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
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
    const requestedVendedorIds = parseUuidList(
      searchParams.get("vendedor_ids") || searchParams.get("vendedor_id"),
    );

    const tipoNome = String(scope.tipoNome || "").toUpperCase();
    const isAdminByType = tipoNome.includes("ADMIN");
    const isGestorByType = tipoNome.includes("GESTOR");
    const isMasterByType = tipoNome.includes("MASTER");
    const responsePapel = isAdminByType
      ? "ADMIN"
      : isMasterByType
        ? "MASTER"
        : isGestorByType
          ? "GESTOR"
          : "VENDEDOR";

    let companyIds: string[] = [];
    let vendedorIds: string[] = [];

    if (isAdminByType) {
      companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
      vendedorIds = requestedVendedorIds;
    } else if (isGestorByType) {
      companyIds = scope.companyId
        ? [scope.companyId]
        : resolveScopedCompanyIds(scope, requestedCompanyId);
      vendedorIds =
        requestedVendedorIds.length > 0
          ? requestedVendedorIds
          : await fetchGestorCompanyScopeIds(client, { companyIds });
    } else if (isMasterByType) {
      companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
      const allowedMasterIds = await fetchGestorCompanyScopeIds(client, {
        companyIds,
      });

      if (requestedVendedorIds.length > 0) {
        vendedorIds = requestedVendedorIds.filter((id) =>
          allowedMasterIds.includes(id),
        );
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
      ttlMs: 15_000,
      tags: [
        READ_MODEL_TAGS.dashboard,
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.conciliacao,
        READ_MODEL_TAGS.quote,
        READ_MODEL_TAGS.metas,
        ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
      ],
      loader: async () => {
        const accessibleClientIds = !scope.isAdmin
          ? await resolveAccessibleClientIds(client, {
              companyIds,
              vendedorIds,
            })
          : [];
        const vendasCanonical = await fetchVendasKpiReciboContributions(
          client,
          {
            dataInicio: inicio,
            dataFim: fim,
            companyIds,
            vendedorIds,
            accessibleClientIds,
          },
        );
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

        // -------------------------------------------------------------------------
        // 5. Metas
        // -------------------------------------------------------------------------
        let metasQuery = client
          .from("metas_vendedor")
          .select(
            "id, vendedor_id, periodo, meta_geral, meta_diferenciada, ativo, scope",
          )
          .eq("ativo", true)
          .gte("periodo", inicio)
          .lte("periodo", fim)
          .limit(500);

        if (vendedorIds.length > 0)
          metasQuery = metasQuery.in("vendedor_id", vendedorIds);

        const { data: metasData, error: metasError } = await metasQuery;
        if (metasError) throw metasError;

        // -------------------------------------------------------------------------
        // 6. Orçamentos
        // -------------------------------------------------------------------------
        let orcamentos: DashboardQuoteRow[] = [];

        if (includeOrcamentos) {
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
            const normalizedIds = Array.from(
              new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)),
            );
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

          if (vendedorIds.length > 0) {
            orcamentos = await fetchQuotesByIds("created_by", vendedorIds);
          } else if (companyIds.length > 0) {
            const clientIds = await resolveAccessibleClientIds(client, {
              companyIds,
              vendedorIds: [],
            });
            orcamentos = await fetchQuotesByIds("client_id", clientIds);
          } else {
            const { data: quotesData, error: quotesError } = await buildQuotesQuery();
            if (quotesError) throw quotesError;
            orcamentos = (quotesData || []) as DashboardQuoteRow[];
          }
        }

        // -------------------------------------------------------------------------
        // 7. Widget prefs
        // -------------------------------------------------------------------------
        const { data: widgetPrefsData } = await client
          .from("dashboard_widgets")
          .select("widget, ordem, visivel, settings")
          .eq("usuario_id", user.id)
          .order("ordem", { ascending: true })
          .limit(100);

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

    return json(payload, {
      headers: {
        "Cache-Control": "private, max-age=5, stale-while-revalidate=20",
        Vary: "Cookie",
      },
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar dashboard.");
  }
}
