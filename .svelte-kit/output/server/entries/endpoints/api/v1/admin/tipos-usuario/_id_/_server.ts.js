import { json } from "@sveltejs/kit";
import { i as ensureCanManagePermissions, w as loadManagedUserTypes, x as loadUserTypeDefaultPermissions, r as buildPermissionMatrix } from "../../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const typeId = String(event.params.id || "").trim();
    ensureCanManagePermissions(scope);
    const userTypes = await loadManagedUserTypes(client, scope);
    const target = userTypes.find((row) => row.id === typeId);
    if (!target) {
      return new Response("Tipo de usuario nao encontrado.", { status: 404 });
    }
    const [defaultPermsRes, usersRes] = await Promise.all([
      loadUserTypeDefaultPermissions(client, typeId),
      client.from("users").select("id, nome_completo, email").eq("user_type_id", typeId).order("nome_completo")
    ]);
    if (usersRes.error) throw usersRes.error;
    return json({
      tipo: target,
      default_permissions: buildPermissionMatrix(defaultPermsRes),
      usuarios: (usersRes.data || []).map((row) => ({
        id: row.id,
        nome: row.nome_completo || row.email || "Usuario sem nome",
        email: row.email || null
      }))
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar detalhe do tipo de usuario.");
  }
}
export {
  GET
};
