import { h as head } from "../../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../../chunks/PageHeader.js";
import "clsx";
import "../../../../../../chunks/ui.js";
import { n as normalizeVoucherExtraData } from "../../../../../../chunks/extraData.js";
import { L as Loader_circle } from "../../../../../../chunks/loader-circle.js";
import { A as Arrow_left } from "../../../../../../chunks/arrow-left.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    ({
      extra_data: normalizeVoucherExtraData({})
    });
    head("c2w739", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Novo Voucher | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Novo Voucher",
      subtitle: "Crie um voucher completo em 4 etapas",
      color: "clientes",
      breadcrumbs: [
        { label: "Operação", href: "/operacao" },
        { label: "Vouchers", href: "/operacao/vouchers" },
        { label: "Novo" }
      ],
      actions: [
        {
          label: "Voltar",
          href: "/operacao/vouchers",
          variant: "secondary",
          icon: Arrow_left
        }
      ]
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-20">`);
      Loader_circle($$renderer2, { size: 40, class: "animate-spin text-clientes-500" });
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
