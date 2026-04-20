import { error } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { P as PUBLIC_SUPABASE_URL } from "./public.js";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncW12cnVlcmJhcXh0aGhueHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc2MzQ3OCwiZXhwIjoyMDgwMzM5NDc4fQ.2MwbrYwtD-HeeoCw4g5PBadXLpo0gY8eoRjLxQglOQQ";
let adminClient = null;
function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return adminClient;
}
function isUuid(value) {
  return Boolean(
    value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}
function parseUuidList(value, limit = 300) {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter((item) => isUuid(item)).slice(0, limit);
}
function parseIntSafe(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const intVal = Math.trunc(parsed);
  return intVal > 0 ? intVal : fallback;
}
function toISODateLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}
function getMonthRange(reference = /* @__PURE__ */ new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return {
    inicio: toISODateLocal(start),
    fim: toISODateLocal(end)
  };
}
function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function normalizeModulo(value) {
  return normalizeText(value).replace(/\s+/g, "_");
}
function permLevel(value) {
  switch (String(value || "").toLowerCase()) {
    case "admin":
      return 5;
    case "delete":
      return 4;
    case "edit":
      return 3;
    case "create":
      return 2;
    case "view":
      return 1;
    default:
      return 0;
  }
}
function resolveUserTypeName(userTypes) {
  if (Array.isArray(userTypes)) {
    return String(userTypes[0]?.name || "");
  }
  return String(userTypes?.name || "");
}
function buildPermissionsMap(rows) {
  const map = {};
  rows.forEach((row) => {
    if (!row?.ativo) return;
    const key = normalizeModulo(row.modulo);
    if (!key) return;
    const incoming = String(row.permissao || "").toLowerCase();
    const current = map[key] || "none";
    if (permLevel(incoming) > permLevel(current)) {
      map[key] = incoming;
    }
  });
  return map;
}
function resolvePapel(tipoNome, usoIndividual) {
  if (usoIndividual) return "VENDEDOR";
  const tipo = String(tipoNome || "").toUpperCase();
  if (tipo.includes("ADMIN")) return "ADMIN";
  if (tipo.includes("MASTER")) return "MASTER";
  if (tipo.includes("GESTOR")) return "GESTOR";
  if (tipo.includes("VENDEDOR")) return "VENDEDOR";
  return "OUTRO";
}
async function requireAuthenticatedUser(event) {
  const { session, user } = await event.locals.safeGetSession();
  if (!session || !user) {
    throw error(401, "Sessao invalida.");
  }
  return user;
}
async function fetchPermissions(client, userId) {
  const { data, error: permissionsError } = await client.from("modulo_acesso").select("modulo, permissao, ativo").eq("usuario_id", userId);
  if (permissionsError) {
    throw error(500, "Erro ao carregar permissoes.");
  }
  return buildPermissionsMap(data || []);
}
async function fetchGestorEquipeIdsComGestor(client, gestorId) {
  if (!gestorId) return [];
  try {
    const { data, error: rpcError } = await client.rpc("gestor_equipe_vendedor_ids", { uid: gestorId });
    if (rpcError) throw rpcError;
    const ids = (data || []).map((row) => String(row?.vendedor_id || "").trim()).filter(Boolean);
    return Array.from(/* @__PURE__ */ new Set([gestorId, ...ids]));
  } catch {
    const { data, error: fallbackError } = await client.from("gestor_vendedor").select("vendedor_id, ativo").eq("gestor_id", gestorId);
    if (fallbackError) {
      return [gestorId];
    }
    const ids = (data || []).filter((row) => row?.ativo !== false).map((row) => String(row?.vendedor_id || "").trim()).filter(Boolean);
    return Array.from(/* @__PURE__ */ new Set([gestorId, ...ids]));
  }
}
async function fetchMasterEmpresas(client, masterId) {
  const { data, error: companiesError } = await client.from("master_empresas").select("company_id, status").eq("master_id", masterId);
  if (companiesError) {
    return [];
  }
  return (data || []).filter((row) => row?.status === "approved").map((row) => String(row?.company_id || "").trim()).filter(Boolean);
}
async function resolveUserScope(client, userId) {
  const { data, error: profileError } = await client.from("users").select("id, company_id, nome_completo, email, uso_individual, user_types(name)").eq("id", userId).maybeSingle();
  if (profileError || !data) {
    throw error(403, "Perfil do usuario nao encontrado.");
  }
  const profile = data;
  const tipoNome = resolveUserTypeName(profile.user_types);
  const usoIndividual = Boolean(profile.uso_individual);
  const papel = resolvePapel(tipoNome, usoIndividual);
  const permissoes = await fetchPermissions(client, userId);
  const companyId = isUuid(profile.company_id) ? String(profile.company_id) : null;
  const companyIds = papel === "MASTER" ? await fetchMasterEmpresas(client, userId) : companyId ? [companyId] : [];
  return {
    userId,
    nome: profile.nome_completo,
    email: profile.email,
    tipoNome,
    usoIndividual,
    papel,
    companyId,
    companyIds,
    permissoes,
    isAdmin: papel === "ADMIN",
    isMaster: papel === "MASTER",
    isGestor: papel === "GESTOR",
    isVendedor: papel === "VENDEDOR"
  };
}
function hasModuloAccess(scope, modulos, minLevel = 1) {
  if (scope.isAdmin) return true;
  if (minLevel <= 1 && (scope.companyId || scope.usoIndividual)) return true;
  if (scope.isGestor || scope.isMaster) {
    if (minLevel <= 3) return true;
  }
  const allowed = new Set(
    modulos.map((modulo) => [String(modulo || "").trim().toLowerCase(), normalizeModulo(modulo)]).flat().filter(Boolean)
  );
  const hasSpecific = Object.entries(scope.permissoes).some(([modulo, permissao]) => {
    const normalized = normalizeModulo(modulo);
    return allowed.has(modulo) || normalized && allowed.has(normalized) ? permLevel(permissao) >= minLevel : false;
  });
  if (hasSpecific) return true;
  if (minLevel <= 2 && (scope.companyId || scope.usoIndividual)) return true;
  return false;
}
function ensureModuloAccess(scope, modulos, minLevel, message) {
  if (!hasModuloAccess(scope, modulos, minLevel)) {
    throw error(403, message);
  }
}
async function resolveScopedVendedorIds(client, scope, requestedRaw) {
  const requestedIds = parseUuidList(requestedRaw);
  if (scope.isAdmin) {
    return requestedIds;
  }
  if (scope.isGestor) {
    const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
    return requestedIds.length > 0 ? requestedIds.filter((id) => equipeIds.includes(id)) : equipeIds;
  }
  if (scope.isMaster) {
    return requestedIds;
  }
  return [scope.userId];
}
function resolveScopedCompanyIds(scope, requestedCompanyId) {
  const companyId = String(requestedCompanyId || "").trim();
  if (scope.isAdmin) {
    return isUuid(companyId) ? [companyId] : [];
  }
  if (scope.isMaster) {
    if (isUuid(companyId)) {
      return scope.companyIds.includes(companyId) ? [companyId] : [];
    }
    return scope.companyIds;
  }
  return scope.companyIds;
}
async function resolveAccessibleClientIds(client, params) {
  const clientIds = /* @__PURE__ */ new Set();
  if (params.companyIds.length > 0) {
    const { data } = await client.from("clientes").select("id").in("company_id", params.companyIds).limit(5e3);
    (data || []).forEach((row) => {
      const id = String(row?.id || "").trim();
      if (id) clientIds.add(id);
    });
  }
  if (params.vendedorIds.length > 0) {
    const { data, error: createdByError } = await client.from("clientes").select("id").in("created_by", params.vendedorIds).limit(5e3);
    if (!createdByError) {
      (data || []).forEach((row) => {
        const id = String(row?.id || "").trim();
        if (id) clientIds.add(id);
      });
    }
  }
  let salesQuery = client.from("vendas").select("cliente_id").eq("cancelada", false).not("cliente_id", "is", null);
  if (params.companyIds.length > 0) {
    salesQuery = salesQuery.in("company_id", params.companyIds);
  }
  if (params.vendedorIds.length > 0) {
    salesQuery = salesQuery.in("vendedor_id", params.vendedorIds);
  }
  const { data: salesData } = await salesQuery.limit(5e3);
  (salesData || []).forEach((row) => {
    const id = String(row?.cliente_id || "").trim();
    if (id) clientIds.add(id);
  });
  return Array.from(clientIds);
}
function isHttpErrorLike(value) {
  return Boolean(value && typeof value === "object" && "status" in value);
}
function toErrorResponse(err, fallbackMessage) {
  console.error("[toErrorResponse] Erro capturado:", err);
  console.error("[toErrorResponse] Tipo:", typeof err);
  if (err && typeof err === "object") {
    const errObj = err;
    console.error("[toErrorResponse] Propriedades:", Object.keys(errObj));
    console.error("[toErrorResponse] Status:", errObj.status);
    console.error("[toErrorResponse] Body:", errObj.body);
    console.error("[toErrorResponse] Message:", errObj.message);
  }
  if (isHttpErrorLike(err)) {
    console.error("[toErrorResponse] Erro HTTP detectado:", err.status);
    return new Response(err.body?.message || fallbackMessage, {
      status: err.status
    });
  }
  if (err && typeof err === "object") {
    const errObj = err;
    if (typeof errObj.status === "number") {
      console.error("[toErrorResponse] Erro com status detectado:", errObj.status);
      const body = errObj.body;
      return new Response(String(body?.message || errObj.message || fallbackMessage), {
        status: errObj.status
      });
    }
  }
  console.error(fallbackMessage, err);
  return new Response(fallbackMessage, {
    status: 500
  });
}
export {
  resolveUserScope as a,
  resolveScopedCompanyIds as b,
  toISODateLocal as c,
  resolveScopedVendedorIds as d,
  ensureModuloAccess as e,
  resolveAccessibleClientIds as f,
  getAdminClient as g,
  fetchGestorEquipeIdsComGestor as h,
  isUuid as i,
  getMonthRange as j,
  hasModuloAccess as k,
  normalizeText as n,
  parseIntSafe as p,
  requireAuthenticatedUser as r,
  toErrorResponse as t
};
