import { b as store_get, h as head, u as unsubscribe_stores, e as escape_html } from "../../../../../chunks/index2.js";
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
    let totalRecibosValor, totalPagamentosValor;
    store_get($$store_subs ??= {}, "$page", page).params.id;
    let venda = null;
    totalRecibosValor = Array.isArray(venda?.recibos) ? venda.recibos.reduce((acc, item) => acc + Number(item.valor_total || 0), 0) : 0;
    totalPagamentosValor = Array.isArray(venda?.pagamentos) ? venda.pagamentos.reduce((acc, item) => acc + Number(item.valor_total || 0), 0) : Number(0);
    Number((totalPagamentosValor - totalRecibosValor).toFixed(2));
    head("1svodxd", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html("Venda")} | VTUR</title>`);
      });
    });
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center h-64">`);
      Loader_circle($$renderer2, { size: 32, class: "animate-spin text-vendas-600" });
      $$renderer2.push(`<!----> <span class="ml-2 text-slate-600">Carregando...</span></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
