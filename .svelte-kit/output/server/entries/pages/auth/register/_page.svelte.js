import { h as head, q as attr } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "@supabase/ssr";
import { B as Button } from "../../../../chunks/Button2.js";
import { C as Card } from "../../../../chunks/Card.js";
import { U as User } from "../../../../chunks/user.js";
import { M as Mail } from "../../../../chunks/mail.js";
import { L as Lock } from "../../../../chunks/lock.js";
import { E as Eye } from "../../../../chunks/eye.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let nome = "";
    let email = "";
    let password = "";
    let confirmPassword = "";
    let loading = false;
    head("8bdjn9", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Criar Conta | VTUR</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"><div class="w-full max-w-md"><div class="text-center mb-8"><div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl font-bold shadow-lg shadow-blue-500/30 mb-4">V</div> <h1 class="text-2xl font-bold text-slate-900">Criar Conta</h1> <p class="text-slate-500 mt-1">Crie sua conta no VTUR</p></div> `);
    Card($$renderer2, {
      padding: "lg",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-1-->");
          {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--> <form class="space-y-4"><div><label for="reg-nome" class="block text-sm font-medium text-slate-700 mb-1">Nome completo</label> <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">`);
          User($$renderer3, { size: 18, class: "text-slate-400" });
          $$renderer3.push(`<!----></div> <input id="reg-nome" type="text"${attr("value", nome)} class="vtur-input pl-10 w-full" placeholder="Seu nome"${attr("disabled", loading, true)}/></div></div> <div><label for="reg-email" class="block text-sm font-medium text-slate-700 mb-1">E-mail</label> <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">`);
          Mail($$renderer3, { size: 18, class: "text-slate-400" });
          $$renderer3.push(`<!----></div> <input id="reg-email" type="email"${attr("value", email)} class="vtur-input pl-10 w-full" placeholder="seu@email.com"${attr("disabled", loading, true)} autocomplete="email"/></div></div> <div><label for="reg-password" class="block text-sm font-medium text-slate-700 mb-1">Senha</label> <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">`);
          Lock($$renderer3, { size: 18, class: "text-slate-400" });
          $$renderer3.push(`<!----></div> <input id="reg-password"${attr("type", "password")}${attr("value", password)} class="vtur-input pl-10 pr-10 w-full" placeholder="Mínimo 6 caracteres"${attr("disabled", loading, true)}/> <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">`);
          {
            $$renderer3.push("<!--[-1-->");
            Eye($$renderer3, { size: 18 });
          }
          $$renderer3.push(`<!--]--></button></div></div> <div><label for="reg-confirm" class="block text-sm font-medium text-slate-700 mb-1">Confirmar senha</label> <input id="reg-confirm" type="password"${attr("value", confirmPassword)} class="vtur-input w-full" placeholder="Repita a senha"${attr("disabled", loading, true)}/></div> `);
          Button($$renderer3, {
            type: "submit",
            variant: "primary",
            size: "lg",
            loading,
            class_name: "w-full justify-center",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Criar conta`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----></form> <div class="mt-6 text-center text-sm"><span class="text-slate-500">Já tem conta?</span> <a href="/auth/login" class="ml-1 text-blue-600 hover:text-blue-700 font-medium">Fazer login</a></div>`);
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
