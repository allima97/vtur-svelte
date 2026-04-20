import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const { searchParams } = event.url;
    const receiverId = String(searchParams.get("receiver_id") || "").trim();
    let query = client.from("mural_recados").select(`
        id, company_id, sender_id, receiver_id, assunto, conteudo, created_at,
        sender_deleted, receiver_deleted,
        sender:users!sender_id(id, nome_completo, email),
        receiver:users!receiver_id(id, nome_completo, email)
      `).order("created_at", { ascending: false }).limit(200);
    if (receiverId) {
      query = query.or(`and(sender_id.eq.${scope.userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${scope.userId})`);
    } else {
      query = query.or(`sender_id.eq.${scope.userId},receiver_id.eq.${scope.userId}`);
    }
    if (scope.companyId && !scope.isAdmin) query = query.eq("company_id", scope.companyId);
    const { data, error: queryError } = await query;
    if (queryError) {
      if (String(queryError.code || "").includes("42P01") || String(queryError.message || "").includes("does not exist")) {
        return json({ items: [], usuarios: [] });
      }
      throw queryError;
    }
    let usersQuery = client.from("users").select("id, nome_completo, email").eq("active", true).neq("id", scope.userId).order("nome_completo").limit(100);
    if (scope.companyId && !scope.isAdmin) usersQuery = usersQuery.eq("company_id", scope.companyId);
    const { data: usersData } = await usersQuery;
    return json({ items: data || [], usuarios: usersData || [] });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar recados.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json();
    const { receiver_id, assunto, conteudo } = body;
    if (!String(conteudo || "").trim()) {
      return json({ error: "Conteúdo obrigatório." }, { status: 400 });
    }
    const payload = {
      company_id: scope.companyId,
      sender_id: scope.userId,
      receiver_id: receiver_id && isUuid(receiver_id) ? receiver_id : null,
      assunto: String(assunto || "").trim() || null,
      conteudo: String(conteudo).trim(),
      sender_deleted: false,
      receiver_deleted: false
    };
    const { data, error: insertError } = await client.from("mural_recados").insert(payload).select("id").single();
    if (insertError) throw insertError;
    return json({ ok: true, id: data?.id });
  } catch (err) {
    return toErrorResponse(err, "Erro ao enviar recado.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    const { data: recado } = await client.from("mural_recados").select("sender_id, receiver_id").eq("id", id).maybeSingle();
    if (!recado) return json({ error: "Recado não encontrado." }, { status: 404 });
    const isSender = recado.sender_id === scope.userId;
    const isReceiver = recado.receiver_id === scope.userId;
    if (!isSender && !isReceiver && !scope.isAdmin) {
      return json({ error: "Sem permissão." }, { status: 403 });
    }
    const update = isSender ? { sender_deleted: true } : { receiver_deleted: true };
    const { error: updateError } = await client.from("mural_recados").update(update).eq("id", id);
    if (updateError) throw updateError;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir recado.");
  }
}
export {
  DELETE,
  GET,
  POST
};
