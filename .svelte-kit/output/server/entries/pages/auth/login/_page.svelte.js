import { h as head, e as escape_html, q as attr } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "@supabase/ssr";
import "../../../../chunks/auth.js";
import { B as Button } from "../../../../chunks/Button2.js";
import { C as Card } from "../../../../chunks/Card.js";
import { M as Mail } from "../../../../chunks/mail.js";
import { L as Lock } from "../../../../chunks/lock.js";
import { E as Eye } from "../../../../chunks/eye.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let email = "";
    let password = "";
    let loading = false;
    head("1i2smtp", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Login | VTUR</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Acesse o sistema VTUR"/>`);
    });
    $$renderer2.push(`<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"><div class="w-full max-w-md"><div class="text-center mb-8"><div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-4xl font-bold shadow-xl shadow-blue-500/30 mb-4">V</div> <h1 class="text-3xl font-bold text-slate-900">VTUR</h1> <p class="text-slate-500 mt-2">Sistema de Gestão de Viagens</p></div> `);
    Card($$renderer2, {
      padding: "lg",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> <h2 class="text-xl font-bold text-slate-900 mb-6 text-center">Acesse sua conta</h2> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> <form class="space-y-4"><div><label for="email" class="block text-sm font-medium text-slate-700 mb-1">Email</label> <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">`);
        Mail($$renderer3, { size: 18, class: "text-slate-400" });
        $$renderer3.push(`<!----></div> <input id="email" type="email"${attr("value", email)} class="vtur-input pl-10" placeholder="seu@email.com" autocomplete="email"${attr("disabled", loading, true)}/></div></div> <div><label for="password" class="block text-sm font-medium text-slate-700 mb-1">Senha</label> <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">`);
        Lock($$renderer3, { size: 18, class: "text-slate-400" });
        $$renderer3.push(`<!----></div> <input id="password"${attr("type", "password")}${attr("value", password)} class="vtur-input pl-10 pr-10" placeholder="••••••••" autocomplete="current-password"${attr("disabled", loading, true)}/> <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">`);
        {
          $$renderer3.push("<!--[-1-->");
          Eye($$renderer3, { size: 18 });
        }
        $$renderer3.push(`<!--]--></button></div></div> <div class="flex items-center justify-between text-sm"><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"/> <span class="text-slate-600">Lembrar-me</span></label> <a href="/auth/recuperar-senha" class="text-blue-600 hover:text-blue-700 font-medium">Esqueceu a senha?</a></div> `);
        Button($$renderer3, {
          type: "submit",
          variant: "primary",
          size: "lg",
          loading,
          class_name: "w-full",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Entrar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></form> <div class="mt-6 text-center text-sm"><span class="text-slate-500">Recebeu um convite?</span> <a href="/auth/convite" class="ml-1 text-blue-600 hover:text-blue-700 font-medium">Ativar conta</a></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <p class="mt-8 text-center text-sm text-slate-400">© ${escape_html((/* @__PURE__ */ new Date()).getFullYear())} VTUR. Todos os direitos reservados.</p></div></div>`);
  });
}
export {
  _page as default
};
