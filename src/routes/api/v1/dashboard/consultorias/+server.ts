import { json, type RequestEvent } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope
} from '$lib/server/v1';

const LOCAL_CACHE_TTL_MS = 300_000;
const MAX_FILTER_IDS = 300;
const cache = new Map<string, { expiresAt: number; payload: unknown }>();

function readCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

function writeCache(key: string, payload: unknown) {
  cache.set(key, { expiresAt: Date.now() + LOCAL_CACHE_TTL_MS, payload });
}

function isRpcMissing(error: any, fnName: string) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  const needle = String(fnName || '').toLowerCase();
  return (
    code === '42883' ||
    (needle && message.includes(needle) && (message.includes('does not exist') || message.includes('could not find')))
  );
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const canConsultoria =
      scope.isAdmin ||
      scope.isMaster ||
      scope.isGestor ||
      ['consultoria_online', 'consultoria', 'dashboard'].some((modulo) =>
        Object.entries(scope.permissoes).some(([key, nivel]) => {
          const normalized = String(key || '').trim().toLowerCase();
          return normalized === modulo && ['view', 'create', 'edit', 'delete', 'admin'].includes(String(nivel));
        })
      );

    if (!canConsultoria) {
      // Retorna lista vazia em vez de 403 — o dashboard apenas não mostrará o widget
      return json({ items: [] });
    }

    const mode = String(event.url.searchParams.get('mode') || 'geral').trim().toLowerCase();
    const noCache = String(event.url.searchParams.get('no_cache') || '').trim() === '1';

    if (mode !== 'geral' && mode !== 'gestor') {
      return new Response('mode invalido (use mode=geral ou mode=gestor).', { status: 400 });
    }

    const companyIds = mode === 'gestor'
      ? resolveScopedCompanyIds(scope, event.url.searchParams.get('company_id'))
      : [];
    let vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get('vendedor_ids'));

    if (scope.isMaster && mode !== 'gestor') {
      vendedorIds = [scope.userId];
    }

    const companyId = companyIds[0] || null;
    const agoraIso = new Date().toISOString();
    const limite = new Date();
    limite.setDate(limite.getDate() + 30);
    const limiteIso = limite.toISOString();

    const cacheKey = [
      'v1',
      'dashboardConsultorias',
      mode,
      user.id,
      scope.papel,
      companyId || 'all',
      vendedorIds.length === 0 ? 'all' : vendedorIds.join(',')
    ].join('|');

    if (!noCache) {
      const cached = readCache(cacheKey);
      if (cached) {
        return json(cached, {
          headers: {
            'Cache-Control': 'private, max-age=300',
            Vary: 'Cookie'
          }
        });
      }
    }

    try {
      const { data: rpcData, error: rpcErr } = await client.rpc('rpc_dashboard_consultorias', {
        p_company_id: companyId,
        p_vendedor_ids: vendedorIds.length > 0 ? vendedorIds : null,
        p_inicio: agoraIso,
        p_fim: limiteIso
      });
      if (rpcErr) throw rpcErr;

      const payload = { items: rpcData || [] };
      if (!noCache) writeCache(cacheKey, payload);
      return json(payload, {
        headers: {
          'Cache-Control': noCache ? 'no-store' : 'private, max-age=300',
          Vary: 'Cookie'
        }
      });
    } catch (rpcError: any) {
      if (!isRpcMissing(rpcError, 'rpc_dashboard_consultorias')) throw rpcError;
    }

    const clientIds = companyId
      ? await resolveAccessibleClientIds(client, {
          companyIds: [companyId],
          vendedorIds: []
        })
      : [];

    if (companyId && vendedorIds.length === 0 && clientIds.length === 0) {
      return json({ items: [] }, {
        headers: {
          'Cache-Control': noCache ? 'no-store' : 'private, max-age=300',
          Vary: 'Cookie'
        }
      });
    }

    let consultoriasQuery = client
      .from('consultorias_online')
      .select('id, cliente_nome, data_hora, lembrete, destino, orcamento_id')
      .eq('fechada', false)
      .gte('data_hora', agoraIso)
      .lte('data_hora', limiteIso)
      .order('data_hora', { ascending: true })
      .limit(50);

    if (companyId && clientIds.length > 0 && vendedorIds.length > 0) {
      const clienteSlice = clientIds.slice(0, MAX_FILTER_IDS).join(',');
      const vendedorSlice = vendedorIds.slice(0, MAX_FILTER_IDS).join(',');
      consultoriasQuery = consultoriasQuery.or(`created_by.in.(${vendedorSlice}),cliente_id.in.(${clienteSlice})`);
    } else if (clientIds.length > 0) {
      consultoriasQuery = consultoriasQuery.in('cliente_id', clientIds.slice(0, MAX_FILTER_IDS));
    } else if (vendedorIds.length > 0) {
      consultoriasQuery = consultoriasQuery.in('created_by', vendedorIds.slice(0, MAX_FILTER_IDS));
    }

    const { data, error } = await consultoriasQuery;
    if (error) throw error;

    const payload = { items: data || [] };
    if (!noCache) writeCache(cacheKey, payload);

    return json(payload, {
      headers: {
        'Cache-Control': noCache ? 'no-store' : 'private, max-age=300',
        Vary: 'Cookie'
      }
    });
  } catch (error: any) {
    console.error('[api/v1/dashboard/consultorias] erro:', error);
    return new Response(`Erro interno: ${error?.message ?? error}`, { status: 500 });
  }
}
