import { json } from '@sveltejs/kit';
import {
  buildPermissionMatrix,
  ensureAssignablePermissionSet,
  ensureCanManagePermissions,
  loadManagedUserTypes,
  loadUserTypeDefaultPermissions,
  saveDefaultPermissions
} from '$lib/server/admin';
import {
  agruparModulosPorSecao,
  MODULOS_ADMIN_PERMISSOES
} from '$lib/admin/modules';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const userTypeId = String(event.params.id || '').trim();

    ensureCanManagePermissions(scope);

    const userTypes = await loadManagedUserTypes(client, scope);
    if (!userTypes.some((row) => row.id === userTypeId)) {
      return new Response('Tipo de usuario fora do escopo.', { status: 403, headers: NO_STORE_HEADERS });
    }

    const rows = await loadUserTypeDefaultPermissions(client, userTypeId);
    return json(
      {
        permissions: buildPermissionMatrix(rows as any),
        sections: agruparModulosPorSecao(MODULOS_ADMIN_PERMISSOES)
      },
      { headers: DYNAMIC_READ_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar permissoes padrao.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const userTypeId = String(event.params.id || '').trim();
    const body = await event.request.json().catch(() => ({}));

    ensureCanManagePermissions(scope);

    const userTypes = await loadManagedUserTypes(client, scope);
    if (!userTypes.some((row) => row.id === userTypeId)) {
      return new Response('Tipo de usuario fora do escopo.', { status: 403, headers: NO_STORE_HEADERS });
    }

    const permissions = Array.isArray(body.permissions) ? body.permissions : [];
    ensureAssignablePermissionSet(scope, permissions);
    await saveDefaultPermissions(client, userTypeId, permissions);

    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar permissoes padrao.');
  }
}
