import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "$lib/vendas/rateio";
import { getAdminClient, logServerError } from "$lib/server/v1";
import { buildReadModelCacheKey } from "$lib/server/readModelCache";
import { chunkArray, uniqueCleanStrings } from "$lib/utils/array";
import { toCleanString as toStr, toFiniteNumber as toNum } from "$lib/utils/values";
import type {
  VendasKpiAgg,
  VendasKpiReciboContribution,
} from "$lib/server/vendas-kpis";

type ReadModelParams = {
  dataInicio: string;
  dataFim: string;
  companyIds: string[];
  vendedorIds: string[];
  accessibleClientIds?: string[];
};

export type ReciboContribuicoesReadModelOptions = {
  mode?: "blocking" | "stale-while-revalidate";
  executionContext?: { waitUntil: (promise: Promise<unknown>) => void } | null;
  fallbackToRawOnReadError?: boolean;
};

type ContributionPayload = {
  agg: VendasKpiAgg;
  contributions: VendasKpiReciboContribution[];
};

type RawLoader = (params: ReadModelParams) => Promise<ContributionPayload>;

type StatusRow = {
  company_id: string;
  mes: string;
  status: string;
  dirty_at?: string | null;
  rebuilt_at?: string | null;
};

type PersistentContributionRow = {
  company_id: string;
  mes: string;
  data_recibo: string;
  vendedor_id: string;
  cliente_id?: string | null;
  venda_id?: string | null;
  recibo_id?: string | null;
  venda_key: string;
  recibo_numero?: string | null;
  produto_id?: string | null;
  produto_nome?: string | null;
  destino_nome?: string | null;
  valor_bruto: number | string;
  valor_taxas: number | string;
  valor_seguro: number | string;
  is_seguro: boolean;
  fator: number | string;
  source_bruto: number | string;
  source_taxas: number | string;
};

const MODEL_NAME = "recibo_contribuicoes_v1";
const TABLE_CONTRIBUICOES = "ranking_recibo_contribuicoes";
const TABLE_STATUS = "ranking_read_model_status";
const INSERT_CHUNK_SIZE = 500;
const READ_PAGE_SIZE = 1000;
const READ_FILTER_BATCH_SIZE = 100;
const READ_MODEL_REBUILD_CONCURRENCY = 2;
const READ_MODEL_READ_CONCURRENCY = 4;
const BACKGROUND_ENSURE_THROTTLE_MS = 60_000;

let readModelUnavailable = false;
let readModelUnavailableLogged = false;
const backgroundEnsureSchedule = new Map<string, number>();

function normalizeIds(values?: string[] | null) {
  return uniqueCleanStrings(values || []).sort();
}

function errorDetails(error: unknown) {
  return error && typeof error === "object" ? (error as Record<string, unknown>) : {};
}

function isUnavailableError(error: unknown) {
  const details = errorDetails(error);
  const code = toStr(details.code);
  const message = toStr(details.message).toLowerCase();
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST200" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes(TABLE_CONTRIBUICOES) ||
    message.includes(TABLE_STATUS)
  );
}

function markUnavailable(error: unknown) {
  readModelUnavailable = true;
  if (!readModelUnavailableLogged) {
    readModelUnavailableLogged = true;
    logServerError(
      "[read-model] ranking_recibo_contribuicoes indisponivel; usando calculo em tempo real.",
      error,
    );
  }
}

function monthKeyFromDate(date: string) {
  return `${date.slice(0, 4)}-${date.slice(5, 7)}`;
}

function monthStartFromKey(monthKey: string) {
  return `${monthKey}-01`;
}

