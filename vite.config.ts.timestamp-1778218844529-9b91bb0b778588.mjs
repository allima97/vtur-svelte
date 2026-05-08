// vite.config.ts
import { sveltekit } from "file:///Users/allima97/Documents/GitHub/vtur-svelte/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///Users/allima97/Documents/GitHub/vtur-svelte/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  plugins: [sveltekit()],
  build: {
    // Os maiores bundles são workers/fontes de PDF
    chunkSizeWarningLimit: 2500
  },
  optimizeDeps: {
    exclude: [
      "xlsx",
      "jspdf",
      "jspdf-autotable",
      "dexie",
      "dexie-cloud-addon"
    ]
  },
  resolve: {
    alias: {
      // Dexie 4.3 pode resolver para import-wrapper (dev)
      dexie: "dexie/dist/dexie.mjs"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYWxsaW1hOTcvRG9jdW1lbnRzL0dpdEh1Yi92dHVyLXN2ZWx0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2FsbGltYTk3L0RvY3VtZW50cy9HaXRIdWIvdnR1ci1zdmVsdGUvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2FsbGltYTk3L0RvY3VtZW50cy9HaXRIdWIvdnR1ci1zdmVsdGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzdmVsdGVraXQgfSBmcm9tICdAc3ZlbHRlanMva2l0L3ZpdGUnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtzdmVsdGVraXQoKV0sXG4gIGJ1aWxkOiB7XG4gICAgLy8gT3MgbWFpb3JlcyBidW5kbGVzIHNcdTAwRTNvIHdvcmtlcnMvZm9udGVzIGRlIFBERlxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMjUwMFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbXG4gICAgICAneGxzeCcsXG4gICAgICAnanNwZGYnLFxuICAgICAgJ2pzcGRmLWF1dG90YWJsZScsXG4gICAgICAnZGV4aWUnLFxuICAgICAgJ2RleGllLWNsb3VkLWFkZG9uJ1xuICAgIF1cbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAvLyBEZXhpZSA0LjMgcG9kZSByZXNvbHZlciBwYXJhIGltcG9ydC13cmFwcGVyIChkZXYpXG4gICAgICBkZXhpZTogJ2RleGllL2Rpc3QvZGV4aWUubWpzJ1xuICAgIH1cbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXNULFNBQVMsaUJBQWlCO0FBQ2hWLFNBQVMsb0JBQW9CO0FBRTdCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxVQUFVLENBQUM7QUFBQSxFQUNyQixPQUFPO0FBQUE7QUFBQSxJQUVMLHVCQUF1QjtBQUFBLEVBQ3pCO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBO0FBQUEsTUFFTCxPQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
