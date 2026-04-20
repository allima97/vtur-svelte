import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const { searchParams } = event.url;
    const month = Number(searchParams.get("month") || (/* @__PURE__ */ new Date()).getMonth() + 1);
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("company_id"));
    let query = client.from("users").select("id, nome_completo, email, data_nascimento, company_id, user_types(name), companies:companies!company_id(nome_fantasia)").eq("active", true).not("data_nascimento", "is", null).limit(500);
    if (companyIds.length > 0) query = query.in("company_id", companyIds);
    const { data, error: queryError } = await query;
    if (queryError) throw queryError;
    const hoje = /* @__PURE__ */ new Date();
    const items = (data || []).filter((u) => {
      if (!u.data_nascimento) return false;
      const d = /* @__PURE__ */ new Date(u.data_nascimento + "T00:00:00");
      return d.getMonth() + 1 === month;
    }).map((u) => ({
      id: u.id,
      nome_completo: u.nome_completo,
      email: u.email,
      data_nascimento: u.data_nascimento,
      role: u.user_types?.name || "",
      company_id: u.company_id,
      company_nome: u.companies?.nome_fantasia || null,
      aniversario_hoje: (() => {
        const d = /* @__PURE__ */ new Date(u.data_nascimento + "T00:00:00");
        return d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate();
      })()
    })).sort((a, b) => {
      const da = (/* @__PURE__ */ new Date(a.data_nascimento + "T00:00:00")).getDate();
      const db = (/* @__PURE__ */ new Date(b.data_nascimento + "T00:00:00")).getDate();
      return da - db;
    });
    return json({ items, month });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar aniversariantes de colaboradores.");
  }
}
export {
  GET
};
