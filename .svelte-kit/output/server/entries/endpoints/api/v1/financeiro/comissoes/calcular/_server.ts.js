import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, d as resolveScopedVendedorIds, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["financeiro", "comissoes"], 2, "Sem permissão para calcular comissões.");
    }
    const body = await event.request.json();
    const { venda_ids, vendedor_ids, data_inicio, data_fim, mes_referencia, ano_referencia } = body;
    const hoje = /* @__PURE__ */ new Date();
    const mesRef = mes_referencia || hoje.getMonth() + 1;
    const anoRef = ano_referencia || hoje.getFullYear();
    let vendasQuery = client.from("vendas").select("id, numero_venda, cliente_id, vendedor_id, valor_total, valor_nao_comissionado, data_venda, company_id, cancelada").eq("cancelada", false).not("vendedor_id", "is", null);
    if (venda_ids?.length > 0) vendasQuery = vendasQuery.in("id", venda_ids);
    if (vendedor_ids?.length > 0) vendasQuery = vendasQuery.in("vendedor_id", vendedor_ids);
    if (data_inicio) vendasQuery = vendasQuery.gte("data_venda", data_inicio);
    if (data_fim) vendasQuery = vendasQuery.lte("data_venda", data_fim);
    const { data: vendas, error: vendasError } = await vendasQuery;
    if (vendasError) throw vendasError;
    if (!vendas || vendas.length === 0) {
      return json({ success: true, message: "Nenhuma venda encontrada", processadas: 0, erro: 0, detalhes: [] });
    }
    const { data: regras } = await client.from("commission_rule").select("id, nome, meta_atingida, tipo").eq("ativo", true).limit(1);
    const regraDefault = regras?.[0];
    const percentualDefault = Number(regraDefault?.meta_atingida || 0);
    const clienteIds = [...new Set(vendas.map((v) => v.cliente_id).filter(Boolean))];
    const clientesMap = /* @__PURE__ */ new Map();
    if (clienteIds.length > 0) {
      const { data: clientesData } = await client.from("clientes").select("id, nome").in("id", clienteIds);
      (clientesData || []).forEach((c) => clientesMap.set(c.id, c.nome));
    }
    const resultados = [];
    let processadas = 0;
    for (const venda of vendas) {
      const valorTotal = Number(venda.valor_total) || 0;
      const valorNaoComissionado = Number(venda.valor_nao_comissionado) || 0;
      const valorComissionavel = Math.max(0, valorTotal - valorNaoComissionado);
      if (valorComissionavel <= 0) {
        resultados.push({ venda_id: venda.id, numero_venda: venda.numero_venda, status: "ignorada", motivo: "Valor comissionável é zero" });
        continue;
      }
      const valorComissao = valorComissionavel * percentualDefault / 100;
      resultados.push({
        venda_id: venda.id,
        numero_venda: venda.numero_venda,
        cliente: clientesMap.get(venda.cliente_id) || "Desconhecido",
        valor_venda: valorTotal,
        valor_comissionavel: valorComissionavel,
        percentual: percentualDefault,
        valor_comissao: valorComissao,
        regra: regraDefault?.nome || "Padrão",
        status: "calculada",
        mes_referencia: mesRef,
        ano_referencia: anoRef
      });
      processadas++;
    }
    return json({
      success: true,
      message: `${processadas} comissões calculadas`,
      processadas,
      erro: 0,
      total_vendas: vendas.length,
      detalhes: resultados
    });
  } catch (err) {
    console.error("[Calcular Comissões POST] Erro:", err);
    return toErrorResponse(err, "Erro ao calcular comissões.");
  }
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["financeiro", "comissoes"], 1, "Sem acesso.");
    }
    const { searchParams } = event.url;
    const vendedorId = searchParams.get("vendedor_id");
    const mes = searchParams.get("mes");
    const ano = searchParams.get("ano");
    const vendedorIds = await resolveScopedVendedorIds(client, scope, vendedorId);
    const mesNum = mes ? parseInt(mes) : (/* @__PURE__ */ new Date()).getMonth() + 1;
    const anoNum = ano ? parseInt(ano) : (/* @__PURE__ */ new Date()).getFullYear();
    const dataInicio = `${anoNum}-${String(mesNum).padStart(2, "0")}-01`;
    const dataFim = new Date(anoNum, mesNum, 0).toISOString().slice(0, 10);
    let vendasQuery = client.from("vendas").select(`
        id, numero_venda, vendedor_id, cliente_id, valor_total, valor_nao_comissionado,
        data_venda, company_id, cancelada,
        cliente:clientes!cliente_id(nome),
        vendedor:users!vendedor_id(id, nome_completo)
      `).eq("cancelada", false).gte("data_venda", dataInicio).lte("data_venda", dataFim).order("data_venda", { ascending: false }).limit(500);
    if (vendedorIds.length > 0) vendasQuery = vendasQuery.in("vendedor_id", vendedorIds);
    if (scope.companyId && !scope.isAdmin) vendasQuery = vendasQuery.eq("company_id", scope.companyId);
    const { data: vendas, error: vendasError } = await vendasQuery;
    if (vendasError) throw vendasError;
    const items = (vendas || []).map((v) => ({
      id: v.id,
      venda_id: v.id,
      numero_venda: v.numero_venda || `VD-${v.id.slice(0, 8)}`,
      data_venda: v.data_venda,
      cliente: v.cliente?.nome || "Cliente",
      vendedor_id: v.vendedor_id,
      vendedor: v.vendedor?.nome_completo || "Vendedor",
      valor_venda: Number(v.valor_total || 0),
      valor_comissionavel: Math.max(0, Number(v.valor_total || 0) - Number(v.valor_nao_comissionado || 0)),
      percentual_aplicado: 0,
      valor_comissao: 0,
      status: "PENDENTE",
      mes_referencia: mesNum,
      ano_referencia: anoNum
    }));
    const totalPendente = items.reduce((acc, i) => acc + i.valor_comissionavel, 0);
    return json({
      items,
      total: items.length,
      resumo: { total_pendente: totalPendente, total_pago: 0, total_geral: totalPendente }
    });
  } catch (err) {
    console.error("[Comissões Calculadas GET] Erro:", err);
    return toErrorResponse(err, "Erro ao carregar comissões.");
  }
}
export {
  GET,
  POST
};
