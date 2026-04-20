import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureModuloAccess(scope, ["orcamentos", "vendas"], 1, "Sem acesso a Roteiros.");
    const { data, error } = await client.from("roteiro_personalizado").select("id, nome, duracao, inicio_cidade, fim_cidade, created_at, updated_at").eq("created_by", user.id).order("updated_at", { ascending: false }).limit(200);
    if (error) throw error;
    return json({ roteiros: data || [] });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar roteiros.");
  }
}
export {
  GET
};
