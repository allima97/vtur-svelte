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
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import { chunkArray } from '$lib/utils/array';

const MAX_PERMISSIONS_BODY_BYTES = 256 * 1024;

export async function GET(event: RequestEvent) {
  try {
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) return new Response('Sessao invalida.', { status: 401, headers: NO_STORE_HEADERS });

    const client = getAdminClient();
    const scope = await resolveUserScope(client, user.id);

    ensureCanManagePermissions(scope);

    const users = await listManagedUsers(client, scope);
    const userIds = users.map((row) => row.id);
    const permissionsRows: any[] = [];

    for (const batch of chunkArray(userIds)) {
      if (batch.length === 0) continue;
      const permissionsRes = await client
        .from('modulo_acesso')
        .select('usuario_id, modulo, permissao, ativo')
        .in('usuario_id', batch);

      if (permissionsRes.error) throw permissionsRes.error;
      permissionsRows.push(...(permissionsRes.data || []));
    }

    const activePermissionCounts = new Map<string, number>();
    permissionsRows.forEach((item: any) => {
      const userId = String(item?.usuario_id || '').trim();
      if (!userId || item?.ativo === false || item?.permissao === 'none') return;
      activePermissionCounts.set(userId, Number(activePermissionCounts.get(userId) || 0) + 1);
    });

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
            ativos: Number(activePermissionCounts.get(row.id) || 0)
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
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_PERMISSIONS_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) return new Response('Sessao invalida.', { status: 401, headers: NO_STORE_HEADERS });

    const client = getAdminClient();
    const scope = await resolveUserScope(client, user.id);

    ensureCanManagePermissions(scope);

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, unknown>)
        : {};
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
