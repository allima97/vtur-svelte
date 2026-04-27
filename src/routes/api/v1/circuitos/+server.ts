import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
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

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Circuitos'], 1, 'Sem acesso a Circuitos.');
    }

    const ativo = event.url.searchParams.get('ativo');

    let query = client
      .from('circuitos')
      .select('id, nome, codigo, operador, resumo, ativo, created_at')
      .order('nome');

    if (ativo !== null) query = query.eq('ativo', ativo === 'true');

    const { data, error } = await query;
    if (error) throw error;

    return json({ success: true, items: data || [] });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao carregar circuitos.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Circuitos'], 2, 'Sem permissão para salvar circuitos.');
    }

    const body = await event.request.json();
    const id = String(body.id || '').trim();

    const payload = {
      nome: String(body.nome || '').trim(),
      codigo: String(body.codigo || '').trim() || null,
      operador: String(body.operador || '').trim() || null,
      resumo: String(body.resumo || '').trim() || null,
      ativo: body.ativo !== false
    };

    if (!payload.nome) return json({ error: 'Nome obrigatório.' }, { status: 400 });

    let result;
    if (id && isUuid(id)) {
      const { data, error } = await client.from('circuitos').update(payload).eq('id', id).select('id').single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await client.from('circuitos').insert(payload).select('id').single();
      if (error) throw error;
      result = data;
    }

    return json({ success: true, item: result });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao salvar circuito.');
  }
}
