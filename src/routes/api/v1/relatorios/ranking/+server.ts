import { json } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  fetchRankingVendedoresByCompanyIds,
  getAdminClient,
  getMonthRange,
  isRankingEligibleUser,
  isTechnicalRankingUserName,
  logServerError,
  parseUuidList,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";

import { fetchVendasKpiReciboContributionsRaw } from "$lib/server/vendas-kpis";
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";
import { addDaysISODate, diffDaysISODate, monthRangeFromKey } from "$lib/date";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";

const NO_MATCH_USER_ID = "00000000-0000-0000-0000-000000000000";
const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function getPreviousPeriod(dataInicio: string, dataFim: string) {
  const diffDays = Math.max(1, (diffDaysISODate(dataInicio, dataFim) ?? 0) + 1);
  const previousEnd = addDaysISODate(dataInicio, -1);
  const previousStart = addDaysISODate(previousEnd, -(diffDays - 1));

  return {
    dataInicio: previousStart,
    dataFim: previousEnd,
  };
}

function normalizeTendencia(currentValue: number, previousValue: number) {
  if (previousValue <= 0 && currentValue <= 0) return "stable";
  if (previousValue <= 0) return "up";

  const variation = ((currentValue - previousValue) / previousValue) * 100;

  if (variation >= 5) return "up";
  if (variation <= -5) return "down";
  return "stable";
}

/**
 * Fonte canônica do ranking: a mesma lista de contribuições usada por KPIs e relatórios.
 * Mantém conciliação, vendas manuais, REXTUR, rateio e regras não-comissionáveis em um só lugar.
 */
async function buildRankingSimple(
  client: any,
  params: {
    dataInicio: string;
    dataFim: string;
    companyIds: string[];
    vendedorIds: string[];
  },
) {
  const { dataInicio, dataFim, companyIds, vendedorIds } = params;
  const canonical = await fetchVendasKpiReciboContributionsRaw(client, {
    dataInicio,
    dataFim,
    companyIds,
    vendedorIds,
  });
  return canonical.contributions.map((item) => ({
    vendaKey: item.vendaKey,
    reciboId: item.reciboId,
    reciboNumero: item.reciboNumero,
    vendedorId: item.vendedorId,
    bruto: item.bruto,
    taxas: item.taxas,
    isSeguro: item.isSeguro,
  }));
}

function getMonthRangeFromKey(monthKey: string) {
  return monthRangeFromKey(monthKey);
}

