import type {
  VoucherAppInfo,
  VoucherEmergencyInfo,
  VoucherExtraData,
  VoucherPassengerDetail,
  VoucherProvider,
  VoucherTransferInfo,
} from "./types";

function textValue(value?: string | null) {
  return String(value || "").trim();
}

function normalizeDateValue(value?: string | null) {
  const raw = textValue(value);
  if (!raw) return "";
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  return raw;
}

function normalizePassengerDetail(value: any, index: number): VoucherPassengerDetail {
  return {
    nome: textValue(value?.nome),
    passenger_id: textValue(value?.passenger_id) || null,
    tipo: textValue(value?.tipo) || null,
    passaporte: textValue(value?.passaporte) || null,
    data_nascimento: normalizeDateValue(value?.data_nascimento) || null,
    nacionalidade: textValue(value?.nacionalidade) || null,
    ordem: Number.isFinite(Number(value?.ordem)) ? Number(value.ordem) : index,
  };
}

function normalizeTransferInfo(value: any): VoucherTransferInfo {
  return {
    detalhes: textValue(value?.detalhes) || null,
    notas: textValue(value?.notas) || null,
    telefone_transferista: textValue(value?.telefone_transferista) || null,
  };
}

function normalizeEmergencyInfo(value: any): VoucherEmergencyInfo {
  return {
    escritorio: textValue(value?.escritorio) || null,
    emergencia_24h: textValue(value?.emergencia_24h) || null,
    whatsapp: textValue(value?.whatsapp) || null,
  };
}

function normalizeAppInfo(value: any, index: number): VoucherAppInfo {
  return {
    nome: textValue(value?.nome),
    descricao: textValue(value?.descricao) || null,
    ordem: Number.isFinite(Number(value?.ordem)) ? Number(value.ordem) : index,
  };
}

export function createBlankPassengerDetail(index: number): VoucherPassengerDetail {
  return {
    nome: "",
    passenger_id: "",
    tipo: "",
    passaporte: "",
    data_nascimento: "",
    nacionalidade: "",
    ordem: index,
  };
}

export function createBlankAppInfo(index: number): VoucherAppInfo {
  return {
    nome: "",
    descricao: "",
    ordem: index,
  };
}

export function createEmptyVoucherExtraData(_provider?: VoucherProvider): VoucherExtraData {
  return {
    localizador_agencia: "",
    passageiros_detalhes: [],
    traslado_chegada: {
      detalhes: "",
      notas: "",
      telefone_transferista: "",
    },
    traslado_saida: {
      detalhes: "",
      notas: "",
      telefone_transferista: "",
    },
    informacoes_importantes: "",
    apps_recomendados: [],
    emergencia: {
      escritorio: "",
      emergencia_24h: "",
      whatsapp: "",
    },
  };
}

export function normalizeVoucherExtraData(value: any, provider?: VoucherProvider): VoucherExtraData {
  const empty = createEmptyVoucherExtraData(provider);
  const raw = value && typeof value === "object" ? value : {};
  return {
    localizador_agencia: textValue(raw.localizador_agencia) || empty.localizador_agencia || "",
    passageiros_detalhes: Array.isArray(raw.passageiros_detalhes)
      ? raw.passageiros_detalhes
          .map((item: any, index: number) => normalizePassengerDetail(item, index))
          .filter((item: VoucherPassengerDetail) => item.nome)
          .sort((a: VoucherPassengerDetail, b: VoucherPassengerDetail) => a.ordem - b.ordem)
      : [],
    traslado_chegada: normalizeTransferInfo(raw.traslado_chegada || empty.traslado_chegada),
    traslado_saida: normalizeTransferInfo(raw.traslado_saida || empty.traslado_saida),
    informacoes_importantes: textValue(raw.informacoes_importantes) || "",
    apps_recomendados: Array.isArray(raw.apps_recomendados)
      ? raw.apps_recomendados
          .map((item: any, index: number) => normalizeAppInfo(item, index))
          .filter((item: VoucherAppInfo) => item.nome || item.descricao)
          .sort((a: VoucherAppInfo, b: VoucherAppInfo) => a.ordem - b.ordem)
      : [],
    emergencia: normalizeEmergencyInfo(raw.emergencia || empty.emergencia),
  };
}

export function buildPassengerSummary(details: VoucherPassengerDetail[]) {
  return details
    .map((item) => textValue(item.nome))
    .filter(Boolean)
    .join("\n");
}

export function splitLinesFromMultilineText(value?: string | null) {
  return textValue(value)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
