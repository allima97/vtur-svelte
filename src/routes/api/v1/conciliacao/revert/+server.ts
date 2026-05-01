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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function diff(a: number, b: number) {
  return round2(a - b);
}

function matches(a: number, b: number) {
  return Math.abs(a - b) <= 0.01;
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 3, 'Sem acesso à Conciliação.');
    }

    const body = await event.request.json().catch(() => null);
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId || null);
    const companyId = companyIds[0] || null;
    if (!companyId) return json({ error: 'Company invalida.' }, { status: 400 });

    const revertAll = Boolean(body?.revertAll);
    const limit = Math.max(1, Math.min(500, Number(body?.limit || 200)));
    const ids = Array.isArray(body?.changeIds)
      ? body.changeIds
          .map((v: unknown) => String(v || '').trim())
          .filter((v: string) => isUuid(v))
      : [];

    if (!revertAll && ids.length === 0) {
      return json({ error: 'Nenhuma alteracao selecionada.' }, { status: 400 });
    }

    let targetReciboIds: string[] = [];
    let changeIdsParaReverter: string[] = [];

    if (revertAll) {
      const { data, error } = await client
        .from('conciliacao_recibo_changes')
        .select('id, venda_recibo_id')
        .eq('company_id', companyId)
        .is('reverted_at', null)
        .limit(limit);
      if (error) throw error;
      const rows = data || [];
      targetReciboIds = Array.from(new Set(rows.map((r: any) => String(r?.venda_recibo_id || '')).filter(Boolean)));
      changeIdsParaReverter = rows.map((r: any) => String(r?.id || '')).filter(Boolean);
    } else {
      const { data, error } = await client
        .from('conciliacao_recibo_changes')
        .select('id, venda_recibo_id')
        .in('id', ids.slice(0, 500))
        .eq('company_id', companyId)
        .is('reverted_at', null);
      if (error) throw error;
      const rows = data || [];
      targetReciboIds = Array.from(new Set(rows.map((r: any) => String(r?.venda_recibo_id || '')).filter(Boolean)));
      // Somente os IDs confirmados pelo banco (company_id validado acima)
      changeIdsParaReverter = rows.map((r: any) => String(r?.id || '')).filter(Boolean);
    }

    if (targetReciboIds.length === 0) {
      return json({ ok: true, attempted: 0, reverted: 0, errored: 0, total: 0 });
    }

    // Busca detalhes das alterações para agrupar os changeIds por recibo
    const { data: pendingChanges, error: pendingErr } = await client
      .from('conciliacao_recibo_changes')
      .select('id, venda_recibo_id, changed_at')
      .eq('company_id', companyId)
      .in('id', changeIdsParaReverter)
      .is('reverted_at', null)
      .order('changed_at', { ascending: true })
      .limit(2000);
    if (pendingErr) throw pendingErr;

    // Agrupa changeIds por recibo (apenas para contagem e agrupamento do audit trail)
    const changesByRecibo = new Map<string, { changeIds: string[] }>();
    (pendingChanges || []).forEach((row: any) => {
      const reciboId = String(row?.venda_recibo_id || '').trim();
      if (!reciboId) return;
      const bucket = changesByRecibo.get(reciboId) || { changeIds: [] };
      bucket.changeIds.push(String(row.id));
      changesByRecibo.set(reciboId, bucket);
    });

    let attempted = 0;
    let reverted = 0;
    let errored = 0;
    const nowIso = new Date().toISOString();

    // Os recibos originais (vendas_recibos) NÃO são mais alterados pela conciliação.
    // O revert apenas marca o audit trail como revertido — o estado do recibo original
    // nunca foi modificado, portanto nada precisa ser restaurado nele.
    for (const [, meta] of changesByRecibo.entries()) {
      attempted += 1;

      // Marca como revertido os registros de audit desta série
      const { error: revErr } = await client
        .from('conciliacao_recibo_changes')
        .update({
          reverted_at: nowIso,
          reverted_by: user.id,
          revert_reason: 'manual'
        })
        .eq('company_id', companyId)
        .in('id', meta.changeIds);

      if (revErr) {
        errored += 1;
        continue;
      }

      reverted += 1;
    }

    return json({ ok: true, attempted, reverted, errored, total: changesByRecibo.size });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao reverter alteracoes.');
  }
}
