type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  lastAccessAt: number;
  tags: Set<string>;
};

type CacheOptions<T> = {
  key: string;
  tags?: string[];
  ttlMs?: number;
  loader: () => Promise<T>;
};

const DEFAULT_TTL_MS = 15_000;
const MAX_ENTRIES = 250;

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export const READ_MODEL_TAGS = {
  sales: "data:sales",
  conciliacao: "data:conciliacao",
  quote: "data:quote",
  metas: "data:metas",
  dashboard: "view:dashboard",
  vendasKpis: "view:vendas-kpis",
  ranking: "view:ranking",
  comissoes: "view:comissoes",
} as const;

function nowMs() {
  return Date.now();
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function normalizeIds(values?: string[] | null) {
  return Array.from(
    new Set(
      (values || []).map((value) => String(value || "").trim()).filter(Boolean),
    ),
  ).sort();
}

export function scopeCacheTags(params: {
  companyIds?: string[] | null;
  vendedorIds?: string[] | null;
  userId?: string | null;
}) {
  return [
    ...normalizeIds(params.companyIds).map((id) => `company:${id}`),
    ...normalizeIds(params.vendedorIds).map((id) => `vendedor:${id}`),
    ...(params.userId ? [`user:${String(params.userId).trim()}`] : []),
  ].filter(Boolean);
}

export function buildReadModelCacheKey(
  namespace: string,
  parts: Record<string, unknown>,
) {
  return `${namespace}:${JSON.stringify(stableValue(parts))}`;
}

function pruneExpired(now = nowMs()) {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

function pruneBySize() {
  if (cache.size <= MAX_ENTRIES) return;

  const ordered = Array.from(cache.entries()).sort(
    (left, right) => left[1].lastAccessAt - right[1].lastAccessAt,
  );
  const removeCount = Math.max(0, ordered.length - MAX_ENTRIES);
  for (let i = 0; i < removeCount; i += 1) {
    cache.delete(ordered[i][0]);
  }
}

export async function getCachedReadModel<T>(
  options: CacheOptions<T>,
): Promise<T> {
  const ttlMs = Math.max(1_000, options.ttlMs ?? DEFAULT_TTL_MS);
  const now = nowMs();
  const existing = cache.get(options.key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    existing.lastAccessAt = now;
    return existing.value;
  }

  const pending = inflight.get(options.key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = options
    .loader()
    .then((value) => {
      cache.set(options.key, {
        value,
        expiresAt: nowMs() + ttlMs,
        lastAccessAt: nowMs(),
        tags: new Set(
          (options.tags || [])
            .map((tag) => String(tag || "").trim())
            .filter(Boolean),
        ),
      });
      pruneExpired();
      pruneBySize();
      return value;
    })
    .finally(() => {
      inflight.delete(options.key);
    });

  inflight.set(options.key, promise);
  return promise;
}

export function invalidateReadModelCache(options?: {
  tags?: string[];
  keyPrefix?: string;
}) {
  const tags = new Set(
    (options?.tags || [])
      .map((tag) => String(tag || "").trim())
      .filter(Boolean),
  );
  const keyPrefix = String(options?.keyPrefix || "").trim();

  if (tags.size === 0 && !keyPrefix) {
    cache.clear();
    inflight.clear();
    return;
  }

  for (const [key, entry] of cache.entries()) {
    const matchesPrefix = keyPrefix ? key.startsWith(keyPrefix) : false;
    const matchesTag =
      tags.size > 0 && Array.from(tags).some((tag) => entry.tags.has(tag));
    if (matchesPrefix || matchesTag) cache.delete(key);
  }
}

export function invalidateSalesReadModels(params?: {
  companyIds?: string[] | null;
  vendedorIds?: string[] | null;
  userId?: string | null;
}) {
  invalidateReadModelCache({
    tags: [
      READ_MODEL_TAGS.sales,
      READ_MODEL_TAGS.conciliacao,
      READ_MODEL_TAGS.dashboard,
      READ_MODEL_TAGS.vendasKpis,
      READ_MODEL_TAGS.ranking,
      READ_MODEL_TAGS.comissoes,
      ...scopeCacheTags(params || {}),
    ],
  });
}
