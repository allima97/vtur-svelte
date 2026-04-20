import { b as store_get, h as head, e as escape_html, u as unsubscribe_stores } from "../../chunks/index2.js";
import { p as page } from "../../chunks/stores.js";
import { B as Button } from "../../chunks/Button.js";
import "clsx";
import { T as Triangle_alert } from "../../chunks/triangle-alert.js";
import { H as House } from "../../chunks/house.js";
import { A as Arrow_left } from "../../chunks/arrow-left.js";
function _error($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let status, message;
    status = store_get($$store_subs ??= {}, "$page", page).status;
    message = store_get($$store_subs ??= {}, "$page", page).error?.message || "Ocorreu um erro inesperado";
    head("1j96wlh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Erro ${escape_html(status)} | VTUR</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"><div class="w-full max-w-md text-center"><div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-100 text-red-600 mb-6">`);
    Triangle_alert($$renderer2, { size: 40 });
    $$renderer2.push(`<!----></div> <h1 class="text-6xl font-bold text-slate-900 mb-2">${escape_html(status)}</h1> <p class="text-xl text-slate-600 mb-2">`);
    if (status === 404) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`Página não encontrada`);
    } else if (status === 500) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`Erro interno do servidor`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`Ocorreu um erro`);
    }
    $$renderer2.push(`<!--]--></p> <p class="text-slate-500 mb-8">${escape_html(message)}</p> <div class="flex flex-col sm:flex-row gap-3 justify-center">`);
    Button($$renderer2, {
      href: "/",
      color: "blue",
      children: ($$renderer3) => {
        House($$renderer3, { size: 18, class: "mr-2" });
        $$renderer3.push(`<!----> Ir para o Dashboard`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      href: "javascript:history.back()",
      color: "light",
      children: ($$renderer3) => {
        Arrow_left($$renderer3, { size: 18, class: "mr-2" });
        $$renderer3.push(`<!----> Voltar`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> <p class="mt-8 text-sm text-slate-400">© ${escape_html((/* @__PURE__ */ new Date()).getFullYear())} VTUR. Sistema de Gestão de Viagens.</p></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _error as default
};
