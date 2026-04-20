import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function isMissingPercursoColumn(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "");
  return code === "42703" || /percurso/i.test(msg) && /does not exist|nao existe|não existe|unknown column|column/i.test(msg);
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureModuloAccess(scope, ["orcamentos", "vendas"], 1, "Sem acesso a Roteiros.");
    const q = event.url.searchParams.get("q") || "";
    const cidade = event.url.searchParams.get("cidade") || "";
    const companyId = scope.companyId;
    const runQuery = async (withPercurso) => {
      let query = client.from("roteiro_dia").select(
        withPercurso ? "id, percurso, cidade, descricao, data, roteiro_id" : "id, cidade, descricao, data, roteiro_id"
      ).order("created_at", { ascending: false }).limit(20);
      if (companyId) {
        query = query.eq("company_id", companyId);
      } else {
        query = query.eq("created_by", user.id);
      }
      if (cidade) {
        query = query.ilike("cidade", `%${cidade}%`);
      }
      if (q) {
        if (withPercurso) {
          query = query.or(`descricao.ilike.%${q}%,percurso.ilike.%${q}%`);
        } else {
          query = query.ilike("descricao", `%${q}%`);
        }
      }
      return await query;
    };
    let data = null;
    let fetchError = null;
    const res1 = await runQuery(true);
    data = res1.data;
    fetchError = res1.error;
    if (fetchError && isMissingPercursoColumn(fetchError)) {
      const res2 = await runQuery(false);
      data = res2.data;
      fetchError = res2.error;
    }
    if (fetchError) throw fetchError;
    return json({ dias: data || [] });
  } catch (err) {
    return toErrorResponse(err, "Erro ao buscar dias.");
  }
}
export {
  GET
};
