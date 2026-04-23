import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { fetchAndComputeVendasKpis } from '$lib/server/vendas-kpis';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

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

    const kpis = await fetchAndComputeVendasKpis(client, {
      dataInicio: inicio,
      dataFim: fim,
      companyIds,
      vendedorIds,
      accessibleClientIds
    });

    return json({ kpis });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao calcular KPIs de vendas.');
  }
}
