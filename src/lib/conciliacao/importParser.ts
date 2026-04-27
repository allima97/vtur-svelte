import type { ConciliacaoLinhaInput } from '../../routes/api/v1/conciliacao/_types';

const HEADER_ALIASES: Record<string, keyof ConciliacaoLinhaInput> = {
  documento: 'documento',
  recibo: 'documento',
  numero_recibo: 'documento',
  numero: 'documento',
  movimento_data: 'movimento_data',
  data: 'movimento_data',
  data_movimento: 'movimento_data',
  status: 'status',
  descricao: 'descricao',
  historico: 'descricao',
  valor_lancamentos: 'valor_lancamentos',
  valor_lancamento: 'valor_lancamentos',
  valor: 'valor_lancamentos',
  valor_taxas: 'valor_taxas',
  taxas: 'valor_taxas',
  valor_descontos: 'valor_descontos',
  descontos: 'valor_descontos',
  valor_abatimentos: 'valor_abatimentos',
  abatimentos: 'valor_abatimentos',
  valor_nao_comissionavel: 'valor_nao_comissionavel',
  nao_comissionavel: 'valor_nao_comissionavel',
  valor_calculada_loja: 'valor_calculada_loja',
  calculada_loja: 'valor_calculada_loja',
  valor_visao_master: 'valor_visao_master',
  visao_master: 'valor_visao_master',
  valor_opfax: 'valor_opfax',
  opfax: 'valor_opfax',
  valor_saldo: 'valor_saldo',
  saldo: 'valor_saldo',
  valor_comissao_loja: 'valor_comissao_loja',
  comissao_loja: 'valor_comissao_loja',
  percentual_comissao_loja: 'percentual_comissao_loja',
  percentual_loja: 'percentual_comissao_loja',
  faixa_comissao: 'faixa_comissao',
  origem: 'origem'
};

type ParsedImportResult = {
  linhas: ConciliacaoLinhaInput[];
  ignored: number;
};

type ParsedImportFileResult = ParsedImportResult & {
  text: string;
  movimentoData: string | null;
};

function normalizeHeader(value: string) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseMoney(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/\s+/g, '')
    .replace(/R\$/gi, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLegacyXlsNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? parseLegacyXlsNumber(String(value)) : null;
  }

  const raw = String(value ?? '').trim();
  if (!raw) return null;

  if (raw.includes(',') || /[A-Za-z]/.test(raw)) {
    return parseMoney(raw);
  }

  const sign = raw.startsWith('-') ? -1 : 1;
  const unsigned = raw.replace(/^-/, '');
  const parts = unsigned.split('.');
  const digits = parts.join('');
  if (!digits || /\D/.test(digits)) return parseMoney(raw);

  let scaledDigits = digits;
  if (parts.length > 1) {
    const fracLength = parts[parts.length - 1]?.length ?? 0;
    if (fracLength === 4) scaledDigits = `${digits}0`;
  }

  const parsed = Number(scaledDigits);
  if (!Number.isFinite(parsed)) return null;
  return (sign * parsed) / 100;
}

function parseDate(value: unknown, fallbackDate?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallbackDate || null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  return fallbackDate || null;
}

function inferStatus(value: unknown): ConciliacaoLinhaInput['status'] {
  const raw = String(value ?? '').toUpperCase();
  if (raw.includes('ESTORNO')) return 'ESTORNO';
  if (raw.includes('BAIXA')) return 'BAIXA';
  if (raw.includes('OPFAX')) return 'OPFAX';
  return 'OUTRO';
}

