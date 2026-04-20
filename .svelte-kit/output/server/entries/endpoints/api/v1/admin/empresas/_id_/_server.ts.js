import { json } from "@sveltejs/kit";
import { g as ensureCanManageCompanies, h as getAccessibleCompanyIds } from "../../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const companyId = String(event.params.id || "").trim();
    ensureCanManageCompanies(scope);
    if (!scope.isAdmin && !getAccessibleCompanyIds(scope).includes(companyId)) {
      return new Response("Empresa fora do escopo permitido.", { status: 403 });
    }
    const { data: companyRow, error: companyError } = await client.from("companies").select("id, nome_empresa, nome_fantasia, cnpj, telefone, endereco, cidade, estado, active").eq("id", companyId).maybeSingle();
    if (companyError || !companyRow) {
      return new Response("Empresa nao encontrada.", { status: 404 });
    }
    let billing = null;
    let plans = [];
    try {
      const [billingRes, plansRes] = await Promise.all([
        client.from("company_billing").select("id, status, plan_id, valor_mensal, ultimo_pagamento, proximo_vencimento").eq("company_id", companyId).maybeSingle(),
        client.from("plans").select("id, nome, ativo").order("nome", { ascending: true })
      ]);
      if (!billingRes.error) billing = billingRes.data || null;
      if (!plansRes.error) plans = plansRes.data || [];
    } catch {
      billing = null;
      plans = [];
    }
    const [linksRes, mastersRes] = await Promise.all([
      client.from("master_empresas").select("id, master_id, company_id, status, created_at, approved_at").eq("company_id", companyId).order("created_at", { ascending: false }),
      client.from("users").select("id, nome_completo, email, user_types(name)").order("nome_completo", { ascending: true })
    ]);
    if (linksRes.error) throw linksRes.error;
    if (mastersRes.error) throw mastersRes.error;
    const masterRows = (mastersRes.data || []).filter(
      (row) => String(Array.isArray(row.user_types) ? row.user_types[0]?.name || "" : row.user_types?.name || "").toUpperCase().includes("MASTER")
    );
    const mastersMap = new Map(
      masterRows.map((row) => [
        String(row.id),
        {
          id: row.id,
          nome_completo: row.nome_completo || row.email || "Usuario sem nome",
          email: row.email || null
        }
      ])
    );
    return json({
      empresa: companyRow,
      billing,
      plans,
      master_links: (linksRes.data || []).map((row) => ({
        ...row,
        master: mastersMap.get(String(row.master_id)) || null
      })),
      masters_disponiveis: Array.from(mastersMap.values())
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar detalhe da empresa.");
  }
}
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const companyId = String(event.params.id || "").trim();
    ensureCanManageCompanies(scope);
    if (!scope.isAdmin && !getAccessibleCompanyIds(scope).includes(companyId)) {
      return json({ error: "Empresa fora do escopo permitido." }, { status: 403 });
    }
    const body = await event.request.json();
    const ALLOWED = [
      "nome_empresa",
      "nome_fantasia",
      "cnpj",
      "telefone",
      "endereco",
      "cidade",
      "estado",
      "active"
    ];
    const updatePayload = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    for (const field of ALLOWED) {
      if (body[field] !== void 0) updatePayload[field] = body[field];
    }
    if (Object.keys(updatePayload).length === 1) {
      return json({ error: "Nenhum campo para atualizar." }, { status: 400 });
    }
    const { data, error } = await client.from("companies").update(updatePayload).eq("id", companyId).select("id, nome_empresa, nome_fantasia, cnpj, telefone, endereco, cidade, estado, active").maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Empresa não encontrada." }, { status: 404 });
    return json({ ok: true, empresa: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar empresa.");
  }
}
export {
  GET,
  PATCH
};
