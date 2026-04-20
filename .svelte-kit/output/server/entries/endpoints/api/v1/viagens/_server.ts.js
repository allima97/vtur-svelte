import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, t as toErrorResponse, c as toISODateLocal, j as getMonthRange } from "../../../../../chunks/v1.js";
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
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      return { from: toISODateLocal(inicioSemana), to: toISODateLocal(fimSemana) };
    }
    case "mes": {
      const { inicio, fim } = getMonthRange(hoje);
      return { from: inicio, to: fim };
    }
    case "proximos_30": {
      const fim = new Date(hoje);
      fim.setDate(hoje.getDate() + 30);
      return { from: hojeStr, to: toISODateLocal(fim) };
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
      ensureModuloAccess(scope, ["viagens", "operacao"], 1, "Sem acesso a Viagens.");
    }
    const { searchParams } = event.url;
    const status = searchParams.get("status");
    const periodo = searchParams.get("periodo");
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("empresa_id"));
    if (!scope.isAdmin && companyIds.length === 0 && !scope.usoIndividual) {
      return json({ items: [], total: 0 });
    }
    let query = client.from("viagens").select(`
        id,
        venda_id,
        orcamento_id,
        cliente_id,
        company_id,
        responsavel_user_id,
        origem,
        destino,
        data_inicio,
        data_fim,
        status,
        observacoes,
        follow_up_text,
        follow_up_fechado,
        recibo_id,
        created_at,
        updated_at
      `).order("data_inicio", { ascending: true }).limit(1e3);
    if (status && status !== "todas") {
      query = query.eq("status", status);
    }
    if (companyIds.length > 0) {
      query = query.in("company_id", companyIds);
    }
    if (scope.usoIndividual) {
      query = query.eq("responsavel_user_id", user.id);
    }
    const periodoFilter = getPeriodoFilter(periodo);
    if (periodoFilter?.from && periodoFilter?.to) {
      query = query.gte("data_inicio", periodoFilter.from).lte("data_inicio", periodoFilter.to + "T23:59:59");
    }
    const { data, error } = await query;
    if (error) throw error;
    const clienteIds = [...new Set((data || []).map((v) => v.cliente_id).filter(Boolean))];
    const clientesMap = /* @__PURE__ */ new Map();
    if (clienteIds.length > 0) {
      const { data: clientesData } = await client.from("clientes").select("id, nome").in("id", clienteIds);
      (clientesData || []).forEach((c) => clientesMap.set(c.id, c.nome));
    }
    const responsavelIds = [...new Set((data || []).map((v) => v.responsavel_user_id).filter(Boolean))];
    const responsaveisMap = /* @__PURE__ */ new Map();
    if (responsavelIds.length > 0) {
      const { data: responsaveisData } = await client.from("users").select("id, nome_completo").in("id", responsavelIds);
      (responsaveisData || []).forEach((u) => responsaveisMap.set(u.id, u.nome_completo));
    }
    const viagemIds = (data || []).map((v) => v.id);
    const passageirosCountMap = /* @__PURE__ */ new Map();
    if (viagemIds.length > 0) {
      const { data: passageirosData } = await client.from("viagem_passageiros").select("viagem_id").in("viagem_id", viagemIds);
      (passageirosData || []).forEach((p) => {
        passageirosCountMap.set(p.viagem_id, (passageirosCountMap.get(p.viagem_id) || 0) + 1);
      });
    }
    const vendaIds = [...new Set((data || []).map((v) => v.venda_id).filter(Boolean))];
    const vendasMap = /* @__PURE__ */ new Map();
    if (vendaIds.length > 0) {
      const { data: vendasData } = await client.from("vendas").select("id, valor_total").in("id", vendaIds);
      (vendasData || []).forEach((v) => vendasMap.set(v.id, v.valor_total));
    }
    const internacionalKeywords = [
      "europa",
      "asia",
      "africa",
      "oceania",
      "américa do norte",
      "eua",
      "canada",
      "mexico",
      "caribe",
      "orlando",
      "miami",
      "new york",
      "paris",
      "londres",
      "italia",
      "espanha",
      "portugal"
    ];
    const items = (data || []).map((row) => {
      const numPassageiros = passageirosCountMap.get(row.id) || 1;
      const valorVenda = row.venda_id ? vendasMap.get(row.venda_id) || 0 : 0;
      const tipoViagem = row.destino && internacionalKeywords.some((k) => row.destino.toLowerCase().includes(k)) ? "internacional" : "nacional";
      return {
        id: row.id,
        venda_id: row.venda_id,
        orcamento_id: row.orcamento_id,
        cliente_id: row.cliente_id,
        cliente_nome: clientesMap.get(row.cliente_id) || "Cliente não encontrado",
        destino: row.destino || row.origem || "Destino não informado",
        origem: row.origem,
        data_inicio: row.data_inicio,
        data_fim: row.data_fim,
        status: row.status || "planejada",
        observacoes: row.observacoes || "",
        follow_up_text: row.follow_up_text || "",
        follow_up_fechado: row.follow_up_fechado || false,
        recibo_id: row.recibo_id,
        numero_passageiros: numPassageiros,
        tipo_viagem: tipoViagem,
        valor_total: valorVenda,
        responsavel_nome: responsaveisMap.get(row.responsavel_user_id) || "Não atribuído",
        created_at: row.created_at
      };
    });
    return json({ items, total: items.length });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar viagens.");
  }
}
export {
  GET
};
