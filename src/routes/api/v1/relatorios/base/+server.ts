import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchVendedorIdsByCompanyIds,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function isRankingUserType(value?: string | null) {
  const normalized = String(value || '').trim().toUpperCase();
  return (
    normalized.includes('VENDEDOR') ||
    normalized.includes('GESTOR') ||
    normalized.includes('MASTER')
  );
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['relatorios', 'dashboard', 'vendas'], 1, 'Sem acesso aos filtros analíticos.');
    }

    const { searchParams } = event.url;
    const requestedCompanyId = String(searchParams.get('empresa_id') || '').trim();
    const tipoNome = String(scope.tipoNome || '').toUpperCase();
    const isAdminByType = tipoNome.includes('ADMIN');
    const isGestorByType = tipoNome.includes('GESTOR');
    const isMasterByType = tipoNome.includes('MASTER');

    let scopedTeamIds: string[] = [];
    let companyIdsForUsers: string[] = [];
    let enforceCorporateOnly = false;

    if (isAdminByType) {
      companyIdsForUsers = requestedCompanyId ? [requestedCompanyId] : [];
    } else if (isGestorByType) {
      companyIdsForUsers = scope.companyId ? [scope.companyId] : resolveScopedCompanyIds(scope, requestedCompanyId);
      scopedTeamIds = await fetchVendedorIdsByCompanyIds(client, companyIdsForUsers);
    } else if (isMasterByType) {
      companyIdsForUsers = resolveScopedCompanyIds(scope, requestedCompanyId);
      enforceCorporateOnly = true;
    } else {
      companyIdsForUsers = resolveScopedCompanyIds(scope, requestedCompanyId);
      scopedTeamIds = [scope.userId];
    }

    let companiesQuery = client
      .from('companies')
      .select('id, nome_fantasia, nome_empresa, active')
      .order('nome_fantasia', { ascending: true })
      .limit(500);

    if (!scope.isAdmin && scope.companyIds.length > 0) {
      companiesQuery = companiesQuery.in('id', scope.companyIds);
    }

    const [companiesRes, usersRes] = await Promise.all([
      companiesQuery,
      (async () => {
        let query = client
          .from('users')
          .select(`
            id,
            nome_completo,
            email,
            company_id,
            active,
            uso_individual,
            user_types (name),
            companies (nome_fantasia, nome_empresa)
          `)
          .limit(1000);

        if (!scope.isAdmin && scopedTeamIds.length > 0) {
          query = query.in('id', scopedTeamIds);
          return query;
        }

        if (!scope.isAdmin && companyIdsForUsers.length > 0) {
          query = query.in('company_id', companyIdsForUsers);
        }

        if (enforceCorporateOnly) {
          query = query.eq('uso_individual', false).eq('active', true);
        }

        return query;
      })()
    ]);

    if (companiesRes.error) throw companiesRes.error;
    if (usersRes.error) throw usersRes.error;

    const empresas = (companiesRes.data || []).map((row: any) => ({
      id: String(row.id || ''),
      nome: String(row.nome_fantasia || row.nome_empresa || 'Empresa sem nome'),
      active: row.active !== false
    }));

    const vendedores = (usersRes.data || [])
      .filter((row: any) => {
        if (row?.active === false) return false;
        if (row?.uso_individual === true) return false;
        if (isGestorByType && scopedTeamIds.length > 0) return true;
        const userType = Array.isArray(row?.user_types) ? row.user_types[0] : row?.user_types;
        return isRankingUserType(userType?.name);
      })
      .map((row: any) => {
        const userType = Array.isArray(row?.user_types) ? row.user_types[0] : row?.user_types;
        const company = Array.isArray(row?.companies) ? row.companies[0] : row?.companies;

        return {
        id: String(row.id || ''),
        nome: String(row.nome_completo || row.email || 'Usuário sem nome'),
        company_id: String(row.company_id || ''),
        company_name: String(company?.nome_fantasia || company?.nome_empresa || ''),
        papel: String(userType?.name || '')
      };
      })
      .filter((row) => row.id)
      .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));

    return json({
      empresas,
      vendedores,
      statusVendas: [
        { value: 'confirmada', label: 'Confirmada' },
        { value: 'pendente', label: 'Pendente' },
        { value: 'concluida', label: 'Concluída' },
        { value: 'cancelada', label: 'Cancelada' }
      ]
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar base analítica.');
  }
}
