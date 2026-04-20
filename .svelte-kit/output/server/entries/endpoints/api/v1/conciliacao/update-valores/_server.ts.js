import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
const ALLOWED_FIELDS = [
  "valor_lancamentos",
  "valor_taxas",
  "valor_descontos",
  "valor_abatimentos",
  "valor_calculada_loja",
  "valor_visao_master",
  "valor_opfax",
  "valor_saldo",
  "valor_nao_comissionavel"
];
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && scope.papel !== "GESTOR" && scope.papel !== "MASTER") {
      return json(
        { error: "Sem permissão. Apenas Gestor ou Master podem editar valores." },
        { status: 403 }
      );
    }
    const body = await event.request.json().catch(() => null);
    const requestedCompanyId = String(body?.companyId || "").trim();
    const companyId = scope.isAdmin ? isUuid(requestedCompanyId) ? requestedCompanyId : null : scope.companyId;
    if (!companyId) {
      return json({ error: "Company inválida." }, { status: 400 });
    }
    const conciliacaoId = String(body?.conciliacaoId || "").trim();
    if (!isUuid(conciliacaoId)) {
      return json({ error: "Registro de conciliação inválido." }, { status: 400 });
    }
    const valores = body?.valores;
    if (!valores || typeof valores !== "object") {
      return json({ error: "Nenhum valor fornecido para atualizar." }, { status: 400 });
    }
    const updatePayload = {};
    for (const field of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(valores, field)) {
        const raw = valores[field];
        if (raw === null || raw === void 0) {
          updatePayload[field] = null;
        } else {
          const num = Number(raw);
          if (!Number.isFinite(num)) {
            return json({ error: `Valor inválido para o campo ${field}.` }, { status: 400 });
          }
          updatePayload[field] = num;
        }
      }
    }
    if (Object.keys(updatePayload).length === 0) {
      return json({ error: "Nenhum campo editável encontrado no payload." }, { status: 400 });
    }
    const { data: existing, error: existErr } = await client.from("conciliacao_recibos").select("id, company_id").eq("id", conciliacaoId).eq("company_id", companyId).maybeSingle();
    if (existErr) throw existErr;
    if (!existing) {
      return json({ error: "Registro não encontrado ou sem permissão." }, { status: 404 });
    }
    const { data: updated, error: updateErr } = await client.from("conciliacao_recibos").update({ ...updatePayload, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", conciliacaoId).eq("company_id", companyId).select().maybeSingle();
    if (updateErr) throw updateErr;
    return json({ ok: true, item: updated });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar valores da conciliação.");
  }
}
export {
  POST
};
