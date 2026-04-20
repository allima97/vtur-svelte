import { json } from "@sveltejs/kit";
import { c as ensureTodoAccess } from "../../../../../../chunks/agenda.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json();
    const id = String(body?.id || "").trim();
    const isEdit = Boolean(id);
    ensureTodoAccess(
      scope,
      isEdit ? 3 : 2,
      isEdit ? "Sem permissao para editar categoria." : "Sem permissao para criar categoria."
    );
    const nome = String(body?.nome || "").trim();
    if (!nome) {
      return json({ error: "nome obrigatorio." }, { status: 400 });
    }
    const cor = String(body?.cor || "").trim() || null;
    if (isEdit) {
      if (!isUuid(id)) {
        return json({ error: "id invalido." }, { status: 400 });
      }
      const { data: existing, error: existingError } = await client.from("todo_categorias").select("id, user_id").eq("id", id).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) {
        return json({ error: "Categoria nao encontrada." }, { status: 404 });
      }
      if (!scope.isAdmin && String(existing.user_id || "") !== user.id) {
        return json({ error: "Sem acesso a esta categoria." }, { status: 403 });
      }
      const { data: data2, error: error2 } = await client.from("todo_categorias").update({ nome, cor }).eq("id", id).select("id, nome, cor").single();
      if (error2) throw error2;
      return json({ ok: true, item: data2 });
    }
    const { data, error } = await client.from("todo_categorias").insert({
      nome,
      cor,
      user_id: user.id
    }).select("id, nome, cor").single();
    if (error) throw error;
    return json({ ok: true, item: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar categoria.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureTodoAccess(scope, 4, "Sem permissao para excluir categoria.");
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!isUuid(id)) {
      return json({ error: "id invalido." }, { status: 400 });
    }
    const { data: existing, error: existingError } = await client.from("todo_categorias").select("id, user_id").eq("id", id).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) {
      return json({ error: "Categoria nao encontrada." }, { status: 404 });
    }
    if (!scope.isAdmin && String(existing.user_id || "") !== user.id) {
      return json({ error: "Sem acesso a esta categoria." }, { status: 403 });
    }
    const { count, error: linkError } = await client.from("agenda_itens").select("id", { count: "exact", head: true }).eq("tipo", "todo").eq("categoria_id", id);
    if (linkError) throw linkError;
    if (Number(count || 0) > 0) {
      return json({ error: "Nao e possivel excluir categoria com tarefa vinculada." }, { status: 400 });
    }
    const { error } = await client.from("todo_categorias").delete().eq("id", id);
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir categoria.");
  }
}
export {
  DELETE,
  POST
};
