import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => null);
    if (!body || !body.tipo || !body.valor) {
      return new Response("Dados invalidos.", { status: 400 });
    }
    const tipo = String(body.tipo).trim();
    const valor = String(body.valor).trim();
    if (!tipo || !valor) return new Response("Dados invalidos.", { status: 400 });
    const companyId = scope.companyId;
    let query = client.from("roteiro_sugestoes").delete().eq("tipo", tipo).ilike("valor", valor);
    if (companyId) {
      query = query.eq("company_id", companyId);
    } else {
      query = query.is("company_id", null);
    }
    const { error } = await query;
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao remover sugestao.");
  }
}
export {
  POST
};