function monthEndFromKey(monthKey: string) {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthStartFromKey(monthKey);
  }
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function monthKeysBetween(inicio: string, fim: string) {
  const startYear = Number(inicio.slice(0, 4));
  const startMonth = Number(inicio.slice(5, 7));
  const endYear = Number(fim.slice(0, 4));
  const endMonth = Number(fim.slice(5, 7));
  if (
    !Number.isFinite(startYear) ||
    !Number.isFinite(startMonth) ||
    !Number.isFinite(endYear) ||
    !Number.isFinite(endMonth)
  ) {
    return [monthKeyFromDate(inicio)];
  }

  const keys: string[] = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

function buildSourceKey(
  contribution: VendasKpiReciboContribution,
  companyId: string,
  mes: string,
) {
  return [
    companyId,
    mes,
    contribution.vendedorId,
    contribution.vendaKey,
    contribution.reciboId || contribution.reciboNumero || "sem-recibo",
    contribution.reciboDate,
    contribution.factor,
    contribution.bruto,
    contribution.taxas,
  ]
    .map((part) => String(part ?? "").replace(/\|/g, "/"))
    .join("|");
}

function toUuidOrNull(value?: string | null) {
  const normalized = toStr(value);
  return isUuid(normalized) ? normalized : null;
}

function contributionToRow(
  contribution: VendasKpiReciboContribution,
  fallbackCompanyId: string,
  mes: string,
) {
  const companyId = toStr(contribution.companyId) || fallbackCompanyId;
  if (!companyId || !contribution.vendedorId) return null;
  const bruto = Number(toNum(contribution.bruto).toFixed(2));
  const taxas = Number(toNum(contribution.taxas).toFixed(2));
  const sourceBruto = Number(toNum(contribution.sourceBruto).toFixed(2));
  const sourceTaxas = Number(toNum(contribution.sourceTaxas).toFixed(2));

  return {
    source_key: buildSourceKey(contribution, companyId, mes),
    company_id: companyId,
    mes,
    data_recibo: contribution.reciboDate || mes,
    vendedor_id: contribution.vendedorId,
    cliente_id: toUuidOrNull(contribution.clienteId),
    venda_id: toUuidOrNull(contribution.vendaId),
    recibo_id: toUuidOrNull(contribution.reciboId),
    venda_key: contribution.vendaKey || "sem-venda",
    recibo_numero: contribution.reciboNumero || null,
    produto_id: toUuidOrNull(contribution.produtoId),
    produto_nome: contribution.produtoNome || null,
    destino_nome: contribution.destinoNome || null,
    valor_bruto: bruto,
    valor_taxas: taxas,
    valor_seguro: contribution.isSeguro ? bruto : 0,
    is_seguro: Boolean(contribution.isSeguro),
    fator: Number(toNum(contribution.factor).toFixed(6)),
    source_bruto: sourceBruto,
    source_taxas: sourceTaxas,
    origem: contribution.origem || "ranking_ts",
    built_at: new Date().toISOString(),
  };
}

function rowToContribution(
  row: PersistentContributionRow,
): VendasKpiReciboContribution {
  return {
    companyId: row.company_id,
    clienteId: row.cliente_id || null,
    vendaId: row.venda_id || null,
    vendaKey: row.venda_key,
    reciboId: row.recibo_id || "",
    reciboNumero: row.recibo_numero || "",
    reciboDate: String(row.data_recibo || "").slice(0, 10),
    vendedorId: row.vendedor_id,
    produtoId: row.produto_id || null,
    produtoNome: row.produto_nome || null,
    destinoNome: row.destino_nome || null,
    bruto: Number(toNum(row.valor_bruto).toFixed(2)),
    taxas: Number(toNum(row.valor_taxas).toFixed(2)),
    isSeguro: Boolean(row.is_seguro),
    factor: Number(toNum(row.fator).toFixed(6)),
    sourceBruto: Number(toNum(row.source_bruto).toFixed(2)),
    sourceTaxas: Number(toNum(row.source_taxas).toFixed(2)),
    origem: "read_model",
  };
}

function aggregateContributions(
  contributions: VendasKpiReciboContribution[],
): VendasKpiAgg {
  const receiptKeys = new Set<string>();
  const saleKeys = new Set<string>();
  const totalVendas = contributions.reduce(
    (sum, item) => sum + toNum(item.bruto),
    0,
  );
  const totalTaxas = contributions.reduce(
    (sum, item) => sum + toNum(item.taxas),
    0,
  );
  const totalSeguro = contributions.reduce(
    (sum, item) => sum + (item.isSeguro ? toNum(item.bruto) : 0),
    0,
  );

  for (const item of contributions) {
    if (item.vendaKey) saleKeys.add(item.vendaKey);
    const receiptKey = [
      item.vendaKey,
      item.reciboId || item.reciboNumero,
      item.reciboDate,
    ].join("|");
    if (receiptKey.trim() !== "||") receiptKeys.add(receiptKey);
  }

  return {
    totalVendas,
    totalTaxas,
    totalLiquido: totalVendas - totalTaxas,
    totalSeguro,
    countVendas: receiptKeys.size,
    countAtivas: saleKeys.size,
  };
}

function emptyContributionPayload(): ContributionPayload {
  return {
    agg: {
      totalVendas: 0,
      totalTaxas: 0,
      totalLiquido: 0,
      totalSeguro: 0,
      countVendas: 0,
      countAtivas: 0,
    },
    contributions: [],
  };
}

function isStatusReady(row?: StatusRow | null) {
  if (!row || row.status !== "ready" || !row.rebuilt_at) return false;
  if (!row.dirty_at) return true;
  return new Date(row.rebuilt_at).getTime() >= new Date(row.dirty_at).getTime();
}

async function fetchStatusRows(
  client: SupabaseClient,
  companyIds: string[],
  monthStarts: string[],
) {
  const batchRows = await Promise.all(
    chunkArray(companyIds, READ_FILTER_BATCH_SIZE).flatMap((companyBatch) =>
      chunkArray(monthStarts, READ_FILTER_BATCH_SIZE).map(async (monthBatch) => {
        const { data, error } = await client
          .from(TABLE_STATUS)
          .select("company_id, mes, status, dirty_at, rebuilt_at")
          .eq("modelo", MODEL_NAME)
          .in("company_id", companyBatch)
          .in("mes", monthBatch);

        if (error) throw error;
        return (data || []) as StatusRow[];
      }),
    ),
  );

  return batchRows.flat();
}

async function mapLimited<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let index = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      for (;;) {
        const currentIndex = index;
        index += 1;
        if (currentIndex >= items.length) return;
        results[currentIndex] = await worker(items[currentIndex]);
      }
    }),
  );
  return results;
}

