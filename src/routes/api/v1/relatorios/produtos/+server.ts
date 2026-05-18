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
        ["relatorios", "produtos", "cadastros"],
        1,
        "Sem acesso ao relatorio de produtos.",
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
      key: buildReadModelCacheKey("relatorios:produtos", {
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

        const byProduto = new Map<
          string,
          {
            produto_id: string | null;
            produto: string;
            tipo: string;
            recibos: Set<string>;
            quantidade: number;
            receita: number;
            lucro: number;
          }
        >();

        for (const contribution of contributions) {
          const produto = String(
            contribution.produtoNome || "Produto nao informado",
          );
          const tipo = contribution.isSeguro ? "Seguro" : "Produto";
          const receita = Number(contribution.bruto || 0);
          const lucro = Number(contribution.taxas || 0);
          const key = `${produto}::${tipo}`;
          const current = byProduto.get(key) || {
            produto,
            produto_id: contribution.produtoId || null,
            tipo,
            recibos: new Set<string>(),
            quantidade: 0,
            receita: 0,
            lucro: 0,
          };

          const reciboKey =
            contribution.reciboId ||
            `${contribution.vendaKey}|${contribution.reciboNumero}|${contribution.reciboDate}`;
          if (reciboKey && !current.recibos.has(reciboKey)) {
            current.recibos.add(reciboKey);
            current.quantidade += 1;
          }
          current.receita += receita;
          current.lucro += lucro;
          current.produto_id =
            current.produto_id || contribution.produtoId || null;
          byProduto.set(key, current);
        }

        const items = Array.from(byProduto.values())
          .map((item) => {
            const produtoItem = {
              produto_id: item.produto_id,
              produto: item.produto,
              tipo: item.tipo,
              quantidade: item.quantidade,
              receita: item.receita,
              lucro: item.lucro,
            };
            const produtoId = produtoItem.produto_id ?? null;
            const produtoNameSlug = String(produtoItem.produto ?? "")
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "");

            return {
              ...produtoItem,
              produto_id: produtoId,
              produto_nome: produtoItem.produto,
              nome: produtoItem.produto,
              produto_display: produtoItem.produto,
              produto_short: String(produtoItem.produto ?? "").slice(0, 20),
              produto_display_name: String(produtoItem.produto ?? ""),
              produto_display_short: String(produtoItem.produto ?? "").slice(
                0,
                12,
              ),
              produto_alternative_display: String(produtoItem.produto ?? ""),
              produto_display_alias: String(produtoItem.produto ?? ""),
              produto_name_slug: produtoNameSlug,
              // Parity helper: URL for product detail pages
              produto_url: `/produtos/${produtoId ?? produtoNameSlug}`,
              // New parity alias: product code (uppercase alphanumeric)
              produto_code: String(produtoItem.produto ?? "")
                .replace(/[^A-Za-z0-9]/g, "")
                .toUpperCase(),
              custo_medio:
                produtoItem.quantidade > 0
                  ? Math.max(produtoItem.receita - produtoItem.lucro, 0) /
                    produtoItem.quantidade
                  : 0,
              margem:
                produtoItem.receita > 0
                  ? (produtoItem.lucro / produtoItem.receita) * 100
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
    return toErrorResponse(err, "Erro ao carregar relatorio de produtos.");
  }
}
