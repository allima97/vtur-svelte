import { json } from '@sveltejs/kit';
import {
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isGestor && !scope.isAdmin) {
      return json({ items: [] });
    }

    const equipeIds = await fetchGestorEquipeIdsComGestor(client, user.id);
    if (equipeIds.length === 0) {
      return json({ items: [] });
    }

    const { data, error: queryError } = await client
      .from('users')
      .select('id, nome_completo, uso_individual')
      .in('id', equipeIds)
      .eq('uso_individual', false)
      .order('nome_completo', { ascending: true });

    if (queryError) throw queryError;

    return json({
      items: (data || []).map((row: any) => ({
        id: row.id,
        nome_completo: row.nome_completo || ''
      }))
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar equipe do gestor.');
  }
}
