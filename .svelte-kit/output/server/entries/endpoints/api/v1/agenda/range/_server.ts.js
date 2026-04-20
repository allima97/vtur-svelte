import { json } from "@sveltejs/kit";
import { e as ensureAgendaAccess, b as buildAgendaRangeParams, i as isIsoDate, a as buildAgendaOverlapFilter, m as mapAgendaRowToEvent, p as parseDateToUTC, s as safeISODate } from "../../../../../../chunks/agenda.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureAgendaAccess(scope, 1, "Sem acesso a Agenda.");
    const { inicio, fim } = buildAgendaRangeParams(event.url.searchParams);
    if (!isIsoDate(inicio) || !isIsoDate(fim)) {
      return json({ error: "inicio e fim devem estar no formato YYYY-MM-DD." }, { status: 400 });
    }
    const overlapFilter = buildAgendaOverlapFilter(inicio, fim);
    const { data, error } = await client.from("agenda_itens").select("id, titulo, descricao, start_date, end_date, start_at, end_at, all_day").eq("tipo", "evento").eq("user_id", user.id).or(overlapFilter).order("start_date", { ascending: true });
    if (error) throw error;
    const items = (data || []).map(mapAgendaRowToEvent).filter(Boolean);
    const birthdayCompanyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get("company_id"));
    const birthdayCompanyId = birthdayCompanyIds[0] || scope.companyId || null;
    if (!scope.usoIndividual && birthdayCompanyId) {
      try {
        const { data: birthdayUsers, error: birthdayError } = await client.from("users").select("id, nome_completo, data_nascimento, active, uso_individual").eq("company_id", birthdayCompanyId).or("active.is.null,active.eq.true").or("uso_individual.is.null,uso_individual.eq.false").not("data_nascimento", "is", null).order("nome_completo", { ascending: true }).limit(5e3);
        if (birthdayError) throw birthdayError;
        const startYear = Number(inicio.slice(0, 4));
        const endYear = Number(fim.slice(0, 4));
        (birthdayUsers || []).forEach((row) => {
          const userId = String(row?.id || "").trim();
          const nome = String(row?.nome_completo || "").trim() || "(Sem nome)";
          const nascimento = String(row?.data_nascimento || "").trim();
          if (!userId || !nascimento) return;
          const parsed = parseDateToUTC(nascimento);
          if (Number.isNaN(parsed.getTime())) return;
          const month = parsed.getUTCMonth() + 1;
          const day = parsed.getUTCDate();
          for (let year = startYear; year <= endYear; year += 1) {
            const iso = safeISODate(year, month, day);
            if (iso < inicio || iso > fim) continue;
            items.push({
              id: `birthday:${userId}:${iso}`,
              title: `Aniversario: ${nome}`,
              start: iso,
              end: null,
              descricao: "Aniversario",
              allDay: true,
              source: "birthday"
            });
          }
        });
      } catch (birthdayErr) {
        console.warn("[agenda/range] Falha ao carregar aniversarios:", birthdayErr);
      }
    }
    items.sort((a, b) => String(a.start).localeCompare(String(b.start)));
    return json({
      inicio,
      fim,
      items
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar agenda.");
  }
}
export {
  GET
};
