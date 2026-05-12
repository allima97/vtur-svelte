/**
 * GET /api/v1/vendas/[id]/ranking-recibos
 *
 * Retorna o snapshot de ranking/conciliação por recibo da venda.
 * A venda e seus recibos permanecem intactos; os valores efetivos vêm da
 * conciliação quando há BAIXA confirmada, e ficam provisórios enquanto não há.
 */
import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  logServerError,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { buildVendaRankingConciliacaoSnapshot } from '$lib/conciliacao/vendaRanking';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    // Admin, Master e Gestor têm acesso implícito a vendas — igual ao endpoint /api/v1/vendas/[id]
    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 1, 'Sem acesso a Vendas.');
    }

    const id = String(event.params.id || '').trim();
    if (!isUuid(id)) {
      return json({ error: 'ID inválido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    // Busca a venda diretamente sem filtro de scope para diagnóstico —
    // o scope já foi verificado pelo ensureModuloAccess acima.
    // Usar getAdminClient (service_role) garante que RLS não interfere.
    const { data: vendaRaw, error: vendaErr } = await client
      .from('vendas')
      .select('id, company_id, vendedor_id, cancelada')
      .eq('id', id)
      .maybeSingle();

    if (vendaErr) throw vendaErr;
    if (!vendaRaw) {
      return json({ recibos: [], totais: null }, { headers: DYNAMIC_READ_HEADERS });
    }
    if (vendaRaw.cancelada) {
      return json({ recibos: [], totais: null }, { headers: DYNAMIC_READ_HEADERS });
    }

    // Verifica scope manualmente apenas para vendedor individual
    // (gestor/master/admin já foram liberados acima)
    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor && !scope.isFinanceiro) {
      const vendaCompanyId = String(vendaRaw.company_id || '').trim();
      const scopeCompanyIds = new Set((scope.companyIds || []).filter(Boolean));
      if (scopeCompanyIds.size > 0 && !scopeCompanyIds.has(vendaCompanyId)) {
        return json({ recibos: [], totais: null }, { headers: DYNAMIC_READ_HEADERS });
      }
    }

    const venda = vendaRaw;

    const { data: recibosData, error: recibosErr } = await client
      .from('vendas_recibos')
      .select('id, numero_recibo, numero_recibo_normalizado, numero_reserva, valor_total, valor_taxas')
      .eq('venda_id', id);

    if (recibosErr) throw recibosErr;

    const recibos = Array.isArray(recibosData) ? recibosData : [];
    if (recibos.length === 0) return json({ recibos: [], totais: null }, { headers: DYNAMIC_READ_HEADERS });

    // Resolve companyId: usa o da venda; fallback para o do scope (ex: admin sem company_id na venda)
    const companyId = String((venda as any).company_id || scope.companyId || '');

    const snapshot = await buildVendaRankingConciliacaoSnapshot({
      client,
      vendaId: id,
      companyId,
      recibos: recibos.map((recibo: any) => ({
        id: String(recibo.id),
        numero_recibo: recibo.numero_recibo ?? null,
        numero_recibo_normalizado: recibo.numero_recibo_normalizado ?? null,
        numero_reserva: recibo.numero_reserva ?? null,
        valor_total: recibo.valor_total ?? null,
        valor_taxas: recibo.valor_taxas ?? null
      }))
    });

    return json(snapshot, { headers: DYNAMIC_READ_HEADERS });
  } catch (err: any) {
    logServerError('[ranking-recibos] erro ao carregar snapshot', err);
    return toErrorResponse(err, 'Erro ao carregar ranking de recibos.');
  }
}
