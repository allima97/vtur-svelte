import type { SupabaseClient as BaseSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { env as publicEnv } from '$env/dynamic/public';
import { browser } from '$app/environment';
import { mockSupabaseClient, shouldUseMock } from './supabase-mock';

// Cliente singleton para o browser
let browserClient: ReturnType<typeof createBrowserClient> | null = null;
let usingMock = false;

const RETRYABLE_NETWORK_ERRORS = ['failed to fetch', 'err_connection_closed', 'networkerror'];

function isRetryableNetworkError(error: unknown) {
  const message = String((error as any)?.message || '').toLowerCase();
  if (!message) return false;
  return RETRYABLE_NETWORK_ERRORS.some((needle) => message.includes(needle));
}

function createResilientFetch(baseUrl: string) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const runFetch = () => fetch(input as any, init);

    try {
      return await runFetch();
    } catch (err) {
      const requestUrl = String(input instanceof URL ? input.toString() : input || '');
      const isSupabaseRequest = requestUrl.startsWith(baseUrl);
      if (!isSupabaseRequest || !isRetryableNetworkError(err)) {
        throw err;
      }

      // Retry unico para oscilações transitórias de rede no browser.
      await new Promise((resolve) => setTimeout(resolve, 250));
      return runFetch();
    }
  };
}

function getSupabasePublicConfig() {
  return {
    url: publicEnv.PUBLIC_SUPABASE_URL,
    anonKey: publicEnv.PUBLIC_SUPABASE_ANON_KEY
  };
}

export function getSupabaseAuthStorageKey() {
  const { url } = getSupabasePublicConfig();
  if (!url) return 'sb-auth-token';

  try {
    const hostname = new URL(url).hostname;
    const projectRef = hostname.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : 'sb-auth-token';
  } catch {
    return 'sb-auth-token';
  }
}

/**
 * Cria ou retorna um cliente Supabase para o browser
 */
export function createSupabaseBrowserClient() {
  if (!browser) {
    throw new Error('createSupabaseBrowserClient só pode ser chamado no browser');
  }
  
  // Usa mock se não há credenciais válidas
  if (shouldUseMock()) {
    usingMock = true;
    return mockSupabaseClient as any;
  }
  
  if (!browserClient) {
    const { url, anonKey } = getSupabasePublicConfig();
    if (!url || !anonKey) {
      throw new Error('Credenciais publicas do Supabase nao configuradas');
    }
    browserClient = createBrowserClient(url, anonKey, {
      cookieOptions: {
        name: getSupabaseAuthStorageKey()
      },
      global: {
        fetch: createResilientFetch(url)
      }
    });
  }
  
  return browserClient;
}

/**
 * Cliente Supabase para uso em stores e componentes
 */
export const supabase = browser ? createSupabaseBrowserClient() : null as any;

/**
 * Indica se está usando modo mock (sem Supabase real)
 */
export const isMockMode = () => usingMock;

/**
 * Cria um cliente Supabase para o servidor
 */
export function createSupabaseServerClient(cookies: {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options: Record<string, unknown>) => void;
  remove: (name: string, options: Record<string, unknown>) => void;
  getAll?: () => Array<{ name: string; value: string }>;
  setAll?: (entries: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void;
}) {
  // Usa mock se não há credenciais válidas
  if (shouldUseMock()) {
    return mockSupabaseClient as any;
  }

  const { url, anonKey } = getSupabasePublicConfig();
  if (!url || !anonKey) {
    throw new Error('Credenciais publicas do Supabase nao configuradas');
  }
  
  return createServerClient(url, anonKey, {
    cookieOptions: {
      name: getSupabaseAuthStorageKey()
    },
    cookies: {
      // Compatibilidade com @supabase/ssr: usa getAll/setAll para leitura/escrita de cookies.
      getAll: () => (typeof cookies.getAll === 'function' ? cookies.getAll() : []),
      setAll: (entries) => {
        if (typeof cookies.setAll === 'function') {
          cookies.setAll(entries);
          return;
        }
        entries.forEach((entry) => {
          cookies.set(entry.name, entry.value, entry.options || {});
        });
      }
    }
  });
}

/**
 * Tipo do cliente Supabase
 */
export type SupabaseClient = BaseSupabaseClient;
