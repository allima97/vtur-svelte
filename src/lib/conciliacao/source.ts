import { calcularValorVendaReal, isConciliacaoEfetivada } from '$lib/conciliacao/business';

export type EffectiveConciliacaoReceipt = {
  id: string;
  conciliacao_ids: string[];
  documento: string;
  data_venda: string;
  vendedor_id: string | null;
  produto_id: string | null;
  linked_venda_id: string | null;
  linked_recibo_id: string | null;
  valor_bruto: number | null;
  valor_taxas: number | null;
  valor_meta_override: number | null;
  valor_liquido_override: number | null;
  valor_comissao_loja: number | null;
  percentual_comissao_loja: number | null;
  faixa_comissao: string | null;
  is_seguro_viagem: boolean;
  valor_nao_comissionavel: number;
  cancelado_por_conciliacao_em: string | null;
  cancelado_por_conciliacao_observacao: string | null;
  produto: { id: string; nome: string | null } | null;
};

function toStr(value: unknown) {
  return String(value || '').trim();
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isUuid(value?: string | null) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value)
      )
  );
}

function isPositive(value: unknown) {
  return toNumber(value) > 0;
}

function toMonthKey(value?: string | null) {
  const raw = toStr(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw.slice(0, 7) : '';
}

export function pickConciliacaoSourceRow(rows: any[]) {
  const sortedRows = [...(rows || [])].sort((a, b) =>
    toStr(a?.movimento_data).localeCompare(toStr(b?.movimento_data))
  );
  const baixaRows = sortedRows.filter((row) =>
    isConciliacaoEfetivada({ status: row?.status, descricao: row?.descricao })
  );
  const confirmed = baixaRows.length > 0;
  const valuedBaixa = baixaRows.find(
    (row) => isPositive(row?.valor_venda_real) || isPositive(row?.valor_lancamentos)
  );
  const valuedOpfax = sortedRows.find(
    (row) =>
      !isConciliacaoEfetivada({ status: row?.status, descricao: row?.descricao }) &&
      toStr(row?.status).toUpperCase() === 'OPFAX' &&
      (isPositive(row?.valor_venda_real) || isPositive(row?.valor_lancamentos))
  );

  const sourceRow =
    valuedBaixa || (confirmed ? valuedOpfax : null) || (confirmed ? baixaRows[0] : null) || null;

  return {
    sortedRows,
    baixaRows,
    confirmed,
    sourceRow
  };
}

function isMissingNaoComissionavelColumn(error: any) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('valor_nao_comissionavel') &&
    (message.includes('does not exist') || message.includes('nao existe'))
  );
}

function isRateioTableMissingError(error: any) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || error || '').toLowerCase();
  return (
    code === '42P01' &&
    (message.includes('vendas_recibos_rateio') || message.includes('does not exist'))
  );
}

export function isReciboCanceladoMesmoMes(params: {
  data_venda?: string | null;
  cancelado_por_conciliacao_em?: string | null;
}) {
  const vendaMonth = toMonthKey(params.data_venda);
  const cancelMonth = toMonthKey(params.cancelado_por_conciliacao_em);
  return Boolean(vendaMonth && cancelMonth && vendaMonth === cancelMonth);
}

export function filterRecibosCanceladosMesmoMes<
  T extends {
    data_venda?: string | null;
    cancelado_por_conciliacao_em?: string | null;
  }
>(recibos: T[]) {
  return recibos.filter(
    (recibo) =>
      !isReciboCanceladoMesmoMes({
        data_venda: recibo.data_venda,
        cancelado_por_conciliacao_em: recibo.cancelado_por_conciliacao_em
      })
  );
}

