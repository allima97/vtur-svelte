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

    const query = String(event.url.searchParams.get('q') || '').trim();
    const limite = parseLimit(event.url.searchParams.get('limite'), query ? 50 : 200);

    if (!query) {
      const items = await getCachedReadModel<any[]>({
        key: buildReadModelCacheKey('orcamentos:cidades-busca:iniciais', { limite }),
        tags: [READ_MODEL_TAGS.catalog],
        ttlMs: 60_000,
        staleTtlMs: 300_000,
        loader: async () => {
          const { data, error } = await client.from('cidades').select('nome').order('nome').limit(limite);
          if (error) throw error;
          return (data || []).map((item: any) => ({ nome: item.nome }));
        }
      });
      return json(items);
    }

    const items = await getCachedReadModel<any[]>({
      key: buildReadModelCacheKey('orcamentos:cidades-busca:query', { query, limite }),
      tags: [READ_MODEL_TAGS.catalog],
      ttlMs: 60_000,
      staleTtlMs: 300_000,
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
          const filtered = (data || []).filter((item: any) => normalizeText(item?.nome || '').includes(normalizedQuery));
          return filtered.map((item: any) => ({ nome: item.nome }));
        }
      }
    });

    return json(items);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar cidades.');
  }
}
