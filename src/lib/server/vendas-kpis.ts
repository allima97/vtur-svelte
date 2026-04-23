import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchEffectiveConciliacaoReceipts,
  filterRecibosCanceladosMesmoMes
} from '$lib/conciliacao/source';
import { mergeEffectiveRecibos } from '$lib/conciliacao/mergeEffectiveRecibos';
import type { ReportReceiptRow, ReportVendaRow } from '$lib/server/relatorios';
import { fetchSalesReportRows } from '$lib/server/relatorios';
import {
  fetchRateioByReciboIds,
  fetchSplitSaleIdsForDestinationVendedores,
  isUuid,
  type RateioRow
} from '$lib/vendas/rateio';
import { normalizeReceiptNumber } from '$lib/conciliacao/receiptNumber';

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

type VendaAggregateRow = ReportVendaRow & {
  source_venda_id?: string | null;
  linked_venda_id?: string | null;
  linked_recibo_id?: string | null;
  vendas_recibos?: ReportReceiptRow[] | null;
};

type NonNullReceiptRow = Exclude<ReportReceiptRow, null>;

export type VendasKpiAgg = {
  totalVendas: number;
  totalTaxas: number;
  totalLiquido: number;
  totalSeguro: number;
  countVendas: number;
  countAtivas: number;
};

export type VendasTimelinePoint = {
  date: string;
  value: number;
};

const DEFAULT_NAO_COMISSIONAVEIS = [
  'credito diversos',
  'credito pax',
  'credito passageiro',
  'credito de viagem',
  'credipax',
  'vale viagem',
  'carta de credito',
  'ficha cvc',
  'cvc ficha',
  'credito'
];

function toStr(value?: unknown) {
  return String(value || '').trim();
}

