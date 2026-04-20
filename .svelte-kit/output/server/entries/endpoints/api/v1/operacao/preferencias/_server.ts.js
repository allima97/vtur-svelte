import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const { data, error: queryError } = await client.from("minhas_preferencias").select(`
        id, tipo_produto_id, cidade_id, nome, localizacao, classificacao, observacao, created_at,
        cidade:cidades!cidade_id(id, nome),
        tipo_produto:tipo_produtos!tipo_produto_id(id, nome)
      `).eq("created_by", scope.userId).order("nome").limit(200);
    if (queryError) throw queryError;
    const { data: tipos } = await client.from("tipo_produtos").select("id, nome, tipo").eq("ativo", true).order("nome").limit(100);
    return json({ items: data || [], tipos: tipos || [] });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar preferências.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json();
    const { id, tipo_produto_id, cidade_id, nome, localizacao, classificacao, observacao } = body;
    if (!String(nome || "").trim()) return json({ error: "Nome obrigatório." }, { status: 400 });
    const payload = {
      created_by: scope.userId,
      company_id: scope.companyId,
      tipo_produto_id: tipo_produto_id && isUuid(tipo_produto_id) ? tipo_produto_id : null,
      cidade_id: cidade_id && isUuid(cidade_id) ? cidade_id : null,
      nome: String(nome).trim(),
      localizacao: String(localizacao || "").trim() || null,
      classificacao: String(classificacao || "").trim() || null,
      observacao: String(observacao || "").trim() || null
    };
    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from("minhas_preferencias").update(payload).eq("id", id).eq("created_by", scope.userId).select("id").single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from("minhas_preferencias").insert(payload).select("id").single();
      if (insertError) throw insertError;
      result = data;
    }
    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar preferência.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    const { error: deleteError } = await client.from("minhas_preferencias").delete().eq("id", id).eq("created_by", scope.userId);
    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir preferência.");
  }
}
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json();
    const { action } = body;
    if (action === "share") {
      const { preferencia_id, shared_with_email } = body;
      if (!isUuid(preferencia_id)) return json({ error: "preferencia_id invalido." }, { status: 400 });
      if (!shared_with_email) return json({ error: "shared_with_email obrigatorio." }, { status: 400 });
      const { data: targetUser } = await client.from("users").select("id").eq("email", shared_with_email.toLowerCase()).maybeSingle();
      if (!targetUser) return json({ error: "Usuario nao encontrado." }, { status: 404 });
      const payload = {
        company_id: scope.companyId,
        preferencia_id,
        shared_by: scope.userId,
        shared_with: targetUser.id,
        status: "pending"
      };
      const { error: shareError } = await client.from("minhas_preferencias_shares").insert(payload);
      if (shareError) throw shareError;
      return json({ ok: true });
    }
    if (action === "accept") {
      const { share_id } = body;
      if (!isUuid(share_id)) return json({ error: "share_id invalido." }, { status: 400 });
      await client.from("minhas_preferencias_shares").update({ status: "accepted", accepted_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", share_id).eq("shared_with", scope.userId);
      return json({ ok: true });
    }
    if (action === "revoke") {
      const { share_id } = body;
      if (!isUuid(share_id)) return json({ error: "share_id invalido." }, { status: 400 });
      await client.from("minhas_preferencias_shares").update({ status: "revoked", revoked_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", share_id).eq("shared_by", scope.userId);
      return json({ ok: true });
    }
    return json({ error: "Acao invalida." }, { status: 400 });
  } catch (err) {
    return toErrorResponse(err, "Erro ao gerenciar compartilhamento.");
  }
}
export {
  DELETE,
  GET,
  PATCH,
  POST
};
