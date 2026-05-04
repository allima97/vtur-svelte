import { json, type RequestEvent } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
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

    const searchParams = event.url.searchParams;
    const companyIds = resolveScopedCompanyIds(
      scope,
      searchParams.get("company_id"),
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      searchParams.get("vendedor_id"),
    );
    const accessibleClientIds = scope.isAdmin
      ? null
      : await resolveAccessibleClientIds(client, { companyIds, vendedorIds });

    if (accessibleClientIds && accessibleClientIds.length === 0) {
      return json([], { headers: DYNAMIC_READ_HEADERS });
    }

    const cacheKey = buildReadModelCacheKey("orcamentos:clientes", {
      companyIds,
      vendedorIds,
      isVendedor: scope.isVendedor,
      isAdmin: scope.isAdmin,
      userId: user.id,
    });
    const payload = await getCachedReadModel({
      key: cacheKey,
      tags: [
        READ_MODEL_TAGS.clients,
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.quote,
        ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
      ],
      ttlMs: 30_000,
      staleTtlMs: 120_000,
      loader: async () => {
        let query = client
          .from("clientes")
          .select("id, nome, cpf, whatsapp, email")
          .order("nome", { ascending: true })
          .limit(500);

        if (accessibleClientIds && scope.isVendedor) {
          query = query.in("id", accessibleClientIds.slice(0, 500));
        } else if (companyIds.length > 0) {
          query = query.in("company_id", companyIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      },
    });

    return json(payload, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar clientes.");
  }
}
