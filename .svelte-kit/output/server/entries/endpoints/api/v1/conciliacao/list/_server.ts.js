import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
const DEFAULT_NAO_COMISSIONAVEIS$1 = [
  "credito diversos",
  "credito pax",
  "credito passageiro",
  "credito de viagem",
  "credipax",
  "vale viagem",
  "carta de credito",
  "credito"
];
function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase() || "OUTRO";
}
function normalizeTerm(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function isFormaNaoComissionavel(nome, termos) {
  const normalized = normalizeTerm(nome);
  if (!normalized) return false;
  if (normalized.includes("cartao") && normalized.includes("credito")) return false;
  const lista = termos && termos.length ? termos : DEFAULT_NAO_COMISSIONAVEIS$1;
  return lista.some((termo) => termo && normalized.includes(termo));
}
function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}
function normalizeConciliacaoStatus(value) {
  const raw = normalizeText(value);
  if (!raw) return "OUTRO";
  if (raw.includes("ESTORNO")) return "ESTORNO";
  if (raw.includes("BAIXA")) return "BAIXA";
  if (raw.includes("OPFAX")) return "OPFAX";
  return "OUTRO";
}
function resolveConciliacaoStatus(params) {
  const descricaoStatus = normalizeConciliacaoStatus(params.descricao);
  if (descricaoStatus !== "OUTRO") return descricaoStatus;
  return normalizeConciliacaoStatus(params.status);
}
function isConciliacaoEfetivada(params) {
  return resolveConciliacaoStatus(params) === "BAIXA";
}
function buildConciliacaoMetrics(params) {
  const valorLancamentos = Number(params.valorLancamentos || 0);
  const valorTaxas = Number(params.valorTaxas || 0);
  const valorDescontos = Number(params.valorDescontos || 0);
  const valorAbatimentos = Number(params.valorAbatimentos || 0);
  const valorNaoComissionavel = Number(params.valorNaoComissionavel || 0);
  const valorSaldo = Number(params.valorSaldo || 0);
  const valorOpfax = Number(params.valorOpfax || 0);
  const valorCalculadaLoja = Number(params.valorCalculadaLoja || 0);
  const valorVisaoMaster = Number(params.valorVisaoMaster || 0);
  const valorVendaReal = valorCalculadaLoja || valorVisaoMaster || Math.max(0, valorLancamentos - valorTaxas - valorDescontos - valorAbatimentos - valorNaoComissionavel);
  const valorComissaoLoja = params.valorComissaoLoja != null ? Number(params.valorComissaoLoja) : valorSaldo || valorOpfax || 0;
  const percentualComissaoLoja = valorVendaReal > 0 ? Math.round(valorComissaoLoja / valorVendaReal * 1e4) / 100 : 0;
  const faixaComissao = percentualComissaoLoja >= 12 ? "12%+" : percentualComissaoLoja >= 10 ? "10-11.99%" : percentualComissaoLoja > 0 ? "<10%" : "0%";
  const isSeguroViagem = normalizeText(params.descricao).includes("SEGURO");
  return {
    valorVendaReal,
    valorComissaoLoja,
    percentualComissaoLoja,
    faixaComissao,
    isSeguroViagem
  };
}
function rankDuplicateRow(row) {
  const metrics = buildConciliacaoMetrics({
    descricao: row?.descricao,
    valorLancamentos: row?.valor_lancamentos,
    valorTaxas: row?.valor_taxas,
    valorDescontos: row?.valor_descontos,
    valorAbatimentos: row?.valor_abatimentos,
    valorNaoComissionavel: row?.valor_nao_comissionavel,
    valorSaldo: row?.valor_saldo,
    valorOpfax: row?.valor_opfax,
    valorCalculadaLoja: row?.valor_calculada_loja,
    valorVisaoMaster: row?.valor_visao_master,
    valorComissaoLoja: row?.valor_comissao_loja,
    percentualComissaoLoja: row?.percentual_comissao_loja
  });
  const percentual = Number(metrics.percentualComissaoLoja ?? 0);
  const comissao = Number(metrics.valorComissaoLoja ?? 0);
  const updatedAt = Date.parse(String(row?.updated_at || row?.created_at || ""));
  let score = 0;
  if (Number.isFinite(percentual) && percentual > 0) score += 4;
  if (Number.isFinite(comissao) && Math.abs(comissao) > 9e-3) score += 3;
  if (row?.conciliado) score += 2;
  if (row?.venda_id || row?.venda_recibo_id) score += 1;
  return {
    score,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0
  };
}
function dedupeConciliacaoRows(rows) {
  const grouped = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = [
      String(row?.company_id || "").trim(),
      String(row?.movimento_data || "").trim(),
      String(row?.documento || "").trim(),
      normalizeStatus(row?.status)
    ].join("::");
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }
  return Array.from(grouped.values()).map((bucket) => {
    if (bucket.length === 1) return bucket[0];
    return [...bucket].sort((left, right) => {
      const leftRank = rankDuplicateRow(left);
      const rightRank = rankDuplicateRow(right);
      if (rightRank.score !== leftRank.score) return rightRank.score - leftRank.score;
      return rightRank.updatedAt - leftRank.updatedAt;
    })[0];
  });
}
function normalizeComputedFields(row) {
  const statusResolvido = resolveConciliacaoStatus({
    status: row?.status,
    descricao: row?.descricao
  });
  const temValorDireto = Number(row?.valor_saldo || 0) > 9e-3 || Number(row?.valor_calculada_loja || 0) > 9e-3 || Number(row?.valor_visao_master || 0) > 9e-3;
  const metrics = buildConciliacaoMetrics({
    descricao: row?.descricao,
    valorLancamentos: row?.valor_lancamentos,
    valorTaxas: row?.valor_taxas,
    valorDescontos: row?.valor_descontos,
    valorAbatimentos: row?.valor_abatimentos,
    valorNaoComissionavel: row?.valor_nao_comissionavel,
    valorSaldo: row?.valor_saldo,
    valorOpfax: row?.valor_opfax,
    valorCalculadaLoja: row?.valor_calculada_loja,
    valorVisaoMaster: row?.valor_visao_master,
    valorComissaoLoja: temValorDireto ? null : row?.valor_comissao_loja
  });
  return {
    ...row,
    status: statusResolvido,
    valor_venda_real: metrics.valorVendaReal,
    valor_comissao_loja: metrics.valorComissaoLoja,
    percentual_comissao_loja: metrics.percentualComissaoLoja,
    faixa_comissao: metrics.faixaComissao,
    is_seguro_viagem: metrics.isSeguroViagem
  };
}
function isRankingEligibleStatus(row) {
  return isConciliacaoEfetivada({
    status: row?.status,
    descricao: row?.descricao
  });
}
const DEFAULT_NAO_COMISSIONAVEIS = [
  "credito diversos",
  "credito pax",
  "credito passageiro",
  "credito de viagem",
  "credipax",
  "vale viagem",
  "carta de credito",
  "credito"
];
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ["conciliacao"], 1, "Sem acesso à Conciliação.");
    }
    const { searchParams } = event.url;
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("company_id"));
    const companyId = companyIds[0] || null;
    if (!companyId) return json([]);
    const somentePendentes = searchParams.get("pending") === "1";
    const somenteConciliados = searchParams.get("conciliado") === "1";
    const rankingPending = searchParams.get("ranking_pending") === "1";
    const month = String(searchParams.get("month") || "").trim();
    const day = String(searchParams.get("day") || "").trim();
    const rankingStatus = String(searchParams.get("ranking_status") || "all").trim();
    const baixaRac = searchParams.get("baixa_rac") === "1";
    let query = client.from("conciliacao_recibos").select(
      `id, company_id, documento, movimento_data, status, descricao, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_calculada_loja, valor_visao_master, valor_opfax, valor_saldo, valor_venda_real, valor_nao_comissionavel, valor_comissao_loja, percentual_comissao_loja, faixa_comissao, is_seguro_viagem, origem, conciliado, match_total, match_taxas, sistema_valor_total, sistema_valor_taxas, diff_total, diff_taxas, venda_id, venda_recibo_id, ranking_vendedor_id, ranking_produto_id, ranking_assigned_at, is_baixa_rac, ranking_vendedor:users!ranking_vendedor_id(id, nome_completo), ranking_produto:tipo_produtos!ranking_produto_id(id, nome), last_checked_at, conciliado_em, created_at, updated_at`
    ).eq("company_id", companyId).order("movimento_data", { ascending: false }).order("documento", { ascending: true }).limit(500);
    if (somentePendentes) query = query.eq("conciliado", false);
    if (somenteConciliados) query = query.eq("conciliado", true);
    if (/^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNum] = month.split("-").map(Number);
      const inicio = `${month}-01`;
      const fim = new Date(year, monthNum, 0).toISOString().slice(0, 10);
      query = query.gte("movimento_data", inicio).lte("movimento_data", fim);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      query = query.eq("movimento_data", day);
    }
    const { data, error } = await query;
    if (error) throw error;
    let rows = dedupeConciliacaoRows(Array.isArray(data) ? data : []).map(normalizeComputedFields);
    if (rankingPending) {
      rows = rows.filter((row) => {
        const status = String(row?.status || "").trim().toUpperCase();
        const isEligivel = status === "BAIXA" || status === "OPFAX";
        const semVenda = !String(row?.venda_id || "").trim();
        const semRanking = !String(row?.ranking_vendedor_id || "").trim();
        const isBaixaRac = Boolean(row?.is_baixa_rac) || String(row?.ranking_vendedor_id || "").trim() === "BAIXA_RAC";
        return isEligivel && semVenda && semRanking && !isBaixaRac;
      });
    }
    if (somentePendentes) {
      rows = rows.filter((row) => {
        const isBaixaRac = Boolean(row?.is_baixa_rac) || String(row?.ranking_vendedor_id || "").trim() === "BAIXA_RAC";
        return !isBaixaRac;
      });
    }
    if (baixaRac) {
      rows = rows.filter((row) => {
        const isBaixaRac = Boolean(row?.is_baixa_rac) || String(row?.ranking_vendedor_id || "").trim() === "BAIXA_RAC";
        return isBaixaRac;
      });
    }
    if (rankingStatus === "pending") {
      rows = rows.filter((row) => {
        const vendaId = String(row?.venda_id || "").trim();
        const rankingVendedorId = String(row?.ranking_vendedor_id || "").trim();
        return isRankingEligibleStatus(row) && !vendaId && !rankingVendedorId;
      });
    } else if (rankingStatus === "assigned") {
      rows = rows.filter((row) => {
        if (!isRankingEligibleStatus(row)) return false;
        const vendaId = String(row?.venda_id || "").trim();
        const rankingVendedorId = String(row?.ranking_vendedor_id || "").trim();
        const isBaixaRac = Boolean(row?.is_baixa_rac);
        if (isBaixaRac) return false;
        return !vendaId && Boolean(rankingVendedorId);
      });
    } else if (rankingStatus === "system") {
      rows = rows.filter((row) => isRankingEligibleStatus(row) && Boolean(String(row?.venda_id || "").trim()));
    }
    const vendaIds = Array.from(new Set(rows.map((row) => String(row?.venda_id || "").trim()).filter(Boolean)));
    const flaggedVendas = /* @__PURE__ */ new Set();
    if (vendaIds.length > 0) {
      let termosNaoComissionaveis = DEFAULT_NAO_COMISSIONAVEIS;
      try {
        const { data: termosData } = await client.from("parametros_pagamentos_nao_comissionaveis").select("termo, termo_normalizado, ativo").eq("ativo", true).order("termo", { ascending: true });
        const termos = (termosData || []).map((row) => normalizeTerm(row?.termo_normalizado || row?.termo)).filter(Boolean);
        if (termos.length > 0) termosNaoComissionaveis = Array.from(new Set(termos));
      } catch {
      }
      const { data: pagamentos, error: pagamentosError } = await client.from("vendas_pagamentos").select("venda_id, forma_nome, paga_comissao").eq("company_id", companyId).in("venda_id", vendaIds);
      if (pagamentosError) throw pagamentosError;
      (pagamentos || []).forEach((pagamento) => {
        const vendaId = String(pagamento?.venda_id || "").trim();
        if (!vendaId) return;
        const naoComissiona = pagamento?.paga_comissao === false || isFormaNaoComissionavel(pagamento?.forma_nome, termosNaoComissionaveis);
        if (naoComissiona) flaggedVendas.add(vendaId);
      });
    }
    const recibosByIdForAudit = /* @__PURE__ */ new Map();
    const reciboIdsForAudit = Array.from(new Set(rows.map((row) => String(row?.venda_recibo_id || "").trim()).filter(Boolean)));
    if (reciboIdsForAudit.length > 0) {
      const { data: recibosAudit } = await client.from("vendas_recibos").select("id, valor_total, valor_taxas").in("id", reciboIdsForAudit);
      (recibosAudit || []).forEach((recibo) => {
        const reciboId = String(recibo?.id || "").trim();
        if (!reciboId) return;
        recibosByIdForAudit.set(reciboId, {
          valor_total: Number(recibo?.valor_total || 0),
          valor_taxas: Number(recibo?.valor_taxas || 0)
        });
      });
    }
    rows = rows.map((row) => {
      const vendaId = String(row?.venda_id || "").trim();
      const reciboId = String(row?.venda_recibo_id || "").trim();
      const reciboData = reciboId ? recibosByIdForAudit.get(reciboId) : null;
      let auditUpdate = {};
      if (reciboData) {
        const sistemaTotal = reciboData.valor_total ?? 0;
        const sistemaTaxas = reciboData.valor_taxas ?? 0;
        const valorVendaReal = Number(row?.valor_venda_real || 0);
        const valorTaxas = Number(row?.valor_taxas || 0);
        const matches = (a, b) => Math.abs(a - b) <= 0.01;
        const diff = (a, b) => Math.round((a - b) * 100) / 100;
        auditUpdate = {
          sistema_valor_total: sistemaTotal,
          sistema_valor_taxas: sistemaTaxas,
          match_total: matches(valorVendaReal, sistemaTotal),
          match_taxas: matches(valorTaxas, sistemaTaxas),
          diff_total: diff(valorVendaReal, sistemaTotal),
          diff_taxas: diff(valorTaxas, sistemaTaxas)
        };
      }
      return {
        ...row,
        ...auditUpdate,
        is_nao_comissionavel: (vendaId ? flaggedVendas.has(vendaId) : false) || Number(row?.valor_nao_comissionavel || 0) > 0
      };
    });
    return json(rows, {
      headers: {
        "Cache-Control": "private, max-age=5",
        Vary: "Cookie"
      }
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao listar conciliacao.");
  }
}
export {
  GET
};
