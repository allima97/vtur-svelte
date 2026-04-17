import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
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

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['cadastros'], 1, 'Sem acesso a Cadastros.');
    }

    const cidadeId = event.params.id;

    const { data, error } = await client
      .from('cidades')
      .select('*')
      .eq('id', cidadeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return json({ error: 'Cidade nao encontrada' }, { status: 404 });
      }
      throw error;
    }

    return json(data);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar cidade.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['cadastros'], 3, 'Sem permissao para editar cidades.');
    }

    const cidadeId = event.params.id;
    const body = await event.request.json();

    const updateData: any = {};
    
    if (body.nome !== undefined) updateData.nome = body.nome.trim();
    if (body.descricao !== undefined) updateData.descricao = body.descricao?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    const { data, error } = await client
      .from('cidades')
      .update(updateData)
      .eq('id', cidadeId)
      .select()
      .single();

    if (error) {
      console.error('[Cidades API] Erro ao atualizar:', error);
      return json({ error: 'Erro ao atualizar cidade', details: error.message }, { status: 500 });
    }

    return json({ success: true, data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar cidade.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['cadastros'], 4, 'Sem permissao para excluir cidades.');
    }

    const cidadeId = event.params.id;

    const { error } = await client
      .from('cidades')
      .delete()
      .eq('id', cidadeId);

    if (error) {
      console.error('[Cidades API] Erro ao excluir:', error);
      return json({ error: 'Erro ao excluir cidade', details: error.message }, { status: 500 });
    }

    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir cidade.');
  }
}
