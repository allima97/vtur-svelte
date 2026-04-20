import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["orcamentos", "vendas"], 1, "Sem acesso a Orcamentos.");
    }
    const { data, error } = await client.from("tipo_produtos").select("id, nome, tipo").order("nome", { ascending: true }).limit(500);
    if (error) throw error;
    return json(data || []);
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar tipos.");
  }
}
export {
  GET
};
