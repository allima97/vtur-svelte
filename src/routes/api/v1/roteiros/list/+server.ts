import { json, type RequestEvent } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  ensureModuloAccess,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['orcamentos', 'vendas'], 1, 'Sem acesso a Roteiros.');

    const { data, error } = await client
      .from('roteiro_personalizado')
      .select('id, nome, duracao, inicio_cidade, fim_cidade, created_at, updated_at')
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    return json({ roteiros: data || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar roteiros.');
  }
}
