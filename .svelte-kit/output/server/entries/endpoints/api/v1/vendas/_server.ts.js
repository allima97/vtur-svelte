import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds, f as resolveAccessibleClientIds, t as toErrorResponse, n as normalizeText } from "../../../../../chunks/v1.js";
function deriveStatus(row) {
  if (row.cancelada) return "cancelada";
  const todayIso = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (row.data_final && row.data_final < todayIso) return "concluida";
  if (row.data_embarque && row.data_embarque >= todayIso) return "confirmada";
  return "pendente";
}
function deriveTipo(row) {
  const first = Array.isArray(row.recibos) ? row.recibos[0] : null;
  const ref = normalizeText(first?.tipo_pacote || "");
  if (ref.includes("seguro") || ref.includes("servico")) return "servico";
  if (ref.includes("hotel") || ref.includes("resort")) return "hotel";
  if (ref.includes("passagem") || ref.includes("aereo") || ref.includes("transporte")) return "passagem";
  return "pacote";
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["vendas_consulta", "vendas"], 1, "Sem acesso a Vendas.");
    }
    const searchParams = event.url.searchParams;
    const clienteId = String(searchParams.get("cliente_id") || "").trim();
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("company_id") || searchParams.get("empresa_id"));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, searchParams.get("vendedor_ids") || searchParams.get("vendedor_id"));
    const accessibleClientIds = !scope.isAdmin ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds }) : [];
    let query = client.from("vendas").select(`
        id,
        numero_venda,
        cliente_id,
        company_id,
        vendedor_id,
        data_venda,
        data_embarque,
        data_final,
        valor_total,
        cancelada,
        clientes (nome),
        recibos:vendas_recibos (valor_taxas, tipo_pacote, numero_recibo, numero_reserva)
      `).order("data_venda", { ascending: false }).limit(5e3);
    if (companyIds.length > 0) query = query.in("company_id", companyIds);
    if (vendedorIds.length > 0) query = query.in("vendedor_id", vendedorIds);
    if (clienteId) query = query.eq("cliente_id", clienteId);
    else if (!scope.isAdmin && accessibleClientIds.length > 0) query = query.in("cliente_id", accessibleClientIds);
    const { data, error } = await query;
    if (error) throw error;
    const items = (data || []).map((row) => ({
      id: row.id,
      codigo: String(row.numero_venda || "").trim() || `VD-${row.id.slice(0, 8).toUpperCase()}`,
      cliente_id: row.cliente_id,
      cliente: { nome: String(row.clientes?.nome || "Cliente sem nome") },
      cliente_nome: String(row.clientes?.nome || "Cliente sem nome"),
      valor_total: Number(row.valor_total || 0),
      data_venda: row.data_venda,
      data_embarque: row.data_embarque,
      status: deriveStatus(row),
      tipo: deriveTipo(row),
      comissao: (Array.isArray(row.recibos) ? row.recibos : []).reduce((sum, recibo) => sum + Number(recibo?.valor_taxas || 0), 0)
    }));
    return json({ items, total: items.length });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar vendas.");
  }
}
export {
  GET
};
