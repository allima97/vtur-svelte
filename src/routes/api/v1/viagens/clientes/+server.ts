import { json, type RequestEvent } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
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
import { chunkArray, SUPABASE_IN_BATCH_SIZE } from "$lib/utils/array";

type ViagemClienteRow = {
  id: string;
  nome: string | null;
  cpf: string | null;
};

function dedupeClientes(rows: ViagemClienteRow[]) {
  const map = new Map<string, ViagemClienteRow>();
  rows.forEach((row) => {
    const id = String(row?.id || "").trim();
    if (id && !map.has(id)) map.set(id, row);
  });
  return Array.from(map.values()).sort((left, right) =>
    String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR"),
  );
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ["operacao_viagens", "viagens", "operacao"],
        1,
        "Sem acesso a Viagens.",
      );
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get("empresa_id"));
    const vendedorIds = scope.isVendedor ? [user.id] : [];
    const useCompanyScope = scope.isAdmin || scope.isMaster || scope.isFinanceiro || scope.isGestor;
    const accessibleClientIds = !useCompanyScope
      ? await resolveAccessibleClientIds(client, {
          companyIds,
          vendedorIds,
        })
      : [];

    if (!useCompanyScope && accessibleClientIds.length === 0) {
      return json([], { headers: DYNAMIC_READ_HEADERS });
    }

    const cacheKey = buildReadModelCacheKey("viagens:clientes", {
      isAdmin: scope.isAdmin,
      useCompanyScope,
      companyIds,
      vendedorIds,
      accessibleClientCount: accessibleClientIds.length,
      userId: user.id,
    });
    const payload = await getCachedReadModel({
      key: cacheKey,
      tags: [
        READ_MODEL_TAGS.trips,
        READ_MODEL_TAGS.clients,
        READ_MODEL_TAGS.sales,
        ...scopeCacheTags({
          companyIds,
          vendedorIds,
          userId: user.id,
        }),
      ],
      ttlMs: 30_000,
      staleTtlMs: 120_000,
      loader: async () => {
        const buildQuery = (clientIds?: string[], companyIdsFilter = companyIds) => {
          let query = client
            .from("clientes")
            .select("id, nome, cpf")
            .order("nome", { ascending: true })
            .limit(200);
          if (clientIds) {
            query = query.in("id", clientIds);
          } else if (companyIdsFilter.length > 0) {
            query = query.in("company_id", companyIdsFilter);
          }
          return query;
        };

        const fetchClientes = async () => {
          if (!useCompanyScope && accessibleClientIds.length > 0) {
            if (accessibleClientIds.length <= SUPABASE_IN_BATCH_SIZE) {
              return buildQuery(accessibleClientIds);
            }

            const rows: ViagemClienteRow[] = [];
            for (const batch of chunkArray(accessibleClientIds)) {
              const result = await buildQuery(batch);
              if (result.error) {
                return { data: null, error: result.error } as typeof result;
              }
              rows.push(
                ...((result.data || []) as unknown as ViagemClienteRow[]),
              );
            }

            return { data: dedupeClientes(rows).slice(0, 200), error: null };
          }

          if (companyIds.length > SUPABASE_IN_BATCH_SIZE) {
            const rows: ViagemClienteRow[] = [];
            for (const batch of chunkArray(companyIds)) {
              const result = await buildQuery(undefined, batch);
              if (result.error) {
                return { data: null, error: result.error } as typeof result;
              }
              rows.push(
                ...((result.data || []) as unknown as ViagemClienteRow[]),
              );
              if (dedupeClientes(rows).length >= 200) break;
            }

            return { data: dedupeClientes(rows).slice(0, 200), error: null };
          }

          return buildQuery();
        };

        const { data, error } = await fetchClientes();
        if (error) throw error;
        return data || [];
      },
    });

    return json(payload, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar clientes.");
  }
}
