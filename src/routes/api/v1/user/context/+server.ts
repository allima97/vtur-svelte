import { json } from '@sveltejs/kit';
import { getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    return json({
      success: true,
      user_id: user.id,
      company_id: scope.companyId,
      nome: scope.nome,
      email: scope.email,
      papel: scope.papel,
      isAdmin: scope.isAdmin,
      isMaster: scope.isMaster,
      isGestor: scope.isGestor,
      isVendedor: scope.isVendedor
    });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao carregar contexto do usuário.');
  }
}
