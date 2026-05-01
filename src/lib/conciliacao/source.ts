import { calcularValorVendaReal, isConciliacaoEfetivada, resolveConciliacaoStatus } from '$lib/conciliacao/business';
import { EQUIPE_VTUR_USER_NAME } from '$lib/conciliacao/baixaRac';

export type EffectiveConciliacaoReceipt = {
  id: string;
  conciliacao_ids: string[];
  documento: string;
  data_venda: string;
  company_id: string | null;
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
  /** Rateio cadastrado para este recibo — presente apenas quando há divisão entre vendedores.
   *  Usado pelo ranking para exibir valores proporcionais por vendedor. */
  rateio_split?: {
    vendedor_origem_id: string;
    vendedor_destino_id: string;
    percentual_origem: number;
    percentual_destino: number;
  } | null;
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
  // Use resolveConciliacaoStatus (checks both status and descricao) instead of
  // a raw string comparison against status, so rows stored as "Pendente" or
  // similar are still correctly identified as OPFAX.
  const valuedOpfax = sortedRows.find(
    (row) =>
      !isConciliacaoEfetivada({ status: row?.status, descricao: row?.descricao }) &&
      resolveConciliacaoStatus({ status: row?.status, descricao: row?.descricao }) === 'OPFAX' &&
      (isPositive(row?.valor_venda_real) || isPositive(row?.valor_lancamentos))
  );

  // Priority: BAIXA with value > OPFAX with value (when BAIXA exists but is R$0) > first BAIXA
  // We deliberately prefer valuedOpfax over a zero-value BAIXA row, since CVC sometimes
  // sends BAIXA confirmation files with R$0 monetary values for receipts that were correctly
  // valued in the prior OPFAX entry. The ranking should still use that valued OPFAX entry
  // as the financial source when the BAIXA provides no useful value.
  // Note: if confirmed=false (OPFAX-only, no BAIXA), we return null so that pending receipts
  // are NOT included in the ranking — only confirmed (BAIXA) receipts count.
  const sourceRow =
    valuedBaixa ||
    (confirmed ? valuedOpfax : null) ||
    (confirmed ? baixaRows[0] : null) ||
    null;

  // mergedRow: when we have both an OPFAX (with valor_lancamentos) and a BAIXA (with
  // taxas/descontos/abatimentos/comissão/seguro), merge the best fields from each.
  // OPFAX carries the gross sale value; BAIXA carries the financial breakdown and metadata.
  // This ensures the ranking correctly accounts for the full value + correct deductions.
  let mergedRow = sourceRow;
  if (sourceRow && valuedOpfax && baixaRows.length > 0) {
    const baixaForMeta = baixaRows[baixaRows.length - 1]; // most recent BAIXA
    const opfaxLancamentos = toNumber(valuedOpfax?.valor_lancamentos);
    const opfaxVendaReal = toNumber(valuedOpfax?.valor_venda_real);
    const baixaLancamentos = toNumber(baixaForMeta?.valor_lancamentos);
    const baixaVendaReal = toNumber(baixaForMeta?.valor_venda_real);

    // Only merge if OPFAX has the value and BAIXA does not (or BAIXA value is much smaller)
    const opfaxHasValue = opfaxLancamentos > 0 || opfaxVendaReal > 0;
    const baixaLacksValue = baixaLancamentos <= 0 && baixaVendaReal <= 0;
    const baixaHasMeta = isPositive(baixaForMeta?.valor_taxas) ||
      isPositive(baixaForMeta?.valor_descontos) ||
      isPositive(baixaForMeta?.valor_abatimentos) ||
      isPositive(baixaForMeta?.valor_nao_comissionavel) ||
      isPositive(baixaForMeta?.valor_comissao_loja) ||
      Boolean(baixaForMeta?.is_seguro_viagem) ||
      Boolean(baixaForMeta?.faixa_comissao);

    if (opfaxHasValue && (baixaLacksValue || baixaHasMeta)) {
      mergedRow = {
        // Base: OPFAX financial values (gross sale amount)
        ...valuedOpfax,
        // Override with BAIXA metadata (taxas, descontos, comissão, seguro)
        valor_taxas: isPositive(baixaForMeta?.valor_taxas) ? baixaForMeta.valor_taxas : valuedOpfax?.valor_taxas,
        valor_descontos: isPositive(baixaForMeta?.valor_descontos) ? baixaForMeta.valor_descontos : valuedOpfax?.valor_descontos,
        valor_abatimentos: isPositive(baixaForMeta?.valor_abatimentos) ? baixaForMeta.valor_abatimentos : valuedOpfax?.valor_abatimentos,
        valor_nao_comissionavel: isPositive(baixaForMeta?.valor_nao_comissionavel) ? baixaForMeta.valor_nao_comissionavel : valuedOpfax?.valor_nao_comissionavel,
        valor_comissao_loja: baixaForMeta?.valor_comissao_loja ?? valuedOpfax?.valor_comissao_loja,
        percentual_comissao_loja: baixaForMeta?.percentual_comissao_loja ?? valuedOpfax?.percentual_comissao_loja,
        faixa_comissao: baixaForMeta?.faixa_comissao || valuedOpfax?.faixa_comissao,
        is_seguro_viagem: baixaForMeta?.is_seguro_viagem ?? valuedOpfax?.is_seguro_viagem,
        ranking_vendedor_id: baixaForMeta?.ranking_vendedor_id || valuedOpfax?.ranking_vendedor_id,
        // Keep OPFAX's movimento_data as the effective date: the sale was registered in the
        // OPFAX period. Using the BAIXA date would exclude April OPFAX receipts whose payment
        // confirmation (BAIXA) only arrived in May.
        movimento_data: valuedOpfax?.movimento_data || baixaForMeta?.movimento_data,
        // Keep BAIXA's id as the primary record id
        id: baixaForMeta?.id || valuedOpfax?.id,
      };
    }
  }

  return {
    sortedRows,
    baixaRows,
    confirmed,
    sourceRow: mergedRow
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

  const equipeVturIds = new Set<string>();
  try {
    let equipeQuery = client
      .from('users')
      .select('id')
      .ilike('nome_completo', EQUIPE_VTUR_USER_NAME);
    equipeQuery =
      normalizedCompanyIds.length === 1
        ? equipeQuery.eq('company_id', normalizedCompanyIds[0])
        : equipeQuery.in('company_id', normalizedCompanyIds);
    const { data: equipeRows, error: equipeError } = await equipeQuery;
    if (equipeError) throw equipeError;
    (equipeRows || []).forEach((row: any) => {
      const id = toStr(row?.id);
      if (id) equipeVturIds.add(id);
    });
  } catch (error) {
    console.warn('[source] falha ao carregar Equipe vtur, seguindo sem filtro:', error);
  }

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
          'id, company_id, documento, descricao, movimento_data, status, conciliado, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_venda_real, valor_nao_comissionavel, valor_comissao_loja, percentual_comissao_loja, faixa_comissao, is_seguro_viagem, venda_id, venda_recibo_id, ranking_vendedor_id, ranking_produto_id'
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
            'id, company_id, documento, descricao, movimento_data, status, conciliado, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_venda_real, valor_comissao_loja, percentual_comissao_loja, faixa_comissao, is_seguro_viagem, venda_id, venda_recibo_id, ranking_vendedor_id, ranking_produto_id'
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
  const concLinkedReciboIds = Array.from(
    new Set(concRows.map((row) => toStr(row?.venda_recibo_id)).filter(isUuid))
  );
  // Maps de rateio: ajustes podem estar vinculados ao registro de conciliação
  // ou diretamente ao recibo da venda que a conciliação substitui.
  const concRateioMap = new Map<string, {
    vendedor_origem_id: string | null;
    vendedor_destino_id: string | null;
    percentual_origem: number;
    percentual_destino: number;
  }>();
  const reciboRateioMap = new Map<string, {
    vendedor_origem_id: string | null;
    vendedor_destino_id: string | null;
    percentual_origem: number;
    percentual_destino: number;
  }>();
  const concRowIdsWithRateio = new Set<string>();
  const setRateioRow = (
    map: typeof concRateioMap,
    id: string,
    row: {
      vendedor_origem_id?: unknown;
      vendedor_destino_id?: unknown;
      percentual_origem?: unknown;
      percentual_destino?: unknown;
    }
  ) => {
    if (!id) return;
    map.set(id, {
      vendedor_origem_id: toStr(row?.vendedor_origem_id) || null,
      vendedor_destino_id: toStr(row?.vendedor_destino_id) || null,
      percentual_origem: toNumber(row?.percentual_origem),
      percentual_destino: toNumber(row?.percentual_destino)
    });
  };

  if (concRowIds.length > 0 || concLinkedReciboIds.length > 0) {
    let rateioQueryFailed = false;
    for (let i = 0; i < concRowIds.length; i += 50) {
      if (rateioQueryFailed) break;
      const batch = concRowIds.slice(i, i + 50);
      try {
        const { data: rateioRows, error: rateioError } = await client
          .from('vendas_recibos_rateio')
          .select('conciliacao_recibo_id, vendedor_origem_id, vendedor_destino_id, percentual_origem, percentual_destino')
          .eq('ativo', true)
          .in('conciliacao_recibo_id', batch);
        if (rateioError) {
          // Tabela ou coluna ausente → segue sem rateio
          const code = String(rateioError?.code || '').trim();
          const isMissing = code === '42P01' || code === '42703' || isRateioTableMissingError(rateioError);
          if (!isMissing) throw rateioError;
          rateioQueryFailed = true;
          break;
        }
        (rateioRows || []).forEach((row: any) => {
          const id = toStr(row?.conciliacao_recibo_id);
          if (!id) return;
          concRowIdsWithRateio.add(id);
          setRateioRow(concRateioMap, id, row);
        });
      } catch (err: any) {
        // Qualquer erro inesperado na query de rateio → segue sem aplicar rateio,
        // não derruba a busca principal de conciliação.
        console.warn('[source] rateio query falhou, seguindo sem rateio:', err?.message || err);
        rateioQueryFailed = true;
        break;
      }
    }

    for (let i = 0; i < concLinkedReciboIds.length; i += 50) {
      if (rateioQueryFailed) break;
      const batch = concLinkedReciboIds.slice(i, i + 50);
      try {
        const { data: rateioRows, error: rateioError } = await client
          .from('vendas_recibos_rateio')
          .select('venda_recibo_id, vendedor_origem_id, vendedor_destino_id, percentual_origem, percentual_destino')
          .eq('ativo', true)
          .in('venda_recibo_id', batch);
        if (rateioError) {
          const code = String(rateioError?.code || '').trim();
          const isMissing = code === '42P01' || code === '42703' || isRateioTableMissingError(rateioError);
          if (!isMissing) throw rateioError;
          rateioQueryFailed = true;
          break;
        }
        (rateioRows || []).forEach((row: any) => {
          setRateioRow(reciboRateioMap, toStr(row?.venda_recibo_id), row);
        });
      } catch (err: any) {
        console.warn('[source] rateio por recibo falhou, seguindo sem rateio:', err?.message || err);
        rateioQueryFailed = true;
        break;
      }
    }
  }

  const vendaIds = Array.from(new Set(concRows.map((row) => toStr(row?.venda_id)).filter(isUuid)));
  const reciboIds = Array.from(new Set(concRows.map((row) => toStr(row?.venda_recibo_id)).filter(isUuid)));
  const rankingVendedorIds = Array.from(
    new Set(concRows.map((row) => toStr(row?.ranking_vendedor_id)).filter(isUuid))
  );

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
        venda_id: toStr(row?.venda_id) || null,
        produto_id: toStr(row?.produto_id) || null,
        data_venda: toStr(row?.data_venda) || null,
        cancelado_por_conciliacao_em: toStr(row?.cancelado_por_conciliacao_em) || null,
        cancelado_por_conciliacao_observacao: toStr(row?.cancelado_por_conciliacao_observacao) || null
      });
    });
  }

  const validRankingVendedorIds = new Set<string>();
  if (rankingVendedorIds.length > 0) {
    for (let i = 0; i < rankingVendedorIds.length; i += 200) {
      const batch = rankingVendedorIds.slice(i, i + 200);
      const { data, error } = await client
        .from('users')
        .select('id, company_id, active, uso_individual')
        .in('id', batch);
      if (error) throw error;

      (data || []).forEach((row: any) => {
        const id = toStr(row?.id);
        const companyId = toStr(row?.company_id);
        if (!id || row?.active === false || row?.uso_individual === true) return;
        if (!normalizedCompanyIds.includes(companyId)) return;
        validRankingVendedorIds.add(id);
      });
    }
  }

  if (relevantDocs.size > 0) {
    for (let i = 0; i < documentos.length; i += 200) {
      const batch = documentos.slice(i, i + 200);
      const { data, error } = await client
        .from('vendas_recibos')
        .select('id, numero_recibo, venda_id, produto_id, data_venda, cancelado_por_conciliacao_em, cancelado_por_conciliacao_observacao')
        .in('numero_recibo', batch);
      if (error) throw error;

      const vendaIdsBatch = Array.from(new Set((data || []).map((row: any) => toStr(row?.venda_id)).filter(isUuid)));
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

  const fallbackReciboIds = Array.from(
    new Set(
      Array.from(reciboByNumeroMap.values())
        .map((row: any) => toStr(row?.id))
        .filter(isUuid)
        .filter((id: string) => !reciboRateioMap.has(id))
    )
  );
  if (fallbackReciboIds.length > 0) {
    for (let i = 0; i < fallbackReciboIds.length; i += 50) {
      const batch = fallbackReciboIds.slice(i, i + 50);
      try {
        const { data: rateioRows, error: rateioError } = await client
          .from('vendas_recibos_rateio')
          .select('venda_recibo_id, vendedor_origem_id, vendedor_destino_id, percentual_origem, percentual_destino')
          .eq('ativo', true)
          .in('venda_recibo_id', batch);
        if (rateioError) {
          const code = String(rateioError?.code || '').trim();
          const isMissing = code === '42P01' || code === '42703' || isRateioTableMissingError(rateioError);
          if (!isMissing) throw rateioError;
          break;
        }
        (rateioRows || []).forEach((row: any) => {
          setRateioRow(reciboRateioMap, toStr(row?.venda_recibo_id), row);
        });
      } catch (err: any) {
        console.warn('[source] rateio por recibo fallback falhou, seguindo sem rateio:', err?.message || err);
        break;
      }
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
    .flatMap(([documento, rows]) => {
      const { sortedRows, sourceRow } = pickConciliacaoSourceRow(rows);
      const estornoRows = sortedRows.filter((row) => toStr(row?.status).toUpperCase() === 'ESTORNO');
      const groupedConcIds = Array.from(new Set(sortedRows.map((row) => toStr(row?.id)).filter(isUuid)));

      if (!sourceRow) return [];

      const effectiveDate = toStr(sourceRow?.movimento_data);
      if (!effectiveDate || effectiveDate < inicio || effectiveDate > fim) return [];

      const linkedVendaIdFromConc = sortedRows.map((row) => toStr(row?.venda_id)).find(Boolean) || null;
      const linkedReciboIdFromConc = sortedRows.map((row) => toStr(row?.venda_recibo_id)).find(Boolean) || null;
      const fallbackRecibo = !linkedReciboIdFromConc ? reciboByNumeroMap.get(documento) || null : null;
      const linkedReciboId = linkedReciboIdFromConc || fallbackRecibo?.id || null;
      const linkedReciboMeta = linkedReciboId
        ? recibosMap.get(linkedReciboId) || fallbackRecibo || null
        : null;
      const linkedVendaId = linkedVendaIdFromConc || linkedReciboMeta?.venda_id || fallbackRecibo?.venda_id || null;
      const linkedVendedorIdRaw = linkedVendaId ? vendasMap.get(linkedVendaId)?.vendedor_id || null : null;
      const linkedVendedorId =
        linkedVendedorIdRaw && !equipeVturIds.has(linkedVendedorIdRaw) ? linkedVendedorIdRaw : null;
      // Prefer the ranking_vendedor_id from the sourceRow first (it is the "effective" row),
      // then fall back to any other row in the group (e.g. a manual override on a different
      // date entry for the same document).
      const rankingVendedorId =
        [toStr(sourceRow?.ranking_vendedor_id), ...sortedRows.map((row) => toStr(row?.ranking_vendedor_id))]
          .filter(Boolean)
          .filter((id) => validRankingVendedorIds.has(id))
          .find((id) => !equipeVturIds.has(id)) ||
        null;
      const vendedorId = rankingVendedorId || linkedVendedorId || null;

      const linkedProdutoId = linkedReciboId
        ? recibosMap.get(linkedReciboId)?.produto_id || fallbackRecibo?.produto_id || null
        : null;
      const canceladoMesmoMes =
        estornoRows.some((row) => toMonthKey(row?.movimento_data) === toMonthKey(effectiveDate)) ||
        isReciboCanceladoMesmoMes({
          data_venda: linkedReciboMeta?.data_venda || effectiveDate,
          cancelado_por_conciliacao_em: linkedReciboMeta?.cancelado_por_conciliacao_em || null
        });
      if (canceladoMesmoMes) return [];

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
      // No fallback (valor_lancamentos ausente), valorMetaBase não inclui taxas,
      // então somamos valorTaxas para reconstituir o bruto — alinhado com vtur-app.
      console.log('[source] VERSAO_NOVA valorBrutoCalculado=', valorBrutoCalculado, 'valorMetaBase=', valorMetaBase, 'valorTaxas=', valorTaxas);
      const valorBrutoBase =
        valorBrutoCalculado > 0 ? valorBrutoCalculado : valorMetaBase > 0 ? valorMetaBase + valorTaxas : 0;
      const valorBruto = Math.max(0, valorBrutoBase - valorNaoComissionavel);
      const valorLiquido = Math.max(0, valorBruto - valorTaxas);

      // Verifica se algum dos IDs do grupo tem rateio cadastrado
      const rateioId = groupedConcIds.find((id) => concRowIdsWithRateio.has(id)) || null;
      const rateio =
        (rateioId ? concRateioMap.get(rateioId) || null : null) ||
        (linkedReciboId ? reciboRateioMap.get(linkedReciboId) || null : null);
      const preferredConciliacaoId = rateioId || toStr(sourceRow?.id) || groupedConcIds[0] || `conc:${documento}`;

      const effectiveSaleDate = effectiveDate;
      const companyIdFromRows = sortedRows.map((row) => toStr(row?.company_id)).find(Boolean) || null;

      // Filtros de escopo (vendedor excluído ou fora do escopo permitido)
      if (excludedVendedores && vendedorId && excludedVendedores.has(vendedorId)) return [];
      if (allowedVendedores && (!vendedorId || !allowedVendedores.has(vendedorId))) return [];

      // Inclui dados de rateio como campo extra quando existir.
      // O ranking usa esse campo para dividir o valor entre os dois vendedores.
      // Os demais consumidores (vendas-kpis, mergeEffectiveRecibos) ignoram o campo
      // e continuam recebendo um único recibo com o valor total — comportamento inalterado.
      const rateioSplit =
        rateio &&
        isUuid(rateio.vendedor_origem_id) &&
        isUuid(rateio.vendedor_destino_id) &&
        rateio.percentual_origem > 0 &&
        rateio.percentual_destino > 0
          ? {
              vendedor_origem_id: rateio.vendedor_origem_id!,
              vendedor_destino_id: rateio.vendedor_destino_id!,
              percentual_origem: rateio.percentual_origem,
              percentual_destino: rateio.percentual_destino,
            }
          : null;

      return [{
        id: preferredConciliacaoId,
        conciliacao_ids: groupedConcIds,
        documento,
        data_venda: effectiveSaleDate,
        company_id: companyIdFromRows,
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
        produto,
        rateio_split: rateioSplit
      } satisfies EffectiveConciliacaoReceipt];
    })
    .filter(Boolean) as EffectiveConciliacaoReceipt[];
}

export function buildConciliacaoSyntheticVendas(items: EffectiveConciliacaoReceipt[]) {
  return items.map((item) => ({
    id: item.id,
    data_venda: item.data_venda,
    company_id: item.company_id,
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
