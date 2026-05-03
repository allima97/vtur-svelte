import { isUuid } from '$lib/server/v1';
import { buildNoStoreJsonResponse, buildNoStoreTextResponse, logServerError, requirePreferenciasScope, safeJsonParse } from '../_shared';

export async function POST(event) {
  try {
    const { client, user } = await requirePreferenciasScope(event, 1);
    const body = safeJsonParse(await event.request.text()) as any;
    const shareId = String(body?.share_id || '').trim();
    if (!isUuid(shareId)) return buildNoStoreTextResponse('share_id invalido.', 400);

    const { data, error } = await client
      .from('minhas_preferencias_shares')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', shareId)
      .or(`shared_by.eq.${user.id},shared_with.eq.${user.id}`)
      .select('id, status, revoked_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return buildNoStoreTextResponse('Compartilhamento não encontrado.', 404);

    return buildNoStoreJsonResponse({ ok: true, share: data });
  } catch (err) {
    logServerError('[preferencias/share-revoke] falha ao revogar compartilhamento', err);
    return buildNoStoreTextResponse('Erro ao revogar compartilhamento.', 500);
  }
}
