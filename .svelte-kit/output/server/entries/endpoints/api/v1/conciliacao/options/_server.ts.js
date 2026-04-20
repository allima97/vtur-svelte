import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, h as fetchGestorEquipeIdsComGestor, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ["conciliacao"], 1, "Sem acesso à Conciliação.");
    }
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get("company_id"));
    const companyId = companyIds[0] || scope.companyId;
    if (!companyId) return json({ vendedores: [], produtosMeta: [] });
    let vendedorIds = [];
    if (scope.isGestor) {
      vendedorIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
    }
    let vendedoresQuery = client.from("users").select("id, nome_completo").eq("active", true).eq("company_id", companyId).order("nome_completo").limit(100);
    if (vendedorIds.length > 0 && !scope.isAdmin && !scope.isMaster) {
      vendedoresQuery = vendedoresQuery.in("id", vendedorIds);
    }
    const { data: vendedoresData } = await vendedoresQuery;
    const { data: produtosData } = await client.from("tipo_produtos").select("id, nome").eq("ativo", true).eq("soma_na_meta", true).order("nome").limit(100);
    return json({
      vendedores: vendedoresData || [],
      produtosMeta: produtosData || []
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar opções da conciliação.");
  }
}
export {
  GET
};
