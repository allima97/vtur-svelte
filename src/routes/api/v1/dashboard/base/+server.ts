import { json } from '@sveltejs/kit';
import {
  fetchRankingVendedoresByCompanyIds,
  getAdminClient,
  hasModuloAccess,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function companyLabel(row: any) {
  return String(row?.nome_fantasia || row?.nome_empresa || 'Empresa sem nome');
}

function vendedorLabel(row: any) {
  return String(row?.nome_completo || row?.email || 'Usuario sem nome');
}

function canUseDashboardFilters(scope: any) {
  return (
    scope?.isAdmin ||
    scope?.isMaster ||
    scope?.isGestor ||
    hasModuloAccess(scope, ['dashboard'], 1)
  );
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!canUseDashboardFilters(scope)) {
      return json({ error: 'Sem acesso aos filtros do dashboard.' }, { status: 403 });
    }

    const requestedCompanyId = String(event.url.searchParams.get('empresa_id') || '').trim();

    let scopedCompanyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
    if (scope.isGestor && scope.companyId) {
      scopedCompanyIds = [scope.companyId];
    }

    let companiesQuery = client
      .from('companies')
      .select('id, nome_fantasia, nome_empresa, active')
      .order('nome_fantasia', { ascending: true })
      .limit(500);

    if (!scope.isAdmin && scope.companyIds.length > 0) {
      companiesQuery = companiesQuery.in('id', scope.companyIds);
    }

    const { data: companiesData, error: companiesError } = await companiesQuery;
    if (companiesError) throw companiesError;

    const empresas = (companiesData || [])
      .map((row: any) => ({
        id: String(row?.id || ''),
        nome: companyLabel(row),
        active: row?.active !== false
      }))
      .filter((row) => row.id);

    const companyIdsForVendedores = (() => {
      if (scopedCompanyIds.length > 0) return scopedCompanyIds;
      if (scope.isAdmin) return empresas.map((row) => row.id).filter(isUuid);
      return scope.companyIds;
    })();

    let vendedores: any[] = [];
    if (scope.isAdmin || scope.isMaster || scope.isGestor) {
      vendedores = await fetchRankingVendedoresByCompanyIds(client, companyIdsForVendedores);
    } else {
      const { data: currentUser, error: userError } = await client
        .from('users')
        .select('id, nome_completo, email, company_id')
        .eq('id', scope.userId)
        .maybeSingle();
      if (userError) throw userError;
      vendedores = currentUser ? [currentUser] : [];
    }

    const companyNameById = new Map(empresas.map((row) => [row.id, row.nome]));
    const vendedoresFiltro = vendedores
      .map((row: any) => ({
        id: String(row?.id || ''),
        nome: vendedorLabel(row),
        company_id: String(row?.company_id || ''),
        company_name: companyNameById.get(String(row?.company_id || '')) || ''
      }))
      .filter((row) => row.id)
      .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));

    return json({
      empresas,
      vendedores: vendedoresFiltro
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar filtros do dashboard.');
  }
}
