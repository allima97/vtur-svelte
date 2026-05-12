import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { toast } from '$lib/stores/ui';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiOptions {
  method?: ApiMethod;
  body?: Record<string, unknown> | FormData | string | null;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  timeoutMs?: number;
  redirectOnForbidden?: boolean;
  redirectOnUnauthorized?: boolean;
}

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const DEFAULT_API_TIMEOUT_MS = 20_000;  // era 90s — reduzido para 20s (falha rápida, não trava a tela)
const DEFAULT_GET_CACHE_TTL_MS = 15_000; // era 5s — aumentado para 15s (navegações rápidas reaproveitam cache)

type CachedGetEntry = {
  expiresAt: number;
  promise?: Promise<unknown>;
  value?: unknown;
};

const getCache = new Map<string, CachedGetEntry>();

function shouldBypassLocalGetCache(url: string) {
  return [
    '/api/v1/dashboard/summary',
    '/api/v1/relatorios/ranking',
    '/api/v1/relatorios/vendas',
    '/api/v1/vendas/kpis',
    '/api/v1/vendas/list'
  ].some((prefix) => url.startsWith(prefix));
}

function buildQueryString(query?: Record<string, string | number | boolean | undefined | null>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function handleUnauthorized() {
  if (browser) {
    toast.warning('Sua sessão expirou. Faça login novamente.', 6000);
    goto('/auth/login?session_expired=1');
  }
}

function handleForbidden() {
  if (browser) {
    goto('/negado');
  }
}

function fallbackErrorMessage(response: Response) {
  return `Erro ${response.status}: ${response.statusText || 'Falha na requisição'}`;
}

function safeTextMessage(value: string, fallback: string) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (text.startsWith('<!doctype') || text.startsWith('<html')) return fallback;
  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}

async function readError(response: Response) {
  const fallback = fallbackErrorMessage(response);
  const raw = await response.text().catch(() => '');
  if (!raw) return { message: fallback };

  try {
    const errorData = JSON.parse(raw);
    return {
      message:
        safeTextMessage(errorData?.message, '') ||
        safeTextMessage(errorData?.error, '') ||
        safeTextMessage(errorData?.details, '') ||
        fallback,
      payload: errorData
    };
  } catch {
    return { message: safeTextMessage(raw, fallback) };
  }
}

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const queryString = buildQueryString(options.query);
  const url = `${path}${queryString}`;
  const method = options.method || 'GET';
  const isCacheableGet =
    browser &&
    method === 'GET' &&
    !options.signal &&
    !options.headers &&
    !options.body &&
    !shouldBypassLocalGetCache(url);

  if (isCacheableGet) {
    const cached = getCache.get(url);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      if (cached.promise) return cached.promise as Promise<T>;
      return cached.value as T;
    }
  } else if (browser && method !== 'GET') {
    getCache.clear();
  }

  const timeoutMs = Math.max(1_000, Number(options.timeoutMs || DEFAULT_API_TIMEOUT_MS));
  const controller = options.signal ? null : new AbortController();
  const timeout = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  const isFormData = options.body instanceof FormData;
  const isString = typeof options.body === 'string';

  const headers: Record<string, string> = {
    ...(options.headers || {})
  };

  if (!isFormData && !isString && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const requestBody: BodyInit | undefined = options.body
    ? isFormData || isString
      ? (options.body as BodyInit)
      : JSON.stringify(options.body)
    : undefined;

  const requestPromise = (async () => {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: requestBody,
        signal: options.signal || controller?.signal,
        credentials: 'same-origin'
      });
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      throw new ApiError(
        aborted ? 'A requisição demorou demais. Tente novamente.' : 'Falha de conexão com o servidor.',
        0,
        err
      );
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (response.status === 401) {
      if (options.redirectOnUnauthorized !== false) {
        handleUnauthorized();
      }
      throw new ApiError('Sessão expirada. Faça login novamente.', 401);
    }

    if (response.status === 403) {
      if (options.redirectOnForbidden !== false) {
        handleForbidden();
      }
      throw new ApiError('Acesso negado.', 403);
    }

    if (!response.ok) {
      const error = await readError(response);
      throw new ApiError(error.message, response.status, error.payload);
    }

    const contentLength = response.headers.get('content-length');
    if (response.status === 204 || contentLength === '0') {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  })();

  if (isCacheableGet) {
    const entry: CachedGetEntry = {
      expiresAt: Date.now() + DEFAULT_GET_CACHE_TTL_MS,
      promise: requestPromise
    };
    getCache.set(url, entry);
    try {
      const value = await requestPromise;
      entry.value = value;
      entry.promise = undefined;
      entry.expiresAt = Date.now() + DEFAULT_GET_CACHE_TTL_MS;
      return value as T;
    } catch (err) {
      getCache.delete(url);
      throw err;
    }
  }

  return requestPromise;
}

export function apiGet<T = unknown>(path: string, query?: ApiOptions['query'], signal?: AbortSignal, timeoutMs?: number) {
  return apiFetch<T>(path, { method: 'GET', query, signal, ...(timeoutMs ? { timeoutMs } : {}) });
}

export function apiPost<T = unknown>(path: string, body: ApiOptions['body'], signal?: AbortSignal) {
  return apiFetch<T>(path, { method: 'POST', body, signal });
}

export function apiPatch<T = unknown>(path: string, body: ApiOptions['body'], signal?: AbortSignal) {
  return apiFetch<T>(path, { method: 'PATCH', body, signal });
}

export function apiPut<T = unknown>(path: string, body: ApiOptions['body'], signal?: AbortSignal) {
  return apiFetch<T>(path, { method: 'PUT', body, signal });
}

export function apiDelete<T = unknown>(path: string, query?: ApiOptions['query'], signal?: AbortSignal) {
  return apiFetch<T>(path, { method: 'DELETE', query, signal });
}
