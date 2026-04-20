import { json } from "@sveltejs/kit";
import { c as ensureTodoAccess, d as mapTodoRow } from "../../../../../../chunks/agenda.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureTodoAccess(scope, 1, "Sem acesso a Tarefas.");
    const [categoriasResp, itensResp] = await Promise.all([
      client.from("todo_categorias").select("id, nome, cor").eq("user_id", user.id).order("nome", { ascending: true }),
      client.from("agenda_itens").select("id, titulo, descricao, done, categoria_id, prioridade, status, arquivo, created_at, updated_at").eq("tipo", "todo").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);
    if (categoriasResp.error) throw categoriasResp.error;
    if (itensResp.error) throw itensResp.error;
    return json({
      categorias: (categoriasResp.data || []).map((row) => ({
        id: String(row.id),
        nome: String(row.nome || ""),
        cor: row.cor ? String(row.cor) : null
      })),
      itens: (itensResp.data || []).map(mapTodoRow).filter(Boolean)
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar tarefas.");
  }
}
export {
  GET
};
