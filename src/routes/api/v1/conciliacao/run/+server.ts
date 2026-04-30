import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { reconcilePendentes, diagnosticarLacunasCronologicas } from '$lib/server/conciliacaoReconcile';

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

    // Executa a reconciliação e o diagnóstico cronológico em paralelo
    const [result, diagnostico] = await Promise.all([
      reconcilePendentes({
        client,
        companyId,
        limit,
        conciliacaoReciboId,
        onlyCurrentMonth: !isTargeted,
        recalculateMonth,
        recalculateAllMonth,
        actor: 'user',
        actorUserId: user.id
      }),
      // Só inclui diagnóstico quando não é reconciliação por ID específico
      !conciliacaoReciboId
        ? diagnosticarLacunasCronologicas({ client, companyId })
        : Promise.resolve(null)
    ]);

    // Inclui alerta de bloqueio cronológico na resposta quando há lacunas
    const bloqueio = diagnostico && diagnostico.diasFaltantes.length > 0
      ? {
          fronteira_cronologica: diagnostico.fronteira,
          dias_faltantes: diagnostico.diasFaltantes,
          dias_bloqueados: diagnostico.diasBloqueados,
          registros_bloqueados: diagnostico.registrosBloqueados,
          aviso: `Conciliação bloqueada a partir de ${diagnostico.fronteira}. ` +
            `Faltam os arquivos dos dias: ${diagnostico.diasFaltantes.map(d => {
              const [y, m, dia] = d.split('-');
              return `${dia}/${m}/${y}`;
            }).join(', ')}. ` +
            `Importe esses arquivos para liberar ${diagnostico.registrosBloqueados} registro(s) bloqueado(s).`
        }
      : null;

    return json({ ok: true, ...result, ...(bloqueio ? { bloqueio } : {}) });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao executar conciliação.');
  }
}
