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

const SUPABASE_IN_BATCH_SIZE = 100;

type OrcamentoClienteRow = {
  id: string;
  nome: string | null;
  cpf: string | null;
  whatsapp: string | null;
  email: string | null;
};

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function dedupeClientes(rows: OrcamentoClienteRow[]) {
  const map = new Map<string, OrcamentoClienteRow>();
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
    const accessibleClientIds = !scope.isAdmin && scope.isVendedor
      ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds })
      : null;

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
        const buildQuery = (clientIds?: string[], companyIdsFilter = companyIds) => {
          let query = client
            .from("clientes")
            .select("id, nome, cpf, whatsapp, email")
            .order("nome", { ascending: true })
            .limit(500);

          if (clientIds) {
            query = query.in("id", clientIds);
          } else if (companyIdsFilter.length > 0) {
            query = query.in("company_id", companyIdsFilter);
          }

          return query;
        };

        if (accessibleClientIds && scope.isVendedor && accessibleClientIds.length > SUPABASE_IN_BATCH_SIZE) {
          const rows: OrcamentoClienteRow[] = [];
          for (const batch of chunkArray(accessibleClientIds)) {
            const { data, error } = await buildQuery(batch);
            if (error) throw error;
            rows.push(...((data || []) as OrcamentoClienteRow[]));
            if (dedupeClientes(rows).length >= 500) break;
          }

          return dedupeClientes(rows).slice(0, 500);
        }

        if (!accessibleClientIds && companyIds.length > SUPABASE_IN_BATCH_SIZE) {
          const rows: OrcamentoClienteRow[] = [];
          for (const batch of chunkArray(companyIds)) {
            const { data, error } = await buildQuery(undefined, batch);
            if (error) throw error;
            rows.push(...((data || []) as OrcamentoClienteRow[]));
            if (dedupeClientes(rows).length >= 500) break;
          }

          return dedupeClientes(rows).slice(0, 500);
        }

        const { data, error } = await buildQuery(accessibleClientIds || undefined);
        if (error) throw error;
        return data || [];
      },
    });

    return json(payload, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar clientes.");
  }
}
