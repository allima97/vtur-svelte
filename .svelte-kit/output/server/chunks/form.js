const estadosBrasil = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapa" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceara" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espirito Santo" },
  { value: "GO", label: "Goias" },
  { value: "MA", label: "Maranhao" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Para" },
  { value: "PB", label: "Paraiba" },
  { value: "PR", label: "Parana" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piaui" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondonia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "Sao Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" }
];
const classificacaoOptions = ["", "A", "B", "C", "D", "E"];
const generoOptions = ["", "Masculino", "Feminino", "Outros"];
function createInitialClienteForm() {
  return {
    nome: "",
    nascimento: "",
    cpf: "",
    tipo_pessoa: "PF",
    telefone: "",
    whatsapp: "",
    email: "",
    classificacao: "",
    endereco: "",
    numero: "",
    complemento: "",
    cidade: "",
    estado: "",
    cep: "",
    rg: "",
    genero: "",
    nacionalidade: "Brasileira",
    tags: "",
    tipo_cliente: "passageiro",
    notas: "",
    ativo: true,
    active: true
  };
}
function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}
function titleCaseAllWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ");
}
function formatDocumento(value, tipoPessoa) {
  const digits = onlyDigits(value).slice(0, tipoPessoa === "PJ" ? 14 : 11);
  if (tipoPessoa === "PJ") {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
function isValidCnpj(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const calc = (base, factors) => {
    const sum = base.split("").reduce((acc, num, index) => acc + Number(num) * factors[index], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits === `${digits.slice(0, 12)}${d1}${d2}`;
}
function parseTagsInput(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}
function joinTagsInput(value) {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
}
function buildClientePayload(form) {
  const tipoPessoa = form.tipo_pessoa || "PF";
  const documento = onlyDigits(form.cpf);
  return {
    nome: titleCaseAllWords(form.nome),
    nascimento: form.nascimento || null,
    cpf: documento || null,
    tipo_pessoa: tipoPessoa,
    telefone: form.telefone.trim() || null,
    whatsapp: form.whatsapp.trim() || null,
    email: form.email.trim() ? form.email.trim().toLowerCase() : null,
    classificacao: form.classificacao.trim() || null,
    endereco: form.endereco.trim() || null,
    numero: form.numero.trim() || null,
    complemento: form.complemento.trim() || null,
    cidade: form.cidade.trim() || null,
    estado: form.estado.trim() || null,
    cep: onlyDigits(form.cep) || null,
    rg: form.rg.trim() || null,
    genero: tipoPessoa === "PJ" ? null : form.genero.trim() || null,
    nacionalidade: tipoPessoa === "PJ" ? null : form.nacionalidade.trim() || null,
    tags: parseTagsInput(form.tags),
    tipo_cliente: form.tipo_cliente.trim() || "passageiro",
    notas: form.notas.trim() || null,
    ativo: Boolean(form.ativo),
    active: Boolean(form.active)
  };
}
function fillClienteFormFromApi(data) {
  const initial = createInitialClienteForm();
  if (!data) return initial;
  const tipoPessoa = data.tipo_pessoa === "PJ" || onlyDigits(data.cpf).length > 11 ? "PJ" : "PF";
  return {
    ...initial,
    nome: String(data.nome || ""),
    nascimento: String(data.nascimento || data.data_nascimento || "").slice(0, 10),
    cpf: formatDocumento(String(data.cpf || ""), tipoPessoa),
    tipo_pessoa: tipoPessoa,
    telefone: String(data.telefone || ""),
    whatsapp: String(data.whatsapp || ""),
    email: String(data.email || ""),
    classificacao: String(data.classificacao || ""),
    endereco: String(data.endereco || ""),
    numero: String(data.numero || ""),
    complemento: String(data.complemento || ""),
    cidade: String(data.cidade || ""),
    estado: String(data.estado || ""),
    cep: formatCep(String(data.cep || "")),
    rg: String(data.rg || ""),
    genero: String(data.genero || ""),
    nacionalidade: String(data.nacionalidade || (tipoPessoa === "PF" ? "Brasileira" : "")),
    tags: joinTagsInput(data.tags),
    tipo_cliente: String(data.tipo_cliente || "passageiro"),
    notas: String(data.notas || data.observacoes || ""),
    ativo: data.ativo !== false,
    active: data.active !== false
  };
}
function validateClienteForm(form) {
  const errors = {};
  const documentoDigits = onlyDigits(form.cpf);
  const telefoneDigits = onlyDigits(form.telefone);
  if (!String(form.nome || "").trim()) {
    errors.nome = "Informe o nome completo do cliente.";
  }
  if (!documentoDigits) {
    errors.cpf = form.tipo_pessoa === "PJ" ? "Informe o CNPJ do cliente." : "Informe o CPF do cliente.";
  } else if (form.tipo_pessoa === "PJ") {
    if (!isValidCnpj(documentoDigits)) {
      errors.cpf = "CNPJ invalido. Informe os 14 digitos corretamente.";
    }
  } else if (documentoDigits.length !== 11) {
    errors.cpf = "CPF invalido. Informe os 11 digitos corretamente.";
  }
  if (!telefoneDigits) {
    errors.telefone = "Informe o telefone do cliente.";
  } else if (telefoneDigits.length < 10) {
    errors.telefone = "Telefone invalido. Informe DDD e numero.";
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "E-mail invalido.";
  }
  const firstError = Object.values(errors)[0] || null;
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstError
  };
}
export {
  classificacaoOptions as a,
  buildClientePayload as b,
  createInitialClienteForm as c,
  estadosBrasil as e,
  fillClienteFormFromApi as f,
  generoOptions as g,
  validateClienteForm as v
};
