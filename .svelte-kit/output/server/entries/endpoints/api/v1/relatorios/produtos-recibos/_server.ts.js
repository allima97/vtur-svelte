import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
import { f as fetchSalesReportRows, i as getVendaStatus, j as getReceiptProductDescriptor } from "../../../../../../chunks/relatorios.js";
function parseUuidList(raw) {
  return String(raw || "").split(",").map((value) => value.trim()).filter((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["relatorios", "produtos", "vendas"], 1, "Sem acesso a Relatorios.");
    }
    const inicio = String(event.url.searchParams.get("inicio") || "").trim();
    const fim = String(event.url.searchParams.get("fim") || "").trim();
    const statusFilter = String(event.url.searchParams.get("status") || "").trim().toLowerCase();
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get("company_id"));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get("vendedor_ids"));
    const tipoProdutoIds = new Set(parseUuidList(event.url.searchParams.get("tipo_produto_ids")));
    const rows = await fetchSalesReportRows(client, {
      dataInicio: inicio || null,
      dataFim: fim || null,
      companyIds,
      vendedorIds
    });
    const items = rows.map((row) => {
      const status = getVendaStatus(row);
      const recibos = (Array.isArray(row.recibos) ? row.recibos : []).filter((recibo) => {
        if (tipoProdutoIds.size === 0) return true;
        const tipoId = String(recibo?.tipo_produtos?.id || "").trim();
        return tipoId ? tipoProdutoIds.has(tipoId) : false;
      }).map((recibo) => ({
        id: recibo?.id || null,
        numero_recibo: null,
        produto_id: recibo?.tipo_produtos?.id || null,
        produto_resolvido_id: recibo?.produto_resolvido?.id || null,
        data_venda: row.data_venda,
        valor_total: Number(recibo?.valor_total || 0),
        valor_taxas: Number(recibo?.valor_taxas || 0),
        valor_du: Number(recibo?.valor_du || 0),
        produtos: recibo?.tipo_produtos || null,
        produto_resolvido: recibo?.produto_resolvido || null
      }));
      return {
        id: row.id,
        vendedor_id: row.vendedor_id,
        cliente_id: row.cliente_id,
        destino_id: row.destinos?.id || null,
        produto_id: null,
        destino_cidade_id: row.destino_cidade?.id || null,
        data_venda: row.data_venda,
        data_embarque: row.data_embarque,
        valor_total: Number(row.valor_total || 0),
        status,
        destino_cidade: row.destino_cidade || null,
        destinos: row.destinos || null,
        vendas_recibos: recibos.length > 0 ? recibos : [
          {
            id: null,
            numero_recibo: null,
            produto_id: null,
            produto_resolvido_id: null,
            data_venda: row.data_venda,
            valor_total: Number(row.valor_total || 0),
            valor_taxas: Number(row.valor_taxas || 0),
            valor_du: 0,
            produtos: null,
            produto_resolvido: row.destinos ? {
              id: row.destinos.id || null,
              nome: getReceiptProductDescriptor(null, row).produto,
              tipo_produto: row.destinos.tipo_produto || null
            } : null
          }
        ]
      };
    }).filter((row) => !statusFilter || row.status === statusFilter).filter((row) => tipoProdutoIds.size === 0 || row.vendas_recibos.some((recibo) => tipoProdutoIds.has(String(recibo?.produto_id || ""))));
    return json(items);
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar relatorio de produtos por recibo.");
  }
}
export {
  GET
};
