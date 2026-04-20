import { r as requirePreferenciasScope, f as fetchPreferenciasBase, b as buildJsonResponse } from "../../../../../../chunks/_shared2.js";
async function GET(event) {
  try {
    const { client, user, scope } = await requirePreferenciasScope(event, 1);
    const payload = await fetchPreferenciasBase(client, scope, user.id);
    return buildJsonResponse(payload, 200, 30);
  } catch (err) {
    console.error("Erro preferencias/base", err);
    return new Response("Erro ao carregar base.", { status: 500 });
  }
}
export {
  GET
};
