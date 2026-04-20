import { error } from "@sveltejs/kit";
import { i as isUuid } from "./v1.js";
const MAPA_MODULOS = {
  Dashboard: "dashboard",
  Vendas: "vendas_consulta",
  Orcamentos: "orcamentos",
  Clientes: "clientes",
  Consultoria: "consultoria_online",
  "Consultoria Online": "consultoria_online",
  Cadastros: "cadastros",
  Paises: "cadastros_paises",
  Subdivisoes: "cadastros_estados",
  Cidades: "cadastros_cidades",
  Destinos: "cadastros_destinos",
  Produtos: "cadastros_produtos",
  Circuitos: "circuitos",
  ProdutosLote: "cadastros_lote",
  Fornecedores: "cadastros_fornecedores",
  Relatorios: "relatorios",
  RelatorioVendas: "relatorios_vendas",
  RelatorioDestinos: "relatorios_destinos",
  RelatorioProdutos: "relatorios_produtos",
  RelatorioClientes: "relatorios_clientes",
  Parametros: "parametros",
  TipoProdutos: "parametros_tipo_produtos",
  TipoPacotes: "parametros_tipo_pacotes",
  Metas: "parametros_metas",
  RegrasComissao: "parametros_regras_comissao",
  ParametrosAvisos: "parametros_avisos",
  Avisos: "parametros_avisos",
  Equipe: "parametros_equipe",
  Escalas: "parametros_escalas",
  Cambios: "parametros_cambios",
  "Orcamentos (PDF)": "parametros_orcamentos",
  "Formas de Pagamento": "parametros_formas_pagamento",
  CRM: "parametros_crm",
  CrmTemplates: "parametros_crm",
  Admin: "admin",
  AdminDashboard: "admin_dashboard",
  AdminUsers: "admin_users",
  AdminLogs: "admin_logs",
  AdminEmpresas: "admin_empresas",
  AdminFinanceiro: "admin_financeiro",
  AdminPlanos: "admin_planos",
  AdminUserTypes: "admin_user_types",
  MasterEmpresas: "master_empresas",
  MasterUsuarios: "master_usuarios",
  MasterPermissoes: "master_permissoes",
  Operacao: "operacao",
  Agenda: "operacao_agenda",
  Todo: "operacao_todo",
  Tarefas: "operacao_todo",
  "Mural de Recados": "operacao_recados",
  "Minhas Preferencias": "operacao_preferencias",
  "Documentos Viagens": "operacao_documentos_viagens",
  Vouchers: "operacao_vouchers",
  Conciliacao: "operacao_conciliacao",
  Campanhas: "operacao_campanhas",
  Viagens: "operacao_viagens",
  "Controle de SAC": "operacao_controle_sac",
  Comissionamento: "comissionamento",
  "Ranking de vendas": "relatorios_ranking_vendas",
  "Importar Contratos": "vendas_importar",
  Perfil: "perfil"
};
const MODULO_ALIASES = Object.entries(MAPA_MODULOS).reduce(
  (acc, [label, key]) => {
    acc[label.toLowerCase()] = key;
    acc[key.toLowerCase()] = key;
    return acc;
  },
  {}
);
const MODULO_REVERSE = Object.entries(MAPA_MODULOS).reduce(
  (acc, [label, key]) => {
    acc[key] = label;
    return acc;
  },
  {}
);
const MODULO_PREFERENCIAS = {
  consultoria_online: "Consultoria Online",
  operacao_todo: "Tarefas",
  parametros_avisos: "Avisos",
  parametros_crm: "CRM"
};
const ROTAS_MODULOS = {
  "/dashboard/logs": "Admin",
  "/dashboard/admin": "Admin",
  "/dashboard/permissoes": "Admin",
  "/dashboard/master": "Dashboard",
  "/dashboard/gestor": "Dashboard",
  "/dashboard/vendedor": "Dashboard",
  "/dashboard/geral": "Dashboard",
  "/admin/permissoes": "Admin",
  "/admin/empresas": "AdminEmpresas",
  "/admin/usuarios": "AdminUsers",
  "/admin/tipos-usuario": "AdminUserTypes",
  "/admin/financeiro": "AdminFinanceiro",
  "/admin/planos": "AdminPlanos",
  "/admin/modulos-sistema": "AdminSystemModules",
  "/master/empresas": "MasterEmpresas",
  "/master/usuarios": "MasterUsuarios",
  "/master/permissoes": "MasterPermissoes",
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/vendas": "Vendas",
  "/orcamentos": "Vendas",
  "/clientes": "Clientes",
  "/cadastros/produtos": "Produtos",
  "/cadastros/circuitos": "Circuitos",
  "/cadastros/lote": "ProdutosLote",
  "/cadastros": "Cadastros",
  "/relatorios": "Relatorios",
  "/relatorios/vendas": "RelatorioVendas",
  "/relatorios/vendas-por-destino": "RelatorioDestinos",
  "/relatorios/vendas-por-produto": "RelatorioProdutos",
  "/relatorios/vendas-por-cliente": "RelatorioClientes",
  "/relatorios/ranking-vendas/view": "Dashboard",
  "/relatorios/ranking-vendas": "Ranking de vendas",
  "/parametros": "Parametros",
  "/parametros/tipo-pacotes": "TipoPacotes",
  "/parametros/equipe": "Equipe",
  "/parametros/escalas": "Escalas",
  "/parametros/cambios": "Cambios",
  "/parametros/crm": "CRM",
  "/parametros/avisos": "Avisos",
  "/parametros/orcamentos": "Orcamentos (PDF)",
  "/parametros/formas-pagamento": "Formas de Pagamento",
  "/admin": "Admin",
  "/documentacao": "Admin",
  "/consultoria-online": "Consultoria Online",
  "/operacao/agenda": "Agenda",
  "/operacao/todo": "Tarefas",
  "/operacao/recados": "Mural de Recados",
  "/operacao/minhas-preferencias": "Minhas Preferencias",
  "/operacao/documentos-viagens": "Documentos Viagens",
  "/operacao/vouchers": "Vouchers",
  "/operacao/viagens": "Viagens",
  "/operacao/conciliacao": "Conciliacao",
  "/financeiro/ajustes-vendas": "Conciliacao",
  "/operacao/campanhas": "Campanhas",
  "/operacao/comissionamento": "Comissionamento",
  "/chat": "Mural de Recados",
  "/operacao/controle-sac": "Controle de SAC",
  "/vendas/importar": "Importar Contratos",
  "/gestor/importar-vendas": "Vendas",
  "/metas/vendedor": "Metas",
  "/comissoes/fechamento": "Metas",
  "/perfil": "Perfil",
  "/perfil/personalizar": "Perfil",
  "/perfil/escala": "Perfil"
};
const MODULO_HERANCA = {
  Agenda: ["Operacao"],
  Todo: ["Operacao"],
  Tarefas: ["Operacao"],
  "Mural de Recados": ["Operacao"],
  "Minhas Preferencias": ["Operacao"],
  "Documentos Viagens": ["Operacao"],
  Vouchers: ["Operacao", "Viagens"],
  "Controle de SAC": ["Operacao"],
  Campanhas: ["Operacao"],
  CRM: ["Parametros"],
  ParametrosAvisos: ["Parametros"],
  Avisos: ["Parametros"],
  "Importar Contratos": ["Vendas"]
};
const SECOES_PERMISSOES = [
  {
    id: "trial",
    titulo: "Trial",
    modulos: [
      "Dashboard",
      "Vendas",
      "Orcamentos",
      "Clientes",
      "Circuitos",
      "Comissionamento",
      "Importar Contratos",
      "Operacao"
    ]
  },
  {
    id: "basica",
    titulo: "Basica",
    includes: ["trial"],
    modulos: [
      "Consultoria Online",
      "Viagens",
      "Tarefas",
      "Agenda",
      "Mural de Recados",
      "Campanhas",
      "Perfil",
      "Minhas Preferencias",
      "Documentos Viagens",
      "Vouchers"
    ]
  },
  {
    id: "relatorios",
    titulo: "Relatorios",
    modulos: ["Relatorios", "RelatorioVendas", "RelatorioDestinos", "RelatorioProdutos", "RelatorioClientes"]
  },
  {
    id: "gestor",
    titulo: "Gestor",
    modulos: ["Ranking de vendas", "Controle de SAC", "Conciliacao", "Metas", "Equipe", "Escalas"]
  },
  {
    id: "master",
    titulo: "Master",
    modulos: ["MasterEmpresas", "MasterUsuarios", "MasterPermissoes"]
  },
  {
    id: "cadastro",
    titulo: "Cadastro",
    modulos: ["Cadastros", "Paises", "Subdivisoes", "Cidades", "Destinos", "Produtos", "ProdutosLote", "Fornecedores"]
  },
  {
    id: "parametros",
    titulo: "Parametros",
    modulos: [
      "Parametros",
      "TipoProdutos",
      "TipoPacotes",
      "RegrasComissao",
      "Avisos",
      "CRM",
      "Cambios",
      "Orcamentos (PDF)",
      "Formas de Pagamento"
    ]
  },
  {
    id: "admin",
    titulo: "Admin",
    modulos: [
      "Admin",
      "AdminDashboard",
      "AdminUsers",
      "AdminLogs",
      "AdminEmpresas",
      "AdminFinanceiro",
      "AdminPlanos",
      "AdminUserTypes"
    ]
  }
];
const GLOBAL_MODULE_GROUPS = {
  Vendas: ["Orcamentos", "Importar Contratos"],
  Cadastros: ["Paises", "Subdivisoes", "Cidades", "Destinos", "Produtos", "Circuitos", "ProdutosLote", "Fornecedores"],
  Relatorios: ["RelatorioVendas", "RelatorioDestinos", "RelatorioProdutos", "RelatorioClientes", "Ranking de vendas"],
  Parametros: [
    "TipoProdutos",
    "TipoPacotes",
    "Metas",
    "RegrasComissao",
    "Avisos",
    "CRM",
    "Cambios",
    "Orcamentos (PDF)",
    "Formas de Pagamento",
    "Equipe",
    "Escalas"
  ],
  Operacao: [
    "Agenda",
    "Tarefas",
    "Mural de Recados",
    "Minhas Preferencias",
    "Documentos Viagens",
    "Vouchers",
    "Campanhas",
    "Viagens",
    "Controle de SAC",
    "Conciliacao",
    "Comissionamento"
  ],
  Admin: [
    "AdminDashboard",
    "AdminUsers",
    "AdminLogs",
    "AdminEmpresas",
    "AdminFinanceiro",
    "AdminPlanos",
    "AdminUserTypes"
  ],
  MasterPermissoes: ["MasterEmpresas", "MasterUsuarios"]
};
const GLOBAL_MODULE_PARENTS = Object.entries(GLOBAL_MODULE_GROUPS).reduce(
  (acc, [parent, children]) => {
    children.forEach((child) => {
      const key = normalizeSystemModuleKey(child);
      if (!key) return;
      const current = acc.get(key) || [];
      current.push(parent);
      acc.set(key, current);
    });
    return acc;
  },
  /* @__PURE__ */ new Map()
);
function normalizeSecaoKey(value) {
  return String(value || "").trim().toLowerCase();
}
function buildBaseModuloMap(modulosBase) {
  const map = /* @__PURE__ */ new Map();
  modulosBase.forEach((modulo) => {
    map.set(normalizeSecaoKey(modulo), modulo);
  });
  return map;
}
function resolveSecaoApplyModulos(secao, defsById, baseMap, visited) {
  if (!secao?.id || visited.has(secao.id)) return [];
  visited.add(secao.id);
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (moduloLabel) => {
    const resolved = baseMap.get(normalizeSecaoKey(moduloLabel));
    if (!resolved) return;
    const key = normalizeSecaoKey(resolved);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(resolved);
  };
  (secao.includes || []).forEach((includedId) => {
    const included = defsById[includedId];
    if (!included) return;
    resolveSecaoApplyModulos(included, defsById, baseMap, visited).forEach(push);
  });
  (secao.modulos || []).forEach(push);
  return result;
}
function normalizeModuloKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  return MODULO_ALIASES[raw] || raw.replace(/\s+/g, "_");
}
function toModuloDbKey(label) {
  return MAPA_MODULOS[label] || normalizeModuloKey(label);
}
function normalizeModuloLabel(modulo) {
  return MODULO_REVERSE[modulo] || modulo;
}
function listarModulosComHeranca(modulo) {
  const inicio = normalizeModuloLabel(modulo);
  const result = [];
  const visitado = /* @__PURE__ */ new Set();
  const visitar = (atual) => {
    if (!atual || visitado.has(atual)) return;
    visitado.add(atual);
    result.push(atual);
    (MODULO_HERANCA[atual] || []).forEach(visitar);
  };
  visitar(inicio);
  return result;
}
const MODULOS_ADMIN_PERMISSOES = (() => {
  const seen = /* @__PURE__ */ new Map();
  const list = [];
  const addLabel = (label) => {
    const key = MAPA_MODULOS[label] || label;
    const normalizedKey = String(key).toLowerCase();
    const preferred = MODULO_PREFERENCIAS[normalizedKey];
    if (seen.has(normalizedKey)) {
      if (preferred && label === preferred) {
        const index = list.indexOf(seen.get(normalizedKey) || "");
        if (index >= 0) list[index] = label;
        seen.set(normalizedKey, label);
      }
      return;
    }
    list.push(label);
    seen.set(normalizedKey, label);
  };
  Object.keys(MAPA_MODULOS).forEach(addLabel);
  return list;
})();
function agruparModulosPorSecao(modulosBase) {
  const baseMap = buildBaseModuloMap(modulosBase);
  const defsById = SECOES_PERMISSOES.reduce(
    (acc, secao) => {
      acc[secao.id] = secao;
      return acc;
    },
    {}
  );
  const usedKeys = /* @__PURE__ */ new Set();
  const grupos = [];
  for (const secao of SECOES_PERMISSOES) {
    const modulos = (secao.modulos || []).map((label) => baseMap.get(normalizeSecaoKey(label)) || null).filter(Boolean);
    const applyModulos = resolveSecaoApplyModulos(secao, defsById, baseMap, /* @__PURE__ */ new Set());
    applyModulos.forEach((modulo) => usedKeys.add(normalizeSecaoKey(modulo)));
    if (!modulos.length && !applyModulos.length) continue;
    grupos.push({
      id: secao.id,
      titulo: secao.titulo,
      modulos,
      applyModulos,
      includes: secao.includes || []
    });
  }
  const outros = (modulosBase || []).filter((modulo) => !usedKeys.has(normalizeSecaoKey(modulo)));
  if (outros.length) {
    grupos.push({
      id: "outros",
      titulo: "Outros",
      modulos: outros,
      applyModulos: outros,
      includes: []
    });
  }
  return grupos;
}
function normalizeSystemModuleKey(value) {
  return normalizeModuloKey(value);
}
function listSystemModuleCatalog(extraLabels = []) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  const push = (labelValue) => {
    const label = String(labelValue || "").trim();
    if (!label) return;
    const key = normalizeSystemModuleKey(MAPA_MODULOS[label] || label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push({
      key,
      label: normalizeModuloLabel(key)
    });
  };
  MODULOS_ADMIN_PERMISSOES.forEach(push);
  extraLabels.forEach(push);
  return result;
}
function isMissingSystemModuleSettingsTable(error2) {
  const err = error2;
  const code = String(err?.code || "").toLowerCase();
  const message = String(err?.message || "").toLowerCase();
  return code === "42p01" || (message.includes("relation") || message.includes("table")) && message.includes("system_module_settings") || message.includes("does not exist") && message.includes("system_module_settings");
}
function toDisabledSet(disabledModules) {
  const set = /* @__PURE__ */ new Set();
  for (const value of disabledModules || []) {
    const key = normalizeSystemModuleKey(value);
    if (key) set.add(key);
  }
  return set;
}
function isSystemModuleDisabled(modulo, disabledModules, isSystemAdmin = false) {
  if (isSystemAdmin) return false;
  const disabledSet = toDisabledSet(disabledModules);
  if (!disabledSet.size) return false;
  const labels = listarModulosComHeranca(normalizeModuloLabel(modulo));
  const candidates = /* @__PURE__ */ new Set();
  const queue = [...labels, normalizeModuloLabel(modulo)];
  const visitedParents = /* @__PURE__ */ new Set();
  while (queue.length > 0) {
    const currentLabel = queue.shift() || "";
    if (!currentLabel) continue;
    const currentKey = normalizeSystemModuleKey(currentLabel);
    if (currentKey) {
      candidates.add(currentKey);
      const dbKey = normalizeSystemModuleKey(MAPA_MODULOS[currentLabel] || currentLabel);
      if (dbKey) candidates.add(dbKey);
      const parents = GLOBAL_MODULE_PARENTS.get(currentKey) || [];
      parents.forEach((parentLabel) => {
        if (visitedParents.has(parentLabel)) return;
        visitedParents.add(parentLabel);
        queue.push(parentLabel);
      });
    }
  }
  const directKey = normalizeSystemModuleKey(modulo);
  if (directKey) candidates.add(directKey);
  for (const candidate of candidates) {
    if (disabledSet.has(candidate)) return true;
  }
  return false;
}
function descobrirModulo(pathname) {
  if (pathname === "/") return ROTAS_MODULOS["/"];
  const entradas = Object.keys(ROTAS_MODULOS).filter((rota) => rota !== "/").sort((a, b) => b.length - a.length);
  for (const rota of entradas) {
    if (pathname.startsWith(rota)) return ROTAS_MODULOS[rota];
  }
  return null;
}
const DEFAULT_FROM_EMAILS = {
  alerta: "alerta@vtur.com.br",
  admin: "admin@vtur.com.br",
  avisos: "avisos@vtur.com.br",
  financeiro: "financeiro@vtur.com.br",
  suporte: "suporte@vtur.com.br"
};
function firstEmbedded(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
function extractUserTypeName(record) {
  return String(firstEmbedded(record?.user_types)?.name || "").trim().toUpperCase();
}
function extractCompanyName(record) {
  const company = firstEmbedded(record?.companies);
  return String(company?.nome_fantasia || company?.nome_empresa || "").trim();
}
function isSystemAdminRole(role) {
  return String(role || "").trim().toUpperCase().includes("ADMIN");
}
function isMasterRole(role) {
  return String(role || "").trim().toUpperCase().includes("MASTER");
}
function isGestorRole(role) {
  return String(role || "").trim().toUpperCase().includes("GESTOR");
}
function isSellerRole(role) {
  return String(role || "").trim().toUpperCase().includes("VENDEDOR");
}
function normalizeUserType(role) {
  return String(role || "").trim().toUpperCase();
}
function isRestrictedUserTypeName(role) {
  const normalized = String(role || "").trim().toUpperCase();
  return normalized.includes("ADMIN") || normalized.includes("MASTER");
}
function getAccessibleCompanyIds(scope) {
  const ids = /* @__PURE__ */ new Set();
  if (scope.companyId && isUuid(scope.companyId)) ids.add(scope.companyId);
  (scope.companyIds || []).forEach((companyId) => {
    if (isUuid(companyId)) ids.add(companyId);
  });
  return Array.from(ids);
}
function canManageUsers(scope) {
  return scope.isAdmin || scope.isMaster || scope.isGestor || Boolean(scope.permissoes.admin) || Boolean(scope.permissoes.admin_users);
}
function canManagePermissions(scope) {
  return scope.isAdmin || scope.isMaster || Boolean(scope.permissoes.admin) || Boolean(scope.permissoes.master_permissoes);
}
function canManageCompanies(scope) {
  return scope.isAdmin || scope.isMaster || Boolean(scope.permissoes.admin_empresas);
}
function ensureCanManageUsers(scope) {
  if (!canManageUsers(scope)) {
    throw error(403, "Sem permissao para administrar usuarios.");
  }
}
function ensureCanManagePermissions(scope) {
  if (!canManagePermissions(scope)) {
    throw error(403, "Sem permissao para administrar permissoes.");
  }
}
function ensureCanManageCompanies(scope) {
  if (!canManageCompanies(scope)) {
    throw error(403, "Sem permissao para administrar empresas.");
  }
}
function isUserInScope(scope, row) {
  if (scope.isAdmin) return true;
  if (row.id === scope.userId) return true;
  const roleName = extractUserTypeName({ user_types: row.user_types });
  const companyId = String(row.company_id || "").trim();
  const accessibleCompanies = new Set(getAccessibleCompanyIds(scope));
  if (scope.isMaster) {
    return accessibleCompanies.has(companyId);
  }
  if (scope.isGestor) {
    return companyId === scope.companyId || isSellerRole(roleName);
  }
  return false;
}
function ensureTargetUserScope(scope, row) {
  if (scope.isAdmin || row.id === scope.userId) return;
  const roleName = extractUserTypeName({ user_types: row.user_types });
  const companyId = String(row.company_id || "").trim();
  const accessibleCompanies = new Set(getAccessibleCompanyIds(scope));
  if (scope.isMaster) {
    if (!accessibleCompanies.has(companyId) || isRestrictedUserTypeName(roleName)) {
      throw error(403, "Usuario fora do escopo do master.");
    }
    return;
  }
  if (scope.isGestor) {
    if (companyId !== scope.companyId || !isSellerRole(roleName)) {
      throw error(403, "Gestor so pode administrar vendedores da propria empresa.");
    }
    return;
  }
  throw error(403, "Usuario fora do escopo permitido.");
}
function ensureAssignableCompany(scope, companyId) {
  const targetCompanyId = String(companyId || "").trim();
  if (!targetCompanyId) {
    if (!scope.isAdmin) {
      throw error(400, "Empresa obrigatoria para usuarios corporativos.");
    }
    return;
  }
  if (scope.isAdmin) return;
  const accessibleCompanies = new Set(getAccessibleCompanyIds(scope));
  if (scope.isMaster) {
    if (!accessibleCompanies.has(targetCompanyId)) {
      throw error(403, "Empresa fora do portfolio do master.");
    }
    return;
  }
  if (scope.isGestor && targetCompanyId !== scope.companyId) {
    throw error(403, "Gestor so pode operar na propria empresa.");
  }
}
function ensureAssignableUserType(scope, typeName) {
  const normalized = String(typeName || "").trim().toUpperCase();
  if (!normalized) return;
  if (scope.isAdmin) return;
  if (scope.isMaster && isRestrictedUserTypeName(normalized)) {
    throw error(403, "Master nao pode atribuir perfis ADMIN ou MASTER.");
  }
  if (scope.isGestor && !isSellerRole(normalized)) {
    throw error(403, "Gestor so pode atribuir perfil de vendedor.");
  }
}
async function listManagedUsers(client, scope) {
  let query = client.from("users").select(
    `
        id,
        nome_completo,
        email,
        telefone,
        cidade,
        estado,
        active,
        ativo,
        user_type_id,
        company_id,
        uso_individual,
        created_by_gestor,
        participa_ranking,
        created_at,
        updated_at,
        user_types(name),
        companies(nome_fantasia, nome_empresa)
      `
  ).order("nome_completo", { ascending: true }).limit(2e3);
  if (!scope.isAdmin) {
    const accessibleCompanies = getAccessibleCompanyIds(scope);
    if (scope.isMaster && accessibleCompanies.length > 0) {
      query = query.in("company_id", accessibleCompanies);
    } else if (scope.companyId) {
      query = query.eq("company_id", scope.companyId);
    } else {
      query = query.eq("id", scope.userId);
    }
  }
  const { data, error: queryError } = await query;
  if (queryError) throw queryError;
  return (data || []).filter((row) => isUserInScope(scope, row));
}
async function loadManagedUser(client, scope, userId) {
  const { data, error: queryError } = await client.from("users").select(
    `
        id,
        nome_completo,
        email,
        telefone,
        cidade,
        estado,
        active,
        ativo,
        user_type_id,
        company_id,
        uso_individual,
        created_by_gestor,
        participa_ranking,
        created_at,
        updated_at,
        user_types(name),
        companies(nome_fantasia, nome_empresa)
      `
  ).eq("id", userId).maybeSingle();
  if (queryError || !data) {
    throw error(404, "Usuario nao encontrado.");
  }
  const row = data;
  ensureTargetUserScope(scope, row);
  return row;
}
async function loadManagedUserTypes(client, scope) {
  const { data, error: queryError } = await client.from("user_types").select("id, name, description, created_at").order("name", { ascending: true });
  if (queryError) throw queryError;
  const rows = data || [];
  return rows.filter((row) => {
    if (scope.isAdmin) return true;
    if (scope.isMaster) return !isRestrictedUserTypeName(row.name);
    if (scope.isGestor) return isSellerRole(row.name);
    return false;
  });
}
async function loadManagedCompanies(client, scope) {
  let query = client.from("companies").select(
    `
        id,
        nome_empresa,
        nome_fantasia,
        cnpj,
        telefone,
        endereco,
        cidade,
        estado,
        active
      `
  ).order("nome_fantasia", { ascending: true });
  if (!scope.isAdmin) {
    const accessibleCompanies = getAccessibleCompanyIds(scope);
    if (accessibleCompanies.length === 0) return [];
    query = query.in("id", accessibleCompanies);
  }
  const { data, error: queryError } = await query;
  if (queryError) throw queryError;
  return data || [];
}
async function loadUserPermissions(client, userId) {
  const { data, error: queryError } = await client.from("modulo_acesso").select("id, usuario_id, modulo, permissao, ativo").eq("usuario_id", userId);
  if (queryError) throw queryError;
  return data || [];
}
async function loadUserTypeDefaultPermissions(client, userTypeId) {
  const { data, error: queryError } = await client.from("user_type_default_perms").select("id, user_type_id, modulo, permissao, ativo").eq("user_type_id", userTypeId);
  if (queryError) throw queryError;
  return data || [];
}
function buildPermissionMatrix(rows) {
  const rowMap = /* @__PURE__ */ new Map();
  (rows || []).forEach((row) => {
    const key = normalizeModuloKey(row?.modulo);
    if (!key) return;
    rowMap.set(key, {
      modulo: key,
      permissao: String(row?.permissao || "none"),
      ativo: row?.ativo !== false
    });
  });
  return MODULOS_ADMIN_PERMISSOES.map((label) => {
    const key = normalizeModuloKey(toModuloDbKey(label));
    const current = rowMap.get(key);
    return {
      label,
      modulo: key,
      permissao: current?.permissao || "none",
      ativo: current?.ativo !== false && current?.permissao !== "none"
    };
  });
}
async function saveUserPermissions(client, userId, permissions) {
  const normalized = permissions.map((item) => ({
    modulo: normalizeModuloKey(item.modulo),
    permissao: String(item.permissao || "none").toLowerCase(),
    ativo: item.ativo !== false && String(item.permissao || "").toLowerCase() !== "none"
  }));
  const keys = Array.from(new Set(normalized.map((item) => item.modulo).filter(Boolean)));
  if (!keys.length) return;
  const { data: existingRows, error: existingError } = await client.from("modulo_acesso").select("id, modulo").eq("usuario_id", userId).in("modulo", keys);
  if (existingError) throw existingError;
  const existingMap = /* @__PURE__ */ new Map();
  (existingRows || []).forEach((row) => {
    const key = normalizeModuloKey(row.modulo);
    if (key && row.id) existingMap.set(key, row.id);
  });
  for (const item of normalized) {
    const payload = {
      usuario_id: userId,
      modulo: item.modulo,
      permissao: item.permissao,
      ativo: item.ativo
    };
    const existingId = existingMap.get(item.modulo);
    if (existingId) {
      const { error: updateError } = await client.from("modulo_acesso").update(payload).eq("id", existingId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client.from("modulo_acesso").insert(payload);
      if (insertError) throw insertError;
    }
  }
}
async function saveDefaultPermissions(client, userTypeId, permissions) {
  const normalized = permissions.map((item) => ({
    modulo: normalizeModuloKey(item.modulo),
    permissao: String(item.permissao || "none").toLowerCase(),
    ativo: item.ativo !== false && String(item.permissao || "").toLowerCase() !== "none"
  }));
  const keys = Array.from(new Set(normalized.map((item) => item.modulo).filter(Boolean)));
  if (!keys.length) return;
  const { data: existingRows, error: existingError } = await client.from("user_type_default_perms").select("id, modulo").eq("user_type_id", userTypeId).in("modulo", keys);
  if (existingError) throw existingError;
  const existingMap = /* @__PURE__ */ new Map();
  (existingRows || []).forEach((row) => {
    const key = normalizeModuloKey(row.modulo);
    if (key && row.id) existingMap.set(key, row.id);
  });
  for (const item of normalized) {
    const payload = {
      user_type_id: userTypeId,
      modulo: item.modulo,
      permissao: item.permissao,
      ativo: item.ativo
    };
    const existingId = existingMap.get(item.modulo);
    if (existingId) {
      const { error: updateError } = await client.from("user_type_default_perms").update(payload).eq("id", existingId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client.from("user_type_default_perms").insert(payload);
      if (insertError) throw insertError;
    }
  }
}
async function syncUserTypeDefaultPermissions(client, userId, userTypeId) {
  const normalizedUserTypeId = String(userTypeId || "").trim();
  if (!normalizedUserTypeId) return;
  const defaults = await loadUserTypeDefaultPermissions(client, normalizedUserTypeId);
  if (!defaults.length) return;
  await saveUserPermissions(
    client,
    userId,
    defaults.map((row) => ({
      modulo: row.modulo,
      permissao: row.permissao,
      ativo: row.ativo !== false
    }))
  );
}
async function findAuthUserIdByEmail(client, email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;
  const perPage = 200;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error: listError } = await client.auth.admin.listUsers({ page, perPage });
    if (listError) throw listError;
    const users = data?.users || [];
    const found = users.find((user) => String(user.email || "").trim().toLowerCase() === normalized);
    if (found?.id) return String(found.id);
    if (users.length < perPage) break;
  }
  return null;
}
async function createOrReuseAuthUser(client, payload) {
  const existingUserId = await findAuthUserIdByEmail(client, payload.email);
  if (existingUserId) {
    return { userId: existingUserId, created: false };
  }
  const { data, error: createError } = await client.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true
  });
  if (createError) throw createError;
  const userId = String(data.user?.id || "").trim();
  if (!userId) {
    throw error(500, "Falha ao criar autenticacao.");
  }
  return { userId, created: true };
}
async function loadSystemModuleSettings(client) {
  const { data, error: queryError } = await client.from("system_module_settings").select("module_key, enabled, reason, updated_at, updated_by");
  if (queryError) throw queryError;
  const catalog = listSystemModuleCatalog(
    (data || []).map((row) => String(row.module_key || "").trim())
  );
  return {
    rows: data || [],
    catalog
  };
}
async function saveSystemModuleSettings(client, payload) {
  for (const item of payload) {
    const moduleKey = normalizeModuloKey(item.module_key);
    if (!moduleKey) continue;
    const { data: existingRow, error: existingError } = await client.from("system_module_settings").select("module_key").eq("module_key", moduleKey).maybeSingle();
    if (existingError) throw existingError;
    const rowPayload = {
      module_key: moduleKey,
      enabled: item.enabled !== false,
      reason: item.reason || null,
      updated_by: item.updated_by || null
    };
    if (existingRow) {
      const { error: updateError } = await client.from("system_module_settings").update(rowPayload).eq("module_key", moduleKey);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client.from("system_module_settings").insert(rowPayload);
      if (insertError) throw insertError;
    }
  }
}
async function loadAvisoTemplates(client) {
  const { data, error: queryError } = await client.from("admin_avisos_templates").select("id, nome, assunto, mensagem, ativo, sender_key").order("nome", { ascending: true });
  if (!queryError) {
    return (data || []).map((row) => ({
      ...row,
      sender_key: row.sender_key || "avisos"
    }));
  }
  const message = String(queryError.message || "").toLowerCase();
  if (!message.includes("sender_key") && !message.includes("schema cache")) {
    throw queryError;
  }
  const fallback = await client.from("admin_avisos_templates").select("id, nome, assunto, mensagem, ativo").order("nome", { ascending: true });
  if (fallback.error) throw fallback.error;
  return (fallback.data || []).map((row) => ({
    ...row,
    sender_key: "avisos"
  }));
}
async function loadEmailSettings(client) {
  const { data, error: queryError } = await client.from("admin_email_settings").select(
    "id, singleton, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, resend_api_key, alerta_from_email, admin_from_email, avisos_from_email, financeiro_from_email, suporte_from_email"
  ).eq("singleton", true).maybeSingle();
  if (queryError) throw queryError;
  return data || null;
}
function buildFromEmails(settings) {
  const alerta = String(settings?.alerta_from_email || DEFAULT_FROM_EMAILS.alerta).trim();
  const admin2 = String(settings?.admin_from_email || DEFAULT_FROM_EMAILS.admin).trim();
  const avisos = String(settings?.avisos_from_email || DEFAULT_FROM_EMAILS.avisos).trim();
  const financeiro = String(settings?.financeiro_from_email || DEFAULT_FROM_EMAILS.financeiro).trim();
  const suporte = String(settings?.suporte_from_email || DEFAULT_FROM_EMAILS.suporte).trim();
  return {
    alerta,
    admin: admin2,
    avisos,
    financeiro,
    suporte,
    default: avisos || admin2 || alerta
  };
}
function applyTemplate(text, vars) {
  return String(text || "").replace(/{{\s*nome\s*}}/gi, vars.nome || "").replace(/{{\s*email\s*}}/gi, vars.email || "").replace(/{{\s*empresa\s*}}/gi, vars.empresa || "").replace(/{{\s*senha\s*}}/gi, vars.senha || "");
}
const admin = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DEFAULT_FROM_EMAILS,
  applyTemplate,
  buildFromEmails,
  buildPermissionMatrix,
  canManageCompanies,
  canManagePermissions,
  canManageUsers,
  createOrReuseAuthUser,
  ensureAssignableCompany,
  ensureAssignableUserType,
  ensureCanManageCompanies,
  ensureCanManagePermissions,
  ensureCanManageUsers,
  ensureTargetUserScope,
  extractCompanyName,
  extractUserTypeName,
  findAuthUserIdByEmail,
  getAccessibleCompanyIds,
  isGestorRole,
  isMasterRole,
  isRestrictedUserTypeName,
  isSellerRole,
  isSystemAdminRole,
  isUserInScope,
  listManagedUsers,
  loadAvisoTemplates,
  loadEmailSettings,
  loadManagedCompanies,
  loadManagedUser,
  loadManagedUserTypes,
  loadSystemModuleSettings,
  loadUserPermissions,
  loadUserTypeDefaultPermissions,
  normalizeUserType,
  saveDefaultPermissions,
  saveSystemModuleSettings,
  saveUserPermissions,
  syncUserTypeDefaultPermissions
}, Symbol.toStringTag, { value: "Module" }));
export {
  extractCompanyName as A,
  ensureAssignableUserType as B,
  ensureAssignableCompany as C,
  createOrReuseAuthUser as D,
  syncUserTypeDefaultPermissions as E,
  normalizeUserType as F,
  isSystemAdminRole as G,
  descobrirModulo as H,
  isSystemModuleDisabled as I,
  listarModulosComHeranca as J,
  MAPA_MODULOS as K,
  MODULO_ALIASES as L,
  MODULOS_ADMIN_PERMISSOES as M,
  admin as N,
  loadAvisoTemplates as a,
  loadEmailSettings as b,
  buildFromEmails as c,
  applyTemplate as d,
  ensureCanManageUsers as e,
  findAuthUserIdByEmail as f,
  ensureCanManageCompanies as g,
  getAccessibleCompanyIds as h,
  ensureCanManagePermissions as i,
  listManagedUsers as j,
  loadSystemModuleSettings as k,
  loadManagedUser as l,
  isMissingSystemModuleSettingsTable as m,
  listSystemModuleCatalog as n,
  agruparModulosPorSecao as o,
  saveUserPermissions as p,
  loadUserPermissions as q,
  buildPermissionMatrix as r,
  saveSystemModuleSettings as s,
  canManageUsers as t,
  canManageCompanies as u,
  loadManagedCompanies as v,
  loadManagedUserTypes as w,
  loadUserTypeDefaultPermissions as x,
  saveDefaultPermissions as y,
  extractUserTypeName as z
};
