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
      ensureModuloAccess(scope, ["vendas_consulta", "vendas"], 4, "Sem permissao para excluir recibos.");
    }
    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody);
    const vendaId = String(body?.venda_id || "").trim();
    const reciboId = String(body?.recibo_id || "").trim();
    if (!isUuid(vendaId) || !isUuid(reciboId)) {
      return new Response("venda_id ou recibo_id invalido.", { status: 400 });
    }
    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get("company_id") || event.url.searchParams.get("empresa_id")
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get("vendedor_ids") || event.url.searchParams.get("vendedor_id")
    );
    let saleQuery = client.from("vendas").select("id").eq("id", vendaId);
    if (companyIds.length > 0) saleQuery = saleQuery.in("company_id", companyIds);
    if (vendedorIds.length > 0) saleQuery = saleQuery.in("vendedor_id", vendedorIds);
    const { data: sale, error: saleError } = await saleQuery.maybeSingle();
    if (saleError) throw saleError;
    if (!sale) {
      return new Response("Venda nao encontrada.", { status: 404 });
    }
    const { error } = await client.from("vendas_recibos").delete().eq("id", reciboId).eq("venda_id", vendaId);
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir recibo.");
  }
}
export {
  POST
};
