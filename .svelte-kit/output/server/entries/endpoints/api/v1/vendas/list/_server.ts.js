import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, p as parseIntSafe, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds, f as resolveAccessibleClientIds, t as toErrorResponse, n as normalizeText } from "../../../../../../chunks/v1.js";
function deriveVendaStatus(row) {
  if (row.cancelada) return "cancelada";
  const todayIso = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (row.data_final && row.data_final < todayIso) return "concluida";
  if (row.data_embarque && row.data_embarque >= todayIso) return "confirmada";
  return "pendente";
}
function deriveVendaTipo(row) {
  const firstReceipt = Array.isArray(row.recibos) ? row.recibos[0] : null;
  const reference = normalizeText(
    [firstReceipt?.tipo_pacote, firstReceipt?.tipo_produtos?.nome, firstReceipt?.tipo_produtos?.tipo].join(" ")
  );
  if (reference.includes("seguro") || reference.includes("servico")) return "servico";
  if (reference.includes("hotel") || reference.includes("resort")) return "hotel";
  if (reference.includes("passagem") || reference.includes("aereo") || reference.includes("fretamento") || reference.includes("transporte")) return "passagem";
  return "pacote";
}
function getReceipts(row) {
  return Array.isArray(row.recibos) ? row.recibos : [];
}
function deriveValorTotal(row) {
  const recibos = getReceipts(row);
  if (recibos.length > 0) {
    const totalRecibos = recibos.reduce((sum, recibo) => sum + Number(recibo?.valor_total || 0), 0);
    if (totalRecibos > 0) return totalRecibos;
  }
  return Number(row.valor_total || 0);
}
function deriveValorTotalBruto(row) {
  const valorBruto = Number(row.valor_total_bruto || 0);
  if (valorBruto > 0) return valorBruto;
  return deriveValorTotal(row);
}
function deriveValorTaxas(row) {
  const recibos = getReceipts(row);
  const taxasRecibos = recibos.reduce((sum, recibo) => {
    return sum + Number(recibo?.valor_taxas || 0) + Number(recibo?.valor_du || 0) + Number(recibo?.valor_rav || 0);
  }, 0);
  const valorTaxasBase = Number(row.valor_taxas || 0);
  return valorTaxasBase > 0 ? valorTaxasBase : taxasRecibos;
}
function deriveConciliado(row) {
  const recibos = getReceipts(row);
  if (recibos.length === 0) return null;
  const allPositive = recibos.every((recibo) => Number(recibo?.valor_total || 0) > 0);
  return allPositive;
}
function formatVendaItem(row) {
  const recibos = getReceipts(row);
  const totalSeguro = recibos.reduce((sum, recibo) => {
    const tipo = String(recibo?.tipo_produtos?.tipo || "").toLowerCase();
    const nome = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || "").toLowerCase();
    const isSeguro = tipo.includes("seguro") || nome.includes("seguro");
    return sum + (isSeguro ? Number(recibo?.valor_total || 0) : 0);
  }, 0);
  const produtos = recibos.map((recibo) => String(recibo?.produto_resolvido?.nome || recibo?.tipo_produtos?.nome || "").trim()).filter(Boolean);
  const destinoNome = String(row.destinos?.nome || "").trim();
  const cidadeDestino = String(row.destino_cidade?.nome || "").trim();
  return {
    id: row.id,
    codigo: String(row.numero_venda || "").trim() || `VD-${row.id.slice(0, 8).toUpperCase()}`,
    cliente: String(row.clientes?.nome || "Cliente sem nome"),
    cliente_id: String(row.cliente_id || ""),
    vendedor_id: String(row.vendedor_id || ""),
    destino: destinoNome || cidadeDestino || "Destino nao informado",
    destino_cidade: cidadeDestino || "-",
    data_venda: row.data_venda,
    data_embarque: row.data_embarque,
    data_final: row.data_final,
    valor_total: deriveValorTotal(row),
    valor_total_bruto: deriveValorTotalBruto(row),
    valor_taxas: deriveValorTaxas(row),
    status: deriveVendaStatus(row),
    vendedor: String(row.vendedor?.nome_completo || "Equipe VTUR"),
    tipo: deriveVendaTipo(row),
    recibos: recibos.map((recibo) => String(recibo?.numero_recibo || recibo?.numero_reserva || "").trim()).filter(Boolean),
    produtos,
    conciliado: deriveConciliado(row),
    total_seguro: totalSeguro
  };
}
function matchesBusca(item, busca, campo) {
  if (!busca) return true;
  const query = normalizeText(busca);
  const matchCliente = normalizeText(item.cliente).includes(query);
  const matchVendedor = normalizeText(item.vendedor).includes(query);
  const matchDestino = normalizeText([item.destino, item.destino_cidade].join(" ")).includes(query);
  const matchProduto = item.produtos.some((produto) => normalizeText(produto).includes(query));
  const matchRecibo = item.recibos.some((recibo) => normalizeText(recibo).includes(query));
  switch (campo) {
    case "cliente":
      return matchCliente;
    case "vendedor":
      return matchVendedor;
    case "destino":
      return matchDestino;
    case "produto":
      return matchProduto;
    case "recibo":
      return matchRecibo;
    default:
      return matchCliente || matchVendedor || matchDestino || matchProduto || matchRecibo || normalizeText(item.codigo).includes(query);
  }
}
function computeKpisFromRows(rows) {
  let totalVendas = 0;
  let totalTaxas = 0;
  let totalSeguro = 0;
  for (const row of rows) {
    const recibos = getReceipts(row);
    if (recibos.length > 0) {
      totalVendas += recibos.reduce((sum, recibo) => sum + Number(recibo?.valor_total || 0), 0);
      totalTaxas += recibos.reduce(
        (sum, recibo) => sum + Number(recibo?.valor_taxas || 0) + Number(recibo?.valor_du || 0) + Number(recibo?.valor_rav || 0),
        0
      );
      totalSeguro += recibos.reduce((sum, recibo) => {
        const tipo = String(recibo?.tipo_produtos?.tipo || "").toLowerCase();
        const nome = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || "").toLowerCase();
        const isSeguro = tipo.includes("seguro") || nome.includes("seguro");
        return sum + (isSeguro ? Number(recibo?.valor_total || 0) : 0);
      }, 0);
      continue;
    }
    totalVendas += Number(row.valor_total || 0);
    totalTaxas += Number(row.valor_taxas || 0);
  }
  return {
    totalVendas,
    totalTaxas,
    totalLiquido: totalVendas - totalTaxas,
    totalSeguro
  };
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["vendas_consulta", "vendas"], 1, "Sem acesso a Vendas.");
    }
    const { searchParams } = event.url;
    const inicio = String(searchParams.get("inicio") || "").trim();
    const fim = String(searchParams.get("fim") || "").trim();
    const page = parseIntSafe(searchParams.get("page"), 1);
    const pageSize = Math.min(200, parseIntSafe(searchParams.get("pageSize"), 20));
    const all = String(searchParams.get("all") || "").trim() === "1";
    const openId = String(searchParams.get("id") || "").trim();
    const includeKpis = String(searchParams.get("include_kpis") || "").trim() === "1" || String(searchParams.get("kpis") || "").trim() === "1";
    const includeVendedores = String(searchParams.get("include_vendedores") || "").trim() === "1";
    const searchQuery = String(searchParams.get("q") || "").trim();
    const campoBusca = String(searchParams.get("campo") || "todos").trim().toLowerCase() || "todos";
    const statusQuery = String(searchParams.get("status") || "").trim().toLowerCase();
    const tipoQuery = String(searchParams.get("tipo") || "").trim().toLowerCase();
    const clienteId = String(searchParams.get("cliente_id") || "").trim();
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("company_id") || searchParams.get("empresa_id"));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, searchParams.get("vendedor_ids") || searchParams.get("vendedor_id"));
    const accessibleClientIds = !scope.isAdmin ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds }) : [];
    let query = client.from("vendas").select(`
        id,
        numero_venda,
        vendedor_id,
        cliente_id,
        company_id,
        data_venda,
        data_embarque,
        data_final,
        valor_total,
        valor_total_bruto,
        valor_taxas,
        cancelada,
        clientes (nome, whatsapp),
        vendedor:users!vendedor_id (nome_completo),
        destino_cidade:cidades!destino_cidade_id (id, nome),
        destinos:produtos!destino_id (nome, cidade_id),
        recibos:vendas_recibos (
          id,
          numero_recibo,
          numero_reserva,
          tipo_pacote,
          valor_total,
          valor_taxas,
          valor_du,
          valor_rav,
          data_inicio,
          data_fim,
          tipo_produtos (id, nome, tipo),
          produto_resolvido:produtos!produto_resolvido_id (id, nome)
        )
      `).order("data_venda", { ascending: false }).limit(5e3);
    if (openId) query = query.eq("id", openId);
    if (inicio) query = query.gte("data_venda", inicio);
    if (fim) query = query.lte("data_venda", fim);
    if (companyIds.length > 0) query = query.in("company_id", companyIds);
    if (vendedorIds.length > 0) query = query.in("vendedor_id", vendedorIds);
    if (clienteId) query = query.eq("cliente_id", clienteId);
    else if (!scope.isAdmin && accessibleClientIds.length > 0) query = query.in("cliente_id", accessibleClientIds);
    const { data, error: queryError } = await query;
    if (queryError) throw queryError;
    const items = (data || []).map((row) => formatVendaItem(row)).filter((item) => statusQuery ? item.status === statusQuery : true).filter((item) => tipoQuery ? item.tipo === tipoQuery : true).filter((item) => matchesBusca(item, searchQuery, campoBusca));
    const payloadItems = all || openId ? items : items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    let vendedores = [];
    if (includeVendedores) {
      let usersQuery = client.from("users").select("id, nome_completo, user_types (name)").limit(1e3);
      if (!scope.isAdmin && companyIds.length > 0) {
        usersQuery = usersQuery.in("company_id", companyIds);
      }
      const { data: usersData } = await usersQuery;
      vendedores = (usersData || []).filter((row) => {
        const userType = Array.isArray(row?.user_types) ? row.user_types[0] : row?.user_types;
        const name = String(userType?.name || "").toUpperCase();
        return name.includes("VENDEDOR") || name.includes("GESTOR") || name.includes("MASTER") || name.includes("ADMIN");
      }).map((row) => ({
        id: String(row.id || ""),
        nome_completo: String(row.nome_completo || row.email || "Usuário sem nome")
      })).filter((row) => row.id).sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"));
    }
    return json({
      page,
      pageSize,
      total: items.length,
      items: payloadItems,
      ...includeKpis ? { kpis: computeKpisFromRows(data || []) } : {},
      ...includeVendedores ? { vendedores } : {}
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar vendas.");
  }
}
export {
  GET
};
