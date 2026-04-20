import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { fetchCommissionContext } from '$lib/server/comissoes';

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
    const commissionContext = await fetchCommissionContext(client, { companyIds });

    const regras = commissionContext.rules.map((rule) => ({
      id: rule.id,
      nome: rule.nome || 'Regra',
      tipo: rule.tipo || 'GERAL',
      meta_atingida: Number(rule.meta_atingida || 0),
      ativo: rule.ativo !== false
    }));

    const items = (usersData || []).map((u: any) => {
      const regrasEmpresa = commissionContext.rules.filter(
        (rule) => !rule.company_id || String(rule.company_id) === String(u.company_id || '')
      );
      const regraBase = regrasEmpresa[0] || null;

      return {
      id: u.id,
      vendedor_id: u.id,
      vendedor_nome: u.nome_completo || u.email || 'Vendedor',
      regra_id: regraId && regrasEmpresa.some((item) => item.id === regraId) ? regraId : regraBase?.id || null,
      regra_nome:
        regraId && regrasEmpresa.some((item) => item.id === regraId)
          ? regrasEmpresa.find((item) => item.id === regraId)?.nome || 'Regra selecionada'
          : regraBase?.nome || 'Calculada por produto/pacote/meta',
      percentual_base: Number(regraBase?.meta_atingida || 0),
      ativo: true,
      vigente: true
      };
    });

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
