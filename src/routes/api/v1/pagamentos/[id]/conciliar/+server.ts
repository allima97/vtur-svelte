import { json } from '@sveltejs/kit';
import { getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';

// Concilia um pagamento de venda com um recibo de conciliação
export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json();
    const pagamentoId = event.params.id;

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
