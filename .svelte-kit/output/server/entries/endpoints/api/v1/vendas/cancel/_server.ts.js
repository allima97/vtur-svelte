import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["vendas_consulta", "vendas"], 4, "Sem permissao para cancelar vendas.");
    }
    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody);
    const vendaId = String(body?.venda_id || "").trim();
    if (!isUuid(vendaId)) {
      return new Response("venda_id invalido.", { status: 400 });
    }
    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get("empresa_id") || event.url.searchParams.get("company_id")
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get("vendedor_id") || event.url.searchParams.get("vendedor_ids")
    );
    let saleQuery = client.from("vendas").select("id").eq("id", vendaId);
    if (companyIds.length > 0) saleQuery = saleQuery.in("company_id", companyIds);
    if (vendedorIds.length > 0) saleQuery = saleQuery.in("vendedor_id", vendedorIds);
    const { data: sale, error: saleError } = await saleQuery.maybeSingle();
    if (saleError) throw saleError;
    if (!sale) {
      return new Response("Venda nao encontrada.", { status: 404 });
    }
    let cancelQuery = client.from("vendas").update({ cancelada: true }).eq("id", vendaId);
    if (companyIds.length > 0) cancelQuery = cancelQuery.in("company_id", companyIds);
    if (vendedorIds.length > 0) cancelQuery = cancelQuery.in("vendedor_id", vendedorIds);
    const { error: cancelError } = await cancelQuery;
    if (cancelError) throw cancelError;
    return json({ ok: true, cancelled: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao cancelar venda.");
  }
}
export {
  POST
};
