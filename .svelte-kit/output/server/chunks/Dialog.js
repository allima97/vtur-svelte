import { f as fallback, p as attr_class, e as escape_html, k as slot, m as bind_props, v as stringify } from "./index2.js";
import { B as Button } from "./Button2.js";
/* empty css                                     */
import { X } from "./x.js";
function Dialog($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let open = fallback($$props["open"], false);
    let title = fallback($$props["title"], "");
    let size = fallback($$props["size"], "md");
    let color = fallback($$props["color"], "blue");
    let dismissable = fallback($$props["dismissable"], true);
    let respectAppShell = fallback($$props["respectAppShell"], false);
    let showCancel = fallback($$props["showCancel"], true);
    let cancelText = fallback($$props["cancelText"], "Cancelar");
    let showConfirm = fallback($$props["showConfirm"], false);
    let confirmText = fallback($$props["confirmText"], "Confirmar");
    let confirmVariant = fallback($$props["confirmVariant"], "primary");
    let loading = fallback($$props["loading"], false);
    let description = fallback($$props["description"], null);
    let maxWidth = fallback($$props["maxWidth"], null);
    let confirmDisabled = fallback($$props["confirmDisabled"], false);
    let onCancel = fallback($$props["onCancel"], void 0);
    let onConfirm = fallback($$props["onConfirm"], void 0);
    let onclose = fallback($$props["onclose"], void 0);
    const sizeClasses = {
      sm: "max-w-md",
      md: "max-w-lg",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
      full: "max-w-[calc(100vw-22rem)]"
    };
    if (open) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div${attr_class("fixed inset-0 bg-slate-900/50 z-[1100] flex items-end sm:items-center justify-center sm:p-4 svelte-1cplwtb", void 0, { "dialog-shell": respectAppShell })} role="button" tabindex="-1" aria-label="Fechar modal"><div${attr_class(`bg-white w-full rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden sm:w-full ${stringify(sizeClasses[size])} max-h-[92svh] sm:max-h-[90vh]`, "svelte-1cplwtb")} role="dialog" aria-modal="true" tabindex="-1"><div class="sm:hidden flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-slate-300"></div></div> <div class="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-slate-100"><h3 class="text-base sm:text-lg font-semibold text-slate-900">${escape_html(title)}</h3> `);
      if (dismissable) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<button class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center min-w-[36px] min-h-[36px]">`);
        X($$renderer2, { size: 20 });
        $$renderer2.push(`<!----></button>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="p-4 overflow-y-auto max-h-[60svh] sm:max-h-[60vh]"><!--[-->`);
      slot($$renderer2, $$props, "default", {}, null);
      $$renderer2.push(`<!--]--></div> `);
      if (showCancel || showConfirm) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50">`);
        if (showCancel) {
          $$renderer2.push("<!--[0-->");
          Button($$renderer2, {
            variant: "secondary",
            disabled: loading,
            children: ($$renderer3) => {
              $$renderer3.push(`<!---->${escape_html(cancelText)}`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (showConfirm) {
          $$renderer2.push("<!--[0-->");
          Button($$renderer2, {
            variant: confirmVariant,
            color: confirmVariant === "primary" ? color : void 0,
            loading,
            disabled: confirmDisabled,
            children: ($$renderer3) => {
              $$renderer3.push(`<!---->${escape_html(confirmText)}`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <!--[-->`);
        slot($$renderer2, $$props, "actions", {}, null);
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, {
      open,
      title,
      size,
      color,
      dismissable,
      respectAppShell,
      showCancel,
      cancelText,
      showConfirm,
      confirmText,
      confirmVariant,
      loading,
      description,
      maxWidth,
      confirmDisabled,
      onCancel,
      onConfirm,
      onclose
    });
  });
}
export {
  Dialog as D
};
