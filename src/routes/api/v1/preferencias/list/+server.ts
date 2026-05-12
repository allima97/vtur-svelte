import {
  buildJsonResponse,
  buildNoStoreTextResponse,
  logServerError,
  matchesBusca,
  normalizeTerm,
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
    const busca = normalizeTerm(event.url.searchParams.get("busca"));

    const prefSelect =
      "id, company_id, created_by, tipo_produto_id, cidade_id, nome, localizacao, classificacao, observacao, created_at, updated_at, cidade:cidades!cidade_id(id, nome), tipo_produto:tipo_produtos!tipo_produto_id(id, nome)";

    const payload = await getCachedReadModel({
      key: buildReadModelCacheKey("preferencias:list", {
        userId: user.id,
        companyId: scope.companyId,
        busca,
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
      ttlMs: 20_000,
      staleTtlMs: 120_000,
      loader: async () => {
        const [ownedResp, sharesToMeResp, sharesByMeResp] = await Promise.all([
          client
            .from("minhas_preferencias")
            .select(prefSelect)
            .eq("created_by", user.id)
            .order("created_at", { ascending: false })
            .limit(500),
          client
            .from("minhas_preferencias_shares")
            .select(
              `id, company_id, preferencia_id, shared_by, shared_with, status, created_at, accepted_at, revoked_at, shared_by_user:shared_by(id, nome_completo, email), preferencia:preferencia_id(${prefSelect})`,
            )
            .eq("shared_with", user.id)
            .in("status", ["pending", "accepted"])
            .order("created_at", { ascending: false })
            .limit(500),
          client
            .from("minhas_preferencias_shares")
            .select(
              "id, preferencia_id, shared_with, status, created_at, accepted_at, revoked_at, shared_with_user:shared_with(id, nome_completo, email)",
            )
            .eq("shared_by", user.id)
            .in("status", ["pending", "accepted"])
            .order("created_at", { ascending: false })
            .limit(1000),
        ]);

        if (ownedResp.error) throw ownedResp.error;
        if (sharesToMeResp.error) throw sharesToMeResp.error;
        if (sharesByMeResp.error) throw sharesByMeResp.error;

        const sharesByPref = new Map<string, any[]>();
        for (const row of (sharesByMeResp.data || []) as any[]) {
          const pid = String(row?.preferencia_id || "");
          if (!pid) continue;
          const list = sharesByPref.get(pid) || [];
          list.push({
            id: String(row?.id || ""),
            status: String(row?.status || ""),
            created_at: row?.created_at || null,
            accepted_at: row?.accepted_at || null,
            revoked_at: row?.revoked_at || null,
	            shared_with: row?.shared_with_user
	              ? {
	                  id: String(row?.shared_with_user?.id || ""),
	                  nome_completo: String(
	                    row?.shared_with_user?.nome_completo || "",
	                  ),
	                  email: String(row?.shared_with_user?.email || ""),
	                }
	              : null,
          });
          sharesByPref.set(pid, list);
        }

        const owned = (ownedResp.data || []).map((p: any) => ({
          scope: "owned" as const,
          preferencia: p,
          shares: sharesByPref.get(String(p?.id || "")) || [],
        }));

        const shared = (sharesToMeResp.data || []).map((s: any) => ({
          scope: "shared" as const,
          share: {
            id: String(s?.id || ""),
            status: String(s?.status || ""),
            created_at: s?.created_at || null,
            accepted_at: s?.accepted_at || null,
            revoked_at: s?.revoked_at || null,
            shared_by: s?.shared_by_user
              ? {
                  id: String(s?.shared_by_user?.id || ""),
                  nome_completo: String(s?.shared_by_user?.nome_completo || ""),
                  email: String(s?.shared_by_user?.email || ""),
                }
              : null,
          },
          preferencia: s?.preferencia || null,
        }));

        const all = [...owned, ...shared]
          .filter((row: any) => matchesBusca(row?.preferencia, busca))
          .sort(
            (a: any, b: any) =>
              new Date(b?.preferencia?.created_at || 0).getTime() -
              new Date(a?.preferencia?.created_at || 0).getTime(),
          );

        return { items: all };
      },
    });

    return buildJsonResponse(payload);
  } catch (err) {
    logServerError("[preferencias/list] falha ao listar preferencias", err);
    return buildNoStoreTextResponse("Erro ao listar preferências.", 500);
  }
}
