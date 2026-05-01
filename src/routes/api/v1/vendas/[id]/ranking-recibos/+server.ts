/**
 * GET /api/v1/vendas/[id]/ranking-recibos
 *
 * Retorna, para cada recibo da venda, o valor de ranking calculado
 * (provisório ou conciliado). A conciliação é feita recibo por recibo.
 *
 * Valor de ranking = valor_lancamentos - valor_descontos - valor_abatimentos
 * (quando há conciliação), ou valor_total do recibo como provisório.
 *
 * Retorna também informações de divergência entre o recibo da venda e
 * a conciliação (quando ambos existem).
 */
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
import { isConciliacaoEfetivada, resolveConciliacaoStatus } from '$lib/conciliacao/business';

function toNumber(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRecibo(num: string): string {
  return String(num || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

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

    // Busca a venda com seus recibos
    let vendaQuery = client
      .from('vendas')
      .select(
        'id, vendedor_id, company_id, cancelada, vendas_recibos(id, numero_recibo, numero_recibo_normalizado, valor_total, valor_taxas)'
      )
      .eq('id', id)
      .eq('cancelada', false)
      .maybeSingle();

    if (companyIds.length > 0) {
      vendaQuery = vendaQuery.in('company_id', companyIds);
    }

    const { data: venda, error: vendaErr } = await vendaQuery;
    if (vendaErr) throw vendaErr;
    if (!venda) return json({ recibos: [] });

    const recibos: any[] = Array.isArray((venda as any).vendas_recibos)
      ? (venda as any).vendas_recibos
      : [];

    if (recibos.length === 0) return json({ recibos: [] });

    // Normaliza os números de recibo para busca na conciliação
    const numerosNormalizados = recibos
      .map((r: any) => normalizeRecibo(r.numero_recibo_normalizado || r.numero_recibo))
      .filter(Boolean);

    const reciboIds = recibos.map((r: any) => String(r.id));

    // Busca conciliacao_recibos pelo número do documento (normalizado)
    const { data: concRows, error: concErr } = await client
      .from('conciliacao_recibos')
      .select(
        'id, documento, company_id, status, descricao, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_nao_comissionavel, valor_venda_real, movimento_data, ranking_vendedor_id, linked_recibo_id'
      )
      .in('documento', numerosNormalizados)
      .eq('company_id', venda.company_id);

    if (concErr && !String(concErr.code || '').includes('42P01')) throw concErr;

    // Busca rateios para os recibos da venda (via venda_recibo_id)
    const { data: rateioVendaData } = await client
      .from('vendas_recibos_rateio')
      .select('id, venda_recibo_id, conciliacao_recibo_id, vendedor_destino_id, percentual_origem, percentual_destino, ativo, observacao, vendedor_destino:users!vendedor_destino_id(id, nome_completo)')
      .in('venda_recibo_id', reciboIds);

    const rateioByVendaRecibo = new Map<string, any>();
    (rateioVendaData || []).forEach((r: any) => {
      if (r.venda_recibo_id) rateioByVendaRecibo.set(r.venda_recibo_id, r);
    });

    // Agrupa conciliacao_recibos por documento normalizado
    const concByDocumento = new Map<string, any[]>();
    for (const row of (concRows || [])) {
      const doc = normalizeRecibo(String(row.documento || ''));
      if (!concByDocumento.has(doc)) concByDocumento.set(doc, []);
      concByDocumento.get(doc)!.push(row);
    }

    // Busca rateios ligados às conciliações encontradas
    const allConcIds = (concRows || []).map((r: any) => String(r.id));
    let ratioByConciliacao = new Map<string, any>();
    if (allConcIds.length > 0) {
      const { data: rateioConcData } = await client
        .from('vendas_recibos_rateio')
        .select('id, conciliacao_recibo_id, vendedor_destino_id, percentual_origem, percentual_destino, ativo, observacao, vendedor_destino:users!vendedor_destino_id(id, nome_completo)')
        .in('conciliacao_recibo_id', allConcIds);
      (rateioConcData || []).forEach((r: any) => {
        if (r.conciliacao_recibo_id) ratioByConciliacao.set(r.conciliacao_recibo_id, r);
      });
    }

    /**
     * Dado um grupo de linhas de conciliação para um mesmo documento,
     * escolhe a linha "fonte" (BAIXA confirmada > com valor > OPFAX > a primeira).
     * Isso espelha pickConciliacaoSourceRow de source.ts.
     */
    function pickSourceRow(rows: any[]) {
      const sorted = [...rows].sort((a, b) =>
        String(a.movimento_data || '').localeCompare(String(b.movimento_data || ''))
      );
      const baixa = sorted.filter((r) =>
        isConciliacaoEfetivada({ status: r.status, descricao: r.descricao })
      );
      const valuedBaixa = baixa.find(
        (r) => toNumber(r.valor_venda_real) > 0 || toNumber(r.valor_lancamentos) > 0
      );
      if (valuedBaixa) return valuedBaixa;
      if (baixa.length > 0) return baixa[0];
      const opfax = sorted.find(
        (r) =>
          !isConciliacaoEfetivada({ status: r.status, descricao: r.descricao }) &&
          resolveConciliacaoStatus({ status: r.status, descricao: r.descricao }) === 'OPFAX' &&
          (toNumber(r.valor_venda_real) > 0 || toNumber(r.valor_lancamentos) > 0)
      );
      if (opfax) return opfax;
      return sorted[0] || null;
    }

    // Monta resultado por recibo
    const result = recibos.map((recibo: any) => {
      const numNorm = normalizeRecibo(recibo.numero_recibo_normalizado || recibo.numero_recibo);
      const concGrupo = concByDocumento.get(numNorm) || [];
      const sourceRow = concGrupo.length > 0 ? pickSourceRow(concGrupo) : null;
      const hasConciliacao = !!sourceRow;
      const concIds = concGrupo.map((r: any) => String(r.id));

      // Valor de ranking da conciliação (se existir)
      let concValorRanking: number | null = null;
      let concValorTaxas: number | null = null;
      let concStatus: string | null = null;
      let concMeta: {
        valor_lancamentos: number;
        valor_descontos: number;
        valor_abatimentos: number;
        valor_nao_comissionavel: number;
      } | null = null;

      if (sourceRow) {
        const lancamentos = toNumber(sourceRow.valor_lancamentos);
        const descontos = toNumber(sourceRow.valor_descontos);
        const abatimentos = toNumber(sourceRow.valor_abatimentos);
        const taxas = toNumber(sourceRow.valor_taxas);
        const naoComissionavel = toNumber(sourceRow.valor_nao_comissionavel);

        // Fórmula: valor_lancamentos - descontos - abatimentos
        const calculado = lancamentos > 0 ? Math.max(0, lancamentos - descontos - abatimentos) : null;
        concValorRanking = calculado;
        concValorTaxas = taxas;
        concStatus = isConciliacaoEfetivada({ status: sourceRow.status, descricao: sourceRow.descricao })
          ? 'confirmada'
          : resolveConciliacaoStatus({ status: sourceRow.status, descricao: sourceRow.descricao });

        concMeta = { valor_lancamentos: lancamentos, valor_descontos: descontos, valor_abatimentos: abatimentos, valor_nao_comissionavel: naoComissionavel };
      }

      // Valor de ranking provisório (da venda)
      const vendaValorTotal = toNumber(recibo.valor_total);
      const vendaValorTaxas = toNumber(recibo.valor_taxas);
      // Provisório: valor_total já inclui taxas
      const vendaValorRanking = vendaValorTotal;

      // Valor efetivo de ranking (conciliação prevalece)
      const valorRankingEfetivo = concValorRanking !== null ? concValorRanking : vendaValorRanking;
      const valorTaxasEfetivo = concValorTaxas !== null ? concValorTaxas : vendaValorTaxas;

      // Divergência
      const diverge = hasConciliacao && concValorRanking !== null &&
        Math.abs(concValorRanking - vendaValorTotal) > 0.5;

      // Rateio: prioriza o ligado ao conciliacao_recibo, depois ao venda_recibo
      const rateioConc = concIds.reduce((found: any, cid: string) => {
        return found || ratioByConciliacao.get(cid) || null;
      }, null);
      const rateioVenda = rateioByVendaRecibo.get(recibo.id) || null;
      const rateio = rateioConc || rateioVenda;

      return {
        recibo_id: String(recibo.id),
        numero_recibo: String(recibo.numero_recibo || ''),
        tem_conciliacao: hasConciliacao,
        provisorio: !hasConciliacao,
        conciliacao_status: concStatus,
        conciliacao_ids: concIds,
        // Valores do recibo da venda (entrada manual)
        venda_valor_total: vendaValorTotal,
        venda_valor_taxas: vendaValorTaxas,
        venda_valor_ranking: vendaValorRanking,
        // Valores da conciliação (quando existir)
        conc_valor_ranking: concValorRanking,
        conc_valor_taxas: concValorTaxas,
        conc_meta: concMeta,
        // Valor efetivo (que alimenta o ranking)
        valor_ranking_efetivo: valorRankingEfetivo,
        valor_taxas_efetivo: valorTaxasEfetivo,
        // Divergência entre venda e conciliação
        diverge,
        divergencia_valor: hasConciliacao && concValorRanking !== null
          ? concValorRanking - vendaValorTotal
          : null,
        // Rateio
        rateio: rateio ? {
          id: String(rateio.id || ''),
          ativo: Boolean(rateio.ativo),
          vendedor_destino_id: String(rateio.vendedor_destino_id || ''),
          vendedor_destino: rateio.vendedor_destino || null,
          percentual_origem: toNumber(rateio.percentual_origem),
          percentual_destino: toNumber(rateio.percentual_destino),
          observacao: rateio.observacao || null
        } : null
      };
    });

    // Totais
    const totalRankingEfetivo = result.reduce((sum: number, r: any) => sum + r.valor_ranking_efetivo, 0);
    const totalVendaRanking = result.reduce((sum: number, r: any) => sum + r.venda_valor_ranking, 0);
    const totalDivergencia = result.reduce((sum: number, r: any) => sum + (r.divergencia_valor || 0), 0);
    const algumProvisorio = result.some((r: any) => r.provisorio);
    const algumDiverge = result.some((r: any) => r.diverge);

    return json({
      recibos: result,
      totais: {
        valor_ranking_efetivo: totalRankingEfetivo,
        valor_venda_ranking: totalVendaRanking,
        divergencia_total: totalDivergencia,
        algum_provisorio: algumProvisorio,
        algum_diverge: algumDiverge
      }
    });
  } catch (err: any) {
    console.error('[ranking-recibos] GET error:', err);
    return toErrorResponse(err, 'Erro ao carregar ranking de recibos.');
  }
}
