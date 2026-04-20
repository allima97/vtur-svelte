import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, f as resolveAccessibleClientIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["viagens", "operacao"], 1, "Sem acesso a Viagens.");
    }
    const vendedorIds = scope.usoIndividual ? [user.id] : [];
    const accessibleClientIds = !scope.isAdmin ? await resolveAccessibleClientIds(client, { companyIds: scope.companyIds, vendedorIds }) : [];
    let query = client.from("clientes").select("id, nome, cpf").order("nome", { ascending: true }).limit(200);
    if (!scope.isAdmin && accessibleClientIds.length > 0) {
      query = query.in("id", accessibleClientIds);
    }
    const { data, error } = await query;
    if (error) throw error;
    return json(data || []);
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar clientes.");
  }
}
export {
  GET
};
