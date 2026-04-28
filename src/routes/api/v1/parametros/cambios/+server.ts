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
      ensureModuloAccess(scope, ['parametros_cambios', 'cambios', 'parametros'], 1, 'Sem acesso a Câmbios.');
    }

    let query = client
      .from('parametros_cambios')
      .select('id, moeda, data, valor, created_at, owner_user_id, owner_user:owner_user_id(nome_completo)')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });

    if (scope.companyId && !scope.isAdmin) {
      query = query.eq('company_id', scope.companyId);
    }

    const { data, error: queryError } = await query.limit(500);
    if (queryError) throw queryError;

    return json({ items: data || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar câmbios.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros_cambios', 'cambios', 'parametros'], 2, 'Sem permissão para salvar câmbios.');
    }

    const body = await event.request.json();
    const { id, moeda, data, valor } = body;

    if (!String(moeda || '').trim()) return json({ error: 'Moeda obrigatória.' }, { status: 400 });
    if (!String(data || '').trim()) return json({ error: 'Data obrigatória.' }, { status: 400 });
    const valorNum = Number(valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0) return json({ error: 'Valor inválido.' }, { status: 400 });

    const payload = {
      moeda: String(moeda).trim().toUpperCase(),
      data: String(data).trim(),
      valor: valorNum,
      owner_user_id: scope.userId,
      company_id: scope.companyId
    };

    let result;
    if (id && isUuid(id)) {
      const { data: updated, error: updateError } = await client.from('parametros_cambios').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = updated;
    } else {
      const { data: inserted, error: insertError } = await client.from('parametros_cambios').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = inserted;
    }

    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar câmbio.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros_cambios', 'cambios', 'parametros'], 3, 'Sem permissão para excluir câmbios.');
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const { error: deleteError } = await client.from('parametros_cambios').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir câmbio.');
  }
}
