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
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";
import { chunkArray } from "$lib/utils/array";

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
      return json({ items: [], total: 0 }, { headers: DYNAMIC_READ_HEADERS });
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
        const rows: any[] = [];
        const fetchUsers = async (companyBatch?: string[] | null) => {
          let query = client
            .from("users")
            .select("id, nome_completo, email, company_id")
            .eq("active", true)
            .order("nome_completo", { ascending: true })
            .limit(500);

          if (companyBatch && companyBatch.length > 0) {
            query = query.in("company_id", companyBatch);
          }

          const { data, error } = await query;
          if (error) throw error;
          rows.push(...(data || []));
        };

        if (companyIds.length > 0) {
          for (const companyBatch of chunkArray(companyIds)) {
            await fetchUsers(companyBatch);
          }
        } else {
          await fetchUsers();
        }

        const items = rows.map((row: any) => ({
          id: row.id,
          nome: row.nome_completo || row.email,
          email: row.email,
        }));

        return { items, total: items.length };
      },
    });

    return json(payload, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    logServerError("[tarefas/usuarios] falha ao carregar usuarios", err);
    return toErrorResponse(err, "Erro ao carregar usuários.");
  }
}
