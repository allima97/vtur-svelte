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
      ensureModuloAccess(scope, ['Subdivisoes'], 1, 'Sem acesso a Estados/Subdivisões.');
    }

    const { searchParams } = event.url;
    const q = String(searchParams.get('q') || '').trim();
    const paisId = String(searchParams.get('pais_id') || '').trim();

    let query = client
      .from('subdivisoes')
      .select('id, nome, pais_id, codigo_admin1, tipo, created_at, pais:paises!pais_id(id, nome)')
      .order('nome')
      .limit(2000);

    if (paisId) query = query.eq('pais_id', paisId);

    const { data, error: queryError } = await query;
    if (queryError) throw queryError;

    let items = data || [];
    if (q) {
      const qLower = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      items = items.filter((item: any) =>
        String(item.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(qLower)
      );
    }

    return json({ items });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar estados/subdivisões.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Subdivisoes'], 2, 'Sem permissão para salvar estados.');
    }

    const body = await event.request.json();
    const { id, nome, pais_id, codigo_admin1, tipo } = body;

    if (!String(nome || '').trim()) return json({ error: 'Nome obrigatório.' }, { status: 400 });
    if (!pais_id || !isUuid(pais_id)) return json({ error: 'País obrigatório.' }, { status: 400 });

    const payload = {
      nome: String(nome).trim(),
      pais_id,
      codigo_admin1: String(codigo_admin1 || '').trim() || null,
      tipo: String(tipo || '').trim() || null
    };

    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from('subdivisoes').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from('subdivisoes').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = data;
    }

    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar estado.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Subdivisoes'], 4, 'Sem permissão para excluir estados.');
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const { error: deleteError } = await client.from('subdivisoes').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir estado.');
  }
}
