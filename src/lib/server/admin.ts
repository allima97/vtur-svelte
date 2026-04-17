import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MODULOS_ADMIN_PERMISSOES,
  listSystemModuleCatalog,
  normalizeModuloKey,
  toModuloDbKey
} from '$lib/admin/modules';
import { getAdminClient, isUuid, type UserScope } from '$lib/server/v1';

export type ManagedUserRow = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  telefone?: string | null;
  cidade?: string | null;
  estado?: string | null;
  active?: boolean | null;
  ativo?: boolean | null;
  user_type_id?: string | null;
  company_id?: string | null;
  uso_individual?: boolean | null;
  created_by_gestor?: boolean | null;
  participa_ranking?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_types?: { name?: string | null } | { name?: string | null }[] | null;
  companies?:
    | { nome_fantasia?: string | null; nome_empresa?: string | null }
    | Array<{ nome_fantasia?: string | null; nome_empresa?: string | null }>
    | null;
};

export type ManagedUserTypeRow = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string | null;
};

export type ManagedCompanyRow = {
  id: string;
  nome_empresa?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  active?: boolean | null;
};

export type ManagedPermissionRow = {
  id?: string;
  usuario_id: string;
  modulo: string;
  permissao: string;
  ativo: boolean;
};

export type EmailSettingsPayload = {
  id?: string | null;
  singleton?: boolean;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_secure?: boolean | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
  resend_api_key?: string | null;
  alerta_from_email?: string | null;
  admin_from_email?: string | null;
  avisos_from_email?: string | null;
  financeiro_from_email?: string | null;
  suporte_from_email?: string | null;
};

export const DEFAULT_FROM_EMAILS = {
  alerta: 'alerta@vtur.com.br',
  admin: 'admin@vtur.com.br',
  avisos: 'avisos@vtur.com.br',
  financeiro: 'financeiro@vtur.com.br',
  suporte: 'suporte@vtur.com.br'
};

function firstEmbedded<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export function extractUserTypeName(record: { user_types?: ManagedUserRow['user_types'] } | null | undefined) {
  return String(firstEmbedded(record?.user_types)?.name || '').trim().toUpperCase();
}

export function extractCompanyName(record: { companies?: ManagedUserRow['companies'] } | null | undefined) {
  const company = firstEmbedded(record?.companies);
  return String(company?.nome_fantasia || company?.nome_empresa || '').trim();
}

export function isSystemAdminRole(role?: string | null) {
  return String(role || '').trim().toUpperCase().includes('ADMIN');
}

export function isMasterRole(role?: string | null) {
  return String(role || '').trim().toUpperCase().includes('MASTER');
}

export function isGestorRole(role?: string | null) {
  return String(role || '').trim().toUpperCase().includes('GESTOR');
}

export function isSellerRole(role?: string | null) {
  return String(role || '').trim().toUpperCase().includes('VENDEDOR');
}

export function normalizeUserType(role?: string | null) {
  return String(role || '').trim().toUpperCase();
}

export function isRestrictedUserTypeName(role?: string | null) {
  const normalized = String(role || '').trim().toUpperCase();
  return normalized.includes('ADMIN') || normalized.includes('MASTER');
}

export function getAccessibleCompanyIds(scope: UserScope) {
  const ids = new Set<string>();
  if (scope.companyId && isUuid(scope.companyId)) ids.add(scope.companyId);
  (scope.companyIds || []).forEach((companyId) => {
    if (isUuid(companyId)) ids.add(companyId);
  });
  return Array.from(ids);
}

export function canManageUsers(scope: UserScope) {
  return (
    scope.isAdmin ||
    scope.isMaster ||
    scope.isGestor ||
    Boolean(scope.permissoes.admin) ||
    Boolean(scope.permissoes.admin_users)
  );
}

export function canManagePermissions(scope: UserScope) {
  return scope.isAdmin || scope.isMaster || Boolean(scope.permissoes.admin) || Boolean(scope.permissoes.master_permissoes);
}

export function canManageCompanies(scope: UserScope) {
  return scope.isAdmin || scope.isMaster || Boolean(scope.permissoes.admin_empresas);
}

export function ensureCanManageUsers(scope: UserScope) {
  if (!canManageUsers(scope)) {
    throw error(403, 'Sem permissao para administrar usuarios.');
  }
}

export function ensureCanManagePermissions(scope: UserScope) {
  if (!canManagePermissions(scope)) {
    throw error(403, 'Sem permissao para administrar permissoes.');
  }
}

export function ensureCanManageCompanies(scope: UserScope) {
  if (!canManageCompanies(scope)) {
    throw error(403, 'Sem permissao para administrar empresas.');
  }
}

