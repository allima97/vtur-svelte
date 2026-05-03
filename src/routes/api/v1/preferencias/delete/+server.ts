import { isUuid } from '$lib/server/v1';
import { buildNoStoreJsonResponse, buildNoStoreTextResponse, logServerError, requirePreferenciasScope, safeJsonParse } from '../_shared';

export async function POST(event) {
  try {
    const { client, user, scope } = await requirePreferenciasScope(event, 4);
    const body = safeJsonParse(await event.request.text()) as any;
    const id = String(body?.id || '').trim();
    if (!isUuid(id)) return buildNoStoreTextResponse('id invalido.', 400);

    let query = client.from('minhas_preferencias').delete().eq('id', id);
    if (!scope.isAdmin) query = query.eq('created_by', user.id);

    const { data, error } = await query.select('id').maybeSingle();
    if (error) throw error;
    if (!data) return buildNoStoreTextResponse('Preferência não encontrada.', 404);

    return buildNoStoreJsonResponse({ ok: true });
  } catch (err) {
    logServerError('[preferencias/delete] falha ao excluir preferencia', err);
    return buildNoStoreTextResponse('Erro ao excluir preferência.', 500);
  }
}
