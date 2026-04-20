import { h as head } from "../../../../chunks/index2.js";
import "clsx";
import "../../../../chunks/ui.js";
import { L as Loader_circle } from "../../../../chunks/loader-circle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("1w36jqm", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Meu Perfil | VTUR</title>`);
      });
    });
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-20">`);
      Loader_circle($$renderer2, { size: 32, class: "animate-spin text-slate-400" });
      $$renderer2.push(`<!----> <span class="ml-3 text-slate-600">Carregando perfil...</span></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
