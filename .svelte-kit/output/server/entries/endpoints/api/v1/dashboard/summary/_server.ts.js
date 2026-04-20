import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, j as getMonthRange, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds, k as hasModuloAccess, f as resolveAccessibleClientIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function toNum(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}
function toDateKey(value) {
  return String(value || "").slice(0, 10);
}
function isInRange(date, inicio, fim) {
  if (!date) return false;
  return date >= inicio && date <= fim;
}
function getReceipts(row) {
  return Array.isArray(row.recibos) ? row.recibos : [];
}
function isSeguro(recibo) {
  if (recibo._conciliacao_is_seguro) return true;
  const tipo = String(recibo?.tipo_produtos?.tipo || "").toLowerCase();
  const nome = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || "").toLowerCase();
  return tipo.includes("seguro") || nome.includes("seguro");
}
function isConciliacaoEfetivada(status, descricao) {
  const normalize = (v) => String(v || "").normalize("NFD").replace(new RegExp("\\p{Diacritic}", "gu"), "").toUpperCase();
  const s = normalize(status);
  const d = normalize(descricao);
  return s.includes("BAIXA") || d.includes("BAIXA");
}
function getReciboAllocations(recibo, vendedorId, scopeVendedorIds) {
  const rateioArr = Array.isArray(recibo?.rateio) ? recibo.rateio : [];
  const rateioAtivo = rateioArr.find((r) => r?.ativo !== false) ?? null;
  let base;
  if (rateioAtivo && rateioAtivo.vendedor_origem_id && rateioAtivo.vendedor_destino_id && (rateioAtivo.percentual_origem ?? 0) > 0 && (rateioAtivo.percentual_destino ?? 0) > 0) {
    base = [
      {
        vendedorId: String(rateioAtivo.vendedor_origem_id),
        fator: Math.max(0, Math.min(1, toNum(rateioAtivo.percentual_origem) / 100))
      },
      {
        vendedorId: String(rateioAtivo.vendedor_destino_id),
        fator: Math.max(0, Math.min(1, toNum(rateioAtivo.percentual_destino) / 100))
      }
    ];
  } else {
    base = [{ vendedorId, fator: 1 }];
  }
  if (scopeVendedorIds.size > 0) {
    return base.filter((a) => scopeVendedorIds.has(a.vendedorId));
  }
  return base;
}
async function fetchConciliacaoSobrepoePorCompany(client, companyIds) {
  if (companyIds.length === 0) return /* @__PURE__ */ new Set();
  try {
    let q = client.from("parametros_comissao").select("company_id").eq("conciliacao_sobrepoe_vendas", true);
    q = companyIds.length === 1 ? q.eq("company_id", companyIds[0]) : q.in("company_id", companyIds);
    const { data, error } = await q;
    if (error) return /* @__PURE__ */ new Set();
    return new Set((data || []).map((r) => String(r?.company_id || "")).filter(Boolean));
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
async function fetchConciliacaoOverrides(client, companyIds, inicio, fim, knownReciboIds) {
  const result = /* @__PURE__ */ new Map();
  if (companyIds.length === 0) return result;
  try {
    let q = client.from("conciliacao_recibos").select("id, venda_recibo_id, movimento_data, status, descricao, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_venda_real, is_seguro_viagem").neq("is_baixa_rac", true).gte("movimento_data", inicio).lte("movimento_data", fim).not("venda_recibo_id", "is", null).limit(5e3);
    q = companyIds.length === 1 ? q.eq("company_id", companyIds[0]) : q.in("company_id", companyIds);
    if (knownReciboIds.length > 0 && knownReciboIds.length <= 500) {
      q = q.in("venda_recibo_id", knownReciboIds);
    }
    const { data, error } = await q;
    if (error || !data) return result;
    const byReciboId = /* @__PURE__ */ new Map();
    for (const row of data) {
      const reciboId = String(row?.venda_recibo_id || "").trim();
      if (!reciboId) continue;
      if (!byReciboId.has(reciboId)) byReciboId.set(reciboId, []);
      byReciboId.get(reciboId).push(row);
    }
    byReciboId.forEach((rows, reciboId) => {
      const baixas = rows.filter((r) => isConciliacaoEfetivada(r?.status, r?.descricao));
      if (baixas.length === 0) return;
      const sourceRow = baixas.sort(
        (a, b) => String(b?.movimento_data || "").localeCompare(String(a?.movimento_data || ""))
      )[0];
      if (!sourceRow) return;
      const lancamentos = toNum(sourceRow?.valor_lancamentos);
      const taxas = toNum(sourceRow?.valor_taxas);
      const descontos = toNum(sourceRow?.valor_descontos);
      const abatimentos = toNum(sourceRow?.valor_abatimentos);
      const valorVendaReal = toNum(sourceRow?.valor_venda_real);
      const valorBrutoCalculado = Math.max(0, lancamentos - descontos - abatimentos);
      const valorBruto = valorBrutoCalculado > 0 ? valorBrutoCalculado : valorVendaReal > 0 ? valorVendaReal : lancamentos;
      if (valorBruto <= 0) return;
      result.set(reciboId, {
        valorBruto,
        valorTaxas: taxas,
        dataVenda: String(sourceRow?.movimento_data || "").slice(0, 10),
        isSeguro: Boolean(sourceRow?.is_seguro_viagem)
      });
    });
  } catch {
  }
  return result;
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const { searchParams } = event.url;
    const { inicio: defaultInicio, fim: defaultFim } = getMonthRange();
    const inicio = String(searchParams.get("inicio") || defaultInicio).trim();
    const fim = String(searchParams.get("fim") || defaultFim).trim();
    const includeOrcamentos = String(searchParams.get("include_orcamentos") || "1").trim() === "1";
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("company_id"));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, searchParams.get("vendedor_ids"));
    const canOperacao = scope.isAdmin || hasModuloAccess(scope, ["operacao"], 1);
    const canConsultoria = scope.isAdmin || hasModuloAccess(scope, ["consultoria_online", "consultoria"], 1);
    const scopeVendedorIds = new Set(vendedorIds.map((id) => String(id || "").trim()).filter(Boolean));
    let salesQuery = client.from("vendas").select(`
        id,
        vendedor_id,
        cliente_id,
        company_id,
        data_venda,
        data_embarque,
        data_final,
        valor_total,
        valor_taxas,
        cancelada,
        clientes:cliente_id (id, nome),
        destinos:produtos!destino_id (nome),
        destino_cidade:cidades!destino_cidade_id (id, nome),
        recibos:vendas_recibos (
          id,
          data_venda,
          valor_total,
          valor_taxas,
          valor_du,
          valor_rav,
          tipo_produtos (id, nome, tipo),
          produto_resolvido:produtos!produto_resolvido_id (id, nome),
          rateio:vendas_recibos_rateio (
            ativo,
            vendedor_origem_id,
            vendedor_destino_id,
            percentual_origem,
            percentual_destino
          )
        )
      `).eq("cancelada", false).order("data_venda", { ascending: true }).limit(5e3);
    if (companyIds.length > 0) salesQuery = salesQuery.in("company_id", companyIds);
    if (vendedorIds.length > 0) salesQuery = salesQuery.in("vendedor_id", vendedorIds);
    const { data: salesData, error: salesError } = await salesQuery;
    if (salesError) throw salesError;
    let sales = salesData || [];
    if (vendedorIds.length > 0) {
      try {
        let rateioQuery = client.from("vendas_recibos_rateio").select("venda_recibo_id").eq("ativo", true).in("vendedor_destino_id", vendedorIds).not("venda_recibo_id", "is", null);
        if (companyIds.length > 0) rateioQuery = rateioQuery.in("company_id", companyIds);
        const { data: rateioRows, error: rateioErr } = await rateioQuery;
        if (!rateioErr && rateioRows?.length > 0) {
          const splitReciboIds = Array.from(new Set(
            rateioRows.map((r) => String(r?.venda_recibo_id || "").trim()).filter(Boolean)
          ));
          if (splitReciboIds.length > 0) {
            const { data: recibosData, error: recibosErr } = await client.from("vendas_recibos").select("id, venda_id").in("id", splitReciboIds);
            if (!recibosErr && recibosData?.length > 0) {
              const splitVendaIds = Array.from(new Set(
                recibosData.map((r) => String(r?.venda_id || "").trim()).filter(Boolean)
              ));
              const existingIds = new Set(sales.map((s) => s.id));
              const newVendaIds = splitVendaIds.filter((id) => !existingIds.has(id));
              if (newVendaIds.length > 0) {
                const { data: extraSales, error: extraErr } = await client.from("vendas").select(`
                    id, vendedor_id, cliente_id, company_id, data_venda, data_embarque, data_final,
                    valor_total, valor_taxas, cancelada,
                    clientes:cliente_id (id, nome),
                    destinos:produtos!destino_id (nome),
                    destino_cidade:cidades!destino_cidade_id (id, nome),
                    recibos:vendas_recibos (
                      id, data_venda, valor_total, valor_taxas, valor_du, valor_rav,
                      tipo_produtos (id, nome, tipo),
                      produto_resolvido:produtos!produto_resolvido_id (id, nome),
                      rateio:vendas_recibos_rateio (
                        ativo, vendedor_origem_id, vendedor_destino_id, percentual_origem, percentual_destino
                      )
                    )
                  `).in("id", newVendaIds).eq("cancelada", false);
                if (!extraErr && extraSales) {
                  sales = [...sales, ...extraSales];
                }
              }
            }
          }
        }
      } catch {
      }
    }
    const conciliacaoCompanyIds = await fetchConciliacaoSobrepoePorCompany(client, companyIds);
    let conciliacaoOverrides = /* @__PURE__ */ new Map();
    if (conciliacaoCompanyIds.size > 0) {
      const overrideCompanyIds = Array.from(conciliacaoCompanyIds);
      const allReciboIds = [];
      sales.forEach((venda) => {
        if (!conciliacaoCompanyIds.has(String(venda.company_id || ""))) return;
        getReceipts(venda).forEach((recibo) => {
          const id = String(recibo?.id || "").trim();
          if (id) allReciboIds.push(id);
        });
      });
      conciliacaoOverrides = await fetchConciliacaoOverrides(
        client,
        overrideCompanyIds,
        inicio,
        fim,
        allReciboIds
      );
      if (conciliacaoOverrides.size > 0) {
        sales = sales.map((venda) => {
          const recibos = getReceipts(venda);
          if (recibos.length === 0) return venda;
          const updatedRecibos = recibos.map((recibo) => {
            const reciboId = String(recibo?.id || "").trim();
            if (!reciboId) return recibo;
            const override = conciliacaoOverrides.get(reciboId);
            if (!override) return recibo;
            return {
              ...recibo,
              _conciliacao_valor_bruto: override.valorBruto,
              _conciliacao_valor_taxas: override.valorTaxas,
              _conciliacao_data_venda: override.dataVenda,
              _conciliacao_is_seguro: override.isSeguro
            };
          });
          return { ...venda, recibos: updatedRecibos };
        });
      }
    }
    let totalVendas = 0;
    let totalTaxas = 0;
    let totalSeguro = 0;
    let qtdVendas = 0;
    const timelineMap = /* @__PURE__ */ new Map();
    const destinoMap = /* @__PURE__ */ new Map();
    const produtoMap = /* @__PURE__ */ new Map();
    sales.forEach((row) => {
      const vendedorId = String(row.vendedor_id || "");
      const vendaDate = toDateKey(row.data_venda);
      const destinoNome = String(row.destinos?.nome || row.destino_cidade?.nome || "Destino nao informado");
      const recibos = getReceipts(row);
      if (recibos.length === 0) {
        if (!isInRange(vendaDate, inicio, fim)) return;
        const valorTotal = toNum(row.valor_total);
        if (valorTotal <= 0) return;
        totalVendas += valorTotal;
        totalTaxas += toNum(row.valor_taxas);
        qtdVendas += 1;
        if (vendaDate) timelineMap.set(vendaDate, (timelineMap.get(vendaDate) || 0) + valorTotal);
        destinoMap.set(destinoNome, (destinoMap.get(destinoNome) || 0) + valorTotal);
        const cur = produtoMap.get("sem-produto") || { id: "sem-produto", name: "Produto", value: 0 };
        produtoMap.set("sem-produto", { ...cur, value: cur.value + valorTotal });
        return;
      }
      const recibosPeriodo = recibos.filter((recibo) => {
        const reciboDate = recibo._conciliacao_data_venda || toDateKey(recibo.data_venda) || vendaDate;
        return isInRange(reciboDate, inicio, fim);
      });
      if (recibosPeriodo.length === 0) return;
      let countedVenda = false;
      recibosPeriodo.forEach((recibo) => {
        const reciboDate = recibo._conciliacao_data_venda || toDateKey(recibo.data_venda) || vendaDate;
        const allocations = getReciboAllocations(recibo, vendedorId, scopeVendedorIds);
        if (allocations.length === 0) return;
        const bruto = recibo._conciliacao_valor_bruto != null ? recibo._conciliacao_valor_bruto : toNum(recibo.valor_total);
        const taxas = recibo._conciliacao_valor_taxas != null ? recibo._conciliacao_valor_taxas : toNum(recibo.valor_taxas) + toNum(recibo.valor_du) + toNum(recibo.valor_rav);
        allocations.forEach((alloc) => {
          const brutoAlloc = bruto * alloc.fator;
          const taxasAlloc = taxas * alloc.fator;
          if (brutoAlloc <= 0 && taxasAlloc <= 0) return;
          totalVendas += brutoAlloc;
          totalTaxas += taxasAlloc;
          if (!countedVenda) {
            qtdVendas += 1;
            countedVenda = true;
          }
          if (reciboDate) timelineMap.set(reciboDate, (timelineMap.get(reciboDate) || 0) + brutoAlloc);
          destinoMap.set(destinoNome, (destinoMap.get(destinoNome) || 0) + brutoAlloc);
          if (isSeguro(recibo)) totalSeguro += brutoAlloc;
          const productId = String(recibo?.tipo_produtos?.id || recibo?.produto_resolvido?.id || "sem-produto");
          const productName = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || "Produto");
          const curProd = produtoMap.get(productId) || { id: productId, name: productName, value: 0 };
          produtoMap.set(productId, { ...curProd, value: curProd.value + brutoAlloc });
        });
      });
    });
    let metasQuery = client.from("metas_vendedor").select("id, vendedor_id, periodo, meta_geral, meta_diferenciada, ativo, scope").eq("ativo", true).gte("periodo", inicio).lte("periodo", fim).limit(500);
    if (vendedorIds.length > 0) metasQuery = metasQuery.in("vendedor_id", vendedorIds);
    const { data: metasData, error: metasError } = await metasQuery;
    if (metasError) throw metasError;
    let orcamentos = [];
    if (includeOrcamentos) {
      let quotesQuery = client.from("quote").select(`
          id, created_at, status, status_negociacao, total, client_id,
          cliente:client_id (id, nome),
          quote_item (id, title, product_name, item_type, city_name)
        `).gte("created_at", `${inicio}T00:00:00`).lte("created_at", `${fim}T23:59:59.999`).order("created_at", { ascending: false }).limit(20);
      if (vendedorIds.length > 0) {
        quotesQuery = quotesQuery.in("created_by", vendedorIds);
      } else if (companyIds.length > 0) {
        const clientIds = await resolveAccessibleClientIds(client, { companyIds, vendedorIds: [] });
        if (clientIds.length === 0) {
          return json({
            inicio,
            fim,
            userCtx: { usuarioId: user.id, nome: scope.nome, papel: scope.papel, vendedorIds },
            podeVerOperacao: canOperacao,
            podeVerConsultoria: canConsultoria,
            vendasAgg: {
              totalVendas,
              totalTaxas,
              totalLiquido: totalVendas - totalTaxas,
              totalSeguro,
              qtdVendas,
              ticketMedio: qtdVendas > 0 ? totalVendas / qtdVendas : 0,
              timeline: Array.from(timelineMap.entries()).map(([date, value]) => ({ date, value })),
              topDestinos: Array.from(destinoMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
              porProduto: Array.from(produtoMap.values()).sort((a, b) => b.value - a.value).slice(0, 6)
            },
            metas: metasData || [],
            orcamentos: [],
            widgetPrefs: []
          });
        }
        quotesQuery = quotesQuery.in("client_id", clientIds);
      }
      const { data: quotesData, error: quotesError } = await quotesQuery;
      if (quotesError) throw quotesError;
      orcamentos = quotesData || [];
    }
    const { data: widgetPrefsData } = await client.from("dashboard_widgets").select("widget, ordem, visivel, settings").eq("usuario_id", user.id).order("ordem", { ascending: true }).limit(100);
    return json({
      inicio,
      fim,
      userCtx: { usuarioId: user.id, nome: scope.nome, papel: scope.papel, vendedorIds },
      podeVerOperacao: canOperacao,
      podeVerConsultoria: canConsultoria,
      vendasAgg: {
        totalVendas,
        totalTaxas,
        totalLiquido: totalVendas - totalTaxas,
        totalSeguro,
        qtdVendas,
        ticketMedio: qtdVendas > 0 ? totalVendas / qtdVendas : 0,
        timeline: Array.from(timelineMap.entries()).map(([date, value]) => ({ date, value })),
        topDestinos: Array.from(destinoMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
        porProduto: Array.from(produtoMap.values()).sort((a, b) => b.value - a.value).slice(0, 6)
      },
      metas: metasData || [],
      orcamentos,
      widgetPrefs: widgetPrefsData || []
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar dashboard.");
  }
}
export {
  GET
};
