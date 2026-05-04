import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { ensureClienteAccess } from '$lib/server/clientes';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags
} from '$lib/server/readModelCache';
import { DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';

function sortByDateDesc<T>(items: T[], getDate: (item: T) => string | null) {
  return [...items].sort((left, right) =>
    String(getDate(right) || '').localeCompare(String(getDate(left) || ''))
  );
}

const SUPABASE_IN_BATCH_SIZE = 150;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function fetchBatched<T>(
  values: string[],
  loader: (batch: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>
) {
  const rows: T[] = [];
  for (const batch of chunkArray(values)) {
    const { data, error } = await loader(batch);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const clienteId = String(event.url.searchParams.get('cliente_id') || '').trim();

    const filters = await ensureClienteAccess(
      client,
      scope,
      clienteId,
      event.url.searchParams.get('empresa_id'),
      event.url.searchParams.get('vendedor_ids'),
      1
    );

    const result = await getCachedReadModel<{ vendas: any[]; orcamentos: any[] }>({
      key: buildReadModelCacheKey('clientes:historico', {
        clienteId,
        companyIds: filters.companyIds,
        vendedorIds: filters.vendedorIds,
        userId: scope.userId
      }),
      tags: [
        READ_MODEL_TAGS.clients,
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.quote,
        READ_MODEL_TAGS.catalog,
        ...scopeCacheTags({
          companyIds: filters.companyIds,
          vendedorIds: filters.vendedorIds,
          userId: scope.userId
        })
      ],
      ttlMs: 30_000,
      staleTtlMs: 120_000,
      loader: async () => {
        const vendaSelect =
          'id, cliente_id, vendedor_id, company_id, data_lancamento, data_embarque, destino_cidade_id, destino:produtos!vendas_destino_id_fkey(nome, cidade_id)';
        const fetchScopedVendas = async (buildBaseQuery: () => any) => {
          const rows: any[] = [];
          const companyBatches =
            filters.companyIds.length > 0 ? chunkArray(filters.companyIds) : [null];
          const vendedorBatches =
            filters.vendedorIds.length > 0 ? chunkArray(filters.vendedorIds) : [null];

          for (const companyBatch of companyBatches) {
            for (const vendedorBatch of vendedorBatches) {
              let query = buildBaseQuery();
              if (companyBatch) query = query.in('company_id', companyBatch);
              if (vendedorBatch) query = query.in('vendedor_id', vendedorBatch);

              const { data, error } = await query;
              if (error) throw error;
              rows.push(...(data || []));
            }
          }
          return rows;
        };

        const vendasTitular = await fetchScopedVendas(() =>
          client.from('vendas').select(vendaSelect).eq('cliente_id', clienteId)
        );

        let vendasPassageiro: any[] = [];
        try {
          const { data: viagensComoPassageiro } = await client
            .from('viagem_passageiros')
            .select('viagem_id')
            .eq('cliente_id', clienteId);

          const viagemIds = Array.from(
            new Set(
              (viagensComoPassageiro || [])
                .map((row: any) => String(row?.viagem_id || '').trim())
                .filter(Boolean)
            )
          );

          if (viagemIds.length > 0) {
            const viagensRows = await fetchBatched<any>(viagemIds, (batch) =>
              client
                .from('viagens')
                .select('id, venda_id')
                .in('id', batch)
            );

            const vendaIds = Array.from(
              new Set(
                viagensRows
                  .map((row: any) => String(row?.venda_id || '').trim())
                  .filter(Boolean)
              )
            );

            if (vendaIds.length > 0) {
              vendasPassageiro = await fetchBatched<any>(vendaIds, async (batch) => ({
                data: await fetchScopedVendas(() =>
                  client.from('vendas').select(vendaSelect).in('id', batch)
                ),
                error: null
              }));
            }
          }
        } catch {
          // falha silenciosa — vínculos de passageiro são complementares
        }

        const vendasMap = new Map<string, any>();
        (vendasTitular || []).forEach((row: any) => {
          vendasMap.set(row.id, { ...row, origem_vinculo: 'titular' });
        });
        vendasPassageiro.forEach((row: any) => {
          if (!vendasMap.has(row.id)) {
            vendasMap.set(row.id, { ...row, origem_vinculo: 'passageiro' });
          }
        });

        const vendasData = sortByDateDesc(
          Array.from(vendasMap.values()),
          (row) => row?.data_lancamento || null
        );
        const vendaIds = vendasData
          .map((row) => String(row?.id || '').trim())
          .filter(Boolean);

        const [{ data: recibosData, error: recibosError }, { data: quoteRows, error: quotesError }] =
          await Promise.all([
            vendaIds.length > 0
              ? fetchBatched<any>(vendaIds, (batch) =>
                  client
                    .from('vendas_recibos')
                    .select('venda_id, valor_total, valor_taxas')
                    .in('venda_id', batch)
                ).then((data) => ({ data, error: null }))
              : Promise.resolve({ data: [], error: null }),
            client
              .from('quote')
              .select(
                'id, created_at, status, status_negociacao, total, client_id, created_by, quote_item(title, item_type)'
              )
              .eq('client_id', clienteId)
              .order('created_at', { ascending: false })
          ]);

        if (recibosError) throw recibosError;
        if (quotesError) throw quotesError;

        const cidadeIds = Array.from(
          new Set(
            vendasData
              .map((row: any) =>
                String(row?.destino_cidade_id || row?.destino?.cidade_id || '').trim()
              )
              .filter(Boolean)
          )
        );

        let cidadesMap = new Map<string, string>();
        if (cidadeIds.length > 0) {
          const cidadesData = await fetchBatched<any>(cidadeIds, (batch) =>
            client
              .from('cidades')
              .select('id, nome')
              .in('id', batch)
          );
          cidadesMap = new Map(
            cidadesData.map((row: { id?: string | null; nome?: string | null }) => [
              String(row?.id || '').trim(),
              String(row?.nome || '').trim()
            ])
          );
        }

        let creatorCompanyMap = new Map<string, string>();
        const creatorIds = Array.from(
          new Set(
            (quoteRows || [])
              .map((row: any) => String(row?.created_by || '').trim())
              .filter(Boolean)
          )
        );

        if (filters.companyIds.length > 0 && creatorIds.length > 0) {
          const creators = await fetchBatched<any>(creatorIds, (batch) =>
            client
              .from('users')
              .select('id, company_id')
              .in('id', batch)
          );

          creatorCompanyMap = new Map(
            creators.map((row: { id?: string | null; company_id?: string | null }) => [
              String(row?.id || '').trim(),
              String(row?.company_id || '').trim()
            ])
          );
        }

        const vendas = vendasData.map((row: any) => {
          const recs = (recibosData || []).filter((recibo: any) => recibo.venda_id === row.id);
          const total = recs.reduce(
            (acc: number, recibo: any) => acc + Number(recibo.valor_total || 0),
            0
          );
          const taxas = recs.reduce(
            (acc: number, recibo: any) => acc + Number(recibo.valor_taxas || 0),
            0
          );
          const cidadeId = String(row?.destino_cidade_id || row?.destino?.cidade_id || '').trim();
          return {
            id: row.id,
            data_lancamento: row.data_lancamento || null,
            data_embarque: row.data_embarque || null,
            destino_nome: String(row?.destino?.nome || ''),
            destino_cidade_nome: cidadeId ? cidadesMap.get(cidadeId) || '' : '',
            valor_total: total,
            valor_taxas: taxas,
            origem_vinculo: row.origem_vinculo || 'titular'
          };
        });

        const orcamentos = (quoteRows || [])
          .filter((row: any) => {
            if (filters.vendedorIds.length > 0) {
              return filters.vendedorIds.includes(String(row?.created_by || '').trim());
            }
            if (filters.companyIds.length === 0) return true;
            const creatorCompany =
              creatorCompanyMap.get(String(row?.created_by || '').trim()) || '';
            return creatorCompany ? filters.companyIds.includes(creatorCompany) : true;
          })
          .map((row: any) => ({
            id: row.id,
            data_orcamento: row.created_at || null,
            status: row.status_negociacao || row.status || null,
            valor: row.total ?? null,
            produto_nome:
              row.quote_item?.[0]?.title || row.quote_item?.[0]?.item_type || null
          }));

        return { vendas, orcamentos };
      }
    });

    return json(result, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar historico de clientes.');
  }
}
