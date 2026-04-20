/**
 * Lógica de Rateio de Vendas — vtur-svelte
 *
 * Portabilizado FIELMENTE do vtur-app (src/lib/vendasRateio.ts).
 * NÃO alterar sem sincronizar com o vtur-app.
 *
 * REGRAS CRÍTICAS:
 *  - percentual_origem + percentual_destino = 100
 *  - cloneReciboWithFactor escala todos os campos financeiros por fator
 *  - applyRateioToSalesForScopedVendedores: achata vendas por vendedor com base no rateio
 *  - rateio_source_recibo_id preserva o ID original (sem sufixo ::rateio:)
 */

export type RateioRow = {
  venda_recibo_id?: string | null;
  conciliacao_recibo_id?: string | null;
  vendedor_origem_id?: string | null;
  vendedor_destino_id?: string | null;
  percentual_origem?: number | null;
  percentual_destino?: number | null;
  ativo?: boolean | null;
};

// ---------------------------------------------------------------------------
// HELPERS INTERNOS
// ---------------------------------------------------------------------------

function toStr(value?: unknown) {
  return String(value || '').trim();
}

function toNumber(value?: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Remove o sufixo ::rateio:<vendedorId> de um ID sintético.
 * Usado para lookup na tabela de rateio com o ID real do recibo.
 */
function normalizeReciboLookupId(value?: unknown) {
  const raw = toStr(value);
  if (!raw) return '';
  return raw.replace(/::rateio:[^:]+$/i, '').replace(/:recibo$/i, '');
}

export function isUuid(value?: string | null) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value)
      )
  );
}

function scaleNumericField(value: unknown, factor: number) {
  if (value == null) return value;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return Math.round(parsed * factor * 100) / 100;
}

function resolveReciboBruto(recibo: Record<string, any>) {
  return Math.max(0, toNumber(recibo?.valor_bruto_override ?? recibo?.valor_total));
}

// ---------------------------------------------------------------------------
// CLONE COM FATOR
// ---------------------------------------------------------------------------

/**
 * Clona um recibo de venda aplicando um fator de escala em todos os valores financeiros.
 * O ID resultante é <id_original>::rateio:<vendedorId> para diferenciar de recibos reais.
 *
 * Portabilizado fielmente do vtur-app cloneReciboWithFactor().
 */
export function cloneReciboWithFactor<T extends Record<string, any>>(
  recibo: T,
  fator: number,
  vendedorId: string,
  options?: { forceSyntheticId?: boolean }
): T {
  const rawId = toStr(recibo?.id);
  const nextId =
    options?.forceSyntheticId || rawId
      ? `${rawId || 'recibo'}::rateio:${vendedorId}`
      : rawId;

  return {
    ...recibo,
    id: nextId,
    rateio_source_recibo_id: rawId || null,
    rateio_vendedor_id: vendedorId,
    valor_total: scaleNumericField(recibo?.valor_total, fator),
    valor_taxas: scaleNumericField(recibo?.valor_taxas, fator),
    valor_du: scaleNumericField(recibo?.valor_du, fator),
    valor_rav: scaleNumericField(recibo?.valor_rav, fator),
    valor_bruto_override: scaleNumericField(recibo?.valor_bruto_override, fator),
    valor_meta_override: scaleNumericField(recibo?.valor_meta_override, fator),
    valor_liquido_override: scaleNumericField(recibo?.valor_liquido_override, fator),
    valor_comissao_loja: scaleNumericField(recibo?.valor_comissao_loja, fator),
  } as T;
}

// ---------------------------------------------------------------------------
// FETCH RATEIO (server-side only)
// ---------------------------------------------------------------------------

/**
 * Busca os registros de rateio para uma lista de IDs de recibos.
 * Retorna um Map<id_recibo, RateioRow>.
 *
 * Portabilizado fielmente do vtur-app fetchRateioByReciboIds().
 */
