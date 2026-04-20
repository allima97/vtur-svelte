import { f as fallback, p as attr_class, j as clsx, m as bind_props, k as slot } from "./index2.js";
import { C as Card } from "./Card.js";
function FilterPanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let title = fallback($$props["title"], "Filtros");
    let color = fallback($$props["color"], "financeiro");
    let className = fallback($$props["className"], "mb-6");
    let fieldsClass = fallback($$props["fieldsClass"], "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6");
    $$renderer2.push(`<div${attr_class(clsx(className))}>`);
    Card($$renderer2, {
      header: title,
      color,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex flex-col items-end gap-4 lg:flex-row"><div${attr_class(clsx(`flex-1 ${fieldsClass}`.trim()))}><!--[-->`);
        slot($$renderer3, $$props, "default", {}, null);
        $$renderer3.push(`<!--]--></div> <div class="shrink-0"><!--[-->`);
        slot($$renderer3, $$props, "actions", {}, null);
        $$renderer3.push(`<!--]--></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { title, color, className, fieldsClass });
  });
}
export {
  FilterPanel as F
};
