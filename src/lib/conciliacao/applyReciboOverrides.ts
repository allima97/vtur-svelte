/**
 * applyReciboOverrides
 * --------------------
 * Função compartilhada que aplica os valores efetivos da conciliação nos
 * recibos de uma coleção de itens (vendas ou agregados).
 *
 * Uso:
 *   - relatorios/vendas.ts  → aplica em `vendas_recibos`
 *   - vendas/list.ts        → aplica em `recibos`
 *
 * Lógica espelhada de applyConciliacaoOverridesToVendas (relatorios/vendas.ts).
 */

import { calcularValorVendaReal, isConciliacaoEfetivada } from '$lib/conciliacao/business';

function toStr(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPositive(value: unknown) {
  return toNumber(value) > 0;
}

function isMissingNaoComissionavelColumn(error: any) {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("valor_nao_comissionavel") &&
    (msg.includes("does not exist") || msg.includes("nao existe"))
  );
}

export type ReciboOverride = {
  data_venda: string;
  valor_bruto: number | null;
  valor_meta: number | null;
  valor_liquido: number | null;
  valor_taxas: number | null;
  valor_comissao_loja: number | null;
  percentual_comissao_loja: number | null;
  faixa_comissao: string | null;
};

/**
 * Retorna um Map<reciboId, ReciboOverride> com os valores efetivos da conciliação.
 * Busca nos registros de conciliação que têm `venda_recibo_id` nos IDs fornecidos.
 */
export async function fetchReciboOverrideMap(
  client: any,
  companyId: string,
  reciboIds: string[]
): Promise<Map<string, ReciboOverride>> {
  const ids = Array.from(new Set(reciboIds.filter(Boolean)));
  if (!companyId || ids.length === 0) return new Map();

  const concRows: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    let { data, error } = await client
      .from("conciliacao_recibos")
      .select(
        "documento, movimento_data, status, descricao, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_venda_real, valor_nao_comissionavel, valor_comissao_loja, percentual_comissao_loja, faixa_comissao, venda_recibo_id"
      )
      .eq("company_id", companyId)
      .neq("is_baixa_rac", true)
      .in("venda_recibo_id", batch)
      .order("movimento_data", { ascending: true });

    if (error && isMissingNaoComissionavelColumn(error)) {
      const fb = await client
        .from("conciliacao_recibos")
        .select(
          "documento, movimento_data, status, descricao, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_venda_real, valor_comissao_loja, percentual_comissao_loja, faixa_comissao, venda_recibo_id"
        )
        .eq("company_id", companyId)
        .neq("is_baixa_rac", true)
        .in("venda_recibo_id", batch)
        .order("movimento_data", { ascending: true });
      data = fb.data;
      error = fb.error;
    }
    if (error) throw error;
    concRows.push(...(Array.isArray(data) ? data : []));
  }

  if (concRows.length === 0) return new Map();

  // Agrupar por documento para selecionar a fonte vencedora
  const byDocumento = new Map<string, any[]>();
  concRows.forEach((row) => {
    const doc = toStr(row?.documento);
    if (!doc) return;
    const bucket = byDocumento.get(doc) || [];
    bucket.push(row);
    byDocumento.set(doc, bucket);
  });

  const overrideMap = new Map<string, ReciboOverride>();

  Array.from(byDocumento.values()).forEach((rows) => {
    const sorted = [...rows].sort((a, b) =>
      toStr(a?.movimento_data).localeCompare(toStr(b?.movimento_data))
    );
    const baixaRows = sorted.filter((r) =>
      isConciliacaoEfetivada({ status: r?.status, descricao: r?.descricao })
    );
    const confirmed = baixaRows.length > 0;
    const valuedBaixa = baixaRows.find(
      (r) => isPositive(r?.valor_venda_real) || isPositive(r?.valor_lancamentos)
    );
    const valuedOpfax = sorted.find(
      (r) =>
        !isConciliacaoEfetivada({ status: r?.status, descricao: r?.descricao }) &&
        toStr(r?.status).toUpperCase() === "OPFAX" &&
        (isPositive(r?.valor_venda_real) || isPositive(r?.valor_lancamentos))
    );
    const sourceRow =
      valuedBaixa ||
      (confirmed ? valuedOpfax : null) ||
      (confirmed ? baixaRows[0] : null) ||
      null;

    if (!sourceRow) return;
    if (!confirmed && !isConciliacaoEfetivada({ status: sourceRow?.status, descricao: sourceRow?.descricao })) return;

    const linkedReciboId = rows.map((r) => toStr(r?.venda_recibo_id)).find(Boolean);
    const effectiveDate = toStr(sourceRow?.movimento_data);
    if (!linkedReciboId || !effectiveDate) return;

    const valorTaxas = toNumber(sourceRow?.valor_taxas);
    const valorDescontos = toNumber(sourceRow?.valor_descontos);
    const valorAbatimentos = toNumber(sourceRow?.valor_abatimentos);
    const valorNaoComissionavel = Math.max(0, toNumber(sourceRow?.valor_nao_comissionavel));
    const valorMetaCalculado = calcularValorVendaReal({
      valorLancamentos: toNumber(sourceRow?.valor_lancamentos),
      valorTaxas,
      valorDescontos,
      valorAbatimentos,
    });
    const valorMetaBanco = toNumber(sourceRow?.valor_venda_real);
    const valorMetaBase = valorMetaCalculado > 0 ? valorMetaCalculado : valorMetaBanco;
    const valorBrutoCalculado = Math.max(
      0,
      toNumber(sourceRow?.valor_lancamentos) - valorDescontos - valorAbatimentos
    );
    const valorBrutoBase =
      valorBrutoCalculado > 0
        ? valorBrutoCalculado
        : valorMetaBase > 0
          ? valorMetaBase + valorTaxas
          : 0;
    const valorBruto = Math.max(0, valorBrutoBase - valorNaoComissionavel);
    const valorMeta = Math.max(0, valorMetaBase - valorNaoComissionavel);
    const valorLiquido = Math.max(0, valorBruto - valorTaxas);

    overrideMap.set(linkedReciboId, {
      data_venda: effectiveDate,
      valor_bruto: valorBruto || null,
      valor_meta: valorMeta || null,
      valor_liquido: valorLiquido || null,
      valor_taxas: valorTaxas || null,
      valor_comissao_loja: sourceRow?.valor_comissao_loja ?? null,
      percentual_comissao_loja: sourceRow?.percentual_comissao_loja ?? null,
      faixa_comissao: toStr(sourceRow?.faixa_comissao) || null,
    });
  });

  return overrideMap;
}
