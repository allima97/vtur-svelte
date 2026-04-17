import { json } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveScopedCompanyIds, resolveUserScope, toErrorResponse } from '$lib/server/v1';
import {
  dedupeConciliacaoRows,
  isFormaNaoComissionavel,
  isRankingEligibleStatus,
  normalizeComputedFields,
  normalizeTerm
} from '../_legacy';

const DEFAULT_NAO_COMISSIONAVEIS = [
  'credito diversos',
  'credito pax',
  'credito passageiro',
  'credito de viagem',
  'credipax',
  'vale viagem',
  'carta de credito',
  'credito'
];

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['conciliacao'], 1, 'Sem acesso à Conciliação.');
    }

    const { searchParams } = event.url;
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('company_id'));
    const companyId = companyIds[0] || null;
    if (!companyId) return json([]);

    const somentePendentes = searchParams.get('pending') === '1';
    const somenteConciliados = searchParams.get('conciliado') === '1';
    const rankingPending = searchParams.get('ranking_pending') === '1';
    const month = String(searchParams.get('month') || '').trim();
    const day = String(searchParams.get('day') || '').trim();
    const rankingStatus = String(searchParams.get('ranking_status') || 'all').trim();
    const baixaRac = searchParams.get('baixa_rac') === '1';

    let query = client
      .from('conciliacao_recibos')
      .select(
        `id, company_id, documento, movimento_data, status, descricao, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_calculada_loja, valor_visao_master, valor_opfax, valor_saldo, valor_venda_real, valor_nao_comissionavel, valor_comissao_loja, percentual_comissao_loja, faixa_comissao, is_seguro_viagem, origem, conciliado, match_total, match_taxas, sistema_valor_total, sistema_valor_taxas, diff_total, diff_taxas, venda_id, venda_recibo_id, ranking_vendedor_id, ranking_produto_id, ranking_assigned_at, is_baixa_rac, ranking_vendedor:users!ranking_vendedor_id(id, nome_completo), ranking_produto:tipo_produtos!ranking_produto_id(id, nome), last_checked_at, conciliado_em, created_at, updated_at`
      )
      .eq('company_id', companyId)
      .order('movimento_data', { ascending: false })
      .order('documento', { ascending: true })
      .limit(500);

    if (somentePendentes) query = query.eq('conciliado', false);
    if (somenteConciliados) query = query.eq('conciliado', true);
    if (/^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNum] = month.split('-').map(Number);
      const inicio = `${month}-01`;
      const fim = new Date(year, monthNum, 0).toISOString().slice(0, 10);
      query = query.gte('movimento_data', inicio).lte('movimento_data', fim);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      query = query.eq('movimento_data', day);
    }

    const { data, error } = await query;
    if (error) throw error;

    let rows = dedupeConciliacaoRows(Array.isArray(data) ? data : []).map(normalizeComputedFields);

    if (rankingPending) {
      rows = rows.filter((row: any) => {
        const status = String(row?.status || '').trim().toUpperCase();
        const isEligivel = status === 'BAIXA' || status === 'OPFAX';
        const semVenda = !String(row?.venda_id || '').trim();
        const semRanking = !String(row?.ranking_vendedor_id || '').trim();
        const isBaixaRac = Boolean(row?.is_baixa_rac) || String(row?.ranking_vendedor_id || '').trim() === 'BAIXA_RAC';
        return isEligivel && semVenda && semRanking && !isBaixaRac;
      });
    }

    if (somentePendentes) {
      rows = rows.filter((row: any) => {
        const isBaixaRac = Boolean(row?.is_baixa_rac) || String(row?.ranking_vendedor_id || '').trim() === 'BAIXA_RAC';
        return !isBaixaRac;
      });
    }

    if (baixaRac) {
      rows = rows.filter((row: any) => {
        const isBaixaRac = Boolean(row?.is_baixa_rac) || String(row?.ranking_vendedor_id || '').trim() === 'BAIXA_RAC';
        return isBaixaRac;
      });
    }

    if (rankingStatus === 'pending') {
      rows = rows.filter((row: any) => {
        const vendaId = String(row?.venda_id || '').trim();
        const rankingVendedorId = String(row?.ranking_vendedor_id || '').trim();
        return isRankingEligibleStatus(row) && !vendaId && !rankingVendedorId;
      });
    } else if (rankingStatus === 'assigned') {
      rows = rows.filter((row: any) => {
        if (!isRankingEligibleStatus(row)) return false;
        const vendaId = String(row?.venda_id || '').trim();
        const rankingVendedorId = String(row?.ranking_vendedor_id || '').trim();
        const isBaixaRac = Boolean(row?.is_baixa_rac);
        if (isBaixaRac) return false;
        return !vendaId && Boolean(rankingVendedorId);
      });
    } else if (rankingStatus === 'system') {
      rows = rows.filter((row: any) => isRankingEligibleStatus(row) && Boolean(String(row?.venda_id || '').trim()));
    }

    const vendaIds = Array.from(new Set(rows.map((row: any) => String(row?.venda_id || '').trim()).filter(Boolean)));
    const flaggedVendas = new Set<string>();

    if (vendaIds.length > 0) {
      let termosNaoComissionaveis: string[] = DEFAULT_NAO_COMISSIONAVEIS;
      try {
        const { data: termosData } = await client
          .from('parametros_pagamentos_nao_comissionaveis')
          .select('termo, termo_normalizado, ativo')
          .eq('ativo', true)
          .order('termo', { ascending: true });
        const termos = (termosData || [])
          .map((row: any) => normalizeTerm(row?.termo_normalizado || row?.termo))
          .filter(Boolean);
        if (termos.length > 0) termosNaoComissionaveis = Array.from(new Set(termos));
      } catch {
      }

      const { data: pagamentos, error: pagamentosError } = await client
        .from('vendas_pagamentos')
        .select('venda_id, forma_nome, paga_comissao')
        .eq('company_id', companyId)
        .in('venda_id', vendaIds);
      if (pagamentosError) throw pagamentosError;

      (pagamentos || []).forEach((pagamento: any) => {
        const vendaId = String(pagamento?.venda_id || '').trim();
        if (!vendaId) return;
        const naoComissiona =
          pagamento?.paga_comissao === false ||
          isFormaNaoComissionavel(pagamento?.forma_nome, termosNaoComissionaveis);
        if (naoComissiona) flaggedVendas.add(vendaId);
      });
    }

    const recibosByIdForAudit = new Map<string, { valor_total: number | null; valor_taxas: number | null }>();
    const reciboIdsForAudit = Array.from(new Set(rows.map((row: any) => String(row?.venda_recibo_id || '').trim()).filter(Boolean)));

    if (reciboIdsForAudit.length > 0) {
      const { data: recibosAudit } = await client
        .from('vendas_recibos')
        .select('id, valor_total, valor_taxas')
        .in('id', reciboIdsForAudit);

      (recibosAudit || []).forEach((recibo: any) => {
        const reciboId = String(recibo?.id || '').trim();
        if (!reciboId) return;
        recibosByIdForAudit.set(reciboId, {
          valor_total: Number(recibo?.valor_total || 0),
          valor_taxas: Number(recibo?.valor_taxas || 0)
        });
      });
    }

    rows = rows.map((row: any) => {
      const vendaId = String(row?.venda_id || '').trim();
      const reciboId = String(row?.venda_recibo_id || '').trim();
      const reciboData = reciboId ? recibosByIdForAudit.get(reciboId) : null;

      let auditUpdate = {};
      if (reciboData) {
        const sistemaTotal = reciboData.valor_total ?? 0;
        const sistemaTaxas = reciboData.valor_taxas ?? 0;
        const valorVendaReal = Number(row?.valor_venda_real || 0);
        const valorTaxas = Number(row?.valor_taxas || 0);
        const matches = (a: number, b: number) => Math.abs(a - b) <= 0.01;
        const diff = (a: number, b: number) => Math.round((a - b) * 100) / 100;

        auditUpdate = {
          sistema_valor_total: sistemaTotal,
          sistema_valor_taxas: sistemaTaxas,
          match_total: matches(valorVendaReal, sistemaTotal),
          match_taxas: matches(valorTaxas, sistemaTaxas),
          diff_total: diff(valorVendaReal, sistemaTotal),
          diff_taxas: diff(valorTaxas, sistemaTaxas)
        };
      }

      return {
        ...row,
        ...auditUpdate,
        is_nao_comissionavel:
          (vendaId ? flaggedVendas.has(vendaId) : false) || Number(row?.valor_nao_comissionavel || 0) > 0
      };
    });

    return json(rows, {
      headers: {
        'Cache-Control': 'private, max-age=5',
        Vary: 'Cookie'
      }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao listar conciliacao.');
  }
}

