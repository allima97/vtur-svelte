import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    return json({
      success: true,
      user_id: user.id,
      company_id: scope.companyId,
      nome: scope.nome,
      email: scope.email,
      papel: scope.papel,
      isAdmin: scope.isAdmin,
      isMaster: scope.isMaster,
      isGestor: scope.isGestor,
      isVendedor: scope.isVendedor
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar contexto do usuário.");
  }
}
export {
  GET
};
