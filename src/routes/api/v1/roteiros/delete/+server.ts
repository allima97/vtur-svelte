import { json, type RequestEvent } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  ensureModuloAccess,
  toErrorResponse,
  isUuid
} from '$lib/server/v1';

function applyRoteiroScope<T>(query: T, scope: { isAdmin?: boolean; isGestor?: boolean; isMaster?: boolean; userId?: string | null; companyId?: string | null }) {
  if (!scope.isAdmin && !scope.isGestor && !scope.isMaster) {
    return (query as any).eq('created_by', scope.userId);
  }

  if (scope.companyId && !scope.isAdmin && !scope.isMaster) {
    return (query as any).eq('company_id', scope.companyId);
  }

  return query;
}

export async function DELETE(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['Orcamentos'], 4, 'Sem acesso para excluir Roteiros.');

    const id = event.url.searchParams.get('id') || '';
    if (!id || !isUuid(id)) return new Response('ID invalido.', { status: 400 });

    // Verifica ownership
    const { data: roteiro, error: findErr } = await applyRoteiroScope(
      client.from('roteiro_personalizado').select('id').eq('id', id).maybeSingle(),
      scope
    );

    if (findErr) throw findErr;
    if (!roteiro) return new Response('Roteiro nao encontrado.', { status: 404 });

    const { error } = await client
      .from('roteiro_personalizado')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir roteiro.');
  }
}
