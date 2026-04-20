import { r as requireMuralScope, c as assertCompanyAccess, f as fetchUsuariosEmpresa, b as fetchRecados } from "../../../../../../chunks/_shared.js";
async function GET(event) {
  try {
    const companyId = String(event.url.searchParams.get("company_id") || "").trim();
    if (!companyId) return new Response("company_id obrigatorio.", { status: 400 });
    const { client, scope } = await requireMuralScope(event);
    const denied = await assertCompanyAccess(client, scope, companyId);
    if (denied) return denied;
    const [usuariosEmpresa, recadosResp] = await Promise.all([fetchUsuariosEmpresa(client, companyId), fetchRecados(client, companyId)]);
    return new Response(
      JSON.stringify({
        usuariosEmpresa,
        recados: recadosResp.recados,
        supportsAttachments: recadosResp.supportsAttachments
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=5", Vary: "Cookie" }
      }
    );
  } catch (e) {
    console.error("Erro mural company:", e);
    return new Response("Erro ao carregar mural.", { status: 500 });
  }
}
export {
  GET
};
