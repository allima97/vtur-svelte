import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReportReceiptRow, ReportVendaRow } from '$lib/server/relatorios';
import {
  calcularDescontoAplicado,
  calcularPctFixoProduto,
  calcularPctPorRegra,
  hasConciliacaoCommissionRule,
  regraProdutoTemFixo,
  resolveConciliacaoCommissionSelection,
  type ParametrosComissao,
  type Regra,
  type RegraProduto,
  type Tier
} from '$lib/utils/comissao';

type CommissionRuleRow = {
  id: string;
  nome?: string | null;
  tipo?: string | null;
  meta_nao_atingida?: number | null;
  meta_atingida?: number | null;
  super_meta?: number | null;
  ativo?: boolean | null;
  company_id?: string | null;
  commission_tier?: Tier[] | null;
};

type TipoPacoteRow = {
  id?: string | null;
  nome?: string | null;
  ativo?: boolean | null;
  rule_id?: string | null;
  fix_meta_nao_atingida?: number | null;
  fix_meta_atingida?: number | null;
  fix_super_meta?: number | null;
};

type TipoProdutoRow = {
  id: string;
  nome?: string | null;
  tipo?: string | null;
  regra_comissionamento?: string | null;
  soma_na_meta?: boolean | null;
  usa_meta_produto?: boolean | null;
  meta_produto_valor?: number | null;
  comissao_produto_meta_pct?: number | null;
  descontar_meta_geral?: boolean | null;
  exibe_kpi_comissao?: boolean | null;
};

type MetaVendedorRow = {
  id: string;
  vendedor_id: string | null;
  periodo: string | null;
  meta_geral?: number | null;
};

type MetaVendedorProdutoRow = {
  meta_vendedor_id: string | null;
  produto_id: string | null;
  valor?: number | null;
};

type VendorPeriodAggregate = {
  metaGeral: number;
  baseMetaGeral: number;
  baseMetaByProduct: Record<string, number>;
  baseComByProduct: Record<string, number>;
  metaProdutoByProduct: Record<string, number>;
};

export type CommissionContext = {
  rules: CommissionRuleRow[];
  packageTypes: TipoPacoteRow[];
  paramsByCompany: Record<string, ParametrosComissao>;
  ruleMap: Record<string, Regra>;
  productRuleMap: Record<string, RegraProduto>;
  productPackageRuleMap: Record<string, Record<string, RegraProduto>>;
  packageRuleMap: Record<string, RegraProduto>;
  productTypeMap: Record<string, TipoProdutoRow>;
  vendorPeriodMap: Record<string, VendorPeriodAggregate>;
};

export type ResolvedVendaCommission = {
  valorVenda: number;
  valorComissionavel: number;
  percentual: number;
  valorComissao: number;
  regraId: string | null;
  regraNome: string;
  tipoPacote: string | null;
};

