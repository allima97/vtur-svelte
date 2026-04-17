import { buildPassengerSummary, createEmptyVoucherExtraData, normalizeVoucherExtraData } from "./extraData";
import type {
  VoucherDia,
  VoucherExtraData,
  VoucherHotel,
  VoucherImportResult,
  VoucherPassengerDetail,
  VoucherProvider,
  VoucherTransferInfo,
} from "./types";

const MONTH_INDEX: Record<string, number> = {
  jan: 0, janeiro: 0,
  fev: 1, fevereiro: 1,
  mar: 2, marco: 2, "março": 2,
  abr: 3, abril: 3,
  mai: 4, maio: 4,
  jun: 5, junho: 5,
  jul: 6, julho: 6,
  ago: 7, agosto: 7,
  set: 8, setembro: 8,
  out: 9, outubro: 9,
  nov: 10, novembro: 10,
  dez: 11, dezembro: 11,
};

function normalizeText(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanLine(value?: string | null) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/^[:\s-–—]+|[:\s-–—]+$/g, "")
    .trim();
}

function cleanMultilineText(value?: string | null) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\u2028/g, "\n")
    .replace(/\u2029/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function diffNights(start?: string | null, end?: string | null) {
  const startDate = start ? new Date(`${start}T12:00:00`) : null;
  const endDate = end ? new Date(`${end}T12:00:00`) : null;
  if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
}

function fileExt(name: string) {
  const raw = String(name || "").trim();
  const idx = raw.lastIndexOf(".");
  return idx >= 0 ? raw.slice(idx + 1).toLowerCase() : "";
}

function parseIsoDateLoose(value?: string | null, fallbackYear?: number | null) {
  const raw = cleanLine(value);
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])));
    return Number.isNaN(date.getTime()) ? "" : toIsoDate(date);
  }

  const brMatch = raw.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/);
  if (brMatch) {
    const year = brMatch[3] ? Number(brMatch[3]) : Number(fallbackYear || 0);
    if (!year) return "";
    const date = new Date(Date.UTC(year, Number(brMatch[2]) - 1, Number(brMatch[1])));
    return Number.isNaN(date.getTime()) ? "" : toIsoDate(date);
  }

  const longMatch = normalizeText(raw).match(/(\d{1,2}) de ([a-zçãõáéíóú]+) de (\d{4})/i);
  if (longMatch) {
    const monthIndex = MONTH_INDEX[normalizeText(longMatch[2])];
    if (monthIndex === undefined) return "";
    const date = new Date(Date.UTC(Number(longMatch[3]), monthIndex, Number(longMatch[1])));
    return Number.isNaN(date.getTime()) ? "" : toIsoDate(date);
  }

  return "";
}

