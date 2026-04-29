import { buildConciliacaoMetrics, isConciliacaoEfetivada } from '$lib/conciliacao/business';
import { normalizeReceiptKey } from '$lib/conciliacao/receiptNormalize';

const EPS = 0.01;

type Actor = 'cron' | 'user';

type ReciboMatchRow = {
  id: string;
  venda_id: string;
  vendedor_id: string | null;
  numero_recibo: string | null;
  valor_total: number | null;
  valor_taxas: number | null;
  data_venda: string | null;
};

export type ReconcileResult = {
  checked: number;
  reconciled: number;
  updatedTaxes: number;
  stillPending: number;
  updateErrors: number;
  recalculated?: number;
  recalculatedChecked?: number;
};

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

function compactNumero(value?: string | null) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');
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

function buildReciboSearchPatterns(value?: string | null) {
  const digits = onlyDigits(value);
  const core = reciboCoreDigits(value);
  const significantCore = core ? stripLeadingZeros(core) : '';
  const prefix = extractReciboPrefix(value);
  const patterns = new Set<string>();

  if (core) patterns.add(core);
  if (significantCore && significantCore !== core) patterns.add(significantCore);
  if (prefix && core) patterns.add(`${prefix}%${core}`);
  if (prefix && significantCore) patterns.add(`${prefix}%${significantCore}`);
  if (digits && digits !== core && digits !== significantCore) patterns.add(digits);

  return Array.from(patterns).filter((item) => item.length >= 5);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function matches(a: number, b: number) {
  return Math.abs(a - b) <= EPS;
}

function diff(a: number, b: number) {
  return round2(a - b);
}

function resolveMonthDateRange(month?: string | null) {
  const raw = String(month || '').trim();
  if (!/^\d{4}-\d{2}$/.test(raw)) return null;
  const [yearRaw, monthRaw] = raw.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return {
    start: start.toISOString().slice(0, 10),
    endExclusive: end.toISOString().slice(0, 10)
  };
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const start = `${year}-${month}-01`;
  const end = new Date(year, now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

async function insertConciliacaoNumericAudit(params: {
  client: any;
  companyId: string;
  conciliacaoReciboId: string;
  vendaId?: string | null;
  vendaReciboId?: string | null;
  numeroRecibo?: string | null;
  field: string;
  oldValue?: number | null;
  newValue?: number | null;
  actor: Actor;
  actorUserId?: string | null;
}) {
  const oldValue = Number(params.oldValue || 0);
  const newValue = Number(params.newValue || 0);
  if (matches(oldValue, newValue)) return;

  try {
    await params.client.from('conciliacao_recibo_changes').insert({
      company_id: params.companyId,
      conciliacao_recibo_id: params.conciliacaoReciboId,
      venda_id: params.vendaId || null,
      venda_recibo_id: params.vendaReciboId || null,
      numero_recibo: params.numeroRecibo || null,
      field: params.field,
      old_value: oldValue,
      new_value: newValue,
      actor: params.actor,
      changed_by: params.actorUserId || null
    });
  } catch (error) {
    console.error('CONCILIACAO_NUMERIC_AUDIT_ERROR', {
      message: (error as any)?.message ?? String(error),
      field: params.field,
      conciliacao_recibo_id: params.conciliacaoReciboId,
      venda_recibo_id: params.vendaReciboId || null
    });
  }
}

async function persistExecutionLog(params: {
  client: any;
  companyId: string;
  actor: Actor;
  actorUserId?: string | null;
  status?: 'ok' | 'error';
  errorMessage?: string | null;
  result: ReconcileResult;
}) {
  try {
    await params.client.from('conciliacao_execucoes').insert({
      company_id: params.companyId,
      actor: params.actor,
      actor_user_id: params.actorUserId || null,
      checked: params.result.checked,
      reconciled: params.result.reconciled,
      updated_taxes: params.result.updatedTaxes,
      still_pending: params.result.stillPending,
      status: params.status || 'ok',
      error_message: params.errorMessage || null
    });
  } catch (error) {
    console.error('CONCILIACAO_EXECUCAO_LOG_ERROR', {
      message: (error as any)?.message ?? String(error),
      company_id: params.companyId
    });
  }
}

async function fetchReciboCandidates(params: {
  client: any;
  numero: string;
  companyId: string;
}): Promise<ReciboMatchRow[]> {
  const { client, numero, companyId } = params;
  const normalizedKey = normalizeReceiptKey(numero);
  const candidatesById = new Map<string, ReciboMatchRow>();

  const collect = (rows: any[]) => {
    for (const row of rows || []) {
      const id = String(row?.id || '').trim();
      const vendaId = String(row?.venda_id || '').trim();
      if (!id || !vendaId || !numeroReciboMatches(numero, row?.numero_recibo)) continue;
      candidatesById.set(id, {
        id,
        venda_id: vendaId,
        vendedor_id: null,
        numero_recibo: row?.numero_recibo ?? null,
        valor_total: row?.valor_total ?? null,
        valor_taxas: row?.valor_taxas ?? null,
        data_venda: row?.data_venda ?? null
      });
    }
  };

  if (normalizedKey) {
    const { data, error } = await client
      .from('vendas_recibos')
      .select('id, venda_id, numero_recibo, valor_total, valor_taxas, data_venda')
      .eq('numero_recibo_normalizado', normalizedKey)
      .limit(30);
    if (error) throw error;
    collect(data || []);
  }

  if (numero) {
    const { data, error } = await client
      .from('vendas_recibos')
      .select('id, venda_id, numero_recibo, valor_total, valor_taxas, data_venda')
      .eq('numero_recibo', numero)
      .limit(30);
    if (error) throw error;
    collect(data || []);
  }

  if (candidatesById.size === 0) {
    for (const token of buildReciboSearchPatterns(numero).slice(0, 3)) {
      const { data, error } = await client
        .from('vendas_recibos')
        .select('id, venda_id, numero_recibo, valor_total, valor_taxas, data_venda')
        .ilike('numero_recibo', `%${token}%`)
        .limit(50);
      if (error) throw error;
      collect(data || []);
    }
  }

  const candidates = Array.from(candidatesById.values()).filter((row) => row.venda_id);
  if (candidates.length === 0) return [];

  const vendaIds = Array.from(new Set(candidates.map((row) => row.venda_id)));
  const { data: vendas, error: vendasErr } = await client
    .from('vendas')
    .select('id, company_id, vendedor_id')
    .in('id', vendaIds);
  if (vendasErr) throw vendasErr;

  const vendasMap = new Map<string, { company_id: string | null; vendedor_id: string | null }>();
  for (const row of vendas || []) {
    const id = String(row?.id || '').trim();
    if (!id) continue;
    vendasMap.set(id, {
      company_id: String(row?.company_id || '').trim() || null,
      vendedor_id: String(row?.vendedor_id || '').trim() || null
    });
  }

  return candidates
    .filter((row) => vendasMap.get(row.venda_id)?.company_id === companyId)
    .map((row) => ({
      ...row,
      vendedor_id: vendasMap.get(row.venda_id)?.vendedor_id || null
    }));
}

function selectBestReciboMatch(params: {
  numero: string;
  candidates: ReciboMatchRow[];
  valorLancamento?: number | null;
  valorTaxas?: number | null;
}) {
  const { numero, candidates, valorLancamento = null, valorTaxas = null } = params;
  if (candidates.length === 0) return null;

  const reciboExato = candidates.find((item) => String(item.numero_recibo || '').trim() === numero);
  if (reciboExato) return reciboExato;

  const compativeis = candidates.filter((item) => numeroReciboMatches(numero, item.numero_recibo));
  if (compativeis.length === 0) return null;

  const porValor = compativeis.filter((item) =>
    valorLancamento == null ? true : matches(Number(item.valor_total || 0), Number(valorLancamento || 0))
  );
  const porTaxa = porValor.filter((item) =>
    valorTaxas == null ? true : matches(Number(item.valor_taxas || 0), Number(valorTaxas || 0))
  );

  return (
    (porTaxa.length === 1 ? porTaxa[0] : null) ||
    (porValor.length === 1 ? porValor[0] : null) ||
    (compativeis.length === 1 ? compativeis[0] : null)
  );
}

async function findReciboByNumero(params: {
  client: any;
  numero: string;
  companyId: string;
  valorLancamento?: number | null;
  valorTaxas?: number | null;
}) {
  const candidates = await fetchReciboCandidates({
    client: params.client,
    numero: params.numero,
    companyId: params.companyId
  });
  return selectBestReciboMatch({
    numero: params.numero,
    candidates,
    valorLancamento: params.valorLancamento ?? null,
    valorTaxas: params.valorTaxas ?? null
  });
}

async function reconcilePendentesCompany(params: {
  limit?: number;
  companyId: string;
  conciliacaoReciboId?: string | null;
  onlyCurrentMonth?: boolean;
  actor?: Actor;
  actorUserId?: string | null;
  client: any;
}): Promise<ReconcileResult> {
  const limit = Math.max(1, Math.min(500, Number(params.limit || 200)));
  const actor = params.actor || 'user';
  const actorUserId = params.actorUserId || null;
  const client = params.client;

  let query = client
    .from('conciliacao_recibos')
    .select(
      'id, company_id, documento, movimento_data, status, descricao, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_nao_comissionavel, valor_venda_real, valor_saldo, valor_calculada_loja, valor_visao_master, valor_comissao_loja, percentual_comissao_loja, faixa_comissao, is_seguro_viagem, ranking_vendedor_id, conciliado, venda_recibo_id, venda_id'
    )
    .eq('company_id', params.companyId)
    .order('movimento_data', { ascending: false });

  if (params.conciliacaoReciboId) {
    query = query.eq('id', params.conciliacaoReciboId);
  } else {
    query = query.eq('conciliado', false).limit(limit);
  }

  if (params.onlyCurrentMonth && !params.conciliacaoReciboId) {
    const { start, end } = getCurrentMonthRange();
    query = query.gte('movimento_data', start).lte('movimento_data', end);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).filter((item: any) =>
    isConciliacaoEfetivada({ status: item?.status, descricao: item?.descricao })
  );

  let checked = 0;
  let reconciled = 0;
  let updatedTaxes = 0;
  let updateErrors = 0;

  for (const row of rows) {
    checked += 1;
    const id = String(row.id);
    const documento = String(row.documento || '').trim();
    const movimentoData = String(row.movimento_data || '').trim() || null;
    const valorTaxas = Number(row.valor_taxas || 0);
    const metrics = buildConciliacaoMetrics({
      descricao: row.descricao,
      valorLancamentos: Number(row.valor_lancamentos || 0),
      valorTaxas,
      valorDescontos: Number(row.valor_descontos || 0),
      valorAbatimentos: Number(row.valor_abatimentos || 0),
      valorNaoComissionavel: Number(row.valor_nao_comissionavel || 0),
      valorSaldo: Number(row.valor_saldo || 0),
      valorCalculadaLoja: Number(row.valor_calculada_loja || 0),
      valorVisaoMaster: Number(row.valor_visao_master || 0),
      valorComissaoLoja: Number(row.valor_comissao_loja || 0),
      percentualComissaoLoja: Number(row.percentual_comissao_loja || 0)
    });
    const valorComparacao = Number(metrics.valorVendaReal || 0);

    if (!documento) {
      await client.from('conciliacao_recibos').update({ last_checked_at: new Date().toISOString() }).eq('id', id);
      continue;
    }

    let recibo: ReciboMatchRow | null = null;
    const existingReciboId = String(row.venda_recibo_id || '').trim();

    if (existingReciboId) {
      const { data: reciboRow } = await client
        .from('vendas_recibos')
        .select('id, venda_id, numero_recibo, valor_total, valor_taxas, data_venda')
        .eq('id', existingReciboId)
        .maybeSingle();

      if (reciboRow) {
        const { data: vendaRow } = await client
          .from('vendas')
          .select('id, company_id, vendedor_id')
          .eq('id', String(reciboRow.venda_id || ''))
          .maybeSingle();

        if (String(vendaRow?.company_id || '') === params.companyId) {
          recibo = {
            id: String(reciboRow.id),
            venda_id: String(reciboRow.venda_id || ''),
            vendedor_id: String(vendaRow?.vendedor_id || '').trim() || null,
            numero_recibo: reciboRow.numero_recibo ?? null,
            valor_total: reciboRow.valor_total ?? null,
            valor_taxas: reciboRow.valor_taxas ?? null,
            data_venda: reciboRow.data_venda ?? null
          };
        }
      }
    }

    if (!recibo) {
      recibo = await findReciboByNumero({
        client,
        numero: documento,
        companyId: params.companyId,
        valorLancamento: valorComparacao,
        valorTaxas
      });
    }

    if (!recibo) {
      await client.from('conciliacao_recibos').update({ last_checked_at: new Date().toISOString() }).eq('id', id);
      continue;
    }

    const sistemaTotal = Number(recibo.valor_total || 0);
    const sistemaTaxas = Number(recibo.valor_taxas || 0);
    const sistemaDataVenda = String(recibo.data_venda || '').trim() || null;
    const matchTotal = matches(valorComparacao, sistemaTotal);
    const matchTaxas = matches(valorTaxas, sistemaTaxas);
    const shouldUpdateDataVenda = Boolean(movimentoData && movimentoData !== sistemaDataVenda);

    const reciboUpdate: Record<string, any> = {};
    if (!matchTotal) reciboUpdate.valor_total = valorComparacao;
    if (!matchTaxas) reciboUpdate.valor_taxas = valorTaxas;
    if (shouldUpdateDataVenda) reciboUpdate.data_venda = movimentoData;

    if (Object.keys(reciboUpdate).length > 0) {
      const { error: upErr } = await client.from('vendas_recibos').update(reciboUpdate).eq('id', recibo.id);
      if (upErr) {
        updateErrors += 1;
      } else {
        if (!matchTaxas) updatedTaxes += 1;
        await Promise.all([
          insertConciliacaoNumericAudit({
            client,
            companyId: params.companyId,
            conciliacaoReciboId: id,
            vendaId: recibo.venda_id,
            vendaReciboId: recibo.id,
            numeroRecibo: documento,
            field: 'valor_total',
            oldValue: sistemaTotal,
            newValue: valorComparacao,
            actor,
            actorUserId
          }),
          insertConciliacaoNumericAudit({
            client,
            companyId: params.companyId,
            conciliacaoReciboId: id,
            vendaId: recibo.venda_id,
            vendaReciboId: recibo.id,
            numeroRecibo: documento,
            field: 'valor_taxas',
            oldValue: sistemaTaxas,
            newValue: valorTaxas,
            actor,
            actorUserId
          })
        ]);
      }
    }

    const rankingVendedorAtual = String(row.ranking_vendedor_id || '').trim() || null;
    const rankingVendedorResolvido = rankingVendedorAtual || recibo.vendedor_id || null;
    const updatePayload: Record<string, any> = {
      venda_id: recibo.venda_id,
      venda_recibo_id: recibo.id,
      valor_venda_real: metrics.valorVendaReal,
      valor_comissao_loja: metrics.valorComissaoLoja,
      percentual_comissao_loja: metrics.percentualComissaoLoja,
      faixa_comissao: metrics.faixaComissao,
      is_seguro_viagem: metrics.isSeguroViagem,
      sistema_valor_total: sistemaTotal,
      sistema_valor_taxas: sistemaTaxas,
      match_total: matchTotal,
      match_taxas: matchTaxas,
      diff_total: diff(valorComparacao, sistemaTotal),
      diff_taxas: diff(valorTaxas, sistemaTaxas),
      ranking_vendedor_id: rankingVendedorResolvido,
      conciliado: true,
      conciliado_em: new Date().toISOString(),
      last_checked_at: new Date().toISOString()
    };
    if (!rankingVendedorAtual && rankingVendedorResolvido) updatePayload.ranking_assigned_at = new Date().toISOString();

    const { error: conciliadoErr } = await client.from('conciliacao_recibos').update(updatePayload).eq('id', id);
    if (conciliadoErr) {
      updateErrors += 1;
      continue;
    }

    await Promise.all([
      insertConciliacaoNumericAudit({
        client,
        companyId: params.companyId,
        conciliacaoReciboId: id,
        vendaId: recibo.venda_id,
        vendaReciboId: recibo.id,
        numeroRecibo: documento,
        field: 'valor_venda_real',
        oldValue: Number(row.valor_venda_real || 0),
        newValue: Number(updatePayload.valor_venda_real || 0),
        actor,
        actorUserId
      }),
      insertConciliacaoNumericAudit({
        client,
        companyId: params.companyId,
        conciliacaoReciboId: id,
        vendaId: recibo.venda_id,
        vendaReciboId: recibo.id,
        numeroRecibo: documento,
        field: 'valor_comissao_loja',
        oldValue: Number(row.valor_comissao_loja || 0),
        newValue: Number(updatePayload.valor_comissao_loja || 0),
        actor,
        actorUserId
      }),
      insertConciliacaoNumericAudit({
        client,
        companyId: params.companyId,
        conciliacaoReciboId: id,
        vendaId: recibo.venda_id,
        vendaReciboId: recibo.id,
        numeroRecibo: documento,
        field: 'percentual_comissao_loja',
        oldValue: Number(row.percentual_comissao_loja || 0),
        newValue: Number(updatePayload.percentual_comissao_loja || 0),
        actor,
        actorUserId
      })
    ]);

    reconciled += 1;
  }

  return {
    checked,
    reconciled,
    updatedTaxes,
    stillPending: Math.max(0, (data || []).length - reconciled),
    updateErrors
  };
}

async function recalculateConciliacaoMetricsCompany(params: {
  month?: string | null;
  onlyConciliados?: boolean;
  batchSize?: number;
  companyId: string;
  actor?: Actor;
  actorUserId?: string | null;
  client: any;
}): Promise<{ scanned: number; recalculated: number; updateErrors: number }> {
  const batchSize = Math.max(50, Math.min(2000, Number(params.batchSize || 500)));
  const monthRange = resolveMonthDateRange(params.month);
  const client = params.client;
  const actor = params.actor || 'user';
  const actorUserId = params.actorUserId || null;
  const reciboCache = new Map<string, { valor_total: number | null; valor_taxas: number | null }>();
  let scanned = 0;
  let recalculated = 0;
  let updateErrors = 0;
  let offset = 0;

  while (true) {
    let query = client
      .from('conciliacao_recibos')
      .select(
        'id, documento, descricao, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_nao_comissionavel, valor_saldo, valor_calculada_loja, valor_visao_master, valor_comissao_loja, percentual_comissao_loja, faixa_comissao, is_seguro_viagem, valor_venda_real, venda_id, venda_recibo_id, sistema_valor_total, sistema_valor_taxas, match_total, match_taxas, diff_total, diff_taxas, conciliado, movimento_data'
      )
      .eq('company_id', params.companyId)
      .order('movimento_data', { ascending: false, nullsFirst: false })
      .range(offset, offset + batchSize - 1);

    if (params.onlyConciliados) query = query.eq('conciliado', true);
    if (monthRange) query = query.gte('movimento_data', monthRange.start).lt('movimento_data', monthRange.endExclusive);

    const { data, error } = await query;
    if (error) throw error;
    const page = data || [];
    if (!page.length) break;

    const reciboIdsToFetch = page
      .map((row: any) => String(row.venda_recibo_id || '').trim())
      .filter((id: string) => id && !reciboCache.has(id));

    if (reciboIdsToFetch.length > 0) {
      const { data: recibos } = await client
        .from('vendas_recibos')
        .select('id, valor_total, valor_taxas')
        .in('id', Array.from(new Set(reciboIdsToFetch)));
      (recibos || []).forEach((recibo: any) => {
        const id = String(recibo.id || '').trim();
        if (!id) return;
        reciboCache.set(id, {
          valor_total: Number(recibo.valor_total || 0),
          valor_taxas: Number(recibo.valor_taxas || 0)
        });
      });
    }

    for (const row of page) {
      scanned += 1;
      const temValorDireto =
        Number(row.valor_saldo || 0) > 0.009 ||
        Number(row.valor_calculada_loja || 0) > 0.009 ||
        Number(row.valor_visao_master || 0) > 0.009;

      const metrics = buildConciliacaoMetrics({
        descricao: row.descricao,
        valorLancamentos: Number(row.valor_lancamentos || 0),
        valorTaxas: Number(row.valor_taxas || 0),
        valorDescontos: Number(row.valor_descontos || 0),
        valorAbatimentos: Number(row.valor_abatimentos || 0),
        valorNaoComissionavel: Number(row.valor_nao_comissionavel || 0),
        valorSaldo: Number(row.valor_saldo || 0),
        valorCalculadaLoja: Number(row.valor_calculada_loja || 0),
        valorVisaoMaster: Number(row.valor_visao_master || 0),
        valorComissaoLoja: temValorDireto ? null : Number(row.valor_comissao_loja || 0),
        percentualComissaoLoja: null
      });

      const reciboId = String(row.venda_recibo_id || '').trim();
      const reciboData = reciboId ? reciboCache.get(reciboId) : null;
      const sistemaTotal = reciboData?.valor_total ?? Number(row.sistema_valor_total || 0);
      const sistemaTaxas = reciboData?.valor_taxas ?? Number(row.sistema_valor_taxas || 0);
      const newValorVendaReal = Number(metrics.valorVendaReal || 0);
      const newComissao = Number(metrics.valorComissaoLoja || 0);
      const newPercentual = Number(metrics.percentualComissaoLoja || 0);
      const newMatchTotal = matches(newValorVendaReal, sistemaTotal);
      const newMatchTaxas = matches(Number(row.valor_taxas || 0), sistemaTaxas);
      const newDiffTotal = diff(newValorVendaReal, sistemaTotal);
      const newDiffTaxas = diff(Number(row.valor_taxas || 0), sistemaTaxas);

      const needsUpdate =
        Math.abs(Number(row.valor_venda_real || 0) - newValorVendaReal) > EPS ||
        Math.abs(Number(row.valor_comissao_loja || 0) - newComissao) > EPS ||
        Math.abs(Number(row.percentual_comissao_loja || 0) - newPercentual) > EPS ||
        String(row.faixa_comissao ?? '') !== String(metrics.faixaComissao ?? '') ||
        Boolean(row.is_seguro_viagem) !== Boolean(metrics.isSeguroViagem) ||
        Boolean(row.match_total) !== newMatchTotal ||
        Boolean(row.match_taxas) !== newMatchTaxas ||
        Math.abs(Number(row.diff_total || 0) - newDiffTotal) > EPS ||
        Math.abs(Number(row.diff_taxas || 0) - newDiffTaxas) > EPS;

      if (!needsUpdate) continue;

      const { error: upErr } = await client
        .from('conciliacao_recibos')
        .update({
          valor_venda_real: metrics.valorVendaReal,
          valor_comissao_loja: metrics.valorComissaoLoja,
          percentual_comissao_loja: metrics.percentualComissaoLoja,
          faixa_comissao: metrics.faixaComissao,
          is_seguro_viagem: metrics.isSeguroViagem,
          sistema_valor_total: sistemaTotal,
          sistema_valor_taxas: sistemaTaxas,
          match_total: newMatchTotal,
          match_taxas: newMatchTaxas,
          diff_total: newDiffTotal,
          diff_taxas: newDiffTaxas,
          last_checked_at: new Date().toISOString()
        })
        .eq('id', String(row.id));

      if (upErr) {
        updateErrors += 1;
        continue;
      }

      await Promise.all([
        insertConciliacaoNumericAudit({
          client,
          companyId: params.companyId,
          conciliacaoReciboId: String(row.id || ''),
          vendaId: String(row.venda_id || '').trim() || null,
          vendaReciboId: reciboId || null,
          numeroRecibo: String(row.documento || '').trim() || null,
          field: 'valor_venda_real',
          oldValue: Number(row.valor_venda_real || 0),
          newValue: newValorVendaReal,
          actor,
          actorUserId
        }),
        insertConciliacaoNumericAudit({
          client,
          companyId: params.companyId,
          conciliacaoReciboId: String(row.id || ''),
          vendaId: String(row.venda_id || '').trim() || null,
          vendaReciboId: reciboId || null,
          numeroRecibo: String(row.documento || '').trim() || null,
          field: 'valor_comissao_loja',
          oldValue: Number(row.valor_comissao_loja || 0),
          newValue: newComissao,
          actor,
          actorUserId
        }),
        insertConciliacaoNumericAudit({
          client,
          companyId: params.companyId,
          conciliacaoReciboId: String(row.id || ''),
          vendaId: String(row.venda_id || '').trim() || null,
          vendaReciboId: reciboId || null,
          numeroRecibo: String(row.documento || '').trim() || null,
          field: 'percentual_comissao_loja',
          oldValue: Number(row.percentual_comissao_loja || 0),
          newValue: newPercentual,
          actor,
          actorUserId
        })
      ]);

      recalculated += 1;
    }

    if (page.length < batchSize) break;
    offset += page.length;
  }

  return { scanned, recalculated, updateErrors };
}

async function recalculateConciliadosCompany(params: {
  month?: string | null;
  companyId: string;
  actor?: Actor;
  actorUserId?: string | null;
  client: any;
}) {
  const result = await recalculateConciliacaoMetricsCompany({
    month: params.month,
    onlyConciliados: true,
    batchSize: 500,
    companyId: params.companyId,
    actor: params.actor,
    actorUserId: params.actorUserId,
    client: params.client
  });
  return result.recalculated;
}

export async function reconcilePendentes(params: {
  limit?: number;
  companyId: string;
  conciliacaoReciboId?: string | null;
  onlyCurrentMonth?: boolean;
  recalculateMonth?: string | null;
  recalculateAllMonth?: boolean;
  actor?: Actor;
  actorUserId?: string | null;
  client: any;
}): Promise<ReconcileResult> {
  const actor = params.actor || 'user';
  const actorUserId = params.actorUserId || null;

  try {
    if (params.recalculateAllMonth) {
      const mass = await recalculateConciliacaoMetricsCompany({
        month: params.recalculateMonth,
        onlyConciliados: false,
        batchSize: 500,
        companyId: params.companyId,
        actor,
        actorUserId,
        client: params.client
      });
      return {
        checked: 0,
        reconciled: 0,
        updatedTaxes: 0,
        stillPending: 0,
        updateErrors: mass.updateErrors,
        recalculated: mass.recalculated,
        recalculatedChecked: mass.scanned
      };
    }

    const result = await reconcilePendentesCompany({
      companyId: params.companyId,
      limit: params.limit,
      conciliacaoReciboId: params.conciliacaoReciboId,
      onlyCurrentMonth: params.onlyCurrentMonth,
      actor,
      actorUserId,
      client: params.client
    });

    result.recalculated = params.conciliacaoReciboId
      ? 0
      : await recalculateConciliadosCompany({
          month: params.recalculateMonth,
          companyId: params.companyId,
          actor,
          actorUserId,
          client: params.client
        });

    if (result.checked > 0) {
      await persistExecutionLog({
        client: params.client,
        companyId: params.companyId,
        actor,
        actorUserId,
        status: 'ok',
        result
      });
    }

    return result;
  } catch (error) {
    await persistExecutionLog({
      client: params.client,
      companyId: params.companyId,
      actor,
      actorUserId,
      status: 'error',
      errorMessage: (error as any)?.message ?? String(error),
      result: { checked: 0, reconciled: 0, updatedTaxes: 0, stillPending: 0, updateErrors: 0 }
    });
    throw error;
  }
}
