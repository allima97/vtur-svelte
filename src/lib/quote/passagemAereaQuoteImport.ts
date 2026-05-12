import {
  parseImportedRoteiroAereo,
  type ImportedRoteiroAereo
} from '$lib/roteiroAereoImport';
import type { QuoteDraft, QuoteItemDraft, QuoteSegmentDraft } from '$lib/quote/types';

export type PassagemAereaFonte = 'auto' | 'rextur' | 'cvc';

export type PassagemAereaQuoteResult = {
  draft: QuoteDraft;
  trechos: ImportedRoteiroAereo[];
  fonteDetectada: PassagemAereaFonte;
  dataInicio: string;
  dataFim: string;
  destino: string;
};

function normalizeTextForParser(text: string) {
  return String(text || '')
    .replace(/(^|\n)\s*ia(\s+|\t+)Voo(\s+|\t+)Sa[íi]da/gi, '$1Cia$2Voo$3Saída')
    .trim();
}

function normalizeLookup(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseMoney(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findAmount(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const amount = parseMoney(match?.[1]);
    if (amount > 0) return amount;
  }
  return 0;
}

function detectFonte(text: string, hint: PassagemAereaFonte): PassagemAereaFonte {
  if (hint !== 'auto') return hint;
  const normalized = normalizeLookup(text);
  if (
    normalized.includes('filial:') ||
    normalized.includes('orcamento da sua viagem') ||
    normalized.includes('total de') ||
    normalized.includes('selecionado')
  ) {
    return 'cvc';
  }
  if (
    normalized.includes('rextur') ||
    normalized.includes('cia voo saida chegada') ||
    normalized.includes('air france') ||
    normalized.includes('klm royal')
  ) {
    return 'rextur';
  }
  return 'auto';
}

function extractPassengerCount(text: string, imported: ImportedRoteiroAereo[]) {
  const labelMatch = text.match(/Total\s*\(([^)]*)\)/i);
  const label = labelMatch?.[1] || '';
  let count = 0;

  const adulto = label.match(/(\d+)\s*Adult/i);
  const crianca = label.match(/(\d+)\s*Crian/i);
  if (adulto) count += Number(adulto[1]) || 0;
  if (crianca) count += Number(crianca[1]) || 0;

  let fromRows = 0;
  for (const item of imported) {
    fromRows = Math.max(fromRows, Number(item.qtd_adultos || 0) + Number(item.qtd_criancas || 0));
  }
  return Math.max(1, count || fromRows || 1);
}

function splitCents(total: number, count: number) {
  if (count <= 0) return [];
  const cents = Math.round((Number(total) || 0) * 100);
  const base = Math.floor(cents / count);
  let remainder = cents - base * count;
  return Array.from({ length: count }, () => {
    const value = base + (remainder > 0 ? 1 : 0);
    remainder -= remainder > 0 ? 1 : 0;
    return value / 100;
  });
}

function firstDate(imported: ImportedRoteiroAereo[]) {
  const dates: string[] = [];
  for (const item of imported) {
    const date = String(item.data_inicio || item.data_voo || '').trim();
    if (date) dates.push(date);
  }
  return dates.sort()[0] || '';
}

function lastDate(imported: ImportedRoteiroAereo[]) {
  const dates: string[] = [];
  for (const item of imported) {
    const date = String(item.data_fim || item.data_voo || item.data_inicio || '').trim();
    if (date) dates.push(date);
  }
  return dates.sort().at(-1) || '';
}

function splitTrecho(value?: string | null) {
  const parts = String(value || '')
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    origem: parts[0] || '',
    destino: parts[1] || ''
  };
}

function airportToCity(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutCode = raw.replace(/\s*\([A-Z]{3}\)\s*$/i, '').trim();
  return withoutCode
    .split(/\s*-\s*/)
    .map((part) => part.trim())
    .filter(Boolean)[0] || withoutCode;
}

function deriveDestino(imported: ImportedRoteiroAereo[]) {
  const last = imported.at(-1);
  if (!last) return '';
  const trecho = splitTrecho(last.trecho);
  return trecho.destino || airportToCity(last.aeroporto_chegada);
}

function deriveRouteLabel(imported: ImportedRoteiroAereo[]) {
  const first = imported[0];
  const last = imported.at(-1);
  if (!first || !last) return 'Passagem Aérea';

  const origem = splitTrecho(first.trecho).origem || airportToCity(first.aeroporto_saida);
  const destino = splitTrecho(last.trecho).destino || airportToCity(last.aeroporto_chegada);
  return [origem, destino].filter(Boolean).join(' - ') || 'Passagem Aérea';
}

