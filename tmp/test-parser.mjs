import { toISODateUTC } from '../src/lib/date.js';

const MONTH_INDEX = {
  jan: 0, janeiro: 0, fev: 1, fevereiro: 1, mar: 2, marco: 2, 'março': 2,
  abr: 3, abril: 3, mai: 4, maio: 4, jun: 5, junho: 5, jul: 6, julho: 6,
  ago: 7, agosto: 7, set: 8, setembro: 8, out: 9, outubro: 9, nov: 10, novembro: 10,
  dez: 11, dezembro: 11,
};
const DATE_RANGE_RE = /^(\d{1,2})\s+de\s+([a-zA-ZçÇãÃáÁàÀéÉêÊíÍóÓôÔõÕúÚ]+)\s*-\s*(\d{1,2})\s+de\s+([a-zA-ZçÇãÃáÁàÀéÉêÊíÍóÓôÔõÕúÚ]+)(?:\s*\((\d+)\s*dias?(?:\s*e\s*(\d+)\s*noites?)?\))?$/i;
const ROOM_LINE_RE = /^\d+\s+\S+/i;
const OCCUPANCY_LINE_RE = /^total\s*\(/i;
function normalizeText(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function normalizeLine(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function normalizeImportedHotelRegime(value) {
  const raw = normalizeLine(value); const normalized = normalizeText(raw);
  if (!normalized) return ''; if (normalized.includes('cafe da manha')) return 'Café da Manhã'; if (normalized.includes('meia pensao')) return 'Meia Pensão'; if (normalized.includes('pensao completa')) return 'Pensão Completa'; if (normalized.includes('all inclusive')) return 'All Inclusive'; if (normalized.includes('sem refeicao')) return 'Sem Refeição'; return raw;
}
function normalizeImportedHotelTarifa(value) {
  const raw = normalizeLine(value); const normalized = normalizeText(raw);
  if (!normalized) return ''; if (normalized.includes('nao reembols') || normalized.includes('não reembols')) return 'Não Reembolsável'; if (normalized.includes('reembols')) return 'Reembolsável'; return raw;
}
function parseMoney(value) { const numeric = String(value || '').replace(/[^\d,.$-]/g, '').replace(/\./g, '').replace(',', '.'); const parsed = Number(numeric); return Number.isFinite(parsed) ? parsed : 0; }
function extractMoneyValues(line) { return Array.from(String(line || '').matchAll(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/gi)).map((match) => parseMoney(match[1])).filter((value) => value > 0); }
function parseDate(day, monthLabel, year) { const monthIndex = MONTH_INDEX[normalizeText(monthLabel)]; if (monthIndex === undefined) return null; const date = new Date(Date.UTC(year, monthIndex, day)); return Number.isNaN(date.getTime()) ? null : date; }
function toIsoDate(date) { return toISODateUTC(date); }
function diffNights(start, end) { if (!start || !end) return 0; return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000)); }
function isRecommendedLine(line) { return normalizeText(line) === 'recomendado'; }
function isRoomLine(line) { return ROOM_LINE_RE.test(normalizeLine(line)); }
function isOccupancyLine(line) { return OCCUPANCY_LINE_RE.test(normalizeText(line)); }
function isRefundLine(line) { return normalizeText(line).includes('reembols'); }
function isAddressLine(line) { const normalized = normalizeLine(line); if (!normalized) return false; return /,/.test(normalized) || /\d/.test(normalized); }
function buildBlocks(text) { const blocks = []; let current = []; for (const rawLine of String(text || '').replace(/\r/g, '\n').split('\n')) { const line = normalizeLine(rawLine); if (!line) continue; if (DATE_RANGE_RE.test(line) && current.length > 0) { blocks.push(current); current = [line]; continue; } current.push(line); } if (current.length > 0) blocks.push(current); return blocks; }
function parseOccupancy(line) { const normalized = normalizeText(line); const adultsMatch = normalized.match(/(\d+)\s*adult/); const childrenMatch = normalized.match(/(\d+)\s*crianc/); return { qtd_adultos: adultsMatch?.[1] ? Number(adultsMatch[1]) : 0, qtd_criancas: childrenMatch?.[1] ? Number(childrenMatch[1]) : 0 }; }
function parseHotelBlock(block, index, referenceYear) {
  const [periodLine, ...restLines] = block; const periodMatch = periodLine.match(DATE_RANGE_RE); if (!periodMatch) return null;
  const startDay = Number(periodMatch[1]); const startMonth = periodMatch[2]; const endDay = Number(periodMatch[3]); const endMonth = periodMatch[4];
  let startDate = parseDate(startDay, startMonth, referenceYear); let endDate = parseDate(endDay, endMonth, referenceYear); if (!startDate || !endDate) return null; if (endDate.getTime() < startDate.getTime()) endDate = parseDate(endDay, endMonth, referenceYear + 1);
  const noitesFromText = periodMatch[6] ? Number(periodMatch[6]) : 0;
  const usefulLines = restLines.filter((line) => !isRecommendedLine(line)); if (usefulLines.length === 0) return null;
  const destinationLine = usefulLines[0] || ''; const cidade = normalizeLine(destinationLine.split(/\s+-\s+/)[0] || destinationLine);
  let cursor = 1; const hotel = usefulLines[cursor] || ''; if (!hotel) return null; cursor += 1;
  while (cursor < usefulLines.length && normalizeText(usefulLines[cursor]) === normalizeText(hotel)) cursor += 1;
  let endereco = ''; if (cursor < usefulLines.length && isAddressLine(usefulLines[cursor])) { endereco = usefulLines[cursor]; cursor += 1; }
  let qtd_apto = 0; let apto = ''; const roomLine = usefulLines.find((line, idx) => idx >= cursor && isRoomLine(line)) || ''; if (roomLine) { const roomMatch = roomLine.match(/^(\d+)\s+(.+)$/); qtd_apto = roomMatch?.[1] ? Number(roomMatch[1]) : 0; apto = normalizeLine(roomMatch?.[2] || roomLine); cursor = usefulLines.indexOf(roomLine, cursor) + 1; }
  let regime = ''; if (cursor < usefulLines.length && !isRefundLine(usefulLines[cursor]) && !isOccupancyLine(usefulLines[cursor])) { regime = usefulLines[cursor]; cursor += 1; }
  let tipo_tarifa = ''; if (cursor < usefulLines.length && isRefundLine(usefulLines[cursor])) { tipo_tarifa = usefulLines[cursor]; cursor += 1; } else { const refundLine = usefulLines.find((line, idx) => idx >= cursor && isRefundLine(line)); if (refundLine) { tipo_tarifa = refundLine; cursor = usefulLines.indexOf(refundLine, cursor) + 1; } }
  let qtd_adultos = 0; let qtd_criancas = 0; const occupancyLine = usefulLines.find((line, idx) => idx >= cursor && isOccupancyLine(line)); if (occupancyLine) { const occupancy = parseOccupancy(occupancyLine); qtd_adultos = occupancy.qtd_adultos; qtd_criancas = occupancy.qtd_criancas; cursor = usefulLines.indexOf(occupancyLine, cursor) + 1; }
  const monetaryLines = usefulLines.slice(cursor); let valor_original = 0; let valor_final = 0; let sawDiscountLine = false;
  for (const line of monetaryLines) { const values = extractMoneyValues(line); if (values.length === 0) continue; const normalized = normalizeText(line); if (normalized.includes('de r$') && normalized.includes(' por')) { sawDiscountLine = true; valor_original = values[0] || 0; if (values.length > 1) valor_final = values[values.length - 1] || valor_final; continue; } if (sawDiscountLine) { valor_final = values[values.length - 1] || valor_final; continue; } valor_final = values[values.length - 1] || valor_final; }
  if (!valor_final && valor_original) valor_final = valor_original;
  const noites = noitesFromText || diffNights(startDate, endDate);
  return { cidade, hotel: normalizeLine(hotel), endereco, data_inicio: toIsoDate(startDate), data_fim: toIsoDate(endDate), noites, qtd_apto, apto, categoria: '', regime: normalizeImportedHotelRegime(regime), tipo_tarifa: normalizeImportedHotelTarifa(tipo_tarifa), qtd_adultos, qtd_criancas, valor_original, valor_final, ordem: index };
}
function parseImportedRoteiroHotels(text, referenceDate) { const referenceYear = referenceDate.getFullYear(); return buildBlocks(text).map((block, index) => parseHotelBlock(block, index, referenceYear)).filter(Boolean); }

const exemplo = `Selecionado
Excluir
11 de ago - 17 de ago (7 dias e 6 noites)
Maceio - Alagoas
Preferencial
Hotel Expresso R1 Maceio
Hotel Expresso R1 Maceio
Avenida joão davino 386
1 Standard
Café da manhã
Reembolsável
Total (2 Adultos)
R$ 1.359,77
Detalhes`;

console.log(JSON.stringify(parseImportedRoteiroHotels(exemplo, new Date(2026, 0, 1)), null, 2));
