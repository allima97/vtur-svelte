import { b as store_get, u as unsubscribe_stores } from "../../../../../../../chunks/index2.js";
import { p as page } from "../../../../../../../chunks/stores.js";
import { P as ProdutoOperacionalForm } from "../../../../../../../chunks/ProdutoOperacionalForm.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let produtoId;
    produtoId = store_get($$store_subs ??= {}, "$page", page).params.id || null;
    ProdutoOperacionalForm($$renderer2, { mode: "produtos", produtoId });
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
