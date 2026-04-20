import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
import { c as getCurrentYearRange, f as fetchSalesReportRows, h as getVendaDestino } from "../../../../../../chunks/relatorios.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["relatorios", "vendas"], 1, "Sem acesso ao relatorio de destinos.");
    }
    const { searchParams } = event.url;
    const defaultRange = getCurrentYearRange();
    const dataInicio = String(searchParams.get("data_inicio") || defaultRange.dataInicio).trim();
    const dataFim = String(searchParams.get("data_fim") || defaultRange.dataFim).trim();
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("empresa_id"));
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      searchParams.get("vendedor_ids") || searchParams.get("vendedor_id")
    );
    const rows = await fetchSalesReportRows(client, {
      dataInicio,
      dataFim,
      companyIds,
      vendedorIds
    });
    const totalReceita = rows.reduce((sum, row) => sum + Number(row.valor_total || 0), 0);
    const byDestino = /* @__PURE__ */ new Map();
    rows.forEach((row) => {
      const destino = getVendaDestino(row);
      const current = byDestino.get(destino) || {
        destino,
        quantidade: 0,
        receita: 0
      };
      current.quantidade += 1;
      current.receita += Number(row.valor_total || 0);
      byDestino.set(destino, current);
    });
    const items = Array.from(byDestino.values()).map((item) => ({
      destino_id: null,
      // Expose alias for parity with VTUR-APP expectations
      destino: item.destino,
      destino_nome: item.destino,
      // New parity alias: display name and short name
      destino_display: item.destino,
      destino_short: String(item.destino ?? "").slice(0, 20),
      destino_display_name: String(item.destino ?? ""),
      destino_display_short: String(item.destino ?? "").slice(0, 12),
      destino_slug: String(item.destino ?? "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\\-]/g, ""),
      destino_codigo: String(item.destino ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
      // Ensure existing payload remains intact
      ...item,
      ticket_medio: item.quantidade > 0 ? item.receita / item.quantidade : 0,
      percentual: totalReceita > 0 ? item.receita / totalReceita * 100 : 0
    })).sort((left, right) => right.receita - left.receita);
    return json({
      items,
      total: items.length,
      periodo: {
        data_inicio: dataInicio,
        data_fim: dataFim
      }
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar relatorio de destinos.");
  }
}
export {
  GET
};
