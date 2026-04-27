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

function applyQuoteScope(query: any, scope: any, user: any, vendedorIds: string[]) {
  if (scope.isAdmin || scope.isMaster) return query;
  if (scope.isGestor && vendedorIds.length > 0) return query.in('created_by', vendedorIds);
  if (scope.isGestor) return query;
  return query.eq('created_by', user.id);
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Vendas'], 1, 'Sem acesso ao resumo do orçamento para venda.');
    }
    if (!isUuid(id)) return json({ error: 'ID invalido.' }, { status: 400 });

    const vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get('vendedor_id'));

    let quoteQuery = client
      .from('quote')
      .select('id, client_id, created_by, status, status_negociacao, last_interaction_notes')
      .eq('id', id);
    quoteQuery = applyQuoteScope(quoteQuery, scope, user, vendedorIds);

    const { data: quote, error: quoteError } = await quoteQuery.maybeSingle();
    if (quoteError) throw quoteError;
    if (!quote) return json({ error: 'Orcamento nao encontrado.' }, { status: 404 });

    let cliente = null;
    if (quote.client_id) {
      const { data: clienteData } = await client
        .from('clientes')
        .select('id, nome, email, telefone')
        .eq('id', quote.client_id)
        .maybeSingle();
      cliente = clienteData;
    }

    return json({
      id: quote.id,
      codigo: `ORC-${quote.id.slice(0, 8).toUpperCase()}`,
      client_id: quote.client_id,
      cliente,
      notes: quote.last_interaction_notes || null,
      observacoes: quote.last_interaction_notes || null,
      status: quote.status,
      status_negociacao: quote.status_negociacao
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar resumo do orçamento.');
  }
}