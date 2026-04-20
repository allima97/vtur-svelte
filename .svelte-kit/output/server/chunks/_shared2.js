import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess } from "./v1.js";
const cache = /* @__PURE__ */ new Map();
async function requirePreferenciasScope(event, minLevel) {
  const client = getAdminClient();
  const user = await requireAuthenticatedUser(event);
  const scope = await resolveUserScope(client, user.id);
  if (!scope.isAdmin) {
    ensureModuloAccess(scope, ["operacao_preferencias"], minLevel, minLevel >= 3 ? "Sem permissão para gerenciar preferências." : "Sem acesso a Minhas Preferências.");
  }
  return { client, user, scope };
}
function buildJsonResponse(payload, status = 200, maxAge = 10) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `private, max-age=${maxAge}`,
      Vary: "Cookie"
    }
  });
}
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function normalizeTerm(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}
function readCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}
function writeCache(key, payload, ttlMs) {
  cache.set(key, { expiresAt: Date.now() + ttlMs, payload });
}
function matchesBusca(item, busca) {
  if (!busca) return true;
  const hay = [
    item?.nome,
    item?.localizacao,
    item?.classificacao,
    item?.observacao,
    item?.cidade?.nome,
    item?.tipo_produto?.nome
  ].map((v) => String(v || "").toLowerCase()).join(" | ");
  return hay.includes(busca.toLowerCase());
}
async function fetchPreferenciasBase(client, scope, currentUserId) {
  const companyId = scope.companyId;
  if (!companyId) return { tipos: [], usuarios: [] };
  const [tiposResp, usuariosResp] = await Promise.all([
    client.from("tipo_produtos").select("id, nome, tipo").order("nome").limit(500),
    client.from("users").select("id, nome_completo, email, active").eq("company_id", companyId).eq("active", true).order("nome_completo")
  ]);
  if (tiposResp.error) throw tiposResp.error;
  if (usuariosResp.error) throw usuariosResp.error;
  const usuarios = (usuariosResp.data || []).map((row) => ({
    id: String(row?.id || ""),
    nome_completo: String(row?.nome_completo || ""),
    email: String(row?.email || "")
  })).filter((u) => u.id && u.id !== currentUserId);
  return {
    tipos: tiposResp.data || [],
    usuarios
  };
}
export {
  readCache as a,
  buildJsonResponse as b,
  fetchPreferenciasBase as f,
  matchesBusca as m,
  normalizeTerm as n,
  requirePreferenciasScope as r,
  safeJsonParse as s,
  writeCache as w
};
