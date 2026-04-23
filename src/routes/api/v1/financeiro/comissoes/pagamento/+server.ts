import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { fetchCommissionContext, resolveVendaCommission } from '$lib/server/comissoes';
import { buildPersistedComissaoKey, fetchPersistedComissoes, persistPaidComissoes } from '$lib/server/comissoes-registro';
import { fetchSalesReportRows } from '$lib/server/relatorios';

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro', 'comissoes'], 3, 'Sem permissão para registrar pagamentos.');
    }

    const body = await event.request.json();
    const { comissao_ids, data_pagamento = new Date().toISOString().split('T')[0], observacoes = '' } = body;

    if (!comissao_ids || !Array.isArray(comissao_ids) || comissao_ids.length === 0) {
      return json({ error: 'IDs das comissões são obrigatórios.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, body?.empresa_id || body?.company_id);
    const vendaIds = comissao_ids.map((id: unknown) => String(id || '').trim()).filter(Boolean);
    const rows = await fetchSalesReportRows(client, {
      companyIds,
      vendaIds
    });

    if (rows.length === 0) {
      return json({ error: 'Nenhuma venda elegível encontrada para registrar comissão.' }, { status: 404 });
    }

    const commissionContext = await fetchCommissionContext(client, { companyIds, rows });
    const resolvedByKey = new Map(
      rows.map((row) => [buildPersistedComissaoKey(row.id, row.vendedor_id), resolveVendaCommission(row, commissionContext)] as const)
    );
    const existingSnapshot = await fetchPersistedComissoes(client, {
      companyIds,
      vendaIds: rows.map((row) => row.id),
      vendedorIds: rows.map((row) => String(row.vendedor_id || '')).filter(Boolean)
    });

    if (!existingSnapshot.available) {
      return json({
        success: false,
        fallback: true,
        pagas: 0,
        data_pagamento,
        message: 'Persistência de comissão indisponível neste ambiente. Nenhuma baixa foi salva.'
      });
    }

    const existingByKey = new Map(
      existingSnapshot.rows.map((row) => [buildPersistedComissaoKey(row.venda_id, row.vendedor_id), row] as const)
    );

    const result = await persistPaidComissoes({
      client,
      userId: user.id,
      rows,
      resolvedByKey,
      existingByKey,
      dataPagamento: data_pagamento,
      observacoesPagamento: observacoes
    });

    console.log(
      `[Pagamento Comissão] Usuário ${user.id} registrou pagamento de ${result.pagas} comissão(ões) em ${data_pagamento}`
    );

    if ((result as { fallback?: boolean }).fallback) {
      return json({
        success: false,
        fallback: true,
        pagas: 0,
        data_pagamento,
        message: 'Persistência de comissão indisponível neste ambiente. Nenhuma baixa foi salva.'
      });
    }

    return json({
      success: true,
      message: `${result.pagas} comissão(ões) marcada(s) como paga(s)`,
      pagas: result.pagas,
      data_pagamento,
      fallback: false
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao registrar pagamento.');
  }
}

export async function PUT(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro', 'comissoes'], 3, 'Sem permissão para atualizar pagamentos.');
    }

    const body = await event.request.json();
    const { comissao_ids, data_pagamento = null, observacoes = '' } = body;

    if (!Array.isArray(comissao_ids) || comissao_ids.length === 0) {
      return json({ error: 'IDs das comissões são obrigatórios.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, body?.empresa_id || body?.company_id);
    let query = client
      .from('comissoes')
      .update({
        data_pagamento,
        observacoes_pagamento: observacoes || null
      })
      .in('venda_id', comissao_ids.map((id: unknown) => String(id || '').trim()).filter(Boolean))
      .eq('status', 'PAGA')
      .select('id');

    if (companyIds.length > 0) {
      query = query.in('company_id', companyIds);
    }

    const { data, error } = await query;
    if (error) {
      const code = String((error as { code?: string })?.code || '');
      const message = String((error as { message?: string })?.message || '').toLowerCase();
      if (code === '42P01' || code === '42703' || message.includes('does not exist')) {
        return json({ success: true, message: 'Persistência de comissão não disponível neste ambiente.', fallback: true });
      }
      throw error;
    }

    return json({
      success: true,
      message: `${(data || []).length} comissão(ões) atualizada(s).`,
      atualizadas: (data || []).length
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar pagamento.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro', 'comissoes'], 4, 'Sem permissão para cancelar comissão.');
    }

    const body = await event.request.json().catch(() => ({}));
    const { comissao_ids, observacoes = '' } = body;

    if (!Array.isArray(comissao_ids) || comissao_ids.length === 0) {
      return json({ error: 'IDs das comissões são obrigatórios.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, body?.empresa_id || body?.company_id);
    let query = client
      .from('comissoes')
      .update({
        status: 'CANCELADA',
        data_pagamento: null,
        observacoes_pagamento: observacoes || null,
        pago_por: user.id
      })
      .in('venda_id', comissao_ids.map((id: unknown) => String(id || '').trim()).filter(Boolean))
      .select('id');

    if (companyIds.length > 0) {
      query = query.in('company_id', companyIds);
    }

    const { data, error } = await query;
    if (error) {
      const code = String((error as { code?: string })?.code || '');
      const message = String((error as { message?: string })?.message || '').toLowerCase();
      if (code === '42P01' || code === '42703' || message.includes('does not exist')) {
        return json({ success: true, message: 'Persistência de comissão não disponível neste ambiente.', fallback: true });
      }
      throw error;
    }

    return json({
      success: true,
      message: `${(data || []).length} comissão(ões) cancelada(s).`,
      canceladas: (data || []).length
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao cancelar comissão.');
  }
}
