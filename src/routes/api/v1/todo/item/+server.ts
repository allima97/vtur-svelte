import { json } from '@sveltejs/kit';
import { ensureTodoAccess, normalizeTodoPriority, normalizeTodoStatus } from '$lib/server/agenda';
import { getAdminClient, isUuid, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';

async function ensureTodoCategoryOwnership(client: ReturnType<typeof getAdminClient>, userId: string, categoriaId: string | null) {
  if (!categoriaId) return;

  const { data, error } = await client
    .from('todo_categorias')
    .select('id')
    .eq('id', categoriaId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Categoria invalida para este usuario.');
  }
}

async function loadTodoOwnership(client: ReturnType<typeof getAdminClient>, id: string) {
  const { data, error } = await client
    .from('agenda_itens')
    .select('id, user_id, tipo')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json();

    const id = String(body?.id || '').trim();
    const isEdit = Boolean(id);

    ensureTodoAccess(
      scope,
      isEdit ? 3 : 2,
      isEdit ? 'Sem permissao para editar tarefa.' : 'Sem permissao para criar tarefa.'
    );

    const titulo = String(body?.titulo || '').trim();
    if (!titulo) {
      return json({ error: 'titulo obrigatorio.' }, { status: 400 });
    }

    const categoriaId = body?.categoria_id === null ? null : String(body?.categoria_id || '').trim() || null;
    if (categoriaId) {
      if (!isUuid(categoriaId)) {
        return json({ error: 'categoria_id invalido.' }, { status: 400 });
      }
      await ensureTodoCategoryOwnership(client, user.id, categoriaId);
    }

    const status = normalizeTodoStatus(body?.status);
    const done =
      typeof body?.done === 'boolean' ? body.done : status === 'em_andamento' || status === 'concluido';

    const payload = {
      titulo,
      descricao: String(body?.descricao || '').trim() || null,
      categoria_id: categoriaId,
      prioridade: normalizeTodoPriority(body?.prioridade),
      status,
      done
    };

    if (isEdit) {
      if (!isUuid(id)) {
        return json({ error: 'id invalido.' }, { status: 400 });
      }

      const existing = await loadTodoOwnership(client, id);
      if (!existing || existing.tipo !== 'todo') {
        return json({ error: 'Tarefa nao encontrada.' }, { status: 404 });
      }
      if (!scope.isAdmin && String(existing.user_id || '') !== user.id) {
        return json({ error: 'Sem acesso a esta tarefa.' }, { status: 403 });
      }

      const { data, error } = await client
        .from('agenda_itens')
        .update(payload)
        .eq('id', id)
        .select('id, titulo, descricao, done, categoria_id, prioridade, status, arquivo, created_at, updated_at')
        .single();

      if (error) throw error;
      return json({ ok: true, item: data });
    }

    const companyId = scope.companyId || scope.companyIds[0] || null;
    const { data, error } = await client
      .from('agenda_itens')
      .insert({
        ...payload,
        tipo: 'todo',
        user_id: user.id,
        company_id: companyId
      })
      .select('id, titulo, descricao, done, categoria_id, prioridade, status, arquivo, created_at, updated_at')
      .single();

    if (error) throw error;

    return json({ ok: true, item: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar tarefa.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureTodoAccess(scope, 3, 'Sem permissao para arquivar tarefa.');

    const body = await event.request.json();
    const id = String(body?.id || '').trim();
    const action = String(body?.action || '').trim();

    if (!isUuid(id)) {
      return json({ error: 'id invalido.' }, { status: 400 });
    }

    if (action !== 'archive' && action !== 'restore') {
      return json({ error: 'action invalida.' }, { status: 400 });
    }

    const existing = await loadTodoOwnership(client, id);
    if (!existing || existing.tipo !== 'todo') {
      return json({ error: 'Tarefa nao encontrada.' }, { status: 404 });
    }
    if (!scope.isAdmin && String(existing.user_id || '') !== user.id) {
      return json({ error: 'Sem acesso a esta tarefa.' }, { status: 403 });
    }

    const { data, error } = await client
      .from('agenda_itens')
      .update({ arquivo: action === 'archive' ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id, arquivo')
      .single();

    if (error) throw error;

    return json({ ok: true, item: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao arquivar tarefa.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureTodoAccess(scope, 4, 'Sem permissao para excluir tarefa.');

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) {
      return json({ error: 'id invalido.' }, { status: 400 });
    }

    const existing = await loadTodoOwnership(client, id);
    if (!existing || existing.tipo !== 'todo') {
      return json({ error: 'Tarefa nao encontrada.' }, { status: 404 });
    }
    if (!scope.isAdmin && String(existing.user_id || '') !== user.id) {
      return json({ error: 'Sem acesso a esta tarefa.' }, { status: 403 });
    }

    const { error } = await client.from('agenda_itens').delete().eq('id', id);
    if (error) throw error;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir tarefa.');
  }
}
