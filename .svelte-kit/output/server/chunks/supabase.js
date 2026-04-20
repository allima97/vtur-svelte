import { createServerClient } from "@supabase/ssr";
import { P as PUBLIC_SUPABASE_URL, a as PUBLIC_SUPABASE_ANON_KEY } from "./public.js";
import "clsx";
import "@sveltejs/kit/internal";
import "./exports.js";
import "./utils.js";
import "@sveltejs/kit/internal/server";
import "./root.js";
import "./state.svelte.js";
const MOCK_USER = {
  id: "mock-user-001",
  email: "admin@vtur.com",
  user_metadata: {
    nome: "Administrador",
    tipo: "ADMIN"
  }
};
const MOCK_SESSION = {
  access_token: "mock-token",
  refresh_token: "mock-refresh",
  expires_at: Date.now() + 36e5,
  user: MOCK_USER
};
function hasMockSession() {
  return false;
}
const mockSupabaseClient = {
  auth: {
    signInWithPassword: async ({ email, password }) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        data: {
          session: MOCK_SESSION,
          user: MOCK_USER
        },
        error: null
      };
    },
    signOut: async () => {
      return { error: null };
    },
    getSession: async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
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
      await new Promise((resolve) => setTimeout(resolve, 100));
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
    onAuthStateChange: (callback) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {
            }
          }
        }
      };
    }
  },
  from: (table) => ({
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
function shouldUseMock() {
  try {
    if (typeof window !== "undefined") {
      const forceMock = localStorage.getItem("vtur_force_mock");
      if (forceMock === "true") return true;
    }
    const url = PUBLIC_SUPABASE_URL;
    const key = PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) ;
    if (url.includes("seu-projeto") || url.includes("placeholder")) return true;
    if (key.includes("sua-anon-key") || key.includes("placeholder")) return true;
    return false;
  } catch (e) {
    console.error("🔍 [Supabase] Erro ao verificar mock:", e);
    return true;
  }
}
function createSupabaseBrowserClient() {
  {
    throw new Error("createSupabaseBrowserClient só pode ser chamado no browser");
  }
}
function createSupabaseServerClient(cookies) {
  if (shouldUseMock()) {
    return mockSupabaseClient;
  }
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (name) => cookies.get(name),
      set: (name, value, options) => cookies.set(name, value, options),
      remove: (name, options) => cookies.remove(name, options)
    }
  });
}
export {
  createSupabaseServerClient as a,
  createSupabaseBrowserClient as c
};
