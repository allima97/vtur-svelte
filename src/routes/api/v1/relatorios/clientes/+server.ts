import { json } from "@sveltejs/kit";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import {
  getClienteCategoria,
  getCurrentYearRange,
  monthSpanInclusive,
} from "$lib/server/relatorios";
import { fetchVendasKpiReciboContributions } from "$lib/server/vendas-kpis";
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";
import { chunkArray, uniqueCleanStrings } from "$lib/utils/array";

type ClienteLookupRow = {
  id?: string | null;
  nome?: string | null;
  email?: string | null;
  cpf?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
};

async function fetchClientesByIds(client: SupabaseClient, ids: string[]) {
  const clientesById = new Map<string, ClienteLookupRow>();
  const cleanIds = uniqueCleanStrings(ids);

  for (const batch of chunkArray(cleanIds)) {
    const { data, error } = await client
      .from("clientes")
      .select("id, nome, email, cpf, telefone, whatsapp")
      .in("id", batch);

    if (error) throw error;

    for (const row of (data || []) as ClienteLookupRow[]) {
      const id = String(row?.id || "").trim();
      if (id) clientesById.set(id, row);
    }
  }

  return clientesById;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ["relatorios", "clientes"],
        1,
        "Sem acesso ao relatorio de clientes.",
      );
    }

    const { searchParams } = event.url;
    const defaultRange = getCurrentYearRange();
    const dataInicio = String(
      searchParams.get("data_inicio") || defaultRange.dataInicio,
    ).trim();
    const dataFim = String(
      searchParams.get("data_fim") || defaultRange.dataFim,
    ).trim();
    const companyIds = resolveScopedCompanyIds(
      scope,
      searchParams.get("empresa_id"),
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      searchParams.get("vendedor_ids") || searchParams.get("vendedor_id"),
    );

    const payload = await getCachedReadModel({
      key: buildReadModelCacheKey("relatorios:clientes", {
        userId: user.id,
        dataInicio,
        dataFim,
        companyIds,
        vendedorIds,
      }),
      tags: [
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.clients,
        ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
      ],
      ttlMs: 180_000,
      staleTtlMs: 900_000,
      loader: async () => {
        const { contributions } = await fetchVendasKpiReciboContributions(client, {
          dataInicio,
          dataFim,
          companyIds,
          vendedorIds,
        });

        const months = monthSpanInclusive(dataInicio, dataFim);
        const byClient = new Map<
          string,
          {
            cliente_id: string | null;
            vendaKeys: Set<string>;
            total_compras: number;
            total_gasto: number;
            ultima_compra: string | null;
          }
        >();

        for (const contribution of contributions) {
          const clienteId = String(contribution.clienteId || "").trim();
          const fallbackKey =
            contribution.vendaKey ||
            contribution.reciboId ||
            `${contribution.reciboNumero}|${contribution.reciboDate}`;
          const clientKey = clienteId || `sem-cliente:${fallbackKey}`;
          const current = byClient.get(clientKey) || {
            cliente_id: clienteId || null,
            vendaKeys: new Set<string>(),
            total_compras: 0,
            total_gasto: 0,
            ultima_compra: null,
          };

          const vendaKey =
            contribution.vendaKey || contribution.reciboId || fallbackKey;
          if (vendaKey && !current.vendaKeys.has(vendaKey)) {
            current.vendaKeys.add(vendaKey);
            current.total_compras += 1;
          }
          current.total_gasto += Number(contribution.bruto || 0);

          const dataRecibo = String(contribution.reciboDate || "").slice(0, 10);
          if (
            dataRecibo &&
            (!current.ultima_compra || dataRecibo > current.ultima_compra)
          ) {
            current.ultima_compra = dataRecibo;
          }

          byClient.set(clientKey, current);
        }

        const clientesById = await fetchClientesByIds(
          client,
          Array.from(byClient.values())
            .map((item) => item.cliente_id)
            .filter((id): id is string => Boolean(id)),
        );

        const items = Array.from(byClient.values())
          .map((item) => {
            const clienteItem = {
              cliente_id: item.cliente_id,
              total_compras: item.total_compras,
              total_gasto: item.total_gasto,
              ultima_compra: item.ultima_compra,
            };
            const lookup = clienteItem.cliente_id
              ? clientesById.get(clienteItem.cliente_id)
              : null;
            const cliente =
              String(lookup?.nome || "").trim() || "Cliente sem nome";
            const cpf = String(lookup?.cpf || "").trim() || null;
            const email = String(lookup?.email || "").trim() || null;
            const telefone = String(lookup?.telefone || "").trim() || null;
            const whatsapp = String(lookup?.whatsapp || "").trim() || null;
            // Parity alias for VTUR-APP: expose client CPF as a direct field
            const ticketMedio =
              clienteItem.total_compras > 0
                ? clienteItem.total_gasto / clienteItem.total_compras
                : 0;
            return {
              ...clienteItem,
              cliente,
              cpf,
              email,
              telefone,
              whatsapp,
              cliente_cpf: cpf,
              cliente_telefone: telefone,
              cliente_whatsapp: whatsapp,
              cliente_display: cliente,
              // Additional parity aliases for templates
              cliente_nome: cliente,
              cliente_email: email,
              cliente_display_name: cliente,
              cliente_name: cliente,
              ticket_medio: ticketMedio,
              frequencia: clienteItem.total_compras / months,
              categoria: getClienteCategoria(
                clienteItem.total_compras,
                clienteItem.total_gasto,
              ),
            };
          })
          .sort((left, right) => right.total_gasto - left.total_gasto);

        return {
          items,
          total: items.length,
          periodo: {
            data_inicio: dataInicio,
            data_fim: dataFim,
          },
        };
      },
    });

    return json(payload, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar relatorio de clientes.");
  }
}
