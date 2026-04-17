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

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['orcamentos', 'vendas'], 2, 'Sem permissao para registrar interacoes.');
    }

    const quoteId = String(event.url.searchParams.get('quote_id') || '').trim();
    if (!quoteId || !isUuid(quoteId)) {
      return json({ error: 'Quote ID invalido.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, null);
    const vendedorIds = await resolveScopedVendedorIds(client, scope, null);

    // ✅ Verifica ownership
    let checkQuery = client.from('quote').select('id').eq('id', quoteId);
    if (companyIds.length > 0) checkQuery = checkQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) checkQuery = checkQuery.in('created_by', vendedorIds);
    const { data: quote } = await checkQuery.maybeSingle();
    if (!quote) return json({ error: 'Orcamento nao encontrado.' }, { status: 404 });

    const body = await event.request.json().catch(() => ({}));
    const updateData: Record<string, any> = {
      last_interaction_at: new Date().toISOString(),
      last_interaction_notes: body.observacoes || body.notas || null,
      updated_at: new Date().toISOString()
    };
    if (body.status) updateData.status_negociacao = body.status;

    let updateQuery = client
      .from('quote')
      .update(updateData)
      .eq('id', quoteId);
    if (companyIds.length > 0) updateQuery = updateQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) updateQuery = updateQuery.in('created_by', vendedorIds);

    const { data, error } = await updateQuery
      .select('id, status_negociacao, last_interaction_at, last_interaction_notes')
      .single();
    if (error) throw error;

    return json({ success: true, interacao: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao registrar interacao.');
  }
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['orcamentos', 'vendas'], 1, 'Sem acesso a interacoes.');
    }

    const quoteId = String(event.url.searchParams.get('quote_id') || '').trim();
    if (!quoteId || !isUuid(quoteId)) {
      return json({ error: 'Quote ID invalido.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, null);
    const vendedorIds = await resolveScopedVendedorIds(client, scope, null);

    let query = client
      .from('quote')
      .select('id, status_negociacao, last_interaction_at, last_interaction_notes, updated_at')
      .eq('id', quoteId);
    if (companyIds.length > 0) query = query.in('company_id', companyIds);
    if (vendedorIds.length > 0) query = query.in('created_by', vendedorIds);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;

    const interacoes = data?.last_interaction_at ? [{
      id: data.id,
      quote_id: quoteId,
      tipo: 'status',
      observacoes: data.last_interaction_notes,
      status: data.status_negociacao,
      created_at: data.last_interaction_at
    }] : [];

    return json({ success: true, interacoes });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar interacoes.');
  }
}
