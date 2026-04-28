import { json } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveScopedCompanyIds, resolveUserScope, toErrorResponse } from '$lib/server/v1';

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 1, 'Sem acesso à Conciliação.');
    }

    const body = await event.request.json().catch(() => ({}));
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId || null);
    const companyId = companyIds[0] || null;
    if (!companyId) return json({ error: 'Company invalida.' }, { status: 400 });

    const documentos = Array.isArray(body?.documentos)
      ? body.documentos.map((d: unknown) => String(d || '').trim()).filter(Boolean)
      : [];

    if (documentos.length === 0) return json({ records: {} });

    const { data, error } = await client
      .from('conciliacao_recibos')
      .select(
        'id, documento, movimento_data, ranking_vendedor_id, ranking_produto_id, venda_id, venda_recibo_id, conciliado, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_nao_comissionavel, valor_calculada_loja, valor_visao_master, valor_opfax, valor_saldo'
      )
      .eq('company_id', companyId)
      .in('documento', documentos)
      .order('movimento_data', { ascending: false })
      .limit(1000);
    if (error) throw error;

    const records: Record<string, any> = {};

    for (const row of (data || []) as any[]) {
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

    return json({ records });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao buscar registros existentes.');
  }
}

