import { json } from '@sveltejs/kit';
import { getAdminClient, requireAuthenticatedUser, resolveUserScope } from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    // ✅ Apenas administradores podem acessar este endpoint de debug
    if (!scope.isAdmin) {
      return json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { data: userData } = await client
      .from('users')
      .select('id, company_id, nome_completo, email, uso_individual, user_type_id')
      .eq('id', user.id)
      .single();

    const { data: permissoes } = await client
      .from('modulo_acesso')
      .select('modulo, permissao, ativo')
      .eq('usuario_id', user.id);

    // Empresas filtradas pelo escopo do admin
    const { data: empresas } = scope.companyIds.length > 0
      ? await client
          .from('companies')
          .select('id, nome_fantasia')
          .in('id', scope.companyIds)
      : await client
          .from('companies')
          .select('id, nome_fantasia');

    return json({
      usuario: {
        id: user.id,
        email: user.email,
        nome: userData?.nome_completo,
        company_id: userData?.company_id,
        user_type_id: userData?.user_type_id,
        uso_individual: userData?.uso_individual
      },
      scope: {
        isAdmin: scope.isAdmin,
        isMaster: scope.isMaster,
        isGestor: scope.isGestor,
        isVendedor: scope.isVendedor,
        papel: scope.papel,
        companyIds: scope.companyIds,
        permissoes: scope.permissoes
      },
      permissoes_detalhadas: permissoes,
      empresas_disponiveis: empresas
    });
  } catch (err: any) {
    return json({ error: 'Erro interno.' }, { status: 500 });
  }
}
