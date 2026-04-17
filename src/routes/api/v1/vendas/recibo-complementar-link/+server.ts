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

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 3, 'Sem permissao para editar vendas.');
    }

    const rawBody = await event.request.text();
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

    if (Array.isArray(body?.links)) {
      const primaryVendaId = String(body?.primary_venda_id || '').trim();
      if (!isUuid(primaryVendaId)) {
        return new Response('primary_venda_id invalido.', { status: 400 });
      }

      const links = body.links
        .filter((item) => isUuid(String(item?.venda_id || '').trim()) && isUuid(String(item?.recibo_id || '').trim()))
        .map((item) => ({
          venda_id: String(item?.venda_id || '').trim(),
          recibo_id: String(item?.recibo_id || '').trim()
        }));

      if (links.length === 0) {
        return new Response('Sem links validos.', { status: 400 });
      }

      let primarySaleQuery = client.from('vendas').select('id').eq('id', primaryVendaId);
      if (companyIds.length > 0) primarySaleQuery = primarySaleQuery.in('company_id', companyIds);
      const { data: primarySale, error: primarySaleError } = await primarySaleQuery.maybeSingle();
      if (primarySaleError) throw primarySaleError;
      if (!primarySale) {
        return new Response('Venda nao encontrada.', { status: 404 });
      }

      const { error: batchError } = await client
        .from('vendas_recibos_complementares')
        .upsert(links, { onConflict: 'venda_id,recibo_id', ignoreDuplicates: true });
      if (batchError) throw batchError;

      return json({ ok: true, total: links.length });
    }

    const vendaId = String(body?.venda_id || '').trim();
    const reciboId = String(body?.recibo_id || '').trim();
    const vendaCruzadaId = String(body?.venda_cruzada_id || '').trim();
    const reciboCruzadoId = String(body?.recibo_cruzado_id || '').trim();
    const cruzadoJaVinculado = Boolean(body?.cruzado_ja_vinculado);

    if (!isUuid(vendaId) || !isUuid(reciboId)) {
      return new Response('venda_id ou recibo_id invalido.', { status: 400 });
    }
    if (vendaCruzadaId && !isUuid(vendaCruzadaId)) {
      return new Response('venda_cruzada_id invalido.', { status: 400 });
    }
    if (reciboCruzadoId && !isUuid(reciboCruzadoId)) {
      return new Response('recibo_cruzado_id invalido.', { status: 400 });
    }

    let saleQuery = client.from('vendas').select('id').eq('id', vendaId);
    if (companyIds.length > 0) saleQuery = saleQuery.in('company_id', companyIds);
    const { data: sale, error: saleError } = await saleQuery.maybeSingle();
    if (saleError) throw saleError;
    if (!sale) {
      return new Response('Venda nao encontrada.', { status: 404 });
    }

    if (vendaCruzadaId) {
      let crossSaleQuery = client.from('vendas').select('id').eq('id', vendaCruzadaId);
      if (companyIds.length > 0) crossSaleQuery = crossSaleQuery.in('company_id', companyIds);
      const { data: crossSale, error: crossSaleError } = await crossSaleQuery.maybeSingle();
      if (crossSaleError) throw crossSaleError;
      if (!crossSale) {
        return new Response('Venda cruzada nao encontrada.', { status: 404 });
      }
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

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao vincular recibo complementar.');
  }
}
