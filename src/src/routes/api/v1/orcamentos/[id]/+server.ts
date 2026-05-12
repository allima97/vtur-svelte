import { json } from '@sveltejs/kit';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import { invalidateQuoteReadModels } from '$lib/server/readModelCache';
import { isQuoteCreatorAllowed, resolveQuoteCreatorScope } from '$lib/server/orcamentos';

const QUOTE_SELECT_FIELDS =
  'id, created_at, updated_at, created_by, client_id, client_name, client_whatsapp, client_email, status, status_negociacao, currency, total, data_embarque, data_final, last_interaction_at, last_interaction_notes';

const QUOTE_ITEM_SELECT_FIELDS =
  'id, quote_id, item_type, title, product_name, city_name, cidade_id, quantity, unit_price, total_amount, taxes_amount, start_date, end_date, currency, confidence, raw, order_index, created_at, updated_at';

const MAX_ORCAMENTO_UPDATE_BODY_BYTES = 256 * 1024;
const errorResponse = (message: string, status: number) =>
  json({ error: message }, { status, headers: NO_STORE_HEADERS });

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Orcamentos'], 1, 'Sem acesso a Orcamentos.');
    }
    if (!isUuid(id)) return errorResponse('ID invalido.', 400);

    const quoteScope = await resolveQuoteCreatorScope(client, scope, {
      companyId: event.url.searchParams.get('company_id') || event.url.searchParams.get('empresa_id'),
      vendedorRaw: event.url.searchParams.get('vendedor_id')
    });

    const { data: quote, error: quoteError } = await client
      .from('quote')
      .select(QUOTE_SELECT_FIELDS)
      .eq('id', id)
      .maybeSingle();
    if (quoteError) throw quoteError;
    if (!quote || !isQuoteCreatorAllowed(quoteScope, quote.created_by)) {
      return errorResponse('Orcamento nao encontrado.', 404);
    }

    // As 3 queries são completamente independentes entre si — executar em paralelo.
    const [
      { data: items },
      clienteResult,
      vendedorResult
    ] = await Promise.all([
      client
        .from('quote_item')
        .select(QUOTE_ITEM_SELECT_FIELDS)
        .eq('quote_id', id)
        .order('order_index', { ascending: true }),
      quote.client_id
        ? client.from('clientes').select('id, nome, email, telefone').eq('id', quote.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      quote.created_by
        ? client.from('users').select('nome_completo').eq('id', quote.created_by).maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    const cliente = clienteResult.data ?? null;
    const vendedor = vendedorResult.data?.nome_completo || 'Equipe VTUR';

    return json({
      id: quote.id,
      codigo: `ORC-${quote.id.slice(0, 8).toUpperCase()}`,
      status: quote.status_negociacao || quote.status || 'pendente',
      status_negociacao: quote.status_negociacao,
      total: quote.total,
      currency: quote.currency || 'BRL',
      client_id: quote.client_id,
      cliente: cliente || { nome: quote.client_name || 'Cliente manual' },
      client_name: quote.client_name || cliente?.nome || null,
      client_whatsapp: quote.client_whatsapp || null,
      client_email: quote.client_email || cliente?.email || null,
      cliente_email: quote.client_email || cliente?.email,
      created_at: quote.created_at,
      updated_at: quote.updated_at,
      data_criacao: quote.created_at?.slice(0, 10),
      data_embarque: quote.data_embarque || null,
      data_final: quote.data_final || null,
      last_interaction_at: quote.last_interaction_at || null,
      last_interaction_notes: quote.last_interaction_notes || null,
      vendedor,
      itens: items || []
    }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar orcamento.');
  }
}

export async function PATCH(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_ORCAMENTO_UPDATE_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Orcamentos'], 2, 'Sem permissao para editar orcamentos.');
    }
    if (!isUuid(id)) return errorResponse('ID invalido.', 400);

    const quoteScope = await resolveQuoteCreatorScope(client, scope, {
      companyId: event.url.searchParams.get('company_id') || event.url.searchParams.get('empresa_id'),
      vendedorRaw: event.url.searchParams.get('vendedor_id')
    });

    const { data: existingQuote, error: existingError } = await client
      .from('quote')
      .select('id, created_by')
      .eq('id', id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existingQuote || !isQuoteCreatorAllowed(quoteScope, existingQuote.created_by)) {
      return errorResponse('Orcamento nao encontrado.', 404);
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) updateData.status = body.status;
    if (body.status_negociacao !== undefined) updateData.status_negociacao = body.status_negociacao;
    if (body.total !== undefined) updateData.total = body.total;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.client_id !== undefined) {
      const nextClientId = String(body.client_id || '').trim();
      if (nextClientId && !isUuid(nextClientId)) {
        return errorResponse('Cliente invalido.', 400);
      }
      if (nextClientId) {
        const { data: cliente, error: clienteErr } = await client
          .from('clientes')
          .select('id, company_id')
          .eq('id', nextClientId)
          .maybeSingle();
        if (clienteErr) throw clienteErr;
        if (!cliente?.id) return errorResponse('Cliente nao encontrado.', 404);
        const clienteCompanyId = String((cliente as any).company_id || '').trim();
        if (!scope.isAdmin && clienteCompanyId && !scope.companyIds.includes(clienteCompanyId)) {
          return errorResponse('Cliente fora do seu escopo.', 403);
        }
      }
      updateData.client_id = nextClientId || null;
    }
    if (body.client_name !== undefined || body.cliente_nome !== undefined) {
      updateData.client_name = String(body.client_name ?? body.cliente_nome ?? '').trim() || null;
    }
    if (body.client_whatsapp !== undefined || body.cliente_telefone !== undefined) {
      updateData.client_whatsapp = String(body.client_whatsapp ?? body.cliente_telefone ?? '').trim() || null;
    }
    if (body.client_email !== undefined) updateData.client_email = String(body.client_email || '').trim() || null;
    if (body.data_embarque !== undefined) updateData.data_embarque = body.data_embarque;
    if (body.data_final !== undefined) updateData.data_final = body.data_final;

    const { data, error } = await client
      .from('quote')
      .update(updateData)
      .eq('id', id)
      .select(QUOTE_SELECT_FIELDS)
      .single();
    if (error) throw error;

    if (body.itens && Array.isArray(body.itens)) {
      await client.from('quote_item').delete().eq('quote_id', id);
      const itensParaInserir = body.itens.map((item: any, index: number) => ({
        quote_id: id,
        title: item.title || '',
        product_name: item.product_name || null,
        item_type: item.item_type || 'servico',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total_amount: item.total_amount || 0,
        city_name: item.city_name || null,
        order_index: index
      }));
      await client.from('quote_item').insert(itensParaInserir);
    }

    invalidateQuoteReadModels({
      companyIds: quoteScope.companyIds,
      vendedorIds: quoteScope.creatorIds.length > 0 ? quoteScope.creatorIds : [user.id],
      userId: user.id
    });

    return json({ success: true, data }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar orcamento.');
  }
}

export async function DELETE(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Orcamentos'], 3, 'Sem permissao para excluir orcamentos.');
    }
    if (!isUuid(id)) return errorResponse('ID invalido.', 400);

    const quoteScope = await resolveQuoteCreatorScope(client, scope, {
      companyId: event.url.searchParams.get('company_id') || event.url.searchParams.get('empresa_id')
    });

    const { data: existingQuote, error: existingError } = await client
      .from('quote')
      .select('id, created_by')
      .eq('id', id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existingQuote || !isQuoteCreatorAllowed(quoteScope, existingQuote.created_by)) {
      return errorResponse('Orcamento nao encontrado.', 404);
    }

    await client.from('quote_item').delete().eq('quote_id', id);

    const { error } = await client.from('quote').delete().eq('id', id);
    if (error) throw error;

    invalidateQuoteReadModels({
      companyIds: quoteScope.companyIds,
      vendedorIds: quoteScope.creatorIds.length > 0 ? quoteScope.creatorIds : [user.id],
      userId: user.id
    });

    return json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir orcamento.');
  }
}
