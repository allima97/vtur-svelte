import { getAdminClient, ensureModuloAccess, requireAuthenticatedUser, resolveUserScope, type UserScope } from '$lib/server/v1';

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

const cache = new Map<string, CacheEntry>();

export async function requirePreferenciasScope(event: any, minLevel: number) {
  const client = getAdminClient();
  const user = await requireAuthenticatedUser(event);
  const scope = await resolveUserScope(client, user.id);

  if (!scope.isAdmin) {
    ensureModuloAccess(scope, ['operacao_preferencias'], minLevel, minLevel >= 3 ? 'Sem permissão para gerenciar preferências.' : 'Sem acesso a Minhas Preferências.');
  }

  return { client, user, scope };
}

export function buildJsonResponse(payload: unknown, status = 200, maxAge = 10) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `private, max-age=${maxAge}`,
      Vary: 'Cookie'
    }
  });
}

export function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function normalizeTerm(value?: string | null) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

export function readCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

export function writeCache(key: string, payload: unknown, ttlMs: number) {
  cache.set(key, { expiresAt: Date.now() + ttlMs, payload });
}

export function matchesBusca(item: any, busca: string) {
  if (!busca) return true;
  const hay = [
    item?.nome,
    item?.localizacao,
    item?.classificacao,
    item?.observacao,
    item?.cidade?.nome,
    item?.tipo_produto?.nome
  ]
    .map((v) => String(v || '').toLowerCase())
    .join(' | ');
  return hay.includes(busca.toLowerCase());
}

export async function fetchPreferenciasBase(client: any, scope: UserScope, currentUserId: string) {
  const companyId = scope.companyId;
  if (!companyId) return { tipos: [], usuarios: [] };

  const [tiposResp, usuariosResp] = await Promise.all([
    client.from('tipo_produtos').select('id, nome, tipo').order('nome').limit(500),
    client
      .from('users')
      .select('id, nome_completo, email, active')
      .eq('company_id', companyId)
      .eq('active', true)
      .order('nome_completo')
  ]);

  if (tiposResp.error) throw tiposResp.error;
  if (usuariosResp.error) throw usuariosResp.error;

  const usuarios = (usuariosResp.data || [])
    .map((row: any) => ({
      id: String(row?.id || ''),
      nome_completo: String(row?.nome_completo || ''),
      email: String(row?.email || '')
    }))
    .filter((u: any) => u.id && u.id !== currentUserId);

  return {
    tipos: tiposResp.data || [],
    usuarios
  };
}

