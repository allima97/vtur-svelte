import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["documentos_viagens", "operacao"], 4, "Sem permissao para excluir documentos.");
    }
    const body = await event.request.json();
    const id = String(body?.id || "").trim();
    if (!isUuid(id)) return json({ error: "id invalido." }, { status: 400 });
    const { data: doc, error: fetchErr } = await client.from("documentos_viagens").select("id, storage_bucket, storage_path").eq("id", id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!doc) return json({ error: "Documento nao encontrado." }, { status: 404 });
    if (doc.storage_bucket && doc.storage_path) {
      await client.storage.from(doc.storage_bucket).remove([doc.storage_path]);
    }
    const { error } = await client.from("documentos_viagens").delete().eq("id", id);
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir documento.");
  }
}
export {
  POST
};
