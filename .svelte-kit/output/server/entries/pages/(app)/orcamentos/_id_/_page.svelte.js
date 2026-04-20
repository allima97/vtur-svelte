import { b as store_get, u as unsubscribe_stores, h as head, e as escape_html } from "../../../../../chunks/index2.js";
import { p as page } from "../../../../../chunks/stores.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import "clsx";
import "../../../../../chunks/ui.js";
import { L as Loader_circle } from "../../../../../chunks/loader-circle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let ultimaInteracao;
    store_get($$store_subs ??= {}, "$page", page).params.id;
    let interacoes = [];
    function getDiasSemInteracao(dateString) {
      if (!dateString) return null;
      const data = new Date(dateString);
      return Math.ceil((Date.now() - data.getTime()) / (1e3 * 60 * 60 * 24));
    }
    String("").toLowerCase();
    ultimaInteracao = interacoes.length > 0 ? interacoes[0] : null;
    getDiasSemInteracao(ultimaInteracao?.created_at || null);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("hhjxe1", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html("Orçamento")} | VTUR</title>`);
        });
      });
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="flex items-center justify-center h-64">`);
        Loader_circle($$renderer3, { size: 32, class: "animate-spin text-clientes-600" });
        $$renderer3.push(`<!----> <span class="ml-2 text-slate-600">Carregando...</span></div>`);
      }
      $$renderer3.push(`<!--]-->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
