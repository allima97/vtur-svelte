import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  normalizeText,
  requireAuthenticatedUser,
  resolveUserScope,
  sanitizePostgrestSearchTerm,
  toErrorResponse
} from '$lib/server/v1';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS
} from '$lib/server/readModelCache';
import { DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';

type CidadeBuscaItem = {
  nome?: string | null;
};

function parseLimit(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(200, Math.max(1, Math.trunc(parsed)));
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        scope.isFinanceiro ? ['orcamentos'] : ['orcamentos', 'vendas'],
        1,
        'Sem acesso a Orcamentos.'
      );
    }

    const query = sanitizePostgrestSearchTerm(event.url.searchParams.get('q'), 120);
    const limite = parseLimit(event.url.searchParams.get('limite'), query ? 50 : 200);

    if (!query) {
      const items = await getCachedReadModel<CidadeBuscaItem[]>({
        key: buildReadModelCacheKey('orcamentos:cidades-busca:iniciais', { limite }),
        tags: [READ_MODEL_TAGS.catalog],
        ttlMs: 300_000,
        staleTtlMs: 1_800_000,
        loader: async () => {
          const { data, error } = await client.from('cidades').select('nome').order('nome').limit(limite);
          if (error) throw error;
          return ((data || []) as CidadeBuscaItem[]).map((item) => ({ nome: item.nome }));
        }
      });
      return json(items, { headers: DYNAMIC_READ_HEADERS });
    }

    const items = await getCachedReadModel<CidadeBuscaItem[]>({
      key: buildReadModelCacheKey('orcamentos:cidades-busca:query', { query, limite }),
      tags: [READ_MODEL_TAGS.catalog],
      ttlMs: 300_000,
      staleTtlMs: 1_800_000,
      loader: async () => {
        try {
          const { data, error } = await client.rpc('buscar_cidades', { q: query, limite });
          if (error) throw error;
          return data || [];
        } catch {
          const normalizedQuery = normalizeText(query);
          const { data, error } = await client
            .from('cidades')
            .select('nome')
            .ilike('nome', `%${sanitizePostgrestSearchTerm(query)}%`)
            .order('nome')
            .limit(limite);
          if (error) throw error;
          const filtered = ((data || []) as CidadeBuscaItem[]).filter((item) =>
            normalizeText(item?.nome || '').includes(normalizedQuery)
          );
          return filtered.map((item) => ({ nome: item.nome }));
        }
      }
    });

    return json(items, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar cidades.');
  }
}
