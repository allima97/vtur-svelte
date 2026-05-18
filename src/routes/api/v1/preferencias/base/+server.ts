import {
  buildJsonResponse,
  buildNoStoreTextResponse,
  fetchPreferenciasBase,
  logServerError,
  requirePreferenciasScope,
} from "../_shared";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";

export async function GET(event) {
  try {
    const { client, user, scope } = await requirePreferenciasScope(event, 1);
    const payload = await getCachedReadModel({
      key: buildReadModelCacheKey("preferencias:base", {
        userId: user.id,
        companyId: scope.companyId,
      }),
      tags: [
        READ_MODEL_TAGS.preferences,
        READ_MODEL_TAGS.catalog,
        READ_MODEL_TAGS.users,
        ...scopeCacheTags({
          userId: user.id,
          companyIds: scope.companyId ? [scope.companyId] : [],
        }),
      ],
      ttlMs: 120_000,
      staleTtlMs: 600_000,
      loader: () => fetchPreferenciasBase(client, scope, user.id),
    });
    return buildJsonResponse(payload, 200, 30);
  } catch (err) {
    logServerError("[preferencias/base] falha ao carregar base", err);
    return buildNoStoreTextResponse("Erro ao carregar base.", 500);
  }
}
