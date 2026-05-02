import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  parseIntSafe,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import {
  deriveClienteStatus,
  formatDocumentoDisplay,
  isBirthdayToday,
  matchesClienteBusca,
  resolveClienteScopedFilters
} from '$lib/server/clientes';

type ClienteBaseRow = {
  id: string;
  nome: string | null;
  cpf: string | null;
  nascimento: string | null;
  telefone: string | null;
  email: string | null;
  whatsapp: string | null;
  cidade: string | null;
  estado: string | null;
  classificacao: string | null;
  tipo_pessoa: string | null;
  tipo_cliente: string | null;
  tags: string[] | null;
  active: boolean | null;
  ativo: boolean | null;
  company_id: string | null;
  created_at: string | null;
};

type VendaResumoRow = {
  cliente_id: string | null;
  data_venda: string | null;
  valor_total: number | null;
};

type QuoteResumoRow = {
  client_id: string | null;
  created_at: string | null;
  created_by: string | null;
};

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
    const id = String(row?.id || '').trim();
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
      ensureModuloAccess(scope, ['clientes', 'clientes_consulta'], 1, 'Sem acesso a Clientes.');
    }

    const { searchParams } = event.url;
    const page = parseIntSafe(searchParams.get('page'), 1);
    const pageSize = Math.min(200, parseIntSafe(searchParams.get('pageSize'), 20));
    const all = String(searchParams.get('all') || '').trim() === '1';
    const busca = String(searchParams.get('busca') || '').trim();

    const { companyIds, vendedorIds, accessibleClientIds } = await resolveClienteScopedFilters(
      client,
      scope,
      searchParams.get('empresa_id'),
      searchParams.get('vendedor_ids')
    );

    if (accessibleClientIds && accessibleClientIds.length === 0) {
      return json({
        page,
        pageSize,
        total: 0,
        items: []
      });
    }

    const buildClientsQuery = (clientIds?: string[]) => {
      let clientsQuery = client
        .from('clientes')
        .select(
          'id, nome, cpf, nascimento, telefone, email, whatsapp, cidade, estado, classificacao, tipo_pessoa, tipo_cliente, tags, active, ativo, company_id, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(5000);

      if (clientIds) {
        clientsQuery = clientsQuery.in('id', clientIds);
      }

      return clientsQuery;
    };

    const fetchClients = async () => {
      if (!accessibleClientIds || accessibleClientIds.length <= SUPABASE_IN_BATCH_SIZE) {
        return buildClientsQuery(accessibleClientIds || undefined);
      }

      const rows: ClienteBaseRow[] = [];
      for (const batch of chunkArray(accessibleClientIds)) {
        const result = await buildClientsQuery(batch);
        if (result.error) {
          return { data: null, error: result.error } as typeof result;
        }
        rows.push(...(((result.data || []) as unknown) as ClienteBaseRow[]));
      }

      return {
        data: dedupeRowsById(rows).sort((left, right) =>
          String(right.created_at || '').localeCompare(String(left.created_at || ''))
        ),
        error: null
      };
    };

    const { data: clientsData, error: clientsError } = await fetchClients();
    if (clientsError) {
      console.error('[clientes/list] Erro na query de clientes:', clientsError);
      throw clientsError;
    }

    const clientIds = ((clientsData || []) as ClienteBaseRow[]).map((row) => row.id);

    const buildSalesQuery = (clientIdsFilter?: string[]) => {
      let salesQuery = client
        .from('vendas')
        .select('cliente_id, data_venda, valor_total')
        .eq('cancelada', false)
        .not('cliente_id', 'is', null)
        .limit(5000);

      if (companyIds.length > 0) {
        salesQuery = salesQuery.in('company_id', companyIds);
      }
      if (vendedorIds.length > 0) {
        salesQuery = salesQuery.in('vendedor_id', vendedorIds);
      }
      if (clientIdsFilter) {
        salesQuery = salesQuery.in('cliente_id', clientIdsFilter);
      }

      return salesQuery;
    };

    const fetchSales = async () => {
      if (!accessibleClientIds || accessibleClientIds.length <= SUPABASE_IN_BATCH_SIZE) {
        return buildSalesQuery(accessibleClientIds || undefined);
      }

      const rows: VendaResumoRow[] = [];
      for (const batch of chunkArray(accessibleClientIds)) {
        const result = await buildSalesQuery(batch);
        if (result.error) {
          return { data: null, error: result.error } as typeof result;
        }
        rows.push(...(((result.data || []) as unknown) as VendaResumoRow[]));
      }

      return { data: rows, error: null };
    };

    const { data: salesData, error: salesError } = await fetchSales();
    if (salesError) {
      console.error('[clientes/list] Erro na query de vendas:', salesError);
      throw salesError;
    }

    const buildQuotesQuery = (clientIdsFilter?: string[]) => {
      let quotesQuery = client
        .from('quote')
        .select('client_id, created_at, created_by')
        .not('client_id', 'is', null)
        .limit(5000);

      if (clientIdsFilter) {
        quotesQuery = quotesQuery.in('client_id', clientIdsFilter);
      }
      if (vendedorIds.length > 0) {
        quotesQuery = quotesQuery.in('created_by', vendedorIds);
      }

      return quotesQuery;
    };

    const fetchQuotes = async () => {
      if (clientIds.length === 0) {
        return { data: [], error: null };
      }

      if (clientIds.length <= SUPABASE_IN_BATCH_SIZE) {
        return buildQuotesQuery(clientIds);
      }

      const rows: QuoteResumoRow[] = [];
      for (const batch of chunkArray(clientIds)) {
        const result = await buildQuotesQuery(batch);
        if (result.error) {
          return { data: null, error: result.error } as typeof result;
        }
        rows.push(...(((result.data || []) as unknown) as QuoteResumoRow[]));
      }

      return { data: rows, error: null };
    };

    const { data: quotesData, error: quotesError } = await fetchQuotes();
    if (quotesError) {
      // Tabela quote pode não existir em todos os ambientes — não bloqueia
      console.warn('[clientes/list] Erro ao buscar quotes:', quotesError.message);
    }

    let creatorCompanyMap = new Map<string, string>();
    const creatorIds = Array.from(
      new Set(
        ((quotesData || []) as QuoteResumoRow[])
          .map((row) => String(row.created_by || '').trim())
          .filter(Boolean)
      )
    );

    if (companyIds.length > 0 && creatorIds.length > 0) {
      const creatorsRows: Array<{ id?: string | null; company_id?: string | null }> = [];

      for (const batch of chunkArray(creatorIds)) {
        const { data: creators } = await client
          .from('users')
          .select('id, company_id')
          .in('id', batch)
          .limit(5000);

        creatorsRows.push(...(creators || []));
      }

      creatorCompanyMap = new Map(
        creatorsRows.map((row: { id?: string | null; company_id?: string | null }) => [
          String(row?.id || '').trim(),
          String(row?.company_id || '').trim()
        ])
      );
    }

    const salesByClient = new Map<string, { total: number; lastSale: string | null; count: number }>();
    ((salesData || []) as VendaResumoRow[]).forEach((row) => {
      const clientId = String(row.cliente_id || '').trim();
      if (!clientId) return;

      const current = salesByClient.get(clientId) || {
        total: 0,
        lastSale: null,
        count: 0
      };

      const saleDate = String(row.data_venda || '').trim() || null;
      const total = Number(row.valor_total || 0);

      salesByClient.set(clientId, {
        total: current.total + total,
        count: current.count + 1,
        lastSale: saleDate && (!current.lastSale || saleDate > current.lastSale) ? saleDate : current.lastSale
      });
    });

    const quotesByClient = new Map<string, { total: number; lastQuote: string | null }>();
    ((quotesData || []) as QuoteResumoRow[])
      .filter((row) => {
        if (companyIds.length === 0) return true;
        const creatorCompany = creatorCompanyMap.get(String(row.created_by || '').trim()) || '';
        return creatorCompany ? companyIds.includes(creatorCompany) : true;
      })
      .forEach((row) => {
        const clientId = String(row.client_id || '').trim();
        if (!clientId) return;

        const current = quotesByClient.get(clientId) || {
          total: 0,
          lastQuote: null
        };

        const quoteDate = String(row.created_at || '').trim() || null;
        quotesByClient.set(clientId, {
          total: current.total + 1,
          lastQuote:
            quoteDate && (!current.lastQuote || quoteDate > current.lastQuote)
              ? quoteDate
              : current.lastQuote
        });
      });

    const items = ((clientsData || []) as ClienteBaseRow[])
      .map((row) => {
        const sales = salesByClient.get(row.id);
        const quotes = quotesByClient.get(row.id);
        const ultimaCompra = sales?.lastSale || null;
        const tags = Array.isArray(row.tags) ? row.tags.filter(Boolean) : [];
        const contato = [row.whatsapp, row.telefone, row.email].filter(Boolean).join(' | ');
        const cidadeUf = [row.cidade, row.estado].filter(Boolean).join('/');

        return {
          id: row.id,
          nome: String(row.nome || 'Cliente sem nome'),
          cpf: row.cpf,
          documento: formatDocumentoDisplay(row.cpf),
          email: row.email,
          telefone: row.telefone,
          whatsapp: row.whatsapp,
          contato,
          data_nascimento: row.nascimento,
          cidade: row.cidade,
          estado: row.estado,
          cidade_uf: cidadeUf,
          classificacao: row.classificacao,
          tipo_pessoa: row.tipo_pessoa || (String(row.cpf || '').replace(/\D/g, '').length > 11 ? 'PJ' : 'PF'),
          tipo_cliente: row.tipo_cliente || 'passageiro',
          tags,
          tags_text: tags.join(', '),
          status: deriveClienteStatus(row, ultimaCompra),
          ultima_compra: ultimaCompra,
          total_gasto: Number(sales?.total || 0),
          total_viagens: Number(sales?.count || 0),
          total_orcamentos: Number(quotes?.total || 0),
          aniversario_hoje: isBirthdayToday(row.nascimento),
          ativo: row.ativo !== false,
          created_at: row.created_at
        };
      })
      .filter((item) =>
        matchesClienteBusca(item, busca, [item.documento, item.contato, item.cidade_uf])
      )
      .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));

    const paginatedItems = all
      ? items
      : items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    return json({
      page,
      pageSize,
      total: items.length,
      items: paginatedItems
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar clientes.');
  }
}
