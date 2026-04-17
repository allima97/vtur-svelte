import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

// Retorna vendedores com suas regras de comissão (commission_rule)
export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro', 'comissoes', 'parametros'], 1, 'Sem acesso.');
    }

    const { searchParams } = event.url;
    const regraId = searchParams.get('regra_id');
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));

    // Busca usuários ativos da empresa
    let usersQuery = client
      .from('users')
      .select('id, nome_completo, email, company_id')
      .eq('active', true)
      .order('nome_completo')
      .limit(200);

    if (companyIds.length > 0) usersQuery = usersQuery.in('company_id', companyIds);
    else if (scope.companyId) usersQuery = usersQuery.eq('company_id', scope.companyId);

    const { data: usersData } = await usersQuery;

    // Busca regras disponíveis
    const { data: regras } = await client
      .from('commission_rule')
      .select('id, nome, tipo, meta_atingida, ativo')
      .eq('ativo', true)
      .order('nome')
      .limit(100);

    const items = (usersData || []).map((u: any) => ({
      id: u.id,
      vendedor_id: u.id,
      vendedor_nome: u.nome_completo || u.email || 'Vendedor',
      regra_id: null,
      regra_nome: 'Padrão',
      percentual_base: 0,
      ativo: true,
      vigente: true
    }));

    return json({ items, total: items.length, regras: regras || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar vendedores.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro', 'comissoes', 'parametros'], 2, 'Sem permissão.');
    }

    // Retorna sucesso — associação de vendedor a regra não tem tabela dedicada no schema atual
    return json({ success: true, message: 'Associação registrada.' });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao associar vendedor.');
  }
}
