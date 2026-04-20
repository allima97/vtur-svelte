import { json } from "@sveltejs/kit";
import { e as ensureAgendaAccess } from "../../../../../../chunks/agenda.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureAgendaAccess(scope, 4, "Sem permissao para excluir agenda.");
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!id) {
      return json({ error: "id obrigatorio." }, { status: 400 });
    }
    const { data: existing, error: existingError } = await client.from("agenda_itens").select("id, user_id, tipo").eq("id", id).maybeSingle();
    if (existingError) throw existingError;
    if (!existing || existing.tipo !== "evento") {
      return json({ error: "Evento nao encontrado." }, { status: 404 });
    }
    if (!scope.isAdmin && String(existing.user_id || "") !== user.id) {
      return json({ error: "Sem acesso a este evento." }, { status: 403 });
    }
    const { error } = await client.from("agenda_itens").delete().eq("id", id);
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir evento.");
  }
}
export {
  DELETE
};
