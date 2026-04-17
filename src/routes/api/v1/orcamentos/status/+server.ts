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

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['orcamentos', 'vendas'], 2, 'Sem permissao para alterar status.');
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!id || !isUuid(id)) {
      return json({ error: 'ID invalido.' }, { status: 400 });
    }

    const body = await event.request.json().catch(() => ({}));

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get('vendedor_id')
    );

    // ✅ Verifica ownership antes de atualizar
    let checkQuery = client.from('quote').select('id').eq('id', id);
    if (companyIds.length > 0) checkQuery = checkQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) checkQuery = checkQuery.in('vendedor_id', vendedorIds);
    const { data: quote } = await checkQuery.maybeSingle();
    if (!quote) {
      return json({ error: 'Orcamento nao encontrado.' }, { status: 404 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.status_negociacao !== undefined) updateData.status_negociacao = body.status_negociacao;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.observacoes) {
      updateData.last_interaction_notes = body.observacoes;
      updateData.last_interaction_at = new Date().toISOString();
    }

    let updateQuery = client.from('quote').update(updateData).eq('id', id);
    if (companyIds.length > 0) updateQuery = updateQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) updateQuery = updateQuery.in('vendedor_id', vendedorIds);

    const { data, error } = await updateQuery.select().single();
    if (error) throw error;

    return json({ success: true, item: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar status.');
  }
}
