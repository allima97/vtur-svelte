import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { ensureClienteAccess } from '$lib/server/clientes';

function sortByDateDesc<T>(items: T[], getDate: (item: T) => string | null) {
  return [...items].sort((left, right) =>
    String(getDate(right) || '').localeCompare(String(getDate(left) || ''))
  );
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

    const vendaSelect =
      'id, cliente_id, vendedor_id, company_id, data_lancamento, data_embarque, destino_cidade_id, destino:produtos!vendas_destino_id_fkey(nome, cidade_id)';

    let vendasTitularQuery = client.from('vendas').select(vendaSelect).eq('cliente_id', clienteId);
    if (filters.companyIds.length > 0) {
      vendasTitularQuery = vendasTitularQuery.in('company_id', filters.companyIds);
    }
    if (filters.vendedorIds.length > 0) {
      vendasTitularQuery = vendasTitularQuery.in('vendedor_id', filters.vendedorIds);
    }

    const { data: vendasTitular, error: vendasTitularError } = await vendasTitularQuery;
    if (vendasTitularError) throw vendasTitularError;

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
        const { data: viagensRows } = await client
          .from('viagens')
          .select('id, venda_id')
          .in('id', viagemIds);

        const vendaIds = Array.from(
          new Set(
            (viagensRows || [])
              .map((row: any) => String(row?.venda_id || '').trim())
              .filter(Boolean)
          )
        );

        if (vendaIds.length > 0) {
          let vendasPassageiroQuery = client.from('vendas').select(vendaSelect).in('id', vendaIds);
          if (filters.companyIds.length > 0) {
            vendasPassageiroQuery = vendasPassageiroQuery.in('company_id', filters.companyIds);
          }
          if (filters.vendedorIds.length > 0) {
            vendasPassageiroQuery = vendasPassageiroQuery.in('vendedor_id', filters.vendedorIds);
          }
          const { data } = await vendasPassageiroQuery;
          vendasPassageiro = data || [];
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
          ? client
              .from('vendas_recibos')
              .select('venda_id, valor_total, valor_taxas')
              .in('venda_id', vendaIds)
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
      const { data: cidadesData, error: cidadesError } = await client
        .from('cidades')
        .select('id, nome')
        .in('id', cidadeIds);
      if (cidadesError) throw cidadesError;
      cidadesMap = new Map(
        (cidadesData || []).map((row: { id?: string | null; nome?: string | null }) => [
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
      const { data: creators } = await client
        .from('users')
        .select('id, company_id')
        .in('id', creatorIds)
        .limit(5000);

      creatorCompanyMap = new Map(
        (creators || []).map((row: { id?: string | null; company_id?: string | null }) => [
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

    return json({ vendas, orcamentos });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar historico de clientes.');
  }
}
