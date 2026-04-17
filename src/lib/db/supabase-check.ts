/**
 * Diagnóstico de conexão com Supabase
 * Use este arquivo para verificar se as credenciais estão configuradas
 */

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function checkSupabaseConfig() {
  const config = {
    url: PUBLIC_SUPABASE_URL || 'NÃO CONFIGURADO',
    key: PUBLIC_SUPABASE_ANON_KEY ? 'CONFIGURADA (oculta)' : 'NÃO CONFIGURADA',
    isValid: !!(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY && 
               !PUBLIC_SUPABASE_URL.includes('seu-projeto') &&
               !PUBLIC_SUPABASE_ANON_KEY.includes('sua-anon-key'))
  };
  
  console.log('🔍 [Supabase Check] Configuração:', config);
  
  return config;
}

export function isSupabaseConfigured(): boolean {
  try {
    return !!(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY && 
              !PUBLIC_SUPABASE_URL.includes('seu-projeto') &&
              !PUBLIC_SUPABASE_ANON_KEY.includes('sua-anon-key') &&
              !PUBLIC_SUPABASE_URL.includes('placeholder') &&
              !PUBLIC_SUPABASE_ANON_KEY.includes('placeholder'));
  } catch {
    return false;
  }
}
