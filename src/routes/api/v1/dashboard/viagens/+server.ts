import { json } from '@sveltejs/kit';
import {
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  parseUuidList,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { addDaysISODate, todayISODateLocal } from '$lib/date';
import { normalizeViagemStatus } from '$lib/viagens/status';
import { syncViagensStatus } from '$lib/server/viagensStatus';

type DashboardViagemRow = {
  id: string;
  venda_id: string | null;
  cliente_id: string | null;
  company_id: string;
  responsavel_user_id: string | null;
  destino: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
};

function isCancelledStatus(value?: string | null) {
  return normalizeViagemStatus(value) === 'cancelada';
}

function clampIntParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

async function fetchDashboardViagens(params: {
  client: any;
  companyIds: string[];
  vendedorIds: string[];
  from: string;
  to?: string;
  ongoing?: boolean;
  limit: number;
}) {
  let query = params.client
    .from('viagens')
    .select('id, venda_id, cliente_id, company_id, responsavel_user_id, destino, data_inicio, data_fim, status')
    .order('data_inicio', { ascending: true })
    .limit(params.limit);

  if (params.ongoing) {
    query = query.lte('data_inicio', params.from).gte('data_fim', params.from);
  } else {
    query = query.gte('data_inicio', params.from);
    if (params.to) query = query.lte('data_inicio', params.to);
  }

  if (params.companyIds.length > 0) query = query.in('company_id', params.companyIds);
  if (params.vendedorIds.length > 0) query = query.in('responsavel_user_id', params.vendedorIds);

  const { data, error } = await query;
  if (error) throw error;

  return ((data || []) as DashboardViagemRow[]).filter((row) => !isCancelledStatus(row.status));
}

async function hydrateViagens(client: any, rows: DashboardViagemRow[]) {
  if (rows.length === 0) return [];

  const resolvedStatuses = await syncViagensStatus(client, rows as any[]);

  const clienteIds = Array.from(new Set(rows.map((row) => row.cliente_id).filter(Boolean))) as string[];
  const clientesMap = new Map<string, { nome: string; contato: string | null }>();
  if (clienteIds.length > 0) {
    const { data } = await client
      .from('clientes')
      .select('id, nome, whatsapp, telefone')
      .in('id', clienteIds);
    for (const row of data || []) {
      const id = String((row as any)?.id || '').trim();
      if (!id) continue;
      clientesMap.set(id, {
        nome: String((row as any)?.nome || 'Cliente'),
        contato: (row as any)?.whatsapp || (row as any)?.telefone || null
      });
    }
  }

  const vendedorIds = Array.from(new Set(rows.map((row) => row.responsavel_user_id).filter(Boolean))) as string[];
  const vendedoresMap = new Map<string, string>();
  if (vendedorIds.length > 0) {
    const { data } = await client
      .from('users')
      .select('id, nome_completo')
      .in('id', vendedorIds);
    for (const row of data || []) {
      const id = String((row as any)?.id || '').trim();
      if (id) vendedoresMap.set(id, String((row as any)?.nome_completo || ''));
    }
  }

  const vendaIds = Array.from(new Set(rows.map((row) => row.venda_id).filter(Boolean))) as string[];
  const vendasMap = new Map<string, string | null>();
  if (vendaIds.length > 0) {
    const { data } = await client
      .from('vendas')
      .select('id, numero_venda')
      .in('id', vendaIds);
    for (const row of data || []) {
      const id = String((row as any)?.id || '').trim();
      if (id) vendasMap.set(id, (row as any)?.numero_venda ? String((row as any).numero_venda) : null);
    }
  }

  return rows.map((row) => {
    const cliente = row.cliente_id ? clientesMap.get(row.cliente_id) : null;
    const status = resolvedStatuses.get(row.id) || normalizeViagemStatus(row.status);

    return {
      id: row.id,
      venda_id: row.venda_id,
      numero_venda: row.venda_id ? vendasMap.get(row.venda_id) || null : null,
      data_inicio: row.data_inicio,
      data_fim: row.data_fim,
      data_embarque: row.data_inicio,
      data_final: row.data_fim,
      cliente_nome: cliente?.nome || 'Cliente',
      cliente_whatsapp: cliente?.contato || null,
      clientes: { nome: cliente?.nome || 'Cliente' },
      destino: row.destino || 'Destino',
      vendedor_nome: row.responsavel_user_id ? vendedoresMap.get(row.responsavel_user_id) || null : null,
      status
    };
  });
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const { searchParams } = event.url;
    const companyIds = resolveScopedCompanyIds(
      scope,
      searchParams.get('company_id') || searchParams.get('empresa_id')
    );
    const requestedVendedorIds = parseUuidList(
      searchParams.get('vendedor_ids') || searchParams.get('vendedor_id')
    );
    const proximasLimit = clampIntParam(searchParams.get('limit'), 100, 1, 100);
    const emAndamentoLimit = clampIntParam(searchParams.get('em_andamento_limit'), 50, 1, 50);
    const tipoNome = String(scope.tipoNome || '').toUpperCase();

    const hoje = todayISODateLocal();
    const em30dias = addDaysISODate(hoje, 30);

    let vendedorIds: string[] = [];
    if (tipoNome.includes('ADMIN')) {
      vendedorIds = requestedVendedorIds;
    } else if (tipoNome.includes('GESTOR')) {
      const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
      vendedorIds = requestedVendedorIds.length > 0
        ? requestedVendedorIds.filter((id) => equipeIds.includes(id))
        : equipeIds;
    } else if (tipoNome.includes('MASTER')) {
      vendedorIds = requestedVendedorIds;
    } else {
      vendedorIds = [scope.userId];
    }

    const [proximasRows, emAndamentoRows] = await Promise.all([
      fetchDashboardViagens({
        client,
        companyIds,
        vendedorIds,
        from: hoje,
        to: em30dias,
        limit: proximasLimit
      }),
      fetchDashboardViagens({
        client,
        companyIds,
        vendedorIds,
        from: hoje,
        ongoing: true,
        limit: emAndamentoLimit
      })
    ]);

    const [proximas, emAndamento] = await Promise.all([
      hydrateViagens(client, proximasRows),
      hydrateViagens(client, emAndamentoRows)
    ]);

    return json({
      items: proximas,
      proximas,
      em_andamento: emAndamento,
      total_proximas: proximas.length,
      total_em_andamento: emAndamento.length
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar viagens do dashboard.');
  }
}
