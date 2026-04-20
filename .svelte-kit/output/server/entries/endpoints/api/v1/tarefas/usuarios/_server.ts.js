import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["tarefas", "operacao"], 1, "Sem acesso a Tarefas.");
    }
    const companyIds = event.url.searchParams.get("empresa_id");
    let query = client.from("users").select("id, nome_completo, email, company_id").eq("active", true).order("nome_completo", { ascending: true }).limit(500);
    if (companyIds) {
      query = query.eq("company_id", companyIds);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[Tarefas Usuarios API] Erro:", error.message, error.code);
      throw error;
    }
    const items = (data || []).map((row) => ({
      id: row.id,
      nome: row.nome_completo || row.email,
      email: row.email
    }));
    return json({ items, total: items.length });
  } catch (err) {
    console.error("[Tarefas Usuarios API] Erro:", err);
    return toErrorResponse(err, "Erro ao carregar usuários.");
  }
}
export {
  GET
};
