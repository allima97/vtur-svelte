import { json } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import { getCurrentYearRange } from "$lib/server/relatorios";
import { fetchVendasKpiReciboContributions } from "$lib/server/vendas-kpis";
import { DYNAMIC_READ_HEADERS } from "$lib/server/httpCache";
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
        ["relatorios", "vendas"],
        1,
        "Sem acesso ao relatorio de destinos.",
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
      key: buildReadModelCacheKey("relatorios:destinos", {
        userId: user.id,
        dataInicio,
        dataFim,
        companyIds,
        vendedorIds,
      }),
      tags: [
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.catalog,
        ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id }),
      ],
      ttlMs: 300_000,
      staleTtlMs: 1_800_000,
      loader: async () => {
        const { contributions } = await fetchVendasKpiReciboContributions(client, {
          dataInicio,
          dataFim,
          companyIds,
          vendedorIds,
        });

        const totalReceita = contributions.reduce(
          (sum, contribution) => sum + Number(contribution.bruto || 0),
          0,
        );
        const byDestino = new Map<
          string,
          {
            destino: string;
            vendaKeys: Set<string>;
            quantidade: number;
            receita: number;
          }
        >();

        for (const contribution of contributions) {
          const destino = String(
            contribution.destinoNome || "Destino nao informado",
          );
          const current = byDestino.get(destino) || {
            destino,
            vendaKeys: new Set<string>(),
            quantidade: 0,
            receita: 0,
          };

          const vendaKey =
            contribution.vendaKey ||
            contribution.reciboId ||
            `${contribution.reciboNumero}|${contribution.reciboDate}`;
          if (vendaKey && !current.vendaKeys.has(vendaKey)) {
            current.vendaKeys.add(vendaKey);
            current.quantidade += 1;
          }
          current.receita += Number(contribution.bruto || 0);
          byDestino.set(destino, current);
        }

        const items = Array.from(byDestino.values())
          .map((item) => {
            const destinoItem = {
              destino: item.destino,
              quantidade: item.quantidade,
              receita: item.receita,
            };

            return {
              ...destinoItem,
              destino_id: null,
              // Expose alias for parity with VTUR-APP expectations
              destino: destinoItem.destino,
              destino_nome: destinoItem.destino,
              // New parity alias: display name and short name
              destino_display: destinoItem.destino,
              destino_short: String(destinoItem.destino ?? "").slice(0, 20),
              destino_display_name: String(destinoItem.destino ?? ""),
              destino_display_short: String(destinoItem.destino ?? "").slice(
                0,
                12,
              ),
              destino_slug: String(destinoItem.destino ?? "")
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, ""),
              destino_codigo: String(destinoItem.destino ?? "")
                .replace(/[^A-Za-z0-9]/g, "")
                .toUpperCase(),
              ticket_medio:
                destinoItem.quantidade > 0
                  ? destinoItem.receita / destinoItem.quantidade
                  : 0,
              percentual:
                totalReceita > 0
                  ? (destinoItem.receita / totalReceita) * 100
                  : 0,
            };
          })
          .sort((left, right) => right.receita - left.receita);

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
    return toErrorResponse(err, "Erro ao carregar relatorio de destinos.");
  }
}
