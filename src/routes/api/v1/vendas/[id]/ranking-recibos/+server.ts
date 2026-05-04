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
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { buildVendaRankingConciliacaoSnapshot } from '$lib/conciliacao/vendaRanking';
import { fetchSaleForScope } from '$lib/server/salesScope';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && !scope.isMaster) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 1, 'Sem acesso a Vendas.');
    }

    const id = String(event.params.id || '').trim();
    if (!isUuid(id)) {
      return json({ error: 'ID inválido.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));
    const venda = await fetchSaleForScope({ client, scope, saleId: id, companyIds, extraSelect: 'cancelada' });
    if (!venda || venda.cancelada) {
      return json({ recibos: [], totais: null });
    }

    const { data: recibosData, error: recibosErr } = await client
      .from('vendas_recibos')
      .select('id, numero_recibo, numero_recibo_normalizado, numero_reserva, valor_total, valor_taxas')
      .eq('venda_id', id);

    if (recibosErr) throw recibosErr;

    const recibos = Array.isArray(recibosData) ? recibosData : [];
    if (recibos.length === 0) return json({ recibos: [], totais: null });

    const snapshot = await buildVendaRankingConciliacaoSnapshot({
      client,
      vendaId: id,
      companyId: String((venda as any).company_id || ''),
      recibos: recibos.map((recibo: any) => ({
        id: String(recibo.id),
        numero_recibo: recibo.numero_recibo ?? null,
        numero_recibo_normalizado: recibo.numero_recibo_normalizado ?? null,
        numero_reserva: recibo.numero_reserva ?? null,
        valor_total: recibo.valor_total ?? null,
        valor_taxas: recibo.valor_taxas ?? null
      }))
    });

    return json(snapshot);
  } catch (err: any) {
    logServerError('[ranking-recibos] erro ao carregar snapshot', err);
    return toErrorResponse(err, 'Erro ao carregar ranking de recibos.');
  }
}
