import { buildJsonResponse, buildNoStoreTextResponse, fetchPreferenciasBase, logServerError, requirePreferenciasScope } from '../_shared';

export async function GET(event) {
  try {
    const { client, user, scope } = await requirePreferenciasScope(event, 1);
    const payload = await fetchPreferenciasBase(client, scope, user.id);
    return buildJsonResponse(payload, 200, 30);
  } catch (err) {
    logServerError('[preferencias/base] falha ao carregar base', err);
    return buildNoStoreTextResponse('Erro ao carregar base.', 500);
  }
}
