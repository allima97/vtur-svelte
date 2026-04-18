import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

// quote nao tem company_id — scoping usa created_by (FK auth.users)
function applyQuoteScope(query: any, scope: any, user: any, vendedorIds: string[]) {
  if (scope.isAdmin || scope.isMaster) return query;
  if (scope.isGestor && vendedorIds.length > 0) return query.in('created_by', vendedorIds);
  if (scope.isGestor) return query; // gestor ve todos da sua empresa (sem filtro de company em quote)
  return query.eq('created_by', user.id); // vendedor ve apenas os seus
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['orcamentos', 'vendas'], 1, 'Sem acesso a Orcamentos.');
    }
    if (!isUuid(id)) return json({ error: 'ID invalido.' }, { status: 400 });

    const vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get('vendedor_id'));

    let quoteQuery = client.from('quote').select('*').eq('id', id);
    quoteQuery = applyQuoteScope(quoteQuery, scope, user, vendedorIds);

    const { data: quote, error: quoteError } = await quoteQuery.maybeSingle();
    if (quoteError) throw quoteError;
    if (!quote) return json({ error: 'Orcamento nao encontrado.' }, { status: 404 });

    const { data: items } = await client
      .from('quote_item')
      .select('*')
      .eq('quote_id', id)
      .order('order_index', { ascending: true });

    let cliente = null;
    if (quote.client_id) {
      const { data: clienteData } = await client
        .from('clientes')
        .select('id, nome, email, telefone')
        .eq('id', quote.client_id)
        .maybeSingle();
      cliente = clienteData;
    }

    let vendedor = 'Equipe VTUR';
    if (quote.created_by) {
      const { data: vendedorData } = await client
        .from('users')
        .select('nome_completo')
        .eq('id', quote.created_by)
        .maybeSingle();
      vendedor = vendedorData?.nome_completo || 'Equipe VTUR';
    }

    return json({
      id: quote.id,
      codigo: `ORC-${quote.id.slice(0, 8).toUpperCase()}`,
      status: quote.status_negociacao || quote.status || 'pendente',
      status_negociacao: quote.status_negociacao,
      total: quote.total,
      currency: quote.currency || 'BRL',
      client_id: quote.client_id,
      cliente: cliente || { nome: 'Cliente nao encontrado' },
      cliente_email: cliente?.email,
      created_at: quote.created_at,
      updated_at: quote.updated_at,
      data_criacao: quote.created_at?.slice(0, 10),
      data_embarque: quote.data_embarque || null,
      data_final: quote.data_final || null,
      last_interaction_at: quote.last_interaction_at || null,
      last_interaction_notes: quote.last_interaction_notes || null,
      vendedor,
      itens: items || []
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar orcamento.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['orcamentos', 'vendas'], 2, 'Sem permissao para editar orcamentos.');
    }
    if (!isUuid(id)) return json({ error: 'ID invalido.' }, { status: 400 });

    const vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get('vendedor_id'));

    // Confirma ownership
    let checkQuery = client.from('quote').select('id').eq('id', id);
    checkQuery = applyQuoteScope(checkQuery, scope, user, vendedorIds);
    const { data: existingQuote } = await checkQuery.maybeSingle();
    if (!existingQuote) return json({ error: 'Orcamento nao encontrado.' }, { status: 404 });

    const body = await event.request.json().catch(() => ({}));
    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) updateData.status = body.status;
    if (body.status_negociacao !== undefined) updateData.status_negociacao = body.status_negociacao;
    if (body.total !== undefined) updateData.total = body.total;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.client_id !== undefined) updateData.client_id = body.client_id;
    if (body.data_embarque !== undefined) updateData.data_embarque = body.data_embarque;
    if (body.data_final !== undefined) updateData.data_final = body.data_final;

    let updateQuery = client.from('quote').update(updateData).eq('id', id);
    updateQuery = applyQuoteScope(updateQuery, scope, user, vendedorIds);

    const { data, error } = await updateQuery.select().single();
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

    return json({ success: true, data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar orcamento.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['orcamentos', 'vendas'], 3, 'Sem permissao para excluir orcamentos.');
    }
    if (!isUuid(id)) return json({ error: 'ID invalido.' }, { status: 400 });

    const vendedorIds = await resolveScopedVendedorIds(client, scope, null);

    // Confirma ownership antes de deletar
    let checkQuery = client.from('quote').select('id').eq('id', id);
    checkQuery = applyQuoteScope(checkQuery, scope, user, vendedorIds);
    const { data: existingQuote } = await checkQuery.maybeSingle();
    if (!existingQuote) return json({ error: 'Orcamento nao encontrado.' }, { status: 404 });

    await client.from('quote_item').delete().eq('quote_id', id);

    let deleteQuery = client.from('quote').delete().eq('id', id);
    deleteQuery = applyQuoteScope(deleteQuery, scope, user, vendedorIds);
    const { error } = await deleteQuery;
    if (error) throw error;

    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir orcamento.');
  }
}
