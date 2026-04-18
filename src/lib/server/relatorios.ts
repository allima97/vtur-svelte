import type { SupabaseClient } from '@supabase/supabase-js';

export type ReportReceiptRow = {
  id?: string | null;
  valor_total?: number | null;
  valor_taxas?: number | null;
  valor_du?: number | null;
  valor_rav?: number | null;
  tipo_pacote?: string | null;
  tipo_produtos?: {
    id?: string | null;
    nome?: string | null;
    tipo?: string | null;
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
  valor_taxas: number | null;
  cancelada: boolean | null;
  clientes?: {
    nome?: string | null;
    email?: string | null;
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

export async function fetchSalesReportRows(
  client: SupabaseClient,
  params: {
    dataInicio?: string | null;
    dataFim?: string | null;
    companyIds?: string[];
    vendedorIds?: string[];
    includeCancelled?: boolean;
  }
) {
  let query = client
    .from('vendas')
    .select(`
      id,
      numero_venda,
      cliente_id,
      vendedor_id,
      company_id,
      data_venda,
      data_embarque,
      data_final,
      valor_total,
      valor_taxas,
      cancelada,
      clientes (nome, email),
      vendedor:users!vendedor_id (nome_completo, email),
      destino_cidade:cidades!destino_cidade_id (id, nome),
      destinos:produtos!destino_id (id, nome, tipo_produto),
      recibos:vendas_recibos (
        id,
        valor_total,
        valor_taxas,
        valor_du,
        valor_rav,
        tipo_pacote,
        tipo_produtos (id, nome, tipo),
        produto_resolvido:produtos!produto_resolvido_id (id, nome, tipo_produto, valor_neto, valor_em_reais)
      )
    `)
    .order('data_venda', { ascending: false })
    .limit(5000);

  if (!params.includeCancelled) {
    query = query.eq('cancelada', false);
  }

  if (params.dataInicio) {
    query = query.gte('data_venda', params.dataInicio);
  }

  if (params.dataFim) {
    query = query.lte('data_venda', params.dataFim);
  }

  if ((params.companyIds || []).length > 0) {
    query = query.in('company_id', params.companyIds || []);
  }

  if ((params.vendedorIds || []).length > 0) {
    query = query.in('vendedor_id', params.vendedorIds || []);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as ReportVendaRow[];
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

export function getVendaDestino(row: Pick<ReportVendaRow, 'destinos' | 'destino_cidade'>) {
  return String(row.destinos?.nome || row.destino_cidade?.nome || 'Destino nao informado');
}

export function getVendaCommission(row: Pick<ReportVendaRow, 'valor_taxas' | 'recibos'>) {
  const recibos = Array.isArray(row.recibos) ? row.recibos : [];
  const totalTaxas = recibos.reduce((sum, recibo) => sum + Number(recibo?.valor_taxas || 0), 0);
  return totalTaxas > 0 ? totalTaxas : Number(row.valor_taxas || 0);
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
