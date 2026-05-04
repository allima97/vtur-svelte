import { json } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveScopedCompanyIds, resolveUserScope, toErrorResponse } from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

const MAX_CONCILIACAO_EXISTING_BODY_BYTES = 256 * 1024;
const MAX_EXISTING_DOCUMENTOS = 1000;
const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_CONCILIACAO_EXISTING_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isFinanceiro && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 1, 'Sem acesso à Conciliação.');
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId || null);
    const companyId = companyIds[0] || null;
    if (!companyId) return json({ error: 'Company invalida.' }, { status: 400, headers: NO_STORE_HEADERS });

    const documentos = Array.isArray(body?.documentos)
      ? body.documentos.map((d: unknown) => String(d || '').trim()).filter(Boolean).slice(0, MAX_EXISTING_DOCUMENTOS)
      : [];

    if (documentos.length === 0) return json({ records: {} }, { headers: NO_STORE_HEADERS });

    const rows: any[] = [];
    for (const batch of chunkArray(Array.from(new Set(documentos)))) {
      const { data, error } = await client
        .from('conciliacao_recibos')
        .select(
          'id, documento, numero_reserva, movimento_data, ranking_vendedor_id, ranking_produto_id, venda_id, venda_recibo_id, conciliado, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_nao_comissionavel, valor_calculada_loja, valor_visao_master, valor_opfax, valor_saldo'
        )
        .eq('company_id', companyId)
        .in('documento', batch)
        .order('movimento_data', { ascending: false })
        .limit(Math.min(1000, batch.length * 10));
      if (error) throw error;
      rows.push(...(data || []));
    }

    const records: Record<string, any> = {};

    for (const row of rows) {
      const doc = String(row?.documento || '').trim();
      if (!doc) continue;
      const existing = records[doc];

      const rowHasFinancial =
        Math.abs(Number(row?.valor_lancamentos || 0)) > 0.001 ||
        Math.abs(Number(row?.valor_taxas || 0)) > 0.001;

      if (existing) {
        if (existing.conciliado && !row?.conciliado) continue;
        const existingHasFinancial =
          Math.abs(Number(existing.valor_lancamentos || 0)) > 0.001 ||
          Math.abs(Number(existing.valor_taxas || 0)) > 0.001;
        if (existingHasFinancial && !rowHasFinancial) continue;
        if (!row?.ranking_vendedor_id && !row?.venda_recibo_id && !rowHasFinancial) continue;
      }

      records[doc] = {
        ranking_vendedor_id: row?.ranking_vendedor_id ?? null,
        ranking_produto_id: row?.ranking_produto_id ?? null,
        numero_reserva: row?.numero_reserva ?? null,
        venda_id: row?.venda_id ?? null,
        venda_recibo_id: row?.venda_recibo_id ?? null,
        conciliado: Boolean(row?.conciliado),
        valor_lancamentos: row?.valor_lancamentos ?? null,
        valor_taxas: row?.valor_taxas ?? null,
        valor_descontos: row?.valor_descontos ?? null,
        valor_abatimentos: row?.valor_abatimentos ?? null,
        valor_nao_comissionavel: row?.valor_nao_comissionavel ?? null,
        valor_calculada_loja: row?.valor_calculada_loja ?? null,
        valor_visao_master: row?.valor_visao_master ?? null,
        valor_opfax: row?.valor_opfax ?? null,
        valor_saldo: row?.valor_saldo ?? null
      };
    }

    return json(
      { records, truncated: Array.isArray(body?.documentos) && body.documentos.length > MAX_EXISTING_DOCUMENTOS },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao buscar registros existentes.');
  }
}
