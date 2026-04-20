import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds, f as resolveAccessibleClientIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function computeKpis(rows) {
  let totalVendas = 0;
  let totalTaxas = 0;
  let totalSeguro = 0;
  let countAtivas = 0;
  for (const row of rows) {
    if (row.cancelada) continue;
    countAtivas++;
    const recibos = Array.isArray(row.recibos) ? row.recibos : [];
    if (recibos.length > 0) {
      for (const recibo of recibos) {
        const valorTotal = Number(recibo?.valor_total || 0);
        const valorTaxas = Number(recibo?.valor_taxas || 0);
        totalVendas += valorTotal;
        totalTaxas += valorTaxas;
        const tipo = String(recibo?.tipo_produtos?.tipo || "").toLowerCase();
        const nome = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || "").toLowerCase();
        if (tipo.includes("seguro") || nome.includes("seguro")) {
          totalSeguro += valorTotal;
        }
      }
    } else {
      totalVendas += Number(row.valor_total || 0);
      totalTaxas += Number(row.valor_taxas || 0);
    }
  }
  return {
    totalVendas,
    totalTaxas,
    totalLiquido: totalVendas - totalTaxas,
    totalSeguro,
    countVendas: rows.length,
    countAtivas
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
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("empresa_id"));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, searchParams.get("vendedor_id"));
    const accessibleClientIds = !scope.isAdmin ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds }) : [];
    let query = client.from("vendas").select(`
        id,
        valor_total,
        valor_taxas,
        cancelada,
        company_id,
        vendedor_id,
        cliente_id,
        recibos:vendas_recibos (
          valor_total,
          valor_taxas,
          tipo_produtos (tipo, nome),
          produto_resolvido:produtos!produto_resolvido_id (nome)
        )
      `).limit(5e3);
    if (inicio) query = query.gte("data_venda", inicio);
    if (fim) query = query.lte("data_venda", fim);
    if (companyIds.length > 0) query = query.in("company_id", companyIds);
    if (vendedorIds.length > 0) query = query.in("vendedor_id", vendedorIds);
    if (!scope.isAdmin && accessibleClientIds.length > 0) {
      query = query.in("cliente_id", accessibleClientIds);
    }
    const { data, error } = await query;
    if (error) throw error;
    return json({ kpis: computeKpis(data || []) });
  } catch (err) {
    return toErrorResponse(err, "Erro ao calcular KPIs de vendas.");
  }
}
export {
  GET
};