function toNum(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function cleanTipoPacoteForRule(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let cleaned = raw;
  while (/\s*\([^()]*\)\s*$/.test(cleaned)) {
    cleaned = cleaned.replace(/\s*\([^()]*\)\s*$/, '').trim();
  }

  return cleaned || raw;
}

function normalizeTipoPacoteRuleKey(value?: string | null) {
  return normalizeText(cleanTipoPacoteForRule(value))
    .replace(/\s+/g, ' ')
    .trim();
}

function isMissingSchemaError(error: unknown) {
  const code = String((error as { code?: string })?.code || '').trim();
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (
    code === '42703' ||
    code === '42P01' ||
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

function buildDefaultParametros(): ParametrosComissao {
  return {
    usar_taxas_na_meta: true,
    foco_valor: 'bruto',
    foco_faturamento: 'bruto',
    conciliacao_sobrepoe_vendas: false,
    conciliacao_regra_ativa: false,
    conciliacao_tipo: 'GERAL',
    conciliacao_meta_nao_atingida: null,
    conciliacao_meta_atingida: null,
    conciliacao_super_meta: null,
    conciliacao_tiers: [],
    conciliacao_faixas_loja: []
  };
}

function toPeriodStart(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const month = raw.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : '';
}

function buildVendorPeriodKey(vendedorId?: string | null, dateIso?: string | null) {
  const vendedor = String(vendedorId || '').trim();
  const period = toPeriodStart(dateIso);
  if (!vendedor || !period) return '';
  return `${vendedor}::${period}`;
}

function pickReceiptPeriod(row: Pick<ReportVendaRow, 'data_venda'>, receipt?: ReportReceiptRow | null) {
  return String(receipt?.data_venda || row.data_venda || '').trim() || null;
}

function isSeguroProduto(produto?: TipoProdutoRow | null) {
  const nome = normalizeText(produto?.nome);
  const tipo = normalizeText(produto?.tipo);
  return nome.includes('seguro') || tipo.includes('seguro');
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

function getReciboBrutoTotal(recibo: ReportReceiptRow) {
  if (hasConciliacaoOverride(recibo) && recibo?.valor_bruto_override != null) {
    return Math.max(0, toNum(recibo.valor_bruto_override));
  }
  return Math.max(0, toNum(recibo?.valor_total));
}

function getReciboTaxasEfetivas(recibo: ReportReceiptRow) {
  if (hasConciliacaoOverride(recibo)) {
    return Math.max(0, toNum(recibo?.valor_taxas));
  }
  return Math.max(0, toNum(recibo?.valor_taxas) - toNum(recibo?.valor_du));
}

function getReciboLiquido(recibo: ReportReceiptRow) {
  if (recibo?.valor_liquido_override != null) {
    return Math.max(0, toNum(recibo.valor_liquido_override));
  }
  const brutoSemRav = Math.max(0, toNum(recibo?.valor_total) - toNum(recibo?.valor_rav));
  return Math.max(0, brutoSemRav - getReciboTaxasEfetivas(recibo));
}

function getReciboMeta(recibo: ReportReceiptRow, parametros: ParametrosComissao) {
  if (recibo?.valor_meta_override != null) {
    return Math.max(0, toNum(recibo.valor_meta_override));
  }
  const liquido = getReciboLiquido(recibo);
  const brutoTotal = getReciboBrutoTotal(recibo);
  return parametros.foco_valor === 'liquido'
    ? liquido
    : parametros.usar_taxas_na_meta
      ? brutoTotal
      : liquido;
}

function getRowTipoPacote(row: Pick<ReportVendaRow, 'recibos'>) {
  const tipos = Array.from(
    new Set(
      (Array.isArray(row.recibos) ? row.recibos : [])
        .map((recibo) => String(recibo?.tipo_pacote || '').trim())
        .filter(Boolean)
    )
  );
  if (tipos.length === 0) return null;
  if (tipos.length === 1) return tipos[0];
  return 'Multiplos';
}

function buildRuleLabel(params: {
  origin: 'conciliacao' | 'tipo_pacote' | 'produto_pacote' | 'produto' | 'fixo' | 'diferenciado' | 'sem_regra';
  regra?: Regra | null;
  isDiferenciado?: boolean;
  isFixed?: boolean;
}) {
  if (params.origin === 'conciliacao') return 'Conciliação';
  if (params.origin === 'sem_regra') return 'Sem regra';
  if (params.isDiferenciado) {
    if (params.origin === 'tipo_pacote') return 'Diferenciado (tipo pacote)';
    if (params.origin === 'produto_pacote') return 'Diferenciado (pacote do produto)';
    return 'Diferenciado';
  }
  if (params.isFixed) {
    if (params.origin === 'tipo_pacote') return 'Fixo (tipo pacote)';
    if (params.origin === 'produto_pacote') return 'Fixo (pacote do produto)';
    if (params.origin === 'produto') return 'Fixo';
  }
  if (params.regra?.tipo === 'ESCALONAVEL') {
    if (params.origin === 'tipo_pacote') return 'Escalonável (tipo pacote)';
    if (params.origin === 'produto_pacote') return 'Escalonável (pacote do produto)';
    return 'Escalonável';
  }
  if (params.origin === 'tipo_pacote') return 'Geral (tipo pacote)';
  if (params.origin === 'produto_pacote') return 'Geral (pacote do produto)';
  return 'Geral';
}

function buildRuleFromRow(row: CommissionRuleRow): Regra {
  return {
    id: row.id,
    tipo: String(row.tipo || 'GERAL').trim().toUpperCase() === 'ESCALONAVEL' ? 'ESCALONAVEL' : 'GERAL',
    meta_nao_atingida: row.meta_nao_atingida ?? 0,
    meta_atingida: row.meta_atingida ?? row.meta_nao_atingida ?? 0,
    super_meta: row.super_meta ?? row.meta_atingida ?? row.meta_nao_atingida ?? 0,
    commission_tier: Array.isArray(row.commission_tier) ? row.commission_tier : []
  };
}

function buildRuleRef(params: {
  produtoId: string;
  ruleId?: string | null;
  fix_meta_nao_atingida?: number | null;
  fix_meta_atingida?: number | null;
  fix_super_meta?: number | null;
}): RegraProduto {
  return {
    produto_id: params.produtoId,
    rule_id: params.ruleId ?? null,
    fix_meta_nao_atingida: params.fix_meta_nao_atingida ?? null,
    fix_meta_atingida: params.fix_meta_atingida ?? null,
    fix_super_meta: params.fix_super_meta ?? null
  };
}

function getProductId(receipt?: ReportReceiptRow | null) {
  return String(
    receipt?.tipo_produtos?.id || receipt?.produto_id || receipt?.produto_resolvido?.id || ''
  ).trim();
}

function getProductRow(context: CommissionContext, receipt?: ReportReceiptRow | null): TipoProdutoRow | null {
  const productId = getProductId(receipt);
  const inlineRow = receipt?.tipo_produtos;
  if (productId && context.productTypeMap[productId]) {
    return {
      ...context.productTypeMap[productId],
      ...(inlineRow || {}),
      id: productId
    };
  }
  if (inlineRow?.id) {
    return {
      id: String(inlineRow.id),
      nome: inlineRow.nome ?? null,
      tipo: inlineRow.tipo ?? null,
      regra_comissionamento: inlineRow.regra_comissionamento ?? null,
      soma_na_meta: inlineRow.soma_na_meta ?? null,
      usa_meta_produto: inlineRow.usa_meta_produto ?? null,
      meta_produto_valor: inlineRow.meta_produto_valor ?? null,
      comissao_produto_meta_pct: inlineRow.comissao_produto_meta_pct ?? null,
      descontar_meta_geral: inlineRow.descontar_meta_geral ?? null,
      exibe_kpi_comissao: inlineRow.exibe_kpi_comissao ?? null
    };
  }
  return null;
}

function hasPackageRuleConfig(rule?: RegraProduto | null) {
  return Boolean(rule && (rule.rule_id || regraProdutoTemFixo(rule)));
}

async function fetchParametrosByCompany(
  client: SupabaseClient,
  companyIds: string[]
): Promise<Record<string, ParametrosComissao>> {
  const paramsByCompany: Record<string, ParametrosComissao> = {};
  const ids = companyIds.filter(Boolean);
  if (ids.length === 0) return paramsByCompany;

  const query = client
    .from('parametros_comissao')
    .select(
      'company_id, usar_taxas_na_meta, foco_valor, foco_faturamento, conciliacao_sobrepoe_vendas, conciliacao_regra_ativa, conciliacao_tipo, conciliacao_meta_nao_atingida, conciliacao_meta_atingida, conciliacao_super_meta, conciliacao_tiers, conciliacao_faixas_loja'
    )
    .in('company_id', ids)
    .limit(200);

  const { data, error } = await query;
  if (error && !isMissingSchemaError(error)) throw error;

  for (const row of (data || []) as Array<Record<string, unknown>>) {
    const companyId = String(row.company_id || '').trim();
    if (!companyId) continue;
    paramsByCompany[companyId] = {
      usar_taxas_na_meta: Boolean(row.usar_taxas_na_meta),
      foco_valor: String(row.foco_valor || 'bruto') === 'liquido' ? 'liquido' : 'bruto',
      foco_faturamento: String(row.foco_faturamento || 'bruto') === 'liquido' ? 'liquido' : 'bruto',
      conciliacao_sobrepoe_vendas: Boolean(row.conciliacao_sobrepoe_vendas),
      conciliacao_regra_ativa: Boolean(row.conciliacao_regra_ativa),
      conciliacao_tipo: String(row.conciliacao_tipo || 'GERAL') === 'ESCALONAVEL' ? 'ESCALONAVEL' : 'GERAL',
      conciliacao_meta_nao_atingida:
        row.conciliacao_meta_nao_atingida != null ? Number(row.conciliacao_meta_nao_atingida) : null,
      conciliacao_meta_atingida:
        row.conciliacao_meta_atingida != null ? Number(row.conciliacao_meta_atingida) : null,
      conciliacao_super_meta:
        row.conciliacao_super_meta != null ? Number(row.conciliacao_super_meta) : null,
      conciliacao_tiers: Array.isArray(row.conciliacao_tiers) ? (row.conciliacao_tiers as Tier[]) : [],
      conciliacao_faixas_loja: Array.isArray(row.conciliacao_faixas_loja)
        ? (row.conciliacao_faixas_loja as ParametrosComissao['conciliacao_faixas_loja'])
        : []
    };
  }

  return paramsByCompany;
}

async function fetchCommissionRules(client: SupabaseClient, companyIds: string[]) {
  const ids = companyIds.filter(Boolean);
  const primary = await client
    .from('commission_rule')
    .select(
      'id, nome, tipo, meta_nao_atingida, meta_atingida, super_meta, ativo, company_id, commission_tier (faixa, de_pct, ate_pct, inc_pct_meta, inc_pct_comissao)'
    )
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .limit(1000);

  let rules = primary.data as CommissionRuleRow[] | null;
  let error = primary.error;

  if (error && isMissingSchemaError(error)) {
    const fallback = await client
      .from('commission_rule')
      .select(
        'id, nome, tipo, meta_nao_atingida, meta_atingida, super_meta, ativo, commission_tier (faixa, de_pct, ate_pct, inc_pct_meta, inc_pct_comissao)'
      )
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(1000);
    rules = fallback.data as CommissionRuleRow[] | null;
    error = fallback.error;
  }

  if (error) throw error;

  return (rules || []).filter((rule) => {
    if (!rule.company_id) return true;
    if (ids.length === 0) return true;
    return ids.includes(String(rule.company_id));
  });
}

async function fetchTipoPacotes(client: SupabaseClient) {
  const { data, error } = await client
    .from('tipo_pacotes')
    .select('id, nome, ativo, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta')
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .limit(500);
  if (error && !isMissingSchemaError(error)) throw error;
  return (data || []) as TipoPacoteRow[];
}

async function fetchTipoProdutos(client: SupabaseClient, productIds: string[]) {
  const ids = productIds.filter(Boolean);
  if (ids.length === 0) return [] as TipoProdutoRow[];

  const queryFull = await client
    .from('tipo_produtos')
    .select(
      'id, nome, tipo, regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral, exibe_kpi_comissao'
    )
    .in('id', ids)
    .limit(1000);

  if (!queryFull.error) return (queryFull.data || []) as TipoProdutoRow[];
  if (!isMissingSchemaError(queryFull.error)) throw queryFull.error;

  const fallback = await client
    .from('tipo_produtos')
    .select('id, nome, tipo, regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral')
    .in('id', ids)
    .limit(1000);

  if (!fallback.error) return (fallback.data || []) as TipoProdutoRow[];
  if (!isMissingSchemaError(fallback.error)) throw fallback.error;

  const basic = await client
    .from('tipo_produtos')
    .select('id, nome, tipo')
    .in('id', ids)
    .limit(1000);

  if (basic.error) throw basic.error;
  return (basic.data || []) as TipoProdutoRow[];
}

async function fetchProductRules(client: SupabaseClient, productIds: string[]) {
  const ids = productIds.filter(Boolean);
  if (ids.length === 0) {
    return {
      productRuleRows: [] as Array<Record<string, unknown>>,
      productPackageRuleRows: [] as Array<Record<string, unknown>>
    };
  }

  const [productRuleRes, productPackageRuleRes] = await Promise.all([
    client
      .from('product_commission_rule')
      .select('produto_id, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta')
      .in('produto_id', ids)
      .limit(1000),
    client
      .from('product_commission_rule_pacote')
      .select('produto_id, tipo_pacote, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta')
      .in('produto_id', ids)
      .limit(2000)
  ]);

  if (productRuleRes.error && !isMissingSchemaError(productRuleRes.error)) throw productRuleRes.error;
  if (productPackageRuleRes.error && !isMissingSchemaError(productPackageRuleRes.error)) {
    throw productPackageRuleRes.error;
  }

  return {
    productRuleRows: (productRuleRes.data || []) as Array<Record<string, unknown>>,
    productPackageRuleRows: (productPackageRuleRes.data || []) as Array<Record<string, unknown>>
  };
}

async function fetchMetas(
  client: SupabaseClient,
  vendorIds: string[],
  periods: string[]
) {
  const vendedores = vendorIds.filter(Boolean);
  const meses = periods.filter(Boolean).sort();
  if (vendedores.length === 0 || meses.length === 0) {
    return {
      metasRows: [] as MetaVendedorRow[],
      metasProdutoRows: [] as MetaVendedorProdutoRow[]
    };
  }

  let metasQuery = client
    .from('metas_vendedor')
    .select('id, vendedor_id, periodo, meta_geral, ativo, scope')
    .eq('ativo', true)
    .gte('periodo', meses[0])
    .lte('periodo', meses[meses.length - 1])
    .limit(2000);

  metasQuery = metasQuery.in('vendedor_id', vendedores);

  const metasRes = await metasQuery;
  if (metasRes.error && !isMissingSchemaError(metasRes.error)) throw metasRes.error;

  const metasRows = ((metasRes.data || []) as Array<Record<string, unknown>>)
    .filter((row) => {
      const scope = String(row.scope || 'vendedor').trim();
      return scope === 'vendedor';
    })
    .map((row) => ({
      id: String(row.id || ''),
      vendedor_id: String(row.vendedor_id || '') || null,
      periodo: String(row.periodo || '') || null,
      meta_geral: row.meta_geral != null ? Number(row.meta_geral) : null
    }))
    .filter((row) => row.id && row.vendedor_id && row.periodo);

  const metaIds = metasRows.map((row) => row.id);
  if (metaIds.length === 0) {
    return { metasRows, metasProdutoRows: [] as MetaVendedorProdutoRow[] };
  }

  const metasProdutoRes = await client
    .from('metas_vendedor_produto')
    .select('meta_vendedor_id, produto_id, valor')
    .in('meta_vendedor_id', metaIds)
    .limit(5000);

  if (metasProdutoRes.error && !isMissingSchemaError(metasProdutoRes.error)) throw metasProdutoRes.error;

  return {
    metasRows,
    metasProdutoRows: (metasProdutoRes.data || []) as MetaVendedorProdutoRow[]
  };
}

function buildVendorPeriodAggregates(rows: ReportVendaRow[], context: CommissionContext) {
  const aggregates: Record<string, VendorPeriodAggregate> = {};

  const ensureAggregate = (key: string, metaGeral: number) => {
    if (!aggregates[key]) {
      aggregates[key] = {
        metaGeral,
        baseMetaGeral: 0,
        baseMetaByProduct: {},
        baseComByProduct: {},
        metaProdutoByProduct: {}
      };
    } else if (metaGeral > 0) {
      aggregates[key].metaGeral = metaGeral;
    }
    return aggregates[key];
  };

  Object.entries(context.vendorPeriodMap).forEach(([key, value]) => {
    ensureAggregate(key, value.metaGeral).metaProdutoByProduct = { ...value.metaProdutoByProduct };
  });

  for (const row of rows) {
    const params = context.paramsByCompany[String(row.company_id || '').trim()] || buildDefaultParametros();
    const receipts = (Array.isArray(row.recibos) ? row.recibos : []).filter(
      (receipt) => !receipt?.cancelado_por_conciliacao_em
    );

    const totalBrutoVendaBase = receipts.reduce((sum, receipt) => sum + getReciboBrutoTotal(receipt), 0);
    const descontoComercialBase =
      toNum(row.desconto_comercial_valor) > 0
        ? toNum(row.desconto_comercial_valor)
        : calcularDescontoAplicado(totalBrutoVendaBase, row.valor_total_bruto, row.valor_total_pago);
    const baseComissionavel = Math.max(
      0,
      totalBrutoVendaBase - descontoComercialBase - toNum(row.valor_nao_comissionado)
    );
    const fatorComissionavel =
      totalBrutoVendaBase > 0
        ? Math.max(0, Math.min(1, baseComissionavel / totalBrutoVendaBase))
        : 1;

    for (const receipt of receipts) {
      const periodKey = buildVendorPeriodKey(row.vendedor_id, pickReceiptPeriod(row, receipt));
      if (!periodKey) continue;

      const productId = getProductId(receipt);
      const product = getProductRow(context, receipt);
      const aggregate = ensureAggregate(periodKey, aggregates[periodKey]?.metaGeral || 0);
      const metaAmount = getReciboMeta(receipt, params) * fatorComissionavel;
      const baseCom = getReciboLiquido(receipt) * fatorComissionavel;

      if (productId) {
        aggregate.baseMetaByProduct[productId] = (aggregate.baseMetaByProduct[productId] || 0) + metaAmount;
        aggregate.baseComByProduct[productId] = (aggregate.baseComByProduct[productId] || 0) + baseCom;
      }

      if (product?.soma_na_meta) {
        aggregate.baseMetaGeral += metaAmount;
      }
    }
  }

  return aggregates;
}

export async function fetchCommissionContext(
  client: SupabaseClient,
  params: {
    companyIds?: string[];
    rows?: ReportVendaRow[];
  } = {}
): Promise<CommissionContext> {
  const rows = Array.isArray(params.rows) ? params.rows : [];
  const companyIds = Array.from(
    new Set([
      ...(params.companyIds || []).map((id) => String(id || '').trim()).filter(Boolean),
      ...rows.map((row) => String(row.company_id || '').trim()).filter(Boolean)
    ])
  );

  const productIds = Array.from(
    new Set(
      rows
        .flatMap((row) => (Array.isArray(row.recibos) ? row.recibos : []))
        .map((receipt) => getProductId(receipt))
        .filter(Boolean)
    )
  );

  const vendorIds = Array.from(
    new Set(rows.map((row) => String(row.vendedor_id || '').trim()).filter(Boolean))
  );
  const periods = Array.from(
    new Set(
      rows
        .flatMap((row) =>
          (Array.isArray(row.recibos) ? row.recibos : []).map((receipt) =>
            toPeriodStart(pickReceiptPeriod(row, receipt))
          )
        )
        .filter(Boolean)
    )
  );

  const [paramsByCompany, rules, packageTypes, tipoProdutos, productRuleData, metasData] = await Promise.all([
    fetchParametrosByCompany(client, companyIds),
    fetchCommissionRules(client, companyIds),
    fetchTipoPacotes(client),
    fetchTipoProdutos(client, productIds),
    fetchProductRules(client, productIds),
    fetchMetas(client, vendorIds, periods)
  ]);

  const ruleMap: Record<string, Regra> = {};
  for (const rule of rules) {
    if (!rule.id) continue;
    ruleMap[rule.id] = buildRuleFromRow(rule);
  }

  const productRuleMap: Record<string, RegraProduto> = {};
  for (const row of productRuleData.productRuleRows) {
    const produtoId = String(row.produto_id || '').trim();
    if (!produtoId) continue;
    productRuleMap[produtoId] = buildRuleRef({
      produtoId,
      ruleId: String(row.rule_id || '').trim() || null,
      fix_meta_nao_atingida:
        row.fix_meta_nao_atingida != null ? Number(row.fix_meta_nao_atingida) : null,
      fix_meta_atingida: row.fix_meta_atingida != null ? Number(row.fix_meta_atingida) : null,
      fix_super_meta: row.fix_super_meta != null ? Number(row.fix_super_meta) : null
    });
  }

  const productPackageRuleMap: Record<string, Record<string, RegraProduto>> = {};
  for (const row of productRuleData.productPackageRuleRows) {
    const produtoId = String(row.produto_id || '').trim();
    const pacoteKey = normalizeTipoPacoteRuleKey(String(row.tipo_pacote || ''));
    if (!produtoId || !pacoteKey) continue;
    if (!productPackageRuleMap[produtoId]) productPackageRuleMap[produtoId] = {};
    productPackageRuleMap[produtoId][pacoteKey] = buildRuleRef({
      produtoId,
      ruleId: String(row.rule_id || '').trim() || null,
      fix_meta_nao_atingida:
        row.fix_meta_nao_atingida != null ? Number(row.fix_meta_nao_atingida) : null,
      fix_meta_atingida: row.fix_meta_atingida != null ? Number(row.fix_meta_atingida) : null,
      fix_super_meta: row.fix_super_meta != null ? Number(row.fix_super_meta) : null
    });
  }

  const packageRuleMap: Record<string, RegraProduto> = {};
  for (const row of packageTypes) {
    const pacoteKey = normalizeTipoPacoteRuleKey(row.nome);
    if (!pacoteKey) continue;
    packageRuleMap[pacoteKey] = buildRuleRef({
      produtoId: `tipo-pacote:${pacoteKey}`,
      ruleId: String(row.rule_id || '').trim() || null,
      fix_meta_nao_atingida:
        row.fix_meta_nao_atingida != null ? Number(row.fix_meta_nao_atingida) : null,
      fix_meta_atingida: row.fix_meta_atingida != null ? Number(row.fix_meta_atingida) : null,
      fix_super_meta: row.fix_super_meta != null ? Number(row.fix_super_meta) : null
    });
  }

  const productTypeMap = (tipoProdutos || []).reduce<Record<string, TipoProdutoRow>>((acc, row) => {
    if (!row.id) return acc;
    acc[String(row.id)] = row;
    return acc;
  }, {});

  const vendorPeriodMap: Record<string, VendorPeriodAggregate> = {};
  const metaToVendorPeriodKey = new Map<string, string>();

  for (const metaRow of metasData.metasRows) {
    const key = buildVendorPeriodKey(metaRow.vendedor_id, metaRow.periodo);
    if (!key) continue;
    metaToVendorPeriodKey.set(metaRow.id, key);
    vendorPeriodMap[key] = {
      metaGeral: toNum(metaRow.meta_geral),
      baseMetaGeral: 0,
      baseMetaByProduct: {},
      baseComByProduct: {},
      metaProdutoByProduct: {}
    };
  }

  for (const metaProdutoRow of metasData.metasProdutoRows) {
    const key = metaToVendorPeriodKey.get(String(metaProdutoRow.meta_vendedor_id || ''));
    const produtoId = String(metaProdutoRow.produto_id || '').trim();
    if (!key || !produtoId) continue;
    if (!vendorPeriodMap[key]) {
      vendorPeriodMap[key] = {
        metaGeral: 0,
        baseMetaGeral: 0,
        baseMetaByProduct: {},
        baseComByProduct: {},
        metaProdutoByProduct: {}
      };
    }
    vendorPeriodMap[key].metaProdutoByProduct[produtoId] =
      (vendorPeriodMap[key].metaProdutoByProduct[produtoId] || 0) + toNum(metaProdutoRow.valor);
  }

  const context: CommissionContext = {
    rules,
    packageTypes,
    paramsByCompany,
    ruleMap,
    productRuleMap,
    productPackageRuleMap,
    packageRuleMap,
    productTypeMap,
    vendorPeriodMap
  };

  context.vendorPeriodMap = buildVendorPeriodAggregates(rows, context);
  return context;
}

export function resolveVendaCommission(
  row: Pick<
    ReportVendaRow,
    | 'company_id'
    | 'valor_total'
    | 'valor_total_bruto'
    | 'valor_total_pago'
    | 'valor_nao_comissionado'
    | 'desconto_comercial_valor'
    | 'data_venda'
    | 'vendedor_id'
    | 'recibos'
  >,
  context: CommissionContext
): ResolvedVendaCommission {
  const receipts = (Array.isArray(row.recibos) ? row.recibos : []).filter(
    (receipt) => !receipt?.cancelado_por_conciliacao_em
  );

  const valorVenda =
    receipts.length > 0
      ? roundMoney(receipts.reduce((sum, receipt) => sum + getReciboBrutoTotal(receipt), 0))
      : roundMoney(toNum(row.valor_total || row.valor_total_bruto));

  const totalBrutoVendaBase = receipts.reduce((sum, receipt) => sum + getReciboBrutoTotal(receipt), 0);
  const descontoComercialBase =
    toNum(row.desconto_comercial_valor) > 0
      ? toNum(row.desconto_comercial_valor)
      : calcularDescontoAplicado(totalBrutoVendaBase, row.valor_total_bruto, row.valor_total_pago);
  const valorComissionavel = Math.max(
    0,
    roundMoney(totalBrutoVendaBase - descontoComercialBase - toNum(row.valor_nao_comissionado))
  );
  const fatorComissionavel =
    totalBrutoVendaBase > 0
      ? Math.max(0, Math.min(1, valorComissionavel / totalBrutoVendaBase))
      : 1;

  let valorComissao = 0;
  const regraIds = new Set<string>();
  const regraNomes = new Set<string>();
  const tipoPacotes = new Set<string>();

  const params = context.paramsByCompany[String(row.company_id || '').trim()] || buildDefaultParametros();

  for (const receipt of receipts) {
    const baseComBucket = getReciboLiquido(receipt) * fatorComissionavel;
    if (baseComBucket <= 0) continue;

    const productId = getProductId(receipt);
    const product = getProductRow(context, receipt);
    const periodKey = buildVendorPeriodKey(row.vendedor_id, pickReceiptPeriod(row, receipt));
    const aggregate = context.vendorPeriodMap[periodKey] || {
      metaGeral: 0,
      baseMetaGeral: 0,
      baseMetaByProduct: {},
      baseComByProduct: {},
      metaProdutoByProduct: {}
    };
    const pctMetaGeral =
      aggregate.metaGeral > 0 ? (aggregate.baseMetaGeral / aggregate.metaGeral) * 100 : 0;
    const baseMetaProd = aggregate.baseMetaByProduct[productId] || 0;
    const baseComProd = aggregate.baseComByProduct[productId] || 0;
    const metaProduto = aggregate.metaProdutoByProduct[productId] || 0;
    const temMetaProduto = metaProduto > 0;
    const pctMetaProd = temMetaProduto ? (baseMetaProd / metaProduto) * 100 : 0;
    const pctReferenciaDiferenciada = temMetaProduto ? pctMetaProd : pctMetaGeral;

    const tipoPacoteKey = normalizeTipoPacoteRuleKey(receipt?.tipo_pacote || '');
    const pacoteRegraTipo = tipoPacoteKey ? context.packageRuleMap[tipoPacoteKey] || null : null;
    const pacoteRegraProduto =
      tipoPacoteKey && productId ? context.productPackageRuleMap[productId]?.[tipoPacoteKey] || null : null;
    const produtoRegraBase = productId ? context.productRuleMap[productId] || null : null;

    let selectedRuleRef: RegraProduto | null = null;
    let selectedOrigin: 'tipo_pacote' | 'produto_pacote' | 'produto' | 'fixo' | 'diferenciado' | 'sem_regra' =
      'sem_regra';

    if (hasPackageRuleConfig(pacoteRegraTipo)) {
      selectedRuleRef = pacoteRegraTipo;
      selectedOrigin = 'tipo_pacote';
    } else if (hasPackageRuleConfig(pacoteRegraProduto)) {
      selectedRuleRef = pacoteRegraProduto;
      selectedOrigin = 'produto_pacote';
    } else if (produtoRegraBase) {
      selectedRuleRef = produtoRegraBase;
      selectedOrigin = 'produto';
    }

    if (hasConciliacaoOverride(receipt) && hasConciliacaoCommissionRule(params)) {
      const selection = resolveConciliacaoCommissionSelection(params, {
        faixa_comissao: receipt?.faixa_comissao || null,
        percentual_comissao_loja:
          receipt?.percentual_comissao_loja != null ? Number(receipt.percentual_comissao_loja) : null,
        is_seguro_viagem: isSeguroProduto(product)
      });

      if (selection.kind === 'CONCILIACAO' && selection.rule) {
        const pctCom = calcularPctPorRegra(selection.rule, pctMetaGeral);
        const valor = baseComBucket * (pctCom / 100);
        valorComissao += valor;
        regraIds.add(selection.rule.id);
        regraNomes.add('Conciliação');
        if (receipt?.tipo_pacote) tipoPacotes.add(String(receipt.tipo_pacote));
        continue;
      }
    }

    if (product?.regra_comissionamento === 'diferenciado') {
      if (!selectedRuleRef) continue;
      const pctCom = calcularPctFixoProduto(selectedRuleRef, pctReferenciaDiferenciada);
      const valor = baseComBucket * (pctCom / 100);
      valorComissao += valor;
      if (selectedRuleRef.rule_id) regraIds.add(selectedRuleRef.rule_id);
      regraNomes.add(
        buildRuleLabel({ origin: selectedOrigin, isDiferenciado: true, isFixed: true })
      );
      if (receipt?.tipo_pacote) tipoPacotes.add(String(receipt.tipo_pacote));
      continue;
    }

    let pctCom = 0;
    let usouFixo = false;
    let regRef = selectedRuleRef;

    if (regRef && !regRef.rule_id) {
      if (regraProdutoTemFixo(regRef)) {
        pctCom = calcularPctFixoProduto(regRef, pctMetaGeral);
        usouFixo = true;
      } else if (selectedOrigin === 'produto_pacote') {
        regRef = produtoRegraBase;
        selectedOrigin = produtoRegraBase ? 'produto' : 'sem_regra';
      }
    }

    const reg = regRef?.rule_id ? context.ruleMap[regRef.rule_id] : null;
    if (!usouFixo && reg) {
      pctCom = calcularPctPorRegra(reg, pctMetaGeral);
    }

    let extraPct = 0;
    if (
      product?.usa_meta_produto &&
      toNum(product.meta_produto_valor) > 0 &&
      toNum(product.comissao_produto_meta_pct) > 0 &&
      baseMetaProd >= toNum(product.meta_produto_valor) &&
      baseComProd > 0
    ) {
      const metaPct = toNum(product.comissao_produto_meta_pct);
      const valMetaProd = baseComProd * (metaPct / 100);
      const valGeral = baseComProd * (pctCom / 100);
      const diffValor =
        product.descontar_meta_geral === false ? valMetaProd : Math.max(valMetaProd - valGeral, 0);
      if (diffValor > 0) {
        extraPct = (diffValor / baseComProd) * 100;
      }
    }

    const pctFinal = pctCom + extraPct;
    if (pctFinal <= 0) continue;

    valorComissao += baseComBucket * (pctFinal / 100);
    if (regRef?.rule_id) regraIds.add(regRef.rule_id);
    regraNomes.add(
      buildRuleLabel({ origin: selectedOrigin, regra: reg, isFixed: usouFixo })
    );
    if (receipt?.tipo_pacote) tipoPacotes.add(String(receipt.tipo_pacote));
  }

  const percentual =
    valorComissionavel > 0 ? roundMoney((valorComissao / valorComissionavel) * 100) : 0;
  const regraNome =
    regraNomes.size === 0
      ? 'Sem regra'
      : regraNomes.size === 1
        ? Array.from(regraNomes)[0]
        : `Múltiplas regras (${regraNomes.size})`;

  const tipoPacote =
    tipoPacotes.size === 0 ? getRowTipoPacote(row) : tipoPacotes.size === 1 ? Array.from(tipoPacotes)[0] : 'Multiplos';

  return {
    valorVenda,
    valorComissionavel,
    percentual,
    valorComissao: roundMoney(valorComissao),
    regraId: regraIds.size === 1 ? Array.from(regraIds)[0] : null,
    regraNome,
    tipoPacote
  };
}
