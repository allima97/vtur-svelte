import { json } from "@sveltejs/kit";
import { g as ensureCanManageCompanies, h as getAccessibleCompanyIds } from "../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureCanManageCompanies(scope);
    const companyId = String(event.url.searchParams.get("company_id") || "").trim();
    let query = client.from("master_empresas").select("id, master_id, company_id, status, created_at, approved_at").order("created_at", { ascending: false });
    if (companyId) query = query.eq("company_id", companyId);
    if (!scope.isAdmin) {
      const accessible = getAccessibleCompanyIds(scope);
      if (!accessible.length) return json({ items: [] });
      query = query.in("company_id", accessible);
    }
    const { data, error: queryError } = await query;
    if (queryError) throw queryError;
    return json({ items: data || [] });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar vinculos master.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    ensureCanManageCompanies(scope);
    const action = String(body.action || "save").trim().toLowerCase();
    const id = String(body.id || "").trim();
    const masterId = String(body.master_id || "").trim();
    const companyId = String(body.company_id || "").trim();
    const status = String(body.status || "approved").trim() || "approved";
    const accessible = scope.isAdmin ? null : getAccessibleCompanyIds(scope);
    if (action === "delete") {
      if (!id) return new Response("Vinculo nao informado.", { status: 400 });
      if (!scope.isAdmin) {
        const { data: vinculo } = await client.from("master_empresas").select("company_id").eq("id", id).maybeSingle();
        if (!vinculo || !accessible?.includes(String(vinculo.company_id || ""))) {
          return new Response("Vinculo fora do escopo.", { status: 403 });
        }
      }
      const { error: deleteError } = await client.from("master_empresas").delete().eq("id", id);
      if (deleteError) throw deleteError;
      return json({ id, deleted: true });
    }
    if (action === "update") {
      if (!id) return new Response("Vinculo nao informado.", { status: 400 });
      if (!scope.isAdmin) {
        const { data: vinculo } = await client.from("master_empresas").select("company_id").eq("id", id).maybeSingle();
        if (!vinculo || !accessible?.includes(String(vinculo.company_id || ""))) {
          return new Response("Vinculo fora do escopo.", { status: 403 });
        }
      }
      const { error: updateError } = await client.from("master_empresas").update({
        status,
        approved_at: status === "approved" ? (/* @__PURE__ */ new Date()).toISOString() : null
      }).eq("id", id);
      if (updateError) throw updateError;
      return json({ id, updated: true });
    }
    if (!masterId || !companyId) {
      return new Response("Master e empresa sao obrigatorios.", { status: 400 });
    }
    if (!scope.isAdmin && !accessible?.includes(companyId)) {
      return new Response("Empresa fora do escopo permitido.", { status: 403 });
    }
    const { error: insertError } = await client.from("master_empresas").insert({
      master_id: masterId,
      company_id: companyId,
      status,
      approved_at: status === "approved" ? (/* @__PURE__ */ new Date()).toISOString() : null
    });
    if (insertError) throw insertError;
    return json({ created: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar vinculo master.");
  }
}
export {
  GET,
  POST
};
