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

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeRecibo(numero: string): string {
  return numero.replace(/-/g, '').toUpperCase().trim();
}

export async function PATCH(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 3, 'Sem permissao para editar recibos.');
    }

    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody) as {
      venda_id?: string;
      recibo_id?: string;
      numero_recibo?: string;
    } | null;

    const vendaId = String(body?.venda_id || '').trim();
    const reciboId = String(body?.recibo_id || '').trim();
    const numeroRecibo = String(body?.numero_recibo || '').trim();

    if (!isUuid(vendaId) || !isUuid(reciboId)) {
      return new Response('venda_id ou recibo_id invalido.', { status: 400 });
    }
    if (!numeroRecibo) {
      return new Response('numero_recibo e obrigatorio.', { status: 400 });
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

    // Verifica se a venda pertence ao escopo do usuário
    let saleQuery = client.from('vendas').select('id').eq('id', vendaId);
    if (companyIds.length > 0) saleQuery = saleQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) saleQuery = saleQuery.in('vendedor_id', vendedorIds);

    const { data: sale, error: saleError } = await saleQuery.maybeSingle();
    if (saleError) throw saleError;
    if (!sale) {
      return new Response('Venda nao encontrada.', { status: 404 });
    }

    // Verifica se o recibo pertence à venda
    const { data: recibo, error: reciboError } = await client
      .from('vendas_recibos')
      .select('id')
      .eq('id', reciboId)
      .eq('venda_id', vendaId)
      .maybeSingle();
    if (reciboError) throw reciboError;
    if (!recibo) {
      return new Response('Recibo nao encontrado.', { status: 404 });
    }

    const { data: updated, error: updateError } = await client
      .from('vendas_recibos')
      .update({
        numero_recibo: numeroRecibo,
        numero_recibo_normalizado: normalizeRecibo(numeroRecibo)
      })
      .eq('id', reciboId)
      .select('id, numero_recibo, numero_recibo_normalizado')
      .maybeSingle();

    if (updateError) throw updateError;

    return json({ ok: true, recibo: updated });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao editar recibo.');
  }
}
