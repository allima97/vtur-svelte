import {
  assertCompanyAccess,
  fetchRecados,
  noStoreJsonResponse,
  noStoreTextResponse,
  privateJsonResponse,
  readCache,
  requireMuralScope,
  writeCache
} from '../_shared';
import { isUuid, logServerError } from '$lib/server/v1';

export async function GET(event) {
  try {
    const companyId = String(event.url.searchParams.get('company_id') || '').trim();
    if (!companyId) return noStoreTextResponse('company_id obrigatorio.', 400);

    const { client, user, scope } = await requireMuralScope(event);
    const denied = await assertCompanyAccess(client, scope, companyId);
    if (denied) return denied;

    const cacheKey = ['v1', 'muralRecados', user.id, companyId].join('|');
    const cached = readCache(cacheKey);
    if (cached) {
      return privateJsonResponse(cached);
    }

    const recadosResp = await fetchRecados(client, companyId);
    const payload = {
      recados: recadosResp.recados,
      supportsAttachments: recadosResp.supportsAttachments
    };

    writeCache(cacheKey, payload, 5_000);

    return privateJsonResponse(payload);
  } catch (e: any) {
    logServerError('[mural/recados] falha ao carregar recados', e);
    return noStoreTextResponse('Erro ao carregar recados.', 500);
  }
}

export async function POST(event) {
  try {
    const { client, scope } = await requireMuralScope(event);
    const body = await event.request.json();

    const rawCompanyId = String(body?.company_id || '').trim();
    const companyId = rawCompanyId || String(scope.companyId || '').trim();
    if (!companyId) return noStoreTextResponse('company_id obrigatorio.', 400);

    const denied = await assertCompanyAccess(client, scope, companyId);
    if (denied) return denied;

    const receiverId = String(body?.receiver_id || '').trim();
    const conteudo = String(body?.conteudo || '').trim().slice(0, 4000);
    const assunto = String(body?.assunto || '').trim().slice(0, 160);

    if (!conteudo) return noStoreTextResponse('Conteúdo obrigatório.', 400);
    if (receiverId && !isUuid(receiverId)) return noStoreTextResponse('Destinatário inválido.', 400);

    if (receiverId) {
      const { data: receiver, error: receiverError } = await client
        .from('users')
        .select('id, company_id, active')
        .eq('id', receiverId)
        .eq('company_id', companyId)
        .eq('active', true)
        .maybeSingle();
      if (receiverError) throw receiverError;
      if (!receiver) return noStoreTextResponse('Destinatário fora do escopo da empresa.', 403);
    }

    const payload = {
      company_id: companyId,
      sender_id: scope.userId,
      receiver_id: receiverId || null,
      assunto: assunto || null,
      conteudo,
      sender_deleted: false,
      receiver_deleted: false
    };

    const { data, error } = await client.from('mural_recados').insert(payload).select('id').single();
    if (error) throw error;

    return noStoreJsonResponse({ ok: true, id: data?.id || null });
  } catch (e: any) {
    logServerError('[mural/recados] falha ao enviar recado', e);
    return noStoreTextResponse('Erro ao enviar recado.', 500);
  }
}

export async function DELETE(event) {
  try {
    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return noStoreTextResponse('ID inválido.', 400);

    const { client, scope } = await requireMuralScope(event);
    const { data: recado, error } = await client
      .from('mural_recados')
      .select('id, company_id, sender_id, receiver_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!recado) return noStoreTextResponse('Recado não encontrado.', 404);

    const denied = await assertCompanyAccess(client, scope, String(recado.company_id || '').trim());
    if (denied) return denied;

    const isSender = recado.sender_id === scope.userId;
    const isReceiver = recado.receiver_id === scope.userId;

    if (!isSender && !isReceiver && !scope.isAdmin) {
      return noStoreTextResponse('Sem permissão para excluir este recado.', 403);
    }

    if (scope.isAdmin && !isSender && !isReceiver) {
      const { error: deleteError } = await client.from('mural_recados').delete().eq('id', id);
      if (deleteError) throw deleteError;
    } else {
      const update = isSender ? { sender_deleted: true } : { receiver_deleted: true };
      const { error: updateError } = await client.from('mural_recados').update(update).eq('id', id);
      if (updateError) throw updateError;
    }

    return noStoreJsonResponse({ ok: true });
  } catch (e: any) {
    logServerError('[mural/recados] falha ao excluir recado', e);
    return noStoreTextResponse('Erro ao excluir recado.', 500);
  }
}
