import { f as fallback, p as attr_class, e as escape_html, m as bind_props, v as stringify } from "./index2.js";
function KPICard($$renderer, $$props) {
  let title = $$props["title"];
  let value = fallback($$props["value"], "");
  let subtitle = fallback($$props["subtitle"], "");
  let loading = fallback($$props["loading"], false);
  let icon = fallback($$props["icon"], null);
  let color = fallback($$props["color"], "blue");
  const iconBg = {
    blue: "bg-blue-50 text-blue-500",
    green: "bg-green-50 text-green-500",
    orange: "bg-orange-50 text-orange-500",
    teal: "bg-teal-50 text-teal-500",
    violet: "bg-violet-50 text-violet-500",
    slate: "bg-slate-100 text-slate-500",
    clientes: "bg-blue-50 text-blue-500",
    vendas: "bg-green-50 text-green-500",
    financeiro: "bg-orange-50 text-orange-500",
    operacao: "bg-teal-50 text-teal-500",
    orcamentos: "bg-blue-50 text-blue-500",
    comissoes: "bg-orange-50 text-orange-500"
  };
  const borderColor = {
    blue: "border-t-blue-400",
    green: "border-t-green-400",
    orange: "border-t-orange-400",
    teal: "border-t-teal-400",
    violet: "border-t-violet-400",
    slate: "border-t-slate-300",
    clientes: "border-t-blue-400",
    vendas: "border-t-green-400",
    financeiro: "border-t-orange-400",
    operacao: "border-t-teal-400",
    orcamentos: "border-t-blue-400",
    comissoes: "border-t-orange-400"
  };
  $$renderer.push(`<div${attr_class(`vtur-kpi-card flex flex-col items-start gap-3 border-t-[3px] p-5 ${stringify(borderColor[color])}`)}>`);
  if (loading) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<div class="flex h-full w-full flex-col items-start gap-2"><div class="h-9 w-9 animate-pulse rounded-xl bg-slate-100"></div> <div class="h-3 w-24 animate-pulse rounded bg-slate-100"></div> <div class="h-7 w-16 animate-pulse rounded bg-slate-100"></div></div>`);
  } else {
    $$renderer.push("<!--[-1-->");
    if (icon) {
      $$renderer.push("<!--[0-->");
      $$renderer.push(`<div${attr_class(`flex h-11 w-11 items-center justify-center rounded-[14px] ring-1 ring-black/5 ${stringify(iconBg[color])}`)}>`);
      if (icon) {
        $$renderer.push("<!--[-->");
        icon($$renderer, { size: 20, strokeWidth: 2 });
        $$renderer.push("<!--]-->");
      } else {
        $$renderer.push("<!--[!-->");
        $$renderer.push("<!--]-->");
      }
      $$renderer.push(`</div>`);
    } else {
      $$renderer.push("<!--[-1-->");
    }
    $$renderer.push(`<!--]--> <div class="min-w-0 flex-1"><p class="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.14em] leading-tight text-slate-500">${escape_html(title)}</p> <p class="text-[1.85rem] font-bold leading-none tracking-tight text-slate-900">${escape_html(value)}</p> `);
    if (subtitle) {
      $$renderer.push("<!--[0-->");
      $$renderer.push(`<p class="mt-1.5 text-xs text-slate-400">${escape_html(subtitle)}</p>`);
    } else {
      $$renderer.push("<!--[-1-->");
    }
    $$renderer.push(`<!--]--></div>`);
  }
  $$renderer.push(`<!--]--></div>`);
  bind_props($$props, { title, value, subtitle, loading, icon, color });
}
export {
  KPICard as K
};
