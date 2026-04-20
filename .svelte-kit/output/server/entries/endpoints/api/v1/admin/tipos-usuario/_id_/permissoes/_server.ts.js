import { json } from "@sveltejs/kit";
import { i as ensureCanManagePermissions, x as loadUserTypeDefaultPermissions, o as agruparModulosPorSecao, M as MODULOS_ADMIN_PERMISSOES, r as buildPermissionMatrix, y as saveDefaultPermissions } from "../../../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const userTypeId = String(event.params.id || "").trim();
    ensureCanManagePermissions(scope);
    const rows = await loadUserTypeDefaultPermissions(client, userTypeId);
    return json({
      permissions: buildPermissionMatrix(rows),
      sections: agruparModulosPorSecao(MODULOS_ADMIN_PERMISSOES)
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar permissoes padrao.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const userTypeId = String(event.params.id || "").trim();
    const body = await event.request.json().catch(() => ({}));
    ensureCanManagePermissions(scope);
    await saveDefaultPermissions(client, userTypeId, Array.isArray(body.permissions) ? body.permissions : []);
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar permissoes padrao.");
  }
}
export {
  GET,
  POST
};
