/**
 * POST /api/v1/conciliacao/fix-vinculos
 *
 * Corrige vínculos incorretos em conciliacao_recibos onde o numero_recibo
 * do vendas_recibos linkado não confere com o documento da conciliação.
 *
 * Isso ocorreu quando o match fuzzy (ilike) ligou um documento de conciliação
 * a um recibo de outro vendedor. A correção limpa venda_recibo_id, venda_id e
 * ranking_vendedor_id para que o próximo reconcile refaça o match corretamente.
 *
 * Apenas Admin, Master ou Gestor podem executar.
 */
import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function compactNumero(value?: string | null) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

function onlyDigits(value?: string | null) {
  return String(value ?? '').replace(/\D+/g, '');
}

function reciboCoreDigits(value?: string | null) {
  const digits = onlyDigits(value);
  if (!digits) return '';
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function stripLeadingZeros(value?: string | null) {
  const raw = String(value ?? '').replace(/^0+/, '');
  return raw || '0';
}

function extractReciboPrefix(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const prefixMatch = raw.match(/^(\d{4})\D+/);
  if (prefixMatch?.[1]) return prefixMatch[1];
  const digits = onlyDigits(raw);
  return digits.length >= 14 ? digits.slice(0, 4) : '';
}

function numeroReciboMatches(left?: string | null, right?: string | null) {
  const leftCompact = compactNumero(left);
  const rightCompact = compactNumero(right);
  if (leftCompact && rightCompact && leftCompact === rightCompact) return true;

  const leftDigits = onlyDigits(left);
  const rightDigits = onlyDigits(right);
  if (!leftDigits || !rightDigits) return false;
  if (leftDigits === rightDigits) return true;

  const leftCore = reciboCoreDigits(leftDigits);
  const rightCore = reciboCoreDigits(rightDigits);
  if (leftCore && rightCore && leftCore === rightCore) return true;

  const leftSignificantCore = stripLeadingZeros(leftCore);
  const rightSignificantCore = stripLeadingZeros(rightCore);
  if (!leftSignificantCore || !rightSignificantCore || leftSignificantCore !== rightSignificantCore) return false;

  const leftPrefix = extractReciboPrefix(left);
  const rightPrefix = extractReciboPrefix(right);
  if (leftPrefix && rightPrefix) return leftPrefix === rightPrefix;
  return true;
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 3, 'Sem permissão para corrigir vínculos.');
    }

    const body = await event.request.json().catch(() => ({}));
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;
    if (!companyId) return json({ error: 'Empresa não identificada.' }, { status: 400 });

    const dryRun = Boolean(body?.dryRun ?? true); // default: apenas diagnóstico, não corrige
    const limit = Math.min(2000, Math.max(1, Number(body?.limit || 500)));

    // Busca registros conciliados com venda_recibo_id preenchido
    const { data: rows, error: rowsErr } = await client
      .from('conciliacao_recibos')
      .select('id, documento, venda_recibo_id, ranking_vendedor_id, conciliado')
      .eq('company_id', companyId)
      .not('venda_recibo_id', 'is', null)
      .limit(limit);

    if (rowsErr) throw rowsErr;
    if (!rows || rows.length === 0) return json({ ok: true, checked: 0, incorretos: 0, corrigidos: 0, dryRun });

    // Busca todos os recibos referenciados de uma vez
    const reciboIds = [...new Set((rows).map((r: any) => String(r.venda_recibo_id)).filter(Boolean))];
    const { data: recibosData, error: recibosErr } = await client
      .from('vendas_recibos')
      .select('id, numero_recibo')
      .in('id', reciboIds);

    if (recibosErr) throw recibosErr;

    const reciboNumeroMap = new Map<string, string>();
    (recibosData || []).forEach((r: any) => {
      reciboNumeroMap.set(String(r.id), String(r.numero_recibo || ''));
    });

    // Identifica vínculos incorretos
    const incorretos: Array<{ id: string; documento: string; numero_recibo: string; ranking_vendedor_id: string | null }> = [];
    for (const row of rows) {
      const documento = String(row.documento || '').trim();
      const reciboId = String(row.venda_recibo_id || '').trim();
      const numeroRecibo = reciboNumeroMap.get(reciboId) || '';

      if (!numeroReciboMatches(documento, numeroRecibo)) {
        incorretos.push({
          id: String(row.id),
          documento,
          numero_recibo: numeroRecibo,
          ranking_vendedor_id: row.ranking_vendedor_id || null
        });
      }
    }

    if (incorretos.length === 0) {
      return json({ ok: true, checked: rows.length, incorretos: 0, corrigidos: 0, dryRun });
    }

    let corrigidos = 0;
    if (!dryRun) {
      // Corrige em lotes
      const ids = incorretos.map((r) => r.id);
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const { error: fixErr } = await client
          .from('conciliacao_recibos')
          .update({
            venda_recibo_id: null,
            venda_id: null,
            ranking_vendedor_id: null,
            conciliado: false,
            conciliado_em: null,
            last_checked_at: null
          })
          .in('id', batch)
          .eq('company_id', companyId);

        if (fixErr) {
          console.error('[fix-vinculos] erro ao corrigir lote:', fixErr);
        } else {
          corrigidos += batch.length;
        }
      }
    }

    return json({
      ok: true,
      checked: rows.length,
      incorretos: incorretos.length,
      corrigidos,
      dryRun,
      detalhes: incorretos.slice(0, 50) // primeiros 50 para diagnóstico
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao corrigir vínculos de conciliação.');
  }
}
