import { a as createSupabaseServerClient } from "../chunks/supabase.js";
import { sequence } from "@sveltejs/kit/hooks";
import { redirect } from "@sveltejs/kit";
import { z as extractUserTypeName, F as normalizeUserType, G as isSystemAdminRole, H as descobrirModulo, m as isMissingSystemModuleSettingsTable, I as isSystemModuleDisabled, J as listarModulosComHeranca, K as MAPA_MODULOS, L as MODULO_ALIASES } from "../chunks/admin.js";
function getPrimaryVerifiedTotpFactor(factors) {
  const totpFactors = Array.isArray(factors?.totp) ? factors.totp : [];
  return totpFactors.find((factor) => factor?.status === "verified") || totpFactors[0] || null;
}
function hasVerifiedTotpFactor(factors) {
  return Boolean(getPrimaryVerifiedTotpFactor(factors));
}
function normalizeMfaRedirectPath(next, fallback = "/dashboard") {
  const value = String(next || "").trim();
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.startsWith("/auth/login")) return fallback;
  return value;
}
function resolveDashboardPathByUserType(userTypeRaw, fallbackPath = "/") {
  const tipo = String(userTypeRaw || "").trim().toUpperCase();
  if (tipo.includes("ADMIN")) return "/dashboard/admin";
  if (tipo.includes("MASTER")) return "/dashboard/master";
  if (tipo.includes("GESTOR")) return "/dashboard/gestor";
  return fallbackPath;
}
const permLevel = (p) => {
  switch ((p || "").toLowerCase()) {
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
};
const normalizePermissao = (value) => {
  const perm = (value || "").toLowerCase();
  if (perm === "admin") return "admin";
  if (perm === "delete") return "delete";
  if (perm === "edit") return "edit";
  if (perm === "create") return "create";
  if (perm === "view") return "view";
  return "none";
};
const setPerm = (perms, key, perm) => {
  if (!key) return;
  const normalizedKey = key.toLowerCase();
  const atual = perms[normalizedKey] ?? "none";
  perms[normalizedKey] = permLevel(perm) > permLevel(atual) ? perm : atual;
};
const normalizeModuloKey = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  return MODULO_ALIASES[raw] || raw.replace(/\s+/g, "_");
};
const buildPerms = (rows) => {
  const perms = {};
  rows.forEach((registro) => {
    const modulo = String(registro.modulo || "").toLowerCase();
    if (!modulo) return;
    const permissaoNormalizada = normalizePermissao(registro.permissao);
    const finalPerm = registro.ativo ? permissaoNormalizada : "none";
    setPerm(perms, modulo, finalPerm);
    const alias = MODULO_ALIASES[modulo];
    if (alias) setPerm(perms, alias, finalPerm);
  });
  return perms;
};
function normalizePathname(pathname) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}
function isDashboardCanonicalRoute(pathname) {
  return pathname === "/" || pathname === "/dashboard" || pathname === "/dashboard/geral" || pathname === "/dashboard/vendedor" || pathname === "/dashboard/gestor" || pathname === "/dashboard/master";
}
function buildLoginRedirectUrl(url) {
  const nextPath = `${url.pathname}${url.search || ""}`;
  return `/auth/login?next=${encodeURIComponent(nextPath)}`;
}
function buildMfaSetupRedirectUrl(url) {
  const nextPath = `${url.pathname}${url.search || ""}`;
  return `/perfil?setup_2fa=1&next=${encodeURIComponent(nextPath)}`;
}
const supabaseHook = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient({
    get: (name) => event.cookies.get(name),
    set: (name, value, options) => {
      event.cookies.set(name, value, { ...options, path: "/" });
    },
    remove: (name, options) => {
      event.cookies.delete(name, { ...options, path: "/" });
    }
  });
  event.locals.safeGetSession = async () => {
    const { data: { session } } = await event.locals.supabase.auth.getSession();
    if (!session) return { session: null, user: null };
    const { data: { user }, error } = await event.locals.supabase.auth.getUser();
    if (error) return { session: null, user: null };
    return { session, user };
  };
  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === "content-range" || name === "x-supabase-api-version";
    }
  });
};
const authGuard = async ({ event, resolve }) => {
  const { url } = event;
  const pathname = url.pathname;
  const isApiRequest = pathname.startsWith("/api/");
  const rotasPublicas = [
    "/auth/login",
    "/auth/register",
    "/auth/recover",
    "/auth/reset",
    "/auth/convite",
    "/auth/update-password",
    "/manutencao",
    "/test-env",
    "/favicon",
    "/favicon.ico",
    "/icons",
    "/brand",
    "/manifest.webmanifest",
    "/_app",
    "/assets",
    "/public",
    "/pdfs",
    "/api/v1/cards"
  ];
  const isPublic = rotasPublicas.some((r) => pathname.startsWith(r));
  if (isPublic || isApiRequest) {
    return resolve(event);
  }
  const { session, user } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;
  if (!session || !user) {
    throw redirect(303, buildLoginRedirectUrl(url));
  }
  const supabase = event.locals.supabase;
  const [accRowsRes, userProfileRes] = await Promise.all([
    supabase.from("modulo_acesso").select("modulo, permissao, ativo").eq("usuario_id", user.id),
    // Consolida: tipo, must_change_password, perfil e company_id numa unica query
    supabase.from("users").select("id, company_id, nome_completo, telefone, cidade, estado, uso_individual, must_change_password, user_types(name)").eq("id", user.id).maybeSingle()
  ]);
  const acessos = buildPerms(
    accRowsRes.data || []
  );
  const perfil = userProfileRes.data;
  const rawType = extractUserTypeName(perfil);
  const userType = normalizeUserType(rawType);
  const isSystemAdmin = isSystemAdminRole(userType);
  event.locals.userType = userType;
  event.locals.isSystemAdmin = isSystemAdmin;
  event.locals.acessos = acessos;
  const rotasSenhaObrigatoriaPermitidas = ["/perfil", "/auth", "/api/companies", "/api/welcome-email", "/api/users"];
  const isSenhaObrigatoriaAllowed = rotasSenhaObrigatoriaPermitidas.some((prefix) => pathname.startsWith(prefix));
  if (!isSenhaObrigatoriaAllowed) {
    const missingColumn = String(userProfileRes.error?.code || "") === "42703" || String(userProfileRes.error?.message || "").toLowerCase().includes("must_change_password");
    if (!userProfileRes.error || missingColumn) {
      if (Boolean(perfil?.must_change_password)) {
        throw redirect(303, "/perfil?force_password=1");
      }
    } else {
      console.error("[hooks.server] falha ao verificar troca obrigatoria de senha", userProfileRes.error);
    }
  }
  if (isSystemAdmin) {
    return resolve(event);
  }
  const rotasOnboardingPermitidas = ["/perfil", "/auth", "/api/companies", "/api/welcome-email"];
  const isOnboardingAllowed = rotasOnboardingPermitidas.some((prefix) => pathname.startsWith(prefix));
  if (!isOnboardingAllowed && perfil) {
    const precisaOnboarding = !perfil?.nome_completo || !perfil?.telefone || !perfil?.cidade || !perfil?.estado || perfil?.uso_individual === null || perfil?.uso_individual === void 0;
    if (precisaOnboarding) {
      throw redirect(303, "/perfil/onboarding");
    }
  }
  const isMfaRoute = pathname.startsWith("/auth/mfa");
  const companyId = String(perfil?.company_id || "").trim() || null;
  try {
    let mfaObrigatorio = false;
    if (companyId) {
      const { data: paramData, error: paramErr } = await supabase.from("parametros_comissao").select("mfa_obrigatorio").eq("company_id", companyId).maybeSingle();
      if (paramErr) throw paramErr;
      mfaObrigatorio = Boolean(paramData?.mfa_obrigatorio);
    }
    const [{ data: aalData, error: aalError }, { data: factorsData, error: factorsError }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors()
    ]);
    if (!aalError && !factorsError) {
      const hasFactor = hasVerifiedTotpFactor(factorsData || null);
      if (mfaObrigatorio && !hasFactor && !pathname.startsWith("/perfil")) {
        throw redirect(303, buildMfaSetupRedirectUrl(url));
      }
      const precisaMfa = hasFactor && aalData?.nextLevel === "aal2" && aalData?.currentLevel !== "aal2";
      if (precisaMfa && !isMfaRoute) {
        const nextPath = normalizeMfaRedirectPath(`${pathname}${url.search || ""}`, "/dashboard");
        throw redirect(303, `/auth/mfa?next=${encodeURIComponent(nextPath)}`);
      }
    }
  } catch (mfaError) {
    console.error("[hooks.server] falha ao verificar MFA", mfaError);
  }
  const normalizedPathname = normalizePathname(pathname);
  if (isDashboardCanonicalRoute(normalizedPathname)) {
    const canonicalDashboardPath = resolveDashboardPathByUserType(userType, "/");
    if (normalizedPathname !== canonicalDashboardPath) {
      const targetUrl = new URL(canonicalDashboardPath, url);
      targetUrl.search = url.search;
      throw redirect(303, targetUrl.toString());
    }
  }
  if (pathname.startsWith("/perfil") || pathname.startsWith("/negado") || pathname.startsWith("/documentacao") || // Dashboard é acessível a qualquer usuário autenticado — sem verificação de módulo
  pathname === "/" || pathname.startsWith("/dashboard")) {
    return resolve(event);
  }
  const modulo = descobrirModulo(pathname);
  if (!modulo) return resolve(event);
  try {
    const { data: disabledRows, error: disabledErr } = await supabase.from("system_module_settings").select("module_key").eq("enabled", false);
    if (disabledErr) {
      if (!isMissingSystemModuleSettingsTable(disabledErr)) throw disabledErr;
    } else {
      const disabledModules = (disabledRows || []).map((row) => String(row?.module_key || "")).filter(Boolean);
      if (isSystemModuleDisabled(modulo, disabledModules, false)) {
        throw redirect(303, "/negado");
      }
    }
  } catch (disabledCheckErr) {
    console.error("[hooks.server] falha ao validar modulos globais", disabledCheckErr);
  }
  const modulosConsulta = Array.from(
    new Set(
      listarModulosComHeranca(modulo).flatMap((label) => {
        const key = MAPA_MODULOS[label];
        return key ? [label, key] : [label];
      })
    )
  );
  const modulosPermitidos = /* @__PURE__ */ new Set();
  modulosConsulta.forEach((entry) => {
    const normalized = normalizeModuloKey(entry);
    if (normalized) modulosPermitidos.add(normalized);
  });
  const accRowsParaModulo = accRowsRes.data || [];
  const acessosValidos = accRowsParaModulo.filter((row) => {
    if (!row?.ativo) return false;
    const moduloKey = normalizeModuloKey(row?.modulo);
    return moduloKey ? modulosPermitidos.has(moduloKey) : false;
  });
  if (acessosValidos.length === 0) {
    throw redirect(303, "/negado");
  }
  const nivelOrdem = ["none", "view", "create", "edit", "delete", "admin"];
  const melhorPermissao = acessosValidos.reduce(
    (acc, row) => {
      const perm = String(row.permissao || "none");
      const idx = nivelOrdem.indexOf(perm);
      if (idx > acc.idx) return { perm, idx };
      return acc;
    },
    { perm: "none", idx: 0 }
  );
  if (nivelOrdem.indexOf(melhorPermissao.perm) < 1) {
    throw redirect(303, "/negado");
  }
  return resolve(event);
};
const handle = sequence(supabaseHook, authGuard);
export {
  handle
};
