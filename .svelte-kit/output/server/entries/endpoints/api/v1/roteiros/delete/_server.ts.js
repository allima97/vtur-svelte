import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureModuloAccess(scope, ["orcamentos", "vendas"], 4, "Sem acesso para excluir Roteiros.");
    const id = event.url.searchParams.get("id") || "";
    if (!id || !isUuid(id)) return new Response("ID invalido.", { status: 400 });
    const { data: roteiro, error: findErr } = await client.from("roteiro_personalizado").select("id").eq("id", id).eq("created_by", user.id).maybeSingle();
    if (findErr) throw findErr;
    if (!roteiro) return new Response("Roteiro nao encontrado.", { status: 404 });
    const { error } = await client.from("roteiro_personalizado").delete().eq("id", id).eq("created_by", user.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir roteiro.");
  }
}
export {
  DELETE
};
