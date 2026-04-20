import { r as requireMuralScope, c as assertCompanyAccess, a as readCache, b as fetchRecados, w as writeCache } from "../../../../../../chunks/_shared.js";
async function GET(event) {
  try {
    const companyId = String(event.url.searchParams.get("company_id") || "").trim();
    if (!companyId) return new Response("company_id obrigatorio.", { status: 400 });
    const { client, user, scope } = await requireMuralScope(event);
    const denied = await assertCompanyAccess(client, scope, companyId);
    if (denied) return denied;
    const cacheKey = ["v1", "muralRecados", user.id, companyId].join("|");
    const cached = readCache(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=5", Vary: "Cookie" }
      });
    }
    const recadosResp = await fetchRecados(client, companyId);
    const payload = {
      recados: recadosResp.recados,
      supportsAttachments: recadosResp.supportsAttachments
    };
    writeCache(cacheKey, payload, 5e3);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=5", Vary: "Cookie" }
    });
  } catch (e) {
    console.error("Erro mural recados:", e);
    return new Response("Erro ao carregar recados.", { status: 500 });
  }
}
export {
  GET
};