async function runLimited<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  await mapLimited(items, concurrency, worker);
}

async function upsertStatus(
  client: SupabaseClient,
  companyId: string,
  mes: string,
  values: Partial<StatusRow> & { last_error?: string | null },
) {
  const { error } = await client.from(TABLE_STATUS).upsert(
    {
      modelo: MODEL_NAME,
      company_id: companyId,
      mes,
      ...values,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "modelo,company_id,mes" },
  );
  if (error) throw error;
}

async function rebuildMonth(
  client: SupabaseClient,
  companyId: string,
  monthKey: string,
  rawLoader: RawLoader,
) {
  const mes = monthStartFromKey(monthKey);
  const dataInicio = mes;
  const dataFim = monthEndFromKey(monthKey);

  await upsertStatus(client, companyId, mes, {
    status: "rebuilding",
    dirty_at: null,
    rebuilt_at: null,
    last_error: null,
  });

  try {
    const payload = await rawLoader({
      dataInicio,
      dataFim,
      companyIds: [companyId],
      vendedorIds: [],
      accessibleClientIds: [],
    });

    const rows = payload.contributions
      .map((contribution) => contributionToRow(contribution, companyId, mes))
      .filter(Boolean);

    const { error: deleteError } = await client
      .from(TABLE_CONTRIBUICOES)
      .delete()
      .eq("company_id", companyId)
      .eq("mes", mes);

    if (deleteError) throw deleteError;

    for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
      const chunk = rows.slice(index, index + INSERT_CHUNK_SIZE);
      if (chunk.length === 0) continue;
      const { error } = await client
        .from(TABLE_CONTRIBUICOES)
        .upsert(chunk, { onConflict: "source_key" });
      if (error) throw error;
    }

    await upsertStatus(client, companyId, mes, {
      status: "ready",
      dirty_at: null,
      rebuilt_at: new Date().toISOString(),
      last_error: null,
    });
  } catch (error) {
    const details = errorDetails(error);
    await upsertStatus(client, companyId, mes, {
      status: "error",
      dirty_at: new Date().toISOString(),
      rebuilt_at: null,
      last_error: String(details.message || error).slice(0, 500),
    }).catch(() => undefined);
    throw error;
  }
}

