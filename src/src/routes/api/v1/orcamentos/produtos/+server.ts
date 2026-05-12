import { json, type RequestEvent } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
} from "$lib/server/readModelCache";

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ["orcamentos", "vendas"],
        1,
        "Sem acesso a Orcamentos.",
      );
    }

    const payload = await getCachedReadModel({
      key: buildReadModelCacheKey("orcamentos:produtos", {
        userId: user.id,
        isAdmin: scope.isAdmin,
      }),
      tags: [READ_MODEL_TAGS.catalog],
      ttlMs: 60_000,
      staleTtlMs: 300_000,
      loader: async () => {
        const { data, error } = await client
          .from("produtos")
          .select("nome, destino, cidade_id")
          .order("nome", { ascending: true })
          .limit(1000);
        if (error) throw error;
        return data || [];
      },
    });

    return json(payload, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar produtos.");
  }
}
