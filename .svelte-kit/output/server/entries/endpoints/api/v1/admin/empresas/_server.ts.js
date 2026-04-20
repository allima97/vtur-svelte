import { json } from "@sveltejs/kit";
import { g as ensureCanManageCompanies, h as getAccessibleCompanyIds } from "../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function loadCompaniesWithBilling(client, companyIds) {
  const queryWithBilling = client.from("companies").select(
    `
        id,
        nome_fantasia,
        nome_empresa,
        cnpj,
        telefone,
        endereco,
        cidade,
        estado,
        active,
        billing:company_billing (
          id,
          status,
          valor_mensal,
          ultimo_pagamento,
          proximo_vencimento,
          plan:plans (id, nome)
        )
      `
  ).order("nome_fantasia", { ascending: true });
  const scopedQuery = companyIds && companyIds.length > 0 ? queryWithBilling.in("id", companyIds) : queryWithBilling;
  const withBilling = await scopedQuery;
  if (!withBilling.error) return withBilling.data || [];
  const message = String(withBilling.error.message || "").toLowerCase();
  if (!message.includes("company_billing") && !message.includes("plans")) {
    throw withBilling.error;
  }
  const fallback = await client.from("companies").select("id, nome_fantasia, nome_empresa, cnpj, telefone, endereco, cidade, estado, active").order("nome_fantasia", { ascending: true });
  if (fallback.error) throw fallback.error;
  const rows = fallback.data || [];
  if (!companyIds || !companyIds.length) return rows;
  return rows.filter((row) => companyIds.includes(String(row.id)));
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureCanManageCompanies(scope);
    const accessibleCompanyIds = scope.isAdmin ? null : getAccessibleCompanyIds(scope);
    const rows = await loadCompaniesWithBilling(client, accessibleCompanyIds);
    const companyIds = rows.map((row) => row.id);
    let masterLinkCounts = /* @__PURE__ */ new Map();
    try {
      const masterLinksRes = companyIds.length > 0 ? await client.from("master_empresas").select("company_id").in("company_id", companyIds) : { data: [], error: null };
      if (masterLinksRes.error) throw masterLinksRes.error;
      (masterLinksRes.data || []).forEach((row) => {
        const companyId = String(row.company_id || "").trim();
        if (!companyId) return;
        masterLinkCounts.set(companyId, Number(masterLinkCounts.get(companyId) || 0) + 1);
      });
    } catch {
      masterLinkCounts = /* @__PURE__ */ new Map();
    }
    return json({
      items: rows.map((row) => ({
        id: row.id,
        nome_fantasia: row.nome_fantasia || "",
        nome_empresa: row.nome_empresa || "",
        nome: row.nome_fantasia || row.nome_empresa || "",
        cnpj: row.cnpj || "",
        cidade: row.cidade || "",
        estado: row.estado || "",
        telefone: row.telefone || "",
        endereco: row.endereco || "",
        active: row.active !== false,
        ativo: row.active !== false,
        billing: Array.isArray(row.billing) ? row.billing[0] || null : row.billing || null,
        master_links: Number(masterLinkCounts.get(String(row.id)) || 0)
      }))
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar empresas.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    ensureCanManageCompanies(scope);
    const id = String(body.id || "").trim();
    const payload = {
      nome_fantasia: String(body.nome_fantasia || body.nome || "").trim() || null,
      nome_empresa: String(body.nome_empresa || "").trim() || null,
      cnpj: String(body.cnpj || "").trim() || null,
      telefone: String(body.telefone || "").trim() || null,
      endereco: String(body.endereco || "").trim() || null,
      cidade: String(body.cidade || "").trim() || null,
      estado: String(body.estado || "").trim() || null,
      active: body.active !== false && body.ativo !== false
    };
    if (!payload.nome_fantasia) {
      return new Response("Informe o nome da empresa.", { status: 400 });
    }
    let companyId = id;
    if (companyId) {
      if (!scope.isAdmin && !getAccessibleCompanyIds(scope).includes(companyId)) {
        return new Response("Empresa fora do escopo permitido.", { status: 403 });
      }
      const { error: updateError } = await client.from("companies").update(payload).eq("id", companyId);
      if (updateError) throw updateError;
    } else {
      if (!scope.isAdmin) {
        return new Response("Somente ADMIN pode criar empresas.", { status: 403 });
      }
      const { data, error: insertError } = await client.from("companies").insert(payload).select("id").single();
      if (insertError) throw insertError;
      companyId = data.id;
    }
    if ("billing_status" in body || "billing_plan_id" in body || "billing_valor_mensal" in body) {
      try {
        const billingPayload = {
          company_id: companyId,
          status: String(body.billing_status || "active").trim() || "active",
          plan_id: String(body.billing_plan_id || "").trim() || null,
          valor_mensal: body.billing_valor_mensal === "" || body.billing_valor_mensal == null ? null : Number(body.billing_valor_mensal),
          ultimo_pagamento: String(body.billing_ultimo_pagamento || "").trim() || null,
          proximo_vencimento: String(body.billing_proximo_vencimento || "").trim() || null
        };
        const existingBilling = await client.from("company_billing").select("id").eq("company_id", companyId).maybeSingle();
        if (existingBilling.error) throw existingBilling.error;
        if (existingBilling.data?.id) {
          const { error: billingUpdateError } = await client.from("company_billing").update(billingPayload).eq("id", existingBilling.data.id);
          if (billingUpdateError) throw billingUpdateError;
        } else {
          const { error: billingInsertError } = await client.from("company_billing").insert(billingPayload);
          if (billingInsertError) throw billingInsertError;
        }
      } catch {
      }
    }
    return json({ id: companyId, saved: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar empresa.");
  }
}
export {
  GET,
  POST
};
