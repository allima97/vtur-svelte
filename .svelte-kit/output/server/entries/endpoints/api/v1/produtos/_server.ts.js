import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../chunks/v1.js";
import { f as fetchProdutosBase } from "../../../../../chunks/cadastros-base.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["produtos", "cadastros"], 1, "Sem acesso a Produtos.");
    }
    const payload = await fetchProdutosBase(client, scope, event.url.searchParams);
    return json({
      items: payload.produtos,
      total: payload.total,
      tipos: payload.tipos,
      cidades: payload.cidades,
      fornecedores: payload.fornecedores
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar produtos.");
  }
}
export {
  GET
};
