import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiOptions {
  method?: ApiMethod;
  body?: Record<string, unknown> | FormData | string | null;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildQueryString(query?: Record<string, string | number | boolean | undefined | null>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function handleUnauthorized() {
  if (browser) {
    goto('/auth/login');
  }
}

function handleForbidden() {
  if (browser) {
    goto('/negado');
  }
}

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const queryString = buildQueryString(options.query);
  const url = `${path}${queryString}`;

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

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: requestBody,
    signal: options.signal,
    credentials: 'same-origin'
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (response.status === 403) {
    handleForbidden();
    throw new Error('Acesso negado.');
  }

  if (!response.ok) {
    let message = `Erro ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      message = errorData?.message || errorData?.error || message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  const contentLength = response.headers.get('content-length');
  if (response.status === 204 || contentLength === '0') {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function apiGet<T = unknown>(path: string, query?: ApiOptions['query'], signal?: AbortSignal) {
  return apiFetch<T>(path, { method: 'GET', query, signal });
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
