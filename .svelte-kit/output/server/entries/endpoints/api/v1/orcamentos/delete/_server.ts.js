import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, d as resolveScopedVendedorIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["orcamentos", "vendas"], 4, "Sem acesso para excluir Orcamentos.");
    }
    const body = await event.request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id || !isUuid(id)) {
      return json({ error: "ID invalido." }, { status: 400 });
    }
    const vendedorIds = await resolveScopedVendedorIds(client, scope, null);
    let checkQuery = client.from("quote").select("id").eq("id", id);
    if (!scope.isAdmin && !scope.isGestor && !scope.isMaster) {
      checkQuery = checkQuery.eq("created_by", user.id);
    } else if (vendedorIds.length > 0) {
      checkQuery = checkQuery.in("created_by", vendedorIds);
    }
    const { data: quote } = await checkQuery.maybeSingle();
    if (!quote) {
      return json({ error: "Orcamento nao encontrado." }, { status: 404 });
    }
    let deleteQuery = client.from("quote").delete().eq("id", id);
    if (!scope.isAdmin && !scope.isGestor && !scope.isMaster) {
      deleteQuery = deleteQuery.eq("created_by", user.id);
    } else if (vendedorIds.length > 0) {
      deleteQuery = deleteQuery.in("created_by", vendedorIds);
    }
    const { error } = await deleteQuery;
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir orcamento.");
  }
}
export {
  POST
};
