import { h as head, q as attr, e as escape_html } from "../../../../chunks/index2.js";
import "@supabase/ssr";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import { B as Button } from "../../../../chunks/Button2.js";
import { C as Card } from "../../../../chunks/Card.js";
import { M as Mail } from "../../../../chunks/mail.js";
import { A as Arrow_left } from "../../../../chunks/arrow-left.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let email = "";
    let loading = false;
    let cooldown = 0;
    head("yivesz", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Recuperar Senha | VTUR</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"><div class="w-full max-w-md"><div class="text-center mb-8"><div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl font-bold shadow-lg shadow-blue-500/30 mb-4">V</div> <h1 class="text-2xl font-bold text-slate-900">Recuperar Senha</h1> <p class="text-slate-500 mt-1">Enviaremos um link para redefinir sua senha</p></div> `);
    Card($$renderer2, {
      padding: "lg",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-1-->");
          {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--> <form class="space-y-4"><div><label for="email" class="block text-sm font-medium text-slate-700 mb-1">E-mail</label> <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">`);
          Mail($$renderer3, { size: 18, class: "text-slate-400" });
          $$renderer3.push(`<!----></div> <input id="email" type="email"${attr("value", email)} class="vtur-input pl-10 w-full" placeholder="seu@email.com"${attr("disabled", loading, true)} autocomplete="email"/></div></div> `);
          Button($$renderer3, {
            type: "submit",
            variant: "primary",
            size: "lg",
            loading: cooldown > 0,
            class_name: "w-full justify-center",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->${escape_html("Enviar link de recuperação")}`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----></form> <div class="mt-6 text-center text-sm"><a href="/auth/login" class="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700">`);
          Arrow_left($$renderer3, { size: 14 });
          $$renderer3.push(`<!----> Voltar ao login</a></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></div>`);
  });
}
export {
  _page as default
};
