import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveUserScope } from '$lib/server/v1';

function parseLimit(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const intVal = Math.trunc(parsed);
  if (intVal <= 0) return fallback;
  return Math.min(20, intVal);
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['relatorios', 'vendas'], 1, 'Sem acesso a Relatorios.');
    }

    const query = String(event.url.searchParams.get('q') || '').trim();
    const limite = parseLimit(event.url.searchParams.get('limite'), 8);

    if (query.length < 2) {
      return json([]);
    }

    const { data, error } = await client.rpc('buscar_cidades', { q: query, limite });
    if (error) throw error;

    return json(data || []);
  } catch (err) {
    console.error('Erro relatorios/cidades-busca', err);
    return new Response('Erro ao buscar cidades.', { status: 500 });
  }
}