function toNum(value?: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateKey(value?: string | null) {
  return String(value || '').slice(0, 10);
}

function normalizeTextValue(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCompanyScopeIds(companyIds?: string[] | null) {
  return Array.from(new Set((companyIds || []).map((value) => toStr(value)).filter(Boolean)));
}

function isFormaNaoComissionavel(nome?: string | null, termos?: string[] | null) {
  const normalized = normalizeTextValue(nome);
  if (!normalized) return false;
  if (normalized.includes('cartao') && normalized.includes('credito')) return false;
  const lista = (termos || []).map((termo) => normalizeTextValue(termo)).filter(Boolean);
  return lista.some((termo) => termo && normalized.includes(termo));
}

function calcularValorPagamento(pagamento: PagamentoNaoComissionavelInput) {
  const total = Number(pagamento.valor_total || 0);
  if (total > 0) return total;
  const bruto = Number(pagamento.valor_bruto || 0);
  const desconto = Number(pagamento.desconto_valor || 0);
  if (bruto > 0) return Math.max(0, bruto - desconto);
  return 0;
}

function addToMap(map: Map<string, number>, key: string, value: number) {
  if (!key || value <= 0) return;
  map.set(key, (map.get(key) || 0) + value);
}

function calcularNaoComissionavelResumo(
  pagamentos: PagamentoNaoComissionavelInput[],
  termos?: string[] | null
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
      pagamento.plano
    ]
      .filter(Boolean)
      .join(' ');
    const pagaComissaoResolvido = pagamento.paga_comissao ?? pagamento.forma?.paga_comissao ?? null;
    const naoComissiona =
      pagaComissaoResolvido === false || isFormaNaoComissionavel(formaNomeResolvida, termos);
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

function buildReciboBusinessKey(recibo?: ReportReceiptRow | null) {
  if (!recibo) return '';
  const numero = normalizeReceiptNumber(recibo?.numero_recibo);
  const produtoId = toStr(recibo?.tipo_produtos?.id || recibo?.produto_id).toLowerCase();
  const data = toDateKey(recibo?.data_venda);
  if (!numero || !data) return '';
  return `${numero}::${produtoId || 'sem-produto'}::${data}`;
}

function isSeguroProduto(recibo?: ReportReceiptRow | null) {
  if ((recibo as any)?._conciliacao_is_seguro === true || (recibo as any)?.is_seguro_viagem === true) return true;
  const tipo = String(recibo?.tipo_produtos?.tipo || '').toLowerCase();
  const nome = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || '').toLowerCase();
  return tipo.includes('seguro') || nome.includes('seguro');
}

function hasConciliacaoOverride(recibo?: ReportReceiptRow | null) {
  return (
    recibo?.valor_bruto_override != null ||
    recibo?.valor_liquido_override != null
  );
}

function getReciboBruto(recibo?: ReportReceiptRow | null) {
  if (!recibo) return 0;
  if (hasConciliacaoOverride(recibo)) {
    return toNum(recibo.valor_bruto_override ?? recibo.valor_total);
  }
  return toNum(recibo.valor_total);
}

function getReciboTaxas(recibo?: ReportReceiptRow | null) {
  if (!recibo) return 0;
  return Math.max(0, toNum(recibo.valor_taxas));
}

function isStatusCancelado(status?: string | null, cancelada?: boolean | null) {
  if (cancelada) return true;
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'cancelado' || normalized === 'cancelada';
}

function normalizeReceiptRows(recibos?: ReportReceiptRow[] | null): NonNullReceiptRow[] {
  return (Array.isArray(recibos) ? recibos : []).filter(
    (recibo): recibo is NonNullReceiptRow => Boolean(recibo)
  );
}

async function fetchBaixaRacVendedorIds(
  client: SupabaseClient,
  companyIds: string[]
) {
  if (companyIds.length === 0) return [] as string[];

  let query = client
    .from('users')
    .select('id')
    .eq('active', true)
    .ilike('nome_completo', 'Baixa RAC');

  query =
    companyIds.length === 1
      ? query.eq('company_id', companyIds[0])
      : query.in('company_id', companyIds);

  const { data, error } = await query;
  if (error) throw error;

  return Array.from(new Set((data || []).map((row: any) => toStr(row?.id)).filter(Boolean)));
}

async function fetchConciliacaoCompanyIds(
  client: SupabaseClient,
  companyIds: string[]
) {
  if (companyIds.length === 0) return [] as string[];

  let query = client
    .from('parametros_comissao')
    .select('company_id')
    .eq('conciliacao_sobrepoe_vendas', true);

  query =
    companyIds.length === 1
      ? query.eq('company_id', companyIds[0])
      : query.in('company_id', companyIds);

  const { data, error } = await query;
  if (error) throw error;

  return Array.from(new Set((data || []).map((row: any) => toStr(row?.company_id)).filter(Boolean)));
}

async function carregarTermosNaoComissionaveis(client: SupabaseClient): Promise<string[]> {
  try {
    const { data, error } = await client
      .from('parametros_pagamentos_nao_comissionaveis')
      .select('termo, termo_normalizado, ativo')
      .eq('ativo', true)
      .order('termo', { ascending: true });
    if (error) throw error;

    const termos = (data || [])
      .map((row: any) => normalizeTextValue(row?.termo_normalizado || row?.termo))
      .filter(Boolean);

    const unique = Array.from(new Set(termos)) as string[];
    if (unique.length > 0) return unique;
  } catch (error) {
    console.warn('[vendas-kpis] falha ao carregar termos nao comissionaveis', error);
  }

  return DEFAULT_NAO_COMISSIONAVEIS.map((termo) => normalizeTextValue(termo)).filter(Boolean);
}

async function fetchNaoComissionadoPorVenda(
  client: SupabaseClient,
  vendaIds: string[],
  termosNaoComissionaveis: string[]
) {
  if (vendaIds.length === 0) {
    return {
      porVenda: new Map<string, number>(),
      porVendaSemRecibo: new Map<string, number>(),
      porRecibo: new Map<string, number>()
    };
  }

  const pagamentos: PagamentoNaoComissionavelInput[] = [];
  for (let index = 0; index < vendaIds.length; index += 200) {
    const chunk = vendaIds.slice(index, index + 200);
    const { data, error } = await client
      .from('vendas_pagamentos')
      .select(
        'venda_id, venda_recibo_id, forma_nome, operacao, plano, valor_total, valor_bruto, desconto_valor, paga_comissao, forma:formas_pagamento(nome, paga_comissao)'
      )
      .in('venda_id', chunk);

    if (error) throw error;
    pagamentos.push(...((data || []) as PagamentoNaoComissionavelInput[]));
  }

  return calcularNaoComissionavelResumo(pagamentos, termosNaoComissionaveis);
}

function mergeRowsById(baseRows: VendaAggregateRow[], extraRows: VendaAggregateRow[]) {
  const map = new Map<string, VendaAggregateRow>();
  [...baseRows, ...extraRows].forEach((row) => {
    const id = toStr(row?.id);
    if (!id) return;
    if (!map.has(id)) map.set(id, row);
  });
  return Array.from(map.values());
}

function toRateioShape(rows: ReportVendaRow[]): VendaAggregateRow[] {
  return rows.map((row) => ({
    ...row,
    vendas_recibos: Array.isArray((row as any)?.recibos)
      ? (((row as any).recibos || []) as ReportReceiptRow[])
      : Array.isArray((row as any)?.vendas_recibos)
        ? (((row as any).vendas_recibos || []) as ReportReceiptRow[])
        : []
  }));
}

function getConciliacaoIds(item: any) {
  const ids = Array.isArray(item?.conciliacao_ids)
    ? item.conciliacao_ids.map((value: any) => String(value || '').trim()).filter(Boolean)
    : [];
  if (ids.length > 0) return ids;
  const id = String(item?.id || '').trim();
  return id ? [id] : [];
}

async function fetchResolvedRows(
  client: SupabaseClient,
  params: {
    dataInicio: string;
    dataFim: string;
    companyIds: string[];
    vendedorIds: string[];
    accessibleClientIds?: string[];
  }
) {
  const normalizedCompanyIds = normalizeCompanyScopeIds(params.companyIds);
  const baixaRacIds = await fetchBaixaRacVendedorIds(client, normalizedCompanyIds).catch(() => [] as string[]);
  const baixaRacSet = new Set(baixaRacIds);

  let rows = toRateioShape(
    await fetchSalesReportRows(client, {
      companyIds: normalizedCompanyIds,
      vendedorIds: params.vendedorIds,
      includeCancelled: true
    })
  ).filter((row) => !baixaRacSet.has(toStr(row?.vendedor_id)));

  if ((params.accessibleClientIds || []).length > 0) {
    const clientScope = new Set((params.accessibleClientIds || []).map((id) => toStr(id)).filter(Boolean));
    rows = rows.filter((row) => clientScope.has(toStr(row?.cliente_id)));
  }

  if (params.vendedorIds.length > 0) {
    let splitSaleIds: string[] = [];
    try {
      splitSaleIds = await fetchSplitSaleIdsForDestinationVendedores(client, {
        companyId: normalizedCompanyIds[0] || null,
        vendedorIds: params.vendedorIds
      });
    } catch (error) {
      console.warn('[vendas-kpis] split sales indisponivel, seguindo sem rateio destino:', error);
    }

    if (splitSaleIds.length > 0) {
      const splitRows = toRateioShape(
        await fetchSalesReportRows(client, {
          companyIds: normalizedCompanyIds,
          vendaIds: splitSaleIds,
          includeCancelled: true
        })
      ).filter((row) => !baixaRacSet.has(toStr(row?.vendedor_id)));

      rows = mergeRowsById(rows, splitRows);
    }
  }

  const conciliacaoCompanyIds = await fetchConciliacaoCompanyIds(client, normalizedCompanyIds).catch(() => [] as string[]);
  let concReceipts: any[] = [];

  if (conciliacaoCompanyIds.length > 0) {
    try {
      concReceipts = await fetchEffectiveConciliacaoReceipts({
        client,
        companyId: conciliacaoCompanyIds[0] || null,
        companyIds: conciliacaoCompanyIds,
        inicio: params.dataInicio,
        fim: params.dataFim,
        vendedorIds: params.vendedorIds,
        excludeVendedorIds: baixaRacIds
      });
    } catch (error) {
      console.warn('[vendas-kpis] conciliacao indisponivel, seguindo sem overrides:', error);
      concReceipts = [];
    }
  }

  if (params.vendedorIds.length > 0 && conciliacaoCompanyIds.length > 0) {
    let splitConcQuery = client
      .from('vendas_recibos_rateio')
      .select('conciliacao_recibo_id')
      .eq('ativo', true)
      .in('vendedor_destino_id', params.vendedorIds)
      .not('conciliacao_recibo_id', 'is', null)
      .limit(5000);

    if (normalizedCompanyIds.length > 0) {
      splitConcQuery = splitConcQuery.in('company_id', normalizedCompanyIds);
    }

    const { data: splitConcRows, error: splitConcErr } = await splitConcQuery;
    if (splitConcErr) {
      console.warn('[vendas-kpis] split conciliation indisponivel:', splitConcErr);
    }

    const splitConcIdSet = new Set(
      ((splitConcRows as any[]) || [])
        .map((row: any) => String(row?.conciliacao_recibo_id || '').trim())
        .filter(Boolean)
    );

    if (splitConcIdSet.size > 0) {
      let concAll: any[] = [];
      try {
        concAll = await fetchEffectiveConciliacaoReceipts({
          client,
          companyId: conciliacaoCompanyIds[0] || null,
          companyIds: conciliacaoCompanyIds,
          inicio: params.dataInicio,
          fim: params.dataFim,
          vendedorIds: null,
          excludeVendedorIds: baixaRacIds
        });
      } catch (error) {
        console.warn('[vendas-kpis] conciliation all indisponivel:', error);
        concAll = [];
      }

      const seenConcIds = new Set((concReceipts || []).flatMap((item: any) => getConciliacaoIds(item)));
      concAll.forEach((item: any) => {
        const candidateIds = getConciliacaoIds(item);
        if (candidateIds.length === 0) return;
        if (!candidateIds.some((id: string) => splitConcIdSet.has(id))) return;
        if (candidateIds.some((id: string) => seenConcIds.has(id))) return;
        candidateIds.forEach((id: string) => seenConcIds.add(id));
        concReceipts.push(item);
      });
    }
  }

  const overriddenReceiptIds = new Set(
    concReceipts.map((item) => String(item.linked_recibo_id || '').trim()).filter(Boolean)
  );
  const overrideCompanySet = new Set(conciliacaoCompanyIds);

  const baseRows = rows.map((row) => {
    const recibos = normalizeReceiptRows(row?.vendas_recibos);
    const shouldOverrideCompany = overrideCompanySet.has(toStr(row?.company_id));
    const withoutOverridden = shouldOverrideCompany
      ? recibos.filter((recibo) => !overriddenReceiptIds.has(toStr(recibo?.id)))
      : recibos;

    return {
      ...row,
      vendas_recibos: filterRecibosCanceladosMesmoMes(withoutOverridden)
    };
  });

  function buildConcRecibo(item: (typeof concReceipts)[0]): NonNullReceiptRow {
    return {
      id: item.linked_recibo_id || item.id,
      numero_recibo: item.documento,
      data_venda: item.data_venda,
      valor_total: item.valor_bruto,
      valor_taxas: item.valor_taxas,
      valor_du: 0,
      valor_bruto_override: item.valor_bruto,
      valor_liquido_override: item.valor_liquido_override,
      cancelado_por_conciliacao_em: null,
      cancelado_por_conciliacao_observacao: null,
      produto_id: item.produto_id,
      tipo_produtos: item.produto
        ? {
            id: item.produto.id,
            nome: item.produto.nome,
            tipo: item.is_seguro_viagem ? 'Seguro' : null
          }
        : null,
      produto_resolvido: item.produto
        ? {
            id: item.produto.id,
            nome: item.produto.nome,
            tipo: item.is_seguro_viagem ? 'Seguro' : null
          }
        : null,
      _conciliacao_is_seguro: item.is_seguro_viagem
    } as NonNullReceiptRow;
  }

  const mergedRows =
    concReceipts.length > 0
      ? mergeEffectiveRecibos<VendaAggregateRow, NonNullReceiptRow>(baseRows, concReceipts, {
          getVendaId: (venda) => toStr(venda?.id),
          getRecibos: (venda) => normalizeReceiptRows(venda?.vendas_recibos),
          getReciboId: (recibo) => toStr(recibo?.id),
          getReciboNumero: (recibo) => toStr(recibo?.numero_recibo),
          getReciboDataVenda: (recibo) => toDateKey(recibo?.data_venda),
          getReciboCanceledAt: (recibo) => recibo?.cancelado_por_conciliacao_em ?? null,
          withRecibos: (venda, recibos) => ({ ...venda, vendas_recibos: recibos }),
          buildSyntheticRecibo: (item) => buildConcRecibo(item),
          buildSyntheticVenda: (item) =>
            ({
              id: item.id,
              numero_venda: null,
              cliente_id: null,
              company_id: null,
              data_embarque: null,
              data_retorno: null,
              source_venda_id: item.linked_venda_id || null,
              linked_venda_id: item.linked_venda_id || null,
              linked_recibo_id: item.linked_recibo_id || null,
              vendedor_id: item.vendedor_id,
              destino_id: null,
              status: 'confirmado',
              data_venda: item.data_venda,
              valor_total: item.valor_meta_override ?? item.valor_bruto,
              valor_total_bruto: item.valor_bruto,
              valor_total_pago: item.valor_bruto,
              valor_nao_comissionado: 0,
              valor_taxas: item.valor_taxas,
              destinos: null,
              vendas_recibos: [buildConcRecibo(item)]
            }) as unknown as VendaAggregateRow
        }).vendas
      : baseRows;

  const reciboIds = mergedRows
    .flatMap((row) => normalizeReceiptRows(row?.vendas_recibos))
    .map((recibo) => toStr(recibo?.id))
    .filter(isUuid);

  const rateioMap = await fetchRateioByReciboIds(client, reciboIds).catch((error) => {
    console.warn('[vendas-kpis] rateio indisponivel, seguindo sem rateio:', error);
    return new Map<string, RateioRow>();
  });

  return { rows: mergedRows, rateioMap };
}

export async function fetchAndComputeVendasKpis(
  client: SupabaseClient,
  params: {
    dataInicio: string;
    dataFim: string;
    companyIds: string[];
    vendedorIds: string[];
    accessibleClientIds?: string[];
  }
): Promise<VendasKpiAgg> {
  const { rows, rateioMap } = await fetchResolvedRows(client, params);

  const vendaIds = Array.from(
    new Set(
      rows
        .map((row) => toStr((row as any)?.source_venda_id || (row as any)?.linked_venda_id || row?.id))
        .filter((id) => isUuid(id))
    )
  );
  const termosNaoComissionaveis = await carregarTermosNaoComissionaveis(client);
  const naoComissionadoPorVenda = await fetchNaoComissionadoPorVenda(client, vendaIds, termosNaoComissionaveis);

  const scopeVendedorIds = new Set((params.vendedorIds || []).map((id) => toStr(id)).filter(Boolean));
  const hasScopeVendedores = scopeVendedorIds.size > 0;

  let totalVendas = 0;
  let totalTaxas = 0;
  let totalSeguro = 0;
  let qtdVendas = 0;
  let countAtivas = 0;

  const groupedByVenda = new Map<string, { vendaRows: VendaAggregateRow[]; recibos: NonNullReceiptRow[] }>();

  rows.forEach((row) => {
    const syntheticKey = [
      toDateKey(row?.data_venda),
      toStr(row?.vendedor_id),
      toStr((row as any)?.valor_total || (row as any)?.valor_total_bruto),
      toStr((row as any)?.linked_venda_id)
    ].join('|');
    const vendaKey = toStr((row as any)?.source_venda_id || (row as any)?.linked_venda_id || row?.id) || `synt:${syntheticKey}`;
    const current = groupedByVenda.get(vendaKey) || { vendaRows: [], recibos: [] };
    current.vendaRows.push(row);
    if (Array.isArray(row?.vendas_recibos) && row.vendas_recibos.length > 0) {
      current.recibos.push(...normalizeReceiptRows(row.vendas_recibos));
    }
    groupedByVenda.set(vendaKey, current);
  });

  groupedByVenda.forEach((group, vendaKey) => {
    const vendaPrincipal =
      group.vendaRows.find((row) => toStr(row?.id) === vendaKey) || group.vendaRows[0];

    if (isStatusCancelado((vendaPrincipal as any)?.status, vendaPrincipal?.cancelada)) return;

    const vendaDate = toDateKey(vendaPrincipal?.data_venda);
    const recibosAll = filterRecibosCanceladosMesmoMes(group.recibos || []);

    const recibosByKey = new Map<string, ReportReceiptRow>();
    const recibosByBusiness = new Set<string>();
    recibosAll.forEach((recibo) => {
      const reciboId = toStr(recibo?.id);
      const businessKey = buildReciboBusinessKey(recibo);
      if (businessKey && recibosByBusiness.has(businessKey)) return;
      if (businessKey) recibosByBusiness.add(businessKey);
      const key =
        reciboId ||
        businessKey ||
        `${toDateKey(recibo?.data_venda)}|${getReciboBruto(recibo)}|${getReciboTaxas(recibo)}`;
      if (!recibosByKey.has(key)) recibosByKey.set(key, recibo);
    });
    const recibosUnique = Array.from(recibosByKey.values());
    const somaBrutoRecibos = recibosUnique.reduce((acc, recibo) => acc + getReciboBruto(recibo), 0);

    const linkedNaoComissionado = toNum(naoComissionadoPorVenda.porVenda.get(vendaKey) || 0);
    const naoComissionadoSemRecibo = toNum(naoComissionadoPorVenda.porVendaSemRecibo.get(vendaKey) || 0);
    const usarModoPorRecibo = linkedNaoComissionado > 0 && naoComissionadoSemRecibo <= 0;
    const naoComissionadoTotalPagamentos = Math.max(0, toNum(naoComissionadoPorVenda.porVenda.get(vendaKey) || 0));
    const fatorComissionavel =
      !usarModoPorRecibo && somaBrutoRecibos > 0
        ? Math.max(0, Math.min(1, (somaBrutoRecibos - naoComissionadoTotalPagamentos) / somaBrutoRecibos))
        : 1;

    const recibosPeriodo = recibosUnique.filter((recibo) => {
      const reciboDate = toDateKey(recibo?.data_venda) || vendaDate;
      return Boolean(reciboDate) && reciboDate >= params.dataInicio && reciboDate <= params.dataFim;
    });

    if (recibosPeriodo.length === 0) {
      return;
    }

    countAtivas += 1;

    recibosPeriodo.forEach((recibo) => {
      const reciboId = toStr(recibo?.id);
      const naoComissionadoRecibo = usarModoPorRecibo && reciboId
        ? toNum(naoComissionadoPorVenda.porRecibo.get(reciboId) || 0)
        : 0;

      const fatorRecibo = usarModoPorRecibo ? 1 : fatorComissionavel;
      const bruto = usarModoPorRecibo
        ? Math.max(0, getReciboBruto(recibo) - naoComissionadoRecibo)
        : getReciboBruto(recibo) * fatorRecibo;
      const taxasEfetivas = getReciboTaxas(recibo) * fatorRecibo;

      const vendedorId = toStr((vendaPrincipal as any)?.vendedor_id);
      const rateio = reciboId ? rateioMap.get(reciboId) : null;
      const baseAllocations =
        rateio &&
        rateio.ativo &&
        isUuid(rateio.vendedor_origem_id) &&
        isUuid(rateio.vendedor_destino_id) &&
        toNum(rateio.percentual_destino) > 0 &&
        toNum(rateio.percentual_origem) > 0
          ? [
              {
                vendedorId: toStr(rateio.vendedor_origem_id),
                fator: Math.max(0, Math.min(1, toNum(rateio.percentual_origem) / 100))
              },
              {
                vendedorId: toStr(rateio.vendedor_destino_id),
                fator: Math.max(0, Math.min(1, toNum(rateio.percentual_destino) / 100))
              }
            ]
          : [{ vendedorId, fator: 1 }];

      const allocations = hasScopeVendedores
        ? baseAllocations.filter((item) => scopeVendedorIds.has(item.vendedorId))
        : baseAllocations;
      if (allocations.length === 0) return;

      let countedRecibo = false;
      allocations.forEach((allocation) => {
        const brutoAlloc = bruto * allocation.fator;
        const taxasAlloc = taxasEfetivas * allocation.fator;

        if (brutoAlloc <= 0 && taxasAlloc <= 0) return;

        totalVendas += brutoAlloc;
        totalTaxas += taxasAlloc;
        if (!countedRecibo) {
          qtdVendas += 1;
          countedRecibo = true;
        }

        if (isSeguroProduto(recibo)) {
          totalSeguro += brutoAlloc;
        }
      });
    });
  });

  return {
    totalVendas,
    totalTaxas,
    totalLiquido: totalVendas - totalTaxas,
    totalSeguro,
    countVendas: qtdVendas,
    countAtivas
  };
}

export async function fetchAndComputeVendasTimeline(
  client: SupabaseClient,
  params: {
    dataInicio: string;
    dataFim: string;
    companyIds: string[];
    vendedorIds: string[];
    accessibleClientIds?: string[];
  }
): Promise<VendasTimelinePoint[]> {
  const { rows, rateioMap } = await fetchResolvedRows(client, params);

  const vendaIds = Array.from(
    new Set(
      rows
        .map((row) => toStr((row as any)?.source_venda_id || (row as any)?.linked_venda_id || row?.id))
        .filter((id) => isUuid(id))
    )
  );
  const termosNaoComissionaveis = await carregarTermosNaoComissionaveis(client);
  const naoComissionadoPorVenda = await fetchNaoComissionadoPorVenda(client, vendaIds, termosNaoComissionaveis);

  const scopeVendedorIds = new Set((params.vendedorIds || []).map((id) => toStr(id)).filter(Boolean));
  const hasScopeVendedores = scopeVendedorIds.size > 0;
  const timelineMap = new Map<string, number>();

  const groupedByVenda = new Map<string, { vendaRows: VendaAggregateRow[]; recibos: NonNullReceiptRow[] }>();

  rows.forEach((row) => {
    const syntheticKey = [
      toDateKey(row?.data_venda),
      toStr(row?.vendedor_id),
      toStr((row as any)?.valor_total || (row as any)?.valor_total_bruto),
      toStr((row as any)?.linked_venda_id)
    ].join('|');
    const vendaKey = toStr((row as any)?.source_venda_id || (row as any)?.linked_venda_id || row?.id) || `synt:${syntheticKey}`;
    const current = groupedByVenda.get(vendaKey) || { vendaRows: [], recibos: [] };
    current.vendaRows.push(row);
    if (Array.isArray(row?.vendas_recibos) && row.vendas_recibos.length > 0) {
      current.recibos.push(...normalizeReceiptRows(row.vendas_recibos));
    }
    groupedByVenda.set(vendaKey, current);
  });

  groupedByVenda.forEach((group, vendaKey) => {
    const vendaPrincipal =
      group.vendaRows.find((row) => toStr(row?.id) === vendaKey) || group.vendaRows[0];

    if (isStatusCancelado((vendaPrincipal as any)?.status, vendaPrincipal?.cancelada)) return;

    const vendaDate = toDateKey(vendaPrincipal?.data_venda);
    const recibosAll = filterRecibosCanceladosMesmoMes(group.recibos || []);

    const recibosByKey = new Map<string, ReportReceiptRow>();
    const recibosByBusiness = new Set<string>();
    recibosAll.forEach((recibo) => {
      const reciboId = toStr(recibo?.id);
      const businessKey = buildReciboBusinessKey(recibo);
      if (businessKey && recibosByBusiness.has(businessKey)) return;
      if (businessKey) recibosByBusiness.add(businessKey);
      const key =
        reciboId ||
        businessKey ||
        `${toDateKey(recibo?.data_venda)}|${getReciboBruto(recibo)}|${getReciboTaxas(recibo)}`;
      if (!recibosByKey.has(key)) recibosByKey.set(key, recibo);
    });
    const recibosUnique = Array.from(recibosByKey.values());
    const somaBrutoRecibos = recibosUnique.reduce((acc, recibo) => acc + getReciboBruto(recibo), 0);

    const linkedNaoComissionado = toNum(naoComissionadoPorVenda.porVenda.get(vendaKey) || 0);
    const naoComissionadoSemRecibo = toNum(naoComissionadoPorVenda.porVendaSemRecibo.get(vendaKey) || 0);
    const usarModoPorRecibo = linkedNaoComissionado > 0 && naoComissionadoSemRecibo <= 0;
    const naoComissionadoTotalPagamentos = Math.max(0, toNum(naoComissionadoPorVenda.porVenda.get(vendaKey) || 0));
    const fatorComissionavel =
      !usarModoPorRecibo && somaBrutoRecibos > 0
        ? Math.max(0, Math.min(1, (somaBrutoRecibos - naoComissionadoTotalPagamentos) / somaBrutoRecibos))
        : 1;

    const recibosPeriodo = recibosUnique.filter((recibo) => {
      const reciboDate = toDateKey(recibo?.data_venda) || vendaDate;
      return Boolean(reciboDate) && reciboDate >= params.dataInicio && reciboDate <= params.dataFim;
    });

    recibosPeriodo.forEach((recibo) => {
      const reciboId = toStr(recibo?.id);
      const naoComissionadoRecibo = usarModoPorRecibo && reciboId
        ? toNum(naoComissionadoPorVenda.porRecibo.get(reciboId) || 0)
        : 0;

      const fatorRecibo = usarModoPorRecibo ? 1 : fatorComissionavel;
      const bruto = usarModoPorRecibo
        ? Math.max(0, getReciboBruto(recibo) - naoComissionadoRecibo)
        : getReciboBruto(recibo) * fatorRecibo;

      const vendedorId = toStr((vendaPrincipal as any)?.vendedor_id);
      const rateio = reciboId ? rateioMap.get(reciboId) : null;
      const baseAllocations =
        rateio &&
        rateio.ativo &&
        isUuid(rateio.vendedor_origem_id) &&
        isUuid(rateio.vendedor_destino_id) &&
        toNum(rateio.percentual_destino) > 0 &&
        toNum(rateio.percentual_origem) > 0
          ? [
              {
                vendedorId: toStr(rateio.vendedor_origem_id),
                fator: Math.max(0, Math.min(1, toNum(rateio.percentual_origem) / 100))
              },
              {
                vendedorId: toStr(rateio.vendedor_destino_id),
                fator: Math.max(0, Math.min(1, toNum(rateio.percentual_destino) / 100))
              }
            ]
          : [{ vendedorId, fator: 1 }];

      const allocations = hasScopeVendedores
        ? baseAllocations.filter((item) => scopeVendedorIds.has(item.vendedorId))
        : baseAllocations;

      const reciboDate = toDateKey(recibo?.data_venda) || vendaDate;
      if (!reciboDate) return;

      allocations.forEach((allocation) => {
        const brutoAlloc = bruto * allocation.fator;
        if (brutoAlloc <= 0) return;
        timelineMap.set(reciboDate, (timelineMap.get(reciboDate) || 0) + brutoAlloc);
      });
    });
  });

  return Array.from(timelineMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ date, value: Number(value.toFixed(2)) }));
}
