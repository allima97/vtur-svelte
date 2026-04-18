import { writable, derived } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';

// Types
export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

// Store inicial
const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  error: null
};

const loggedOutState: AuthState = {
  user: null,
  session: null,
  loading: false,
  error: null
};

// Sinaliza que o cookie de sessão já foi sincronizado com o servidor
// O dashboard e outras páginas devem aguardar isso antes de chamar APIs
export const sessionSynced = writable<boolean>(false);

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    // Set user e session
    setAuth: (user: User | null, session: Session | null) => {
      update(state => ({
        ...state,
        user,
        session,
        loading: false,
        error: null
      }));
    },
    
    // Set loading
    setLoading: (loading: boolean) => {
      update(state => ({ ...state, loading }));
    },
    
    // Set error
    setError: (error: string | null) => {
      update(state => ({ ...state, error, loading: false }));
    },
    
    // Clear auth (logout)
    clear: () => {
      set(loggedOutState);
    },
    
    // Update user
    updateUser: (user: User | null) => {
      update(state => ({ ...state, user }));
    }
  };
}

export const auth = createAuthStore();

// Derived stores
export const isAuthenticated = derived(
  auth,
  $auth => !!$auth.user && !!$auth.session
);

export const user = derived(
  auth,
  $auth => $auth.user
);

export const isLoading = derived(
  auth,
  $auth => $auth.loading
);

export const userType = derived(
  user,
  $user => {
    if (!$user) return null;
    return $user.user_metadata?.tipo_usuario || 'VENDEDOR';
  }
);

export const userEmpresa = derived(
  user,
  $user => {
    if (!$user) return null;
    return $user.user_metadata?.empresa_id || null;
  }
);

export const isSystemAdmin = derived(
  userType,
  $type => $type === 'ADMIN' || $type === 'ADMINISTRADOR'
);

export const isGestor = derived(
  userType,
  $type => $type === 'GESTOR' || $type === 'ADMIN' || $type === 'ADMINISTRADOR'
);

export const isMaster = derived(
  userType,
  $type => $type === 'MASTER'
);
