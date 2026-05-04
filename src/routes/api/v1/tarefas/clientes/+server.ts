import { json } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  logServerError,
  sanitizePostgrestSearchTerm,
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
        ["operacao_todo", "tarefas", "operacao", "clientes"],
        1,
        "Sem acesso a Tarefas.",
      );
    }

    const search = sanitizePostgrestSearchTerm(
      event.url.searchParams.get("search"),
    ).toLowerCase();
    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get("empresa_id"),
    );

    if (!scope.isAdmin && companyIds.length === 0) {
      return json({ items: [], total: 0 });
    }

    const payload = await getCachedReadModel({
      key: buildReadModelCacheKey("tarefas:clientes", {
        search,
        companyIds,
        userId: user.id,
        isAdmin: scope.isAdmin,
      }),
      tags: [
        READ_MODEL_TAGS.clients,
        ...scopeCacheTags({ companyIds, userId: user.id }),
      ],
      ttlMs: search ? 15_000 : 30_000,
      staleTtlMs: 120_000,
      loader: async () => {
        let query = client
          .from("clientes")
          .select("id, nome, email, telefone, company_id")
          .order("nome", { ascending: true })
          .limit(search ? 50 : 300);

        if (companyIds.length > 0) {
          query = query.in("company_id", companyIds);
        }

        if (search) {
          query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const items = (data || []).map((row: any) => ({
          id: row.id,
          nome: row.nome,
          email: row.email,
          telefone: row.telefone,
        }));

        return { items, total: items.length };
      },
    });

    return json(payload);
  } catch (err) {
    logServerError("[tarefas/clientes] falha ao carregar clientes", err);
    return toErrorResponse(err, "Erro ao carregar clientes.");
  }
}
