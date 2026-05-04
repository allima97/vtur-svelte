import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchVendedorIdsByCompanyIds,
  getAdminClient,
  parseUuidList,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { fetchAndComputeVendasKpis } from '$lib/server/vendas-kpis';
import { DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';

const NO_MATCH_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 1, 'Sem acesso a Vendas.');
    }

    const { searchParams } = event.url;
    const inicio = String(searchParams.get('inicio') || '').trim();
    const fim = String(searchParams.get('fim') || '').trim();
    const requestedCompanyId = searchParams.get('empresa_id') || searchParams.get('company_id');
    const requestedVendedorRaw = searchParams.get('vendedor_ids') || searchParams.get('vendedor_id');
    const hasRequestedVendedorFilter = String(requestedVendedorRaw || '').trim().length > 0;
    const tipoNome = String(scope.tipoNome || '').toUpperCase();
    const isAdminByType = tipoNome.includes('ADMIN');
    const isFinanceiroByType = tipoNome.includes('FINANCEIRO');
    const isGestorByType = tipoNome.includes('GESTOR');
    const isMasterByType = tipoNome.includes('MASTER');

    let companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
    let vendedorIds: string[] = [];

    if (isAdminByType) {
      vendedorIds = await resolveScopedVendedorIds(client, scope, requestedVendedorRaw);
    } else if (isGestorByType) {
      companyIds = scope.companyId ? [scope.companyId] : resolveScopedCompanyIds(scope, requestedCompanyId);
      if (hasRequestedVendedorFilter) {
        const requestedIds = parseUuidList(requestedVendedorRaw);
        const allGestorVendedores = await fetchVendedorIdsByCompanyIds(client, companyIds);
        vendedorIds = requestedIds.filter((id) => allGestorVendedores.includes(id));
        if (vendedorIds.length === 0) vendedorIds = [NO_MATCH_USER_ID];
      } else {
        vendedorIds = [];
      }
    } else if (isFinanceiroByType) {
      const requestedIds = parseUuidList(requestedVendedorRaw);
      if (hasRequestedVendedorFilter) {
        const allFinanceiroVendedores = await fetchVendedorIdsByCompanyIds(client, companyIds);
        vendedorIds = requestedIds.filter((id) => allFinanceiroVendedores.includes(id));
        if (vendedorIds.length === 0) vendedorIds = [NO_MATCH_USER_ID];
      } else {
        vendedorIds = [];
      }
    } else if (isMasterByType) {
      const requestedIds = parseUuidList(requestedVendedorRaw);
      if (hasRequestedVendedorFilter) {
        const allMasterVendedores = await fetchVendedorIdsByCompanyIds(client, companyIds);
        vendedorIds = requestedIds.filter((id) => allMasterVendedores.includes(id));
        if (vendedorIds.length === 0) vendedorIds = [NO_MATCH_USER_ID];
      } else {
        vendedorIds = [];
      }
    } else {
      vendedorIds = [scope.userId];
    }

    const accessibleClientIds = !scope.isAdmin &&
      !isMasterByType &&
      !isFinanceiroByType &&
      !isGestorByType &&
      vendedorIds.length === 0 &&
      companyIds.length === 0
      ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds })
      : [];

    const kpis = await fetchAndComputeVendasKpis(client, {
      dataInicio: inicio,
      dataFim: fim,
      companyIds,
      vendedorIds,
      accessibleClientIds
    });

    return json({ kpis }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao calcular KPIs de vendas.');
  }
}
