import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["vendas"], 3, "Sem permissao para editar vendas.");
    }
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!id || !isUuid(id)) {
      return json({ success: false, error: "ID invalido." }, { status: 400 });
    }
    const body = await event.request.json().catch(() => ({}));
    const newStatus = String(body?.status || "").trim();
    if (!newStatus) {
      return json({ success: false, error: "Status obrigatorio." }, { status: 400 });
    }
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get("empresa_id"));
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get("vendedor_id")
    );
    let checkQuery = client.from("vendas").select("id").eq("id", id);
    if (companyIds.length > 0) checkQuery = checkQuery.in("company_id", companyIds);
    if (vendedorIds.length > 0) checkQuery = checkQuery.in("vendedor_id", vendedorIds);
    const { data: sale } = await checkQuery.maybeSingle();
    if (!sale) {
      return json({ success: false, error: "Venda nao encontrada." }, { status: 404 });
    }
    let updateQuery = client.from("vendas").update({ status: newStatus, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
    if (companyIds.length > 0) updateQuery = updateQuery.in("company_id", companyIds);
    if (vendedorIds.length > 0) updateQuery = updateQuery.in("vendedor_id", vendedorIds);
    const { data, error } = await updateQuery.select().single();
    if (error) throw error;
    return json({ success: true, item: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar status da venda.");
  }
}
export {
  PATCH
};
