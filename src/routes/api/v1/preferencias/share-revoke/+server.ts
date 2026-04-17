import { isUuid } from '$lib/server/v1';
import { requirePreferenciasScope, safeJsonParse } from '../_shared';

export async function POST(event) {
  try {
    const { client, user } = await requirePreferenciasScope(event, 1);
    const body = safeJsonParse(await event.request.text()) as any;
    const shareId = String(body?.share_id || '').trim();
    if (!isUuid(shareId)) return new Response('share_id invalido.', { status: 400 });

    const { data, error } = await client
      .from('minhas_preferencias_shares')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', shareId)
      .or(`shared_by.eq.${user.id},shared_with.eq.${user.id}`)
      .select('id, status, revoked_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return new Response('Compartilhamento não encontrado.', { status: 404 });

    return new Response(JSON.stringify({ ok: true, share: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Erro preferencias/share-revoke', err);
    return new Response('Erro ao revogar compartilhamento.', { status: 500 });
  }
}

