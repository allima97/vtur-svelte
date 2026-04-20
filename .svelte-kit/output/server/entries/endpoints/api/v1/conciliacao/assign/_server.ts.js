import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ["conciliacao"], 3, "Sem permissão para atribuir conciliação.");
    }
    const body = await event.request.json();
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;
    const conciliacaoId = String(body?.conciliacaoId || "").trim();
    if (!isUuid(conciliacaoId)) return json({ error: "ID de conciliação inválido." }, { status: 400 });
    const rankingVendedorId = String(body?.rankingVendedorId || "").trim() || null;
    const rankingProdutoId = String(body?.rankingProdutoId || "").trim() || null;
    const vendaId = String(body?.vendaId || "").trim() || null;
    const vendaReciboId = String(body?.vendaReciboId || "").trim() || null;
    const isBaixaRac = Boolean(body?.isBaixaRac);
    const { data: registro, error: registroErr } = await client.from("conciliacao_recibos").select("id, company_id").eq("id", conciliacaoId).maybeSingle();
    if (registroErr) throw registroErr;
    if (!registro) return json({ error: "Registro não encontrado." }, { status: 404 });
    if (!scope.isAdmin && registro.company_id !== companyId) {
      return json({ error: "Registro fora do escopo." }, { status: 403 });
    }
    const update = {
      ranking_assigned_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (rankingVendedorId !== void 0) update.ranking_vendedor_id = rankingVendedorId;
    if (rankingProdutoId !== void 0) update.ranking_produto_id = rankingProdutoId;
    if (vendaId !== void 0) update.venda_id = vendaId;
    if (vendaReciboId !== void 0) update.venda_recibo_id = vendaReciboId;
    if (body && "isBaixaRac" in body) update.is_baixa_rac = isBaixaRac;
    if (body && "conciliado" in body) update.conciliado = Boolean(body.conciliado);
    if (body && "valorComissaoLoja" in body && body.valorComissaoLoja != null) {
      update.valor_comissao_loja = Number(body.valorComissaoLoja);
    }
    const { error: updateError } = await client.from("conciliacao_recibos").update(update).eq("id", conciliacaoId);
    if (updateError) throw updateError;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atribuir conciliação.");
  }
}
export {
  POST
};
