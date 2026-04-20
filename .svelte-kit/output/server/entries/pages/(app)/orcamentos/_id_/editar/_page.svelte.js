import { b as store_get, h as head, u as unsubscribe_stores } from "../../../../../../chunks/index2.js";
import { p as page } from "../../../../../../chunks/stores.js";
import { o as onDestroy } from "../../../../../../chunks/index-server.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/state.svelte.js";
import "clsx";
import "../../../../../../chunks/ui.js";
import { L as Loader_circle } from "../../../../../../chunks/loader-circle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    store_get($$store_subs ??= {}, "$page", page).params.id;
    let formData = {
      itens: [makeItem(0)]
    };
    function makeItem(index) {
      return {
        id: "",
        title: "",
        product_name: "",
        item_type: "servico",
        quantity: 1,
        unit_price: 0,
        total_amount: 0,
        city_name: "",
        order_index: index
      };
    }
    onDestroy(() => {
    });
    formData.itens.reduce((acc, item) => acc + (item.total_amount || 0), 0);
    head("129ib7h", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Editar Orçamento | VTUR</title>`);
      });
    });
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center h-64">`);
      Loader_circle($$renderer2, { size: 32, class: "animate-spin text-orcamentos-600" });
      $$renderer2.push(`<!----> <span class="ml-2 text-slate-600">Carregando orçamento...</span></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
