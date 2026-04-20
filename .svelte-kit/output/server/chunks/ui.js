import { d as derived, w as writable } from "./index.js";
function createSidebarStore() {
  const { subscribe, set, update } = writable({
    isOpen: false,
    isMobile: false
  });
  return {
    subscribe,
    toggle: () => {
      update((state) => ({ ...state, isOpen: !state.isOpen }));
    },
    open: () => {
      update((state) => ({ ...state, isOpen: true }));
    },
    close: () => {
      update((state) => ({ ...state, isOpen: false }));
    },
    setMobile: (isMobile2) => {
      update((state) => ({ ...state, isMobile: isMobile2, isOpen: isMobile2 ? false : state.isOpen }));
    }
  };
}
const sidebar = createSidebarStore();
function createThemeStore() {
  const { subscribe, set, update } = writable({
    moduleColor: "default"
  });
  return {
    subscribe,
    setModuleColor: (color) => {
      update((state) => ({ ...state, moduleColor: color }));
    },
    reset: () => {
      set({ moduleColor: "default" });
    }
  };
}
createThemeStore();
function createToastStore() {
  const { subscribe, update } = writable([]);
  function add(message, type = "info", duration = 5e3) {
    const id = Math.random().toString(36).substring(2, 9);
    const toast2 = { id, message, type, duration };
    update((toasts) => [...toasts, toast2]);
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
    return id;
  }
  function remove(id) {
    update((toasts) => toasts.filter((t) => t.id !== id));
  }
  return {
    subscribe,
    add,
    remove,
    success: (message, duration) => add(message, "success", duration),
    error: (message, duration) => add(message, "error", duration),
    warning: (message, duration) => add(message, "warning", duration),
    info: (message, duration) => add(message, "info", duration)
  };
}
const toast = createToastStore();
function createPageLoadingStore() {
  const { subscribe, set } = writable(false);
  return {
    subscribe,
    start: () => set(true),
    stop: () => set(false)
  };
}
createPageLoadingStore();
const isMobile = derived(
  sidebar,
  ($sidebar) => $sidebar.isMobile
);
function createWindowSizeStore() {
  const { subscribe, set } = writable({ width: 0, height: 0 });
  return {
    subscribe
  };
}
createWindowSizeStore();
export {
  isMobile as i,
  sidebar as s,
  toast as t
};
