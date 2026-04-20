import { json } from "@sveltejs/kit";
import { e as ensureAgendaAccess, b as buildAgendaRangeParams, a as buildAgendaOverlapFilter, m as mapAgendaRowToEvent } from "../../../../../chunks/agenda.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureAgendaAccess(scope, 1, "Sem acesso a Agenda.");
    const { inicio, fim } = buildAgendaRangeParams(event.url.searchParams);
    let query = client.from("agenda_itens").select("id, titulo, descricao, start_date, end_date, start_at, end_at, all_day").eq("tipo", "evento").eq("user_id", user.id).order("start_date", { ascending: true });
    if (inicio && fim) {
      query = query.or(buildAgendaOverlapFilter(inicio, fim));
    }
    const { data, error } = await query;
    if (error) throw error;
    return json({
      items: (data || []).map(mapAgendaRowToEvent).filter(Boolean)
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar agenda.");
  }
}
export {
  GET
};