export function isUserInScope(scope: UserScope, row: Pick<ManagedUserRow, 'id' | 'company_id' | 'user_types'>) {
  if (scope.isAdmin) return true;
  if (row.id === scope.userId) return true;

  const roleName = extractUserTypeName({ user_types: row.user_types });
  const companyId = String(row.company_id || '').trim();
  const accessibleCompanies = new Set(getAccessibleCompanyIds(scope));

  if (scope.isMaster) {
    return accessibleCompanies.has(companyId);
  }

  if (scope.isGestor) {
    return companyId === scope.companyId || isSellerRole(roleName);
  }

  return false;
}

export function ensureTargetUserScope(scope: UserScope, row: Pick<ManagedUserRow, 'id' | 'company_id' | 'user_types'>) {
  if (scope.isAdmin || row.id === scope.userId) return;

  const roleName = extractUserTypeName({ user_types: row.user_types });
  const companyId = String(row.company_id || '').trim();
  const accessibleCompanies = new Set(getAccessibleCompanyIds(scope));

  if (scope.isMaster) {
    if (!accessibleCompanies.has(companyId) || isRestrictedUserTypeName(roleName)) {
      throw error(403, 'Usuario fora do escopo do master.');
    }
    return;
  }

  if (scope.isGestor) {
    if (companyId !== scope.companyId || !isSellerRole(roleName)) {
      throw error(403, 'Gestor so pode administrar vendedores da propria empresa.');
    }
    return;
  }

  throw error(403, 'Usuario fora do escopo permitido.');
}

export function ensureAssignableCompany(scope: UserScope, companyId?: string | null) {
  const targetCompanyId = String(companyId || '').trim();
  if (!targetCompanyId) {
    if (!scope.isAdmin) {
      throw error(400, 'Empresa obrigatoria para usuarios corporativos.');
    }
    return;
  }

  if (scope.isAdmin) return;

  const accessibleCompanies = new Set(getAccessibleCompanyIds(scope));
  if (scope.isMaster) {
    if (!accessibleCompanies.has(targetCompanyId)) {
      throw error(403, 'Empresa fora do portfolio do master.');
    }
    return;
  }

  if (scope.isGestor && targetCompanyId !== scope.companyId) {
    throw error(403, 'Gestor so pode operar na propria empresa.');
  }
}

export function ensureAssignableUserType(scope: UserScope, typeName?: string | null) {
  const normalized = String(typeName || '').trim().toUpperCase();
  if (!normalized) return;

  if (scope.isAdmin) return;

  if (scope.isMaster && isRestrictedUserTypeName(normalized)) {
    throw error(403, 'Master nao pode atribuir perfis ADMIN ou MASTER.');
  }

  if (scope.isGestor && !isSellerRole(normalized)) {
    throw error(403, 'Gestor so pode atribuir perfil de vendedor.');
  }
}

export async function listManagedUsers(client: SupabaseClient, scope: UserScope) {
  let query = client
    .from('users')
    .select(
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
    )
    .order('nome_completo', { ascending: true })
    .limit(2000);

  if (!scope.isAdmin) {
    const accessibleCompanies = getAccessibleCompanyIds(scope);
    if (scope.isMaster && accessibleCompanies.length > 0) {
      query = query.in('company_id', accessibleCompanies);
    } else if (scope.companyId) {
      query = query.eq('company_id', scope.companyId);
    } else {
      query = query.eq('id', scope.userId);
    }
  }

  const { data, error: queryError } = await query;
  if (queryError) throw queryError;

  return ((data || []) as ManagedUserRow[]).filter((row) => isUserInScope(scope, row));
}

export async function loadManagedUser(client: SupabaseClient, scope: UserScope, userId: string) {
  const { data, error: queryError } = await client
    .from('users')
    .select(
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
    )
    .eq('id', userId)
    .maybeSingle();

  if (queryError || !data) {
    throw error(404, 'Usuario nao encontrado.');
  }

  const row = data as ManagedUserRow;
  ensureTargetUserScope(scope, row);
  return row;
}

export async function loadManagedUserTypes(client: SupabaseClient, scope: UserScope) {
  const { data, error: queryError } = await client
    .from('user_types')
    .select('id, name, description, created_at')
    .order('name', { ascending: true });

  if (queryError) throw queryError;

  const rows = (data || []) as ManagedUserTypeRow[];

  return rows.filter((row) => {
    if (scope.isAdmin) return true;
    if (scope.isMaster) return !isRestrictedUserTypeName(row.name);
    if (scope.isGestor) return isSellerRole(row.name);
    return false;
  });
}

