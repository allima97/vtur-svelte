import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { isQuoteCreatorAllowed, resolveQuoteCreatorScope } from '$lib/server/orcamentos';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        scope.isFinanceiro ? ['Orcamentos'] : ['Vendas'],
        1,
        'Sem acesso ao resumo do orçamento para venda.'
      );
    }
    if (!isUuid(id)) return json({ error: 'ID invalido.' }, { status: 400 });

    const quoteScope = await resolveQuoteCreatorScope(client, scope, {
      companyId: event.url.searchParams.get('company_id') || event.url.searchParams.get('empresa_id'),
      vendedorRaw: event.url.searchParams.get('vendedor_id')
    });

    const { data: quote, error: quoteError } = await client
      .from('quote')
      .select('id, client_id, created_by, status, status_negociacao, last_interaction_notes')
      .eq('id', id)
      .maybeSingle();
    if (quoteError) throw quoteError;
    if (!quote || !isQuoteCreatorAllowed(quoteScope, quote.created_by)) {
      return json({ error: 'Orcamento nao encontrado.' }, { status: 404 });
    }

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