function parseMovimentoDateFromTxt(text: string): string | null {
  const match = text.match(/Movimenta[cç][aã]o\s+do\s+Dia:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

const MONTH_PT: Record<string, string> = {
  jan: '01',
  fev: '02',
  mar: '03',
  abr: '04',
  mai: '05',
  jun: '06',
  jul: '07',
  ago: '08',
  set: '09',
  out: '10',
  nov: '11',
  dez: '12'
};

function parseMovimentoDateFromFileName(fileName: string): string | null {
  const raw = String(fileName || '');
  const numeric = raw.match(/(\d{1,2})-(\d{2})-(\d{2,4})/);
  if (numeric) {
    const day = numeric[1].padStart(2, '0');
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
    return `${year}-${numeric[2]}-${day}`;
  }

  const shortMonth = raw.match(/(\d{1,2})-([a-z\u00e0-\u00fc]{2,4})-(\d{2,4})/i);
  if (!shortMonth) return null;
  const month = MONTH_PT[shortMonth[2].toLowerCase().slice(0, 3)];
  if (!month) return null;
  const day = shortMonth[1].padStart(2, '0');
  const year = shortMonth[3].length === 2 ? `20${shortMonth[3]}` : shortMonth[3];
  return `${year}-${month}-${day}`;
}

function splitLine(line: string, delimiter: string) {
  if (delimiter === '\t') return line.split('\t');
  return line.split(delimiter).map((cell) => cell.replace(/^"|"$/g, '').trim());
}

function inferDelimiter(text: string) {
  if (text.includes('\t')) return '\t';
  if (text.includes(';')) return ';';
  return ',';
}

function resolveFooterLabel(...values: Array<unknown>) {
  for (const value of values) {
    const normalized = normalizeHeader(String(value ?? ''));
    if (normalized === 'subtotal') return 'SUBTOTAL';
    if (normalized === 'total') return 'TOTAL';
  }
  return null;
}

function parseConciliacaoTxtLayout(text: string, origem = 'arquivo', fallbackDate?: string | null): ParsedImportResult {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\t/g, ' '));

  const movimentoData = parseMovimentoDateFromTxt(text) || fallbackDate || null;
  let ignored = 0;
  const linhas: ConciliacaoLinhaInput[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^DOCUMENTO\b/i.test(trimmed)) continue;
    if (/^CALCULADA\s+TOTAL\b/i.test(trimmed)) continue;

    const parts = trimmed.split(/\s{2,}/).filter(Boolean);
    if (parts.length < 4) {
      ignored += 1;
      continue;
    }

    if (resolveFooterLabel(parts[0], parts[1])) continue;

    const documento = String(parts[0] || '').trim();
    if (!/^\d{4}-\d{6,14}\b/.test(documento)) {
      ignored += 1;
      continue;
    }

    const descricao = String(parts[1] || '').trim() || null;
    linhas.push({
      documento,
      movimento_data: movimentoData,
      status: inferStatus(descricao),
      descricao,
      valor_lancamentos: parseMoney(parts[2]),
      valor_taxas: parseMoney(parts[3]),
      valor_descontos: parseMoney(parts[4]),
      valor_abatimentos: parseMoney(parts[5]),
      valor_calculada_loja: parseMoney(parts[6]),
      valor_visao_master: parseMoney(parts[8]),
      valor_opfax: parseMoney(parts[11]),
      valor_saldo: parseMoney(parts[12]),
      valor_nao_comissionavel: null,
      origem
    });
  }

  return { linhas, ignored };
}

function toDelimitedText(linhas: ConciliacaoLinhaInput[]) {
  const header = [
    'documento',
    'movimento_data',
    'status',
    'descricao',
    'valor_lancamentos',
    'valor_taxas',
    'valor_descontos',
    'valor_abatimentos',
    'valor_nao_comissionavel',
    'valor_calculada_loja',
    'valor_visao_master',
    'valor_opfax',
    'valor_saldo'
  ];

  const rows = linhas.map((row) =>
    [
      row.documento,
      row.movimento_data || '',
      row.status || '',
      row.descricao || '',
      row.valor_lancamentos ?? '',
      row.valor_taxas ?? '',
      row.valor_descontos ?? '',
      row.valor_abatimentos ?? '',
      row.valor_nao_comissionavel ?? '',
      row.valor_calculada_loja ?? '',
      row.valor_visao_master ?? '',
      row.valor_opfax ?? '',
      row.valor_saldo ?? ''
    ]
      .map((value) => String(value).replace(/;/g, ','))
      .join(';')
  );

  return [header.join(';'), ...rows].join('\n');
}