function extractTotals(text: string, imported: ImportedRoteiroAereo[]) {
  const totalCvc =
    findAmount(text, [
      /Total\s+de[\s\S]{0,60}?R\$\s*([\d.]+,\d{2})/i,
      /Total\s*\([^)]*\)[\s\S]{0,60}?R\$\s*([\d.]+,\d{2})/i
    ]) || 0;

  const totalUsd = findAmount(text, [/US\$\s*([\d.]+,\d{2})/i]);
  const taxes =
    findAmount(text, [/Taxas\s+e\s+impostos[\s\S]{0,60}?R\$\s*([\d.]+,\d{2})/i]) ||
    imported.reduce((sum, item) => sum + Number(item.taxas || 0), 0);
  const totalImported = imported.reduce((sum, item) => sum + Number(item.valor_total || 0), 0);
  const total = totalCvc || totalUsd || totalImported;
  const currency = totalUsd && !totalCvc ? 'USD' : 'BRL';

  return {
    total: Number(total.toFixed(2)),
    taxes: Number(taxes.toFixed(2)),
    currency
  };
}

function buildFlightSegments(
  imported: ImportedRoteiroAereo[],
  total: number,
  taxes: number
): QuoteSegmentDraft[] {
  const totals = splitCents(total, imported.length);
  const taxParts = splitCents(taxes, imported.length);

  return imported.map((flight, index) => ({
    segment_type: 'flight',
    order_index: index,
    data: {
      ...flight,
      valor_total: totals[index] ?? Number(flight.valor_total || 0),
      taxas: taxParts[index] ?? Number(flight.taxas || 0)
    }
  }));
}

export function buildPassagemAereaQuoteDraftFromText(
  text: string,
  options: { fonte?: PassagemAereaFonte } = {}
): PassagemAereaQuoteResult {
  const normalizedText = normalizeTextForParser(text);
  const fonteDetectada = detectFonte(normalizedText, options.fonte || 'auto');
  const imported = parseImportedRoteiroAereo(normalizedText, new Date());

  if (imported.length === 0) {
    throw new Error('Nenhum trecho aéreo foi identificado no texto colado.');
  }

  const ordered = imported
    .slice()
    .sort((a, b) => {
      const dateCompare = String(a.data_inicio || a.data_voo || '').localeCompare(
        String(b.data_inicio || b.data_voo || '')
      );
      if (dateCompare !== 0) return dateCompare;
      return String(a.hora_saida || '').localeCompare(String(b.hora_saida || ''));
    })
    .map((item, index) => ({ ...item, ordem: index }));

  const extractedAt = new Date().toISOString();
  const quantidade = extractPassengerCount(normalizedText, ordered);
  const { total, taxes, currency } = extractTotals(normalizedText, ordered);
  const subtotal = Math.max(Number((total - taxes).toFixed(2)), 0);
  const dataInicio = firstDate(ordered);
  const dataFim = lastDate(ordered) || dataInicio;
  const destino = deriveDestino(ordered);
  const routeLabel = deriveRouteLabel(ordered);
  const segments = buildFlightSegments(ordered, subtotal, taxes);

  const item: QuoteItemDraft = {
    temp_id: `passagem-aerea-${Date.now()}`,
    item_type: 'Passagem Aérea',
    title: routeLabel === 'Passagem Aérea' ? 'Passagem Aérea' : `Passagem Aérea - ${routeLabel}`,
    product_name: 'Passagem Aérea',
    city_name: destino,
    quantity: quantidade,
    unit_price: quantidade > 0 ? subtotal / quantidade : subtotal,
    total_amount: subtotal,
    taxes_amount: taxes,
    start_date: dataInicio,
    end_date: dataFim,
    currency,
    confidence: 0.9,
    order_index: 0,
    segments,
    raw: {
      source: 'text',
      format: 'passagem_aerea',
      provider: fonteDetectada,
      aereo_import: {
        tipo: 'Passagem Aérea',
        trecho: routeLabel,
        quantidade,
        data_inicio: dataInicio,
        data_fim: dataFim,
        valor_total: subtotal,
        valor_total_com_taxas: total,
        taxas: taxes,
        segmentos: ordered
      }
    }
  };

  const draft: QuoteDraft = {
    source: 'CVC_TEXT',
    status: 'IMPORTED',
    currency,
    total: subtotal,
    average_confidence: item.confidence,
    items: [item],
    meta: {
      file_name: fonteDetectada === 'rextur' ? 'passagem-aerea-rextur' : 'passagem-aerea',
      page_count: 1,
      extracted_at: extractedAt
    },
    raw_json: {
      source: 'PASSAGEM_AEREA_TEXT',
      provider: fonteDetectada,
      extracted_at: extractedAt,
      text_length: normalizedText.length,
      raw_text: normalizedText,
      flights: ordered
    }
  };

  return {
    draft,
    trechos: ordered,
    fonteDetectada,
    dataInicio,
    dataFim,
    destino
  };
}
