import { buildJsonResponse, readCache, requirePreferenciasScope, writeCache } from '../_shared';

function parseLimit(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const intVal = Math.trunc(parsed);
  if (intVal <= 0) return fallback;
  return Math.min(20, intVal);
}

export async function GET(event) {
  try {
    const { client, user } = await requirePreferenciasScope(event, 1);
    const query = String(event.url.searchParams.get('q') || '').trim();
    const limite = parseLimit(event.url.searchParams.get('limite'), 8);
    const noCache = String(event.url.searchParams.get('no_cache') || '').trim() === '1';

    if (query.length < 2) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    const cacheKey = ['v1', 'preferencias', 'cidades-busca', user.id, query, String(limite)].join('|');

    if (!noCache) {
      const cached = readCache(cacheKey);
      if (cached) return buildJsonResponse(cached);
    }

    let cidadesData: any[] = [];
    try {
      const { data, error } = await client.rpc('buscar_cidades', { q: query, limite });
      if (error) throw error;
      cidadesData = data || [];
    } catch {
      const fallback = await client.from('cidades').select('id, nome').ilike('nome', `%${query}%`).order('nome').limit(limite);
      if (fallback.error) throw fallback.error;
      cidadesData = fallback.data || [];
    }

    writeCache(cacheKey, cidadesData, 10_000);
    return buildJsonResponse(cidadesData);
  } catch (err) {
    console.error('Erro preferencias/cidades-busca', err);
    return new Response('Erro ao buscar cidades.', { status: 500 });
  }
}

