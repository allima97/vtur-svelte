import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["tarefas", "operacao", "clientes"], 1, "Sem acesso a Tarefas.");
    }
    const search = String(event.url.searchParams.get("search") || "").trim().toLowerCase();
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get("empresa_id"));
    let query = client.from("clientes").select("id, nome, email, telefone, company_id").order("nome", { ascending: true }).limit(search ? 50 : 300);
    if (companyIds.length > 0) {
      query = query.in("company_id", companyIds);
    }
    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[Tarefas Clientes API] Erro:", error.message, error.code);
      throw error;
    }
    const items = (data || []).map((row) => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      telefone: row.telefone
    }));
    return json({ items, total: items.length });
  } catch (err) {
    console.error("[Tarefas Clientes API] Erro:", err);
    return toErrorResponse(err, "Erro ao carregar clientes.");
  }
}
export {
  GET
};
