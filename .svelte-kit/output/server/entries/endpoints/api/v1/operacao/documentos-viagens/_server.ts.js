import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse, i as isUuid } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["documentos_viagens", "operacao"], 1, "Sem acesso a Documentos de Viagens.");
    }
    const { searchParams } = event.url;
    const q = String(searchParams.get("q") || searchParams.get("busca") || "").trim();
    let query = client.from("documentos_viagens").select(`
        id, file_name, display_name, title, template_text, template_fields, storage_bucket, storage_path, mime_type, size_bytes, created_at,
        uploader:users!uploaded_by(id, nome_completo, email)
      `).order("created_at", { ascending: false }).limit(200);
    if (scope.companyId && !scope.isAdmin) query = query.eq("company_id", scope.companyId);
    const { data, error: queryError } = await query;
    if (queryError) throw queryError;
    let items = data || [];
    if (q) {
      const qLower = q.toLowerCase();
      items = items.filter(
        (item) => [item.file_name, item.display_name, item.title].join(" ").toLowerCase().includes(qLower)
      );
    }
    return json({ items });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar documentos de viagens.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["documentos_viagens", "operacao"], 4, "Sem permissão para excluir documentos.");
    }
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    const { data: doc } = await client.from("documentos_viagens").select("storage_bucket, storage_path").eq("id", id).maybeSingle();
    if (doc?.storage_bucket && doc?.storage_path) {
      await client.storage.from(doc.storage_bucket).remove([doc.storage_path]);
    }
    const { error: deleteError } = await client.from("documentos_viagens").delete().eq("id", id);
    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir documento.");
  }
}
export {
  DELETE,
  GET
};
