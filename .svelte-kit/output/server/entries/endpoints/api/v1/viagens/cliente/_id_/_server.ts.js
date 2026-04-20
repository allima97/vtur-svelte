import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["viagens", "operacao"], 1, "Sem acesso a Viagens.");
    }
    const { params } = event;
    const clienteId = params.id;
    if (!clienteId) {
      return json({ success: false, error: "ID do cliente é obrigatório" }, { status: 400 });
    }
    const { searchParams } = event.url;
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("empresa_id"));
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
        created_at, 
        updated_at,
        recibo_id
      `).eq("cliente_id", clienteId).order("data_inicio", { ascending: false }).limit(100);
    if (companyIds.length > 0) {
      query = query.in("company_id", companyIds);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[Viagens Cliente API] Erro:", error.message, error.code);
      throw error;
    }
    const { data: clienteData } = await client.from("clientes").select("id, nome").eq("id", clienteId).single();
    const items = (data || []).map((row) => ({
      id: row.id,
      venda_id: row.venda_id,
      orcamento_id: row.orcamento_id,
      cliente_id: row.cliente_id,
      cliente_nome: clienteData?.nome || "Cliente não encontrado",
      origem: row.origem || "",
      destino: row.destino || "Destino não informado",
      data_inicio: row.data_inicio,
      data_fim: row.data_fim,
      status: row.status || "planejada",
      observacoes: row.observacoes || "",
      follow_up_text: row.follow_up_text || "",
      follow_up_fechado: row.follow_up_fechado || false,
      recibo_id: row.recibo_id,
      created_at: row.created_at
    }));
    return json({ success: true, items, total: items.length });
  } catch (err) {
    console.error("[Viagens Cliente API] Erro:", err);
    return toErrorResponse(err, "Erro ao carregar viagens do cliente.");
  }
}
export {
  GET
};
