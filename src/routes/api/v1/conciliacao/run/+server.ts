import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

// Reconciliação automática: tenta vincular registros de conciliação pendentes a vendas/recibos
async function reconcilePendentes(client: any, companyId: string, limit: number, conciliacaoReciboId?: string | null) {
  let query = client
    .from('conciliacao_recibos')
    .select('id, documento, movimento_data, descricao, status, valor_lancamentos, valor_calculada_loja')
    .eq('company_id', companyId)
    .eq('conciliado', false)
    .limit(limit);

  if (conciliacaoReciboId && isUuid(conciliacaoReciboId)) {
    query = query.eq('id', conciliacaoReciboId);
  }

  const { data: pendentes, error: pendentesError } = await query;
  if (pendentesError) throw pendentesError;

  const rows = pendentes || [];
  let reconciliados = 0;
  let semMatch = 0;

  for (const row of rows) {
    const documento = String(row.documento || '').trim();
    if (!documento) { semMatch++; continue; }

    // Tenta encontrar recibo pelo número — filtra pela empresa via join correto
    const docUpper = documento.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const { data: recibos } = await client
      .from('vendas_recibos')
      .select('id, venda_id, numero_recibo, numero_recibo_normalizado, vendas!inner(company_id)')
      .or(`numero_recibo.eq.${documento},numero_recibo_normalizado.eq.${docUpper}`)
      .eq('vendas.company_id', companyId)
      .limit(1);

    const recibo = recibos?.[0];
    if (!recibo) { semMatch++; continue; }

    // Vincula
    const { error: updateError } = await client
      .from('conciliacao_recibos')
      .update({
        venda_id: recibo.venda_id,
        venda_recibo_id: recibo.id,
        conciliado: true,
        last_checked_at: new Date().toISOString()
      })
      .eq('id', row.id);

    if (!updateError) reconciliados++;
    else semMatch++;
  }

  return { total: rows.length, reconciliados, semMatch };
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['conciliacao'], 3, 'Sem permissão para executar conciliação.');
    }

    const body = await event.request.json().catch(() => ({}));
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;

    if (!companyId) return json({ error: 'Empresa não identificada.' }, { status: 400 });

    const limit = Math.max(1, Math.min(500, Number(body?.limit || 200)));
    const conciliacaoReciboId = String(body?.conciliacaoReciboId || '').trim() || null;

    const result = await reconcilePendentes(client, companyId, limit, conciliacaoReciboId);

    return json({ ok: true, ...result });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao executar conciliação.');
  }
}
