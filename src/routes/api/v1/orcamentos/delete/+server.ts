import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { invalidateQuoteReadModels } from '$lib/server/readModelCache';

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Orcamentos'], 4, 'Sem acesso para excluir Orcamentos.');
    }

    const body = await event.request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id || !isUuid(id)) {
      return json({ error: 'ID invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const vendedorIds = await resolveScopedVendedorIds(client, scope, null);

    // ✅ Verifica ownership antes de deletar
    // quote usa created_by (FK auth.users) — sem company_id nem vendedor_id
    let checkQuery = client.from('quote').select('id').eq('id', id);
    if (!scope.isAdmin && !scope.isGestor && !scope.isMaster) {
      checkQuery = checkQuery.eq('created_by', user.id);
    } else if (vendedorIds.length > 0) {
      checkQuery = checkQuery.in('created_by', vendedorIds);
    }
    const { data: quote } = await checkQuery.maybeSingle();
    if (!quote) {
      return json({ error: 'Orcamento nao encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    let deleteQuery = client.from('quote').delete().eq('id', id);
    if (!scope.isAdmin && !scope.isGestor && !scope.isMaster) {
      deleteQuery = deleteQuery.eq('created_by', user.id);
    } else if (vendedorIds.length > 0) {
      deleteQuery = deleteQuery.in('created_by', vendedorIds);
    }

    const { error } = await deleteQuery;
    if (error) throw error;

    invalidateQuoteReadModels({
      companyIds: scope.companyIds,
      vendedorIds: vendedorIds.length > 0 ? vendedorIds : [user.id],
      userId: user.id
    });

    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir orcamento.');
  }
}
