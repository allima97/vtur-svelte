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
      ensureModuloAccess(scope, ["vendas_consulta", "vendas"], 3, "Sem permissao para editar vendas.");
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
    const { data: receipt, error: receiptError } = await client.from("vendas_recibos").select("id, venda_id, produto_resolvido_id").eq("id", reciboId).eq("venda_id", vendaId).maybeSingle();
    if (receiptError) throw receiptError;
    if (!receipt) {
      return new Response("Recibo nao encontrado.", { status: 404 });
    }
    const produtoResolvidoId = String(receipt?.produto_resolvido_id || "").trim();
    if (!isUuid(produtoResolvidoId)) {
      return new Response("Recibo sem produto valido para definir como principal.", { status: 400 });
    }
    let updateQuery = client.from("vendas").update({ destino_id: produtoResolvidoId }).eq("id", vendaId);
    if (companyIds.length > 0) updateQuery = updateQuery.in("company_id", companyIds);
    if (vendedorIds.length > 0) updateQuery = updateQuery.in("vendedor_id", vendedorIds);
    const { data: updated, error: updateError } = await updateQuery.select("id, destino_id").maybeSingle();
    if (updateError) throw updateError;
    if (!updated?.id) {
      return new Response("Nao foi possivel atualizar o recibo principal.", { status: 403 });
    }
    return json({
      ok: true,
      venda_id: vendaId,
      recibo_id: reciboId,
      destino_id: produtoResolvidoId
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar recibo principal.");
  }
}
export {
  POST
};
