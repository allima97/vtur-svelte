import { error } from '@sveltejs/kit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';
import { listarModulosComHeranca, MAPA_MODULOS, MODULO_ALIASES } from '$lib/config/modulos';

export type Papel = 'ADMIN' | 'MASTER' | 'GESTOR' | 'VENDEDOR' | 'OUTRO';
export type PermissaoNivel = 'none' | 'view' | 'create' | 'edit' | 'delete' | 'admin';

export interface UserScope {
  userId: string;
  nome: string | null;
  email: string | null;
  tipoNome: string;
  usoIndividual: boolean;
  papel: Papel;
  companyId: string | null;
  companyIds: string[];
  permissoes: Record<string, PermissaoNivel>;
  isAdmin: boolean;
  isMaster: boolean;
  isGestor: boolean;
  isVendedor: boolean;
}

type HttpErrorLike = {
  status: number;
  body?: {
    message?: string;
  };
};

type UsersProfileRow = {
  id: string;
  company_id: string | null;
  nome_completo: string | null;
  email: string | null;
  uso_individual: boolean | null;
  user_types: { name: string | null } | { name: string | null }[] | null;
};

let adminClient: SupabaseClient | null = null;

export function getAdminClient() {
  if (!adminClient) {
    const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
    const supabaseKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variaveis de ambiente do Supabase nao configuradas: PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
    }
    adminClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return adminClient;
}

export function isUuid(value?: string | null) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
  );
}

export function parseUuidList(value?: string | null, limit = 300) {
  if (!value) return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => isUuid(item))
    .slice(0, limit);
}

export function parseIntSafe(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const intVal = Math.trunc(parsed);
  return intVal > 0 ? intVal : fallback;
}

export function toISODateLocal(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function getMonthRange(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);

  return {
    inicio: toISODateLocal(start),
    fim: toISODateLocal(end)
  };
}

