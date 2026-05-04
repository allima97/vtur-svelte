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
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readTextBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import { invalidateSalesReadModels } from '$lib/server/readModelCache';
import { fetchSaleForScope } from '$lib/server/salesScope';

const MAX_VENDA_CANCEL_BODY_BYTES = 8 * 1024;

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const textResult = await readTextBodyLimited(event.request, MAX_VENDA_CANCEL_BODY_BYTES);
    if (!textResult.ok) return textResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 4, 'Sem permissao para cancelar vendas.');
    }

    const rawBody = textResult.text;
    const body = safeJsonParse(rawBody) as { venda_id?: string } | null;
    const vendaId = String(body?.venda_id || '').trim();

    if (!isUuid(vendaId)) {
      return new Response('venda_id invalido.', { status: 400, headers: NO_STORE_HEADERS });
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
    const sale = await fetchSaleForScope({ client, scope, saleId: vendaId, companyIds, vendedorIds });
    if (!sale) {
      return new Response('Venda nao encontrada.', { status: 404 });
    }
    const saleCompanyId = String(sale.company_id || '').trim();

    // Soft-delete: vendas.cancelada boolean NOT NULL DEFAULT false
    const cancelQuery = client
      .from('vendas')
      .update({ cancelada: true })
      .eq('id', vendaId)
      .eq('company_id', saleCompanyId);

    const { error: cancelError } = await cancelQuery;
    if (cancelError) throw cancelError;

    invalidateSalesReadModels();
    return json({ ok: true, cancelled: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao cancelar venda.');
  }
}
