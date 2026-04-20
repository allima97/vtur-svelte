import { b as store_get, u as unsubscribe_stores } from "../../../../../../../chunks/index2.js";
import { p as page } from "../../../../../../../chunks/stores.js";
import { F as FornecedorForm } from "../../../../../../../chunks/FornecedorForm.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let fornecedorId;
    fornecedorId = store_get($$store_subs ??= {}, "$page", page).params.id || null;
    FornecedorForm($$renderer2, { fornecedorId });
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
