import type { SupabaseClient as BaseSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { env as publicEnv } from '$env/dynamic/public';
import { browser } from '$app/environment';
import { mockSupabaseClient, shouldUseMock } from './supabase-mock';

// Cliente singleton para o browser
let browserClient: ReturnType<typeof createBrowserClient> | null = null;
let usingMock = false;

function getSupabasePublicConfig() {
  return {
    url: publicEnv.PUBLIC_SUPABASE_URL,
    anonKey: publicEnv.PUBLIC_SUPABASE_ANON_KEY
  };
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
    browserClient = createBrowserClient(url, anonKey);
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
    cookies: {
      get: (name) => cookies.get(name),
      set: (name, value, options) => cookies.set(name, value, options),
      remove: (name, options) => cookies.remove(name, options)
    }
  });
}

/**
 * Tipo do cliente Supabase
 */
export type SupabaseClient = BaseSupabaseClient;
