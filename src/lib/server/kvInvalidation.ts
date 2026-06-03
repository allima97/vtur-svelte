/**
 * kvInvalidation.ts
 *
 * Invalidação distribuída via Cloudflare KV.
 *
 * PROBLEMA:
 *   Em Cloudflare Workers, cada instância tem seu próprio Map em memória.
 *   Quando uma venda é salva e o cache é invalidado via invalidateSalesReadModels(),
 *   apenas a instância que processou o request tem seu cache limpo.
 *   Outras instâncias continuam servindo dados stale até o TTL expirar (30s).
 *
 * SOLUÇÃO:
 *   Armazenamos um "epoch de invalidação" no KV, com TTL curto.
 *   Cada instância verifica o epoch do KV periodicamente (no início de requests críticos).
 *   Se o epoch do KV for maior que o epoch local, a instância invalida seu cache.
 *
 * TRADE-OFFS:
 *   - Latência: 1 leitura KV por verificação (~1-5ms p/ Cloudflare KV)
 *   - Consistência: eventual — pode levar até POLL_INTERVAL_MS para propagar
 *   - Não requer bindings extras além do KV namespace "KV_CACHE"
 *
 * CONFIGURAÇÃO (wrangler.toml):
 *   [[kv_namespaces]]
 *   binding = "KV_BINDING"
 *   id = "60fa423718914712bec4f489d41c3dd6"
 */

import { invalidateReadModelCache, READ_MODEL_TAGS } from '$lib/server/readModelCache';
import { logServerError } from '$lib/server/v1';

const KV_EPOCH_KEY = 'invalidation:sales:epoch';
// Verificar KV a cada 2s: reduz a janela de inconsistência cross-instance de 5s para 2s.
// O overhead é mínimo — leitura KV é ~1ms e fire-and-forget (não bloqueia requests).
const POLL_INTERVAL_MS = 2_000;
const KV_EPOCH_TTL_SECONDS = 300; // TTL de 5 minutos no KV (apenas para limpeza automática)

// Estado local da instância
let localEpoch = 0;
let lastKvCheckAt = 0;
let kvNamespaceRef: KVNamespace | null = null;

export type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

function isKVNamespace(value: unknown): value is KVNamespace {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as { get?: unknown }).get === 'function' &&
      typeof (value as { put?: unknown }).put === 'function',
  );
}

/**
 * Inicializa a referência ao KV namespace.
 * Deve ser chamado com o env do Worker (event.platform.env).
 * Idempotente — só guarda a referência na primeira chamada.
 */
export function initKvNamespace(env: Record<string, unknown> | null | undefined) {
  if (!env) return;
  const kv = env.KV_BINDING;
  if (isKVNamespace(kv)) {
    kvNamespaceRef = kv;
  }
}

/**
 * Retorna true se o KV namespace está disponível.
 */
export function isKvAvailable(): boolean {
  return kvNamespaceRef !== null;
}

/**
 * Verifica se o epoch do KV é maior que o epoch local.
 * Se sim, invalida o cache desta instância.
 *
 * Throttled por POLL_INTERVAL_MS para não bater no KV em toda request.
 * Fire-and-forget — não bloqueia a request.
 */
export function checkKvEpochAsync(): void {
  if (!kvNamespaceRef) return;

  const now = Date.now();
  if (now - lastKvCheckAt < POLL_INTERVAL_MS) return;
  lastKvCheckAt = now;

  const kv = kvNamespaceRef;
  Promise.resolve(kv.get(KV_EPOCH_KEY))
    .then((rawEpoch) => {
      if (!rawEpoch) return;
      const kvEpoch = Number(rawEpoch);
      if (!Number.isFinite(kvEpoch)) return;
      if (kvEpoch > localEpoch) {
        localEpoch = kvEpoch;
        // Invalida dados transacionais locais para forçar recarga do DB
        invalidateReadModelCache({
          tags: [
            READ_MODEL_TAGS.sales,
            READ_MODEL_TAGS.dashboard,
            READ_MODEL_TAGS.vendasKpis,
            READ_MODEL_TAGS.ranking,
            READ_MODEL_TAGS.comissoes,
            READ_MODEL_TAGS.conciliacao,
          ],
        });
      }
    })
    .catch((err) => {
      // Silencioso — KV indisponível não deve quebrar requests
      logServerError('[kvInvalidation] falha ao verificar epoch do KV', err);
    });
}

/**
 * Publica um novo epoch de invalidação no KV.
 * Deve ser chamado após mutações de vendas/recibos.
 * Fire-and-forget — não bloqueia a response.
 */
export function publishKvInvalidationAsync(scope?: {
  companyIds?: string[] | null;
}): void {
  if (!kvNamespaceRef) return;

  const kv = kvNamespaceRef;
  const newEpoch = Date.now();
  localEpoch = newEpoch; // Atualiza epoch local imediatamente

  // Se temos scope específico, publicar epoch por empresa também
  const companyIds: string[] = [];
  for (const companyId of scope?.companyIds || []) {
    if (companyId) companyIds.push(companyId);
  }

  const writes: Promise<void>[] = [
    Promise.resolve(
      kv.put(KV_EPOCH_KEY, String(newEpoch), { expirationTtl: KV_EPOCH_TTL_SECONDS })
    ),
  ];

  for (const companyId of companyIds) {
    const companyKey = `invalidation:sales:company:${companyId}`;
    writes.push(
      Promise.resolve(
        kv.put(companyKey, String(newEpoch), { expirationTtl: KV_EPOCH_TTL_SECONDS })
      ),
    );
  }

  Promise.all(writes).catch((err) => {
    logServerError('[kvInvalidation] falha ao publicar epoch no KV', err);
  });
}
