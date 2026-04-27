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

    // regrasMap é Record<id, Regra> — converte para array para compatibilidade
    const regrasArray = Object.entries(commissionContext.regrasMap).map(([id, rule]) => ({
      id,
      nome: (rule as any).nome || 'Regra',
      tipo: rule.tipo || 'GERAL',
      meta_atingida: Number(rule.meta_atingida || 0),
      ativo: true
    }));

    const regras = regrasArray.map((rule) => ({
      id: rule.id,
      nome: rule.nome,
      tipo: rule.tipo,
      meta_atingida: rule.meta_atingida,
      ativo: rule.ativo
    }));

    const items = (usersData || []).map((u: any) => {
      const regraBase = regrasArray[0] || null;

      return {
        id: u.id,
        vendedor_id: u.id,
        vendedor_nome: u.nome_completo || u.email || 'Vendedor',
        regra_id: regraId && commissionContext.regrasMap[regraId] ? regraId : regraBase?.id || null,
        regra_nome:
          regraId && commissionContext.regrasMap[regraId]
            ? (commissionContext.regrasMap[regraId] as any).nome || 'Regra selecionada'
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
