import { json } from '@sveltejs/kit';
import {
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';

const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isGestor && !scope.isAdmin) {
      return json({ items: [] }, { headers: DYNAMIC_READ_HEADERS });
    }

    const equipeIds = await fetchGestorEquipeIdsComGestor(client, user.id);
    if (equipeIds.length === 0) {
      return json({ items: [] }, { headers: DYNAMIC_READ_HEADERS });
    }

    const rows: any[] = [];
    for (const batch of chunkArray(equipeIds)) {
      const { data, error: queryError } = await client
        .from('users')
        .select('id, nome_completo, uso_individual')
        .in('id', batch)
        .eq('uso_individual', false)
        .order('nome_completo', { ascending: true });

      if (queryError) throw queryError;
      rows.push(...(data || []));
    }

    const data = Array.from(new Map(rows.map((row: any) => [String(row?.id || ''), row])).values())
      .sort((left: any, right: any) =>
        String(left?.nome_completo || '').localeCompare(String(right?.nome_completo || ''), 'pt-BR')
      );

    return json({
      items: data.map((row: any) => ({
        id: row.id,
        nome_completo: row.nome_completo || ''
      }))
    }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar equipe do gestor.');
  }
}
