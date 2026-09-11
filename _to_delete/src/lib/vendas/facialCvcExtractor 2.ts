/**
 * Extractor para o formato "Bilhete Aéreo (Facial CVC)".
 *
 * Campos extraídos:
 *  - Número da Reserva CVC
 *  - Número do Recibo (ex: 5630-0000083692)
 *  - Contratante (nome — sem CPF no documento)
 *  - Passageiros: nome, sobrenome, tarifa, taxa DU, taxas, nascimento, bilhete
 *  - Trechos de voo: companhia, número, origem, destino, partida, chegada
 *  - Valor total: campo "Valores Totais" ou "Cartão cia aérea" ou soma dos passageiros
 *  - Data da reserva
 *
 * Regras fixas:
 *  - Forma pagamento = "CARTÃO DE CRÉDITO 1X"
 *  - CPF ausente no documento — modal de CPF obrigatório deve ser exibido
 */

import type { ContratoDraft, PassageiroDraft, PagamentoDraft } from './contratoCvcExtractor';

function parseCurrencyBR(value: string | null | undefined): number | null {
  if (!value) return null;
  const clean = String(value).replace(/R\$\s*/gi, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(clean);
  return isFinite(n) ? n : null;
}

function parseDateBR(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return value.slice(0, 10);
  return null;
}

function normalizeWS(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

type ParsedPassengerLine = {
  tarifa: number;
  du: number;
  taxas: number;
};

function sumCaixaValues(text: string): number | null {
  const caixaStart = text.search(/^\s*Caixa\s*$/im);
  if (caixaStart < 0) return null;

  const afterCaixa = text.slice(caixaStart);
  const caixaEnd = afterCaixa.search(/^\s*(?:Cart[oã]o\s+cia\s+a[eé]rea|Transa[cç][õo]es)\b/im);
  const caixaBlock = caixaEnd >= 0 ? afterCaixa.slice(0, caixaEnd) : afterCaixa;

  const values = caixaBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{3,5}\s+/.test(line))
    .map((line) => parseCurrencyBR(line.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*$/)?.[1]))
    .filter((value): value is number => value !== null);

  const total = values.reduce((sum, value) => sum + value, 0);
  return total > 0 ? total : null;
}

