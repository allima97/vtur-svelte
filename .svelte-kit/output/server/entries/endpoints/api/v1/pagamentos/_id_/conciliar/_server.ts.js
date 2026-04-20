import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json();
    const pagamentoId = event.params.id;
    const updateData = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    if (body.venda_recibo_id) updateData.venda_recibo_id = body.venda_recibo_id;
    if (body.paga_comissao !== void 0) updateData.paga_comissao = body.paga_comissao;
    const { data: pagamento, error: pagError } = await client.from("vendas_pagamentos").update(updateData).eq("id", pagamentoId).select().single();
    if (pagError) throw pagError;
    return json({ success: true, item: pagamento });
  } catch (err) {
    return toErrorResponse(err, "Erro ao conciliar pagamento.");
  }
}
export {
  POST
};
