import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { reconcilePendentes } from '$lib/server/conciliacaoReconcile';

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 3, 'Sem permissão para executar conciliação.');
    }

    const body = await event.request.json().catch(() => ({}));
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;

    if (!companyId) return json({ error: 'Empresa não identificada.' }, { status: 400 });

    const limit = Math.max(1, Math.min(500, Number(body?.limit || 200)));
    const conciliacaoReciboId = String(body?.conciliacaoReciboId || '').trim() || null;
    const recalculateMonth = String(body?.recalculateMonth || '').trim() || null;
    const recalculateAllMonth = Boolean(body?.recalculateAllMonth);
    const isTargeted = Boolean(conciliacaoReciboId || recalculateAllMonth);

    const result = await reconcilePendentes({
      client,
      companyId,
      limit,
      conciliacaoReciboId,
      onlyCurrentMonth: !isTargeted,
      recalculateMonth,
      recalculateAllMonth,
      actor: 'user',
      actorUserId: user.id
    });

    return json({ ok: true, ...result });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao executar conciliação.');
  }
}
