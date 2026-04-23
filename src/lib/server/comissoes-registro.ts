import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReportVendaRow } from '$lib/server/relatorios';
import type { ResolvedVendaCommission } from '$lib/server/comissoes';

export type PersistedComissaoRow = {
  id: string;
  venda_id: string | null;
  vendedor_id: string | null;
  regra_id: string | null;
  valor_venda: number | null;
  valor_comissionavel: number | null;
  percentual_aplicado: number | null;
  valor_comissao: number | null;
  status: string | null;
  data_pagamento: string | null;
  observacoes_pagamento: string | null;
  pago_por: string | null;
  mes_referencia: number | null;
  ano_referencia: number | null;
  company_id: string | null;
};

export type PersistedComissoesSnapshot = {
  rows: PersistedComissaoRow[];
  available: boolean;
};

function isMissingComissoesSchema(error: unknown) {
  const code = String((error as { code?: string })?.code || '').trim();
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    code === '42703' ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('column')
  );
}

function toNum(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPeriodFromDate(dateIso?: string | null) {
  const raw = String(dateIso || '').trim();
  const [yearStr, monthStr] = raw.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (Number.isFinite(year) && Number.isFinite(month) && year > 2000 && month >= 1 && month <= 12) {
    return { mes: month, ano: year };
  }

  const now = new Date();
  return { mes: now.getMonth() + 1, ano: now.getFullYear() };
}

export function buildPersistedComissaoKey(vendaId?: string | null, vendedorId?: string | null) {
  const venda = String(vendaId || '').trim();
  const vendedor = String(vendedorId || '').trim();
  if (!venda || !vendedor) return '';
  return `${venda}::${vendedor}`;
}

export async function fetchPersistedComissoes(
  client: SupabaseClient,
  params: {
    vendaIds?: string[];
    vendedorIds?: string[];
    companyIds?: string[];
  }
): Promise<PersistedComissoesSnapshot> {
  let query = client
    .from('comissoes')
    .select(
      'id, venda_id, vendedor_id, regra_id, valor_venda, valor_comissionavel, percentual_aplicado, valor_comissao, status, data_pagamento, observacoes_pagamento, pago_por, mes_referencia, ano_referencia, company_id'
    )
    .limit(5000);

  if ((params.vendaIds || []).length > 0) {
    query = query.in('venda_id', params.vendaIds || []);
  }

  if ((params.vendedorIds || []).length > 0) {
    query = query.in('vendedor_id', params.vendedorIds || []);
  }

  if ((params.companyIds || []).length > 0) {
    query = query.in('company_id', params.companyIds || []);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingComissoesSchema(error)) {
      return {
        rows: [],
        available: false
      };
    }
    throw error;
  }

  return {
    rows: (data || []) as PersistedComissaoRow[],
    available: true
  };
}

export async function persistPaidComissoes(params: {
  client: SupabaseClient;
  userId: string;
  rows: ReportVendaRow[];
  resolvedByKey: Map<string, ResolvedVendaCommission>;
  existingByKey: Map<string, PersistedComissaoRow>;
  dataPagamento: string;
  observacoesPagamento?: string | null;
}) {
  const { client, userId, rows, resolvedByKey, existingByKey, dataPagamento, observacoesPagamento } = params;

  const inserts: Record<string, unknown>[] = [];
  const updates: Array<{ id: string; payload: Record<string, unknown> }> = [];

  for (const row of rows) {
    const key = buildPersistedComissaoKey(row.id, row.vendedor_id);
    if (!key) continue;

    const resolved = resolvedByKey.get(key);
    if (!resolved || resolved.valorComissao <= 0) continue;

    const existing = existingByKey.get(key);
    const periodo = getPeriodFromDate(row.data_venda);
    const payload = {
      venda_id: row.id,
      vendedor_id: row.vendedor_id,
      regra_id: resolved.regraId,
      valor_venda: resolved.valorVenda,
      valor_comissionavel: resolved.valorComissionavel,
      percentual_aplicado: resolved.percentual,
      valor_comissao: resolved.valorComissao,
      status: 'PAGA',
      data_pagamento: dataPagamento,
      observacoes_pagamento: observacoesPagamento || null,
      pago_por: userId,
      mes_referencia: periodo.mes,
      ano_referencia: periodo.ano,
      company_id: row.company_id,
      created_by: existing ? undefined : userId
    };

    if (existing?.id) {
      updates.push({
        id: existing.id,
        payload
      });
    } else {
      inserts.push(payload);
    }
  }

  if (updates.length === 0 && inserts.length === 0) {
    return { pagas: 0 };
  }

  try {
    if (inserts.length > 0) {
      const { error: insertError } = await client.from('comissoes').insert(inserts);
      if (insertError) throw insertError;
    }

    for (const update of updates) {
      const { error: updateError } = await client
        .from('comissoes')
        .update(update.payload)
        .eq('id', update.id);

      if (updateError) throw updateError;
    }

    return { pagas: updates.length + inserts.length };
  } catch (error) {
    if (isMissingComissoesSchema(error)) {
      return { pagas: 0, fallback: true as const };
    }
    throw error;
  }
}

export function applyPersistedComissao(
  base: {
    valor_venda: number;
    valor_comissionavel: number;
    percentual_aplicado: number;
    valor_comissao: number;
    status: string;
    valor_pago: number;
  },
  persisted?: PersistedComissaoRow | null
) {
  if (!persisted) return base;

  const normalizedStatus = String(persisted.status || '').toLowerCase();
  const status =
    normalizedStatus === 'paga'
      ? 'pago'
      : normalizedStatus === 'cancelada'
        ? 'cancelada'
        : normalizedStatus === 'processando'
          ? 'processando'
          : 'pendente';

  const valorComissao = persisted.valor_comissao != null ? toNum(persisted.valor_comissao) : base.valor_comissao;

  return {
    valor_venda: persisted.valor_venda != null ? toNum(persisted.valor_venda) : base.valor_venda,
    valor_comissionavel:
      persisted.valor_comissionavel != null ? toNum(persisted.valor_comissionavel) : base.valor_comissionavel,
    percentual_aplicado:
      persisted.percentual_aplicado != null ? toNum(persisted.percentual_aplicado) : base.percentual_aplicado,
    valor_comissao: valorComissao,
    status,
    valor_pago: status === 'pago' ? valorComissao : 0
  };
}
