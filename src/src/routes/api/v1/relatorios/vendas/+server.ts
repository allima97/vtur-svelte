import { json } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  logServerError,
  NO_MATCH_COMPANY_ID,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import {
  fetchLatestPaymentForms,
  fetchSalesReportRows,
  type ReportReceiptRow,
  getCurrentYearRange,
  getReceiptCidadeNome,
  getReceiptProductDescriptor,
  getVendaClienteNome,
  getVendaCodigo,
  getVendaDestino,
  getVendaStatus,
  getVendaVendedorNome,
} from "$lib/server/relatorios";
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";
import {
  buildConciliacaoSyntheticVendas,
  fetchEffectiveConciliacaoReceipts,
  fetchSuppressedConciliacaoReceipts,
  filterRecibosCanceladosMesmoMes,
} from "$lib/conciliacao/source";
import {
  applyRateioToSalesForScopedVendedores,
  fetchRateioByReciboIds,
  fetchSplitSaleIdsForDestinationVendedores,
} from "$lib/vendas/rateio";
import {
  addMonthsISODate,
  monthRangeFromYearMonth,
  parseISODateParts,
  todayISODateLocal,
} from "$lib/date";
import { resolveGroupedReceiptCommissions } from "$lib/server/comissoes";
import { calcularRankingComissionavel } from "$lib/server/rankingComissionavel";
import { isEquipeVturNome } from "$lib/conciliacao/baixaRac";
import { normalizeReceiptNumber } from "$lib/conciliacao/receiptNumber";
import { chunkArray, SUPABASE_IN_BATCH_SIZE } from '$lib/utils/array';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";

function dedupeRowsById<T extends { id?: string | null }>(rows: T[]) {
  const map = new Map<string, T>();
  rows.forEach((row) => {
    const id = String(row?.id || "").trim();
    if (id && !map.has(id)) map.set(id, row);
  });
  return Array.from(map.values());
}

type PagamentoNaoComissionavelInput = {
  venda_id?: string | null;
  venda_recibo_id?: string | null;
  valor_total?: number | null;
  valor_bruto?: number | null;
  desconto_valor?: number | null;
  paga_comissao?: boolean | null;
  forma_nome?: string | null;
  operacao?: string | null;
  plano?: string | null;
  forma?: { nome?: string | null; paga_comissao?: boolean | null } | null;
};

type PagamentosNaoComissionaveisResumo = {
  porVenda: Map<string, number>;
  porVendaSemRecibo: Map<string, number>;
  porRecibo: Map<string, number>;
};

const DEFAULT_NAO_COMISSIONAVEIS = [
  "credito diversos",
  "credito pax",
  "credito passageiro",
  "credito de viagem",
  "credipax",
  "vale viagem",
  "carta de credito",
  "ficha cvc",
  "cvc ficha",
  "credito",
];

