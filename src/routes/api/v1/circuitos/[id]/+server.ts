import { json } from '@sveltejs/kit';
import { rejectCrossOriginRequest, rejectLargePayload } from '$lib/server/requestGuards';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

const MAX_CIRCUITO_UPDATE_BODY_BYTES = 128 * 1024;

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Circuitos'], 1, 'Sem acesso a Circuitos.');
    }

    const id = String(event.params.id || '').trim();
    if (!isUuid(id)) return json({ success: false, error: 'ID inválido.' }, { status: 400 });

    const { data, error } = await client
      .from('circuitos')
      .select(`
        id, nome, codigo, operador, resumo, ativo, created_at,
        circuito_dias(id, dia_numero, titulo, descricao),
        circuito_datas(id, data_inicio, cidade_inicio_id, dias_extra_antes, dias_extra_depois)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ success: false, error: 'Circuito não encontrado' }, { status: 404 });

    return json({ success: true, item: data });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao carregar circuito.');
  }
}

export async function PATCH(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const sizeError = rejectLargePayload(event.request, MAX_CIRCUITO_UPDATE_BODY_BYTES);
    if (sizeError) return sizeError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Circuitos'], 3, 'Sem permissão para editar circuitos.');
    }

    const id = String(event.params.id || '').trim();
    if (!isUuid(id)) return json({ success: false, error: 'ID inválido.' }, { status: 400 });

    const body = await event.request.json().catch(() => ({}));

    // Apenas colunas reais da tabela circuitos
    const allowed = ['nome', 'codigo', 'operador', 'resumo', 'ativo'];
    const payload: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) payload[key] = body[key];
    }

    const { data, error } = await client
      .from('circuitos')
      .update(payload)
      .eq('id', id)
      .select('id, nome, codigo, operador, resumo, ativo, created_at')
      .single();

    if (error) throw error;

    return json({ success: true, item: data });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao atualizar circuito.');
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
      ensureModuloAccess(scope, ['Circuitos'], 4, 'Sem permissão para excluir circuitos.');
    }

    const id = String(event.params.id || '').trim();
    if (!isUuid(id)) return json({ success: false, error: 'ID inválido.' }, { status: 400 });

    const { error } = await client
      .from('circuitos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return json({ success: true });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao excluir circuito.');
  }
}
