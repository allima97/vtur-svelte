import { f as fallback, m as bind_props, k as slot } from "./index2.js";
import { B as Button$1 } from "./Button.js";
import "clsx";
function Button($$renderer, $$props) {
  let resolvedColor, buttonClasses;
  let variant = fallback($$props["variant"], "primary");
  let size = fallback($$props["size"], "md");
  let color = fallback($$props["color"], "blue");
  let loading = fallback($$props["loading"], false);
  let disabled = fallback($$props["disabled"], false);
  let type = fallback($$props["type"], "button");
  let href = fallback($$props["href"], void 0);
  let class_name = fallback($$props["class_name"], "");
  const colorAlias = {
    blue: "blue",
    green: "green",
    red: "red",
    yellow: "yellow",
    purple: "purple",
    teal: "teal",
    orange: "orange",
    clientes: "blue",
    orcamentos: "blue",
    vendas: "teal",
    financeiro: "orange",
    operacao: "teal",
    comissoes: "orange"
  };
  const sizeClasses = {
    xs: "px-2.5 py-1.5 text-xs",
    sm: "px-3.5 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base"
  };
  const variantClasses = {
    primary: "border-transparent bg-[#2457a6] text-white hover:bg-[#1f4b90] focus:ring-blue-200 shadow-[0_10px_24px_rgba(36,87,166,0.18)]",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-200",
    outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-200",
    ghost: "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200 shadow-none",
    danger: "border-transparent bg-red-600 text-white hover:bg-red-700 focus:ring-red-200 shadow-[0_10px_24px_rgba(220,38,38,0.18)]"
  };
  resolvedColor = colorAlias[color] || "blue";
  buttonClasses = `vtur-button inline-flex items-center justify-center rounded-xl font-semibold tracking-[0.01em] transition-all duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses[size]} ${variantClasses[variant]} ${class_name}`;
  if (href) {
    $$renderer.push("<!--[0-->");
    Button$1($$renderer, {
      href,
      size,
      color: resolvedColor,
      disabled: disabled || loading,
      class: buttonClasses,
      children: ($$renderer2) => {
        if (loading) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<svg class="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--><!--[-->`);
        slot($$renderer2, $$props, "default", {}, null);
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
  } else {
    $$renderer.push("<!--[-1-->");
    Button$1($$renderer, {
      type,
      size,
      color: resolvedColor,
      disabled: disabled || loading,
      class: buttonClasses,
      children: ($$renderer2) => {
        if (loading) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<svg class="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--><!--[-->`);
        slot($$renderer2, $$props, "default", {}, null);
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
  }
  $$renderer.push(`<!--]-->`);
  bind_props($$props, {
    variant,
    size,
    color,
    loading,
    disabled,
    type,
    href,
    class_name
  });
}
export {
  Button as B
};