export function extractFacialCvcFromText(text: string): { contratos: ContratoDraft[]; raw_text: string } {
  const flat = normalizeWS(text);

  // ── TIPO de bilhete ──────────────────────────────────────────────────────────
  const isInternacional = /bilhete aéreo internacional/i.test(text);
  const isNacional = /bilhete aéreo nacional/i.test(text);
  const tipoBilhete = isInternacional ? 'Aéreo Internacional' : isNacional ? 'Aéreo Nacional' : 'Aéreo';

  // ── RESERVA CVC ──────────────────────────────────────────────────────────────
  const reservaMatch =
    flat.match(/Reserva\s+CVC\s+N[\s\wÀ-ú]*?(\d{8,12})/i) ||
    flat.match(/Reserva\s+CVC\b.{0,120}?(\d{8,12})/i);
  const numeroReserva = reservaMatch?.[1]?.trim() || null;
  if (!numeroReserva) throw new Error('Número da Reserva CVC não encontrado.');

  // ── DATA DA RESERVA ──────────────────────────────────────────────────────────
  const dataReservaMatch = flat.match(/Data da Reserva\s+(\d{2}\/\d{2}\/\d{4})/i);
  const dataReserva = parseDateBR(dataReservaMatch?.[1]) || null;

  // ── RECIBO ───────────────────────────────────────────────────────────────────
  const reciboMatch = flat.match(/(\d{4}-\d{10,})/);
  const numeroRecibo = reciboMatch?.[1]?.trim() || null;

  // ── CONTRATANTE ───────────────────────────────────────────────────────────────
  // "Contratante Nome do Contratante Recibo NOME_CONTRATANTE 5630-000..."
  const contratanteMatch = flat.match(/Contratante\s+Nome\s+do\s+Contratante\s+Recibo\s+([\w\sÀ-ú]+?)\s+\d{4}-\d/i);
  const nomeContratante = contratanteMatch?.[1]?.trim() || null;
  if (!nomeContratante) throw new Error('Nome do contratante não encontrado.');

  // ── TRECHOS DE VOO ────────────────────────────────────────────────────────────
  // "G3 1594 CGH - SÃO PAULO- CONGONHAS 25/03/2026 06:00 SSA - SALVADOR 25/03/2026 08:35"
  const trechos: { cia: string; voo: string; origem: string; partida: string | null; destino: string; chegada: string | null }[] = [];
  const trechoRegex = /([A-Z0-9]{2})\s+(\d{2,4})\s+([\w\sÀ-ú\-]+?)\s+(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}\s+([\w\sÀ-ú\-]+?)\s+(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}/g;
  let tm: RegExpExecArray | null;
  while ((tm = trechoRegex.exec(text)) !== null) {
    trechos.push({
      cia: tm[1],
      voo: tm[2],
      origem: normalizeWS(tm[3]),
      partida: parseDateBR(tm[4]),
      destino: normalizeWS(tm[5]),
      chegada: parseDateBR(tm[6]),
    });
  }

  const dataSaida = trechos[0]?.partida || dataReserva || null;
  const dataRetorno = trechos.length > 1 ? trechos[trechos.length - 1]?.chegada || null : null;
  const origemVoo = trechos[0]?.origem || null;
  const destinoVoo = trechos.length > 1
    ? trechos.find(t => t.destino !== trechos[0]?.origem)?.destino || trechos[0]?.destino
    : trechos[0]?.destino || null;

  // ── PASSAGEIROS ───────────────────────────────────────────────────────────────
  // Seção header: "Passageiros Nome Sobrenome Tipo Assento Tarifa(sem as Taxas) Taxa DU Taxas Bilhete Data de Nascimento"
  // Linha:        "ALCIDES CONCEICAO ADT  630,77 63,07 62,14 1272300436823  23/05/1973"
  // Linha multi:  "FLAVIO ANDRADE ADT  7.134,81 499,44 574,36  29/03/1989"
  const passageiros: PassageiroDraft[] = [];
  const parsedPassengerLines: ParsedPassengerLine[] = [];

  // Localizar o bloco de passageiros
  const passStart = text.search(/Passageiros\s+Nome\s+Sobrenome/i);
  const passEnd = text.search(/Contratante\s+Nome\s+do\s+Contratante/i);
  const passBlock = passStart >= 0 && passEnd > passStart
    ? text.slice(passStart, passEnd)
    : text;

  // Remover o header da seção
  const passBlockClean = passBlock
    .replace(/Passageiros\s+Nome\s+Sobrenome.*?Nascimento\s*/is, '')
    .trim();

  // Cada linha de passageiro: NOME SOBRENOME TIPO [assento?] tarifa du taxas [bilhete?] nascimento
  // O tipo pode ser ADT, CHD ou INF. O campo bilhete (13 dígitos) é opcional.
  const passLineRegex = /^([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ\s]+?)\s+(ADT|CHD|INF)\b(.+)$/gim;
  const moneyRegex = /\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/g;
  let plm: RegExpExecArray | null;
  while ((plm = passLineRegex.exec(passBlockClean)) !== null) {
    const nomeCompleto = normalizeWS(plm[1]);
    const rest = plm[3] || '';
    const valores = Array.from(rest.matchAll(moneyRegex))
      .map((match) => parseCurrencyBR(match[0]))
      .filter((value): value is number => value !== null);
    if (valores.length < 3) continue;
    const [tarifa, du, taxas] = valores;
    const nascimento = parseDateBR(rest.match(/(\d{2}\/\d{2}\/\d{4})\s*$/)?.[1]);
    // Sem CPF disponível
    const passageiro = { nome: nomeCompleto, cpf: '', nascimento };
    passageiros.push(passageiro);
    parsedPassengerLines.push({ tarifa, du, taxas });
  }

  // ── VALORES TOTAIS ────────────────────────────────────────────────────────────
  // Prioridade 1: "Valores Totais (R$) Total do Recibo 755,98"
  const valTotalMatch = flat.match(/Valores\s+Totais.*?Total\s+do\s+Recibo\s+([\d.,]+)/i);
  // Prioridade 2: "Cart o cia a rea (R$) Cart o cia a rea 16.417,22"
  const cartaoMatch = flat.match(/Cart[oã]o\s+cia\s+a[eé]rea\s*\(R\$\)\s+Cart[oã]o\s+cia\s+a[eé]rea\s+([\d.,]+)/i);
  // Prioridade 3: somar as linhas do Caixa, quando existem múltiplas formas de pagamento
  const caixaTotal = sumCaixaValues(text);
  // Prioridade 4: somar passageiros
  let valorTotalBruto: number | null = null;
  if (valTotalMatch?.[1]) {
    valorTotalBruto = parseCurrencyBR(valTotalMatch[1]);
  } else if (caixaTotal) {
    valorTotalBruto = caixaTotal;
  } else if (cartaoMatch?.[1]) {
    valorTotalBruto = parseCurrencyBR(cartaoMatch[1]);
  }

  // Fallback: somar tarifa + du + taxas de todos os passageiros
  if (!valorTotalBruto && passageiros.length > 0) {
    const soma = parsedPassengerLines.reduce((total, row) => total + row.tarifa + row.du + row.taxas, 0);
    if (soma > 0) valorTotalBruto = soma;
  }

  if (!valorTotalBruto) throw new Error('Valor total não encontrado.');

  // ── TAXAS TOTAIS ──────────────────────────────────────────────────────────────
  // Somar taxas de embarque (coluna "Taxas") de todos os passageiros
  const totalTaxas = parsedPassengerLines.reduce((total, row) => total + row.taxas, 0);
  const totalDu = parsedPassengerLines.reduce((total, row) => total + row.du, 0);

  // ── PAGAMENTO ─────────────────────────────────────────────────────────────────
  const pagamento: PagamentoDraft = {
    forma: 'CARTÃO DE CRÉDITO',
    plano: '1X',
    valor_bruto: valorTotalBruto,
    total: valorTotalBruto,
    desconto: null,
    parcelas: [{ numero: '1', valor: valorTotalBruto, vencimento: null }],
  };

  // ── MONTA ContratoDraft ───────────────────────────────────────────────────────
  const contrato: ContratoDraft = {
    contrato_numero: numeroRecibo || '',
    reserva_numero: numeroReserva,
    destino: destinoVoo || null,
    data_saida: dataSaida,
    data_retorno: dataRetorno,
    produto_principal: destinoVoo || 'Bilhete Aéreo',
    produto_tipo: tipoBilhete,
    contratante: {
      nome: nomeContratante,
      cpf: '',  // ausente — modal solicitará
    },
    passageiros,
    pagamentos: [pagamento],
    total_bruto: valorTotalBruto,
    total_pago: valorTotalBruto,
    taxas_embarque: totalTaxas > 0 ? totalTaxas : null,
    taxa_du: totalDu > 0 ? totalDu : null,
    tipo_pacote: 'Passagem Facial',
    raw_text: text,
  };

  return { contratos: [contrato], raw_text: text };
}
