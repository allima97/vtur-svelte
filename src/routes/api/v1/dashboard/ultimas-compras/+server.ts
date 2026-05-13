import { json } from '@sveltejs/kit';
import {
  fetchRankingVendedoresByCompanyIds,
  getAdminClient,
  hasModuloAccess,
  parseUuidList,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import {
  fetchSalesReportRows,
  getVendaClienteNome,
  getVendaDestino,
  getVendaVendedorNome,
  type ReportVendaRow
} from '$lib/server/relatorios';
import { monthRangeFromKey, todayISODateLocal } from '$lib/date';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import { cleanStringSet, uniqueCleanStrings } from '$lib/utils/array';
import { toFiniteNumber as toNum } from '$lib/utils/values';

const NO_MATCH_USER_ID = '00000000-0000-0000-0000-000000000000';

type ClienteExtraRow = {
  id: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  nascimento: string | null;
};

type VendedorAggregate = {
  vendedor_id: string;
  vendedor_nome: string;
  valor: number;
  quantidade: number;
};

type ClienteAggregate = {
  cliente_id: string | null;
  cliente_nome: string;
  data_saida: string | null;
  destino: string;
  valor: number;
  quantidade: number;
};

function getMonthRangeFromSearch(value?: string | null) {
  const raw = String(value || '').trim();
  const month = /^\d{4}-\d{2}$/.test(raw) ? raw : todayISODateLocal().slice(0, 7);
  return monthRangeFromKey(month) || { inicio: `${month}-01`, fim: todayISODateLocal() };
}

function rowValue(row: ReportVendaRow) {
  const recibos = Array.isArray(row.recibos) ? row.recibos : [];
  const recibosTotal = recibos.reduce((sum, recibo) => sum + toNum(recibo?.valor_total), 0);
  return recibosTotal || toNum(row.valor_total_pago) || toNum(row.valor_total) || toNum(row.valor_total_bruto);
}

function rowPurchaseDate(row: ReportVendaRow) {
  const recibos = Array.isArray(row.recibos) ? row.recibos : [];
  return (
    recibos
      .map((recibo) => String(recibo?.data_venda || '').trim())
      .filter(Boolean)
      .sort()
      .at(-1) ||
    String(row.data_venda || '').trim() ||
    ''
  );
}

function normalizeLimit(value?: string | null, fallback = 5, max = 100) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(parsed)));
}

function normalizeSale(row: ReportVendaRow, clienteExtra: Map<string, ClienteExtraRow>) {
  const clienteId = String(row.cliente_id || '').trim();
  const extra = clienteExtra.get(clienteId);
  return {
    id: row.id,
    numero_venda: row.numero_venda || null,
    cliente_id: clienteId || null,
    cliente_nome: getVendaClienteNome(row),
    cliente_email: String(extra?.email || row.clientes?.email || '').trim() || null,
    cliente_telefone: String(extra?.whatsapp || extra?.telefone || '').trim() || null,
    cliente_whatsapp: String(extra?.whatsapp || '').trim() || null,
    cliente_nascimento: String(extra?.nascimento || '').trim() || null,
    vendedor_id: String(row.vendedor_id || '').trim() || null,
    vendedor_nome: getVendaVendedorNome(row),
    company_id: String(row.company_id || '').trim() || null,
    data_compra: rowPurchaseDate(row) || row.data_venda || null,
    data_saida: row.data_embarque || null,
    destino: getVendaDestino(row),
    valor: rowValue(row)
  };
}

