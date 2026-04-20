import { h as head } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import "clsx";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    function resetPrefs() {
      localStorage.removeItem("vtur:menu-prefs");
      toast.success("Preferências resetadas para o padrão.");
    }
    head("1arfz1l", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Personalizar Menu | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Personalizar Menu",
      subtitle: "Mostre ou oculte itens do menu lateral conforme sua preferência.",
      breadcrumbs: [
        { label: "Perfil", href: "/perfil" },
        { label: "Personalizar Menu" }
      ],
      actions: [
        {
          label: "Resetar",
          onClick: resetPrefs,
          variant: "secondary",
          icon: Refresh_cw
        }
      ]
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
