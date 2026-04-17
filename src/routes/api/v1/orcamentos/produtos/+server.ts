import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['orcamentos', 'vendas'], 1, 'Sem acesso a Orcamentos.');
    }

    const { data, error } = await client
      .from('produtos')
      .select('nome, destino, cidade_id')
      .order('nome', { ascending: true })
      .limit(1000);
    if (error) throw error;

    return json(data || []);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar produtos.');
  }
}
