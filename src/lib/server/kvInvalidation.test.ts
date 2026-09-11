import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCachedReadModelWithKv,
  initKvNamespace,
  publishKvInvalidationAsync,
  type KVNamespace
} from '$lib/server/kvInvalidation';
import { invalidateReadModelCache } from '$lib/server/readModelCache';

// Mock mínimo de um KV namespace do Cloudflare: get/put em memória, com
// expiração simulada via expirationTtl (segundos) + o relógio fake do vitest.
function createMockKv(): KVNamespace & { size: () => number } {
  const store = new Map<string, { value: string; expiresAtMs: number | null }>();

  return {
    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAtMs !== null && entry.expiresAtMs <= Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      const expiresAtMs = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null;
      store.set(key, { value, expiresAtMs });
    },
    size: () => store.size
  };
}

// Cada teste usa um prefixo de chave único para não colidir com o cache em
// memória de getCachedReadModel (Map module-level, compartilhado entre testes
// no mesmo arquivo) nem com o epoch global do kvInvalidation (também
// module-level).
let keySeq = 0;
function uniqueKey(label: string) {
  keySeq += 1;
  return `test:${label}:${keySeq}`;
}

describe('getCachedReadModelWithKv', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sem KV configurado, funciona como getCachedReadModel normal (usa só o loader)', async () => {
    const key = uniqueKey('no-kv');
    const loader = vi.fn(async () => 'valor-a');

    const first = await getCachedReadModelWithKv({ key, loader, ttlMs: 30_000 });
    const second = await getCachedReadModelWithKv({ key, loader, ttlMs: 30_000 });

    expect(first).toBe('valor-a');
    expect(second).toBe('valor-a');
    // segunda chamada serviu do cache em memória (getCachedReadModel), não
    // rodou o loader de novo.
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('uma "instância fria" (cache local limpo) reaproveita o valor gravado no KV por outra chamada', async () => {
    const kv = createMockKv();
    initKvNamespace({ KV_BINDING: kv });

    const key = uniqueKey('kv-hit');
    const loader = vi.fn(async () => ({ ids: ['x', 'y'] }));

    const first = await getCachedReadModelWithKv({ key, loader, ttlMs: 30_000, kvTtlSeconds: 30 });
    expect(first).toEqual({ ids: ['x', 'y'] });
    expect(loader).toHaveBeenCalledTimes(1);

    // Simula uma instância fria: limpa o cache em memória (Map local), mas o
    // KV mockado continua com o valor gravado na chamada anterior.
    invalidateReadModelCache();

    const second = await getCachedReadModelWithKv({ key, loader, ttlMs: 30_000, kvTtlSeconds: 30 });
    expect(second).toEqual({ ids: ['x', 'y'] });
    // o loader real (que "bateria no Postgres") NÃO deve ter sido chamado de
    // novo -- o valor veio do KV.
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('uma entrada do KV mais velha que kvTtlSeconds é tratada como miss (loader roda de novo)', async () => {
    const kv = createMockKv();
    initKvNamespace({ KV_BINDING: kv });

    const key = uniqueKey('kv-stale');
    const loader = vi.fn(async () => 'valor-fresco');

    await getCachedReadModelWithKv({ key, loader, ttlMs: 30_000, kvTtlSeconds: 30 });
    invalidateReadModelCache();

    // Avança o relógio além do kvTtlSeconds (30s) mas mantém a entrada viva
    // no mock (que só expira por expirationTtl, não pelo teste) -- assim
    // testamos especificamente o check `Date.now() - writtenAt` do código,
    // não a expiração do mock de KV.
    vi.setSystemTime(new Date(Date.now() + 31_000));

    await getCachedReadModelWithKv({ key, loader, ttlMs: 30_000, kvTtlSeconds: 30 });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('depois de um novo epoch publicado, a geração antiga do KV fica órfã (loader roda de novo)', async () => {
    const kv = createMockKv();
    initKvNamespace({ KV_BINDING: kv });

    const key = uniqueKey('kv-epoch');
    const loader = vi.fn(async () => 'valor-v1');

    await getCachedReadModelWithKv({ key, loader, ttlMs: 30_000, kvTtlSeconds: 60 });
    invalidateReadModelCache();

    // Avança o relógio um pouco (epoch = Date.now(), precisa mudar de valor)
    // e publica uma invalidação -- simula uma mutação de vendas em outra
    // instância que este processo já observou (localEpoch atualizado).
    vi.setSystemTime(new Date(Date.now() + 1_000));
    publishKvInvalidationAsync();

    await getCachedReadModelWithKv({ key, loader, ttlMs: 30_000, kvTtlSeconds: 60 });
    // mesma chave lógica, mas epoch novo -> bucket diferente no KV -> miss
    // local (limpo acima) + miss no KV (geração antiga, nunca escrita) ->
    // loader roda de novo, e a resposta reflete o estado "atual" em vez de
    // servir a geração anterior ao epoch.
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
