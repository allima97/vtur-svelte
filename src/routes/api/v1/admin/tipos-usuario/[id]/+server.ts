import { json } from '@sveltejs/kit';
import {
  buildPermissionMatrix,
  ensureCanManagePermissions,
  loadManagedUserTypes,
  loadUserTypeDefaultPermissions
} from '$lib/server/admin';
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
    const typeId = String(event.params.id || '').trim();

    ensureCanManagePermissions(scope);

    const userTypes = await loadManagedUserTypes(client, scope);
    const target = userTypes.find((row) => row.id === typeId);
    if (!target) {
      return new Response('Tipo de usuario nao encontrado.', { status: 404 });
    }

    const [defaultPermsRes, usersRes] = await Promise.all([
      loadUserTypeDefaultPermissions(client, typeId),
      client.from('users').select('id, nome_completo, email').eq('user_type_id', typeId).order('nome_completo')
    ]);

    if (usersRes.error) throw usersRes.error;

    return json({
      tipo: target,
      default_permissions: buildPermissionMatrix(defaultPermsRes as any),
      usuarios: (usersRes.data || []).map((row: any) => ({
        id: row.id,
        nome: row.nome_completo || row.email || 'Usuario sem nome',
        email: row.email || null
      }))
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar detalhe do tipo de usuario.');
  }
}
