import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse,
  parseIntSafe
} from '$lib/server/v1';
import { fetchVendasKpiReciboContributions } from '$lib/server/vendas-kpis';

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

    const maxItems = parseIntSafe(searchParams.get('limit'), 3000);

    const payload = await fetchVendasKpiReciboContributions(client, {
      dataInicio: inicio,
      dataFim: fim,
      companyIds,
      vendedorIds,
      accessibleClientIds
    });

    const sorted = [...payload.contributions].sort((a, b) => b.bruto - a.bruto);

    return json({
      periodo: { inicio, fim },
      agg: payload.agg,
      totalContribuicoes: payload.contributions.length,
      contribuicoes: sorted.slice(0, maxItems)
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao gerar diff de recibos de vendas.');
  }
}
