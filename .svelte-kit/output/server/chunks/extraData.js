function textValue(value) {
  return String(value || "").trim();
}
function normalizeDateValue(value) {
  const raw = textValue(value);
  if (!raw) return "";
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  return raw;
}
function normalizePassengerDetail(value, index) {
  return {
    nome: textValue(value?.nome),
    passenger_id: textValue(value?.passenger_id) || null,
    tipo: textValue(value?.tipo) || null,
    passaporte: textValue(value?.passaporte) || null,
    data_nascimento: normalizeDateValue(value?.data_nascimento) || null,
    nacionalidade: textValue(value?.nacionalidade) || null,
    ordem: Number.isFinite(Number(value?.ordem)) ? Number(value.ordem) : index
  };
}
function normalizeTransferInfo(value) {
  return {
    detalhes: textValue(value?.detalhes) || null,
    notas: textValue(value?.notas) || null,
    telefone_transferista: textValue(value?.telefone_transferista) || null
  };
}
function normalizeEmergencyInfo(value) {
  return {
    escritorio: textValue(value?.escritorio) || null,
    emergencia_24h: textValue(value?.emergencia_24h) || null,
    whatsapp: textValue(value?.whatsapp) || null
  };
}
function normalizeAppInfo(value, index) {
  return {
    nome: textValue(value?.nome),
    descricao: textValue(value?.descricao) || null,
    ordem: Number.isFinite(Number(value?.ordem)) ? Number(value.ordem) : index
  };
}
function createEmptyVoucherExtraData(_provider) {
  return {
    localizador_agencia: "",
    passageiros_detalhes: [],
    traslado_chegada: {
      detalhes: "",
      notas: "",
      telefone_transferista: ""
    },
    traslado_saida: {
      detalhes: "",
      notas: "",
      telefone_transferista: ""
    },
    informacoes_importantes: "",
    apps_recomendados: [],
    emergencia: {
      escritorio: "",
      emergencia_24h: "",
      whatsapp: ""
    }
  };
}
function normalizeVoucherExtraData(value, provider) {
  const empty = createEmptyVoucherExtraData();
  const raw = value && typeof value === "object" ? value : {};
  return {
    localizador_agencia: textValue(raw.localizador_agencia) || empty.localizador_agencia || "",
    passageiros_detalhes: Array.isArray(raw.passageiros_detalhes) ? raw.passageiros_detalhes.map((item, index) => normalizePassengerDetail(item, index)).filter((item) => item.nome).sort((a, b) => a.ordem - b.ordem) : [],
    traslado_chegada: normalizeTransferInfo(raw.traslado_chegada || empty.traslado_chegada),
    traslado_saida: normalizeTransferInfo(raw.traslado_saida || empty.traslado_saida),
    informacoes_importantes: textValue(raw.informacoes_importantes) || "",
    apps_recomendados: Array.isArray(raw.apps_recomendados) ? raw.apps_recomendados.map((item, index) => normalizeAppInfo(item, index)).filter((item) => item.nome || item.descricao).sort((a, b) => a.ordem - b.ordem) : [],
    emergencia: normalizeEmergencyInfo(raw.emergencia || empty.emergencia)
  };
}
function splitLinesFromMultilineText(value) {
  return textValue(value).split(/\n+/).map((line) => line.trim()).filter(Boolean);
}
export {
  createEmptyVoucherExtraData as c,
  normalizeVoucherExtraData as n,
  splitLinesFromMultilineText as s
};
