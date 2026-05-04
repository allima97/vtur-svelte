import { json } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  logServerError,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ["operacao_todo", "tarefas", "operacao"],
        1,
        "Sem acesso a Tarefas.",
      );
    }

    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get("empresa_id"),
    );

    if (!scope.isAdmin && companyIds.length === 0) {
      return json({ items: [], total: 0 });
    }

    const payload = await getCachedReadModel({
      key: buildReadModelCacheKey("tarefas:usuarios", {
        companyIds,
        userId: user.id,
        isAdmin: scope.isAdmin,
      }),
      tags: [
        READ_MODEL_TAGS.users,
        ...scopeCacheTags({ companyIds, userId: user.id }),
      ],
      ttlMs: 30_000,
      staleTtlMs: 120_000,
      loader: async () => {
        let query = client
          .from("users")
          .select("id, nome_completo, email, company_id")
          .eq("active", true)
          .order("nome_completo", { ascending: true })
          .limit(500);

        if (companyIds.length > 0) {
          query = query.in("company_id", companyIds);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const items = (data || []).map((row: any) => ({
          id: row.id,
          nome: row.nome_completo || row.email,
          email: row.email,
        }));

        return { items, total: items.length };
      },
    });

    return json(payload);
  } catch (err) {
    logServerError("[tarefas/usuarios] falha ao carregar usuarios", err);
    return toErrorResponse(err, "Erro ao carregar usuários.");
  }
}
