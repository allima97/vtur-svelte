import { json, type RequestEvent } from '@sveltejs/kit';
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
import { isSaleInScope } from '$lib/server/salesScope';
import { safeJsonParse } from '$lib/utils/json';

const MAX_RECIBO_COMPLEMENTAR_REMOVE_BODY_BYTES = 16 * 1024;

function parseBodyIds(values?: unknown[] | null) {
  if (!Array.isArray(values)) return [];
  const ids: string[] = [];
  for (const item of values) {
    const id = String(item || '').trim();
    if (isUuid(id)) ids.push(id);
    if (ids.length >= 50) break;
  }
  return ids;
}

export async function POST(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const textResult = await readTextBodyLimited(event.request, MAX_RECIBO_COMPLEMENTAR_REMOVE_BODY_BYTES);
    if (!textResult.ok) return textResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 3, 'Sem permissao para editar vendas.');
    }

    const rawBody = textResult.text;
    const body = safeJsonParse(rawBody) as { ids?: unknown[] } | null;
    const ids = parseBodyIds(body?.ids);

    if (ids.length === 0) {
      return new Response('ids obrigatorio.', { status: 400, headers: NO_STORE_HEADERS });
    }

    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get('company_id') || event.url.searchParams.get('empresa_id')
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get('vendedor_ids') || event.url.searchParams.get('vendedor_id')
    );
    const { data: links, error: linksError } = await client
      .from('vendas_recibos_complementares')
      .select('id, venda:vendas!venda_id(id, company_id, vendedor_id)')
      .in('id', ids);
    if (linksError) throw linksError;

    const allowedIds = (links || [])
      .filter((link: any) => {
        const venda = Array.isArray(link?.venda) ? link.venda[0] : link?.venda;
        return isSaleInScope(venda, { scope, companyIds, vendedorIds });
      })
      .map((link: any) => String(link.id));

    if (allowedIds.length !== ids.length) {
      return json({ error: 'Vinculo complementar fora do escopo.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const { error } = await client.from('vendas_recibos_complementares').delete().in('id', allowedIds);
    if (error) throw error;

    invalidateSalesReadModels();
    return json({ ok: true, removed: allowedIds.length }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao remover recibo complementar.');
  }
}
