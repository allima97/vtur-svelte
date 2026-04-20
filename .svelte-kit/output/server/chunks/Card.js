import { c as sanitize_props, f as fallback, p as attr_class, v as stringify, e as escape_html, k as slot, m as bind_props } from "./index2.js";
function Card($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  $$renderer.component(($$renderer2) => {
    let title = fallback($$props["title"], null);
    let header = fallback($$props["header"], null);
    let color = fallback($$props["color"], "default");
    let padding = fallback($$props["padding"], "md");
    const colorClasses = {
      default: "border-slate-200",
      blue: "border-blue-200",
      green: "border-green-200",
      orange: "border-orange-200",
      teal: "border-teal-200",
      clientes: "border-blue-200",
      vendas: "border-green-200",
      financeiro: "border-orange-200",
      operacao: "border-teal-200",
      orcamentos: "border-blue-200",
      comissoes: "border-orange-200"
    };
    const accentClasses = {
      default: "before:bg-slate-300",
      blue: "before:bg-blue-500",
      green: "before:bg-green-500",
      orange: "before:bg-orange-500",
      teal: "before:bg-teal-500",
      clientes: "before:bg-blue-500",
      vendas: "before:bg-green-500",
      financeiro: "before:bg-orange-500",
      operacao: "before:bg-teal-500",
      orcamentos: "before:bg-blue-500",
      comissoes: "before:bg-orange-500"
    };
    const paddingClasses = { none: "p-0", sm: "p-4", md: "p-5", lg: "p-6" };
    $$renderer2.push(`<div${attr_class(`vtur-card relative overflow-hidden before:absolute before:left-0 before:right-0 before:top-0 before:h-1.5 before:rounded-t-[18px] ${stringify(colorClasses[color] ?? colorClasses.default)} ${stringify(accentClasses[color] ?? accentClasses.default)} ${stringify($$sanitized_props.class || "")}`)}>`);
    if (title || header) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-gradient-to-b from-slate-50 via-slate-50/85 to-white px-5 py-4"><h3 class="text-base font-semibold tracking-tight text-slate-900">${escape_html(title || header)}</h3> <!--[-->`);
      slot($$renderer2, $$props, "actions", {}, null);
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div${attr_class(paddingClasses[padding] ?? paddingClasses.md)}><!--[-->`);
    slot($$renderer2, $$props, "default", {}, null);
    $$renderer2.push(`<!--]--></div></div>`);
    bind_props($$props, { title, header, color, padding });
  });
}
export {
  Card as C
};