export async function fetchEffectiveConciliacaoReceipts(params: {
  client: any;
  companyId: string | null;
  companyIds?: string[] | null;
  inicio: string;
  fim: string;
  vendedorIds?: string[] | null;
  excludeVendedorIds?: string[] | null;
}) {
  const { client, companyId, companyIds, inicio, fim, vendedorIds, excludeVendedorIds } = params;
  const normalizedCompanyIds = Array.from(
    new Set([companyId, ...(companyIds || [])].map((value) => toStr(value)).filter(Boolean))
  );
  if (normalizedCompanyIds.length === 0) return [] as EffectiveConciliacaoReceipt[];

  const pageSize = 1000;
  const relevantDocs = new Set<string>();

  for (let offset = 0; offset < 10000; offset += pageSize) {
    let query = client
      .from('conciliacao_recibos')
      .select('documento, valor_lancamentos, valor_venda_real, status, descricao')
      .neq('is_baixa_rac', true)
      .gte('movimento_data', inicio)
      .lte('movimento_data', fim)
      .order('movimento_data', { ascending: false })
      .range(offset, offset + pageSize - 1);

    query =
      normalizedCompanyIds.length === 1
        ? query.eq('company_id', normalizedCompanyIds[0])
        : query.in('company_id', normalizedCompanyIds);

    const { data, error } = await query;
    if (error) throw error;

    const chunk = Array.isArray(data) ? data : [];
    chunk.forEach((row: any) => {
      const temValor = toNumber(row?.valor_lancamentos) > 0 || toNumber(row?.valor_venda_real) > 0;
      const efetivado = isConciliacaoEfetivada({ status: row?.status, descricao: row?.descricao });
      if (!efetivado && !temValor) return;
      const documento = toStr(row?.documento);
      if (documento) relevantDocs.add(documento);
    });

    if (chunk.length < pageSize) break;
  }

  if (relevantDocs.size === 0) return [] as EffectiveConciliacaoReceipt[];

  const concRows: any[] = [];
  const documentos = Array.from(relevantDocs);

  for (let i = 0; i < documentos.length; i += 200) {
    const batch = documentos.slice(i, i + 200);
    for (let offset = 0; offset < 10000; offset += pageSize) {
      let query = client
        .from('conciliacao_recibos')
        .select(
          'id, documento, descricao, movimento_data, status, conciliado, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_venda_real, valor_nao_comissionavel, valor_comissao_loja, percentual_comissao_loja, faixa_comissao, is_seguro_viagem, venda_id, venda_recibo_id, ranking_vendedor_id, ranking_produto_id'
        )
        .neq('is_baixa_rac', true)
        .in('documento', batch)
        .order('movimento_data', { ascending: true })
        .range(offset, offset + pageSize - 1);

      query =
        normalizedCompanyIds.length === 1
          ? query.eq('company_id', normalizedCompanyIds[0])
          : query.in('company_id', normalizedCompanyIds);

      let { data, error } = await query;

      if (error && isMissingNaoComissionavelColumn(error)) {
        let fallbackQuery = client
          .from('conciliacao_recibos')
          .select(
            'id, documento, descricao, movimento_data, status, conciliado, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_venda_real, valor_comissao_loja, percentual_comissao_loja, faixa_comissao, is_seguro_viagem, venda_id, venda_recibo_id, ranking_vendedor_id, ranking_produto_id'
          )
          .neq('is_baixa_rac', true)
          .in('documento', batch)
          .order('movimento_data', { ascending: true })
          .range(offset, offset + pageSize - 1);

        fallbackQuery =
          normalizedCompanyIds.length === 1
            ? fallbackQuery.eq('company_id', normalizedCompanyIds[0])
            : fallbackQuery.in('company_id', normalizedCompanyIds);

        const fallback = await fallbackQuery;
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;

      const chunk = Array.isArray(data) ? data : [];
      concRows.push(...chunk);
      if (chunk.length < pageSize) break;
    }
  }

  if (concRows.length === 0) return [] as EffectiveConciliacaoReceipt[];

  const concRowIds = Array.from(new Set(concRows.map((row) => toStr(row?.id)).filter(isUuid)));
  const concRowIdsWithRateio = new Set<string>();
  if (concRowIds.length > 0) {
    for (let i = 0; i < concRowIds.length; i += 500) {
      const batch = concRowIds.slice(i, i + 500);
      const { data: rateioRows, error: rateioError } = await client
        .from('vendas_recibos_rateio')
        .select('conciliacao_recibo_id')
        .eq('ativo', true)
        .in('conciliacao_recibo_id', batch);
      if (rateioError) {
        if (!isRateioTableMissingError(rateioError)) throw rateioError;
        break;
      }
      (rateioRows || []).forEach((row: any) => {
        const id = toStr(row?.conciliacao_recibo_id);
        if (id) concRowIdsWithRateio.add(id);
      });
    }
  }

  const vendaIds = Array.from(new Set(concRows.map((row) => toStr(row?.venda_id)).filter(Boolean)));
  const reciboIds = Array.from(new Set(concRows.map((row) => toStr(row?.venda_recibo_id)).filter(Boolean)));

  const vendasMap = new Map<string, { vendedor_id: string | null }>();
  if (vendaIds.length > 0) {
    const { data, error } = await client.from('vendas').select('id, vendedor_id').in('id', vendaIds);
    if (error) throw error;
    (data || []).forEach((row: any) => {
      const id = toStr(row?.id);
      if (!id) return;
      vendasMap.set(id, { vendedor_id: toStr(row?.vendedor_id) || null });
    });
  }

  const recibosMap = new Map<string, any>();
  const reciboByNumeroMap = new Map<string, any>();
  if (reciboIds.length > 0) {
    const { data, error } = await client
      .from('vendas_recibos')
      .select('id, venda_id, produto_id, data_venda, cancelado_por_conciliacao_em, cancelado_por_conciliacao_observacao')
      .in('id', reciboIds);
    if (error) throw error;
    (data || []).forEach((row: any) => {
      const id = toStr(row?.id);
      if (!id) return;
      recibosMap.set(id, {
        produto_id: toStr(row?.produto_id) || null,
        data_venda: toStr(row?.data_venda) || null,
        cancelado_por_conciliacao_em: toStr(row?.cancelado_por_conciliacao_em) || null,
        cancelado_por_conciliacao_observacao: toStr(row?.cancelado_por_conciliacao_observacao) || null
      });
    });
  }

  if (relevantDocs.size > 0) {
    for (let i = 0; i < documentos.length; i += 200) {
      const batch = documentos.slice(i, i + 200);
      const { data, error } = await client
        .from('vendas_recibos')
        .select('id, numero_recibo, venda_id, produto_id, data_venda, cancelado_por_conciliacao_em, cancelado_por_conciliacao_observacao')
        .in('numero_recibo', batch);
      if (error) throw error;

      const vendaIdsBatch = Array.from(new Set((data || []).map((row: any) => toStr(row?.venda_id)).filter(Boolean)));
      const allowedVendaIds = new Set<string>();
      if (vendaIdsBatch.length > 0) {
        let vendasBatchQuery = client.from('vendas').select('id, company_id').in('id', vendaIdsBatch);
        vendasBatchQuery =
          normalizedCompanyIds.length === 1
            ? vendasBatchQuery.eq('company_id', normalizedCompanyIds[0])
            : vendasBatchQuery.in('company_id', normalizedCompanyIds);
        const { data: vendasBatch, error: vendasBatchErr } = await vendasBatchQuery;
        if (vendasBatchErr) throw vendasBatchErr;
        (vendasBatch || []).forEach((v: any) => {
          const id = toStr(v?.id);
          if (id) allowedVendaIds.add(id);
        });
      }

      (data || []).forEach((row: any) => {
        const numero = toStr(row?.numero_recibo);
        const id = toStr(row?.id);
        const vendaId = toStr(row?.venda_id);
        if (!numero || !id || !vendaId || !allowedVendaIds.has(vendaId)) return;
        if (!reciboByNumeroMap.has(numero)) {
          reciboByNumeroMap.set(numero, {
            id,
            venda_id: vendaId || null,
            produto_id: toStr(row?.produto_id) || null,
            data_venda: toStr(row?.data_venda) || null,
            cancelado_por_conciliacao_em: toStr(row?.cancelado_por_conciliacao_em) || null,
            cancelado_por_conciliacao_observacao: toStr(row?.cancelado_por_conciliacao_observacao) || null
          });
        }
      });
    }
  }

  const produtoIds = Array.from(
    new Set(
      concRows
        .map((row) => {
          const reciboId = toStr(row?.venda_recibo_id);
          const linkedProdutoId = reciboId ? recibosMap.get(reciboId)?.produto_id || null : null;
          return linkedProdutoId || (toStr(row?.ranking_produto_id) || null);
        })
        .filter(Boolean)
    )
  );

  let seguroFallbackId: string | null = null;
  const { data: seguroRows, error: seguroErr } = await client
    .from('tipo_produtos')
    .select('id, nome')
    .ilike('nome', '%seguro%')
    .limit(10);
  if (seguroErr) throw seguroErr;
  seguroFallbackId = Array.isArray(seguroRows) && seguroRows.length > 0 ? toStr(seguroRows[0]?.id) || null : null;
  if (seguroFallbackId) {
    produtoIds.push(seguroFallbackId);
  }

  const produtosMap = new Map<string, { id: string; nome: string | null }>();
  if (produtoIds.length > 0) {
    const { data, error } = await client.from('tipo_produtos').select('id, nome').in('id', produtoIds);
    if (error) throw error;
    (data || []).forEach((row: any) => {
      const id = toStr(row?.id);
      if (!id) return;
      produtosMap.set(id, { id, nome: row?.nome ? String(row.nome) : null });
    });
  }

  const allowedVendedores =
    vendedorIds && vendedorIds.length > 0 ? new Set(vendedorIds.map((id) => toStr(id)).filter(Boolean)) : null;
  const excludedVendedores =
    excludeVendedorIds && excludeVendedorIds.length > 0
      ? new Set(excludeVendedorIds.map((id) => toStr(id)).filter(Boolean))
      : null;

  const concRowsByDocumento = new Map<string, any[]>();
  concRows.forEach((row: any) => {
    const documento = toStr(row?.documento);
    if (!documento) return;
    const bucket = concRowsByDocumento.get(documento) || [];
    bucket.push(row);
    concRowsByDocumento.set(documento, bucket);
  });

  return Array.from(concRowsByDocumento.entries())
    .map(([documento, rows]) => {
      const { sortedRows, sourceRow } = pickConciliacaoSourceRow(rows);
      const estornoRows = sortedRows.filter((row) => toStr(row?.status).toUpperCase() === 'ESTORNO');
      const groupedConcIds = Array.from(new Set(sortedRows.map((row) => toStr(row?.id)).filter(isUuid)));

      if (!sourceRow) return null;

      const effectiveDate = toStr(sourceRow?.movimento_data);
      if (!effectiveDate || effectiveDate < inicio || effectiveDate > fim) return null;

      const linkedVendaIdFromConc = sortedRows.map((row) => toStr(row?.venda_id)).find(Boolean) || null;
      const linkedReciboIdFromConc = sortedRows.map((row) => toStr(row?.venda_recibo_id)).find(Boolean) || null;
      const fallbackRecibo = !linkedReciboIdFromConc ? reciboByNumeroMap.get(documento) || null : null;
      const linkedReciboId = linkedReciboIdFromConc || fallbackRecibo?.id || null;
      const linkedVendaId = linkedVendaIdFromConc || fallbackRecibo?.venda_id || null;
      const linkedVendedorId = linkedVendaId ? vendasMap.get(linkedVendaId)?.vendedor_id || null : null;
      const rankingVendedorId = sortedRows.map((row) => toStr(row?.ranking_vendedor_id)).find(Boolean) || null;
      const vendedorId = linkedVendedorId || rankingVendedorId || null;

      if (excludedVendedores && vendedorId && excludedVendedores.has(vendedorId)) {
        return null;
      }
      if (allowedVendedores && (!vendedorId || !allowedVendedores.has(vendedorId))) {
        return null;
      }

      const linkedProdutoId = linkedReciboId
        ? recibosMap.get(linkedReciboId)?.produto_id || fallbackRecibo?.produto_id || null
        : null;
      const linkedReciboMeta = linkedReciboId
        ? recibosMap.get(linkedReciboId) || fallbackRecibo || null
        : null;
      const canceladoMesmoMes =
        estornoRows.some((row) => toMonthKey(row?.movimento_data) === toMonthKey(effectiveDate)) ||
        isReciboCanceladoMesmoMes({
          data_venda: linkedReciboMeta?.data_venda || effectiveDate,
          cancelado_por_conciliacao_em: linkedReciboMeta?.cancelado_por_conciliacao_em || null
        });
      if (canceladoMesmoMes) return null;

      const manualProdutoId = sortedRows.map((row) => toStr(row?.ranking_produto_id)).find(Boolean) || null;
      const isSeguro = sortedRows.some((row) => Boolean(row?.is_seguro_viagem));
      const produtoId = linkedProdutoId || manualProdutoId || (isSeguro ? seguroFallbackId : null);
      const produto = produtoId ? produtosMap.get(produtoId) || null : null;

      const valorTaxas = toNumber(sourceRow?.valor_taxas);
      const valorDescontos = toNumber(sourceRow?.valor_descontos);
      const valorAbatimentos = toNumber(sourceRow?.valor_abatimentos);
      const valorNaoComissionavel = Math.max(0, toNumber(sourceRow?.valor_nao_comissionavel));
      const valorMetaCalculado = calcularValorVendaReal({
        valorLancamentos: toNumber(sourceRow?.valor_lancamentos),
        valorTaxas,
        valorDescontos,
        valorAbatimentos
      });
      const valorMetaBanco = toNumber(sourceRow?.valor_venda_real);
      const valorMetaBase = valorMetaCalculado > 0 ? valorMetaCalculado : valorMetaBanco;
      const valorMeta = Math.max(0, valorMetaBase - valorNaoComissionavel);

      const valorBrutoCalculado = Math.max(
        0,
        toNumber(sourceRow?.valor_lancamentos) - valorDescontos - valorAbatimentos
      );
      const valorBrutoBase =
        valorBrutoCalculado > 0 ? valorBrutoCalculado : valorMetaBase > 0 ? valorMetaBase + valorTaxas : 0;
      const valorBruto = Math.max(0, valorBrutoBase - valorNaoComissionavel);
      const valorLiquido = Math.max(0, valorBruto - valorTaxas);
      const preferredConciliacaoId =
        groupedConcIds.find((id) => concRowIdsWithRateio.has(id)) ||
        toStr(sourceRow?.id) ||
        groupedConcIds[0] ||
        `conc:${documento}`;

      return {
        id: preferredConciliacaoId,
        conciliacao_ids: groupedConcIds,
        documento,
        data_venda: effectiveDate,
        vendedor_id: vendedorId,
        produto_id: produtoId,
        linked_venda_id: linkedVendaId,
        linked_recibo_id: linkedReciboId,
        valor_bruto: valorBruto || null,
        valor_taxas: valorTaxas || null,
        valor_meta_override: valorMeta || null,
        valor_liquido_override: valorLiquido || null,
        valor_comissao_loja: sourceRow?.valor_comissao_loja ?? null,
        percentual_comissao_loja: sourceRow?.percentual_comissao_loja ?? null,
        faixa_comissao: toStr(sourceRow?.faixa_comissao) || null,
        is_seguro_viagem: isSeguro,
        valor_nao_comissionavel: valorNaoComissionavel,
        cancelado_por_conciliacao_em: linkedReciboMeta?.cancelado_por_conciliacao_em || null,
        cancelado_por_conciliacao_observacao: linkedReciboMeta?.cancelado_por_conciliacao_observacao || null,
        produto
      } satisfies EffectiveConciliacaoReceipt;
    })
    .filter((row): row is EffectiveConciliacaoReceipt => Boolean(row));
}

export function buildConciliacaoSyntheticVendas(items: EffectiveConciliacaoReceipt[]) {
  return items.map((item) => ({
    id: item.id,
    data_venda: item.data_venda,
    vendedor_id: item.vendedor_id,
    cancelada: false,
    valor_nao_comissionado: item.valor_nao_comissionavel,
    valor_total_bruto: item.valor_bruto,
    valor_total_pago: item.valor_bruto,
    linked_venda_id: item.linked_venda_id,
    linked_recibo_id: item.linked_recibo_id,
    vendas_recibos: [
      {
        id: item.linked_recibo_id || item.id,
        numero_recibo: item.documento,
        data_venda: item.data_venda,
        valor_total: item.valor_bruto,
        valor_taxas: item.valor_taxas,
        valor_du: null,
        valor_rav: null,
        produto_id: item.produto_id,
        tipo_pacote: null,
        valor_bruto_override: item.valor_bruto,
        valor_meta_override: item.valor_meta_override,
        valor_liquido_override: item.valor_liquido_override,
        valor_comissao_loja: item.valor_comissao_loja,
        percentual_comissao_loja: item.percentual_comissao_loja,
        faixa_comissao: item.faixa_comissao,
        is_seguro_viagem: item.is_seguro_viagem,
        cancelado_por_conciliacao_em: item.cancelado_por_conciliacao_em,
        cancelado_por_conciliacao_observacao: item.cancelado_por_conciliacao_observacao,
        tipo_produtos: item.produto
      }
    ]
  }));
}

export function hasConciliacaoOverride(recibo: {
  valor_bruto_override?: number | null;
  valor_meta_override?: number | null;
  valor_liquido_override?: number | null;
}) {
  return (
    recibo.valor_bruto_override != null ||
    recibo.valor_meta_override != null ||
    recibo.valor_liquido_override != null
  );
}
