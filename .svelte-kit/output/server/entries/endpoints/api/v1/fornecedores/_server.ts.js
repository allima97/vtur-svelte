import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../chunks/v1.js";
import { f as fetchFornecedores } from "../../../../../chunks/fornecedores.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros", "fornecedores"], 1, "Sem acesso a Fornecedores.");
    }
    const payload = await fetchFornecedores(client, scope, event.url.searchParams);
    return json(payload);
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar fornecedores.");
  }
}
export {
  GET
};