async function parseConciliacaoXlsLayout(
  file: File,
  fallbackDate?: string | null
): Promise<ParsedImportFileResult> {
  const module = await import('xlsx');
  const XLSX = (module as any).default ?? module;
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const isLegacyXls = /\.xls$/i.test(file.name) && !/\.xlsx$/i.test(file.name);

  const sheets = (workbook.SheetNames || [])
    .map((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: !isLegacyXls
      }) as unknown[][];
      const headerIndex = rows.findIndex((row) =>
        row.some((cell) => normalizeHeader(String(cell || '')).includes('documento'))
      );
      return { rows, headerIndex };
    })
    .filter((sheet: { rows: unknown[][] }) => Array.isArray(sheet.rows) && sheet.rows.length > 0);

  const selected = sheets.find((sheet: { headerIndex: number }) => sheet.headerIndex >= 0) || null;
  if (!selected) {
    return {
      linhas: [],
      ignored: 0,
      text: '',
      movimentoData: parseMovimentoDateFromFileName(file.name) || fallbackDate || null
    };
  }

  const movimentoDateCell = sheets
    .flatMap((sheet: { rows: unknown[][] }) => sheet.rows)
    .flat()
    .map((cell: unknown) => String(cell || '').trim())
    .find((cell: string) => /Movimenta[cç][aã]o\s+do\s+Dia:/i.test(cell));

  const movimentoData =
    (movimentoDateCell ? parseMovimentoDateFromTxt(movimentoDateCell) : null) ||
    parseMovimentoDateFromFileName(file.name) ||
    fallbackDate ||
    null;

  const rows = selected.rows;
  const headerRow = (rows[selected.headerIndex] || []).map((cell: unknown) => String(cell || '').trim());

  const colIndex = (needles: string[], fallback = -1) => {
    const wanted = needles.map((value: string) => normalizeHeader(value));
    const normalizedHeader = headerRow.map((value: string) => normalizeHeader(value));
    const index = normalizedHeader.findIndex((head: string) => wanted.some((needle) => head.includes(needle)));
    return index >= 0 ? index : fallback;
  };

  const cDocumento = colIndex(['documento'], 0);
  const cDescricao = colIndex(['descricao', 'descri'], 1);
  const cLancamentos = colIndex(['lancamentos', 'lanc'], 2);
  const cTaxas = colIndex(['taxas'], 3);
  const cDescontos = colIndex(['descontos', 'descont'], 4);
  const cAbatimentos = colIndex(['abatimentos', 'abat'], 5);
  const cCalculadaLoja = colIndex(['calculada loja', 'calcul'], 6);
  const cVisaoMaster = colIndex(['visao master', 'visao', 'vis'], 8);
  const cOpfax = colIndex(['opfax'], 11);
  const cSaldo = colIndex(['saldo'], 12);

  const parseSheetNumber = (value: unknown) => (isLegacyXls ? parseLegacyXlsNumber(value) : parseMoney(value));

  let ignored = 0;
  const linhas: ConciliacaoLinhaInput[] = [];

  for (let i = selected.headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const documento = String(row[cDocumento] || '').trim();
    const descricao = cDescricao >= 0 ? String(row[cDescricao] || '').trim() : '';
    if (resolveFooterLabel(documento, descricao)) continue;
    if (!documento) {
      ignored += 1;
      continue;
    }

    const pick = (index: number) => (index >= 0 ? parseSheetNumber(row[index]) : null);

    linhas.push({
      documento,
      movimento_data: movimentoData,
      status: inferStatus(descricao),
      descricao: descricao || null,
      valor_lancamentos: pick(cLancamentos),
      valor_taxas: pick(cTaxas),
      valor_descontos: pick(cDescontos),
      valor_abatimentos: pick(cAbatimentos),
      valor_nao_comissionavel: null,
      valor_calculada_loja: pick(cCalculadaLoja),
      valor_visao_master: pick(cVisaoMaster),
      valor_opfax: pick(cOpfax),
      valor_saldo: pick(cSaldo),
      origem: `arquivo:${file.name}`
    });
  }

  return {
    linhas,
    ignored,
    text: toDelimitedText(linhas),
    movimentoData
  };
}

