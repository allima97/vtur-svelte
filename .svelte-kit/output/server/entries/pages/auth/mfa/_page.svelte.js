import { h as head } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "@supabase/ssr";
import "../../../../chunks/permissoes.js";
import "clsx";
import { C as Card } from "../../../../chunks/Card.js";
import { S as Shield } from "../../../../chunks/shield.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("1bx9mh0", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Verificação em Duas Etapas | VTUR</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"><div class="w-full max-w-md"><div class="text-center mb-8"><div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 mb-4">`);
    Shield($$renderer2, { size: 32 });
    $$renderer2.push(`<!----></div> <h1 class="text-2xl font-bold text-slate-900">Verificação em Duas Etapas</h1> <p class="text-slate-500 mt-1">Informe o código do seu aplicativo autenticador</p></div> `);
    Card($$renderer2, {
      padding: "lg",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="text-center py-8 text-slate-500">Carregando...</div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></div>`);
  });
}
export {
  _page as default
};
