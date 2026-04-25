/**
 * Mock de autenticação para desenvolvimento local
 * Substitui as chamadas ao Supabase quando não há credenciais configuradas
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { env as publicEnv } from '$env/dynamic/public';

const MOCK_USER = {
  id: 'mock-user-001',
  email: 'admin@vtur.com',
  user_metadata: {
    nome: 'Administrador',
    tipo: 'ADMIN'
  }
};

const MOCK_SESSION = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  expires_at: Date.now() + 3600000,
  user: MOCK_USER
};

// Salva sessão mock no localStorage
function saveMockSession() {
  if (browser) {
    localStorage.setItem('vtur_mock_session', JSON.stringify(MOCK_SESSION));
    localStorage.setItem('vtur_mock_user', JSON.stringify(MOCK_USER));
  }
}

// Remove sessão mock
function clearMockSession() {
  if (browser) {
    localStorage.removeItem('vtur_mock_session');
    localStorage.removeItem('vtur_mock_user');
  }
}

// Verifica se tem sessão mock
function hasMockSession(): boolean {
  if (!browser) return false;
  return !!localStorage.getItem('vtur_mock_session');
}

// Cliente mock do Supabase
export const mockSupabaseClient = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Aceita qualquer email/senha para teste
      saveMockSession();
      
      return {
        data: {
          session: MOCK_SESSION,
          user: MOCK_USER
        },
        error: null
      };
    },
    
    signOut: async () => {
      clearMockSession();
      return { error: null };
    },
    
    getSession: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (hasMockSession()) {
        return {
          data: { session: MOCK_SESSION },
          error: null
        };
      }
      
      return {
        data: { session: null },
        error: null
      };
    },
    
    getUser: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (hasMockSession()) {
        return {
          data: { user: MOCK_USER },
          error: null
        };
      }
      
      return {
        data: { user: null },
        error: null
      };
    },
    
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Retorna subscription mock
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  },
  
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
        order: () => ({ data: [], error: null })
      }),
      order: () => ({ data: [], error: null }),
      limit: () => ({ data: [], error: null })
    }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    delete: () => ({ data: null, error: null })
  })
};

// Verifica se deve usar mock (quando não há credenciais do Supabase)
export function shouldUseMock(): boolean {
  try {
    // No browser, verifica localStorage primeiro
    if (typeof window !== 'undefined') {
      const host = String(window.location?.hostname || '').toLowerCase();
      const isLocalHost =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host === '[::1]' ||
        host.endsWith('.local');

      const forceMock = localStorage.getItem('vtur_force_mock');
      if (isLocalHost && forceMock === 'true') return true;
    }
    
    // Verifica se as credenciais são válidas
    const url = publicEnv.PUBLIC_SUPABASE_URL;
    const key = publicEnv.PUBLIC_SUPABASE_ANON_KEY;
    
    // Se não há URL ou key, ou são os valores padrão de exemplo, usa mock
    if (!url || !key) return true;
    if (url.includes('seu-projeto') || url.includes('placeholder')) return true;
    if (key.includes('sua-anon-key') || key.includes('placeholder')) return true;
    
    return false;
  } catch (e) {
    console.error('🔍 [Supabase] Erro ao verificar mock:', e);
    return true;
  }
}
