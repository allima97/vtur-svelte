import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
  buildPermissionMatrix,
  ensureAssignablePermissionSet,
  ensureCanManagePermissions,
  listManagedUsers,
  loadSystemModuleSettings,
  saveSystemModuleSettings,
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
  logServerError,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import { invalidateUserReadModels } from '$lib/server/readModelCache';

export async function GET(event: RequestEvent) {
  try {
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) return new Response('Sessao invalida.', { status: 401, headers: NO_STORE_HEADERS });

    const client = getAdminClient();
    const scope = await resolveUserScope(client, user.id);

    ensureCanManagePermissions(scope);

    const users = await listManagedUsers(client, scope);
    const userIds = users.map((row) => row.id);
    const permissionsRes =
      userIds.length > 0
        ? await client
            .from('modulo_acesso')
            .select('usuario_id, modulo, permissao, ativo')
            .in('usuario_id', userIds)
        : { data: [], error: null };

    if (permissionsRes.error) throw permissionsRes.error;

    let globalModules: any[] = [];
    try {
      const settings = await loadSystemModuleSettings(client);
      globalModules = settings.rows;
    } catch (settingsError) {
      if (!isMissingSystemModuleSettingsTable(settingsError)) throw settingsError;
      globalModules = [];
    }

    return json(
      {
        items: users.map((row) => {
          const userPermissions = (permissionsRes.data || []).filter(
            (item: any) => item.usuario_id === row.id
          );
          return {
            id: row.id,
            nome: row.nome_completo || row.email || 'Usuario sem nome',
            email: row.email || null,
            tipo: Array.isArray(row.user_types)
              ? row.user_types[0]?.name || 'OUTRO'
              : (row.user_types as any)?.name || 'OUTRO',
            empresa:
              (Array.isArray(row.companies)
                ? (row.companies[0] as any)?.nome_fantasia || (row.companies[0] as any)?.nome_empresa
                : (row.companies as any)?.nome_fantasia || (row.companies as any)?.nome_empresa) || 'Sem empresa',
            ativos: userPermissions.filter(
              (item: any) => item.ativo !== false && item.permissao !== 'none'
            ).length
          };
        }),
        sections: agruparModulosPorSecao(MODULOS_ADMIN_PERMISSOES),
        global_modules: globalModules,
        system_module_catalog: listSystemModuleCatalog(
          globalModules.map((row: any) => String(row.module_key || '').trim())
        )
      },
      { headers: DYNAMIC_READ_HEADERS }
    );
  } catch (err) {
    logServerError('[admin/permissoes] falha ao carregar painel', err);
    return toErrorResponse(err, 'Erro ao carregar painel de permissoes.');
  }
}

export async function POST(event: RequestEvent) {
  try {
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) return new Response('Sessao invalida.', { status: 401, headers: NO_STORE_HEADERS });

    const client = getAdminClient();
    const scope = await resolveUserScope(client, user.id);

    ensureCanManagePermissions(scope);

    const body = await event.request.json().catch(() => ({}));
    const action = String(body.action || 'user').trim().toLowerCase();

    if (action === 'global') {
      if (!scope.isAdmin) {
        return new Response('Somente ADMIN pode alterar modulos globais.', { status: 403, headers: NO_STORE_HEADERS });
      }
      await saveSystemModuleSettings(
        client,
        Array.isArray(body.settings) ? body.settings : []
      );
      invalidateUserReadModels();
      return json({ ok: true }, { headers: NO_STORE_HEADERS });
    }

    const userId = String(body.user_id || '').trim();
    if (!userId) {
      return new Response('Usuario alvo nao informado.', { status: 400, headers: NO_STORE_HEADERS });
    }

    const managedUsers = await listManagedUsers(client, scope);
    const isManagedUser = managedUsers.some((row) => row.id === userId);
    if (!isManagedUser) {
      return new Response('Usuario fora do escopo.', { status: 403, headers: NO_STORE_HEADERS });
    }

    const permissions = Array.isArray(body.permissions) ? body.permissions : [];
    ensureAssignablePermissionSet(scope, permissions);
    await saveUserPermissions(client, userId, permissions);
    invalidateUserReadModels({
      userId,
      companyIds: scope.companyIds
    });

    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logServerError('[admin/permissoes] falha ao salvar permissoes', err);
    return toErrorResponse(err, 'Erro ao salvar permissoes.');
  }
}