async function ensureReadModelReady(
  client: SupabaseClient,
  params: ReadModelParams,
  rawLoader: RawLoader,
) {
  const companyIds = normalizeIds(params.companyIds);
  const monthKeys = monthKeysBetween(params.dataInicio, params.dataFim);
  const monthStarts = monthKeys.map(monthStartFromKey);

  const statuses = await fetchStatusRows(client, companyIds, monthStarts);
  const statusMap = new Map(
    statuses.map((row) => [
      `${row.company_id}|${String(row.mes).slice(0, 10)}`,
      row,
    ]),
  );

  const pendingRebuilds: Array<{ companyId: string; monthKey: string }> = [];
  for (const companyId of companyIds) {
    for (const monthKey of monthKeys) {
      const mes = monthStartFromKey(monthKey);
      if (isStatusReady(statusMap.get(`${companyId}|${mes}`))) continue;
      pendingRebuilds.push({ companyId, monthKey });
    }
  }

  await runLimited(
    pendingRebuilds,
    READ_MODEL_REBUILD_CONCURRENCY,
    ({ companyId, monthKey }) => rebuildMonth(client, companyId, monthKey, rawLoader),
  );
}

async function readPersistentContributions(
  client: SupabaseClient,
  params: ReadModelParams,
) {
  const companyIds = normalizeIds(params.companyIds);
  const vendedorIds = normalizeIds(params.vendedorIds);
  const accessibleClientIds = normalizeIds(params.accessibleClientIds);
  const readBatch = async (filters?: {
    companyIds?: string[] | null;
    vendedorIds?: string[] | null;
    clientIds?: string[] | null;
  }) => {
    const rows: PersistentContributionRow[] = [];
    for (let from = 0; ; from += READ_PAGE_SIZE) {
      let query = client
        .from(TABLE_CONTRIBUICOES)
        .select(
          "company_id, mes, data_recibo, vendedor_id, cliente_id, venda_id, recibo_id, venda_key, recibo_numero, produto_id, produto_nome, destino_nome, valor_bruto, valor_taxas, valor_seguro, is_seguro, fator, source_bruto, source_taxas",
        )
        .gte("data_recibo", params.dataInicio)
        .lte("data_recibo", params.dataFim)
        .order("data_recibo", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + READ_PAGE_SIZE - 1);

      if (filters?.companyIds && filters.companyIds.length > 0) {
        query = query.in("company_id", filters.companyIds);
      }
      if (filters?.vendedorIds && filters.vendedorIds.length > 0) {
        query = query.in("vendedor_id", filters.vendedorIds);
      }
      if (filters?.clientIds && filters.clientIds.length > 0) {
        query = query.in("cliente_id", filters.clientIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const page = (data || []) as PersistentContributionRow[];
      rows.push(...page);
      if (page.length < READ_PAGE_SIZE) break;
    }
    return rows;
  };

  const companyBatches = companyIds.length > 0 ? chunkArray(companyIds, READ_FILTER_BATCH_SIZE) : [null];
  const vendedorBatches = vendedorIds.length > 0 ? chunkArray(vendedorIds, READ_FILTER_BATCH_SIZE) : [null];
  const readFilters: Array<Parameters<typeof readBatch>[0]> = [];

  if (vendedorIds.length === 0 && accessibleClientIds.length > 0) {
    for (const companyBatch of companyBatches) {
      for (const clientBatch of chunkArray(accessibleClientIds, READ_FILTER_BATCH_SIZE)) {
        readFilters.push({
          companyIds: companyBatch,
          clientIds: clientBatch,
        });
      }
    }
  } else {
    for (const companyBatch of companyBatches) {
      for (const vendedorBatch of vendedorBatches) {
        readFilters.push({
          companyIds: companyBatch,
          vendedorIds: vendedorBatch,
        });
      }
    }
  }

  const rows = (await mapLimited(
    readFilters,
    READ_MODEL_READ_CONCURRENCY,
    readBatch,
  )).flat();
  const contributions = rows.map(rowToContribution);
  return {
    agg: aggregateContributions(contributions),
    contributions,
  };
}

function scheduleReadModelEnsure(
  client: SupabaseClient,
  params: ReadModelParams,
  rawLoader: RawLoader,
  executionContext?: ReciboContribuicoesReadModelOptions["executionContext"],
) {
  const companyIds = normalizeIds(params.companyIds);
  if (companyIds.length === 0) return;

  const key = buildReadModelCacheKey("recibo-contribuicoes:background-ensure", {
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
    companyIds,
  });
  const now = Date.now();
  const lastScheduledAt = backgroundEnsureSchedule.get(key) || 0;
  if (now - lastScheduledAt < BACKGROUND_ENSURE_THROTTLE_MS) return;
  backgroundEnsureSchedule.set(key, now);

  const ensurePromise = ensureReadModelReady(
    client,
    { ...params, companyIds },
    rawLoader,
  ).catch((error) => {
    logServerError("[read-model] reconstrução em background falhou", error);
  });

  if (executionContext?.waitUntil) {
    executionContext.waitUntil(ensurePromise);
  } else {
    void ensurePromise;
  }
}

export async function fetchReciboContribuicoesReadModel(
  _client: SupabaseClient,
  params: ReadModelParams,
  rawLoader: RawLoader,
  rebuildRawLoader: RawLoader = rawLoader,
  options: ReciboContribuicoesReadModelOptions = {},
): Promise<ContributionPayload> {
  const companyIds = normalizeIds(params.companyIds);
  if (companyIds.length === 0) {
    return rawLoader(params);
  }
  if (readModelUnavailable) {
    if (options.mode === "stale-while-revalidate" && options.fallbackToRawOnReadError === false) {
      return emptyContributionPayload();
    }
    return rawLoader(params);
  }

  try {
    const modelClient = getAdminClient();
    if (options.mode === "stale-while-revalidate") {
      try {
        const payload = await readPersistentContributions(modelClient, {
          ...params,
          companyIds,
        });
        scheduleReadModelEnsure(
          modelClient,
          { ...params, companyIds },
          rebuildRawLoader,
          options.executionContext,
        );
        return payload;
      } catch (error) {
        if (isUnavailableError(error)) {
          markUnavailable(error);
          if (options.fallbackToRawOnReadError !== false) return rawLoader(params);
          return emptyContributionPayload();
        }
        logServerError("[read-model] falha ao ler dados persistidos em modo stale; seguindo sem bloquear.", error);
        scheduleReadModelEnsure(
          modelClient,
          { ...params, companyIds },
          rebuildRawLoader,
          options.executionContext,
        );
        if (options.fallbackToRawOnReadError !== false) return rawLoader(params);
        return emptyContributionPayload();
      }
    }

    await ensureReadModelReady(
      modelClient,
      { ...params, companyIds },
      rebuildRawLoader,
    );
    return await readPersistentContributions(modelClient, {
      ...params,
      companyIds,
    });
  } catch (error) {
    if (isUnavailableError(error)) {
      markUnavailable(error);
      return rawLoader(params);
    }
    logServerError("[read-model] falha ao usar ranking_recibo_contribuicoes; usando calculo em tempo real.", error);
    return rawLoader(params);
  }
}
