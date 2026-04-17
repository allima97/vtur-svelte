import { json } from '@sveltejs/kit';
import {
  buildPermissionMatrix,
  ensureCanManagePermissions,
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

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const userTypeId = String(event.params.id || '').trim();

    ensureCanManagePermissions(scope);

    const rows = await loadUserTypeDefaultPermissions(client, userTypeId);
    return json({
      permissions: buildPermissionMatrix(rows as any),
      sections: agruparModulosPorSecao(MODULOS_ADMIN_PERMISSOES)
    });
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

    await saveDefaultPermissions(client, userTypeId, Array.isArray(body.permissions) ? body.permissions : []);

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar permissoes padrao.');
  }
}
