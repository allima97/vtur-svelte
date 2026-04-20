import { h as head } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "@supabase/ssr";
import "clsx";
import { C as Card } from "../../../../chunks/Card.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("hsvy8e", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Nova Senha | VTUR</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"><div class="w-full max-w-md"><div class="text-center mb-8"><div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl font-bold shadow-lg shadow-blue-500/30 mb-4">V</div> <h1 class="text-2xl font-bold text-slate-900">Nova Senha</h1> <p class="text-slate-500 mt-1">Defina sua nova senha de acesso</p></div> `);
    Card($$renderer2, {
      padding: "lg",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="text-center py-8 text-slate-500">Validando link...</div>`);
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
