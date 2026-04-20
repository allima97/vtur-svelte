import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["vendas_consulta", "vendas"], 3, "Sem permissao para editar vendas.");
    }
    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody);
    const ids = Array.isArray(body?.ids) ? body.ids.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 50) : [];
    if (ids.length === 0) {
      return new Response("ids obrigatorio.", { status: 400 });
    }
    const { error } = await client.from("vendas_recibos_complementares").delete().in("id", ids);
    if (error) throw error;
    return json({ ok: true, removed: ids.length });
  } catch (err) {
    return toErrorResponse(err, "Erro ao remover recibo complementar.");
  }
}
export {
  POST
};
