import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function findReciboByNumero(params) {
  const numero = String(params.numero || "").trim();
  if (!numero) return null;
  const { data } = await params.client.from("vendas_recibos").select("id, venda_id, vendedor_id, numero_recibo, numero_recibo_normalizado, valor_total, valor_taxas, vendas!inner(company_id)").or(`numero_recibo.eq.${numero},numero_recibo_normalizado.eq.${numero}`).eq("vendas.company_id", params.companyId).limit(10);
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return null;
  const targetTotal = Number(params.valorLancamento || 0);
  const targetTaxas = Number(params.valorTaxas || 0);
  const ranked = [...rows].sort((a, b) => {
    const aTotalDiff = Math.abs(Number(a?.valor_total || 0) - targetTotal);
    const bTotalDiff = Math.abs(Number(b?.valor_total || 0) - targetTotal);
    if (aTotalDiff !== bTotalDiff) return aTotalDiff - bTotalDiff;
    const aTaxDiff = Math.abs(Number(a?.valor_taxas || 0) - targetTaxas);
    const bTaxDiff = Math.abs(Number(b?.valor_taxas || 0) - targetTaxas);
    return aTaxDiff - bTaxDiff;
  });
  const recibo = ranked[0];
  return recibo ? { recibo } : null;
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ["conciliacao"], 1, "Sem acesso à Conciliação.");
    }
    const body = await event.request.json().catch(() => ({}));
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId || null);
    const companyId = companyIds[0] || null;
    if (!companyId) return json({ error: "Company invalida." }, { status: 400 });
    const documentos = Array.isArray(body?.documentos) ? body.documentos : [];
    if (documentos.length === 0) return json({ matches: {} });
    const matches = {};
    for (const item of documentos) {
      const documento = String(item?.documento || "").trim();
      if (!documento) continue;
      const found = await findReciboByNumero({
        numero: documento,
        companyId,
        valorLancamento: item.valor_lancamentos ?? null,
        valorTaxas: item.valor_taxas ?? null,
        client
      });
      if (!found?.recibo?.vendedor_id) {
        matches[documento] = null;
        continue;
      }
      matches[documento] = {
        vendedor_id: found.recibo.vendedor_id,
        venda_id: found.recibo.venda_id,
        venda_recibo_id: found.recibo.id
      };
    }
    return json({ matches });
  } catch (err) {
    return toErrorResponse(err, "Erro ao buscar vendedores.");
  }
}
export {
  POST
};
