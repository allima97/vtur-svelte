import { json } from '@sveltejs/kit';
import { ensureTodoAccess, mapTodoRow } from '$lib/server/agenda';
import { getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureTodoAccess(scope, 1, 'Sem acesso a Tarefas.');

    const id = String(event.params.id || '').trim();
    if (!id) {
      return json({ error: 'id obrigatorio.' }, { status: 400 });
    }

    const { data, error } = await client
      .from('agenda_itens')
      .select('id, titulo, descricao, done, categoria_id, prioridade, status, arquivo, created_at, updated_at, user_id, tipo')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data || data.tipo !== 'todo') {
      return json({ error: 'Tarefa nao encontrada.' }, { status: 404 });
    }
    if (!scope.isAdmin && String(data.user_id || '') !== user.id) {
      return json({ error: 'Sem acesso a esta tarefa.' }, { status: 403 });
    }

    let categoria = null;
    if (data.categoria_id) {
      const { data: categoriaData } = await client
        .from('todo_categorias')
        .select('id, nome, cor')
        .eq('id', data.categoria_id)
        .maybeSingle();

      if (categoriaData) {
        categoria = {
          id: String(categoriaData.id),
          nome: String(categoriaData.nome || ''),
          cor: categoriaData.cor ? String(categoriaData.cor) : null
        };
      }
    }

    return json({
      item: mapTodoRow(data),
      categoria
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar tarefa.');
  }
}
