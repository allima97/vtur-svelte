import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros"], 1, "Sem acesso a Circuitos.");
    }
    const { data, error } = await client.from("circuitos").select(`
        id, nome, codigo, operador, resumo, ativo, created_at,
        circuito_dias(id, dia_numero, titulo, descricao),
        circuito_datas(id, data_inicio, cidade_inicio_id, dias_extra_antes, dias_extra_depois)
      `).eq("id", event.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return json({ success: false, error: "Circuito não encontrado" }, { status: 404 });
    return json({ success: true, item: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar circuito.");
  }
}
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros"], 3, "Sem permissão para editar circuitos.");
    }
    const body = await event.request.json();
    const allowed = ["nome", "codigo", "operador", "resumo", "ativo"];
    const payload = {};
    for (const key of allowed) {
      if (key in body) payload[key] = body[key];
    }
    const { data, error } = await client.from("circuitos").update(payload).eq("id", event.params.id).select("id, nome, codigo, operador, resumo, ativo, created_at").single();
    if (error) throw error;
    return json({ success: true, item: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar circuito.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros"], 4, "Sem permissão para excluir circuitos.");
    }
    const { error } = await client.from("circuitos").delete().eq("id", event.params.id);
    if (error) throw error;
    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir circuito.");
  }
}
export {
  DELETE,
  GET,
  PATCH
};
