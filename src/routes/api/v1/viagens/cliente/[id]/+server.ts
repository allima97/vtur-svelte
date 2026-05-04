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

        if (companyIds.length > 0) {
          query = query.in("company_id", companyIds);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
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
            const { data: vendasRows, error: vendasError } = await client
              .from("vendas")
              .select("id")
              .in("id", vendaIds)
              .in("vendedor_id", filters.vendedorIds);
            if (vendasError) throw vendasError;
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

    return json(payload);
  } catch (err) {
    logServerError(
      "[viagens/cliente] falha ao carregar viagens do cliente",
      err,
    );
    return toErrorResponse(err, "Erro ao carregar viagens do cliente.");
  }
}
