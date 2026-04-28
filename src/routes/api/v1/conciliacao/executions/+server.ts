import { json } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveScopedCompanyIds, resolveUserScope, toErrorResponse } from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 1, 'Sem acesso à Conciliação.');
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('company_id'));
    const companyId = companyIds[0] || null;
    if (!companyId) return json([]);

    const limit = Math.max(1, Math.min(50, Number(event.url.searchParams.get('limit') || 20)));

    const { data, error } = await client
      .from('conciliacao_execucoes')
      .select('id, company_id, actor, actor_user_id, checked, reconciled, updated_taxes, still_pending, status, error_message, created_at, actor_user:actor_user_id(nome_completo, email)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return json(Array.isArray(data) ? data : [], {
      headers: {
        'Cache-Control': 'private, max-age=5',
        Vary: 'Cookie'
      }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar execucoes da conciliacao.');
  }
}

