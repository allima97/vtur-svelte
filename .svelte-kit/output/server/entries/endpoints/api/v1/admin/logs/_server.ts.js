import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      return json({ error: "Somente administradores podem acessar logs." }, { status: 403 });
    }
    const { searchParams } = event.url;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 50));
    const tipo = String(searchParams.get("tipo") || "").trim();
    const userId = String(searchParams.get("user_id") || "").trim();
    let query = client.from("logs").select("id, modulo, acao, detalhes, user_id, ip, created_at, usuario:users!user_id(nome_completo, email)").order("created_at", { ascending: false }).limit(5e3);
    if (tipo) query = query.eq("modulo", tipo);
    if (userId) query = query.eq("user_id", userId);
    const { data, error: queryError } = await query;
    if (queryError) throw queryError;
    const items = data || [];
    const total = items.length;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
    return json({ items: paginatedItems, total, page, pageSize });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar logs.");
  }
}
export {
  GET
};
