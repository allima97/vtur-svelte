import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  logServerError,
  normalizeText,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse,
  getMonthRange,
  toISODateLocal
} from '$lib/server/v1';
import { addDaysISODate, addMonthsISODate, monthRangeFromKey, parseISODateLocal, todayISODateLocal } from '$lib/date';
import { DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags
} from '$lib/server/readModelCache';

type OrcamentoRow = {
  id: string;
  created_at: string | null;
  status: string | null;
  status_negociacao: string | null;
  total: number | null;
  currency: string | null;
  client_id: string | null;
  created_by: string | null;
  last_interaction_at?: string | null;
  last_interaction_notes?: string | null;
  cliente?: { id?: string | null; nome?: string | null; cpf?: string | null; email?: string | null } | null;
};

type OrcamentoItemRow = {
  id?: string | null;
  quote_id?: string | null;
  title?: string | null;
  product_name?: string | null;
  item_type?: string | null;
  total_amount?: number | null;
  order_index?: number | null;
  city_name?: string | null;
};

const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function dedupeOrcamentos(rows: OrcamentoRow[]) {
  const map = new Map<string, OrcamentoRow>();
  rows.forEach((row) => {
    const id = String(row?.id || '').trim();
    if (id && !map.has(id)) map.set(id, row);
  });
  return Array.from(map.values()).sort((left, right) =>
    String(right.created_at || '').localeCompare(String(left.created_at || ''))
  );
}

function addDays(isoDate: string | null, days: number) {
  return isoDate ? addDaysISODate(isoDate, days) : null;
}

function deriveStatus(row: OrcamentoRow): 'novo' | 'pendente' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado' | 'fechado' {
  const status = normalizeText(row.status_negociacao || row.status);

  if (status.includes('fech')) return 'fechado';
  if (status.includes('aprov')) return 'aprovado';
  if (status.includes('rejeit')) return 'rejeitado';
  if (status.includes('expir')) return 'expirado';
  if (status.includes('enviado') || status.includes('confirm')) return 'enviado';
  if (status.includes('novo')) return 'novo';

  return 'pendente';
}

