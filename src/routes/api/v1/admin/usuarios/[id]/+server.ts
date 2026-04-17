import { json } from '@sveltejs/kit';
import {
  buildPermissionMatrix,
  ensureCanManageUsers,
  extractCompanyName,
  extractUserTypeName,
  getAccessibleCompanyIds,
  loadAvisoTemplates,
  loadManagedCompanies,
  loadManagedUser,
  loadManagedUserTypes,
  loadUserPermissions,
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

    ensureCanManageUsers(scope);

    const userId = String(event.params.id || '').trim();
    const targetUser = await loadManagedUser(client, scope, userId);
    const [permissions, defaultPermissions, userTypes, companies, templates] = await Promise.all([
      loadUserPermissions(client, userId),
      targetUser.user_type_id
        ? loadUserTypeDefaultPermissions(client, String(targetUser.user_type_id))
        : Promise.resolve([]),
      loadManagedUserTypes(client, scope),
      loadManagedCompanies(client, scope),
      loadAvisoTemplates(client).catch(() => [])
    ]);

    return json({
      user: {
        id: targetUser.id,
        nome: targetUser.nome_completo || targetUser.email || 'Usuario sem nome',
        email: targetUser.email,
        telefone: targetUser.telefone || null,
        cidade: targetUser.cidade || null,
        estado: targetUser.estado || null,
        tipo: extractUserTypeName(targetUser) || 'OUTRO',
        tipo_id: targetUser.user_type_id || null,
        empresa: extractCompanyName(targetUser) || 'Sem empresa',
        empresa_id: targetUser.company_id || null,
        ativo: targetUser.active !== false && targetUser.ativo !== false,
        uso_individual: Boolean(targetUser.uso_individual),
        created_by_gestor: Boolean(targetUser.created_by_gestor),
        participa_ranking: Boolean(targetUser.participa_ranking),
        created_at: targetUser.created_at || null,
        updated_at: targetUser.updated_at || null
      },
      permissions: buildPermissionMatrix(permissions),
      default_permissions: buildPermissionMatrix(defaultPermissions as any),
      available: {
        user_types: userTypes,
        companies,
        aviso_templates: templates,
        company_ids: getAccessibleCompanyIds(scope)
      },
      scope: {
        papel: scope.papel
      }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar detalhe do usuario.');
  }
}