export async function loadManagedCompanies(client: SupabaseClient, scope: UserScope) {
  let query = client
    .from('companies')
    .select(
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
    )
    .order('nome_fantasia', { ascending: true });

  if (!scope.isAdmin) {
    const accessibleCompanies = getAccessibleCompanyIds(scope);
    if (accessibleCompanies.length === 0) return [];
    query = query.in('id', accessibleCompanies);
  }

  const { data, error: queryError } = await query;
  if (queryError) throw queryError;

  return (data || []) as ManagedCompanyRow[];
}

export async function loadUserPermissions(client: SupabaseClient, userId: string) {
  const { data, error: queryError } = await client
    .from('modulo_acesso')
    .select('id, usuario_id, modulo, permissao, ativo')
    .eq('usuario_id', userId);

  if (queryError) throw queryError;

  return (data || []) as ManagedPermissionRow[];
}

export async function loadUserTypeDefaultPermissions(client: SupabaseClient, userTypeId: string) {
  const { data, error: queryError } = await client
    .from('user_type_default_perms')
    .select('id, user_type_id, modulo, permissao, ativo')
    .eq('user_type_id', userTypeId);

  if (queryError) throw queryError;

  return (data || []) as Array<{
    id?: string;
    user_type_id: string;
    modulo: string;
    permissao: string;
    ativo: boolean;
  }>;
}

export function buildPermissionMatrix(
  rows: Array<{ modulo?: string | null; permissao?: string | null; ativo?: boolean | null }> | null | undefined
) {
  const rowMap = new Map<string, { modulo: string; permissao: string; ativo: boolean }>();

  (rows || []).forEach((row) => {
    const key = normalizeModuloKey(row?.modulo);
    if (!key) return;
    rowMap.set(key, {
      modulo: key,
      permissao: String(row?.permissao || 'none'),
      ativo: row?.ativo !== false
    });
  });

  return MODULOS_ADMIN_PERMISSOES.map((label) => {
    const key = normalizeModuloKey(toModuloDbKey(label));
    const current = rowMap.get(key);
    return {
      label,
      modulo: key,
      permissao: current?.permissao || 'none',
      ativo: current?.ativo !== false && current?.permissao !== 'none'
    };
  });
}

export async function saveUserPermissions(
  client: SupabaseClient,
  userId: string,
  permissions: Array<{ modulo: string; permissao: string; ativo: boolean }>
) {
  const normalized = permissions.map((item) => ({
    modulo: normalizeModuloKey(item.modulo),
    permissao: String(item.permissao || 'none').toLowerCase(),
    ativo: item.ativo !== false && String(item.permissao || '').toLowerCase() !== 'none'
  }));

  const keys = Array.from(new Set(normalized.map((item) => item.modulo).filter(Boolean)));
  if (!keys.length) return;

  const { data: existingRows, error: existingError } = await client
    .from('modulo_acesso')
    .select('id, modulo')
    .eq('usuario_id', userId)
    .in('modulo', keys);

  if (existingError) throw existingError;

  const existingMap = new Map<string, string>();
  (existingRows || []).forEach((row: { id?: string | null; modulo?: string | null }) => {
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
      const { error: updateError } = await client.from('modulo_acesso').update(payload).eq('id', existingId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client.from('modulo_acesso').insert(payload);
      if (insertError) throw insertError;
    }
  }
}

export async function saveDefaultPermissions(
  client: SupabaseClient,
  userTypeId: string,
  permissions: Array<{ modulo: string; permissao: string; ativo: boolean }>
) {
  const normalized = permissions.map((item) => ({
    modulo: normalizeModuloKey(item.modulo),
    permissao: String(item.permissao || 'none').toLowerCase(),
    ativo: item.ativo !== false && String(item.permissao || '').toLowerCase() !== 'none'
  }));

  const keys = Array.from(new Set(normalized.map((item) => item.modulo).filter(Boolean)));
  if (!keys.length) return;

  const { data: existingRows, error: existingError } = await client
    .from('user_type_default_perms')
    .select('id, modulo')
    .eq('user_type_id', userTypeId)
    .in('modulo', keys);

  if (existingError) throw existingError;

  const existingMap = new Map<string, string>();
  (existingRows || []).forEach((row: { id?: string | null; modulo?: string | null }) => {
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
      const { error: updateError } = await client
        .from('user_type_default_perms')
        .update(payload)
        .eq('id', existingId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client.from('user_type_default_perms').insert(payload);
      if (insertError) throw insertError;
    }
  }
}

export async function syncUserTypeDefaultPermissions(client: SupabaseClient, userId: string, userTypeId?: string | null) {
  const normalizedUserTypeId = String(userTypeId || '').trim();
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

export async function findAuthUserIdByEmail(client: ReturnType<typeof getAdminClient>, email: string) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  const perPage = 200;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error: listError } = await client.auth.admin.listUsers({ page, perPage });
    if (listError) throw listError;
    const users = (data?.users || []) as Array<{ id?: string | null; email?: string | null }>;
    const found = users.find((user) => String(user.email || '').trim().toLowerCase() === normalized);
    if (found?.id) return String(found.id);
    if (users.length < perPage) break;
  }

  return null;
}