function toNum(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function toStr(value?: unknown) {
  return String(value || "").trim();
}

function normalizeTextValue(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasConciliacaoOverride(recibo?: ReportReceiptRow | null) {
  return (
    recibo?.valor_bruto_override != null ||
    recibo?.valor_liquido_override != null ||
    recibo?.valor_meta_override != null ||
    Boolean(recibo?.faixa_comissao) ||
    recibo?.percentual_comissao_loja != null
  );
}

function getReciboBrutoExibicao(recibo?: ReportReceiptRow | null) {
  if (!recibo) return 0;
  if (hasConciliacaoOverride(recibo) && recibo.valor_bruto_override != null) {
    return Math.max(0, toNum(recibo.valor_bruto_override));
  }
  return Math.max(0, toNum(recibo.valor_total) - toNum(recibo.valor_rav));
}

function getReciboTaxasExibicao(recibo?: ReportReceiptRow | null) {
  if (!recibo) return 0;
  if (hasConciliacaoOverride(recibo)) {
    return Math.max(0, toNum(recibo.valor_taxas));
  }
  return Math.max(0, toNum(recibo.valor_taxas) - toNum(recibo.valor_du));
}

function isFormaNaoComissionavel(
  nome?: string | null,
  termos?: string[] | null,
) {
  const normalized = normalizeTextValue(nome);
  if (!normalized) return false;
  if (normalized.includes("cartao") && normalized.includes("credito"))
    return false;
  return (termos || []).some((termo) => termo && normalized.includes(termo));
}

function calcularValorPagamento(pagamento: PagamentoNaoComissionavelInput) {
  const total = toNum(pagamento.valor_total);
  if (total > 0) return total;
  const bruto = toNum(pagamento.valor_bruto);
  const desconto = toNum(pagamento.desconto_valor);
  if (bruto > 0) return Math.max(0, bruto - desconto);
  return 0;
}

function addToMap(map: Map<string, number>, key: string, value: number) {
  if (!key || value <= 0) return;
  map.set(key, (map.get(key) || 0) + value);
}

async function fetchVendedoresByIds(client: any, vendedorIds: string[]) {
  const ids = Array.from(
    new Set(vendedorIds.map((id) => toStr(id)).filter(Boolean)),
  );
  const vendedorMap = new Map<
    string,
    { nome_completo?: string | null; email?: string | null }
  >();
  if (ids.length === 0) return vendedorMap;

  for (let index = 0; index < ids.length; index += 200) {
    const batch = ids.slice(index, index + 200);
    const { data, error } = await client
      .from("users")
      .select("id, nome_completo, email")
      .in("id", batch);
    if (error) throw error;
    (data || []).forEach((row: any) => {
      const id = toStr(row?.id);
      if (!id) return;
      vendedorMap.set(id, {
        nome_completo: row?.nome_completo ?? null,
        email: row?.email ?? null,
      });
    });
  }

  return vendedorMap;
}

async function hydrateMissingVendedores(client: any, rows: any[]) {
  const vendedorIds = Array.from(
    new Set(rows.map((row) => toStr(row?.vendedor_id)).filter(Boolean)),
  );

  if (vendedorIds.length === 0) return rows;

  const vendedorMap = await fetchVendedoresByIds(client, vendedorIds);
  return rows.map((row) => {
    const vendedor = vendedorMap.get(toStr(row.vendedor_id));
    return vendedor ? { ...row, vendedor } : row;
  });
}

function calcularNaoComissionavelResumo(
  pagamentos: PagamentoNaoComissionavelInput[],
  termos?: string[] | null,
): PagamentosNaoComissionaveisResumo {
  const porVenda = new Map<string, number>();
  const porVendaSemRecibo = new Map<string, number>();
  const porRecibo = new Map<string, number>();

  pagamentos.forEach((pagamento) => {
    const vendaId = toStr(pagamento.venda_id);
    if (!vendaId) return;

    const formaNomeResolvida = [
      pagamento.forma_nome,
      pagamento.forma?.nome,
      pagamento.operacao,
      pagamento.plano,
    ]
      .filter(Boolean)
      .join(" ");
    const pagaComissaoResolvido =
      pagamento.paga_comissao ?? pagamento.forma?.paga_comissao ?? null;
    const naoComissiona =
      pagaComissaoResolvido === false ||
      isFormaNaoComissionavel(formaNomeResolvida, termos);
    if (!naoComissiona) return;

    const valorBase = calcularValorPagamento(pagamento);
    if (valorBase <= 0) return;

    addToMap(porVenda, vendaId, valorBase);

    const vendaReciboId = toStr(pagamento.venda_recibo_id);
    if (vendaReciboId) {
      addToMap(porRecibo, vendaReciboId, valorBase);
    } else {
      addToMap(porVendaSemRecibo, vendaId, valorBase);
    }
  });

  return { porVenda, porVendaSemRecibo, porRecibo };
}

async function carregarTermosNaoComissionaveis(client: any) {
  try {
    const { data, error } = await client
      .from("parametros_pagamentos_nao_comissionaveis")
      .select("termo, termo_normalizado, ativo")
      .eq("ativo", true)
      .order("termo", { ascending: true });
    if (error) throw error;

    const termos = (data || [])
      .map((row: any) =>
        normalizeTextValue(row?.termo_normalizado || row?.termo),
      )
      .filter(Boolean);

    const unique = Array.from(new Set(termos)) as string[];
    if (unique.length > 0) return unique;
  } catch (error) {
    logServerError(
      "[relatorios/vendas] falha ao carregar termos nao comissionaveis",
      error,
    );
  }

  return DEFAULT_NAO_COMISSIONAVEIS.map((termo) =>
    normalizeTextValue(termo),
  ).filter(Boolean);
}

async function fetchNaoComissionadoPorVenda(client: any, vendaIds: string[]) {
  if (vendaIds.length === 0) {
    return {
      porVenda: new Map<string, number>(),
      porVendaSemRecibo: new Map<string, number>(),
      porRecibo: new Map<string, number>(),
    };
  }

  const pagamentos: PagamentoNaoComissionavelInput[] = [];
  for (let index = 0; index < vendaIds.length; index += 200) {
    const chunk = vendaIds.slice(index, index + 200);
    const { data, error } = await client
      .from("vendas_pagamentos")
      .select(
        "venda_id, venda_recibo_id, forma_nome, operacao, plano, valor_total, valor_bruto, desconto_valor, paga_comissao, forma:formas_pagamento(nome, paga_comissao)",
      )
      .in("venda_id", chunk);

    if (error) throw error;
    pagamentos.push(...((data || []) as PagamentoNaoComissionavelInput[]));
  }

  const termos = await carregarTermosNaoComissionaveis(client);
  return calcularNaoComissionavelResumo(pagamentos, termos);
}

function getRecibosAtivos(row: any) {
  const recibos = Array.isArray(row?.recibos)
    ? row.recibos
    : Array.isArray(row?.vendas_recibos)
      ? row.vendas_recibos
      : [];
  return recibos.filter((recibo: any) => !recibo?.cancelado_por_conciliacao_em);
}

function getVendaValorExibicao(row: any) {
  const recibos = getRecibosAtivos(row);
  if (recibos.length === 0) return 0;
  return Number(
    recibos
      .reduce(
        (sum: number, recibo: ReportReceiptRow) =>
          sum + getReciboBrutoExibicao(recibo),
        0,
      )
      .toFixed(2),
  );
}

function getVendaTaxasExibicao(row: any) {
  const recibos = getRecibosAtivos(row);
  if (recibos.length === 0) return 0;
  return Number(
    recibos
      .reduce(
        (sum: number, recibo: ReportReceiptRow) =>
          sum + getReciboTaxasExibicao(recibo),
        0,
      )
      .toFixed(2),
  );
}

function computeReceiptRankingEntries(
  rowsInput: any[],
  naoComissionadoPorVenda: PagamentosNaoComissionaveisResumo,
) {
  const entries: Array<{ date: string; value: number }> = [];

  (rowsInput || []).forEach((row) => {
    const receiptRows = getRecibosAtivos(row);
    if (receiptRows.length === 0) return;

    const vendaId = toStr(row?.id);
    const somaBrutoRecibos = receiptRows.reduce(
      (sum: number, recibo: ReportReceiptRow) =>
        sum + getReciboBrutoExibicao(recibo),
      0,
    );
    const somaTaxasRecibos = receiptRows.reduce(
      (sum: number, recibo: ReportReceiptRow) =>
        sum + getReciboTaxasExibicao(recibo),
      0,
    );
    const linkedNaoComissionado = toNum(
      naoComissionadoPorVenda.porVenda.get(vendaId) || 0,
    );
    const naoComissionadoSemRecibo = toNum(
      naoComissionadoPorVenda.porVendaSemRecibo.get(vendaId) || 0,
    );
    const usarModoPorRecibo =
      linkedNaoComissionado > 0 && naoComissionadoSemRecibo <= 0;
    const rankingGrupo = calcularRankingComissionavel({
      valorBruto: somaBrutoRecibos,
      valorTaxas: somaTaxasRecibos,
      valorNaoComissionado: usarModoPorRecibo ? 0 : linkedNaoComissionado,
    });

    receiptRows.forEach((recibo: ReportReceiptRow) => {
      const date = toStr((recibo as any)?.data_venda || row?.data_venda);
      if (!date) return;

      const reciboId = toStr((recibo as any)?.id);
      const reciboJaAjustadoPorConciliacao = hasConciliacaoOverride(recibo);
      const naoComissionadoRecibo =
        usarModoPorRecibo && reciboId && !reciboJaAjustadoPorConciliacao
          ? toNum(naoComissionadoPorVenda.porRecibo.get(reciboId) || 0)
          : 0;
      const rankingRecibo = calcularRankingComissionavel({
        valorBruto: getReciboBrutoExibicao(recibo),
        valorTaxas: getReciboTaxasExibicao(recibo),
        valorNaoComissionado: usarModoPorRecibo ? naoComissionadoRecibo : 0,
      });
      const value = usarModoPorRecibo
        ? rankingRecibo.valorRanking
        : getReciboBrutoExibicao(recibo) * rankingGrupo.fatorValor;

      if (value > 0) entries.push({ date: date.slice(0, 10), value });
    });
  });

  return entries;
}

function sumRankingEntriesBetween(
  entries: Array<{ date: string; value: number }>,
  start: string,
  end: string,
) {
  return entries.reduce((sum, entry) => {
    if (entry.date < start || entry.date > end) return sum;
    return sum + entry.value;
  }, 0);
}

function getLastSixMonthBuckets(referenceIso: string) {
  const reference =
    parseISODateParts(referenceIso) || parseISODateParts(todayISODateLocal());
  if (!reference) return [];
  const referenceMonthStart = `${reference.year}-${String(reference.month).padStart(2, "0")}-01`;

  return Array.from({ length: 6 }, (_, index) => {
    const monthStart = addMonthsISODate(referenceMonthStart, -(5 - index));
    const current = parseISODateParts(monthStart);
    if (!current)
      return {
        key: monthStart.slice(0, 7),
        start: monthStart,
        end: monthStart,
      };
    const range = monthRangeFromYearMonth(current.year, current.month);
    const key = monthStart.slice(0, 7);
    const isReferenceMonth = key === reference.iso.slice(0, 7);
    return {
      key,
      start: range.inicio,
      end: isReferenceMonth ? reference.iso : range.fim,
    };
  });
}

function getCurrentMonthDayBuckets(referenceIso: string) {
  const reference =
    parseISODateParts(referenceIso) || parseISODateParts(todayISODateLocal());
  if (!reference) return [];
  const range = monthRangeFromYearMonth(reference.year, reference.month);
  const daysInMonth = Number(range.fim.slice(8, 10));

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${reference.year}-${String(reference.month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    return {
      date,
      day: index + 1,
    };
  });
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ["relatorios", "vendas"],
        1,
        "Sem acesso ao relatorio de vendas.",
      );
    }

    const { searchParams } = event.url;
    const defaultRange = getCurrentYearRange();
    const hasDataInicio = Boolean(searchParams.get("data_inicio"));
    const hasDataFim = Boolean(searchParams.get("data_fim"));
    const monthEnd = todayISODateLocal();
    const monthStart = `${monthEnd.slice(0, 7)}-01`;
    const vendedorDefaultRange = scope.isVendedor || scope.usoIndividual;

    const dataInicio = String(
      searchParams.get("data_inicio") ||
        (vendedorDefaultRange ? monthStart : defaultRange.dataInicio),
    ).trim();
    const dataFim = String(
      searchParams.get("data_fim") ||
        (vendedorDefaultRange ? monthEnd : defaultRange.dataFim),
    ).trim();
    const companyIds = resolveScopedCompanyIds(
      scope,
      searchParams.get("empresa_id"),
    );
    const requestedVendedorRaw =
      searchParams.get("vendedor_ids") || searchParams.get("vendedor_id");
    const hasRequestedVendedorFilter = String(requestedVendedorRaw || "")
      .trim()
      .length > 0;
    const scopedVendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      requestedVendedorRaw,
    );
    const vendedorIds =
      hasRequestedVendedorFilter && scopedVendedorIds.length === 0
        ? [NO_MATCH_COMPANY_ID]
        : scopedVendedorIds;
    const statusFilter = String(searchParams.get("status") || "")
      .trim()
      .toLowerCase();
    const clienteId = String(searchParams.get("cliente_id") || "").trim();
    const destinoFilter = String(searchParams.get("destino") || "")
      .trim()
      .toLowerCase();
    const produtoFilter = String(searchParams.get("produto") || "")
      .trim()
      .toLowerCase();
    const tipoProdutoFilter = String(searchParams.get("tipo_produto") || "")
      .trim()
      .toLowerCase();
    const accessibleClientIds =
      !scope.isAdmin &&
      !scope.isMaster &&
      !scope.isFinanceiro &&
      !scope.isGestor &&
      vendedorIds.length === 0
      ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds })
      : [];

    let conciliacaoSobrepoeVendas = false;
    if (companyIds.length > 0) {
      const parametrosRows: any[] = [];
      for (const companyBatch of chunkArray(companyIds)) {
        const { data, error: parametrosError } = await client
          .from("parametros_comissao")
          .select("company_id, conciliacao_sobrepoe_vendas")
          .in("company_id", companyBatch)
          .limit(1000);
        if (!parametrosError) {
          parametrosRows.push(...(data || []));
        }
      }
      conciliacaoSobrepoeVendas = parametrosRows.some((row: any) =>
        Boolean(row?.conciliacao_sobrepoe_vendas),
      );
    }

    const mergeRowsById = (baseRows: any[], extraRows: any[]) => {
      const map = new Map<string, any>();
      [...baseRows, ...extraRows].forEach((row) => {
        const id = String(row?.id || "").trim();
        if (!id) return;
        if (!map.has(id)) map.set(id, row);
      });
      return Array.from(map.values());
    };

    const toRateioShape = (rows: any[]) =>
      rows.map((row) => ({
        ...row,
        vendas_recibos: Array.isArray(row?.recibos)
          ? row.recibos
          : Array.isArray(row?.vendas_recibos)
            ? row.vendas_recibos
            : [],
      }));

    const getConciliacaoIds = (item: any) => {
      const ids = Array.isArray(item?.conciliacao_ids)
        ? item.conciliacao_ids
            .map((value: any) => String(value || "").trim())
            .filter(Boolean)
        : [];
      if (ids.length > 0) return ids;
      const id = String(item?.id || "").trim();
      return id ? [id] : [];
    };

    const toRecibosView = (row: any) => {
      if (Array.isArray(row?.vendas_recibos)) return row.vendas_recibos;
      if (Array.isArray(row?.recibos)) return row.recibos;
      return [];
    };

    const loadRowsViewForPeriod = async (
      periodStart: string,
      periodEnd: string,
    ) => {
      let rows = toRateioShape(
        await fetchSalesReportRows(client, {
          dataInicio: periodStart,
          dataFim: periodEnd,
          companyIds,
          vendedorIds,
          includeCancelled: true,
        }),
      );

      if (vendedorIds.length > 0) {
        let splitSaleIds: string[] = [];
        try {
          splitSaleIds = await fetchSplitSaleIdsForDestinationVendedores(
            client,
            {
              companyId: companyIds[0] || null,
              companyIds,
              vendedorIds,
            },
          );
        } catch (error) {
          logServerError(
            "[relatorios/vendas] split sales indisponivel, seguindo sem rateio destino",
            error,
          );
        }

        if (splitSaleIds.length > 0) {
          const splitRows = toRateioShape(
            await fetchSalesReportRows(client, {
              dataInicio: periodStart,
              dataFim: periodEnd,
              companyIds,
              vendaIds: splitSaleIds,
              includeCancelled: true,
            }),
          );
          rows = mergeRowsById(rows, splitRows);
        }
      }

      let concReceipts: any[] = [];
      try {
        concReceipts = await fetchEffectiveConciliacaoReceipts({
          client,
          companyId: companyIds[0] || null,
          companyIds,
          inicio: periodStart,
          fim: periodEnd,
          vendedorIds,
          excludeVendedorIds: undefined,
        });
      } catch (error) {
        logServerError(
          "[relatorios/vendas] conciliacao indisponivel, seguindo sem overrides",
          error,
        );
        concReceipts = [];
      }
      let concReceiptsAllCache: any[] | null = null;
      const loadConcReceiptsAll = async () => {
        if (concReceiptsAllCache) return concReceiptsAllCache;
        try {
          concReceiptsAllCache = await fetchEffectiveConciliacaoReceipts({
            client,
            companyId: companyIds[0] || null,
            companyIds,
            inicio: periodStart,
            fim: periodEnd,
            vendedorIds: null,
            excludeVendedorIds: undefined,
          });
        } catch (error) {
          logServerError(
            "[relatorios/vendas] conciliation all indisponivel",
            error,
          );
          concReceiptsAllCache = [];
        }
        return concReceiptsAllCache;
      };
      const concReceiptsForOverrides =
        vendedorIds.length > 0 ? await loadConcReceiptsAll() : concReceipts;
      const allowedVendedorSet =
        vendedorIds.length > 0
          ? new Set(vendedorIds.map((id) => toStr(id)).filter(Boolean))
          : null;

      if (vendedorIds.length > 0) {
        const splitConcRows: any[] = [];
        const splitConcCompanyBatches =
          companyIds.length > 0 ? chunkArray(companyIds) : [null];
        const splitConcVendedorBatches = chunkArray(vendedorIds);
        for (const companyBatch of splitConcCompanyBatches) {
          for (const vendedorBatch of splitConcVendedorBatches) {
            let splitConcQuery = client
              .from("vendas_recibos_rateio")
              .select("conciliacao_recibo_id")
              .eq("ativo", true)
              .gt("percentual_destino", 0)
              .in("vendedor_destino_id", vendedorBatch)
              .not("conciliacao_recibo_id", "is", null);

            if (companyBatch && companyBatch.length > 0) {
              splitConcQuery = splitConcQuery.in("company_id", companyBatch);
            }

            const { data, error: splitConcErr } = await splitConcQuery;
            if (splitConcErr) {
              logServerError(
                "[relatorios/vendas] split conciliation indisponivel",
                splitConcErr,
              );
              continue;
            }
            splitConcRows.push(...(data || []));
          }
        }

        const splitConcIdSet = new Set(
          ((splitConcRows as any[]) || [])
            .map((row: any) => String(row?.conciliacao_recibo_id || "").trim())
            .filter(Boolean),
        );

        if (splitConcIdSet.size > 0) {
          const concAll = await loadConcReceiptsAll();
          const seenConcIds = new Set(
            (concReceipts || []).flatMap((item: any) =>
              getConciliacaoIds(item),
            ),
          );
          concAll.forEach((item: any) => {
            const candidateIds = getConciliacaoIds(item);
            if (candidateIds.length === 0) return;
            if (!candidateIds.some((id: string) => splitConcIdSet.has(id)))
              return;
            if (candidateIds.some((id: string) => seenConcIds.has(id))) return;
            candidateIds.forEach((id: string) => seenConcIds.add(id));
            concReceipts.push(item);
          });
        }
      }

      const overriddenReceiptIds = new Set(
        concReceiptsForOverrides
          .map((item) => String(item.linked_recibo_id || "").trim())
          .filter(Boolean),
      );
      let suppressedConcReceipts: Array<{
        documento: string;
        numero_reserva?: string | null;
        linked_recibo_id: string | null;
      }> = [];
      try {
        suppressedConcReceipts = await fetchSuppressedConciliacaoReceipts({
          client,
          companyId: companyIds[0] || null,
          companyIds,
          inicio: periodStart,
          fim: periodEnd,
        });
      } catch (error) {
        logServerError(
          "[relatorios/vendas] conciliacao suprimida indisponivel",
          error,
        );
        suppressedConcReceipts = [];
      }
      const suppressedReceiptIds = new Set(
        suppressedConcReceipts
          .map((item) => toStr(item.linked_recibo_id))
          .filter(Boolean),
      );
      const suppressedReceiptNumbers = new Set(
        suppressedConcReceipts
          .filter(
            (item) =>
              !(
                toStr(item.documento).toUpperCase() === "REXTUR" &&
                toStr(item.numero_reserva)
              ),
          )
          .map((item) => normalizeReceiptNumber(item.documento))
          .filter(Boolean),
      );
      const vendedorByConcReceiptId = new Map<string, string>(
        concReceiptsForOverrides
          .map((item) => [
            String(item.linked_recibo_id || "").trim(),
            String(item.vendedor_id || "").trim(),
          ])
          .filter(([reciboId, vendedorId]) =>
            Boolean(reciboId && vendedorId),
          ) as [string, string][],
      );

      const baseRows = rows
        .map((row: any) => {
          const recibos = Array.isArray(row?.vendas_recibos)
            ? row.vendas_recibos
            : [];
          const withoutOverridden = conciliacaoSobrepoeVendas
            ? recibos.filter((recibo: any) => {
                const reciboId = String(recibo?.id || "").trim();
                const reciboNumero = normalizeReceiptNumber(
                  recibo?.numero_recibo,
                );
                return (
                  !overriddenReceiptIds.has(reciboId) &&
                  !suppressedReceiptIds.has(reciboId) &&
                  !(reciboNumero && suppressedReceiptNumbers.has(reciboNumero))
                );
              })
            : recibos;
          const withVendedorEfetivo = withoutOverridden
            .map((recibo: any) => {
              const vendedorId = vendedorByConcReceiptId.get(
                String(recibo?.id || "").trim(),
              );
              return vendedorId
                ? { ...recibo, vendedor_id: vendedorId }
                : recibo;
            })
            .filter((recibo: any) => {
              if (!allowedVendedorSet) return true;
              const vendedorId = vendedorByConcReceiptId.get(
                String(recibo?.id || "").trim(),
              );
              return !vendedorId || allowedVendedorSet.has(vendedorId);
            });
          const vendedorAtual = String(
            row?.vendedor?.nome_completo || "",
          ).trim();
          const vendedorEfetivo =
            !vendedorAtual || isEquipeVturNome(vendedorAtual)
              ? withVendedorEfetivo
                  .map((recibo: any) =>
                    vendedorByConcReceiptId.get(
                      String(recibo?.id || "").trim(),
                    ),
                  )
                  .find(Boolean)
              : null;

          return {
            ...row,
            ...(vendedorEfetivo
              ? { vendedor_id: vendedorEfetivo, vendedor: null }
              : {}),
            vendas_recibos:
              filterRecibosCanceladosMesmoMes(withVendedorEfetivo),
          };
        })
        .filter(
          (row: any) =>
            Array.isArray(row?.vendas_recibos) && row.vendas_recibos.length > 0,
        );

      const mergedRows =
        concReceipts.length > 0
          ? [...baseRows, ...buildConciliacaoSyntheticVendas(concReceipts)]
          : baseRows;

      if (mergedRows.length === 0) {
        return [] as any[];
      }

      try {
        const reciboIds = mergedRows
          .flatMap((row: any) =>
            Array.isArray(row?.vendas_recibos) ? row.vendas_recibos : [],
          )
          .map((recibo: any) => String(recibo?.id || "").trim())
          .filter(Boolean);
        const rateioMap = await fetchRateioByReciboIds(client, reciboIds);
        rows = applyRateioToSalesForScopedVendedores(
          mergedRows,
          rateioMap,
          vendedorIds,
        );
      } catch (error) {
        logServerError(
          "[relatorios/vendas] rateio indisponivel, seguindo sem rateio",
          error,
        );
        rows = mergedRows;
      }

      return rows.map((row: any) => ({
        ...row,
        recibos: toRecibosView(row),
      }));
    };

    const filterRowsForReport = (rowsInput: any[]) =>
      rowsInput.filter((row) => {
        if (clienteId && String(row.cliente_id || "").trim() !== clienteId) {
          return false;
        }

        const destino = getVendaDestino(row).toLowerCase();
        if (destinoFilter && !destino.includes(destinoFilter)) {
          return false;
        }

        if (produtoFilter || tipoProdutoFilter) {
          const recibos =
            Array.isArray(row.recibos) && row.recibos.length > 0
              ? row.recibos
              : [null];
          const matches = recibos.some((recibo: ReportReceiptRow) => {
            const descriptor = getReceiptProductDescriptor(recibo, row);
            const produtoMatches =
              !produtoFilter ||
              descriptor.produto.toLowerCase().includes(produtoFilter);
            const tipoMatches =
              !tipoProdutoFilter ||
              descriptor.tipo.toLowerCase().includes(tipoProdutoFilter);
            return produtoMatches && tipoMatches;
          });

          if (!matches) {
            return false;
          }
        }

        return true;
      });

    const loadConsultaRowsBatch = async (
      periodStart: string,
      periodEnd: string,
      clientIdsFilter?: string[],
    ) => {
      const rows: any[] = [];
      const companyBatches = companyIds.length > 0 ? chunkArray(companyIds) : [null];
      const vendedorBatches =
        vendedorIds.length > 0 ? chunkArray(vendedorIds) : [null];
      const clientBatches =
        clientIdsFilter && clientIdsFilter.length > 0
          ? chunkArray(clientIdsFilter)
          : [null];

      for (const companyBatch of companyBatches) {
        for (const vendedorBatch of vendedorBatches) {
          for (const clientBatch of clientBatches) {
            let query = client
              .from("vendas")
              .select(
                `
          id,
          numero_venda,
          vendedor_id,
          cliente_id,
          company_id,
          data_venda,
          data_embarque,
          data_final,
          valor_total,
          valor_total_bruto,
          valor_taxas,
          cancelada,
          clientes (nome, whatsapp),
          vendedor:users!vendedor_id (nome_completo),
          destino_cidade:cidades!destino_cidade_id (id, nome),
          destinos:produtos!destino_id (nome, cidade_id),
          recibos:vendas_recibos (
            id,
            numero_recibo,
            numero_reserva,
            destino_cidade:cidades!destino_cidade_id (id, nome),
            tipo_pacote,
            valor_total,
            valor_taxas,
            valor_du,
            valor_rav,
            data_inicio,
            data_fim,
            tipo_produtos (id, nome, tipo),
            produto_resolvido:produtos!produto_resolvido_id (id, nome)
          )
        `,
              )
              .order("data_venda", { ascending: false })
              .limit(5000);

            if (periodStart) query = query.gte("data_venda", periodStart);
            if (periodEnd) query = query.lte("data_venda", periodEnd);
            if (companyBatch) query = query.in("company_id", companyBatch);
            if (vendedorBatch) query = query.in("vendedor_id", vendedorBatch);
            if (clienteId) query = query.eq("cliente_id", clienteId);
            else if (
              !scope.isAdmin &&
              vendedorIds.length === 0 &&
              clientBatch &&
              clientBatch.length > 0
            )
              query = query.in("cliente_id", clientBatch);

            const { data, error } = await query;
            if (error) throw error;
            rows.push(...(data || []));
          }
        }
      }

      return dedupeRowsById(rows).map((row) => ({
        ...row,
        recibos: Array.isArray(row?.recibos) ? row.recibos : [],
      }));
    };

    const loadConsultaRowsForPeriod = async (
      periodStart: string,
      periodEnd: string,
    ) => {
      if (
        !clienteId &&
        !scope.isAdmin &&
        vendedorIds.length === 0 &&
        accessibleClientIds.length > SUPABASE_IN_BATCH_SIZE
      ) {
        const rows: any[] = [];
        for (const batch of chunkArray(accessibleClientIds)) {
          rows.push(
            ...(await loadConsultaRowsBatch(periodStart, periodEnd, batch)),
          );
        }
        return dedupeRowsById(rows);
      }

      const clientIdsFilter =
        !clienteId &&
        !scope.isAdmin &&
        vendedorIds.length === 0 &&
        accessibleClientIds.length > 0
          ? accessibleClientIds
          : undefined;

      return loadConsultaRowsBatch(periodStart, periodEnd, clientIdsFilter);
    };

    const computeConsultaKpiTotalFromRows = (rowsInput: any[]) => {
      const filtered = filterRowsForReport(rowsInput);
      let total = 0;

      filtered.forEach((row) => {
        const status = getVendaStatus(row);
        if (statusFilter && status !== statusFilter) {
          return;
        }

        const recibos = Array.isArray(row?.recibos) ? row.recibos : [];
        if (recibos.length > 0) {
          total += recibos.reduce(
            (sum: number, recibo: any) =>
              sum + Number(recibo?.valor_total || 0),
            0,
          );
          return;
        }

        total += Number(row?.valor_total || 0);
      });

      return Number(total.toFixed(2));
    };

    const rowsViewRaw = await getCachedReadModel({
      key: buildReadModelCacheKey("relatorios:vendas:rows-view", {
        userId: user.id,
        dataInicio,
        dataFim,
        companyIds,
        vendedorIds,
        conciliacaoSobrepoeVendas,
      }),
      tags: [
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.conciliacao,
        READ_MODEL_TAGS.payments,
        READ_MODEL_TAGS.users,
        ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
      ],
      ttlMs: 45_000,
      staleTtlMs: 120_000,
      loader: () => loadRowsViewForPeriod(dataInicio, dataFim),
    });
    const hydratedRowsView = await hydrateMissingVendedores(client, rowsViewRaw);
    const getReciboVendedorId = (row: any, recibo: any) =>
      toStr(recibo?.rateio_scope_vendor_id) ||
      toStr(recibo?.vendedor_id) ||
      toStr(row?.vendedor_id) ||
      null;
    const reportVendedorSet =
      vendedorIds.length > 0
        ? new Set(vendedorIds.map((id) => toStr(id)).filter(Boolean))
        : null;
    const rowsView = reportVendedorSet
      ? hydratedRowsView
          .map((row: any) => {
            const recibos = Array.isArray(row?.recibos) ? row.recibos : [];
            const recibosDoVendedor = recibos.filter((recibo: any) => {
              const vendedorId = getReciboVendedorId(row, recibo);
              return Boolean(vendedorId && reportVendedorSet.has(vendedorId));
            });

            if (recibosDoVendedor.length > 0) {
              return {
                ...row,
                recibos: recibosDoVendedor,
                vendas_recibos: recibosDoVendedor,
              };
            }

            const rowVendedorId = toStr(row?.vendedor_id);
            if (recibos.length === 0 && rowVendedorId && reportVendedorSet.has(rowVendedorId)) {
              return row;
            }

            return null;
          })
          .filter(Boolean)
      : hydratedRowsView;
    const reciboVendedorIds = Array.from(
      new Set(
        rowsView
          .flatMap((row: any) =>
            (Array.isArray(row?.recibos) ? row.recibos : []).map(
              (recibo: any) => getReciboVendedorId(row, recibo),
            ),
          )
          .filter(Boolean),
      ),
    ) as string[];
    const reciboVendedores = await fetchVendedoresByIds(
      client,
      reciboVendedorIds,
    );
    const getVendedorNomeById = (
      vendedorId: string | null,
      fallback: string,
    ) => {
      if (!vendedorId) return fallback;
      const vendedor = reciboVendedores.get(vendedorId);
      return vendedor ? getVendaVendedorNome({ vendedor }) : fallback;
    };

    const naoComissionadoPorVenda = await fetchNaoComissionadoPorVenda(
      client,
      rowsView.map((row) => toStr(row?.id)).filter(Boolean),
    );

    const paymentForms = await fetchLatestPaymentForms(
      client,
      rowsView.map((row) => row.id),
    );

    const filteredRows = filterRowsForReport(rowsView);
    const receiptCommissionMap = await resolveGroupedReceiptCommissions(
      client,
      {
        companyIds,
        rows: filteredRows as any,
      },
    );

    let items = filteredRows.map((row) => {
      const status = getVendaStatus(row);
      const vendaVendedorNome = getVendaVendedorNome(row);
      const receiptRows = getRecibosAtivos(row);
      const vendaId = toStr(row?.id);
      const somaBrutoRecibos = receiptRows.reduce(
        (sum: number, recibo: ReportReceiptRow) =>
          sum + getReciboBrutoExibicao(recibo),
        0,
      );
      const somaTaxasRecibos = receiptRows.reduce(
        (sum: number, recibo: ReportReceiptRow) =>
          sum + getReciboTaxasExibicao(recibo),
        0,
      );
      const linkedNaoComissionado = toNum(
        naoComissionadoPorVenda.porVenda.get(vendaId) || 0,
      );
      const naoComissionadoSemRecibo = toNum(
        naoComissionadoPorVenda.porVendaSemRecibo.get(vendaId) || 0,
      );
      const usarModoPorRecibo =
        linkedNaoComissionado > 0 && naoComissionadoSemRecibo <= 0;
      const rankingGrupo = calcularRankingComissionavel({
        valorBruto: somaBrutoRecibos,
        valorTaxas: somaTaxasRecibos,
        valorNaoComissionado: usarModoPorRecibo ? 0 : linkedNaoComissionado,
      });

      const recibos = receiptRows.map((recibo: any) => {
        const descriptor = getReceiptProductDescriptor(recibo, row);
        const reciboVendedorId = getReciboVendedorId(row, recibo);
        const reciboVendedorNome = getVendedorNomeById(
          reciboVendedorId,
          vendaVendedorNome,
        );
        const brutoBase = getReciboBrutoExibicao(recibo);
        const reciboJaAjustadoPorConciliacao = hasConciliacaoOverride(recibo);
        const naoComissionadoRecibo =
          usarModoPorRecibo &&
          toStr(recibo?.id) &&
          !reciboJaAjustadoPorConciliacao
            ? toNum(
                naoComissionadoPorVenda.porRecibo.get(toStr(recibo.id)) || 0,
              )
            : 0;
        const rankingRecibo = calcularRankingComissionavel({
          valorBruto: brutoBase,
          valorTaxas: getReciboTaxasExibicao(recibo),
          valorNaoComissionado: usarModoPorRecibo ? naoComissionadoRecibo : 0,
        });
        const valorComissionavel = usarModoPorRecibo
          ? rankingRecibo.valorRanking
          : brutoBase * rankingGrupo.fatorValor;
        const valorTaxasRanking = usarModoPorRecibo
          ? rankingRecibo.valorTaxasRanking
          : getReciboTaxasExibicao(recibo) * rankingGrupo.fatorTaxas;
        const commissionByReceipt = toStr(recibo?.id)
          ? receiptCommissionMap.get(toStr(recibo.id))
          : null;

        return {
          id: recibo?.id || null,
          numero_recibo: recibo?.numero_recibo || null,
          recibo_display: recibo?.numero_recibo || null,
          numero_recibo_normalizado: recibo?.numero_recibo_normalizado ?? null,
          recibo_short: String(recibo?.numero_recibo ?? "").slice(0, 8),
          data_venda: recibo?.data_venda || row.data_venda,
          vendedor_id: reciboVendedorId,
          vendedor_nome: reciboVendedorNome,
          produto_id: recibo?.produto_id || null,
          tipo_produto: descriptor.tipo,
          produto_nome: descriptor.produto,
          cidade_nome: getReceiptCidadeNome(recibo, row),
          valor_total: brutoBase,
          valor_taxas: getReciboTaxasExibicao(recibo),
          valor_taxas_ranking: valorTaxasRanking,
          valor_du: Number(recibo?.valor_du || 0),
          valor_rav: Number(recibo?.valor_rav || 0),
          percentual_comissao_loja: Number(
            recibo?.percentual_comissao_loja || 0,
          ),
          faixa_comissao: recibo?.faixa_comissao || null,
          valor_comissao_loja: Number(recibo?.valor_comissao_loja || 0),
          valor_bruto_override: recibo?.valor_bruto_override ?? null,
          valor_liquido_override: recibo?.valor_liquido_override ?? null,
          valor_meta_override: recibo?.valor_meta_override ?? null,
          valor_comissionavel: valorComissionavel,
          // Quando o motor de regras não encontra regra aplicável (valor = 0),
          // usa valor_comissao_loja da conciliação como fallback — espelha o
          // comportamento do vtur-app que usa o valor real informado pela operadora.
          valor_comissao_calculada:
            Number(commissionByReceipt?.valorComissao || 0) > 0
              ? Number(commissionByReceipt?.valorComissao || 0)
              : Number(recibo?.valor_comissao_loja || 0),
          // Quando o motor de regras não encontra regra aplicável (percentual = 0),
          // usa percentual_comissao_loja da conciliação como fallback — espelha o
          // comportamento do vtur-app que exibe o percentual real informado pela operadora.
          percentual_comissao_calculado:
            Number(commissionByReceipt?.percentual || 0) > 0
              ? Number(commissionByReceipt?.percentual || 0)
              : Number(recibo?.percentual_comissao_loja || 0),
        };
      });
      const commission = {
        valorComissao: roundToMoney(
          recibos.reduce(
            (
              sum: number,
              recibo: { valor_comissao_calculada?: number | null },
            ) => sum + toNum(recibo.valor_comissao_calculada),
            0,
          ),
        ),
      };

      return {
        id: row.id,
        numero_venda: row.numero_venda,
        codigo: getVendaCodigo(row),
        data_venda: row.data_venda,
        data_embarque: row.data_embarque,
        data_final: row.data_final,
        cliente_id: row.cliente_id,
        cliente_nome: getVendaClienteNome(row),
        cliente_cpf: (row.clientes as any)?.cpf || null,
        vendedor_id: row.vendedor_id,
        vendedor_nome: vendaVendedorNome,
        destino_id: (row.destinos as any)?.id || null,
        destino_nome: getVendaDestino(row),
        destino_cidade_id: (row.destino_cidade as any)?.id || null,
        destino_cidade_nome: (row.destino_cidade as any)?.nome || null,
        valor_total: Number(
          recibos
            .reduce(
              (sum: number, recibo: { valor_comissionavel?: number | null }) =>
                sum + toNum(recibo.valor_comissionavel),
              0,
            )
            .toFixed(2),
        ),
        valor_taxas: Number(
          recibos
            .reduce(
              (sum: number, recibo: { valor_taxas_ranking?: number | null }) =>
                sum + toNum(recibo.valor_taxas_ranking),
              0,
            )
            .toFixed(2),
        ),
        cancelada: row.cancelada || false,
        status,
        forma_pagamento: paymentForms.get(row.id) || "Nao informado",
        recibos,
        // KPIs por venda
        comissao: commission.valorComissao,
        vendas_recibos: row.recibos,
      };
    });

    if (reportVendedorSet) {
      items = items
        .map((item) => {
          const recibos = (Array.isArray(item.recibos) ? item.recibos : []).filter(
            (recibo: { vendedor_id?: string | null }) => {
              const vendedorId = toStr(recibo?.vendedor_id);
              return Boolean(vendedorId && reportVendedorSet.has(vendedorId));
            },
          );

          if (recibos.length === 0) return null;

          const valorTotal = roundToMoney(
            recibos.reduce(
              (
                sum: number,
                recibo: { valor_comissionavel?: number | null; valor_total?: number | null },
              ) => sum + toNum(recibo.valor_comissionavel ?? recibo.valor_total),
              0,
            ),
          );
          const valorTaxas = roundToMoney(
            recibos.reduce(
              (
                sum: number,
                recibo: { valor_taxas_ranking?: number | null; valor_taxas?: number | null },
              ) => sum + toNum(recibo.valor_taxas_ranking ?? recibo.valor_taxas),
              0,
            ),
          );
          const comissao = roundToMoney(
            recibos.reduce(
              (
                sum: number,
                recibo: { valor_comissao_calculada?: number | null; comissao?: number | null },
              ) => sum + toNum(recibo.valor_comissao_calculada ?? recibo.comissao),
              0,
            ),
          );
          const vendedorId =
            reportVendedorSet.size === 1
              ? Array.from(reportVendedorSet)[0]
              : toStr(recibos[0]?.vendedor_id) || item.vendedor_id;
          const vendedorNome =
            recibos.find((recibo: { vendedor_id?: string | null; vendedor_nome?: string | null }) =>
              toStr(recibo.vendedor_id) === vendedorId && toStr(recibo.vendedor_nome),
            )?.vendedor_nome || item.vendedor_nome;

          return {
            ...item,
            vendedor_id: vendedorId,
            vendedor_nome: vendedorNome,
            valor_total: valorTotal,
            valor_taxas: valorTaxas,
            comissao,
            recibos,
            vendas_recibos: recibos,
          };
        })
        .filter(Boolean) as typeof items;
    }

    if (statusFilter) {
      items = items.filter((item) => item.status === statusFilter);
    }

    const vendedores = Array.from(
      new Map(
        filteredRows
          .filter((row) => row.vendedor_id)
          .map((row) => [row.vendedor_id as string, getVendaVendedorNome(row)]),
      ).entries(),
    )
      .map(([id, nome]) => ({ id, nome }))
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));

    const historyBuckets = getLastSixMonthBuckets(dataFim);
    const dayBuckets = getCurrentMonthDayBuckets(dataFim);
    const seriesRowsRaw = rowsView;
    const seriesNaoComissionadoPorVenda = naoComissionadoPorVenda;
    const seriesRankingEntries = computeReceiptRankingEntries(
      seriesRowsRaw as any[],
      seriesNaoComissionadoPorVenda,
    );

    const monthlySeries = historyBuckets.map((bucket) => ({
      key: bucket.key,
      total_valor: sumRankingEntriesBetween(
        seriesRankingEntries,
        bucket.start,
        bucket.end,
      ),
    }));
    const dailySeries = dayBuckets.map((bucket) => ({
      date: bucket.date,
      value:
        bucket.date > dataFim
          ? 0
          : sumRankingEntriesBetween(
              seriesRankingEntries,
              bucket.date,
              bucket.date,
            ),
    }));

    // KPIs agregados
    const totalVendas = items.length;
    const vendasConfirmadas = items.filter(
      (i) => i.status === "confirmada",
    ).length;
    const vendasCanceladas = items.filter(
      (i) => i.status === "cancelada",
    ).length;
    const totalValor = Number(
      items
        .reduce((sum, item) => sum + Number(item.valor_total || 0), 0)
        .toFixed(2),
    );
    const totalComissao = items.reduce(
      (sum, item) => sum + Number(item.comissao || 0),
      0,
    );
    const ticketMedio = totalVendas > 0 ? totalValor / totalVendas : 0;

    return json(
      {
        items,
        total: items.length,
        vendedores,
        resumo: {
          total_vendas: totalVendas,
          vendas_confirmadas: vendasConfirmadas,
          vendas_canceladas: vendasCanceladas,
          total_valor: totalValor,
          total_comissao: totalComissao,
          ticket_medio: ticketMedio,
        },
        series: {
          mensal: monthlySeries.map((item) => ({
            key: item.key,
            total_valor: Number(item.total_valor.toFixed(2)),
          })),
          diaria: dailySeries.map((item) => ({
            date: item.date,
            value: Number(item.value.toFixed(2)),
          })),
        },
        periodo: {
          data_inicio: dataInicio,
          data_fim: dataFim,
        },
      },
      { headers: DYNAMIC_READ_HEADERS },
    );
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar relatorio de vendas.");
  }
}

function roundToMoney(value: number) {
  return Number(value.toFixed(2));
}
