/**
 * Store de Permissões — vtur-svelte
 *
 * Portabilizado fielmente do vtur-app (src/lib/permissoesStore.ts).
 * Adaptado de React hooks para Svelte writable store.
 *
 * FUNCIONAMENTO:
 *  1. Carrega perfil do usuário (user_types, uso_individual)
 *  2. Carrega modulo_acesso (permissões por módulo)
 *  3. Carrega system_module_settings (módulos desabilitados globalmente)
 *  4. Resolve papel: ADMIN | MASTER | GESTOR | VENDEDOR | OUTRO
 *  5. Armazena acessos: Record<moduloDb, PermissaoNivel>
 *  6. can(moduloLabel) usa MODULO_HERANCA para checar ancestrais
 *  7. canDb(moduloDb) checa diretamente pela chave de BD
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { db } from '$lib/db/dexie';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MAPA_MODULOS,
  listarModulosComHeranca,
  normalizeModuloLabel,
} from '$lib/config/modulos';

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------

export type PermissaoNivel = 'none' | 'view' | 'create' | 'edit' | 'delete' | 'admin';

/**
 * Papel resolvido do usuário — baseado no tipo de conta.
 * Portabilizado de permissoesStore.ts do vtur-app.
 */
export type Papel = 'ADMIN' | 'MASTER' | 'GESTOR' | 'VENDEDOR' | 'OUTRO';

