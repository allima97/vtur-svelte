import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const id = event.params.id;
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const { data: roteiro, error: roteiroError } = await client
      .from('roteiro_personalizado')
      .select('id, nome, duracao, inicio_cidade, fim_cidade, itinerario_config, created_at, updated_at')
      .eq('id', id)
      .eq('created_by', scope.userId)
      .maybeSingle();

    if (roteiroError) {
      if (String(roteiroError.code || '').includes('42P01') || String(roteiroError.message || '').includes('does not exist')) {
        return json({ error: 'Roteiro não encontrado.' }, { status: 404 });
      }
      throw roteiroError;
    }
    if (!roteiro) return json({ error: 'Roteiro não encontrado.' }, { status: 404 });

    // Busca dias
    const { data: dias } = await client
      .from('roteiro_dia')
      .select('id, ordem, cidade, data, descricao')
      .eq('roteiro_id', id)
      .order('ordem')
      .limit(100);

    return json({ roteiro: { ...roteiro, dias: dias || [] } });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar roteiro.');
  }
}
