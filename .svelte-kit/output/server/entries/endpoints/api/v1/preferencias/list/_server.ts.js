import { r as requirePreferenciasScope, n as normalizeTerm, m as matchesBusca, b as buildJsonResponse } from "../../../../../../chunks/_shared2.js";
async function GET(event) {
  try {
    const { client, user } = await requirePreferenciasScope(event, 1);
    const busca = normalizeTerm(event.url.searchParams.get("busca"));
    const prefSelect = "id, company_id, created_by, tipo_produto_id, cidade_id, nome, localizacao, classificacao, observacao, created_at, updated_at, cidade:cidades!cidade_id(id, nome), tipo_produto:tipo_produtos!tipo_produto_id(id, nome)";
    const [ownedResp, sharesToMeResp, sharesByMeResp] = await Promise.all([
      client.from("minhas_preferencias").select(prefSelect).eq("created_by", user.id).order("created_at", { ascending: false }).limit(500),
      client.from("minhas_preferencias_shares").select(
        `id, company_id, preferencia_id, shared_by, shared_with, status, created_at, accepted_at, revoked_at, shared_by_user:shared_by(id, nome_completo, email), preferencia:preferencia_id(${prefSelect})`
      ).eq("shared_with", user.id).in("status", ["pending", "accepted"]).order("created_at", { ascending: false }).limit(500),
      client.from("minhas_preferencias_shares").select(
        "id, preferencia_id, shared_with, status, created_at, accepted_at, revoked_at, shared_with_user:shared_with(id, nome_completo, email)"
      ).eq("shared_by", user.id).in("status", ["pending", "accepted"]).order("created_at", { ascending: false }).limit(1e3)
    ]);
    if (ownedResp.error) throw ownedResp.error;
    if (sharesToMeResp.error) throw sharesToMeResp.error;
    if (sharesByMeResp.error) throw sharesByMeResp.error;
    const sharesByPref = /* @__PURE__ */ new Map();
    (sharesByMeResp.data || []).forEach((row) => {
      const pid = String(row?.preferencia_id || "");
      if (!pid) return;
      const list = sharesByPref.get(pid) || [];
      list.push({
        id: String(row?.id || ""),
        status: String(row?.status || ""),
        created_at: row?.created_at || null,
        accepted_at: row?.accepted_at || null,
        revoked_at: row?.revoked_at || null,
        shared_with: row?.shared_with_user ? {
          id: String(row?.shared_with_user?.id || ""),
          nome_completo: String(row?.shared_with_user?.nome_completo || ""),
          email: String(row?.shared_with_user?.email || "")
        } : null
      });
      sharesByPref.set(pid, list);
    });
    const owned = (ownedResp.data || []).map((p) => ({
      scope: "owned",
      preferencia: p,
      shares: sharesByPref.get(String(p?.id || "")) || []
    }));
    const shared = (sharesToMeResp.data || []).map((s) => ({
      scope: "shared",
      share: {
        id: String(s?.id || ""),
        status: String(s?.status || ""),
        created_at: s?.created_at || null,
        accepted_at: s?.accepted_at || null,
        revoked_at: s?.revoked_at || null,
        shared_by: s?.shared_by_user ? {
          id: String(s?.shared_by_user?.id || ""),
          nome_completo: String(s?.shared_by_user?.nome_completo || ""),
          email: String(s?.shared_by_user?.email || "")
        } : null
      },
      preferencia: s?.preferencia || null
    }));
    const all = [...owned, ...shared].filter((row) => matchesBusca(row?.preferencia, busca)).sort((a, b) => new Date(b?.preferencia?.created_at || 0).getTime() - new Date(a?.preferencia?.created_at || 0).getTime());
    return buildJsonResponse({ items: all });
  } catch (err) {
    console.error("Erro preferencias/list", err);
    return new Response("Erro ao listar preferências.", { status: 500 });
  }
}
export {
  GET
};
