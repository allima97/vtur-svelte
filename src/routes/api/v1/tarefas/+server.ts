import { json } from "@sveltejs/kit";
import {
  ensureTodoAccess,
  mapTodoRow,
  normalizeVisibleTodoStatus,
} from "$lib/server/agenda";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureTodoAccess(scope, 1, "Sem acesso a Tarefas.");

    const status = String(event.url.searchParams.get("status") || "").trim();
    const prioridade = String(
      event.url.searchParams.get("prioridade") || "",
    ).trim();

    const result = await getCachedReadModel({
      key: buildReadModelCacheKey("tarefas:list", {
        userId: user.id,
        companyIds: scope.companyIds,
        status,
        prioridade,
      }),
      tags: [
        READ_MODEL_TAGS.todo,
        READ_MODEL_TAGS.users,
        ...scopeCacheTags({ userId: user.id, companyIds: scope.companyIds }),
      ],
      ttlMs: 15_000,
      staleTtlMs: 90_000,
      loader: async () => {
        let query = client
          .from("agenda_itens")
          .select(
            "id, titulo, descricao, done, categoria_id, prioridade, status, arquivo, created_at, updated_at",
          )
          .eq("tipo", "todo")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (prioridade) {
          query = query.eq("prioridade", prioridade);
        }

        const { data, error } = await query;
        if (error) throw error;

        const categoriaIds = Array.from(
          new Set(
            (data || [])
              .map((row: any) => String(row?.categoria_id || "").trim())
              .filter(Boolean),
          ),
        );

        let categoriasMap = new Map<string, string>();
        if (categoriaIds.length > 0) {
          const { data: categoriasData, error: categoriasError } = await client
            .from("todo_categorias")
            .select("id, nome")
            .in("id", categoriaIds);

          if (categoriasError) throw categoriasError;
          (categoriasData || []).forEach((row: any) => {
            categoriasMap.set(String(row.id), String(row.nome || ""));
          });
        }

        const items = (data || [])
          .map(mapTodoRow)
          .filter(Boolean)
          .filter((row) => {
            if (!row) return false;
            if (!status || status === "todas") return true;
            return normalizeVisibleTodoStatus(row.status) === status;
          })
          .map((row) => ({
            ...row,
            categoria_nome:
              categoriasMap.get(String(row?.categoria_id || "")) ||
              "Sem categoria",
          }));

        return { items };
      },
    });

    return json(result, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar tarefas.");
  }
}
