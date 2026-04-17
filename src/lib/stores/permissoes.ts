import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { db } from '$lib/db/dexie';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PermissaoNivel = 'none' | 'view' | 'create' | 'edit' | 'delete' | 'admin';

export interface PermissoesState {
  userId: string | null;
  userType: string;
  isSystemAdmin: boolean;
  isMaster: boolean;
  isGestor: boolean;
  isVendedor: boolean;
  permissoes: Record<string, PermissaoNivel>;
  ready: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: PermissoesState = {
  userId: null,
  userType: '',
  isSystemAdmin: false,
  isMaster: false,
  isGestor: false,
  isVendedor: false,
  permissoes: {},
  ready: false,
  loading: false,
  error: null
};

const permLevel = (p: PermissaoNivel): number => {
  switch (p) {
    case 'admin': return 5;
    case 'delete': return 4;
    case 'edit': return 3;
    case 'create': return 2;
    case 'view': return 1;
    default: return 0;
  }
};

function createPermissoesStore() {
  const { subscribe, set, update } = writable<PermissoesState>(initialState);

  return {
    subscribe,
    
    /**
     * Inicializa o store de permissões
     */
    init: async (supabase: SupabaseClient) => {
      update((s) => ({ ...s, loading: true, error: null }));
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          set(initialState);
          return;
        }

        // Buscar perfil do usuário
        const { data: profile } = await supabase
          .from('users')
          .select('id, user_types(name), uso_individual, company_id')
          .eq('id', user.id)
          .single();

        const userTypeData = profile?.user_types as { name: string }[] | { name: string } | null;
        const userTypeName = Array.isArray(userTypeData) 
          ? userTypeData[0]?.name 
          : userTypeData?.name;
        const userType = String(userTypeName || '').toUpperCase();
        
        const isSystemAdmin = userType.includes('ADMIN');
        const isMaster = userType.includes('MASTER');
        const isGestor = userType.includes('GESTOR');
        const isVendedor = !isSystemAdmin && !isMaster && !isGestor;

        // Buscar permissões do módulo_acesso
        const { data: acessos } = await supabase
          .from('modulo_acesso')
          .select('modulo, permissao, ativo')
          .eq('usuario_id', user.id)
          .eq('ativo', true);

        const permissoes: Record<string, PermissaoNivel> = {};
        
        acessos?.forEach((acesso) => {
          const modulo = String(acesso.modulo || '').toLowerCase().trim();
          if (modulo) {
            permissoes[modulo] = acesso.permissao as PermissaoNivel;
          }
        });

        // Cache local
        if (browser) {
          await db.permissoes.bulkPut(
            Object.entries(permissoes).map(([modulo, permissao]) => ({
              id: `${user.id}-${modulo}`,
              userId: user.id,
              modulo,
              permissao,
              updatedAt: new Date()
            }))
          );
        }

        set({
          userId: user.id,
          userType,
          isSystemAdmin,
          isMaster,
          isGestor,
          isVendedor,
          permissoes,
          ready: true,
          loading: false,
          error: null
        });

      } catch (err) {
        update((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Erro ao carregar permissões'
        }));
      }
    },

    /**
     * Verifica se o usuário tem uma permissão mínima
     */
    can: (modulo: string, nivel: PermissaoNivel = 'view'): boolean => {
      const state = get({ subscribe });
      if (state.isSystemAdmin) return true;
      
      const moduloKey = modulo.toLowerCase().trim();
      const userPerm = state.permissoes[moduloKey] || 'none';
      
      return permLevel(userPerm) >= permLevel(nivel);
    },

    /**
     * Verifica permissão específica (reactive)
     */
    createCanChecker: (modulo: string, nivel: PermissaoNivel = 'view') => {
      return derived({ subscribe }, ($state) => {
        if ($state.isSystemAdmin) return true;
        const userPerm = $state.permissoes[modulo.toLowerCase().trim()] || 'none';
        return permLevel(userPerm) >= permLevel(nivel);
      });
    },

    /**
     * Recarrega permissões
     */
    refresh: async function(supabase: SupabaseClient) {
      await this.init(supabase);
    },

    /**
     * Reseta o store
     */
    reset: () => {
      set(initialState);
    }
  };
}

export const permissoes = createPermissoesStore();