function titleCaseKeepAcronyms(value?: string | null) {
  const raw = cleanLine(value);
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .map((part) => {
      if (/^[A-Z0-9À-ÖØ-Þ]{2,}$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function stripHotelStars(value?: string | null) {
  return cleanLine(value).replace(/\s*\*{2,5}\s*$/g, "").trim();
}

function normalizeHotelKey(hotel: VoucherHotel) {
  return [
    normalizeText(hotel.cidade),
    normalizeText(hotel.hotel),
    normalizeText(hotel.endereco),
    normalizeText(hotel.telefone),
    normalizeText(hotel.contato),
    normalizeText(hotel.status),
  ].join("|");
}

function mergeConsecutiveHotels(items: VoucherHotel[]) {
  const sorted = items.slice().sort((a, b) => {
    const dateCompare = String(a.data_inicio || "").localeCompare(String(b.data_inicio || ""));
    if (dateCompare !== 0) return dateCompare;
    return a.ordem - b.ordem;
  });

  const merged: VoucherHotel[] = [];

  for (const hotel of sorted) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.data_fim &&
      hotel.data_inicio &&
      last.data_fim === hotel.data_inicio &&
      normalizeHotelKey(last) === normalizeHotelKey(hotel)
    ) {
      last.data_fim = hotel.data_fim || last.data_fim;
      last.noites = diffNights(last.data_inicio, last.data_fim);
      const obs = [last.observacao, hotel.observacao].map(cleanLine).filter(Boolean);
      last.observacao = Array.from(new Set(obs)).join(" | ");
      continue;
    }
    merged.push({ ...hotel });
  }

  return merged.map((hotel, index) => ({ ...hotel, ordem: index }));
}

function looksLikeCityLine(value?: string | null) {
  const raw = cleanLine(value);
  if (!raw) return false;
  const normalized = normalizeText(raw);
  if (!/[a-z]/i.test(raw)) return false;
  if (
    normalized.startsWith("datas") ||
    normalized.startsWith("endereco") ||
    normalized.startsWith("codigo postal") ||
    normalized.startsWith("numero de telefone") ||
    normalized.startsWith("hotel pendente") ||
    normalized.startsWith("itinerario de viagem") ||
    normalized.startsWith("lista de hoteis")
  ) {
    return false;
  }

  const letters = raw.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  if (!letters) return false;
  const upper = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, "");
  return upper.length / letters.length >= 0.6;
}

function parsePassengerLine(line: string): Partial<VoucherPassengerDetail> | null {
  const raw = cleanLine(line);
  if (!raw) return null;

  const withDoc = raw.match(/^(.+?)\s*[-–—]\s*(?:passaporte|doc|doc\.?|documento)?\s*:?\s*(\w{6,})\s*$/i);
  if (withDoc) {
    return { nome: titleCaseKeepAcronyms(withDoc[1]), passaporte: withDoc[2].toUpperCase() };
  }

  const nameOnly = raw.match(/^([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,})$/);
  if (nameOnly) {
    return { nome: titleCaseKeepAcronyms(nameOnly[1]) };
  }

  return null;
}

export function createEmptyVoucherImport(provider: VoucherProvider): VoucherImportResult {
  return {
    provider,
    nome: "",
    codigo_systur: "",
    codigo_fornecedor: "",
    reserva_online: "",
    passageiros: "",
    tipo_acomodacao: "",
    operador: "",
    resumo: "",
    data_inicio: "",
    data_fim: "",
    dias: [],
    hoteis: [],
    extra_data: createEmptyVoucherExtraData(provider),
  };
}

export function mergeVoucherImport(
  base: Omit<VoucherImportResult, "extra_data"> & { extra_data?: VoucherExtraData },
  incoming: Partial<VoucherImportResult>
): VoucherImportResult {
  const merged: VoucherImportResult = {
    provider: incoming.provider || base.provider,
    nome: incoming.nome || base.nome,
    codigo_systur: incoming.codigo_systur || base.codigo_systur,
    codigo_fornecedor: incoming.codigo_fornecedor || base.codigo_fornecedor,
    reserva_online: incoming.reserva_online || base.reserva_online,
    passageiros: incoming.passageiros || base.passageiros,
    tipo_acomodacao: incoming.tipo_acomodacao || base.tipo_acomodacao,
    operador: incoming.operador || base.operador,
    resumo: incoming.resumo || base.resumo,
    data_inicio: incoming.data_inicio || base.data_inicio,
    data_fim: incoming.data_fim || base.data_fim,
    dias: incoming.dias || base.dias || [],
    hoteis: incoming.hoteis || base.hoteis || [],
    extra_data: normalizeVoucherExtraData(
      { ...base.extra_data, ...incoming.extra_data },
      incoming.provider || base.provider
    ),
  };
  return merged;
}

export function parseVoucherImportText(text: string, provider: VoucherProvider): VoucherImportResult {
  const result = createEmptyVoucherImport(provider);
  const normalized = cleanMultilineText(text);
  if (!normalized) return result;

  const blocks = normalized.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n").map(cleanLine).filter(Boolean);
    if (!lines.length) continue;

    const header = lines[0];
    if (/^dias?\s*[:\-]/i.test(header)) {
      result.dias = parseDayLines(lines.slice(1));
    } else if (/^hoteis?\s*[:\-]/i.test(header)) {
      result.hoteis = parseHotelLines(lines.slice(1));
    } else if (/^passageiros?\s*[:\-]/i.test(header)) {
      const passengers = lines.slice(1).map(parsePassengerLine).filter(Boolean) as VoucherPassengerDetail[];
      result.extra_data.passageiros_detalhes = passengers.map((p, i) => ({ ...p, ordem: i } as VoucherPassengerDetail));
      result.passageiros = buildPassengerSummary(result.extra_data.passageiros_detalhes);
    }
  }

  return result;
}

function parseDayLines(lines: string[]): VoucherDia[] {
  const dias: VoucherDia[] = [];
  let current: Partial<VoucherDia> | null = null;

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;

    const dayMatch = line.match(/^dia\s*(\d+)[\s:.-]+(.+)$/i);
    if (dayMatch) {
      if (current) dias.push({ ...current, descricao: String(current.descricao || "").trim() } as VoucherDia);
      current = { dia_numero: Number(dayMatch[1]), titulo: dayMatch[2], descricao: "", ordem: dias.length };
    } else if (current) {
      current.descricao = (current.descricao ? current.descricao + "\n" : "") + line;
    }
  }

  if (current) dias.push({ ...current, descricao: String(current.descricao || "").trim() } as VoucherDia);
  return dias;
}

