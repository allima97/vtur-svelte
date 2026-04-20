import { w as writable, d as derived, g as get } from "./index.js";
import { b as browser } from "./false.js";
import Dexie from "dexie/dist/dexie.mjs";
import dexieCloud from "dexie-cloud-addon";
class VTURDatabase extends Dexie {
  permissoes;
  apiCache;
  preferences;
  constructor() {
    super("vtur-db", { addons: [dexieCloud] });
    this.version(1).stores({
      permissoes: "id, userId, modulo, [userId+modulo]",
      apiCache: "id, key, timestamp",
      preferences: "id, userId, key, [userId+key]"
    });
  }
}
const db = new VTURDatabase();
const initialState = {
  userId: null,
  userType: "",
  isSystemAdmin: false,
  isMaster: false,
  isGestor: false,
  isVendedor: false,
  permissoes: {},
  ready: false,
  loading: false,
  error: null
};
const permLevel = (p) => {
  switch (p) {
    case "admin":
      return 5;
    case "delete":
      return 4;
    case "edit":
      return 3;
    case "create":
      return 2;
    case "view":
      return 1;
    default:
      return 0;
  }
};
function createPermissoesStore() {
  const { subscribe, set, update } = writable(initialState);
  return {
    subscribe,
    /**
     * Inicializa o store de permissões
     */
    init: async (supabase) => {
      update((s) => ({ ...s, loading: true, error: null }));
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set(initialState);
          return;
        }
        const { data: profile } = await supabase.from("users").select("id, user_types(name), uso_individual, company_id").eq("id", user.id).single();
        const userTypeData = profile?.user_types;
        const userTypeName = Array.isArray(userTypeData) ? userTypeData[0]?.name : userTypeData?.name;
        const userType = String(userTypeName || "").toUpperCase();
        const isSystemAdmin = userType.includes("ADMIN");
        const isMaster = userType.includes("MASTER");
        const isGestor = userType.includes("GESTOR");
        const isVendedor = !isSystemAdmin && !isMaster && !isGestor;
        const { data: acessos } = await supabase.from("modulo_acesso").select("modulo, permissao, ativo").eq("usuario_id", user.id).eq("ativo", true);
        const permissoes2 = {};
        acessos?.forEach((acesso) => {
          const modulo = String(acesso.modulo || "").toLowerCase().trim();
          if (modulo) {
            permissoes2[modulo] = acesso.permissao;
          }
        });
        if (browser) ;
        set({
          userId: user.id,
          userType,
          isSystemAdmin,
          isMaster,
          isGestor,
          isVendedor,
          permissoes: permissoes2,
          ready: true,
          loading: false,
          error: null
        });
      } catch (err) {
        update((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Erro ao carregar permissões"
        }));
      }
    },
    /**
     * Verifica se o usuário tem uma permissão mínima
     */
    can: (modulo, nivel = "view") => {
      const state = get({ subscribe });
      if (state.isSystemAdmin) return true;
      const moduloKey = modulo.toLowerCase().trim();
      const userPerm = state.permissoes[moduloKey] || "none";
      return permLevel(userPerm) >= permLevel(nivel);
    },
    /**
     * Verifica permissão específica (reactive)
     */
    createCanChecker: (modulo, nivel = "view") => {
      return derived({ subscribe }, ($state) => {
        if ($state.isSystemAdmin) return true;
        const userPerm = $state.permissoes[modulo.toLowerCase().trim()] || "none";
        return permLevel(userPerm) >= permLevel(nivel);
      });
    },
    /**
     * Recarrega permissões
     */
    refresh: async function(supabase) {
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
const permissoes = createPermissoesStore();
export {
  permissoes as p
};
