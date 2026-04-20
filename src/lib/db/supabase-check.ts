/**
 * Diagnóstico de conexão com Supabase
 * Use este arquivo para verificar se as credenciais estão configuradas
 */

import { env as publicEnv } from '$env/dynamic/public';

export function checkSupabaseConfig() {
  const url = publicEnv.PUBLIC_SUPABASE_URL;
  const anonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;
  const config = {
    url: url || 'NÃO CONFIGURADO',
    key: anonKey ? 'CONFIGURADA (oculta)' : 'NÃO CONFIGURADA',
    isValid: !!(url && anonKey && 
               !url.includes('seu-projeto') &&
               !anonKey.includes('sua-anon-key'))
  };
  
  console.log('🔍 [Supabase Check] Configuração:', config);
  
  return config;
}

export function isSupabaseConfigured(): boolean {
  try {
    const url = publicEnv.PUBLIC_SUPABASE_URL;
    const anonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;
    return !!(url && anonKey && 
              !url.includes('seu-projeto') &&
              !anonKey.includes('sua-anon-key') &&
              !url.includes('placeholder') &&
              !anonKey.includes('placeholder'));
  } catch {
    return false;
  }
}