export function parseConciliacaoImportText(
  text: string,
  fallbackDate?: string | null
): ParsedImportResult {
  const txtLayout = parseConciliacaoTxtLayout(text, 'arquivo', fallbackDate);
  if (txtLayout.linhas.length > 0) {
    return txtLayout;
  }

  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { linhas: [], ignored: 0 };
  }

  const delimiter = inferDelimiter(lines.join('\n'));
  const headerCells = splitLine(lines[0], delimiter).map(normalizeHeader);
  const mappedHeaders = headerCells.map((header) => HEADER_ALIASES[header] || null);

  let ignored = 0;
  const linhas = lines.slice(1).map((line) => {
    const cells = splitLine(line, delimiter);
    const row: ConciliacaoLinhaInput = {
      documento: '',
      movimento_data: fallbackDate || null
    };

    mappedHeaders.forEach((field, index) => {
      if (!field) return;
      const value = cells[index];
      if (value == null || value === '') return;

      switch (field) {
        case 'documento':
        case 'descricao':
        case 'faixa_comissao':
        case 'origem':
          row[field] = String(value).trim();
          break;
        case 'movimento_data':
          row.movimento_data = parseDate(value, fallbackDate);
          break;
        case 'status':
          row.status = inferStatus(value);
          break;
        default:
          row[field] = parseMoney(value) as never;
          break;
      }
    });

    if (!String(row.documento || '').trim()) {
      ignored += 1;
      return null;
    }

    row.documento = String(row.documento).trim();
    row.movimento_data = parseDate(row.movimento_data, fallbackDate);
    row.status = inferStatus(row.status || row.descricao || null);
    row.origem = String(row.origem || 'arquivo').trim() || 'arquivo';
    return row;
  });

  return {
    linhas: linhas.filter((item): item is ConciliacaoLinhaInput => Boolean(item)),
    ignored
  };
}

export async function parseConciliacaoImportFile(
  file: File,
  fallbackDate?: string | null
): Promise<ParsedImportFileResult> {
  const fileName = String(file.name || '').toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlxs');

  if (isExcel) {
    const parsedXls = await parseConciliacaoXlsLayout(file, fallbackDate);
    if (parsedXls.linhas.length > 0) return parsedXls;

    const module = await import('xlsx');
    const XLSX = (module as any).default ?? module;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { linhas: [], ignored: 0, text: '', movimentoData: fallbackDate || null };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const text = XLSX.utils.sheet_to_csv(sheet, { FS: ';', blankrows: false });
    const parsed = parseConciliacaoImportText(text, fallbackDate);
    return {
      ...parsed,
      text,
      movimentoData: parseMovimentoDateFromFileName(file.name) || fallbackDate || null
    };
  }

  const buffer = await file.arrayBuffer();
  const utf8Text = new TextDecoder('utf-8').decode(buffer);
  const latin1Text = new TextDecoder('iso-8859-1').decode(buffer);

  const utf8Parsed = parseConciliacaoImportText(utf8Text, fallbackDate);
  const latin1Parsed = parseConciliacaoImportText(latin1Text, fallbackDate);

  const useLatin1 = latin1Parsed.linhas.length > utf8Parsed.linhas.length;
  const text = useLatin1 ? latin1Text : utf8Text;
  const parsed = useLatin1 ? latin1Parsed : utf8Parsed;

  return {
    ...parsed,
    text,
    movimentoData: parseMovimentoDateFromTxt(text) || parseMovimentoDateFromFileName(file.name) || fallbackDate || null
  };
}
