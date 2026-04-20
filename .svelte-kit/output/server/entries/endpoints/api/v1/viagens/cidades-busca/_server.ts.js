import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, n as normalizeText, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function parseLimit(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(200, Math.max(1, Math.trunc(parsed)));
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["viagens", "operacao"], 1, "Sem acesso a Viagens.");
    }
    const query = String(event.url.searchParams.get("q") || "").trim();
    const limite = parseLimit(event.url.searchParams.get("limite"), query ? 50 : 200);
    if (!query) {
      const { data, error } = await client.from("cidades").select("nome").order("nome").limit(limite);
      if (error) throw error;
      return json((data || []).map((item) => ({ nome: item.nome })));
    }
    try {
      const { data, error } = await client.rpc("buscar_cidades", { q: query, limite });
      if (error) throw error;
      return json((data || []).map((item) => ({ nome: item.nome })));
    } catch {
      const normalizedQuery = normalizeText(query);
      const { data, error } = await client.from("cidades").select("nome").ilike("nome", `%${query}%`).order("nome").limit(limite);
      if (error) throw error;
      const filtered = (data || []).filter((item) => normalizeText(item?.nome || "").includes(normalizedQuery));
      return json(filtered.map((item) => ({ nome: item.nome })));
    }
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar cidades.");
  }
}
export {
  GET
};
