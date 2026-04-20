import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, p as parseIntSafe, t as toErrorResponse } from "../../../../../../chunks/v1.js";
import { r as resolveClienteScopedFilters, i as isBirthdayToday, d as deriveClienteStatus, f as formatDocumentoDisplay, m as matchesClienteBusca } from "../../../../../../chunks/clientes.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["clientes", "clientes_consulta"], 1, "Sem acesso a Clientes.");
    }
    const { searchParams } = event.url;
    const page = parseIntSafe(searchParams.get("page"), 1);
    const pageSize = Math.min(200, parseIntSafe(searchParams.get("pageSize"), 20));
    const all = String(searchParams.get("all") || "").trim() === "1";
    const busca = String(searchParams.get("busca") || "").trim();
    const { companyIds, vendedorIds, accessibleClientIds } = await resolveClienteScopedFilters(
      client,
      scope,
      searchParams.get("empresa_id"),
      searchParams.get("vendedor_ids")
    );
    if (accessibleClientIds && accessibleClientIds.length === 0) {
      return json({
        page,
        pageSize,
        total: 0,
        items: []
      });
    }
    let clientsQuery = client.from("clientes").select(
      "id, nome, cpf, nascimento, telefone, email, whatsapp, cidade, estado, classificacao, tipo_pessoa, tipo_cliente, tags, active, ativo, company_id, created_at"
    ).order("created_at", { ascending: false }).limit(5e3);
    if (accessibleClientIds) {
      clientsQuery = clientsQuery.in("id", accessibleClientIds);
    }
    const { data: clientsData, error: clientsError } = await clientsQuery;
    if (clientsError) {
      console.error("[clientes/list] Erro na query de clientes:", clientsError);
      throw clientsError;
    }
    const clientIds = (clientsData || []).map((row) => row.id);
    let salesQuery = client.from("vendas").select("cliente_id, data_venda, valor_total").eq("cancelada", false).not("cliente_id", "is", null).limit(5e3);
    if (companyIds.length > 0) {
      salesQuery = salesQuery.in("company_id", companyIds);
    }
    if (vendedorIds.length > 0) {
      salesQuery = salesQuery.in("vendedor_id", vendedorIds);
    }
    if (accessibleClientIds) {
      salesQuery = salesQuery.in("cliente_id", accessibleClientIds);
    }
    const { data: salesData, error: salesError } = await salesQuery;
    if (salesError) {
      console.error("[clientes/list] Erro na query de vendas:", salesError);
      throw salesError;
    }
    let quotesQuery = client.from("quote").select("client_id, created_at, created_by").not("client_id", "is", null).limit(5e3);
    if (clientIds.length > 0) {
      quotesQuery = quotesQuery.in("client_id", clientIds);
    }
    if (vendedorIds.length > 0) {
      quotesQuery = quotesQuery.in("created_by", vendedorIds);
    }
    const { data: quotesData, error: quotesError } = await quotesQuery;
    if (quotesError) {
      console.warn("[clientes/list] Erro ao buscar quotes:", quotesError.message);
    }
    let creatorCompanyMap = /* @__PURE__ */ new Map();
    const creatorIds = Array.from(
      new Set(
        (quotesData || []).map((row) => String(row.created_by || "").trim()).filter(Boolean)
      )
    );
    if (companyIds.length > 0 && creatorIds.length > 0) {
      const { data: creators } = await client.from("users").select("id, company_id").in("id", creatorIds).limit(5e3);
      creatorCompanyMap = new Map(
        (creators || []).map((row) => [
          String(row?.id || "").trim(),
          String(row?.company_id || "").trim()
        ])
      );
    }
    const salesByClient = /* @__PURE__ */ new Map();
    (salesData || []).forEach((row) => {
      const clientId = String(row.cliente_id || "").trim();
      if (!clientId) return;
      const current = salesByClient.get(clientId) || {
        total: 0,
        lastSale: null,
        count: 0
      };
      const saleDate = String(row.data_venda || "").trim() || null;
      const total = Number(row.valor_total || 0);
      salesByClient.set(clientId, {
        total: current.total + total,
        count: current.count + 1,
        lastSale: saleDate && (!current.lastSale || saleDate > current.lastSale) ? saleDate : current.lastSale
      });
    });
    const quotesByClient = /* @__PURE__ */ new Map();
    (quotesData || []).filter((row) => {
      if (companyIds.length === 0) return true;
      const creatorCompany = creatorCompanyMap.get(String(row.created_by || "").trim()) || "";
      return creatorCompany ? companyIds.includes(creatorCompany) : true;
    }).forEach((row) => {
      const clientId = String(row.client_id || "").trim();
      if (!clientId) return;
      const current = quotesByClient.get(clientId) || {
        total: 0,
        lastQuote: null
      };
      const quoteDate = String(row.created_at || "").trim() || null;
      quotesByClient.set(clientId, {
        total: current.total + 1,
        lastQuote: quoteDate && (!current.lastQuote || quoteDate > current.lastQuote) ? quoteDate : current.lastQuote
      });
    });
    const items = (clientsData || []).map((row) => {
      const sales = salesByClient.get(row.id);
      const quotes = quotesByClient.get(row.id);
      const ultimaCompra = sales?.lastSale || null;
      const tags = Array.isArray(row.tags) ? row.tags.filter(Boolean) : [];
      const contato = [row.whatsapp, row.telefone, row.email].filter(Boolean).join(" | ");
      const cidadeUf = [row.cidade, row.estado].filter(Boolean).join("/");
      return {
        id: row.id,
        nome: String(row.nome || "Cliente sem nome"),
        cpf: row.cpf,
        documento: formatDocumentoDisplay(row.cpf),
        email: row.email,
        telefone: row.telefone,
        whatsapp: row.whatsapp,
        contato,
        data_nascimento: row.nascimento,
        cidade: row.cidade,
        estado: row.estado,
        cidade_uf: cidadeUf,
        classificacao: row.classificacao,
        tipo_pessoa: row.tipo_pessoa || (String(row.cpf || "").replace(/\D/g, "").length > 11 ? "PJ" : "PF"),
        tipo_cliente: row.tipo_cliente || "passageiro",
        tags,
        tags_text: tags.join(", "),
        status: deriveClienteStatus(row, ultimaCompra),
        ultima_compra: ultimaCompra,
        total_gasto: Number(sales?.total || 0),
        total_viagens: Number(sales?.count || 0),
        total_orcamentos: Number(quotes?.total || 0),
        aniversario_hoje: isBirthdayToday(row.nascimento),
        ativo: row.ativo !== false,
        created_at: row.created_at
      };
    }).filter(
      (item) => matchesClienteBusca(item, busca, [item.documento, item.contato, item.cidade_uf])
    ).sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
    const paginatedItems = all ? items : items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    return json({
      page,
      pageSize,
      total: items.length,
      items: paginatedItems
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar clientes.");
  }
}
export {
  GET
};
