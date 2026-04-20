import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess } from "../../../../../../chunks/v1.js";
function parseLimit(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const intVal = Math.trunc(parsed);
  if (intVal <= 0) return fallback;
  return Math.min(20, intVal);
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["relatorios", "vendas"], 1, "Sem acesso a Relatorios.");
    }
    const query = String(event.url.searchParams.get("q") || "").trim();
    const limite = parseLimit(event.url.searchParams.get("limite"), 8);
    if (query.length < 2) {
      return json([]);
    }
    const { data, error } = await client.rpc("buscar_cidades", { q: query, limite });
    if (error) throw error;
    return json(data || []);
  } catch (err) {
    console.error("Erro relatorios/cidades-busca", err);
    return new Response("Erro ao buscar cidades.", { status: 500 });
  }
}
export {
  GET
};
