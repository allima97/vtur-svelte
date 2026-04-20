import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["financeiro", "comissoes"], 3, "Sem permissão para registrar pagamentos.");
    }
    const body = await event.request.json();
    const { comissao_ids, data_pagamento = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], observacoes = "" } = body;
    if (!comissao_ids || !Array.isArray(comissao_ids) || comissao_ids.length === 0) {
      return json({ error: "IDs das comissões são obrigatórios." }, { status: 400 });
    }
    console.log(`[Pagamento Comissão] Usuário ${user.id} registrou pagamento de ${comissao_ids.length} comissões em ${data_pagamento}`);
    return json({
      success: true,
      message: `${comissao_ids.length} comissão(ões) marcada(s) como paga(s)`,
      pagas: comissao_ids.length,
      data_pagamento
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao registrar pagamento.");
  }
}
async function PUT(event) {
  return json({ success: true, message: "Observações atualizadas." });
}
async function DELETE(event) {
  return json({ success: true, message: "Comissão cancelada." });
}
export {
  DELETE,
  POST,
  PUT
};
