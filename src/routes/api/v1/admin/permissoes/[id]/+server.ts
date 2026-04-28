import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
  buildPermissionMatrix,
  loadManagedUser,
  loadSystemModuleSettings,
  loadUserPermissions,
  saveUserPermissions
} from '$lib/server/admin';
import {
  agruparModulosPorSecao,
  isMissingSystemModuleSettingsTable,
  listSystemModuleCatalog,
  MODULOS_ADMIN_PERMISSOES
} from '$lib/admin/modules';
import {
  getAdminClient,
  isUuid,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event: RequestEvent) {
  try {
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) return new Response('Sessao invalida.', { status: 401 });

    const client = getAdminClient();
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      return new Response('Sem permissao.', { status: 403 });
    }

    const userId = String(event.params.id || '').trim();
    if (!isUuid(userId)) return new Response('ID invalido.', { status: 400 });

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
    console.error('[permissoes/[id] GET]', err);
    return toErrorResponse(err, 'Erro ao carregar permissoes do usuario.');
  }
}

export async function POST(event: RequestEvent) {
  try {
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) return new Response('Sessao invalida.', { status: 401 });

    const client = getAdminClient();
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      return new Response('Sem permissao.', { status: 403 });
    }

    const userId = String(event.params.id || '').trim();
    if (!isUuid(userId)) return new Response('ID invalido.', { status: 400 });

    const body = await event.request.json().catch(() => ({}));

    const targetUser = await loadManagedUser(client, scope, userId);
    if (!targetUser) return new Response('Usuario fora do escopo.', { status: 403 });

    await saveUserPermissions(
      client,
      userId,
      Array.isArray(body.permissions) ? body.permissions : []
    );

    return json({ ok: true });
  } catch (err) {
    console.error('[permissoes/[id] POST]', err);
    return toErrorResponse(err, 'Erro ao salvar permissoes.');
  }
}
