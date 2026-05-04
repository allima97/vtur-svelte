import { isUuid } from "$lib/server/v1";
import {
  buildNoStoreJsonResponse,
  buildNoStoreTextResponse,
  logServerError,
  requirePreferenciasScope,
  safeJsonParse,
} from "../_shared";
import { invalidatePreferenceReadModels } from "$lib/server/readModelCache";

export async function POST(event) {
  try {
    const { client, user, scope } = await requirePreferenciasScope(event, 1);
    const body = safeJsonParse(await event.request.text()) as any;
    const shareId = String(body?.share_id || "").trim();
    if (!isUuid(shareId))
      return buildNoStoreTextResponse("share_id invalido.", 400);

    const { data, error } = await client
      .from("minhas_preferencias_shares")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", shareId)
      .or(`shared_by.eq.${user.id},shared_with.eq.${user.id}`)
      .select("id, company_id, shared_by, shared_with, status, revoked_at")
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return buildNoStoreTextResponse("Compartilhamento não encontrado.", 404);

    const companyIds = data.company_id
      ? [String(data.company_id)]
      : scope.companyId
        ? [scope.companyId]
        : [];
    invalidatePreferenceReadModels({
      companyIds,
      userId: String(data.shared_by || ""),
    });
    invalidatePreferenceReadModels({
      companyIds,
      userId: String(data.shared_with || ""),
    });
    return buildNoStoreJsonResponse({ ok: true, share: data });
  } catch (err) {
    logServerError(
      "[preferencias/share-revoke] falha ao revogar compartilhamento",
      err,
    );
    return buildNoStoreTextResponse("Erro ao revogar compartilhamento.", 500);
  }
}
