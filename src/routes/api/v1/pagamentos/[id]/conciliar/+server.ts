import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

// Concilia um pagamento de venda com um recibo de conciliação
export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 3, 'Sem permissao para conciliar pagamento.');

    const body = await event.request.json();
    const pagamentoId = String(event.params.id || '').trim();
    if (!isUuid(pagamentoId)) {
      return json({ success: false, error: 'ID invalido.' }, { status: 400 });
    }

    if (body.venda_recibo_id && !isUuid(String(body.venda_recibo_id))) {
      return json({ success: false, error: 'ID do recibo invalido.' }, { status: 400 });
    }

    const { data: pagamentoAtual, error: pagamentoAtualError } = await client
      .from('vendas_pagamentos')
      .select('id, company_id')
      .eq('id', pagamentoId)
      .maybeSingle();
    if (pagamentoAtualError) throw pagamentoAtualError;
    if (!pagamentoAtual) {
      return json({ success: false, error: 'Pagamento nao encontrado.' }, { status: 404 });
    }

    if (!scope.isAdmin) {
      const companyIds = resolveScopedCompanyIds(scope, null);
      const targetCompanyId = String((pagamentoAtual as { company_id?: string | null })?.company_id || '').trim();
      if (companyIds.length > 0 && targetCompanyId && !companyIds.includes(targetCompanyId)) {
        return json({ success: false, error: 'Acesso negado.' }, { status: 403 });
      }
    }

    // Atualiza o pagamento com o recibo de conciliação vinculado
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.venda_recibo_id) updateData.venda_recibo_id = body.venda_recibo_id;
    if (body.paga_comissao !== undefined) updateData.paga_comissao = body.paga_comissao;

    const { data: pagamento, error: pagError } = await client
      .from('vendas_pagamentos')
      .update(updateData)
      .eq('id', pagamentoId)
      .select()
      .single();

    if (pagError) throw pagError;

    return json({ success: true, item: pagamento });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao conciliar pagamento.');
  }
}
