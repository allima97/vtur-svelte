import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, i as isUuid, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function resolvePagamentoComScope(client, id, scope) {
  const { data, error } = await client.from("vendas_pagamentos").select(
    "id, company_id, venda_id, forma_pagamento_id, forma_nome, operacao, plano, valor_bruto, desconto_valor, valor_total, parcelas_qtd, parcelas_valor, vencimento_primeira, paga_comissao, observacoes, created_at, updated_at, venda:vendas!venda_id(id, numero_venda, company_id), forma_pagamento:formas_pagamento!forma_pagamento_id(id, nome)"
  ).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const companyId = String(data?.venda?.company_id || data?.company_id || "").trim() || null;
  return { pagamento: data, companyId };
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || "").trim();
    if (!isUuid(id)) return json({ success: false, error: "ID invalido." }, { status: 400 });
    const result = await resolvePagamentoComScope(client, id, scope);
    if (!result) return json({ success: false, error: "Pagamento nao encontrado." }, { status: 404 });
    if (!scope.isAdmin) {
      const companyIds = resolveScopedCompanyIds(scope, null);
      if (companyIds.length > 0 && result.companyId && !companyIds.includes(result.companyId)) {
        return json({ success: false, error: "Acesso negado." }, { status: 403 });
      }
    }
    return json({ success: true, item: result.pagamento });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar pagamento.");
  }
}
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || "").trim();
    if (!isUuid(id)) return json({ success: false, error: "ID invalido." }, { status: 400 });
    const result = await resolvePagamentoComScope(client, id, scope);
    if (!result) return json({ success: false, error: "Pagamento nao encontrado." }, { status: 404 });
    if (!scope.isAdmin) {
      const companyIds = resolveScopedCompanyIds(scope, null);
      if (companyIds.length > 0 && result.companyId && !companyIds.includes(result.companyId)) {
        return json({ success: false, error: "Acesso negado." }, { status: 403 });
      }
    }
    const body = await event.request.json();
    const allowed = [
      "forma_nome",
      "forma_pagamento_id",
      "valor_total",
      "valor_bruto",
      "desconto_valor",
      "paga_comissao",
      "observacoes",
      "parcelas_qtd",
      "parcelas_valor",
      "vencimento_primeira"
    ];
    const updateData = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    const { data, error } = await client.from("vendas_pagamentos").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return json({ success: true, item: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar pagamento.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || "").trim();
    if (!isUuid(id)) return json({ success: false, error: "ID invalido." }, { status: 400 });
    const result = await resolvePagamentoComScope(client, id, scope);
    if (!result) return json({ success: false, error: "Pagamento nao encontrado." }, { status: 404 });
    if (!scope.isAdmin) {
      const companyIds = resolveScopedCompanyIds(scope, null);
      if (companyIds.length > 0 && result.companyId && !companyIds.includes(result.companyId)) {
        return json({ success: false, error: "Acesso negado." }, { status: 403 });
      }
    }
    const { error } = await client.from("vendas_pagamentos").delete().eq("id", id);
    if (error) throw error;
    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir pagamento.");
  }
}
export {
  DELETE,
  GET,
  PATCH
};
