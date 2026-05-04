import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  logServerError,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { invalidateQuoteReadModels } from '$lib/server/readModelCache';
import { rejectCrossOriginRequest, rejectLargePayload } from '$lib/server/requestGuards';

const MAX_ORCAMENTO_CREATE_BODY_BYTES = 512 * 1024;

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const payloadError = rejectLargePayload(event.request, MAX_ORCAMENTO_CREATE_BODY_BYTES);
    if (payloadError) return payloadError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Orcamentos'], 2, 'Sem permissao para criar orcamentos.');
    }

    const body = await event.request.json().catch(() => ({}));

    if (!body.client_id || !isUuid(body.client_id)) {
      return json({ error: 'Cliente valido e obrigatorio.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { data: cliente, error: clienteError } = await client
      .from('clientes')
      .select('id, company_id')
      .eq('id', body.client_id)
      .maybeSingle();
    if (clienteError) throw clienteError;
    if (!cliente?.id) {
      return json({ error: 'Cliente nao encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });
    }
    if (!scope.isAdmin) {
      const clienteCompanyId = String((cliente as any).company_id || '').trim();
      if (clienteCompanyId && !scope.companyIds.includes(clienteCompanyId)) {
        return json({ error: 'Cliente fora do seu escopo.' }, { status: 403, headers: NO_STORE_HEADERS });
      }
    }

    if (!body.itens || !Array.isArray(body.itens) || body.itens.length === 0) {
      return json({ error: 'Adicione pelo menos um item.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    // quote nao tem company_id — usa created_by como FK auth.users
    const total = body.itens.reduce((acc: number, item: any) => {
      const valor = Number(item.total_amount || item.valor_total || 0);
      return acc + valor;
    }, 0);

    const { data: quote, error: quoteError } = await client
      .from('quote')
      .insert({
        client_id: body.client_id,
        status: body.status || 'DRAFT',
        status_negociacao: body.status_negociacao || 'Enviado',
        total: total,
        currency: body.currency || 'BRL',
        created_by: user.id,
        data_embarque: body.data_embarque || null,
        data_final: body.data_final || null,
        last_interaction_notes: body.notes || body.observacoes || null
      })
      .select('id, client_id, status, status_negociacao, total, currency, created_by, data_embarque, data_final, created_at')
      .single();

    if (quoteError) {
      logServerError('[orcamentos/create] erro ao criar quote', quoteError);
      return json({ error: 'Erro ao criar orcamento.' }, { status: 500, headers: NO_STORE_HEADERS });
    }

    const itensParaInserir = body.itens.map((item: any, index: number) => ({
      quote_id: quote.id,
      title: item.title || item.descricao || `Item ${index + 1}`,
      product_name: item.product_name || item.produto || null,
      item_type: item.item_type || 'servico',
      total_amount: Number(item.total_amount || item.valor_total || 0),
      order_index: item.order_index ?? index,
      city_name: item.city_name || item.cidade || null,
      quantity: item.quantity || item.quantidade || 1,
      unit_price: item.unit_price || item.valor_unitario || 0
    }));

    const { error: itemsError } = await client
      .from('quote_item')
      .insert(itensParaInserir);

    if (itemsError) {
      // Desfaz o orcamento para nao deixar registro sem itens
      await client.from('quote').delete().eq('id', quote.id);
      logServerError('[orcamentos/create] erro ao criar itens do quote', itemsError);
      return json({ error: 'Erro ao salvar itens do orcamento.' }, { status: 500, headers: NO_STORE_HEADERS });
    }

    invalidateQuoteReadModels({
      companyIds: scope.companyIds,
      vendedorIds: [user.id],
      userId: user.id
    });

    return json(
      {
        success: true,
        data: {
          id: quote.id,
          codigo: `ORC-${quote.id.slice(0, 8).toUpperCase()}`,
          client_id: quote.client_id,
          total: quote.total,
          status: quote.status,
          created_at: quote.created_at
        }
      },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao criar orcamento.');
  }
}
