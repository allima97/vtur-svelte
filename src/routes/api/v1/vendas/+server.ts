import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  normalizeText,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { todayISODateLocal } from '$lib/date';
import { DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags
} from '$lib/server/readModelCache';

const SUPABASE_IN_BATCH_SIZE = 100;

type VendaRow = {
  id: string;
  numero_venda: string | null;
  cliente_id: string | null;
  company_id: string | null;
  vendedor_id: string | null;
  data_venda: string | null;
  data_embarque: string | null;
  data_final: string | null;
  valor_total: number | null;
  cancelada: boolean | null;
  clientes?: { nome?: string | null } | null;
  recibos?: Array<{ valor_taxas?: number | null; tipo_pacote?: string | null; numero_recibo?: string | null; numero_reserva?: string | null }> | null;
};

function deriveStatus(row: VendaRow) {
  if (row.cancelada) return 'cancelada';
  const todayIso = todayISODateLocal();
  if (row.data_final && row.data_final < todayIso) return 'concluida';
  if (row.data_embarque && row.data_embarque >= todayIso) return 'confirmada';
  return 'pendente';
}

function deriveTipo(row: VendaRow) {
  const first = Array.isArray(row.recibos) ? row.recibos[0] : null;
  const ref = normalizeText(first?.tipo_pacote || '');
  if (ref.includes('seguro') || ref.includes('servico')) return 'servico';
  if (ref.includes('hotel') || ref.includes('resort')) return 'hotel';
  if (ref.includes('passagem') || ref.includes('aereo') || ref.includes('transporte')) return 'passagem';
  return 'pacote';
}

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

    if (!scope.isAdmin && !scope.isMaster) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 1, 'Sem acesso a Vendas.');
    }

    const searchParams = event.url.searchParams;
    const clienteId = String(searchParams.get('cliente_id') || '').trim();
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('company_id') || searchParams.get('empresa_id'));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, searchParams.get('vendedor_ids') || searchParams.get('vendedor_id'));
    const shouldApplySellerScope = !scope.isGestor && !scope.isMaster;
    const accessibleClientIds =
      !scope.isAdmin && !scope.isMaster && !scope.isGestor
        ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds })
        : [];

    const { items } = await getCachedReadModel<{ items: any[] }>({
      key: buildReadModelCacheKey('vendas:legacy-list', {
        clienteId,
        companyIds,
        vendedorIds,
        shouldApplySellerScope,
        accessibleClientCount: accessibleClientIds.length,
        userId: scope.userId
      }),
      tags: [
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.clients,
        READ_MODEL_TAGS.catalog,
        ...scopeCacheTags({ companyIds, vendedorIds, userId: scope.userId })
      ],
      ttlMs: 20_000,
      staleTtlMs: 90_000,
      loader: async () => {
        const fetchRows = async (clientIdsFilter?: string[]) => {
          let query = client
            .from('vendas')
            .select(`
              id,
              numero_venda,
              cliente_id,
              company_id,
              vendedor_id,
              data_venda,
              data_embarque,
              data_final,
              valor_total,
              cancelada,
              clientes (nome),
              recibos:vendas_recibos (valor_taxas, tipo_pacote, numero_recibo, numero_reserva)
            `)
            .order('data_venda', { ascending: false })
            .limit(5000);

          if (companyIds.length > 0) query = query.in('company_id', companyIds);
          if (shouldApplySellerScope && vendedorIds.length > 0) query = query.in('vendedor_id', vendedorIds);
          if (clienteId) query = query.eq('cliente_id', clienteId);
          else if (!scope.isAdmin && clientIdsFilter && clientIdsFilter.length > 0) query = query.in('cliente_id', clientIdsFilter);

          const { data, error } = await query;
          if (error) throw error;
          return (data || []) as VendaRow[];
        };

        let data: VendaRow[] = [];
        if (!clienteId && !scope.isAdmin && accessibleClientIds.length > SUPABASE_IN_BATCH_SIZE) {
          for (const batch of chunkArray(accessibleClientIds)) {
            data.push(...(await fetchRows(batch)));
          }
          data = dedupeRowsById(data);
        } else {
          data = await fetchRows(!clienteId && !scope.isAdmin && accessibleClientIds.length > 0 ? accessibleClientIds : undefined);
        }

        const mappedItems = data.map((row) => ({
          id: row.id,
          codigo: String(row.numero_venda || '').trim() || `VD-${row.id.slice(0, 8).toUpperCase()}`,
          cliente_id: row.cliente_id,
          cliente: { nome: String(row.clientes?.nome || 'Cliente sem nome') },
          cliente_nome: String(row.clientes?.nome || 'Cliente sem nome'),
          valor_total: Number(row.valor_total || 0),
          data_venda: row.data_venda,
          data_embarque: row.data_embarque,
          status: deriveStatus(row),
          tipo: deriveTipo(row),
          comissao: (Array.isArray(row.recibos) ? row.recibos : []).reduce((sum, recibo) => sum + Number(recibo?.valor_taxas || 0), 0)
        }));

        return { items: mappedItems };
      }
    });

    return json(
      { items, total: items.length },
      { headers: DYNAMIC_READ_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar vendas.');
  }
}
