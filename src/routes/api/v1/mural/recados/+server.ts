import { assertCompanyAccess, fetchRecados, readCache, requireMuralScope, writeCache } from '../_shared';
import { isUuid } from '$lib/server/v1';

export async function GET(event) {
  try {
    const companyId = String(event.url.searchParams.get('company_id') || '').trim();
    if (!companyId) return new Response('company_id obrigatorio.', { status: 400 });

    const { client, user, scope } = await requireMuralScope(event);
    const denied = await assertCompanyAccess(client, scope, companyId);
    if (denied) return denied;

    const cacheKey = ['v1', 'muralRecados', user.id, companyId].join('|');
    const cached = readCache(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=5', Vary: 'Cookie' }
      });
    }

    const recadosResp = await fetchRecados(client, companyId);
    const payload = {
      recados: recadosResp.recados,
      supportsAttachments: recadosResp.supportsAttachments
    };

    writeCache(cacheKey, payload, 5_000);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=5', Vary: 'Cookie' }
    });
  } catch (e: any) {
    console.error('Erro mural recados:', e);
    return new Response('Erro ao carregar recados.', { status: 500 });
  }
}

export async function POST(event) {
  try {
    const { client, scope } = await requireMuralScope(event);
    const body = await event.request.json();

    const rawCompanyId = String(body?.company_id || '').trim();
    const companyId = rawCompanyId || String(scope.companyId || '').trim();
    if (!companyId) return new Response('company_id obrigatorio.', { status: 400 });

    const denied = await assertCompanyAccess(client, scope, companyId);
    if (denied) return denied;

    const receiverId = String(body?.receiver_id || '').trim();
    const conteudo = String(body?.conteudo || '').trim();
    const assunto = String(body?.assunto || '').trim();

    if (!conteudo) return new Response('Conteúdo obrigatório.', { status: 400 });

    const payload = {
      company_id: companyId,
      sender_id: scope.userId,
      receiver_id: receiverId && isUuid(receiverId) ? receiverId : null,
      assunto: assunto || null,
      conteudo,
      sender_deleted: false,
      receiver_deleted: false
    };

    const { data, error } = await client.from('mural_recados').insert(payload).select('id').single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, id: data?.id || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('Erro mural recados POST:', e);
    return new Response(e?.message || 'Erro ao enviar recado.', { status: 500 });
  }
}

export async function DELETE(event) {
  try {
    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return new Response('ID inválido.', { status: 400 });

    const { client, scope } = await requireMuralScope(event);
    const { data: recado, error } = await client
      .from('mural_recados')
      .select('id, company_id, sender_id, receiver_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!recado) return new Response('Recado não encontrado.', { status: 404 });

    const denied = await assertCompanyAccess(client, scope, String(recado.company_id || '').trim());
    if (denied) return denied;

    const isSender = recado.sender_id === scope.userId;
    const isReceiver = recado.receiver_id === scope.userId;

    if (!isSender && !isReceiver && !scope.isAdmin) {
      return new Response('Sem permissão para excluir este recado.', { status: 403 });
    }

    if (scope.isAdmin && !isSender && !isReceiver) {
      const { error: deleteError } = await client.from('mural_recados').delete().eq('id', id);
      if (deleteError) throw deleteError;
    } else {
      const update = isSender ? { sender_deleted: true } : { receiver_deleted: true };
      const { error: updateError } = await client.from('mural_recados').update(update).eq('id', id);
      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('Erro mural recados DELETE:', e);
    return new Response(e?.message || 'Erro ao excluir recado.', { status: 500 });
  }
}
