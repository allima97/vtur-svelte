import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const companyId = scope.companyId;
    const tipo = event.url.searchParams.get("tipo") || null;
    const q = event.url.searchParams.get("q") || "";
    let query = client.from("roteiro_sugestoes").select("tipo, valor").order("uso_count", { ascending: false }).limit(200);
    if (companyId) {
      query = query.eq("company_id", companyId);
    } else {
      query = query.is("company_id", null);
    }
    if (tipo) query = query.eq("tipo", tipo);
    if (q) query = query.ilike("valor", `%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    const sugestoes = {};
    (data || []).forEach((row) => {
      if (!sugestoes[row.tipo]) sugestoes[row.tipo] = [];
      sugestoes[row.tipo].push(row.valor);
    });
    return json({ sugestoes });
  } catch (err) {
    return toErrorResponse(err, "Erro ao buscar sugestoes.");
  }
}
export {
  GET
};
