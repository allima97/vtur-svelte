import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readTextBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import { invalidateSalesReadModels } from '$lib/server/readModelCache';
import { chunkArray, SUPABASE_IN_BATCH_SIZE } from '$lib/utils/array';
import { safeJsonParse } from '$lib/utils/json';

const MAX_RECIBO_COMPLEMENTAR_LINK_BODY_BYTES = 64 * 1024;

export async function POST(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const textResult = await readTextBodyLimited(event.request, MAX_RECIBO_COMPLEMENTAR_LINK_BODY_BYTES);
    if (!textResult.ok) return textResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 3, 'Sem permissao para editar vendas.');
    }

    const rawBody = textResult.text;
    const body = safeJsonParse(rawBody) as
      | {
          primary_venda_id?: string;
          links?: Array<{ venda_id?: string; recibo_id?: string }>;
          venda_id?: string;
          recibo_id?: string;
          venda_cruzada_id?: string;
          recibo_cruzado_id?: string;
          cruzado_ja_vinculado?: boolean;
          company_id?: string;
          empresa_id?: string;
        }
      | null;

    const companyIds = resolveScopedCompanyIds(
      scope,
      body?.company_id || body?.empresa_id || event.url.searchParams.get('empresa_id')
    );
    const companySet = new Set(companyIds.map((id) => String(id || '').trim()).filter(Boolean));

    const fetchScopedSales = async (saleIds: string[]) => {
      const rows: any[] = [];
      const uniqueSaleIds = Array.from(new Set(saleIds.map((id) => String(id || '').trim()).filter((id) => isUuid(id))));
      for (const batch of chunkArray(uniqueSaleIds)) {
        const { data, error } = await client
          .from('vendas')
          .select('id, company_id')
          .in('id', batch);
        if (error) throw error;
        rows.push(...(data || []));
      }

      const map = new Map<string, any>();
      for (const row of rows) {
        const id = String(row?.id || '').trim();
        const companyId = String(row?.company_id || '').trim();
        if (!id) continue;
        if (!scope.isAdmin && companySet.size > 0 && !companySet.has(companyId)) continue;
        map.set(id, row);
      }
      return map;
    };

    if (Array.isArray(body?.links)) {
      const primaryVendaId = String(body?.primary_venda_id || '').trim();
      if (!isUuid(primaryVendaId)) {
        return new Response('primary_venda_id invalido.', { status: 400, headers: NO_STORE_HEADERS });
      }

      const links = body.links
        .filter((item) => isUuid(String(item?.venda_id || '').trim()) && isUuid(String(item?.recibo_id || '').trim()))
        .map((item) => ({
          venda_id: String(item?.venda_id || '').trim(),
          recibo_id: String(item?.recibo_id || '').trim()
        }));

      if (links.length === 0) {
        return new Response('Sem links validos.', { status: 400, headers: NO_STORE_HEADERS });
      }

      const scopedSales = await fetchScopedSales([primaryVendaId, ...links.map((link) => link.venda_id)]);
      if (!scopedSales.has(primaryVendaId)) {
        return new Response('Venda nao encontrada.', { status: 404, headers: NO_STORE_HEADERS });
      }
      if (links.some((link) => !scopedSales.has(link.venda_id))) {
        return new Response('Venda complementar fora do escopo.', { status: 403, headers: NO_STORE_HEADERS });
      }

      const { error: batchError } = await client
        .from('vendas_recibos_complementares')
        .upsert(links, { onConflict: 'venda_id,recibo_id', ignoreDuplicates: true });
      if (batchError) throw batchError;

      invalidateSalesReadModels();
      return json({ ok: true, total: links.length }, { headers: NO_STORE_HEADERS });
    }

    const vendaId = String(body?.venda_id || '').trim();
    const reciboId = String(body?.recibo_id || '').trim();
    const vendaCruzadaId = String(body?.venda_cruzada_id || '').trim();
    const reciboCruzadoId = String(body?.recibo_cruzado_id || '').trim();
    const cruzadoJaVinculado = Boolean(body?.cruzado_ja_vinculado);

    if (!isUuid(vendaId) || !isUuid(reciboId)) {
      return new Response('venda_id ou recibo_id invalido.', { status: 400, headers: NO_STORE_HEADERS });
    }
    if (vendaCruzadaId && !isUuid(vendaCruzadaId)) {
      return new Response('venda_cruzada_id invalido.', { status: 400, headers: NO_STORE_HEADERS });
    }
    if (reciboCruzadoId && !isUuid(reciboCruzadoId)) {
      return new Response('recibo_cruzado_id invalido.', { status: 400, headers: NO_STORE_HEADERS });
    }

    const saleIdsToValidate = [vendaId, vendaCruzadaId].filter(Boolean);
    const scopedSales = await fetchScopedSales(saleIdsToValidate);
    if (!scopedSales.has(vendaId)) {
      return new Response('Venda nao encontrada.', { status: 404, headers: NO_STORE_HEADERS });
    }

    if (vendaCruzadaId && !scopedSales.has(vendaCruzadaId)) {
      return new Response('Venda cruzada nao encontrada.', { status: 404, headers: NO_STORE_HEADERS });
    }

    const primaryLink = { venda_id: vendaId, recibo_id: reciboId };
    const { error: primaryLinkError } = await client
      .from('vendas_recibos_complementares')
      .upsert(primaryLink, { onConflict: 'venda_id,recibo_id', ignoreDuplicates: true });
    if (primaryLinkError) throw primaryLinkError;

    if (!cruzadoJaVinculado && vendaCruzadaId && reciboCruzadoId) {
      const crossLink = { venda_id: vendaCruzadaId, recibo_id: reciboCruzadoId };
      const { error: crossLinkError } = await client
        .from('vendas_recibos_complementares')
        .upsert(crossLink, { onConflict: 'venda_id,recibo_id', ignoreDuplicates: true });
      if (crossLinkError) {
        await client.from('vendas_recibos_complementares').delete().match(primaryLink);
        throw crossLinkError;
      }
    }

    invalidateSalesReadModels();
    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao vincular recibo complementar.');
  }
}