export async function fetchRateioByReciboIds(
  client: any,
  reciboIds: string[]
): Promise<Map<string, RateioRow>> {
  const ids = Array.from(
    new Set((reciboIds || []).map((id) => normalizeReciboLookupId(id)).filter(Boolean))
  );
  if (ids.length === 0) return new Map<string, RateioRow>();

  const map = new Map<string, RateioRow>();

  const { data: byVendaRecibo, error: byVendaErr } = await client
    .from('vendas_recibos_rateio')
    .select(
      'venda_recibo_id, conciliacao_recibo_id, vendedor_origem_id, vendedor_destino_id, percentual_origem, percentual_destino, ativo'
    )
    .eq('ativo', true)
    .in('venda_recibo_id', ids);
  if (byVendaErr) throw byVendaErr;
  (byVendaRecibo || []).forEach((row: any) => {
    const key = toStr(row?.venda_recibo_id);
    if (key) map.set(key, row as RateioRow);
  });

  const { data: byConcRecibo, error: byConcErr } = await client
    .from('vendas_recibos_rateio')
    .select(
      'venda_recibo_id, conciliacao_recibo_id, vendedor_origem_id, vendedor_destino_id, percentual_origem, percentual_destino, ativo'
    )
    .eq('ativo', true)
    .in('conciliacao_recibo_id', ids);
  if (byConcErr) throw byConcErr;
  (byConcRecibo || []).forEach((row: any) => {
    const key = toStr(row?.conciliacao_recibo_id);
    if (key) map.set(key, row as RateioRow);
  });

  // Cross-reference: conciliacao_recibo_id → venda_recibo_id
  const concIds = Array.from(
    new Set((byConcRecibo || []).map((row: any) => toStr(row?.conciliacao_recibo_id)).filter(isUuid))
  );
  if (concIds.length > 0) {
    const { data: concRows, error: concErr } = await client
      .from('conciliacao_recibos')
      .select('id, venda_recibo_id')
      .in('id', concIds);
    if (concErr) throw concErr;
    (concRows || []).forEach((row: any) => {
      const concId = toStr(row?.id);
      const linkedVendaReciboId = toStr(row?.venda_recibo_id);
      if (!concId || !linkedVendaReciboId) return;
      const rateio = map.get(concId);
      if (rateio) map.set(linkedVendaReciboId, rateio);
    });
  }

  return map;
}

/**
 * Retorna os venda_ids das vendas em que o vendedor é destino de um rateio.
 * Usado para incluir vendas de outros vendedores no ranking do destino.
 *
 * Portabilizado fielmente do vtur-app fetchSplitSaleIdsForDestinationVendedores().
 */
export async function fetchSplitSaleIdsForDestinationVendedores(
  client: any,
  options: {
    companyId?: string | null;
    vendedorIds?: string[] | null;
  }
): Promise<string[]> {
  const companyId = toStr(options.companyId);
  const scopedVendedorIds = Array.from(
    new Set((options.vendedorIds || []).map((id) => toStr(id)).filter(isUuid))
  );
  if (scopedVendedorIds.length === 0) return [];

  let splitQuery = client
    .from('vendas_recibos_rateio')
    .select('venda_recibo_id, conciliacao_recibo_id')
    .eq('ativo', true)
    .in('vendedor_destino_id', scopedVendedorIds);
  if (companyId) splitQuery = splitQuery.eq('company_id', companyId);

  const { data: splitRows, error: splitErr } = await splitQuery;
  if (splitErr) throw splitErr;

  const vendaReciboIds = Array.from(
    new Set((splitRows || []).map((row: any) => toStr(row?.venda_recibo_id)).filter(isUuid))
  );
  const concReciboIds = Array.from(
    new Set((splitRows || []).map((row: any) => toStr(row?.conciliacao_recibo_id)).filter(isUuid))
  );

  const vendaIds = new Set<string>();

  if (vendaReciboIds.length > 0) {
    const { data: recibosRows, error: recibosErr } = await client
      .from('vendas_recibos')
      .select('id, venda_id')
      .in('id', vendaReciboIds);
    if (recibosErr) throw recibosErr;
    (recibosRows || []).forEach((row: any) => {
      const vendaId = toStr(row?.venda_id);
      if (isUuid(vendaId)) vendaIds.add(vendaId);
    });
  }

  if (concReciboIds.length > 0) {
    const { data: concRows, error: concErr } = await client
      .from('conciliacao_recibos')
      .select('id, venda_id')
      .in('id', concReciboIds);
    if (concErr) throw concErr;
    (concRows || []).forEach((row: any) => {
      const vendaId = toStr(row?.venda_id);
      if (isUuid(vendaId)) vendaIds.add(vendaId);
    });
  }

  return Array.from(vendaIds);
}

// ---------------------------------------------------------------------------
// APLICAR RATEIO EM LISTA DE VENDAS
// ---------------------------------------------------------------------------

/**
 * Achata a lista de vendas expandindo cada venda em entradas por vendedor,
 * aplicando os fatores de rateio aos valores financeiros de cada recibo.
 *
 * Comportamento:
 * - Se não há rateio para o recibo: mantém o recibo com vendedor_id original
 * - Se há rateio ativo: cria dois registros — um para origem (pct_origem/100), outro para destino
 * - Se scopedVendedorIds fornecido: filtra apenas os vendedores no escopo
 *
 * Portabilizado FIELMENTE do vtur-app applyRateioToSalesForScopedVendedores().
 */