function hasExplicitVendedorFilter(value?: string | null) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

  return Boolean(normalized) && !["*", "all", "todos", "todas", "todo", "toda", "null", "undefined"].includes(normalized);
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ["relatorios_ranking_vendas", "relatorios", "ranking"],
        1,
        "Sem acesso ao relatório de ranking.",
      );
    }

    const { searchParams } = event.url;
    const currentMonth = getMonthRange();
    const mesParam = String(searchParams.get("mes") || "").trim();
    const mesRange = getMonthRangeFromKey(mesParam);
    let dataInicio = String(
      searchParams.get("data_inicio") ||
        searchParams.get("inicio") ||
        currentMonth.inicio,
    ).trim();
    let dataFim = String(
      searchParams.get("data_fim") ||
        searchParams.get("fim") ||
        currentMonth.fim,
    ).trim();

    if (mesRange) {
      dataInicio = mesRange.inicio;
      dataFim = mesRange.fim;
    }
    const requestedVendedorRaw =
      searchParams.get("vendedor_ids") || searchParams.get("vendedor_id");
    const hasRequestedVendedorFilter =
      hasExplicitVendedorFilter(requestedVendedorRaw);
    const explicitRequestedVendedorIds = parseUuidList(requestedVendedorRaw);
    const companyIds = resolveScopedCompanyIds(
      scope,
      searchParams.get("empresa_id"),
    );
    const tipoNome = String(scope.tipoNome || "").toUpperCase();
    const isAdminByType = tipoNome.includes("ADMIN");
    const isGestorByType = tipoNome.includes("GESTOR");
    const isMasterByType = tipoNome.includes("MASTER");
    const isVendedorByType = tipoNome.includes("VENDEDOR");

    let vendedorIds =
      hasRequestedVendedorFilter && explicitRequestedVendedorIds.length === 0
        ? [NO_MATCH_USER_ID]
        : explicitRequestedVendedorIds;
    const previousPeriod = getPreviousPeriod(dataInicio, dataFim);

    if (isVendedorByType && !isGestorByType && !isMasterByType && !isAdminByType) {
      if (hasRequestedVendedorFilter) {
        vendedorIds = explicitRequestedVendedorIds.includes(user.id)
          ? [user.id]
          : [NO_MATCH_USER_ID];
      } else {
        vendedorIds = [user.id];
      }
    } else if (
      isGestorByType ||
      (!isAdminByType && !isMasterByType && companyIds.length > 0)
    ) {
      // Relatorio de ranking e leitura: gestor e vendedor veem todos os elegiveis da empresa.
      const companyRankingUsers =
        companyIds.length > 0
          ? await fetchRankingVendedoresByCompanyIds(client, companyIds)
          : [];

      const companyEligibleIds = companyRankingUsers
        .map((row: any) => String(row?.id || "").trim())
        .filter(Boolean);

      if (hasRequestedVendedorFilter) {
        const permitidos = new Set(companyEligibleIds);
        vendedorIds = explicitRequestedVendedorIds.filter((id) =>
          permitidos.has(id),
        );
        if (vendedorIds.length === 0) vendedorIds = [NO_MATCH_USER_ID];
      } else {
        vendedorIds = companyEligibleIds;
      }
    }

    if (
      !hasRequestedVendedorFilter &&
      vendedorIds.length === 0 &&
      companyIds.length > 0
    ) {
      const companyUsers = await fetchRankingVendedoresByCompanyIds(
        client,
        companyIds,
      );

      vendedorIds = (companyUsers || [])
        .map((row: any) => String(row?.id || "").trim())
        .filter(Boolean);
    }

    const rankingTeamMap = new Map<string, { id: string; nome: string }>();
    const gestorIdsSet = new Set<string>();
    if (vendedorIds.length > 0) {
      const teamUsers = await getCachedReadModel<any[]>({
        key: buildReadModelCacheKey("ranking:team-users", {
          companyIds,
          vendedorIds,
        }),
        tags: [
          READ_MODEL_TAGS.users,
          READ_MODEL_TAGS.ranking,
          ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
        ],
        ttlMs: 45_000,
        staleTtlMs: 180_000,
        loader: async () => {
          const rows: any[] = [];
          const vendedorBatches = chunkArray(vendedorIds);
          const companyBatches =
            companyIds.length > 0 ? chunkArray(companyIds) : [null];

          for (const vendedorBatch of vendedorBatches) {
            for (const companyBatch of companyBatches) {
              let teamUsersQuery = client
                .from("users")
                .select(
                  "id, nome_completo, email, active, uso_individual, participa_ranking, company_id, user_types(name)",
                )
                .in("id", vendedorBatch)
                .eq("active", true)
                .limit(5000);

              // Restringe ao(s) company_id(s) do escopo para excluir usuários de outras empresas
              if (companyBatch?.length === 1) {
                teamUsersQuery = teamUsersQuery.eq("company_id", companyBatch[0]);
              } else if (companyBatch && companyBatch.length > 1) {
                teamUsersQuery = teamUsersQuery.in("company_id", companyBatch);
              }

              const { data, error: teamUsersError } = await teamUsersQuery;
              if (teamUsersError) throw teamUsersError;
              rows.push(...(data || []));
            }
          }

          return rows;
        },
      });

      const scopedIds: string[] = [];
      (teamUsers || []).forEach((row: any) => {
        const id = String(row?.id || "").trim();
        const isOwnIndividualSeller =
          isVendedorByType && id === user.id && row?.active !== false;
        if (!isOwnIndividualSeller && !isRankingEligibleUser(row)) return;
        const nome = String(row?.nome_completo || row?.email || "Equipe VTUR");
        if (isTechnicalRankingUserName(nome)) return;
        if (!id) return;
        scopedIds.push(id);
        rankingTeamMap.set(id, {
          id,
          nome,
        });
        const userType = Array.isArray(row?.user_types)
          ? row.user_types[0]
          : row?.user_types;
        const roleName = String(userType?.name || "").toUpperCase();
        if (roleName.includes("GESTOR")) {
          gestorIdsSet.add(id);
        }
      });
      vendedorIds = scopedIds;
    }

    if (vendedorIds.length === 0) {
      return json(
        {
          items: [],
          total: 0,
          vendedores: [],
          resumo: {
            meta_mes: 0,
            meta_seguro: 0,
            total_receita: 0,
            total_liquido: 0,
            total_seguro: 0,
            total_comissao: 0,
            total_orcamentos: 0,
            total_vendas: 0,
            total_recibos: 0,
            meta_total: 0,
          },
          periodo: {
            data_inicio: dataInicio,
            data_fim: dataFim,
            anterior_inicio: previousPeriod.dataInicio,
            anterior_fim: previousPeriod.dataFim,
            referencia_mes_atual: getMonthRange(),
          },
        },
        { headers: DYNAMIC_READ_HEADERS }
      );
    }

    let conciliacaoSobrepoeVendas = false;
    let usarTaxasNaMeta = true;
    let focoValor: "bruto" | "liquido" = "bruto";
    if (companyIds.length > 0) {
      const parametrosRows = await getCachedReadModel<any[]>({
        key: buildReadModelCacheKey("ranking:parametros-comissao", {
          companyIds,
        }),
        tags: [
          READ_MODEL_TAGS.comissoes,
          READ_MODEL_TAGS.ranking,
          ...scopeCacheTags({ companyIds, userId: user.id }),
        ],
        ttlMs: 30_000,
        staleTtlMs: 120_000,
        loader: async () => {
          const rows: any[] = [];
          for (const companyBatch of chunkArray(companyIds)) {
            const { data, error: parametrosError } = await client
              .from("parametros_comissao")
              .select(
                "company_id, conciliacao_sobrepoe_vendas, usar_taxas_na_meta, foco_valor",
              )
              .in("company_id", companyBatch)
              .limit(1000);

            if (parametrosError) throw parametrosError;
            rows.push(...(data || []));
          }
          return rows;
        },
      });

      conciliacaoSobrepoeVendas = (parametrosRows || []).some((row: any) =>
        Boolean(row?.conciliacao_sobrepoe_vendas),
      );
      usarTaxasNaMeta = (parametrosRows || []).some((row: any) =>
        Boolean(row?.usar_taxas_na_meta),
      );
      const temFocoLiquido = (parametrosRows || []).some(
        (row: any) => String(row?.foco_valor || "").toLowerCase() === "liquido",
      );
      if (temFocoLiquido) focoValor = "liquido";
    }

    // Montagem simplificada do ranking: conciliação + vendas manuais, dedup por recibo
    const [
      currentContributionsResult,
      quotesDataResult,
      metasDataResult,
    ] = await Promise.allSettled([
      getCachedReadModel({
          key: buildReadModelCacheKey("ranking:contributions", {
            dataInicio,
            dataFim,
            companyIds,
            vendedorIds,
          }),
          tags: [
            READ_MODEL_TAGS.sales,
            READ_MODEL_TAGS.conciliacao,
            READ_MODEL_TAGS.ranking,
            ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
          ],
          ttlMs: 30_000,
          staleTtlMs: 120_000,
          loader: () =>
            buildRankingSimple(client, {
              dataInicio,
              dataFim,
              companyIds,
              vendedorIds,
            }),
      }),
      getCachedReadModel({
          key: buildReadModelCacheKey("ranking:quotes", {
            dataInicio,
            dataFim,
            vendedorIds,
          }),
          tags: [
            READ_MODEL_TAGS.quote,
            READ_MODEL_TAGS.ranking,
            ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
          ],
          ttlMs: 30_000,
          staleTtlMs: 120_000,
          loader: async () => {
            const rows: any[] = [];
            const vendedorBatches =
              vendedorIds.length > 0 ? chunkArray(vendedorIds) : [null];
            for (const vendedorBatch of vendedorBatches) {
              let query = client
                .from("quote")
                .select("id, created_by, total")
                .gte("created_at", `${dataInicio}T00:00:00`)
                .lte("created_at", `${dataFim}T23:59:59.999`)
                .limit(5000);

              if (vendedorBatch) {
                query = query.in("created_by", vendedorBatch);
              }

              const { data, error } = await query;
              if (error) throw error;
              rows.push(...(data || []));
            }
            return rows;
          },
      }),
      getCachedReadModel({
          key: buildReadModelCacheKey("ranking:metas", {
            mes: dataInicio.slice(0, 7),
            vendedorIds,
          }),
          tags: [
            READ_MODEL_TAGS.metas,
            READ_MODEL_TAGS.ranking,
            ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
          ],
          ttlMs: 30_000,
          staleTtlMs: 120_000,
          loader: async () => {
            const metasReference =
              getMonthRangeFromKey(dataInicio.slice(0, 7)) || getMonthRange();
            const rows: any[] = [];
            const vendedorBatches =
              vendedorIds.length > 0 ? chunkArray(vendedorIds) : [null];
            for (const vendedorBatch of vendedorBatches) {
              let query = client
                .from("metas_vendedor")
                .select(
                  "id, vendedor_id, meta_geral, meta_diferenciada, periodo, ativo",
                )
                .eq("ativo", true)
                .gte("periodo", metasReference.inicio)
                .lte("periodo", metasReference.fim)
                .limit(1000);

              if (vendedorBatch) {
                query = query.in("vendedor_id", vendedorBatch);
              }

              const { data, error } = await query;
              if (error) {
                logServerError("[ranking] Erro ao buscar metas", error);
                return [];
              }
              rows.push(...(data || []));
            }
            return rows;
          },
      }),
    ]);

    if (currentContributionsResult.status === "rejected") {
      throw currentContributionsResult.reason;
    }

    if (quotesDataResult.status === "rejected") {
      logServerError("[ranking] Erro ao buscar orcamentos", quotesDataResult.reason);
    }
    if (metasDataResult.status === "rejected") {
      logServerError("[ranking] Erro ao buscar metas", metasDataResult.reason);
    }

    const currentContributions = currentContributionsResult.value || [];
    const quotesData =
      quotesDataResult.status === "fulfilled" ? quotesDataResult.value || [] : [];
    const metasData =
      metasDataResult.status === "fulfilled" ? metasDataResult.value || [] : [];

    const rankingMap = new Map<
      string,
      {
        vendedor_id: string;
        vendedor_nome: string;
        total_vendas: number;
        total_recibos: number;
        total_receita: number;
        total_liquido: number;
        total_comissao: number;
        total_orcamentos: number;
        meta: number;
        meta_seguro: number;
        total_seguro: number;
        base_meta: number;
      }
    >();
    const previousRevenueMap = new Map<string, number>();
    const salesCountMap = new Map<string, Set<string>>();
    const receiptCountMap = new Map<string, Set<string>>();

    rankingTeamMap.forEach((teamUser) => {
      rankingMap.set(teamUser.id, {
        vendedor_id: teamUser.id,
        vendedor_nome: teamUser.nome,
        total_vendas: 0,
        total_recibos: 0,
        total_receita: 0,
        total_liquido: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0,
        meta_seguro: 0,
        total_seguro: 0,
        base_meta: 0,
      });
    });

    currentContributions.forEach((contribution) => {
      const vendedorId = String(contribution.vendedorId || "").trim();
      if (!vendedorId) return;
      const vendedorNomeFallback =
        rankingTeamMap.get(vendedorId)?.nome || vendedorId;

      const current = rankingMap.get(vendedorId) || {
        vendedor_id: vendedorId,
        vendedor_nome: vendedorNomeFallback,
        total_vendas: 0,
        total_recibos: 0,
        total_receita: 0,
        total_liquido: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0,
        meta_seguro: 0,
        total_seguro: 0,
        base_meta: 0,
      };

      const saleKey =
        String(contribution.vendaKey || "").trim() || `sale:${vendedorId}`;
      const receiptKey = `${saleKey}::${String(contribution.reciboId || contribution.reciboNumero || "").trim()}`;
      const salesSet = salesCountMap.get(vendedorId) || new Set<string>();
      salesSet.add(saleKey);
      salesCountMap.set(vendedorId, salesSet);
      const receiptsSet = receiptCountMap.get(vendedorId) || new Set<string>();
      if (receiptKey !== `${saleKey}::`) receiptsSet.add(receiptKey);
      receiptCountMap.set(vendedorId, receiptsSet);

      current.total_receita += Number(contribution.bruto || 0);
      current.total_comissao += Number(contribution.taxas || 0);
      current.total_liquido +=
        Number(contribution.bruto || 0) - Number(contribution.taxas || 0);
      if (contribution.isSeguro) {
        current.total_seguro += Number(contribution.bruto || 0);
      }
      rankingMap.set(vendedorId, current);
    });

    rankingMap.forEach((current, vendedorId) => {
      current.total_vendas = salesCountMap.get(vendedorId)?.size || 0;
      current.total_recibos = receiptCountMap.get(vendedorId)?.size || 0;
    });

    (quotesData || []).forEach((quote: any) => {
      const vendedorId = String(quote?.created_by || "").trim();
      if (!vendedorId) return;

      const current = rankingMap.get(vendedorId) || {
        vendedor_id: vendedorId,
        vendedor_nome: "Equipe VTUR",
        total_vendas: 0,
        total_recibos: 0,
        total_receita: 0,
        total_liquido: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0,
        meta_seguro: 0,
        total_seguro: 0,
        base_meta: 0,
      };

      current.total_orcamentos += 1;
      rankingMap.set(vendedorId, current);
    });

    (metasData || []).forEach((meta: any) => {
      const vendedorId = String(meta?.vendedor_id || "").trim();
      if (!vendedorId) return;

      const current = rankingMap.get(vendedorId) || {
        vendedor_id: vendedorId,
        vendedor_nome: "Equipe VTUR",
        total_vendas: 0,
        total_recibos: 0,
        total_receita: 0,
        total_liquido: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0,
        meta_seguro: 0,
        total_seguro: 0,
        base_meta: 0,
      };

      current.meta += Number(meta?.meta_geral || 0);
      current.meta_seguro += Number(meta?.meta_diferenciada || 0);
      rankingMap.set(vendedorId, current);
    });

    const missingNameIds = Array.from(rankingMap.values())
      .filter((item) => item.vendedor_nome === "Equipe VTUR")
      .map((item) => item.vendedor_id);

    if (missingNameIds.length > 0) {
      for (const idBatch of chunkArray(missingNameIds)) {
        const { data: usersData, error: usersError } = await client
          .from("users")
          .select("id, nome_completo, email")
          .in("id", idBatch);

        if (usersError) throw usersError;

        (usersData || []).forEach((row: any) => {
          const key = String(row.id || "").trim();
          const current = rankingMap.get(key);
          if (!current) return;
          current.vendedor_nome = String(
            row.nome_completo || row.email || current.vendedor_nome,
          );
        });
      }
    }

    let items = Array.from(rankingMap.values())
      .map((item) => {
        const totalLiquido = item.total_liquido;
        const ticketMedio =
          item.total_vendas > 0 ? item.total_receita / item.total_vendas : 0;
        const taxaConversao =
          item.total_orcamentos > 0
            ? (item.total_vendas / item.total_orcamentos) * 100
            : 0;
        // Paridade vtur-app: base da meta respeita foco_valor e usar_taxas_na_meta
        const baseMeta =
          focoValor === "liquido"
            ? totalLiquido
            : usarTaxasNaMeta
              ? item.total_receita
              : totalLiquido;
        const alcanceMeta = item.meta > 0 ? (baseMeta / item.meta) * 100 : 0;
        const alcanceMetaSeguro =
          item.meta_seguro > 0
            ? (item.total_seguro / item.meta_seguro) * 100
            : 0;
        const previousRevenue = previousRevenueMap.get(item.vendedor_id) || 0;

        return {
          ...item,
          base_meta: baseMeta,
          total_liquido: totalLiquido,
          ticket_medio: ticketMedio,
          taxa_conversao: taxaConversao,
          alcance_meta: alcanceMeta,
          alcance_meta_seguro: alcanceMetaSeguro,
          tendencia: previousRevenueMap.size > 0
            ? normalizeTendencia(item.total_receita, previousRevenue)
            : "stable",
        };
      })
      .sort((left, right) => {
        // Paridade vtur-app: gestores sempre ficam depois dos vendedores
        const leftGestor = gestorIdsSet.has(left.vendedor_id);
        const rightGestor = gestorIdsSet.has(right.vendedor_id);
        if (leftGestor !== rightGestor) return leftGestor ? 1 : -1;
        return right.total_receita - left.total_receita;
      })
      .map((item, index) => ({
        ...item,
        posicao: index + 1,
        // Parity alias: provide a shorter alias for consumer templates
        vendedor: item.vendedor_nome,
        vendedor_label: item.vendedor_nome,
        // Additional parity alias for templates that expect 'nome'
        nome: item.vendedor_nome,
        // Additional small parity alias for templates that expect a shorter display name
        vendedor_display: item.vendedor_nome,
        periodo_inicio: dataInicio,
        periodo_fim: dataFim,
        periodo_label: `${dataInicio} - ${dataFim}`,
        periodoLabel: `${dataInicio} - ${dataFim}`,
        periodo_display: `${dataInicio} a ${dataFim}`,
        periodo_display_alt: `${dataInicio} a ${dataFim}`,
        periodo_text: `${dataInicio} - ${dataFim}`,
        periodo_full: `${dataInicio} - ${dataFim}`,
        periodo_range_label: `${dataInicio} - ${dataFim}`,
        vendedor_short: (item.vendedor_nome ?? "").toString().slice(0, 20),
        vendedorDisplay: item.vendedor_nome,
        vendedor_slug: String(item.vendedor_nome ?? "")
          .toLowerCase()
          .replace(/\\s+/g, "-")
          .replace(/[^a-z0-9\\-]/g, ""),
        vendedor_name_for_template: item.vendedor_nome,
        periodo_range: `${dataInicio} - ${dataFim}`,
        vendedor_full: item.vendedor_nome,
        ranking_key: item.vendedor_id,
        ranking_user_slug: String(item.vendedor_nome ?? "")
          .toLowerCase()
          .replace(/\\s+/g, "-")
          .replace(/[^a-z0-9\\-]/g, ""),
        ranking_user_id: item.vendedor_id,
        ranking_user_nome: item.vendedor_nome,
        ranking_user_display: item.vendedor_nome,
        ranking_user_name: item.vendedor_nome,
        // New parity fields for templates
        ranking_user_initials: (item.vendedor_nome ?? "")
          .split(/\s+/)
          .map((s) => s.charAt(0))
          .join("")
          .slice(0, 4),
        ranking_user_profile: `/profiles/${(item.vendedor_id ?? "").toString()}`,
        ranking_source: "vtur-app",
        ranking_version: "1.0",
        ranking_group: "default",
        ranking_last_seen: null,
        ranking_origin_slug: String(item.vendedor_nome ?? "")
          .toLowerCase()
          .replace(/\\s+/g, "-")
          .replace(/[^a-z0-9\\-]/g, ""),
        ranking_origin_id: item.vendedor_id,
        ranking_origin_name: item.vendedor_nome,
        ranking_origin_display: item.vendedor_nome,
        ranking_origin_code: String(item.vendedor_nome ?? "")
          .split(/\\s+/)
          .map((s) => s.charAt(0))
          .join("")
          .toUpperCase(),
      }));

    const vendedores = items.map((item) => ({
      id: item.vendedor_id,
      nome: item.vendedor_nome,
    }));

    return json(
      {
        items,
        total: items.length,
        vendedores,
        resumo: {
          meta_mes: items.reduce((sum, item) => sum + item.meta, 0),
          meta_seguro: items.reduce((sum, item) => sum + item.meta_seguro, 0),
          total_receita: items.reduce((sum, item) => sum + item.total_receita, 0),
          total_liquido: items.reduce((sum, item) => sum + item.total_liquido, 0),
          total_seguro: items.reduce((sum, item) => sum + item.total_seguro, 0),
          total_comissao: items.reduce(
            (sum, item) => sum + item.total_comissao,
            0,
          ),
          total_orcamentos: items.reduce(
            (sum, item) => sum + item.total_orcamentos,
            0,
          ),
          total_vendas: items.reduce((sum, item) => sum + item.total_vendas, 0),
          total_recibos: items.reduce((sum, item) => sum + item.total_recibos, 0),
          meta_total: items.reduce((sum, item) => sum + item.meta, 0),
        },
        periodo: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          anterior_inicio: previousPeriod.dataInicio,
          anterior_fim: previousPeriod.dataFim,
          referencia_mes_atual: getMonthRange(),
        },
      },
      { headers: DYNAMIC_READ_HEADERS }
    );
  } catch (err) {
    logServerError("[ranking] erro ao carregar ranking", err);
    return toErrorResponse(err, "Erro ao carregar ranking.");
  }
}
