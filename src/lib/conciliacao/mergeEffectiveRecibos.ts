import type { EffectiveConciliacaoReceipt } from '$lib/conciliacao/source';
import { normalizeReceiptNumber, receiptNumberCore } from '$lib/conciliacao/receiptNumber';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type MergeAdapters<TVenda, TRecibo> = {
  getVendaId(venda: TVenda): string;
  getRecibos(venda: TVenda): TRecibo[];
  getReciboId(recibo: TRecibo): string;
  getReciboNumero(recibo: TRecibo): string;
  getReciboDataVenda(recibo: TRecibo): string;
  getReciboCanceledAt(recibo: TRecibo): string | null;
  withRecibos(venda: TVenda, recibos: TRecibo[]): TVenda;
  buildSyntheticRecibo(item: EffectiveConciliacaoReceipt): TRecibo;
  buildSyntheticVenda(item: EffectiveConciliacaoReceipt): TVenda;
};

export type MergeResult<TVenda> = {
  vendas: TVenda[];
  removedBase: number;
  injectedIntoExisting: number;
  syntheticCreated: number;
};

function toMonthKey(value?: string | null) {
  const raw = String(value || '').trim();
  return ISO_DATE_PATTERN.test(raw) ? raw.slice(0, 7) : '';
}

function str(value: unknown) {
  return String(value || '').trim();
}

export function mergeEffectiveRecibos<TVenda, TRecibo>(
  baseVendas: TVenda[],
  concReceipts: EffectiveConciliacaoReceipt[],
  adapters: MergeAdapters<TVenda, TRecibo>
): MergeResult<TVenda> {
  if (concReceipts.length === 0) {
    return { vendas: baseVendas, removedBase: 0, injectedIntoExisting: 0, syntheticCreated: 0 };
  }

  const {
    getVendaId,
    getRecibos,
    getReciboId,
    getReciboNumero,
    getReciboDataVenda,
    getReciboCanceledAt,
    withRecibos,
    buildSyntheticRecibo,
    buildSyntheticVenda
  } = adapters;

  const baseVendasById = new Map<string, TVenda>();
  const baseVendaIdByReciboId = new Map<string, string>();
  // Índice por core numérico do número do recibo (para casar formatos divergentes)
  const baseVendaIdByReciboCore = new Map<string, string>();
  for (const venda of baseVendas) {
    const id = str(getVendaId(venda));
    if (!id) continue;
    baseVendasById.set(id, venda);
    for (const recibo of getRecibos(venda)) {
      const reciboId = str(getReciboId(recibo));
      if (reciboId) baseVendaIdByReciboId.set(reciboId, id);
      const reciboNumero = str(getReciboNumero(recibo));
      const core = receiptNumberCore(reciboNumero);
      if (core && !baseVendaIdByReciboCore.has(core)) baseVendaIdByReciboCore.set(core, id);
    }
  }

  const overriddenIds = new Set<string>();
  const overriddenNumeros = new Set<string>();
  // Core numérico (últimos dígitos sem zeros à esquerda) para casar formatos
  // divergentes: "5630-0000083861" (conciliação) ↔ "83861" (vendas_recibos)
  const overriddenCores = new Set<string>();
  for (const row of concReceipts) {
    const linkedReciboId = str(row.linked_recibo_id);
    if (linkedReciboId) overriddenIds.add(linkedReciboId);

    const documento = str(row.documento);
    const numero = normalizeReceiptNumber(documento);
    if (numero) overriddenNumeros.add(numero);

    const core = receiptNumberCore(documento);
    if (core) overriddenCores.add(core);
  }

  const concByVendaId = new Map<string, EffectiveConciliacaoReceipt[]>();
  const orphans: EffectiveConciliacaoReceipt[] = [];

  for (const item of concReceipts) {
    const linkedVendaId = str(item.linked_venda_id);
    const linkedReciboId = str(item.linked_recibo_id);
    const vendaViaRecibo = linkedReciboId ? str(baseVendaIdByReciboId.get(linkedReciboId)) : '';
    // Fallback: busca pelo core numérico do documento (ex: "5630-0000083861" → core "83861")
    const documentoCore = receiptNumberCore(str(item.documento));
    const vendaViaCore = documentoCore ? str(baseVendaIdByReciboCore.get(documentoCore)) : '';
    const targetVendaId =
      (linkedVendaId && baseVendasById.has(linkedVendaId) ? linkedVendaId : '') ||
      (vendaViaRecibo && baseVendasById.has(vendaViaRecibo) ? vendaViaRecibo : '') ||
      (vendaViaCore && baseVendasById.has(vendaViaCore) ? vendaViaCore : '');

    if (targetVendaId) {
      const bucket = concByVendaId.get(targetVendaId) ?? [];
      bucket.push(item);
      concByVendaId.set(targetVendaId, bucket);
      continue;
    }

    orphans.push(item);
  }

  let removedBase = 0;
  let injectedIntoExisting = 0;

  const processedVendas: TVenda[] = [];
  for (const venda of baseVendas) {
    const vendaId = str(getVendaId(venda));
    const recibosOriginais = getRecibos(venda);
    const concParaInjetar = concByVendaId.get(vendaId) ?? [];

    if (recibosOriginais.length === 0 && concParaInjetar.length === 0) {
      processedVendas.push(venda);
      continue;
    }

    const recibosRetidos: TRecibo[] = [];
    for (const recibo of recibosOriginais) {
      const id = str(getReciboId(recibo));
      if (id && overriddenIds.has(id)) {
        removedBase += 1;
        continue;
      }

      const reciboNumero = str(getReciboNumero(recibo));
      const numero = normalizeReceiptNumber(reciboNumero);
      if (numero && overriddenNumeros.has(numero)) {
        removedBase += 1;
        continue;
      }

      // Dedup por core numérico: casa "5630-0000083861" (conciliação) com "83861" (venda)
      const core = receiptNumberCore(reciboNumero);
      if (core && overriddenCores.has(core)) {
        removedBase += 1;
        continue;
      }

      const canceledAt = getReciboCanceledAt(recibo);
      if (canceledAt) {
        const reciboMes = toMonthKey(getReciboDataVenda(recibo));
        const cancelMes = toMonthKey(canceledAt);
        if (reciboMes && cancelMes && reciboMes === cancelMes) {
          removedBase += 1;
          continue;
        }
      }

      recibosRetidos.push(recibo);
    }

    const recibosConciliados = concParaInjetar.map(buildSyntheticRecibo);
    injectedIntoExisting += recibosConciliados.length;

    const recibosFinais = [...recibosRetidos, ...recibosConciliados];
    if (recibosFinais.length === 0) continue;

    processedVendas.push(withRecibos(venda, recibosFinais));
  }

  const syntheticVendas = orphans.map(buildSyntheticVenda);

  return {
    vendas: [...processedVendas, ...syntheticVendas],
    removedBase,
    injectedIntoExisting,
    syntheticCreated: syntheticVendas.length
  };
}