export async function createOrReuseAuthUser(
  client: ReturnType<typeof getAdminClient>,
  payload: {
    email: string;
    password: string;
  }
) {
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

  const userId = String(data.user?.id || '').trim();
  if (!userId) {
    throw error(500, 'Falha ao criar autenticacao.');
  }

  return { userId, created: true };
}

export async function loadSystemModuleSettings(client: SupabaseClient) {
  const { data, error: queryError } = await client
    .from('system_module_settings')
    .select('module_key, enabled, reason, updated_at, updated_by');

  if (queryError) throw queryError;

  const catalog = listSystemModuleCatalog(
    (data || []).map((row: { module_key?: string | null }) => String(row.module_key || '').trim())
  );

  return {
    rows: (data || []) as Array<{
      module_key?: string | null;
      enabled?: boolean | null;
      reason?: string | null;
      updated_at?: string | null;
      updated_by?: string | null;
    }>,
    catalog
  };
}

export async function saveSystemModuleSettings(
  client: SupabaseClient,
  payload: Array<{ module_key: string; enabled: boolean; reason?: string | null; updated_by?: string | null }>
) {
  for (const item of payload) {
    const moduleKey = normalizeModuloKey(item.module_key);
    if (!moduleKey) continue;

    const { data: existingRow, error: existingError } = await client
      .from('system_module_settings')
      .select('module_key')
      .eq('module_key', moduleKey)
      .maybeSingle();

    if (existingError) throw existingError;

    const rowPayload = {
      module_key: moduleKey,
      enabled: item.enabled !== false,
      reason: item.reason || null,
      updated_by: item.updated_by || null
    };

    if (existingRow) {
      const { error: updateError } = await client
        .from('system_module_settings')
        .update(rowPayload)
        .eq('module_key', moduleKey);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client.from('system_module_settings').insert(rowPayload);
      if (insertError) throw insertError;
    }
  }
}

export async function loadAvisoTemplates(client: SupabaseClient) {
  const { data, error: queryError } = await client
    .from('admin_avisos_templates')
    .select('id, nome, assunto, mensagem, ativo, sender_key')
    .order('nome', { ascending: true });

  if (!queryError) {
    return (data || []).map((row: any) => ({
      ...row,
      sender_key: row.sender_key || 'avisos'
    }));
  }

  const message = String(queryError.message || '').toLowerCase();
  if (!message.includes('sender_key') && !message.includes('schema cache')) {
    throw queryError;
  }

  const fallback = await client
    .from('admin_avisos_templates')
    .select('id, nome, assunto, mensagem, ativo')
    .order('nome', { ascending: true });

  if (fallback.error) throw fallback.error;

  return (fallback.data || []).map((row: any) => ({
    ...row,
    sender_key: 'avisos'
  }));
}

export async function loadEmailSettings(client: SupabaseClient) {
  const { data, error: queryError } = await client
    .from('admin_email_settings')
    .select(
      'id, singleton, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, resend_api_key, alerta_from_email, admin_from_email, avisos_from_email, financeiro_from_email, suporte_from_email'
    )
    .eq('singleton', true)
    .maybeSingle();

  if (queryError) throw queryError;
  return (data || null) as EmailSettingsPayload | null;
}

export function buildFromEmails(settings: Partial<EmailSettingsPayload> | null | undefined) {
  const alerta = String(settings?.alerta_from_email || DEFAULT_FROM_EMAILS.alerta).trim();
  const admin = String(settings?.admin_from_email || DEFAULT_FROM_EMAILS.admin).trim();
  const avisos = String(settings?.avisos_from_email || DEFAULT_FROM_EMAILS.avisos).trim();
  const financeiro = String(settings?.financeiro_from_email || DEFAULT_FROM_EMAILS.financeiro).trim();
  const suporte = String(settings?.suporte_from_email || DEFAULT_FROM_EMAILS.suporte).trim();

  return {
    alerta,
    admin,
    avisos,
    financeiro,
    suporte,
    default: avisos || admin || alerta
  };
}

export function applyTemplate(text: string, vars: Record<string, string>) {
  return String(text || '')
    .replace(/{{\s*nome\s*}}/gi, vars.nome || '')
    .replace(/{{\s*email\s*}}/gi, vars.email || '')
    .replace(/{{\s*empresa\s*}}/gi, vars.empresa || '')
    .replace(/{{\s*senha\s*}}/gi, vars.senha || '');
}