export function applyRateioToSalesForScopedVendedores<
  T extends {
    vendedor_id?: string | null;
    vendas_recibos?: Array<Record<string, any>> | null;
  }
>(
  items: T[],
  rateioMap: Map<string, RateioRow>,
  scopedVendedorIds?: string[] | null
): Array<T & {
  rateio_source_venda_id: string | null;
  rateio_scope_bruto_total: number;
  rateio_source_bruto_total: number;
  rateio_scope_factor: number;
}> {
  const scopedSet = new Set((scopedVendedorIds || []).map((id) => toStr(id)).filter(Boolean));
  const hasScope = scopedSet.size > 0;

  return (items || []).flatMap((item) => {
    const origemId = toStr(item?.vendedor_id);
    const recibos = Array.isArray(item?.vendas_recibos) ? item.vendas_recibos : [];
    if (recibos.length === 0) return [];
    const sourceBrutoTotal = recibos.reduce((sum, recibo) => sum + resolveReciboBruto(recibo), 0);

    const recibosPorVendedor = new Map<string, Array<Record<string, any>>>();

    recibos.forEach((recibo, reciboIndex) => {
      const rawReciboId = toStr(recibo?.id);
      const primaryReciboId = normalizeReciboLookupId(rawReciboId);
      const rateio =
        rateioMap.get(rawReciboId) ||
        rateioMap.get(primaryReciboId) ||
        null;

      const baseAllocations =
        rateio &&
        rateio.ativo &&
        isUuid(rateio.vendedor_origem_id) &&
        isUuid(rateio.vendedor_destino_id) &&
        toNumber(rateio.percentual_origem) > 0 &&
        toNumber(rateio.percentual_destino) > 0
          ? [
              {
                vendedorId: toStr(rateio.vendedor_origem_id),
                fator: Math.max(0, Math.min(1, toNumber(rateio.percentual_origem) / 100)),
              },
              {
                vendedorId: toStr(rateio.vendedor_destino_id),
                fator: Math.max(0, Math.min(1, toNumber(rateio.percentual_destino) / 100)),
              },
            ]
          : origemId
            ? [{ vendedorId: origemId, fator: 1 }]
            : [];

      const allocations = hasScope
        ? baseAllocations.filter((allocation) => scopedSet.has(allocation.vendedorId))
        : baseAllocations;

      allocations.forEach((allocation) => {
        if (!allocation.vendedorId) return;
        const bucket = recibosPorVendedor.get(allocation.vendedorId) || [];
        const forceSyntheticId =
          Boolean(rateio?.ativo) ||
          allocation.vendedorId !== origemId ||
          allocation.fator !== 1 ||
          allocations.length > 1;
        const nextRecibo =
          forceSyntheticId || allocation.fator !== 1
            ? cloneReciboWithFactor(recibo, allocation.fator, allocation.vendedorId, {
                forceSyntheticId,
              })
            : recibo;

        bucket.push({
          ...nextRecibo,
          rateio_scope_vendor_id: allocation.vendedorId,
          rateio_scope_index: reciboIndex,
        });
        recibosPorVendedor.set(allocation.vendedorId, bucket);
      });
    });

    return Array.from(recibosPorVendedor.entries())
      .map(([vendedorId, vendedorRecibos]) => {
        const scopeBrutoTotal = vendedorRecibos.reduce(
          (sum, recibo) => sum + resolveReciboBruto(recibo),
          0
        );
        const scopeFactor =
          sourceBrutoTotal > 0
            ? Math.max(0, Math.min(1, scopeBrutoTotal / sourceBrutoTotal))
            : 1;

        return {
          ...item,
          vendedor_id: vendedorId,
          vendas_recibos: vendedorRecibos,
          rateio_source_venda_id: toStr((item as any)?.id) || null,
          rateio_scope_bruto_total: scopeBrutoTotal,
          rateio_source_bruto_total: sourceBrutoTotal,
          rateio_scope_factor: scopeFactor,
        };
      })
      .filter(
        (nextItem) =>
          Array.isArray(nextItem.vendas_recibos) && nextItem.vendas_recibos.length > 0
      ) as Array<T & {
        rateio_source_venda_id: string | null;
        rateio_scope_bruto_total: number;
        rateio_source_bruto_total: number;
        rateio_scope_factor: number;
      }>;
  });
}