function getPeriodoFilter(periodo: string | null): { from?: string; to?: string } | null {
  if (!periodo) return null;

  const hojeStr = todayISODateLocal();
  const hoje = parseISODateLocal(hojeStr) || new Date();

  switch (periodo) {
    case 'hoje': {
      return { from: hojeStr, to: hojeStr };
    }
    case 'semana': {
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      return { from: toISODateLocal(inicioSemana), to: hojeStr };
    }
    case 'mes': {
      const { inicio, fim } = monthRangeFromKey(hojeStr.slice(0, 7)) || getMonthRange(hoje);
      return { from: inicio, to: fim };
    }
    case 'mes_passado': {
      const monthStart = `${hojeStr.slice(0, 7)}-01`;
      const mesPassado = addMonthsISODate(monthStart, -1).slice(0, 7);
      const { inicio, fim } = monthRangeFromKey(mesPassado) || getMonthRange(hoje);
      return { from: inicio, to: fim };
    }
    default:
      return null;
  }
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Orcamentos'], 1, 'Sem acesso a Orcamentos.');
    }

    const searchParams = event.url.searchParams;
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('company_id'));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, searchParams.get('vendedor_ids'));
    const clientIds = await resolveAccessibleClientIds(client, { companyIds, vendedorIds });
    
    const statusFilter = searchParams.get('status');
    const periodoFilter = getPeriodoFilter(searchParams.get('periodo'));
    const shouldFilterByClientIds = vendedorIds.length === 0 && companyIds.length > 0;

    if (shouldFilterByClientIds && clientIds.length === 0) {
      return json([], { headers: DYNAMIC_READ_HEADERS });
    }
    const listCacheParts = {
      companyIds,
      vendedorIds,
      userId: shouldFilterByClientIds ? user.id : null,
      clientScopeCount: shouldFilterByClientIds ? clientIds.length : 0,
      periodo: searchParams.get('periodo') || null
    };
    const listCacheTags = [
      READ_MODEL_TAGS.quote,
      READ_MODEL_TAGS.clients,
      READ_MODEL_TAGS.users,
      READ_MODEL_TAGS.catalog,
      ...scopeCacheTags({ companyIds, vendedorIds, userId: user.id })
    ];

    const joinedSelect = `
        id,
        created_at,
        status,
        status_negociacao,
        total,
        currency,
        client_id,
        created_by,
        last_interaction_at,
        last_interaction_notes,
        cliente:client_id (id, nome, cpf, email)
      `;
    const fallbackSelect =
      'id, created_at, status, status_negociacao, total, currency, client_id, created_by, last_interaction_at, last_interaction_notes';

    const buildQuoteQuery = (selectClause: string, clientIdsFilter?: string[]) => {
      let query = client
        .from('quote')
        .select(selectClause)
        .order('created_at', { ascending: false })
        .limit(500);

      if (vendedorIds.length > 0) {
        query = query.in('created_by', vendedorIds);
      } else if (shouldFilterByClientIds && clientIdsFilter) {
        query = query.in('client_id', clientIdsFilter);
      }

      if (periodoFilter?.from && periodoFilter?.to) {
        query = query.gte('created_at', periodoFilter.from).lte('created_at', periodoFilter.to + 'T23:59:59');
      }

      return query;
    };

    const fetchQuoteRows = async (selectClause: string) => {
      if (!shouldFilterByClientIds || clientIds.length <= SUPABASE_IN_BATCH_SIZE) {
        return buildQuoteQuery(selectClause, shouldFilterByClientIds ? clientIds : undefined);
      }

      const rows: OrcamentoRow[] = [];
      for (const batch of chunkArray(clientIds)) {
        const result = await buildQuoteQuery(selectClause, batch);
        if (result.error) {
          return { data: null, error: result.error } as typeof result;
        }
        rows.push(...(((result.data || []) as unknown) as OrcamentoRow[]));
      }

      return { data: dedupeOrcamentos(rows).slice(0, 500), error: null };
    };

    const data = await getCachedReadModel<OrcamentoRow[]>({
      key: buildReadModelCacheKey('orcamentos-list:rows', listCacheParts),
      tags: listCacheTags,
      ttlMs: 10_000,
      staleTtlMs: 45_000,
      loader: async () => {
        const queryResult = await fetchQuoteRows(joinedSelect);
        const queryError = queryResult.error;

        if (!queryError) return ((queryResult.data || []) as OrcamentoRow[]);

        logServerError('[orcamentos/list] erro na query com join; usando fallback', queryError);
        const fallback = await fetchQuoteRows(fallbackSelect);
        if (fallback.error) throw fallback.error;
        return ((fallback.data || []) as OrcamentoRow[]);
      }
    });

    const clientIdsFromData = Array.from(new Set(
      ((data || []) as OrcamentoRow[]).map((row) => String(row.client_id || '').trim()).filter(Boolean)
    ));
    const clienteMap = new Map<string, { nome: string; email: string }>();

    if (clientIdsFromData.length > 0) {
      for (const batch of chunkArray(clientIdsFromData)) {
        const { data: clientesData } = await client
          .from('clientes')
          .select('id, nome, email')
          .in('id', batch)
          .limit(500);

        (clientesData || []).forEach((c: any) => {
          clienteMap.set(String(c.id || ''), { nome: String(c.nome || 'Cliente'), email: String(c.email || '') });
        });
      }
    }

    const quoteIds = ((data || []) as OrcamentoRow[])
      .map((row) => String(row.id || '').trim())
      .filter(Boolean);

    const quoteItemsMap = new Map<string, OrcamentoItemRow[]>();

    if (quoteIds.length > 0) {
      const quoteItems = await getCachedReadModel<OrcamentoItemRow[]>({
        key: buildReadModelCacheKey('orcamentos-list:items', listCacheParts),
        tags: listCacheTags,
        ttlMs: 10_000,
        staleTtlMs: 45_000,
        loader: async () => {
          const rows: OrcamentoItemRow[] = [];

          for (const batch of chunkArray(quoteIds)) {
            const withCity = await client
              .from('quote_item')
              .select('id, quote_id, title, product_name, item_type, total_amount, order_index, city_name')
              .in('quote_id', batch)
              .order('order_index', { ascending: true })
              .limit(5000);

            if (withCity.error) {
              const fallback = await client
                .from('quote_item')
                .select('id, quote_id, title, product_name, item_type, total_amount, order_index')
                .in('quote_id', batch)
                .order('order_index', { ascending: true })
                .limit(5000);

              if (fallback.error) throw fallback.error;
              rows.push(...((fallback.data || []) as OrcamentoItemRow[]));
            } else {
              rows.push(...((withCity.data || []) as OrcamentoItemRow[]));
            }
          }

          return rows;
        }
      });

      quoteItems.forEach((item) => {
        const quoteId = String(item.quote_id || '').trim();
        if (!quoteId) return;
        const current = quoteItemsMap.get(quoteId) || [];
        current.push(item);
        quoteItemsMap.set(quoteId, current);
      });
    }

    const creatorIds = Array.from(
      new Set(
        ((data || []) as OrcamentoRow[])
          .map((row) => String(row.created_by || '').trim())
          .filter(Boolean)
      )
    );

    const creatorMap = new Map<string, { nome: string; email: string }>();

    if (creatorIds.length > 0) {
      for (const batch of chunkArray(creatorIds)) {
        const { data: creators } = await client
          .from('users')
          .select('id, nome_completo, email')
          .in('id', batch)
          .limit(500);

        (creators || []).forEach((row: { id?: string | null; nome_completo?: string | null; email?: string | null }) => {
          const id = String(row?.id || '').trim();
          if (!id) return;
          creatorMap.set(id, {
            nome: String(row?.nome_completo || 'Equipe VTUR'),
            email: String(row?.email || '')
          });
        });
      }
    }

    let items = ((data || []) as OrcamentoRow[]).map((row) => {
      const quoteItems = quoteItemsMap.get(String(row.id || '').trim()) || [];
      const firstItem = quoteItems[0] || null;
      const itensCount = quoteItems.length;
      const vendedor = creatorMap.get(String(row.created_by || '').trim());
      const status = deriveStatus(row);

      return {
        id: row.id,
        codigo: `ORC-${row.id.slice(0, 8).toUpperCase()}`,
        cliente: String(row.cliente?.nome || clienteMap.get(String(row.client_id || ''))?.nome || 'Cliente sem nome'),
        cliente_id: String(row.client_id || ''),
        cliente_email: String(row.cliente?.email || clienteMap.get(String(row.client_id || ''))?.email || ''),
        destino: String(
          firstItem?.city_name || firstItem?.product_name || firstItem?.title || 'Orçamento sem itens'
        ),
        data_criacao: row.created_at?.slice(0, 10) || null,
        data_validade: addDays(row.created_at, 30),
        valor_total: Number(row.total || 0),
        status: status,
        status_negociacao: row.status_negociacao || row.status,
        vendedor: vendedor?.nome || 'Equipe VTUR',
        vendedor_id: String(row.created_by || ''),
        origem: 'manual',
        quantidade_itens: itensCount,
        currency: row.currency || 'BRL',
        last_interaction_at: row.last_interaction_at || null,
        last_interaction_notes: row.last_interaction_notes || null
      };
    });

    if (statusFilter) {
      items = items.filter(item => item.status === statusFilter);
    }

    return json(items, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar orcamentos.');
  }
}
