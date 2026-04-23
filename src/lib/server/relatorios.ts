import type { SupabaseClient } from '@supabase/supabase-js';

export type ReportReceiptRow = {
  id?: string | null;
  numero_recibo?: string | null;
  data_venda?: string | null;
  produto_id?: string | null;
  destino_cidade?: {
    id?: string | null;
    nome?: string | null;
  } | null;
  valor_total?: number | null;
  valor_taxas?: number | null;
  valor_du?: number | null;
  valor_rav?: number | null;
  tipo_pacote?: string | null;
  percentual_comissao_loja?: number | null;
  faixa_comissao?: string | null;
  valor_comissao_loja?: number | null;
  cancelado_por_conciliacao_em?: string | null;
  cancelado_por_conciliacao_observacao?: string | null;
  valor_bruto_override?: number | null;
  valor_liquido_override?: number | null;
  valor_meta_override?: number | null;
  tipo_produtos?: {
    id?: string | null;
    nome?: string | null;
    tipo?: string | null;
    regra_comissionamento?: string | null;
    soma_na_meta?: boolean | null;
    usa_meta_produto?: boolean | null;
    meta_produto_valor?: number | null;
    comissao_produto_meta_pct?: number | null;
    descontar_meta_geral?: boolean | null;
    exibe_kpi_comissao?: boolean | null;
  } | null;
  produto_resolvido?: {
    id?: string | null;
    nome?: string | null;
    tipo_produto?: string | null;
    valor_neto?: number | null;
    valor_em_reais?: number | null;
  } | null;
} | null;

export type ReportVendaRow = {
  id: string;
  numero_venda: string | null;
  cliente_id: string | null;
  vendedor_id: string | null;
  company_id: string | null;
  data_venda: string | null;
  data_embarque: string | null;
  data_final: string | null;
  valor_total: number | null;
  valor_total_bruto?: number | null;
  valor_total_pago?: number | null;
  desconto_comercial_valor?: number | null;
  valor_nao_comissionado: number | null;
  valor_taxas: number | null;
  cancelada: boolean | null;
  clientes?: {
    nome?: string | null;
    email?: string | null;
    cpf?: string | null;
  } | null;
  vendedor?: {
    nome_completo?: string | null;
    email?: string | null;
  } | null;
  destino_cidade?: {
    id?: string | null;
    nome?: string | null;
  } | null;
  destinos?: {
    id?: string | null;
    nome?: string | null;
    tipo_produto?: string | null;
  } | null;
  recibos?: ReportReceiptRow[] | null;
};