export function normalizeText(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function normalizeModulo(value?: string | null) {
  const raw = normalizeText(value).replace(/\s+/g, '_');
  if (!raw) return '';
  return MODULO_ALIASES[raw] || raw;
}

export function permLevel(value?: string | null) {
  switch (String(value || '').toLowerCase()) {
    case 'admin':
      return 5;
    case 'delete':
      return 4;
    case 'edit':
      return 3;
    case 'create':
      return 2;
    case 'view':
      return 1;
    default:
      return 0;
  }
}

function resolveUserTypeName(
  userTypes: { name: string | null } | { name: string | null }[] | null | undefined
) {
  if (Array.isArray(userTypes)) {
    return String(userTypes[0]?.name || '');
  }

  return String(userTypes?.name || '');
}

function buildPermissionsMap(rows: Array<{ modulo: string | null; permissao: string | null; ativo: boolean | null }>) {
  const map: Record<string, PermissaoNivel> = {};

  const setPerm = (key: string, incoming: PermissaoNivel) => {
    if (!key) return;
    const current = map[key] || 'none';
    if (permLevel(incoming) > permLevel(current)) {
      map[key] = incoming;
    }
  };

  rows.forEach((row) => {
    if (!row?.ativo) return;

    const key = normalizeModulo(row.modulo);
    if (!key) return;

    const incoming = String(row.permissao || '').toLowerCase() as PermissaoNivel;
    setPerm(key, incoming);

    const rawModulo = String(row.modulo || '').trim().toLowerCase();
    if (rawModulo && rawModulo !== key) {
      setPerm(rawModulo, incoming);
    }
  });

  return map;
}

export function resolvePapel(tipoNome: string, usoIndividual: boolean): Papel {
  if (usoIndividual) return 'VENDEDOR';

  const tipo = String(tipoNome || '').toUpperCase();

  if (tipo.includes('ADMIN')) return 'ADMIN';
  if (tipo.includes('MASTER')) return 'MASTER';
  if (tipo.includes('GESTOR')) return 'GESTOR';
  if (tipo.includes('VENDEDOR')) return 'VENDEDOR';

  return 'OUTRO';
}

export async function requireAuthenticatedUser(event: RequestEvent) {
  const { session, user } = await event.locals.safeGetSession();

  if (!session || !user) {
    throw error(401, 'Sessao invalida.');
  }

  return user;
}

async function fetchPermissions(client: SupabaseClient, userId: string) {
  const { data, error: permissionsError } = await client
    .from('modulo_acesso')
    .select('modulo, permissao, ativo')
    .eq('usuario_id', userId);

  if (permissionsError) {
    throw error(500, 'Erro ao carregar permissoes.');
  }

  return buildPermissionsMap((data || []) as Array<{ modulo: string | null; permissao: string | null; ativo: boolean | null }>);
}

export async function fetchGestorEquipeIdsComGestor(client: SupabaseClient, gestorId: string) {
  if (!gestorId) return [];

  try {
    const { data, error: rpcError } = await client.rpc('gestor_equipe_vendedor_ids', { uid: gestorId });
    if (rpcError) throw rpcError;

    const ids = (data || [])
      .map((row: { vendedor_id?: string | null }) => String(row?.vendedor_id || '').trim())
      .filter(Boolean);

    return Array.from(new Set([gestorId, ...ids]));
  } catch {
    const { data, error: fallbackError } = await client
      .from('gestor_vendedor')
      .select('vendedor_id, ativo')
      .eq('gestor_id', gestorId);

    if (fallbackError) {
      return [gestorId];
    }

    const ids = (data || [])
      .filter((row: { ativo?: boolean | null }) => row?.ativo !== false)
      .map((row: { vendedor_id?: string | null }) => String(row?.vendedor_id || '').trim())
      .filter(Boolean);

    return Array.from(new Set([gestorId, ...ids]));
  }
}

export async function fetchMasterEmpresas(client: SupabaseClient, masterId: string) {
  const { data, error: companiesError } = await client
    .from('master_empresas')
    .select('company_id, status')
    .eq('master_id', masterId);

  if (companiesError) {
    return [];
  }

  return (data || [])
    .filter((row: { status?: string | null }) => row?.status === 'approved')
    .map((row: { company_id?: string | null }) => String(row?.company_id || '').trim())
    .filter(Boolean);
}

export async function resolveUserScope(client: SupabaseClient, userId: string): Promise<UserScope> {
  const { data, error: profileError } = await client
    .from('users')
    .select('id, company_id, nome_completo, email, uso_individual, user_types(name)')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !data) {
    throw error(403, 'Perfil do usuario nao encontrado.');
  }

  const profile = data as UsersProfileRow;
  const tipoNome = resolveUserTypeName(profile.user_types);
  const usoIndividual = Boolean(profile.uso_individual);
  const papel = resolvePapel(tipoNome, usoIndividual);
  const permissoes = await fetchPermissions(client, userId);
  const companyId = isUuid(profile.company_id) ? String(profile.company_id) : null;
  const companyIds =
    papel === 'MASTER'
      ? await fetchMasterEmpresas(client, userId)
      : companyId
        ? [companyId]
        : [];

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
    isAdmin: papel === 'ADMIN',
    isMaster: papel === 'MASTER',
    isGestor: papel === 'GESTOR',
    isVendedor: papel === 'VENDEDOR'
  };
}

export function hasModuloAccess(scope: UserScope, modulos: string[], minLevel = 1) {
  if (scope.isAdmin) return true;

  const modulosConsulta = Array.from(
    new Set(
      modulos.flatMap((modulo) => {
        const labels = listarModulosComHeranca(String(modulo || '').trim());
        return labels.flatMap((label) => {
          const key = MAPA_MODULOS[label];
          return key ? [label, key] : [label];
        });
      })
    )
  );

  const allowed = new Set<string>();
  modulosConsulta.forEach((entry) => {
    const normalized = normalizeModulo(entry);
    if (normalized) allowed.add(normalized);
    const raw = String(entry || '').trim().toLowerCase();
    if (raw) allowed.add(raw);
  });

  // Verifica permissões específicas
  const hasSpecific = Object.entries(scope.permissoes).some(([modulo, permissao]) => {
    const normalized = normalizeModulo(modulo);
    return allowed.has(modulo) || (normalized && allowed.has(normalized))
      ? permLevel(permissao) >= minLevel
      : false;
  });

  if (hasSpecific) return true;

  return false;
}

