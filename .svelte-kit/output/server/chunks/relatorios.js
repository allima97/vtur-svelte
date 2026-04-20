async function fetchSalesReportRows(client, params) {
  let query = client.from("vendas").select(`
      id,
      numero_venda,
      cliente_id,
      vendedor_id,
      company_id,
      data_venda,
      data_embarque,
      data_final,
      valor_total,
      valor_taxas,
      cancelada,
      clientes (nome, email),
      vendedor:users!vendedor_id (nome_completo, email),
      destino_cidade:cidades!destino_cidade_id (id, nome),
      destinos:produtos!destino_id (id, nome, tipo_produto),
      recibos:vendas_recibos (
        id,
        valor_total,
        valor_taxas,
        valor_du,
        valor_rav,
        tipo_pacote,
        tipo_produtos (id, nome, tipo),
        produto_resolvido:produtos!produto_resolvido_id (id, nome, tipo_produto, valor_neto, valor_em_reais)
      )
    `).order("data_venda", { ascending: false }).limit(5e3);
  if (!params.includeCancelled) {
    query = query.eq("cancelada", false);
  }
  if (params.dataInicio) {
    query = query.gte("data_venda", params.dataInicio);
  }
  if (params.dataFim) {
    query = query.lte("data_venda", params.dataFim);
  }
  if ((params.companyIds || []).length > 0) {
    query = query.in("company_id", params.companyIds || []);
  }
  if ((params.vendedorIds || []).length > 0) {
    query = query.in("vendedor_id", params.vendedorIds || []);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data || [];
}
async function fetchLatestPaymentForms(client, vendaIds) {
  const ids = vendaIds.filter(Boolean);
  const forms = /* @__PURE__ */ new Map();
  if (ids.length === 0) {
    return forms;
  }
  const { data, error } = await client.from("vendas_pagamentos").select("venda_id, forma_nome, created_at").in("venda_id", ids).order("created_at", { ascending: false }).limit(5e3);
  if (!error) {
    (data || []).forEach((row) => {
      const vendaId = String(row?.venda_id || "").trim();
      if (!vendaId || forms.has(vendaId)) return;
      forms.set(vendaId, normalizeFormaPagamento(row?.forma_nome));
    });
    return forms;
  }
  return forms;
}
function getVendaStatus(row) {
  if (row.cancelada) {
    return "cancelada";
  }
  const todayIso = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (row.data_final && row.data_final < todayIso) {
    return "concluida";
  }
  if (row.data_embarque && row.data_embarque >= todayIso) {
    return "confirmada";
  }
  return "pendente";
}
function getVendaCodigo(row) {
  const code = String(row.numero_venda || "").trim();
  return code || `VD-${row.id.slice(0, 8).toUpperCase()}`;
}
function getVendaClienteNome(row) {
  return String(row.clientes?.nome || "Cliente sem nome");
}
function getVendaClienteEmail(row) {
  return String(row.clientes?.email || "").trim() || null;
}
function getVendaVendedorNome(row) {
  return String(row.vendedor?.nome_completo || row.vendedor?.email || "Equipe VTUR");
}
function getVendaDestino(row) {
  return String(row.destinos?.nome || row.destino_cidade?.nome || "Destino nao informado");
}
function getVendaCommission(row) {
  const recibos = Array.isArray(row.recibos) ? row.recibos : [];
  const totalTaxas = recibos.reduce((sum, recibo) => sum + Number(recibo?.valor_taxas || 0), 0);
  return totalTaxas > 0 ? totalTaxas : Number(row.valor_taxas || 0);
}
function getReceiptProductDescriptor(receipt, fallback) {
  const produto = String(
    receipt?.produto_resolvido?.nome || receipt?.tipo_produtos?.nome || receipt?.tipo_pacote || fallback?.destinos?.nome || "Produto nao informado"
  );
  const tipo = String(
    receipt?.tipo_produtos?.tipo || receipt?.tipo_produtos?.nome || fallback?.destinos?.tipo_produto || "Produto"
  );
  return { produto, tipo };
}
function normalizeFormaPagamento(value) {
  const normalized = String(value || "").trim().toLowerCase();
  switch (normalized) {
    case "avista":
    case "a_vista":
      return "A vista";
    case "pix":
      return "PIX";
    case "cartao":
    case "cartao_credito":
    case "cartao de credito":
      return "Cartao";
    case "boleto":
      return "Boleto";
    case "transferencia":
    case "transferencia_bancaria":
      return "Transferencia";
    default:
      return String(value || "").trim() || "Nao informado";
  }
}
function getCurrentYearRange() {
  const today = /* @__PURE__ */ new Date();
  return {
    dataInicio: `${today.getFullYear()}-01-01`,
    dataFim: today.toISOString().slice(0, 10)
  };
}
function monthSpanInclusive(startIso, endIso) {
  if (!startIso || !endIso) return 1;
  const [startYear, startMonth] = startIso.split("-").map(Number);
  const [endYear, endMonth] = endIso.split("-").map(Number);
  if (!startYear || !startMonth || !endYear || !endMonth) {
    return 1;
  }
  return Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
}
function getClienteCategoria(totalCompras, totalGasto) {
  if (totalGasto >= 3e4 || totalCompras >= 5) {
    return "VIP";
  }
  if (totalGasto >= 1e4 || totalCompras >= 3) {
    return "Regular";
  }
  return "Ocasional";
}
export {
  getVendaVendedorNome as a,
  getVendaClienteNome as b,
  getCurrentYearRange as c,
  getVendaClienteEmail as d,
  getClienteCategoria as e,
  fetchSalesReportRows as f,
  getVendaCommission as g,
  getVendaDestino as h,
  getVendaStatus as i,
  getReceiptProductDescriptor as j,
  fetchLatestPaymentForms as k,
  getVendaCodigo as l,
  monthSpanInclusive as m
};