export interface PermissoesState {
  userId: string | null;
  userEmail: string;
  userType: string;
  papel: Papel;
  /** Compat: flags de papel usadas em páginas legadas do projeto */
  isMaster: boolean;
  isGestor: boolean;
  isVendedor: boolean;
  /** Se true, o usuário é admin do sistema (acesso irrestrito) */
  isSystemAdmin: boolean;
  /** Se true, uso individual — o usuário só vê seus próprios dados */
  usoIndividual: boolean;
  /**
   * acessos: chave de BD → nível de permissão.
   * Ex: { 'vendas_consulta': 'edit', 'parametros_crm': 'view' }
   * Compatível com modulo_acesso.modulo do banco.
   */
  acessos: Record<string, PermissaoNivel>;
  /** Módulos desabilitados globalmente no sistema (system_module_settings) */
  disabledModules: string[];
  /** Compat: alias legado para acessos */
  permissoes: Record<string, PermissaoNivel>;
  ready: boolean;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// HELPERS INTERNOS
// ---------------------------------------------------------------------------

/** Converte nível textual em número para comparação */
const permLevel = (p: PermissaoNivel | undefined): number => {
  switch (p) {
    case 'admin':  return 5;
    case 'delete': return 4;
    case 'edit':   return 3;
    case 'create': return 2;
    case 'view':   return 1;
    default:       return 0;
  }
};

/**
 * Resolve o papel do usuário com base no nome do tipo.
 * Portabilizado fielmente do vtur-app.
 */
function resolvePapel(tipoNome: string, usoIndividual: boolean): Papel {
  if (usoIndividual) return 'VENDEDOR';
  const nome = tipoNome.toUpperCase();
  if (nome.includes('ADMIN'))   return 'ADMIN';
  if (nome.includes('MASTER'))  return 'MASTER';
  if (nome.includes('GESTOR'))  return 'GESTOR';
  if (nome.includes('VENDEDOR')) return 'VENDEDOR';
  return 'OUTRO';
}

/**
 * Resolve se o usuário é admin do sistema.
 * ADMIN do sistema = tipo contém "ADMIN" E não é uso individual.
 */
function resolveIsSystemAdmin(tipoNome: string, usoIndividual: boolean): boolean {
  if (usoIndividual) return false;
  return tipoNome.toUpperCase().includes('ADMIN');
}

/**
 * Quando há múltiplas entradas para o mesmo módulo,
 * escolhe a melhor (ativo > maior nível > mais recente).
 * Portabilizado de pickBestAcesso do vtur-app.
 */
function pickBestPermissao(
  entries: Array<{ permissao: string; ativo: boolean }>,
): PermissaoNivel {
  const sorted = [...entries].sort((a, b) => {
    // Ativo primeiro
    if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
    // Maior nível depois
    return (
      permLevel(b.permissao as PermissaoNivel) -
      permLevel(a.permissao as PermissaoNivel)
    );
  });
  return (sorted[0]?.permissao as PermissaoNivel) || 'none';
}

// ---------------------------------------------------------------------------
// ESTADO INICIAL
// ---------------------------------------------------------------------------

const initialState: PermissoesState = {
  userId: null,
  userEmail: '',
  userType: '',
  papel: 'OUTRO',
  isMaster: false,
  isGestor: false,
  isVendedor: false,
  isSystemAdmin: false,
  usoIndividual: false,
  acessos: {},
  disabledModules: [],
  permissoes: {},
  ready: false,
  loading: false,
  error: null,
};

// ---------------------------------------------------------------------------
// STORE FACTORY
// ---------------------------------------------------------------------------

function createPermissoesStore() {
  const { subscribe, set, update } = writable<PermissoesState>(initialState);

  // ------------------------------------------------------------------
  // INIT — carrega tudo do Supabase
  // ------------------------------------------------------------------
  async function init(supabase: SupabaseClient): Promise<void> {
    update((s) => ({ ...s, loading: true, error: null }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set(initialState);
        return;
      }

      // 1. Perfil do usuário
      const { data: profile } = await supabase
        .from('users')
        .select('id, email, uso_individual, user_types(name)')
        .eq('id', user.id)
        .single();

      const userTypeData = profile?.user_types as
        | { name: string }[]
        | { name: string }
        | null;
      const userTypeName = Array.isArray(userTypeData)
        ? userTypeData[0]?.name
        : userTypeData?.name;
      const userType = String(userTypeName || '').toUpperCase();
      const usoIndividual = Boolean(profile?.uso_individual);

      const papel = resolvePapel(userType, usoIndividual);
      const isSystemAdmin = resolveIsSystemAdmin(userType, usoIndividual);

      // 2. Permissões por módulo (modulo_acesso)
      // Carrega TODOS os registros (ativo ou não) para pickBestPermissao
      const { data: acessosRaw } = await supabase
        .from('modulo_acesso')
        .select('modulo, permissao, ativo')
        .eq('usuario_id', user.id);

      // Agrupa por módulo para escolher o melhor quando houver duplicatas
      const grouped: Record<string, Array<{ permissao: string; ativo: boolean }>> = {};
      (acessosRaw || []).forEach((a) => {
        const key = String(a.modulo || '').toLowerCase().trim();
        if (!key) return;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({ permissao: a.permissao, ativo: Boolean(a.ativo) });
      });

      const acessos: Record<string, PermissaoNivel> = {};
      Object.entries(grouped).forEach(([modulo, entries]) => {
        const best = pickBestPermissao(entries);
        if (best !== 'none') {
          acessos[modulo] = best;
        }
      });

      // 3. Módulos desabilitados globalmente
      let disabledModules: string[] = [];
      try {
        const settingsResp = await supabase
          .from('system_module_settings')
          .select('module_key, enabled')
          .eq('enabled', false);

        if (!settingsResp.error) {
          disabledModules = (settingsResp.data || []).map((m) =>
            String(m.module_key || '').toLowerCase(),
          );
        } else {
          const code = String(settingsResp.error.code || '').toLowerCase();
          const message = String(settingsResp.error.message || '').toLowerCase();
          const relationMissing = code === '42p01' || message.includes('does not exist');

          // Compatibilidade com bases antigas que ainda usam system_module_catalog.
          if (relationMissing) {
            const legacyResp = await supabase
              .from('system_module_catalog')
              .select('key, enabled')
              .eq('enabled', false);

            if (!legacyResp.error) {
              disabledModules = (legacyResp.data || []).map((m) =>
                String(m.key || '').toLowerCase(),
              );
            }
          }
        }
      } catch {
        // Tabela pode não existir em instâncias antigas — ignorar silenciosamente
      }

      // 4. Cache local (IndexedDB via Dexie)
      if (browser) {
        try {
          await db.permissoes.bulkPut(
            Object.entries(acessos).map(([modulo, permissao]) => ({
              id: `${user.id}-${modulo}`,
              userId: user.id,
              modulo,
              permissao,
              updatedAt: new Date(),
            })),
          );
        } catch {
          // Cache é melhor-esforço — falha não deve bloquear
        }
      }

      set({
        userId: user.id,
        userEmail: profile?.email || user.email || '',
        userType,
        papel,
        isMaster: papel === 'MASTER',
        isGestor: papel === 'GESTOR',
        isVendedor: papel === 'VENDEDOR',
        isSystemAdmin,
        usoIndividual,
        acessos,
        disabledModules,
        permissoes: acessos,
        ready: true,
        loading: false,
        error: null,
      });
    } catch (err) {
      update((s) => ({
        ...s,
        loading: false,
        ready: true,
        error: err instanceof Error ? err.message : 'Erro ao carregar permissões',
      }));
    }
  }

  // ------------------------------------------------------------------
  // canDb — verifica por chave de BD (ex: "parametros_crm")
  // Portabilizado do vtur-app canDb()
  // ------------------------------------------------------------------
  function canDb(moduloDb: string, nivel: PermissaoNivel = 'view'): boolean {
    const state = get({ subscribe });

    if (state.isSystemAdmin) return true;

    const key = String(moduloDb || '').toLowerCase().trim();

    // Módulo desabilitado globalmente
    if (state.disabledModules.includes(key)) return false;

    const perm = state.acessos[key] ?? 'none';
    return permLevel(perm) >= permLevel(nivel);
  }

  // ------------------------------------------------------------------
  // can — verifica por label humano COM herança de módulos
  // Ex: can("CRM") checa CRM + Parametros (via MODULO_HERANCA)
  // Portabilizado do vtur-app can()
  // ------------------------------------------------------------------
  function can(moduloLabel: string, nivel: PermissaoNivel = 'view'): boolean {
    const state = get({ subscribe });

    if (state.isSystemAdmin) return true;

    // Resolve módulo + ancestrais via MODULO_HERANCA
    const labels = listarModulosComHeranca(moduloLabel);

    return labels.some((label) => {
      const modDb = MAPA_MODULOS[label] || label;
      // Checa pela chave DB
      if (canDb(modDb, nivel)) return true;
      // Checa também pelo label diretamente (fallback para chaves sem mapeamento)
      if (String(modDb).toLowerCase() !== String(label).toLowerCase()) {
        return canDb(label, nivel);
      }
      return false;
    });
  }

  // ------------------------------------------------------------------
  // getPermissao — retorna o nível atual para um módulo (por label)
  // Portabilizado do vtur-app getPermissao()
  // ------------------------------------------------------------------
  function getPermissao(moduloLabel: string): PermissaoNivel {
    const state = get({ subscribe });

    if (state.isSystemAdmin) return 'admin';

    const labels = listarModulosComHeranca(moduloLabel);
    let bestLevel = 0;

    for (const label of labels) {
      const modDb = String(MAPA_MODULOS[label] || label).toLowerCase();
      const perm = state.acessos[modDb] ?? 'none';
      const level = permLevel(perm as PermissaoNivel);
      if (level > bestLevel) bestLevel = level;
    }

    const levels: PermissaoNivel[] = ['none', 'view', 'create', 'edit', 'delete', 'admin'];
    return levels[bestLevel] ?? 'none';
  }

  // ------------------------------------------------------------------
  // createCanChecker — retorna derived store reativo para uso em templates
  // Útil em: $: canEdit = permissoes.createCanChecker('Vendas', 'edit')
  // ------------------------------------------------------------------
  function createCanChecker(moduloLabel: string, nivel: PermissaoNivel = 'view') {
    return derived({ subscribe }, ($state) => {
      if ($state.isSystemAdmin) return true;
      // Cria snapshot temporário para reusar lógica do can()
      const labels = listarModulosComHeranca(moduloLabel);
      return labels.some((label) => {
        const modDb = String(MAPA_MODULOS[label] || label).toLowerCase();
        if ($state.disabledModules.includes(modDb)) return false;
        const perm = ($state.acessos[modDb] ?? 'none') as PermissaoNivel;
        if (permLevel(perm) >= permLevel(nivel)) return true;
        if (modDb !== label.toLowerCase()) {
          const permLabel = ($state.acessos[label.toLowerCase()] ?? 'none') as PermissaoNivel;
          return permLevel(permLabel) >= permLevel(nivel);
        }
        return false;
      });
    });
  }

  // ------------------------------------------------------------------
  // refresh — recarrega permissões
  // ------------------------------------------------------------------
  async function refresh(supabase: SupabaseClient): Promise<void> {
    await init(supabase);
  }

  // ------------------------------------------------------------------
  // reset — limpa o store (logout)
  // ------------------------------------------------------------------
  function reset(): void {
    set(initialState);
  }

  return {
    subscribe,
    init,
    can,
    canDb,
    getPermissao,
    createCanChecker,
    refresh,
    reset,
  };
}

export const permissoes = createPermissoesStore();
