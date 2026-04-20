import { h as head } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import "clsx";
import "../../../../../chunks/ui.js";
import { L as Loader_circle } from "../../../../../chunks/loader-circle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("qipkdk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Dados da Empresa | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Dados da Empresa",
      subtitle: "Informações cadastrais e fiscais da empresa.",
      color: "financeiro",
      breadcrumbs: [
        { label: "Parâmetros", href: "/parametros" },
        { label: "Empresa" }
      ]
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-20">`);
      Loader_circle($$renderer2, { size: 28, class: "animate-spin text-slate-400" });
      $$renderer2.push(`<!----> <span class="ml-3 text-slate-600">Carregando...</span></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
