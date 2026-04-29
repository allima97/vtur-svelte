import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 4, 'Sem permissao para cancelar vendas.');
    }

    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody) as { venda_id?: string } | null;
    const vendaId = String(body?.venda_id || '').trim();

    if (!isUuid(vendaId)) {
      return new Response('venda_id invalido.', { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get('empresa_id') || event.url.searchParams.get('company_id')
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get('vendedor_id') || event.url.searchParams.get('vendedor_ids')
    );
    const shouldApplySellerScope = !scope.isGestor && !scope.isMaster;

    let saleQuery = client.from('vendas').select('id').eq('id', vendaId);
    if (companyIds.length > 0) saleQuery = saleQuery.in('company_id', companyIds);
    if (shouldApplySellerScope && vendedorIds.length > 0) saleQuery = saleQuery.in('vendedor_id', vendedorIds);

    const { data: sale, error: saleError } = await saleQuery.maybeSingle();
    if (saleError) throw saleError;
    if (!sale) {
      return new Response('Venda nao encontrada.', { status: 404 });
    }

    // Soft-delete: vendas.cancelada boolean NOT NULL DEFAULT false
    let cancelQuery = client.from('vendas').update({ cancelada: true }).eq('id', vendaId);
    if (companyIds.length > 0) cancelQuery = cancelQuery.in('company_id', companyIds);
    if (shouldApplySellerScope && vendedorIds.length > 0) cancelQuery = cancelQuery.in('vendedor_id', vendedorIds);

    const { error: cancelError } = await cancelQuery;
    if (cancelError) throw cancelError;

    return json({ ok: true, cancelled: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao cancelar venda.');
  }
}
