import { json } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  logServerError,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import { normalizeViagemStatus } from "$lib/viagens/status";
import { syncViagensStatus } from "$lib/server/viagensStatus";
import { ensureClienteAccess } from "$lib/server/clientes";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";

const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function dedupeRowsById<T extends { id?: string | null }>(rows: T[]) {
  const map = new Map<string, T>();
  rows.forEach((row) => {
    const id = String(row?.id || "").trim();
    if (id && !map.has(id)) map.set(id, row);
  });
  return Array.from(map.values());
}

export async function GET(event) {
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

    const { params } = event;
    const clienteId = params.id;

    if (!clienteId) {
      return json(
        { success: false, error: "ID do cliente é obrigatório" },
        { status: 400 },
      );
    }

    const { searchParams } = event.url;
    const filters = await ensureClienteAccess(
      client,
      scope,
      clienteId,
      searchParams.get("empresa_id"),
      searchParams.get("vendedor_ids") || searchParams.get("vendedor_id"),
      1,
    );
    const companyIds =
      filters.companyIds.length > 0
        ? filters.companyIds
        : resolveScopedCompanyIds(scope, searchParams.get("empresa_id"));

    const cacheKey = buildReadModelCacheKey("viagens:cliente", {
      clienteId,
      companyIds,
      vendedorIds: filters.vendedorIds,
      userId: user.id,
      isAdmin: scope.isAdmin,
    });
    const payload = await getCachedReadModel({
      key: cacheKey,
      tags: [
        READ_MODEL_TAGS.trips,
        READ_MODEL_TAGS.clients,
        READ_MODEL_TAGS.sales,
        ...scopeCacheTags({
          companyIds,
          vendedorIds: filters.vendedorIds,
          userId: user.id,
        }),
      ],
      ttlMs: 20_000,
      staleTtlMs: 90_000,
      loader: async () => {
        // Busca viagens do cliente específico
        const fetchViagens = async (companyBatch?: string[]) => {
          let query = client
            .from("viagens")
            .select(
              `
        id, 
        venda_id, 
        orcamento_id, 
        cliente_id, 
        company_id, 
        responsavel_user_id, 
        origem, 
        destino, 
        data_inicio, 
        data_fim, 
        status, 
        observacoes, 
        follow_up_text,
        follow_up_fechado,
        created_at, 
        updated_at,
        recibo_id
      `,
            )
            .eq("cliente_id", clienteId)
            .order("data_inicio", { ascending: false })
            .limit(100);

          if (companyBatch && companyBatch.length > 0) {
            query = query.in("company_id", companyBatch);
          }

          const { data, error } = await query;

          if (error) {
            throw error;
          }

          return (data || []) as any[];
        };

        let data: any[] = [];
        if (companyIds.length > SUPABASE_IN_BATCH_SIZE) {
          for (const batch of chunkArray(companyIds)) {
            data.push(...(await fetchViagens(batch)));
          }
          data = dedupeRowsById(data).sort((a: any, b: any) =>
            String(b?.data_inicio || "").localeCompare(String(a?.data_inicio || "")),
          );
        } else {
          data = await fetchViagens(companyIds.length > 0 ? companyIds : undefined);
        }

        let scopedRows = (data || []) as any[];
        if (filters.vendedorIds.length > 0) {
          const vendaIds = Array.from(
            new Set(
              scopedRows
                .map((row: any) => String(row?.venda_id || "").trim())
                .filter(Boolean),
            ),
          );
          let vendaIdsPermitidas = new Set<string>();

          if (vendaIds.length > 0) {
            const vendasRows: any[] = [];
            for (const vendaBatch of chunkArray(vendaIds)) {
              for (const vendedorBatch of chunkArray(filters.vendedorIds)) {
                const { data: batchRows, error: vendasError } = await client
                  .from("vendas")
                  .select("id")
                  .in("id", vendaBatch)
                  .in("vendedor_id", vendedorBatch);
                if (vendasError) throw vendasError;
                vendasRows.push(...(batchRows || []));
              }
            }
            vendaIdsPermitidas = new Set(
              (vendasRows || [])
                .map((row: any) => String(row?.id || "").trim())
                .filter(Boolean),
            );
          }

          scopedRows = scopedRows.filter((row: any) => {
            const responsavelId = String(row?.responsavel_user_id || "").trim();
            const vendaId = String(row?.venda_id || "").trim();
            return (
              (responsavelId && filters.vendedorIds.includes(responsavelId)) ||
              (vendaId && vendaIdsPermitidas.has(vendaId))
            );
          });
        }

        const resolvedStatuses = await syncViagensStatus(client, scopedRows);

        // Busca dados do cliente
        const { data: clienteData } = await client
          .from("clientes")
          .select("id, nome")
          .eq("id", clienteId)
          .single();

        const items = scopedRows.map((row: any) => ({
          id: row.id,
          venda_id: row.venda_id,
          orcamento_id: row.orcamento_id,
          cliente_id: row.cliente_id,
          cliente_nome: clienteData?.nome || "Cliente não encontrado",
          origem: row.origem || "",
          destino: row.destino || "Destino não informado",
          data_inicio: row.data_inicio,
          data_fim: row.data_fim,
          status:
            resolvedStatuses.get(row.id) || normalizeViagemStatus(row.status),
          observacoes: row.observacoes || "",
          follow_up_text: row.follow_up_text || "",
          follow_up_fechado: row.follow_up_fechado || false,
          recibo_id: row.recibo_id,
          created_at: row.created_at,
        }));

        return { success: true, items, total: items.length };
      },
    });

    return json(payload, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    logServerError(
      "[viagens/cliente] falha ao carregar viagens do cliente",
      err,
    );
    return toErrorResponse(err, "Erro ao carregar viagens do cliente.");
  }
}
