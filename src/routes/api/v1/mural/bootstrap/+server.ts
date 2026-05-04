import {
  privateJsonResponse,
  requireMuralScope,
  fetchRecados,
  fetchUsuariosEmpresa,
  noStoreTextResponse,
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
    const { client, user, scope } = await requireMuralScope(event);
    const queryCompanyId = String(
      event.url.searchParams.get("company_id") || "",
    ).trim();

    let empresas: Array<{ id: string; nome_fantasia: string; status: string }> =
      [];
    let selectedCompanyId = String(scope.companyId || "").trim();

    if (scope.isMaster) {
      const { data: vinculos, error } = await client
        .from("master_empresas")
        .select("company_id, status, companies(id, nome_fantasia)")
        .eq("master_id", user.id);
      if (error) throw error;

      empresas = (vinculos || [])
        .map((v: any) => ({
          id: String(v?.companies?.id || v?.company_id || ""),
          nome_fantasia: String(v?.companies?.nome_fantasia || "Empresa"),
          status: String(v?.status || "pending"),
        }))
        .filter((e: any) => e.id && e.status === "approved");

      const approvedIds = new Set(empresas.map((e) => e.id));
      if (queryCompanyId && approvedIds.has(queryCompanyId)) {
        selectedCompanyId = queryCompanyId;
      } else if (!selectedCompanyId || !approvedIds.has(selectedCompanyId)) {
        selectedCompanyId = empresas[0]?.id || "";
      }
    }

    const payload = await getCachedReadModel({
      key: buildReadModelCacheKey("mural:bootstrap", {
        userId: user.id,
        selectedCompanyId,
      }),
      tags: [
        READ_MODEL_TAGS.mural,
        READ_MODEL_TAGS.users,
        ...scopeCacheTags({
          userId: user.id,
          companyIds: selectedCompanyId ? [selectedCompanyId] : [],
        }),
      ],
      ttlMs: 5_000,
      staleTtlMs: 60_000,
      loader: async () => {
        let usuariosEmpresa: any[] = [];
        let recados: any[] = [];
        let supportsAttachments = true;

        if (selectedCompanyId) {
          const [usuarios, recadosResp] = await Promise.all([
            fetchUsuariosEmpresa(client, selectedCompanyId),
            fetchRecados(client, selectedCompanyId),
          ]);
          usuariosEmpresa = usuarios;
          recados = recadosResp.recados;
          supportsAttachments = recadosResp.supportsAttachments;
        }

        return {
          userId: user.id,
          userTypeName: scope.tipoNome,
          companyId: selectedCompanyId || null,
          empresas,
          usuariosEmpresa,
          recados,
          supportsAttachments,
        };
      },
    });

    return privateJsonResponse(payload);
  } catch (e: any) {
    logServerError("[mural/bootstrap] falha ao carregar mural", e);
    return noStoreTextResponse("Erro ao carregar mural.", 500);
  }
}
