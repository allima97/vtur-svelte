import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid } from "../../../../../../../chunks/v1.js";
function isIsoDate(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return true;
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(normalized);
}
function isRateioTableMissingError(err) {
  const code = String(err?.code || "").trim();
  const message = String(err?.message || "").toLowerCase();
  return code === "42P01" && (message.includes("vendas_recibos_rateio") || message.includes("does not exist"));
}
async function fetchGestorEquipeIdsComGestor(client, gestorId) {
  const { data, error } = await client.from("gestor_vendedor").select("vendedor_id").eq("gestor_id", gestorId).eq("ativo", true);
  if (error) {
    console.error("[fetchGestorEquipeIds]", error);
    return [];
  }
  return (data || []).map((row) => String(row?.vendedor_id || "").trim()).filter(Boolean);
}
function resolveCompanyId(scope, requestedCompanyId) {
  if (requestedCompanyId && isUuid(requestedCompanyId)) {
    return requestedCompanyId;
  }
  if (scope.isAdmin && scope.companyId) {
    return scope.companyId;
  }
  if (scope.isMaster && scope.companyId) {
    return scope.companyId;
  }
  return null;
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["conciliacao", "vendas_consulta", "vendas"], 1, "Sem acesso a Ajustes de Vendas.");
    }
    if (!(scope.isAdmin || scope.papel === "MASTER" || scope.papel === "GESTOR")) {
      return json({ error: "Somente gestor/master podem acessar Ajustes de Vendas." }, { status: 403 });
    }
    const url = event.url;
    const requestedCompanyId = String(url.searchParams.get("company_id") || "").trim();
    const inicio = String(url.searchParams.get("inicio") || "").trim();
    const fim = String(url.searchParams.get("fim") || "").trim();
    const vendedorId = String(url.searchParams.get("vendedor_id") || "").trim();
    const termo = String(url.searchParams.get("q") || "").trim();
    const limitRaw = Number(url.searchParams.get("limit") || 80);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 80;
    if (!isIsoDate(inicio) || !isIsoDate(fim)) {
      return json({ error: "inicio/fim invalidos. Use YYYY-MM-DD." }, { status: 400 });
    }
    if (vendedorId && !isUuid(vendedorId)) {
      return json({ error: "vendedor_id invalido." }, { status: 400 });
    }
    const companyId = resolveCompanyId(scope, requestedCompanyId);
    if (!companyId) {
      return json({ error: "company_id nao resolvido para este usuario." }, { status: 400 });
    }
    let equipeIds = null;
    if (scope.papel === "GESTOR") {
      equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
      if (equipeIds.length === 0) return json({ items: [] });
    }
    let query = client.from("vendas_recibos").select(
      `
          id,
          venda_id,
          numero_recibo,
          data_venda,
          valor_total,
          valor_taxas,
          vendas!inner (
            id,
            vendedor_id,
            cliente_id,
            cancelada,
            company_id,
            clientes:clientes!cliente_id (
              nome
            )
          )
        `
    ).eq("vendas.company_id", companyId).eq("vendas.cancelada", false).order("data_venda", { ascending: false }).limit(limit);
    if (inicio) query = query.gte("data_venda", inicio);
    if (fim) query = query.lte("data_venda", fim);
    if (vendedorId) query = query.eq("vendas.vendedor_id", vendedorId);
    if (equipeIds && equipeIds.length > 0) {
      query = query.in("vendas.vendedor_id", equipeIds);
    }
    if (termo) {
      query = query.or(`numero_recibo.ilike.%${termo}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    const reciboIds = (data || []).map((row) => String(row?.id || "").trim()).filter(Boolean);
    let conciliacaoQuery = client.from("conciliacao_recibos").select(
      `
          id,
          documento,
          movimento_data,
          valor_lancamentos,
          valor_venda_real,
          valor_taxas,
          ranking_vendedor_id,
          venda_id,
          venda_recibo_id,
          users:users!ranking_vendedor_id (
            id,
            nome_completo
          )
        `
    ).eq("company_id", companyId).is("venda_recibo_id", null).neq("is_baixa_rac", true).order("movimento_data", { ascending: false }).limit(limit);
    if (inicio) conciliacaoQuery = conciliacaoQuery.gte("movimento_data", inicio);
    if (fim) conciliacaoQuery = conciliacaoQuery.lte("movimento_data", fim);
    if (vendedorId) conciliacaoQuery = conciliacaoQuery.eq("ranking_vendedor_id", vendedorId);
    if (equipeIds && equipeIds.length > 0) conciliacaoQuery = conciliacaoQuery.in("ranking_vendedor_id", equipeIds);
    if (termo) conciliacaoQuery = conciliacaoQuery.ilike("documento", `%${termo}%`);
    const { data: conciliacaoData, error: conciliacaoError } = await conciliacaoQuery;
    if (conciliacaoError) throw conciliacaoError;
    const conciliacaoIds = (conciliacaoData || []).map((row) => String(row?.id || "").trim()).filter(Boolean);
    let rateioMap = /* @__PURE__ */ new Map();
    if (reciboIds.length > 0 || conciliacaoIds.length > 0) {
      const { data: rateioData, error: rateioError } = await client.from("vendas_recibos_rateio").select(
        `
            id,
            venda_recibo_id,
            conciliacao_recibo_id,
            ativo,
            vendedor_origem_id,
            vendedor_destino_id,
            percentual_origem,
            percentual_destino,
            observacao,
            updated_at,
            vendedor_destino:users!vendedor_destino_id (
              id,
              nome_completo
            )
          `
      ).eq("company_id", companyId);
      if (rateioError) {
        if (!isRateioTableMissingError(rateioError)) {
          throw rateioError;
        }
        console.warn("[ajustes-vendas/list] tabela vendas_recibos_rateio ainda nao existe");
      } else {
        (rateioData || []).forEach((row) => {
          const vendaReciboKey = String(row?.venda_recibo_id || "").trim();
          const concKey = String(row?.conciliacao_recibo_id || "").trim();
          if (vendaReciboKey && reciboIds.includes(vendaReciboKey)) {
            rateioMap.set(`vr:${vendaReciboKey}`, row);
          }
          if (concKey && conciliacaoIds.includes(concKey)) {
            rateioMap.set(`cr:${concKey}`, row);
          }
        });
      }
    }
    const vendedorIdsFromRows = Array.from(
      new Set(
        (data || []).map((row) => String(row?.vendas?.vendedor_id || "").trim()).filter(Boolean)
      )
    );
    const vendedorNomeMap = /* @__PURE__ */ new Map();
    if (vendedorIdsFromRows.length > 0) {
      const { data: vendedoresOrigem, error: vendedoresOrigemError } = await client.from("users").select("id, nome_completo").in("id", vendedorIdsFromRows);
      if (vendedoresOrigemError) throw vendedoresOrigemError;
      (vendedoresOrigem || []).forEach((row) => {
        const id = String(row?.id || "").trim();
        if (!id) return;
        vendedorNomeMap.set(id, String(row?.nome_completo || "Sem vendedor"));
      });
    }
    const itensVendas = (data || []).map((row) => {
      const baseId = String(row?.id || "").trim();
      const rateio = rateioMap.get(`vr:${baseId}`) || null;
      const vendedorOrigemId = String(row?.vendas?.vendedor_id || "");
      return {
        id: `vr:${baseId}`,
        recibo_tipo: "venda",
        recibo_origem_id: baseId,
        venda_id: String(row?.venda_id || ""),
        numero_recibo: String(row?.numero_recibo || "").trim() || "-",
        data_venda: String(row?.data_venda || "").slice(0, 10),
        valor_total: Number(row?.valor_total || 0),
        valor_taxas: Number(row?.valor_taxas || 0),
        vendedor_origem_id: vendedorOrigemId,
        vendedor_origem_nome: String(vendedorNomeMap.get(vendedorOrigemId) || "Sem vendedor"),
        cliente_nome: String(row?.vendas?.clientes?.nome || ""),
        rateio: rateio ? {
          id: String(rateio?.id || ""),
          ativo: Boolean(rateio?.ativo),
          vendedor_destino_id: String(rateio?.vendedor_destino_id || ""),
          vendedor_destino_nome: String(
            rateio?.vendedor_destino?.nome_completo || "Sem vendedor"
          ),
          percentual_origem: Number(rateio?.percentual_origem || 0),
          percentual_destino: Number(rateio?.percentual_destino || 0),
          observacao: String(rateio?.observacao || ""),
          updated_at: String(rateio?.updated_at || "")
        } : null
      };
    });
    const itensConciliacao = (conciliacaoData || []).map((row) => {
      const concId = String(row?.id || "").trim();
      const rateio = rateioMap.get(`cr:${concId}`) || null;
      const vendedorOrigemId = String(row?.ranking_vendedor_id || "");
      const bruto = Number(row?.valor_venda_real || 0) > 0 ? Number(row?.valor_venda_real || 0) : Number(row?.valor_lancamentos || 0);
      return {
        id: `cr:${concId}`,
        recibo_tipo: "conciliacao",
        recibo_origem_id: concId,
        venda_id: String(row?.venda_id || ""),
        numero_recibo: String(row?.documento || "").trim() || "-",
        data_venda: String(row?.movimento_data || "").slice(0, 10),
        valor_total: Number(bruto || 0),
        valor_taxas: Number(row?.valor_taxas || 0),
        vendedor_origem_id: vendedorOrigemId,
        vendedor_origem_nome: String(
          row?.users?.nome_completo || vendedorNomeMap.get(vendedorOrigemId) || "Sem vendedor"
        ),
        cliente_nome: "",
        rateio: rateio ? {
          id: String(rateio?.id || ""),
          ativo: Boolean(rateio?.ativo),
          vendedor_destino_id: String(rateio?.vendedor_destino_id || ""),
          vendedor_destino_nome: String(
            rateio?.vendedor_destino?.nome_completo || "Sem vendedor"
          ),
          percentual_origem: Number(rateio?.percentual_origem || 0),
          percentual_destino: Number(rateio?.percentual_destino || 0),
          observacao: String(rateio?.observacao || ""),
          updated_at: String(rateio?.updated_at || "")
        } : null
      };
    });
    const items = [...itensVendas, ...itensConciliacao].sort((a, b) => String(b?.data_venda || "").localeCompare(String(a?.data_venda || ""))).slice(0, limit);
    let vendedoresQuery = client.from("users").select("id, nome_completo").eq("company_id", companyId).eq("active", true).order("nome_completo", { ascending: true });
    if (equipeIds && equipeIds.length > 0) {
      vendedoresQuery = vendedoresQuery.in("id", equipeIds);
    }
    const { data: vendedoresData, error: vendedoresError } = await vendedoresQuery;
    if (vendedoresError) throw vendedoresError;
    const vendedores = (vendedoresData || []).map((row) => ({
      id: String(row?.id || ""),
      nome: String(row?.nome_completo || "Sem nome")
    }));
    return json({ items, vendedores }, {
      headers: {
        "Cache-Control": "private, max-age=10"
      }
    });
  } catch (err) {
    console.error("Erro financeiro/ajustes-vendas/list", err);
    const detail = String(err?.message || "Erro ao carregar ajustes de vendas.");
    return json({ error: detail }, { status: 500 });
  }
}
export {
  GET
};
