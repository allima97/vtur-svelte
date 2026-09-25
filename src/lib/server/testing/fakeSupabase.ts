/**
 * Banco falso para testes de contrato (Fase 3.4).
 *
 * - Responde a from(tabela).select/eq/in/order/limit/single/maybeSingle/update.
 * - Filtra as linhas da tabela por eq/in (a projeção do select é ignorada:
 *   o teste compara a resposta da versão antiga com a nova usando o mesmo banco).
 * - Cada consulta espera `delayMs`, e o banco registra quantas ficaram abertas ao
 *   mesmo tempo (maxInFlight) e a lista de consultas feitas (log).
 */
type Row = Record<string, unknown>;

export type FakeQueryLog = {
  table: string;
  op: 'select' | 'update';
  filters: string[];
  values?: Row;
};

export type FakeSupabase = {
  from: (table: string) => FakeBuilder;
  log: FakeQueryLog[];
  stats: { inFlight: number; maxInFlight: number };
};

type Result = { data: unknown; error: unknown; count?: number | null };

export interface FakeBuilder extends PromiseLike<Result> {
  select: (columns?: string) => FakeBuilder;
  update: (values: Row) => FakeBuilder;
  eq: (column: string, value: unknown) => FakeBuilder;
  in: (column: string, values: unknown[]) => FakeBuilder;
  order: (column: string, options?: unknown) => FakeBuilder;
  limit: (n: number) => FakeBuilder;
  single: () => Promise<Result>;
  maybeSingle: () => Promise<Result>;
}

export function createFakeSupabase(
  tables: Record<string, Row[]>,
  { delayMs = 5 }: { delayMs?: number } = {}
): FakeSupabase {
  const log: FakeQueryLog[] = [];
  const stats = { inFlight: 0, maxInFlight: 0 };

  const from = (table: string): FakeBuilder => {
    const predicates: Array<(row: Row) => boolean> = [];
    const filters: string[] = [];
    let op: 'select' | 'update' = 'select';
    let updateValues: Row | undefined;
    let limitN: number | null = null;

    const run = async (mode: 'many' | 'single' | 'maybeSingle'): Promise<Result> => {
      log.push({ table, op, filters: [...filters].sort(), values: updateValues });
      stats.inFlight += 1;
      stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      stats.inFlight -= 1;

      if (op === 'update') return { data: null, error: null };

      let rows = (tables[table] || []).filter((row) => predicates.every((p) => p(row)));
      if (limitN != null) rows = rows.slice(0, limitN);
      rows = rows.map((row) => structuredClone(row));

      if (mode === 'many') return { data: rows, error: null };
      if (rows.length === 1) return { data: rows[0], error: null };
      if (rows.length === 0 && mode === 'maybeSingle') return { data: null, error: null };
      return {
        data: null,
        error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
      };
    };

    const builder: FakeBuilder = {
      select: () => builder,
      update: (values) => {
        op = 'update';
        updateValues = { ...values, updated_at: '<ts>' };
        return builder;
      },
      eq: (column, value) => {
        filters.push(`${column}=${String(value)}`);
        predicates.push((row) => row[column] === value);
        return builder;
      },
      in: (column, values) => {
        filters.push(`${column} in ${[...values].map(String).sort().join(',')}`);
        predicates.push((row) => values.includes(row[column]));
        return builder;
      },
      order: () => builder,
      limit: (n) => {
        limitN = n;
        return builder;
      },
      single: () => run('single'),
      maybeSingle: () => run('maybeSingle'),
      then: (onFulfilled, onRejected) => run('many').then(onFulfilled, onRejected)
    };
    return builder;
  };

  return { from, log, stats };
}

/** Lista de consultas em ordem estável, para comparar antes/depois sem depender da ordem. */
export function sortedQueryLog(log: FakeQueryLog[]) {
  return log
    .map((entry) => `${entry.op} ${entry.table} [${entry.filters.join(' & ')}]${entry.values ? ' ' + JSON.stringify(entry.values) : ''}`)
    .sort();
}
