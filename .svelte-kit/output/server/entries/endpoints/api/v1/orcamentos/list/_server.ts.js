import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds, f as resolveAccessibleClientIds, t as toErrorResponse, c as toISODateLocal, j as getMonthRange, n as normalizeText } from "../../../../../../chunks/v1.js";
function addDays(isoDate, days) {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
function deriveStatus(row) {
  const status = normalizeText(row.status_negociacao || row.status);
  if (status.includes("fech")) return "fechado";
  if (status.includes("aprov")) return "aprovado";
  if (status.includes("rejeit")) return "rejeitado";
  if (status.includes("expir")) return "expirado";
  if (status.includes("enviado") || status.includes("confirm")) return "enviado";
  if (status.includes("novo")) return "novo";
  return "pendente";
}
function getPeriodoFilter(periodo) {
  if (!periodo) return null;
  const hoje = /* @__PURE__ */ new Date();
  const hojeStr = toISODateLocal(hoje);
  switch (periodo) {
    case "hoje": {
      return { from: hojeStr, to: hojeStr };
    }
    case "semana": {
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      return { from: toISODateLocal(inicioSemana), to: hojeStr };
    }
    case "mes": {
      const { inicio, fim } = getMonthRange(hoje);
      return { from: inicio, to: fim };
    }
    case "mes_passado": {
      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const { inicio, fim } = getMonthRange(mesPassado);
      return { from: inicio, to: fim };
    }
    default:
      return null;
  }
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["orcamentos", "vendas"], 1, "Sem acesso a Orcamentos.");
    }
    const searchParams = event.url.searchParams;
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("company_id"));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, searchParams.get("vendedor_ids"));
    const clientIds = await resolveAccessibleClientIds(client, { companyIds, vendedorIds });
    const statusFilter = searchParams.get("status");
    const periodoFilter = getPeriodoFilter(searchParams.get("periodo"));
    let query = client.from("quote").select(`
        id,
        created_at,
        status,
        status_negociacao,
        total,
        currency,
        client_id,
        created_by,
        last_interaction_at,
        last_interaction_notes,
        cliente:client_id (id, nome, cpf, email)
      `).order("created_at", { ascending: false }).limit(500);
    if (vendedorIds.length > 0) {
      query = query.in("created_by", vendedorIds);
    } else if (companyIds.length > 0) {
      if (clientIds.length === 0) {
        return json([]);
      }
      query = query.in("client_id", clientIds);
    }
    if (periodoFilter?.from && periodoFilter?.to) {
      query = query.gte("created_at", periodoFilter.from).lte("created_at", periodoFilter.to + "T23:59:59");
    }
    let { data, error: queryError } = await query;
    if (queryError) {
      console.error("[orcamentos/list] Erro na query com join:", queryError.message);
      let fallbackQuery = client.from("quote").select("id, created_at, status, status_negociacao, total, currency, client_id, created_by, last_interaction_at, last_interaction_notes").order("created_at", { ascending: false }).limit(500);
      if (vendedorIds.length > 0) fallbackQuery = fallbackQuery.in("created_by", vendedorIds);
      else if (companyIds.length > 0 && clientIds.length > 0) fallbackQuery = fallbackQuery.in("client_id", clientIds);
      if (periodoFilter?.from && periodoFilter?.to) {
        fallbackQuery = fallbackQuery.gte("created_at", periodoFilter.from).lte("created_at", periodoFilter.to + "T23:59:59");
      }
      const fallback = await fallbackQuery;
      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }
    const clientIdsFromData = Array.from(new Set(
      (data || []).map((row) => String(row.client_id || "").trim()).filter(Boolean)
    ));
    const clienteMap = /* @__PURE__ */ new Map();
    if (clientIdsFromData.length > 0) {
      const { data: clientesData } = await client.from("clientes").select("id, nome, email").in("id", clientIdsFromData).limit(500);
      (clientesData || []).forEach((c) => {
        clienteMap.set(String(c.id || ""), { nome: String(c.nome || "Cliente"), email: String(c.email || "") });
      });
    }
    const quoteIds = (data || []).map((row) => String(row.id || "").trim()).filter(Boolean);
    const quoteItemsMap = /* @__PURE__ */ new Map();
    if (quoteIds.length > 0) {
      let quoteItems = [];
      const withCity = await client.from("quote_item").select("id, quote_id, title, product_name, item_type, total_amount, order_index, city_name").in("quote_id", quoteIds).order("order_index", { ascending: true }).limit(5e3);
      if (withCity.error) {
        const fallback = await client.from("quote_item").select("id, quote_id, title, product_name, item_type, total_amount, order_index").in("quote_id", quoteIds).order("order_index", { ascending: true }).limit(5e3);
        if (fallback.error) throw fallback.error;
        quoteItems = fallback.data || [];
      } else {
        quoteItems = withCity.data || [];
      }
      quoteItems.forEach((item) => {
        const quoteId = String(item.quote_id || "").trim();
        if (!quoteId) return;
        const current = quoteItemsMap.get(quoteId) || [];
        current.push(item);
        quoteItemsMap.set(quoteId, current);
      });
    }
    const creatorIds = Array.from(
      new Set(
        (data || []).map((row) => String(row.created_by || "").trim()).filter(Boolean)
      )
    );
    const creatorMap = /* @__PURE__ */ new Map();
    if (creatorIds.length > 0) {
      const { data: creators } = await client.from("users").select("id, nome_completo, email").in("id", creatorIds).limit(500);
      (creators || []).forEach((row) => {
        const id = String(row?.id || "").trim();
        if (!id) return;
        creatorMap.set(id, {
          nome: String(row?.nome_completo || "Equipe VTUR"),
          email: String(row?.email || "")
        });
      });
    }
    let items = (data || []).map((row) => {
      const quoteItems = quoteItemsMap.get(String(row.id || "").trim()) || [];
      const firstItem = quoteItems[0] || null;
      const itensCount = quoteItems.length;
      const vendedor = creatorMap.get(String(row.created_by || "").trim());
      const status = deriveStatus(row);
      return {
        id: row.id,
        codigo: `ORC-${row.id.slice(0, 8).toUpperCase()}`,
        cliente: String(row.cliente?.nome || clienteMap.get(String(row.client_id || ""))?.nome || "Cliente sem nome"),
        cliente_id: String(row.client_id || ""),
        cliente_email: String(row.cliente?.email || clienteMap.get(String(row.client_id || ""))?.email || ""),
        destino: String(
          firstItem?.city_name || firstItem?.product_name || firstItem?.title || "Orçamento sem itens"
        ),
        data_criacao: row.created_at?.slice(0, 10) || null,
        data_validade: addDays(row.created_at, 30),
        valor_total: Number(row.total || 0),
        status,
        status_negociacao: row.status_negociacao || row.status,
        vendedor: vendedor?.nome || "Equipe VTUR",
        vendedor_id: String(row.created_by || ""),
        origem: "manual",
        quantidade_itens: itensCount,
        currency: row.currency || "BRL",
        last_interaction_at: row.last_interaction_at || null,
        last_interaction_notes: row.last_interaction_notes || null
      };
    });
    if (statusFilter) {
      items = items.filter((item) => item.status === statusFilter);
    }
    return json(items);
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar orcamentos.");
  }
}
export {
  GET
};
