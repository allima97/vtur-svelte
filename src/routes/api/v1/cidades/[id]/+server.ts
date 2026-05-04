import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { rejectCrossOriginRequest, rejectLargePayload } from '$lib/server/requestGuards';

const MAX_CIDADE_UPDATE_BODY_BYTES = 64 * 1024;

const CIDADE_SELECT_FIELDS = `
  id, nome, subdivisao_id, descricao, created_at,
  subdivisao:subdivisoes!subdivisao_id(id, nome, pais_id, pais:paises!pais_id(id, nome))
`;

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Cidades'], 1, 'Sem acesso a Cidades.');
    }

    const cidadeId = event.params.id;

    const { data, error } = await client
      .from('cidades')
      .select(CIDADE_SELECT_FIELDS)
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
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const payloadError = rejectLargePayload(event.request, MAX_CIDADE_UPDATE_BODY_BYTES);
    if (payloadError) return payloadError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Cidades'], 3, 'Sem permissao para editar cidades.');
    }

    const cidadeId = event.params.id;
    const body = await event.request.json().catch(() => ({}));

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
      .select(CIDADE_SELECT_FIELDS)
      .single();

    if (error) throw error;

    return json({ success: true, data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar cidade.');
  }
}

export async function DELETE(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Cidades'], 4, 'Sem permissao para excluir cidades.');
    }

    const cidadeId = event.params.id;

    const { error } = await client
      .from('cidades')
      .delete()
      .eq('id', cidadeId);

    if (error) throw error;

    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir cidade.');
  }
}
