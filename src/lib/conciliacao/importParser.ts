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

function parseDate(value: unknown, fallbackDate?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallbackDate || null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  return fallbackDate || null;
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

export function parseConciliacaoImportText(
  text: string,
  fallbackDate?: string | null
): ParsedImportResult {
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
          row.status = String(value).trim().toUpperCase() as ConciliacaoLinhaInput['status'];
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
    row.origem = String(row.origem || 'arquivo').trim() || 'arquivo';
    return row;
  });

  return {
    linhas: linhas.filter((item): item is ConciliacaoLinhaInput => Boolean(item)),
    ignored
  };
}
