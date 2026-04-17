import { getAdminClient, type UserScope, fetchGestorEquipeIdsComGestor } from '$lib/server/v1';

const DEFAULT_NAO_COMISSIONAVEIS = [
  'credito diversos',
  'credito pax',
  'credito passageiro',
  'credito de viagem',
  'credipax',
  'vale viagem',
  'carta de credito',
  'credito'
];

export function normalizeStatus(value?: string | null) {
  return String(value || '').trim().toUpperCase() || 'OUTRO';
}

export function normalizeTerm(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isFormaNaoComissionavel(nome?: string | null, termos?: string[]) {
  const normalized = normalizeTerm(nome);
  if (!normalized) return false;
  if (normalized.includes('cartao') && normalized.includes('credito')) return false;
  const lista = termos && termos.length ? termos : DEFAULT_NAO_COMISSIONAVEIS;
  return lista.some((termo) => termo && normalized.includes(termo));
}

export function normalizeText(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function normalizeConciliacaoStatus(value?: string | null): 'BAIXA' | 'OPFAX' | 'ESTORNO' | 'OUTRO' {
  const raw = normalizeText(value);
  if (!raw) return 'OUTRO';
  if (raw.includes('ESTORNO')) return 'ESTORNO';
  if (raw.includes('BAIXA')) return 'BAIXA';
  if (raw.includes('OPFAX')) return 'OPFAX';
  return 'OUTRO';
}

export function resolveConciliacaoStatus(params: { status?: string | null; descricao?: string | null }) {
  const descricaoStatus = normalizeConciliacaoStatus(params.descricao);
  if (descricaoStatus !== 'OUTRO') return descricaoStatus;
  return normalizeConciliacaoStatus(params.status);
}

export function isConciliacaoEfetivada(params: { status?: string | null; descricao?: string | null }) {
  return resolveConciliacaoStatus(params) === 'BAIXA';
}

export function buildConciliacaoMetrics(params: {
  descricao?: string | null;
  valorLancamentos?: number | null;
  valorTaxas?: number | null;
  valorDescontos?: number | null;
  valorAbatimentos?: number | null;
  valorNaoComissionavel?: number | null;
  valorSaldo?: number | null;
  valorOpfax?: number | null;
  valorCalculadaLoja?: number | null;
  valorVisaoMaster?: number | null;
  valorComissaoLoja?: number | null;
  percentualComissaoLoja?: number | null;
}) {
  const valorLancamentos = Number(params.valorLancamentos || 0);
  const valorTaxas = Number(params.valorTaxas || 0);
  const valorDescontos = Number(params.valorDescontos || 0);
  const valorAbatimentos = Number(params.valorAbatimentos || 0);
  const valorNaoComissionavel = Number(params.valorNaoComissionavel || 0);
  const valorSaldo = Number(params.valorSaldo || 0);
  const valorOpfax = Number(params.valorOpfax || 0);
  const valorCalculadaLoja = Number(params.valorCalculadaLoja || 0);
  const valorVisaoMaster = Number(params.valorVisaoMaster || 0);
  const valorVendaReal =
    valorCalculadaLoja ||
    valorVisaoMaster ||
    Math.max(0, valorLancamentos - valorTaxas - valorDescontos - valorAbatimentos - valorNaoComissionavel);
  const valorComissaoLoja =
    params.valorComissaoLoja != null ? Number(params.valorComissaoLoja) : valorSaldo || valorOpfax || 0;
  const percentualComissaoLoja =
    valorVendaReal > 0 ? Math.round((valorComissaoLoja / valorVendaReal) * 10000) / 100 : 0;
  const faixaComissao =
    percentualComissaoLoja >= 12 ? '12%+' : percentualComissaoLoja >= 10 ? '10-11.99%' : percentualComissaoLoja > 0 ? '<10%' : '0%';
  const isSeguroViagem = normalizeText(params.descricao).includes('SEGURO');

  return {
    valorVendaReal,
    valorComissaoLoja,
    percentualComissaoLoja,
    faixaComissao,
    isSeguroViagem
  };
}

function rankDuplicateRow(row: any) {
  const metrics = buildConciliacaoMetrics({
    descricao: row?.descricao,
    valorLancamentos: row?.valor_lancamentos,
    valorTaxas: row?.valor_taxas,
    valorDescontos: row?.valor_descontos,
    valorAbatimentos: row?.valor_abatimentos,
    valorNaoComissionavel: row?.valor_nao_comissionavel,
    valorSaldo: row?.valor_saldo,
    valorOpfax: row?.valor_opfax,
    valorCalculadaLoja: row?.valor_calculada_loja,
    valorVisaoMaster: row?.valor_visao_master,
    valorComissaoLoja: row?.valor_comissao_loja,
    percentualComissaoLoja: row?.percentual_comissao_loja
  });
  const percentual = Number(metrics.percentualComissaoLoja ?? 0);
  const comissao = Number(metrics.valorComissaoLoja ?? 0);
  const updatedAt = Date.parse(String(row?.updated_at || row?.created_at || ''));

  let score = 0;
  if (Number.isFinite(percentual) && percentual > 0) score += 4;
  if (Number.isFinite(comissao) && Math.abs(comissao) > 0.009) score += 3;
  if (row?.conciliado) score += 2;
  if (row?.venda_id || row?.venda_recibo_id) score += 1;

  return {
    score,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0
  };
}

export function dedupeConciliacaoRows(rows: any[]) {
  const grouped = new Map<string, any[]>();

  for (const row of rows) {
    const key = [
      String(row?.company_id || '').trim(),
      String(row?.movimento_data || '').trim(),
      String(row?.documento || '').trim(),
      normalizeStatus(row?.status)
    ].join('::');
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  return Array.from(grouped.values()).map((bucket) => {
    if (bucket.length === 1) return bucket[0];

    return [...bucket].sort((left, right) => {
      const leftRank = rankDuplicateRow(left);
      const rightRank = rankDuplicateRow(right);
      if (rightRank.score !== leftRank.score) return rightRank.score - leftRank.score;
      return rightRank.updatedAt - leftRank.updatedAt;
    })[0];
  });
}

export function normalizeComputedFields(row: any) {
  const statusResolvido = resolveConciliacaoStatus({
    status: row?.status,
    descricao: row?.descricao
  });

  const temValorDireto =
    Number(row?.valor_saldo || 0) > 0.009 ||
    Number(row?.valor_calculada_loja || 0) > 0.009 ||
    Number(row?.valor_visao_master || 0) > 0.009;

  const metrics = buildConciliacaoMetrics({
    descricao: row?.descricao,
    valorLancamentos: row?.valor_lancamentos,
    valorTaxas: row?.valor_taxas,
    valorDescontos: row?.valor_descontos,
    valorAbatimentos: row?.valor_abatimentos,
    valorNaoComissionavel: row?.valor_nao_comissionavel,
    valorSaldo: row?.valor_saldo,
    valorOpfax: row?.valor_opfax,
    valorCalculadaLoja: row?.valor_calculada_loja,
    valorVisaoMaster: row?.valor_visao_master,
    valorComissaoLoja: temValorDireto ? null : row?.valor_comissao_loja,
    percentualComissaoLoja: null
  });

  return {
    ...row,
    status: statusResolvido,
    valor_venda_real: metrics.valorVendaReal,
    valor_comissao_loja: metrics.valorComissaoLoja,
    percentual_comissao_loja: metrics.percentualComissaoLoja,
    faixa_comissao: metrics.faixaComissao,
    is_seguro_viagem: metrics.isSeguroViagem
  };
}

export function isRankingEligibleStatus(row: any) {
  return isConciliacaoEfetivada({
    status: row?.status,
    descricao: row?.descricao
  });
}

export async function fetchConciliacaoRankingOptions(params: {
  scope: UserScope;
  companyId: string;
}) {
  const client = getAdminClient();
  let vendedorIds: string[] = [];
  if (params.scope.isGestor) {
    vendedorIds = await fetchGestorEquipeIdsComGestor(client, params.scope.userId);
  }

  let vendedoresQuery = client
    .from('users')
    .select('id, nome_completo')
    .eq('active', true)
    .eq('company_id', params.companyId)
    .order('nome_completo')
    .limit(100);

  if (vendedorIds.length > 0 && !params.scope.isAdmin && !params.scope.isMaster) {
    vendedoresQuery = vendedoresQuery.in('id', vendedorIds);
  }

  const { data: vendedoresData } = await vendedoresQuery;

  const { data: produtosData } = await client
    .from('tipo_produtos')
    .select('id, nome')
    .eq('ativo', true)
    .eq('soma_na_meta', true)
    .order('nome')
    .limit(100);

  const vendedores = vendedoresData || [];
  const produtosMeta = produtosData || [];

  return {
    vendedores,
    produtosMeta,
    vendedorIdSet: new Set(vendedores.map((item: any) => String(item?.id || '').trim()).filter(Boolean)),
    produtoIdSet: new Set(produtosMeta.map((item: any) => String(item?.id || '').trim()).filter(Boolean))
  };
}

