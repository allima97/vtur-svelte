import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isDebugEndpointEnabled,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse,
  parseIntSafe
} from '$lib/server/v1';
import { fetchVendasKpiReciboContributions } from '$lib/server/vendas-kpis';

const DEBUG_HEADERS = { 'Cache-Control': 'no-store' };
const MAX_DEBUG_ITEMS = 500;

function debugJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', DEBUG_HEADERS['Cache-Control']);
  return json(body, { ...init, headers });
}

export async function GET(event) {
  try {
    if (!isDebugEndpointEnabled(event)) {
      return debugJson({ error: 'Not found' }, { status: 404 });
    }

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      return debugJson({ error: 'Sem acesso ao diagnóstico de vendas.' }, { status: 403 });
    }
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 1, 'Sem acesso a Vendas.');
    }

    const { searchParams } = event.url;
    const inicio = String(searchParams.get('inicio') || '').trim();
    const fim = String(searchParams.get('fim') || '').trim();
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id') || searchParams.get('company_id'));
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      searchParams.get('vendedor_ids') || searchParams.get('vendedor_id')
    );
    const accessibleClientIds = !scope.isAdmin
      ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds })
      : [];

    const requestedLimit = parseIntSafe(searchParams.get('limit'), MAX_DEBUG_ITEMS);
    const maxItems = Math.max(1, Math.min(requestedLimit, MAX_DEBUG_ITEMS));

    const payload = await fetchVendasKpiReciboContributions(client, {
      dataInicio: inicio,
      dataFim: fim,
      companyIds,
      vendedorIds,
      accessibleClientIds
    });

    const sorted = [...payload.contributions].sort((a, b) => b.bruto - a.bruto);

    return debugJson({
      periodo: { inicio, fim },
      agg: payload.agg,
      totalContribuicoes: payload.contributions.length,
      contribuicoesTruncadas: payload.contributions.length > maxItems,
      contribuicoes: sorted.slice(0, maxItems)
    });
  } catch (err) {
    const response = toErrorResponse(err, 'Erro ao gerar diff de recibos de vendas.');
    response.headers.set('Cache-Control', DEBUG_HEADERS['Cache-Control']);
    return response;
  }
}
