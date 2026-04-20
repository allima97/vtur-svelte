import { d as derived, w as writable } from "./index.js";
const initialState = {
  user: null,
  session: null,
  loading: true,
  error: null
};
const loggedOutState = {
  user: null,
  session: null,
  loading: false,
  error: null
};
const sessionSynced = writable(false);
function createAuthStore() {
  const { subscribe, set, update } = writable(initialState);
  return {
    subscribe,
    // Set user e session
    setAuth: (user2, session) => {
      update((state) => ({
        ...state,
        user: user2,
        session,
        loading: false,
        error: null
      }));
    },
    // Set loading
    setLoading: (loading) => {
      update((state) => ({ ...state, loading }));
    },
    // Set error
    setError: (error) => {
      update((state) => ({ ...state, error, loading: false }));
    },
    // Clear auth (logout)
    clear: () => {
      set(loggedOutState);
    },
    // Update user
    updateUser: (user2) => {
      update((state) => ({ ...state, user: user2 }));
    }
  };
}
const auth = createAuthStore();
derived(
  auth,
  ($auth) => !!$auth.user && !!$auth.session
);
const user = derived(
  auth,
  ($auth) => $auth.user
);
derived(
  auth,
  ($auth) => $auth.loading
);
const userType = derived(
  user,
  ($user) => {
    if (!$user) return null;
    return $user.user_metadata?.tipo_usuario || "VENDEDOR";
  }
);
derived(
  user,
  ($user) => {
    if (!$user) return null;
    return $user.user_metadata?.empresa_id || null;
  }
);
derived(
  userType,
  ($type) => $type === "ADMIN" || $type === "ADMINISTRADOR"
);
derived(
  userType,
  ($type) => $type === "GESTOR" || $type === "ADMIN" || $type === "ADMINISTRADOR"
);
derived(
  userType,
  ($type) => $type === "MASTER"
);
export {
  auth as a,
  sessionSynced as s
};
