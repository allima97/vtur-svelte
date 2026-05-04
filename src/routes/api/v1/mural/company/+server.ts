import {
  assertCompanyAccess,
  fetchRecados,
  fetchUsuariosEmpresa,
  noStoreTextResponse,
  privateJsonResponse,
  requireMuralScope,
} from "../_shared";
import { logServerError } from "$lib/server/v1";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";

export async function GET(event) {
  try {
    const companyId = String(
      event.url.searchParams.get("company_id") || "",
    ).trim();
    if (!companyId) return noStoreTextResponse("company_id obrigatorio.", 400);

    const { client, scope } = await requireMuralScope(event);
    const denied = await assertCompanyAccess(client, scope, companyId);
    if (denied) return denied;

    const payload = await getCachedReadModel({
      key: buildReadModelCacheKey("mural:company", {
        userId: scope.userId,
        companyId,
      }),
      tags: [
        READ_MODEL_TAGS.mural,
        READ_MODEL_TAGS.users,
        ...scopeCacheTags({ userId: scope.userId, companyIds: [companyId] }),
      ],
      ttlMs: 5_000,
      staleTtlMs: 60_000,
      loader: async () => {
        const [usuariosEmpresa, recadosResp] = await Promise.all([
          fetchUsuariosEmpresa(client, companyId),
          fetchRecados(client, companyId),
        ]);

        return {
          usuariosEmpresa,
          recados: recadosResp.recados,
          supportsAttachments: recadosResp.supportsAttachments,
        };
      },
    });

    return privateJsonResponse(payload);
  } catch (e: any) {
    logServerError("[mural/company] falha ao carregar mural", e);
    return noStoreTextResponse("Erro ao carregar mural.", 500);
  }
}
