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

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['orcamentos', 'vendas'], 4, 'Sem acesso para excluir Orcamentos.');
    }

    const body = await event.request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id || !isUuid(id)) {
      return json({ error: 'ID invalido.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, null);
    const vendedorIds = await resolveScopedVendedorIds(client, scope, null);

    // ✅ Verifica ownership antes de deletar
    let checkQuery = client.from('quote').select('id').eq('id', id);
    if (companyIds.length > 0) checkQuery = checkQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) checkQuery = checkQuery.in('vendedor_id', vendedorIds);
    const { data: quote } = await checkQuery.maybeSingle();
    if (!quote) {
      return json({ error: 'Orcamento nao encontrado.' }, { status: 404 });
    }

    let deleteQuery = client.from('quote').delete().eq('id', id);
    if (companyIds.length > 0) deleteQuery = deleteQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) deleteQuery = deleteQuery.in('vendedor_id', vendedorIds);

    const { error } = await deleteQuery;
    if (error) throw error;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir orcamento.');
  }
}
