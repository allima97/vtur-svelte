import { json } from '@sveltejs/kit';
import { getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const empresas =
      scope.companyIds.length > 0
        ? await client
            .from('companies')
            .select('id, nome_fantasia, nome_empresa')
            .in('id', scope.companyIds)
            .order('nome_fantasia', { ascending: true })
        : { data: [], error: null };

    if (empresas.error) throw empresas.error;

    return json({
      success: true,
      user_id: user.id,
      company_id: scope.companyId,
      company_ids: scope.companyIds,
      empresas: (empresas.data || []).map((row: any) => ({
        id: String(row?.id || ''),
        nome: String(row?.nome_fantasia || row?.nome_empresa || 'Empresa sem nome')
      })),
      nome: scope.nome,
      email: scope.email,
      papel: scope.papel,
      isAdmin: scope.isAdmin,
      isMaster: scope.isMaster,
      isFinanceiro: scope.isFinanceiro,
      isGestor: scope.isGestor,
      isVendedor: scope.isVendedor
    });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao carregar contexto do usuário.');
  }
}
