import { json } from '@sveltejs/kit';
import {
  buildPermissionMatrix,
  ensureCanManagePermissions,
  loadManagedUser,
  loadSystemModuleSettings,
  loadUserPermissions
} from '$lib/server/admin';
import {
  agruparModulosPorSecao,
  isMissingSystemModuleSettingsTable,
  listSystemModuleCatalog,
  MODULOS_ADMIN_PERMISSOES
} from '$lib/admin/modules';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const userId = String(event.params.id || '').trim();

    ensureCanManagePermissions(scope);

    const targetUser = await loadManagedUser(client, scope, userId);
    const permissions = await loadUserPermissions(client, userId);

    let globalModules: any[] = [];
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
        nome: targetUser.nome_completo || targetUser.email || 'Usuario sem nome',
        email: targetUser.email || null
      },
      permissions: buildPermissionMatrix(permissions),
      global_modules: globalModules,
      sections: agruparModulosPorSecao(MODULOS_ADMIN_PERMISSOES),
      system_module_catalog: listSystemModuleCatalog(
        globalModules.map((row: any) => String(row.module_key || '').trim())
      )
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar permissoes do usuario.');
  }
}
