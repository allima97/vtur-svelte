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
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), revoked_at: null })
      .eq('id', shareId)
      .eq('shared_with', user.id)
      .select('id, status, accepted_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return buildNoStoreTextResponse('Convite não encontrado.', 404);

    return buildNoStoreJsonResponse({ ok: true, share: data });
  } catch (err) {
    logServerError('[preferencias/share-accept] falha ao aceitar compartilhamento', err);
    return buildNoStoreTextResponse('Erro ao aceitar compartilhamento.', 500);
  }
}
