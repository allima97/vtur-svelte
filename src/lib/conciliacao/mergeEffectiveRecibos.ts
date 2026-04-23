import type { EffectiveConciliacaoReceipt } from '$lib/conciliacao/source';
import { normalizeReceiptNumber } from '$lib/conciliacao/receiptNumber';

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
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw.slice(0, 7) : '';
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
  baseVendas.forEach((venda) => {
    const id = str(getVendaId(venda));
    if (!id) return;
    baseVendasById.set(id, venda);
    getRecibos(venda).forEach((recibo) => {
      const reciboId = str(getReciboId(recibo));
      if (reciboId) baseVendaIdByReciboId.set(reciboId, id);
    });
  });

  const overriddenIds = new Set(concReceipts.map((row) => str(row.linked_recibo_id)).filter(Boolean));
  const overriddenNumeros = new Set(
    concReceipts.map((row) => normalizeReceiptNumber(str(row.documento))).filter(Boolean)
  );

  const concByVendaId = new Map<string, EffectiveConciliacaoReceipt[]>();
  const orphans: EffectiveConciliacaoReceipt[] = [];

  concReceipts.forEach((item) => {
    const linkedVendaId = str(item.linked_venda_id);
    const linkedReciboId = str(item.linked_recibo_id);
    const vendaViaRecibo = linkedReciboId ? str(baseVendaIdByReciboId.get(linkedReciboId)) : '';
    const targetVendaId =
      (linkedVendaId && baseVendasById.has(linkedVendaId) ? linkedVendaId : '') ||
      (vendaViaRecibo && baseVendasById.has(vendaViaRecibo) ? vendaViaRecibo : '');

    if (targetVendaId) {
      const bucket = concByVendaId.get(targetVendaId) ?? [];
      bucket.push(item);
      concByVendaId.set(targetVendaId, bucket);
      return;
    }

    orphans.push(item);
  });

  let removedBase = 0;
  let injectedIntoExisting = 0;

  const processedVendas: TVenda[] = [];
  baseVendas.forEach((venda) => {
    const vendaId = str(getVendaId(venda));
    const recibosOriginais = getRecibos(venda);
    const concParaInjetar = concByVendaId.get(vendaId) ?? [];

    if (recibosOriginais.length === 0 && concParaInjetar.length === 0) {
      processedVendas.push(venda);
      return;
    }

    const recibosRetidos: TRecibo[] = [];
    recibosOriginais.forEach((recibo) => {
      const id = str(getReciboId(recibo));
      if (id && overriddenIds.has(id)) {
        removedBase += 1;
        return;
      }

      const numero = normalizeReceiptNumber(str(getReciboNumero(recibo)));
      if (numero && overriddenNumeros.has(numero)) {
        removedBase += 1;
        return;
      }

      const canceledAt = getReciboCanceledAt(recibo);
      if (canceledAt) {
        const reciboMes = toMonthKey(getReciboDataVenda(recibo));
        const cancelMes = toMonthKey(canceledAt);
        if (reciboMes && cancelMes && reciboMes === cancelMes) {
          removedBase += 1;
          return;
        }
      }

      recibosRetidos.push(recibo);
    });

    const recibosConciliados = concParaInjetar.map(buildSyntheticRecibo);
    injectedIntoExisting += recibosConciliados.length;

    const recibosFinais = [...recibosRetidos, ...recibosConciliados];
    if (recibosFinais.length === 0) return;

    processedVendas.push(withRecibos(venda, recibosFinais));
  });

  const syntheticVendas = orphans.map(buildSyntheticVenda);

  return {
    vendas: [...processedVendas, ...syntheticVendas],
    removedBase,
    injectedIntoExisting,
    syntheticCreated: syntheticVendas.length
  };
}
