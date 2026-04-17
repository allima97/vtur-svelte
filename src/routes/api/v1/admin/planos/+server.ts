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

    if (!scope.isAdmin) {
      return json({ error: 'Somente administradores podem acessar planos.' }, { status: 403 });
    }

    const { data, error: queryError } = await client
      .from('plans')
      .select('id, nome, descricao, valor_mensal, moeda, ativo')
      .order('nome');

    if (queryError) throw queryError;

    return json({ items: data || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar planos.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      return json({ error: 'Somente administradores podem gerenciar planos.' }, { status: 403 });
    }

    const body = await event.request.json();
    const { id, nome, descricao, valor_mensal, moeda, ativo } = body;

    if (!String(nome || '').trim()) return json({ error: 'Nome obrigatório.' }, { status: 400 });

    const payload = {
      nome: String(nome).trim(),
      descricao: String(descricao || '').trim() || null,
      valor_mensal: Number(valor_mensal || 0),
      moeda: String(moeda || 'BRL').trim(),
      ativo: ativo !== false
    };

    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from('plans').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from('plans').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = data;
    }

    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar plano.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      return json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const { error: deleteError } = await client.from('plans').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir plano.');
  }
}
