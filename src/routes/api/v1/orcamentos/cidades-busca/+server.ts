import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  normalizeText,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

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
      ensureModuloAccess(scope, ['orcamentos', 'vendas'], 1, 'Sem acesso a Orcamentos.');
    }

    const query = String(event.url.searchParams.get('q') || '').trim();
    const limite = parseLimit(event.url.searchParams.get('limite'), query ? 50 : 200);

    if (!query) {
      const { data, error } = await client.from('cidades').select('nome').order('nome').limit(limite);
      if (error) throw error;
      return json((data || []).map((item: any) => ({ nome: item.nome })));
    }

    try {
      const { data, error } = await client.rpc('buscar_cidades', { q: query, limite });
      if (error) throw error;
      return json(data || []);
    } catch {
      const normalizedQuery = normalizeText(query);
      const { data, error } = await client.from('cidades').select('nome').ilike('nome', `%${query}%`).order('nome').limit(limite);
      if (error) throw error;
      const filtered = (data || []).filter((item: any) => normalizeText(item?.nome || '').includes(normalizedQuery));
      return json(filtered.map((item: any) => ({ nome: item.nome })));
    }
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar cidades.');
  }
}