function parseHotelLines(lines: string[]): VoucherHotel[] {
  const hoteis: VoucherHotel[] = [];
  let current: Partial<VoucherHotel> = {};

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;

    if (looksLikeCityLine(line)) {
      if (current.cidade && current.hotel) {
        hoteis.push({ ...current, ordem: hoteis.length } as VoucherHotel);
      }
      current = { cidade: titleCaseKeepAcronyms(line) };
    } else if (/^hotel\s*[:\-]/i.test(line)) {
      current.hotel = titleCaseKeepAcronyms(line.replace(/^hotel\s*[:\-]/i, ""));
    } else if (/^endere[çc]o\s*[:\-]/i.test(line)) {
      current.endereco = line.replace(/^endere[çc]o\s*[:\-]/i, "").trim();
    } else if (/^(?:data\s*)?in[íi]cio\s*[:\-]/i.test(line)) {
      current.data_inicio = parseIsoDateLoose(line.replace(/^(?:data\s*)?in[íi]cio\s*[:\-]/i, ""));
    } else if (/^(?:data\s*)?fim\s*[:\-]/i.test(line)) {
      current.data_fim = parseIsoDateLoose(line.replace(/^(?:data\s*)?fim\s*[:\-]/i, ""));
    }
  }

  if (current.cidade && current.hotel) {
    hoteis.push({ ...current, ordem: hoteis.length } as VoucherHotel);
  }

  return hoteis.map((h) => ({
    ...h,
    noites: diffNights(h.data_inicio, h.data_fim),
  }));
}

export function parseSpecialToursCircuitPasteText(text: string): VoucherImportResult {
  const result = createEmptyVoucherImport("special_tours");
  const normalized = cleanMultilineText(text);
  if (!normalized) return result;

  const lines = normalized.split("\n").map(cleanLine).filter(Boolean);

  let inItinerary = false;
  let inHotels = false;
  const dayLines: string[] = [];
  const hotelLines: string[] = [];

  for (const line of lines) {
    const lower = normalizeText(line);

    if (lower.includes("itinerario") || lower.includes("dia a dia")) {
      inItinerary = true;
      inHotels = false;
      continue;
    }
    if (lower.includes("hotel") && (lower.includes("confirmado") || lower.includes("lista"))) {
      inItinerary = false;
      inHotels = true;
      continue;
    }

    if (inItinerary) dayLines.push(line);
    if (inHotels) hotelLines.push(line);
  }

  result.dias = parseSpecialToursDays(dayLines);
  result.hoteis = parseSpecialToursHotels(hotelLines);

  return result;
}

function parseSpecialToursDays(lines: string[]): VoucherDia[] {
  const dias: VoucherDia[] = [];
  let current: Partial<VoucherDia> | null = null;

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;

    const dayMatch = line.match(/^(\d+)[\s:.-]+(.+)$/);
    if (dayMatch) {
      if (current) dias.push({ ...current, descricao: String(current.descricao || "").trim() } as VoucherDia);
      current = { dia_numero: Number(dayMatch[1]), titulo: dayMatch[2], descricao: "", ordem: dias.length };
    } else if (current) {
      current.descricao = (current.descricao ? current.descricao + "\n" : "") + line;
    }
  }

  if (current) dias.push({ ...current, descricao: String(current.descricao || "").trim() } as VoucherDia);
  return dias;
}

function parseSpecialToursHotels(lines: string[]): VoucherHotel[] {
  const hoteis: VoucherHotel[] = [];
  let currentCity = "";

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;

    if (looksLikeCityLine(line)) {
      currentCity = titleCaseKeepAcronyms(line);
      continue;
    }

    if (currentCity) {
      const hotelName = stripHotelStars(line);
      if (hotelName && hotelName.length > 3) {
        hoteis.push({
          cidade: currentCity,
          hotel: titleCaseKeepAcronyms(hotelName),
          ordem: hoteis.length,
        });
      }
    }
  }

  return hoteis;
}

export function parseSpecialToursHotelPaste(text: string): VoucherImportResult {
  const result = createEmptyVoucherImport("special_tours");
  result.hoteis = parseSpecialToursHotels(text.split("\n"));
  return result;
}

export async function extractVoucherImportFromFile(file: File, provider: VoucherProvider): Promise<VoucherImportResult> {
  const ext = fileExt(file.name);
  
  if (ext === "txt") {
    const text = await file.text();
    return provider === "special_tours" 
      ? parseSpecialToursCircuitPasteText(text)
      : parseVoucherImportText(text, provider);
  }
  
  throw new Error("Formato não suportado. Use arquivo .txt ou copie e cole o texto.");
}
