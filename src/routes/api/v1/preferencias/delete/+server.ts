import { isUuid } from "$lib/server/v1";
import { rejectCrossOriginRequest, rejectLargePayload } from "$lib/server/requestGuards";
import {
  buildNoStoreJsonResponse,
  buildNoStoreTextResponse,
  logServerError,
  requirePreferenciasScope,
  safeJsonParse,
} from "../_shared";
import { invalidatePreferenceReadModels } from "$lib/server/readModelCache";

const MAX_PREFERENCIAS_DELETE_BODY_BYTES = 8 * 1024;

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const sizeError = rejectLargePayload(event.request, MAX_PREFERENCIAS_DELETE_BODY_BYTES);
    if (sizeError) return sizeError;

    const { client, user, scope } = await requirePreferenciasScope(event, 4);
    const rawBody = await event.request.text();
    if (rawBody.length > MAX_PREFERENCIAS_DELETE_BODY_BYTES) {
      return buildNoStoreTextResponse("Payload muito grande.", 413);
    }
    const body = safeJsonParse(rawBody) as any;
    const id = String(body?.id || "").trim();
    if (!isUuid(id)) return buildNoStoreTextResponse("id invalido.", 400);

    let query = client.from("minhas_preferencias").delete().eq("id", id);
    if (!scope.isAdmin) query = query.eq("created_by", user.id);

    const { data, error } = await query.select("id").maybeSingle();
    if (error) throw error;
    if (!data)
      return buildNoStoreTextResponse("Preferência não encontrada.", 404);

    invalidatePreferenceReadModels({
      companyIds: scope.companyId ? [scope.companyId] : [],
      userId: user.id,
    });
    return buildNoStoreJsonResponse({ ok: true });
  } catch (err) {
    logServerError("[preferencias/delete] falha ao excluir preferencia", err);
    return buildNoStoreTextResponse("Erro ao excluir preferência.", 500);
  }
}
