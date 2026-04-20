import { json } from "@sveltejs/kit";
import { a as loadAvisoTemplates } from "../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function canManageTemplates(scope) {
  return scope.isAdmin || scope.isMaster || scope.isGestor || Boolean(scope.permissoes.admin) || Boolean(scope.permissoes.admin_users);
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!canManageTemplates(scope)) {
      return new Response("Sem acesso aos templates de aviso.", { status: 403 });
    }
    const templates = await loadAvisoTemplates(client);
    return json({ items: templates });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar templates de aviso.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    if (!canManageTemplates(scope)) {
      return new Response("Sem acesso aos templates de aviso.", { status: 403 });
    }
    const action = String(body.action || "save").trim().toLowerCase();
    const id = String(body.id || "").trim();
    if (action === "delete") {
      if (!id) return new Response("Template nao informado.", { status: 400 });
      const { error: deleteError } = await client.from("admin_avisos_templates").delete().eq("id", id);
      if (deleteError) throw deleteError;
      return json({ id, deleted: true });
    }
    const payload = {
      nome: String(body.nome || "").trim(),
      assunto: String(body.assunto || "").trim(),
      mensagem: String(body.mensagem || "").trim(),
      ativo: body.ativo !== false,
      sender_key: String(body.sender_key || "avisos").trim() || "avisos"
    };
    if (!payload.nome || !payload.assunto || !payload.mensagem) {
      return new Response("Nome, assunto e mensagem sao obrigatorios.", { status: 400 });
    }
    if (id) {
      const { error: updateError } = await client.from("admin_avisos_templates").update(payload).eq("id", id);
      if (updateError) throw updateError;
      return json({ id, updated: true });
    }
    const { data, error: insertError } = await client.from("admin_avisos_templates").insert(payload).select("id").single();
    if (insertError) throw insertError;
    return json({ id: data.id, created: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar template de aviso.");
  }
}
export {
  GET,
  POST
};