function isMissingColumnError(error: unknown) {
  const code = String((error as { code?: string })?.code || '').trim();
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

function buildSalesSelect(
  includeAdvancedFields: boolean,
  includeKpiField: boolean,
  includeConciliacaoFields: boolean,
  receiptRelation = 'recibos:vendas_recibos'
) {
  const tipoProdutoCols = includeAdvancedFields
    ? [
        'id',
        'nome',
        'tipo',
        'regra_comissionamento',
        'soma_na_meta',
        'usa_meta_produto',
        'meta_produto_valor',
        'comissao_produto_meta_pct',
        'descontar_meta_geral',
        includeKpiField ? 'exibe_kpi_comissao' : null
      ]
        .filter(Boolean)
        .join(', ')
    : 'id, nome, tipo';

  const reciboBaseCols = [
    'id',
    'numero_recibo',
    'data_venda',
    'produto_id',
    'destino_cidade:cidades!destino_cidade_id (id, nome)',
    'valor_total',
    'valor_taxas',
    'valor_du',
    'valor_rav',
    'tipo_pacote'
  ];

  const reciboConciliacaoCols = includeConciliacaoFields
    ? [
        'percentual_comissao_loja',
        'faixa_comissao',
        'valor_comissao_loja',
        'cancelado_por_conciliacao_em',
        'cancelado_por_conciliacao_observacao',
        'valor_bruto_override',
        'valor_liquido_override',
        'valor_meta_override'
      ]
    : [];

  const reciboProdutoCols = includeAdvancedFields
    ? [
        `tipo_produtos (${tipoProdutoCols})`,
        'produto_resolvido:produtos!produto_resolvido_id (id, nome, tipo_produto, valor_neto, valor_em_reais)'
      ]
    : [
        'tipo_produtos (id, nome, tipo)',
        'produto_resolvido:produtos!produto_resolvido_id (id, nome, tipo_produto, valor_neto, valor_em_reais)'
      ];

  const reciboCols = [
    ...reciboBaseCols,
    ...reciboConciliacaoCols,
    ...reciboProdutoCols
  ].join(',\n        ');

  const vendaCols = includeAdvancedFields
    ? `
        id,
        numero_venda,
        cliente_id,
        vendedor_id,
        company_id,
        data_venda,
        data_embarque,
        data_final,
        valor_total,
        valor_total_bruto,
        valor_total_pago,
        desconto_comercial_valor,
        valor_nao_comissionado,
        valor_taxas,
        cancelada,
        clientes (nome, email, cpf),
        vendedor:users!vendedor_id (nome_completo, email),
        destino_cidade:cidades!destino_cidade_id (id, nome),
        destinos:produtos!destino_id (id, nome, tipo_produto),
        ${receiptRelation} (${reciboCols})
      `
    : `
        id,
        numero_venda,
        cliente_id,
        vendedor_id,
        company_id,
        data_venda,
        data_embarque,
        data_final,
        valor_total,
        valor_nao_comissionado,
        valor_taxas,
        cancelada,
        clientes (nome, email, cpf),
        vendedor:users!vendedor_id (nome_completo, email),
        destino_cidade:cidades!destino_cidade_id (id, nome),
        destinos:produtos!destino_id (id, nome, tipo_produto),
        ${receiptRelation} (${reciboCols})
      `;

  return vendaCols;
}

export async function fetchSalesReportRows(
  client: SupabaseClient,
  params: {
    dataInicio?: string | null;
    dataFim?: string | null;
    companyIds?: string[];
    vendedorIds?: string[];
    vendaIds?: string[];
    includeCancelled?: boolean;
    filterByReceiptDate?: boolean;
  }
) {
  const receiptRelation = params.filterByReceiptDate ? 'recibos:vendas_recibos!inner' : 'recibos:vendas_recibos';

  const executeQuery = async (selectClause: string) => {
    let query = client
      .from('vendas')
      .select(selectClause)
      .order('data_venda', { ascending: false })
      .limit(5000);

    if (!params.includeCancelled) {
      query = query.eq('cancelada', false);
    }

    if (params.dataInicio) {
      query = query.gte(params.filterByReceiptDate ? 'recibos.data_venda' : 'data_venda', params.dataInicio);
    }

    if (params.dataFim) {
      query = query.lte(params.filterByReceiptDate ? 'recibos.data_venda' : 'data_venda', params.dataFim);
    }

    if ((params.companyIds || []).length > 0) {
      query = query.in('company_id', params.companyIds || []);
    }

    if ((params.vendedorIds || []).length > 0) {
      query = query.in('vendedor_id', params.vendedorIds || []);
    }

    if ((params.vendaIds || []).length > 0) {
      query = query.in('id', params.vendaIds || []);
    }

    return query;
  };

  const selectVariants = [
    buildSalesSelect(true, true, true, receiptRelation),
    buildSalesSelect(true, false, true, receiptRelation),
    buildSalesSelect(true, false, false, receiptRelation),
    buildSalesSelect(false, false, false, receiptRelation)
  ];

  let lastError: unknown = null;

  for (const selectClause of selectVariants) {
    const { data, error } = await executeQuery(selectClause);
    if (!error) {
      return ((data || []) as unknown) as ReportVendaRow[];
    }
    lastError = error;
    if (!isMissingColumnError(error)) {
      throw error;
    }
  }

  throw lastError;
}

export async function fetchLatestPaymentForms(client: SupabaseClient, vendaIds: string[]) {
  const ids = vendaIds.filter(Boolean);
  const forms = new Map<string, string>();

  if (ids.length === 0) {
    return forms;
  }

  // Tenta primeiro vendas_pagamentos (tabela real do sistema)
  const { data, error } = await client
    .from('vendas_pagamentos')
    .select('venda_id, forma_nome, created_at')
    .in('venda_id', ids)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (!error) {
    (data || []).forEach((row: { venda_id?: string | null; forma_nome?: string | null }) => {
      const vendaId = String(row?.venda_id || '').trim();
      if (!vendaId || forms.has(vendaId)) return;
      forms.set(vendaId, normalizeFormaPagamento(row?.forma_nome));
    });
    return forms;
  }

  // Fallback — vendas_pagamentos não tem forma_pagamento separada, retorna mapa vazio
  return forms;
}

export function getVendaStatus(
  row: Pick<ReportVendaRow, 'cancelada' | 'data_embarque' | 'data_final'>
) {
  if (row.cancelada) {
    return 'cancelada';
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  if (row.data_final && row.data_final < todayIso) {
    return 'concluida';
  }

  if (row.data_embarque && row.data_embarque >= todayIso) {
    return 'confirmada';
  }

  return 'pendente';
}

export function getVendaCodigo(row: Pick<ReportVendaRow, 'id' | 'numero_venda'>) {
  const code = String(row.numero_venda || '').trim();
  return code || `VD-${row.id.slice(0, 8).toUpperCase()}`;
}

export function getVendaClienteNome(row: Pick<ReportVendaRow, 'clientes'>) {
  return String(row.clientes?.nome || 'Cliente sem nome');
}

export function getVendaClienteEmail(row: Pick<ReportVendaRow, 'clientes'>) {
  return String(row.clientes?.email || '').trim() || null;
}

export function getVendaVendedorNome(row: Pick<ReportVendaRow, 'vendedor'>) {
  return String(row.vendedor?.nome_completo || row.vendedor?.email || 'Equipe VTUR');
}

export function getVendaDestino(row: Pick<ReportVendaRow, 'destinos' | 'destino_cidade' | 'recibos'>) {
  const recibos = Array.isArray(row.recibos) ? row.recibos : [];
  const cidades = Array.from(
    new Set(
      recibos
        .map((recibo) => String(recibo?.destino_cidade?.nome || '').trim())
        .filter(Boolean)
    )
  );

  if (cidades.length > 0) {
    return cidades.join(', ');
  }

  return String(row.destino_cidade?.nome || row.destinos?.nome || 'Destino nao informado');
}

export function getReceiptCidadeNome(
  receipt: ReportReceiptRow,
  fallback?: Pick<ReportVendaRow, 'destino_cidade'>
) {
  return String(receipt?.destino_cidade?.nome || fallback?.destino_cidade?.nome || '').trim() || null;
}

export function getVendaCommission(row: Pick<ReportVendaRow, 'recibos'>) {
  const recibos = Array.isArray(row.recibos) ? row.recibos : [];
  if (recibos.length === 0) return 0;

  const hasCommissionSignal = recibos.some(
    (recibo) => recibo?.valor_comissao_loja != null || Number(recibo?.percentual_comissao_loja || 0) > 0
  );

  if (!hasCommissionSignal) return 0;

  const totalCommission = recibos.reduce((sum, recibo) => {
    if (recibo?.valor_comissao_loja != null) {
      return sum + Number(recibo.valor_comissao_loja || 0);
    }

    const percentual = Number(recibo?.percentual_comissao_loja || 0);
    if (percentual > 0) {
      const valorBase = Number(recibo?.valor_total || 0);
      return sum + (valorBase * percentual) / 100;
    }

    return sum;
  }, 0);

  return Math.max(0, Number(totalCommission.toFixed(2)));
}

export function getReceiptProductDescriptor(
  receipt: ReportReceiptRow,
  fallback?: Pick<ReportVendaRow, 'destinos'>
) {
  const produto = String(
    receipt?.produto_resolvido?.nome ||
      receipt?.tipo_produtos?.nome ||
      receipt?.tipo_pacote ||
      fallback?.destinos?.nome ||
      'Produto nao informado'
  );

  const tipo = String(
    receipt?.tipo_produtos?.tipo ||
      receipt?.tipo_produtos?.nome ||
      fallback?.destinos?.tipo_produto ||
      'Produto'
  );

  return { produto, tipo };
}

export function normalizeFormaPagamento(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();

  switch (normalized) {
    case 'avista':
    case 'a_vista':
      return 'A vista';
    case 'pix':
      return 'PIX';
    case 'cartao':
    case 'cartao_credito':
    case 'cartao de credito':
      return 'Cartao';
    case 'boleto':
      return 'Boleto';
    case 'transferencia':
    case 'transferencia_bancaria':
      return 'Transferencia';
    default:
      return String(value || '').trim() || 'Nao informado';
  }
}

export function getCurrentYearRange() {
  const today = new Date();
  return {
    dataInicio: `${today.getFullYear()}-01-01`,
    dataFim: today.toISOString().slice(0, 10)
  };
}

export function monthSpanInclusive(startIso?: string | null, endIso?: string | null) {
  if (!startIso || !endIso) return 1;

  const [startYear, startMonth] = startIso.split('-').map(Number);
  const [endYear, endMonth] = endIso.split('-').map(Number);

  if (!startYear || !startMonth || !endYear || !endMonth) {
    return 1;
  }

  return Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
}

export function getClienteCategoria(totalCompras: number, totalGasto: number) {
  if (totalGasto >= 30000 || totalCompras >= 5) {
    return 'VIP';
  }

  if (totalGasto >= 10000 || totalCompras >= 3) {
    return 'Regular';
  }

  return 'Ocasional';
}
