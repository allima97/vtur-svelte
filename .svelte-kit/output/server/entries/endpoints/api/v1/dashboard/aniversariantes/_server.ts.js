import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function isBirthdayInRange(nascimento, diasAfrente = 30) {
  if (!nascimento) return false;
  const hoje = /* @__PURE__ */ new Date();
  const nascDate = /* @__PURE__ */ new Date(nascimento + "T00:00:00");
  if (isNaN(nascDate.getTime())) return false;
  for (let i = 0; i <= diasAfrente; i++) {
    const check = new Date(hoje);
    check.setDate(hoje.getDate() + i);
    if (nascDate.getMonth() === check.getMonth() && nascDate.getDate() === check.getDate()) {
      return true;
    }
  }
  return false;
}
function isToday(nascimento) {
  if (!nascimento) return false;
  const hoje = /* @__PURE__ */ new Date();
  const nascDate = /* @__PURE__ */ new Date(nascimento + "T00:00:00");
  return nascDate.getMonth() === hoje.getMonth() && nascDate.getDate() === hoje.getDate();
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const { searchParams } = event.url;
    const diasAfrente = Math.min(90, Math.max(1, Number(searchParams.get("dias") || 30)));
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("company_id"));
    let clientesQuery = client.from("clientes").select("id, nome, nascimento, telefone, whatsapp, email").not("nascimento", "is", null).limit(2e3);
    if (companyIds.length > 0) clientesQuery = clientesQuery.in("company_id", companyIds);
    const { data: clientes } = await clientesQuery;
    const aniversariantes = (clientes || []).filter((c) => isBirthdayInRange(c.nascimento, diasAfrente)).map((c) => ({
      id: c.id,
      nome: c.nome,
      nascimento: c.nascimento,
      telefone: c.telefone,
      whatsapp: c.whatsapp,
      email: c.email,
      aniversario_hoje: isToday(c.nascimento),
      pessoa_tipo: "cliente"
    })).sort((a, b) => {
      const hoje = /* @__PURE__ */ new Date();
      const getNextBirthday = (nascimento) => {
        const d = /* @__PURE__ */ new Date(nascimento + "T00:00:00");
        const next = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
        if (next < hoje) next.setFullYear(hoje.getFullYear() + 1);
        return next.getTime();
      };
      return getNextBirthday(a.nascimento) - getNextBirthday(b.nascimento);
    });
    return json({
      items: aniversariantes,
      hoje: aniversariantes.filter((a) => a.aniversario_hoje).length,
      proximos: aniversariantes.length
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar aniversariantes.");
  }
}
export {
  GET
};
