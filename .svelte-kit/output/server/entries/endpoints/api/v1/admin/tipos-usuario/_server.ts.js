import { json } from "@sveltejs/kit";
import { i as ensureCanManagePermissions, w as loadManagedUserTypes } from "../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureCanManagePermissions(scope);
    const userTypes = await loadManagedUserTypes(client, scope);
    const typeIds = userTypes.map((row) => row.id);
    const [defaultPermsRes, usersRes] = await Promise.all([
      typeIds.length ? client.from("user_type_default_perms").select("user_type_id, modulo, permissao, ativo").in("user_type_id", typeIds) : Promise.resolve({ data: [], error: null }),
      typeIds.length ? client.from("users").select("id, user_type_id").in("user_type_id", typeIds) : Promise.resolve({ data: [], error: null })
    ]);
    if (defaultPermsRes.error) throw defaultPermsRes.error;
    if (usersRes.error) throw usersRes.error;
    const defaultPermCounts = /* @__PURE__ */ new Map();
    (defaultPermsRes.data || []).forEach((row) => {
      if (row?.ativo === false || !row?.user_type_id) return;
      defaultPermCounts.set(
        String(row.user_type_id),
        Number(defaultPermCounts.get(String(row.user_type_id)) || 0) + 1
      );
    });
    const userCounts = /* @__PURE__ */ new Map();
    (usersRes.data || []).forEach((row) => {
      if (!row?.user_type_id) return;
      userCounts.set(String(row.user_type_id), Number(userCounts.get(String(row.user_type_id)) || 0) + 1);
    });
    return json({
      items: userTypes.map((row) => ({
        id: row.id,
        nome: row.name,
        descricao: row.description || "",
        created_at: row.created_at || null,
        usuarios: Number(userCounts.get(row.id) || 0),
        permissoes_padrao: Number(defaultPermCounts.get(row.id) || 0)
      }))
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar tipos de usuario.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    ensureCanManagePermissions(scope);
    const action = String(body.action || "save").trim().toLowerCase();
    const id = String(body.id || "").trim();
    if (action === "delete") {
      if (!id) return new Response("Tipo de usuario nao informado.", { status: 400 });
      const { error: deleteError } = await client.from("user_types").delete().eq("id", id);
      if (deleteError) throw deleteError;
      return json({ id, deleted: true });
    }
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim() || null;
    if (!name) {
      return new Response("Nome do tipo de usuario obrigatorio.", { status: 400 });
    }
    if (id) {
      const { error: updateError } = await client.from("user_types").update({ name, description }).eq("id", id);
      if (updateError) throw updateError;
      return json({ id, updated: true });
    }
    const { data, error: insertError } = await client.from("user_types").insert({ name, description }).select("id").single();
    if (insertError) throw insertError;
    return json({ id: data.id, created: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar tipo de usuario.");
  }
}
export {
  GET,
  POST
};