export function ensureModuloAccess(
  scope: UserScope,
  modulos: string[],
  minLevel: number,
  message: string
) {
  if (!hasModuloAccess(scope, modulos, minLevel)) {
    throw error(403, message);
  }
}

export async function resolveScopedVendedorIds(
  client: SupabaseClient,
  scope: UserScope,
  requestedRaw?: string | null
) {
  const requestedIds = parseUuidList(requestedRaw);

  if (scope.isAdmin) {
    return requestedIds;
  }

  if (scope.isGestor) {
    const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);

    return requestedIds.length > 0
      ? requestedIds.filter((id) => equipeIds.includes(id))
      : equipeIds;
  }

  if (scope.isMaster) {
    return requestedIds;
  }

  return [scope.userId];
}

export function resolveScopedCompanyIds(scope: UserScope, requestedCompanyId?: string | null) {
  const companyId = String(requestedCompanyId || '').trim();

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

export async function resolveAccessibleClientIds(
  client: SupabaseClient,
  params: {
    companyIds: string[];
    vendedorIds: string[];
  }
) {
  const clientIds = new Set<string>();

  if (params.companyIds.length > 0) {
    const { data } = await client
      .from('clientes')
      .select('id')
      .in('company_id', params.companyIds)
      .limit(5000);

    (data || []).forEach((row: { id?: string | null }) => {
      const id = String(row?.id || '').trim();
      if (id) clientIds.add(id);
    });
  }

  if (params.vendedorIds.length > 0) {
    const { data, error: createdByError } = await client
      .from('clientes')
      .select('id')
      .in('created_by', params.vendedorIds)
      .limit(5000);

    // created_by pode não existir em todos os ambientes
    if (!createdByError) {
      (data || []).forEach((row: { id?: string | null }) => {
        const id = String(row?.id || '').trim();
        if (id) clientIds.add(id);
      });
    }
  }

  let salesQuery = client
    .from('vendas')
    .select('cliente_id')
    .eq('cancelada', false)
    .not('cliente_id', 'is', null);

  if (params.companyIds.length > 0) {
    salesQuery = salesQuery.in('company_id', params.companyIds);
  }

  if (params.vendedorIds.length > 0) {
    salesQuery = salesQuery.in('vendedor_id', params.vendedorIds);
  }

  const { data: salesData } = await salesQuery.limit(5000);

  (salesData || []).forEach((row: { cliente_id?: string | null }) => {
    const id = String(row?.cliente_id || '').trim();
    if (id) clientIds.add(id);
  });

  return Array.from(clientIds);
}

function isHttpErrorLike(value: unknown): value is HttpErrorLike {
  return Boolean(value && typeof value === 'object' && 'status' in value);
}

export function toErrorResponse(err: unknown, fallbackMessage: string) {
  // Log detalhado do erro para debug
  console.error('[toErrorResponse] Erro capturado:', err);
  console.error('[toErrorResponse] Tipo:', typeof err);
  
  if (err && typeof err === 'object') {
    const errObj = err as Record<string, unknown>;
    console.error('[toErrorResponse] Propriedades:', Object.keys(errObj));
    console.error('[toErrorResponse] Status:', errObj.status);
    console.error('[toErrorResponse] Body:', errObj.body);
    console.error('[toErrorResponse] Message:', errObj.message);
  }
  
  if (isHttpErrorLike(err)) {
    console.error('[toErrorResponse] Erro HTTP detectado:', err.status);
    return new Response(err.body?.message || fallbackMessage, {
      status: err.status
    });
  }

  // Verifica se é um erro do SvelteKit (pode ter status em outra propriedade)
  if (err && typeof err === 'object') {
    const errObj = err as Record<string, unknown>;
    if (typeof errObj.status === 'number') {
      console.error('[toErrorResponse] Erro com status detectado:', errObj.status);
      const body = errObj.body as { message?: string } | undefined;
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
