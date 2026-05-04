import { json } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyId,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import {
  reconcilePendentes,
  diagnosticarLacunasCronologicas,
} from "$lib/server/conciliacaoReconcile";
import { NO_STORE_HEADERS } from "$lib/server/httpCache";
import { rejectCrossOriginRequest, rejectLargePayload } from "$lib/server/requestGuards";
import { invalidateSalesReadModels } from "$lib/server/readModelCache";

const MAX_CONCILIACAO_RUN_BODY_BYTES = 32 * 1024;

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const payloadError = rejectLargePayload(event.request, MAX_CONCILIACAO_RUN_BODY_BYTES);
    if (payloadError) return payloadError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isFinanceiro && !scope.isGestor) {
      ensureModuloAccess(
        scope,
        ["operacao_conciliacao", "conciliacao"],
        3,
        "Sem permissão para executar conciliação.",
      );
    }

    const body = await event.request.json().catch(() => ({}));
    const companyId = resolveScopedCompanyId(scope, body?.companyId);

    if (!companyId)
      return json(
        { error: "Selecione uma empresa para executar a conciliação." },
        { status: 400, headers: NO_STORE_HEADERS },
      );

    const limit = Math.max(1, Math.min(500, Number(body?.limit || 200)));
    const conciliacaoReciboId =
      String(body?.conciliacaoReciboId || "").trim() || null;
    const recalculateMonth =
      String(body?.recalculateMonth || "").trim() || null;
    const recalculateAllMonth = Boolean(body?.recalculateAllMonth);
    const cleanupDuplicatesOnly = Boolean(body?.cleanupDuplicatesOnly);
    const isTargeted = Boolean(
      conciliacaoReciboId || recalculateAllMonth || cleanupDuplicatesOnly,
    );

    const result = await reconcilePendentes({
      client,
      companyId,
      limit,
      conciliacaoReciboId,
      onlyCurrentMonth: !isTargeted,
      recalculateMonth,
      recalculateAllMonth,
      cleanupDuplicatesOnly,
      actor: "user",
      actorUserId: user.id,
    });

    // O diagnóstico cronológico é útil para a conciliação normal, mas é pesado.
    // Não roda junto com recálculo/saneamento para evitar timeout no Worker.
    const diagnostico =
      !conciliacaoReciboId && !recalculateAllMonth && !cleanupDuplicatesOnly
        ? await diagnosticarLacunasCronologicas({ client, companyId })
        : null;

    // Inclui alerta de bloqueio cronológico na resposta quando há lacunas
    const bloqueio =
      diagnostico && diagnostico.diasFaltantes.length > 0
        ? {
            fronteira_cronologica: diagnostico.fronteira,
            dias_faltantes: diagnostico.diasFaltantes,
            dias_bloqueados: diagnostico.diasBloqueados,
            dias_sem_movimento: diagnostico.diasSemMovimento,
            registros_bloqueados: diagnostico.registrosBloqueados,
            aviso:
              `Conciliação bloqueada a partir de ${diagnostico.fronteira}. ` +
              `Faltam os arquivos dos dias: ${diagnostico.diasFaltantes
                .map((d) => {
                  const [y, m, dia] = d.split("-");
                  return `${dia}/${m}/${y}`;
                })
                .join(", ")}. ` +
              `Importe esses arquivos para liberar ${diagnostico.registrosBloqueados} registro(s) bloqueado(s).`,
          }
        : null;

    invalidateSalesReadModels({ companyIds: [companyId], userId: user.id });

    return json({ ok: true, ...result, ...(bloqueio ? { bloqueio } : {}) }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao executar conciliação.");
  }
}
