import { json } from "@sveltejs/kit";
import { i as ensureCanManagePermissions, l as loadManagedUser, q as loadUserPermissions, k as loadSystemModuleSettings, m as isMissingSystemModuleSettingsTable, n as listSystemModuleCatalog, o as agruparModulosPorSecao, M as MODULOS_ADMIN_PERMISSOES, r as buildPermissionMatrix } from "../../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const userId = String(event.params.id || "").trim();
    ensureCanManagePermissions(scope);
    const targetUser = await loadManagedUser(client, scope, userId);
    const permissions = await loadUserPermissions(client, userId);
    let globalModules = [];
    try {
      const settings = await loadSystemModuleSettings(client);
      globalModules = settings.rows;
    } catch (settingsError) {
      if (!isMissingSystemModuleSettingsTable(settingsError)) throw settingsError;
      globalModules = [];
    }
    return json({
      user: {
        id: targetUser.id,
        nome: targetUser.nome_completo || targetUser.email || "Usuario sem nome",
        email: targetUser.email || null
      },
      permissions: buildPermissionMatrix(permissions),
      global_modules: globalModules,
      sections: agruparModulosPorSecao(MODULOS_ADMIN_PERMISSOES),
      system_module_catalog: listSystemModuleCatalog(
        globalModules.map((row) => String(row.module_key || "").trim())
      )
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar permissoes do usuario.");
  }
}
export {
  GET
};
