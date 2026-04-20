import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, d as resolveScopedVendedorIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["orcamentos", "vendas"], 2, "Sem permissao para alterar status.");
    }
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!id || !isUuid(id)) {
      return json({ error: "ID invalido." }, { status: 400 });
    }
    const body = await event.request.json().catch(() => ({}));
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get("vendedor_id")
    );
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
    const updateData = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    if (body.status_negociacao !== void 0) updateData.status_negociacao = body.status_negociacao;
    if (body.status !== void 0) updateData.status = body.status;
    if (body.observacoes) {
      updateData.last_interaction_notes = body.observacoes;
      updateData.last_interaction_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    let updateQuery = client.from("quote").update(updateData).eq("id", id);
    if (!scope.isAdmin && !scope.isGestor && !scope.isMaster) {
      updateQuery = updateQuery.eq("created_by", user.id);
    } else if (vendedorIds.length > 0) {
      updateQuery = updateQuery.in("created_by", vendedorIds);
    }
    const { data, error } = await updateQuery.select().single();
    if (error) throw error;
    return json({ success: true, item: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar status.");
  }
}
export {
  PATCH
};
