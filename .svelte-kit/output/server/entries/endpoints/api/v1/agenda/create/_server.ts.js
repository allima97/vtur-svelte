import { json } from "@sveltejs/kit";
import { e as ensureAgendaAccess, i as isIsoDate } from "../../../../../../chunks/agenda.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, b as resolveScopedCompanyIds, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function normalizePayload(body) {
  const titulo = String(body?.titulo || body?.title || "").trim();
  const startDate = String(body?.start_date || body?.data_inicio || "").trim();
  const endDate = String(body?.end_date || body?.data_fim || startDate).trim() || startDate;
  const startAt = String(body?.start_at || "").trim() || null;
  const endAt = String(body?.end_at || "").trim() || null;
  const allDay = body?.all_day !== void 0 ? Boolean(body.all_day) : body?.allDay !== void 0 ? Boolean(body.allDay) : !startAt;
  return {
    titulo,
    startDate,
    endDate,
    startAt,
    endAt,
    allDay,
    descricao: String(body?.descricao || "").trim() || null
  };
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureAgendaAccess(scope, 2, "Sem permissao para criar eventos.");
    const body = await event.request.json();
    const payload = normalizePayload(body);
    if (!payload.titulo) {
      return json({ error: "titulo obrigatorio." }, { status: 400 });
    }
    if (!isIsoDate(payload.startDate) || !isIsoDate(payload.endDate)) {
      return json({ error: "start_date e end_date devem estar no formato YYYY-MM-DD." }, { status: 400 });
    }
    const scopedCompanyIds = resolveScopedCompanyIds(scope, body?.company_id);
    const companyId = scopedCompanyIds[0] || (isUuid(scope.companyId) ? scope.companyId : null) || (scope.companyIds[0] && isUuid(scope.companyIds[0]) ? scope.companyIds[0] : null);
    const insertData = {
      tipo: "evento",
      titulo: payload.titulo,
      descricao: payload.descricao,
      start_date: payload.startDate,
      end_date: payload.endDate,
      start_at: payload.startAt,
      end_at: payload.endAt,
      all_day: payload.allDay,
      user_id: user.id,
      company_id: companyId
    };
    const { data, error } = await client.from("agenda_itens").insert(insertData).select("id, titulo, descricao, start_date, end_date, start_at, end_at, all_day").single();
    if (error) throw error;
    return json({ ok: true, item: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao criar evento.");
  }
}
export {
  POST
};
