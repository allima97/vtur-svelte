import { json, type RequestEvent } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  ensureModuloAccess,
  toErrorResponse
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

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['Orcamentos'], 1, 'Sem acesso a Roteiros.');

    const { data, error } = await applyRoteiroScope(
      client
      .from('roteiro_personalizado')
      .select('id, nome, duracao, inicio_cidade, fim_cidade, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200),
      scope
    );

    if (error) throw error;

    return json({ roteiros: data || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar roteiros.');
  }
}