async function resolveDashboardSalesScope(client: ReturnType<typeof getAdminClient>, scope: Awaited<ReturnType<typeof resolveUserScope>>, params: URLSearchParams) {
  const requestedCompanyId = params.get('company_id') || params.get('empresa_id');
  const requestedVendedorRaw = params.get('vendedor_ids') || params.get('vendedor_id');
  const hasRequestedVendedorFilter = String(requestedVendedorRaw || '').trim().length > 0;
  const requestedVendedorIds = parseUuidList(requestedVendedorRaw);
  const tipoNome = String(scope.tipoNome || '').toUpperCase();
  const isAdminByType = tipoNome.includes('ADMIN');
  const isFinanceiroByType = tipoNome.includes('FINANCEIRO');
  const isGestorByType = tipoNome.includes('GESTOR');
  const isMasterByType = tipoNome.includes('MASTER');

  let companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
  if (isGestorByType && scope.companyId) companyIds = [scope.companyId];

  if (isAdminByType) {
    return { companyIds, vendedorIds: requestedVendedorIds };
  }

  if (isMasterByType || isGestorByType || isFinanceiroByType) {
    const allowedRows = await fetchRankingVendedoresByCompanyIds(client, companyIds);
    const allowedIds = uniqueCleanStrings(allowedRows.map((row) => row?.id));
    const allowedIdSet = cleanStringSet(allowedIds);
    if (hasRequestedVendedorFilter) {
      const filtered = requestedVendedorIds.filter((id) => allowedIdSet.has(id));
      return { companyIds, vendedorIds: filtered.length > 0 ? filtered : [NO_MATCH_USER_ID] };
    }
    return { companyIds, vendedorIds: allowedIds };
  }

  return { companyIds, vendedorIds: [scope.userId] };
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor && !hasModuloAccess(scope, ['dashboard'], 1)) {
      return json({ error: 'Sem acesso às últimas compras.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const { searchParams } = event.url;
    const range = getMonthRangeFromSearch(searchParams.get('mes'));
    const inicio = String(searchParams.get('inicio') || range.inicio).trim();
    const fim = String(searchParams.get('fim') || range.fim).trim();
    const limit = normalizeLimit(searchParams.get('limit'), 5, 100);
    const { companyIds, vendedorIds } = await resolveDashboardSalesScope(client, scope, searchParams);

    const rows = await fetchSalesReportRows(client, {
      dataInicio: inicio,
      dataFim: fim,
      companyIds,
      vendedorIds,
      filterByReceiptDate: true
    });

    const clienteIds = uniqueCleanStrings(rows.map((row) => row.cliente_id));
    const clienteExtra = new Map<string, ClienteExtraRow>();
    if (clienteIds.length > 0) {
      const { data, error } = await client
        .from('clientes')
        .select('id, email, telefone, whatsapp, nascimento')
        .in('id', clienteIds);
      if (error) throw error;
      for (const row of data || []) {
        clienteExtra.set(String(row.id), row as ClienteExtraRow);
      }
    }

    const sales = rows.map((row) => normalizeSale(row, clienteExtra));

    const vendedorMap = new Map<string, VendedorAggregate>();
    for (const item of sales) {
      const id = item.vendedor_id || 'sem-vendedor';
      const current = vendedorMap.get(id) || {
        vendedor_id: id,
        vendedor_nome: item.vendedor_nome || 'Vendedor não informado',
        valor: 0,
        quantidade: 0
      };
      current.valor += item.valor;
      current.quantidade += 1;
      vendedorMap.set(id, current);
    }

    const clienteMap = new Map<string, ClienteAggregate>();
    for (const item of sales) {
      const id = item.cliente_id || `sem-cliente:${item.cliente_nome}`;
      const current = clienteMap.get(id) || {
        cliente_id: item.cliente_id,
        cliente_nome: item.cliente_nome,
        data_saida: item.data_saida,
        destino: item.destino,
        valor: 0,
        quantidade: 0
      };
      current.valor += item.valor;
      current.quantidade += 1;
      if (String(item.data_saida || '') > String(current.data_saida || '')) {
        current.data_saida = item.data_saida;
        current.destino = item.destino;
      }
      clienteMap.set(id, current);
    }

    const ultimasCompras = sales
      .sort((left, right) => String(right.data_compra || '').localeCompare(String(left.data_compra || '')))
      .slice(0, limit);

    return json({
      inicio,
      fim,
      topVendedores: Array.from(vendedorMap.values()).sort((a, b) => b.valor - a.valor).slice(0, 3),
      topClientes: Array.from(clienteMap.values()).sort((a, b) => b.valor - a.valor).slice(0, 5),
      ultimasCompras,
      total: sales.length
    }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar últimas compras.');
  }
}
