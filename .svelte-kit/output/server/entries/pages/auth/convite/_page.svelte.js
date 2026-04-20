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
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let email = "";
    let password = "";
    let confirmPassword = "";
    let nome = "";
    let token = "";
    let loading = false;
    head("1jdfp8c", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Ativar Conta | VTUR</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"><div class="w-full max-w-md"><div class="text-center mb-8"><div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl font-bold shadow-lg shadow-blue-500/30 mb-4">V</div> <h1 class="text-2xl font-bold text-slate-900">Ativar Conta</h1> <p class="text-slate-500 mt-1">Complete seu cadastro no VTUR</p></div> `);
    Card($$renderer2, {
      padding: "lg",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<h2 class="text-xl font-semibold text-slate-900 mb-6 text-center">Dados do Convite</h2> `);
          {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--> <form class="space-y-4"><div><label for="token" class="block text-sm font-medium text-slate-700 mb-1">Código do Convite</label> <input id="token" type="text"${attr("value", token)} class="vtur-input" placeholder="Cole o código do convite"${attr("disabled", loading, true)}/></div> <div><label for="nome" class="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label> <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">`);
          User($$renderer3, { size: 18, class: "text-slate-400" });
          $$renderer3.push(`<!----></div> <input id="nome" type="text"${attr("value", nome)} class="vtur-input pl-10" placeholder="Seu nome"${attr("disabled", loading, true)}/></div></div> <div><label for="email" class="block text-sm font-medium text-slate-700 mb-1">Email</label> <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">`);
          Mail($$renderer3, { size: 18, class: "text-slate-400" });
          $$renderer3.push(`<!----></div> <input id="email" type="email"${attr("value", email)} class="vtur-input pl-10" placeholder="seu@email.com"${attr("disabled", loading, true)}/></div></div> <div><label for="password" class="block text-sm font-medium text-slate-700 mb-1">Senha</label> <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">`);
          Lock($$renderer3, { size: 18, class: "text-slate-400" });
          $$renderer3.push(`<!----></div> <input id="password" type="password"${attr("value", password)} class="vtur-input pl-10" placeholder="Mínimo 6 caracteres"${attr("disabled", loading, true)}/></div></div> <div><label for="confirmPassword" class="block text-sm font-medium text-slate-700 mb-1">Confirmar Senha</label> <input id="confirmPassword" type="password"${attr("value", confirmPassword)} class="vtur-input" placeholder="Digite a senha novamente"${attr("disabled", loading, true)}/></div> `);
          Button($$renderer3, {
            type: "submit",
            variant: "primary",
            size: "lg",
            loading,
            class_name: "w-full justify-center",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Ativar Conta`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----></form>`);
        }
        $$renderer3.push(`<!--]--> <div class="mt-6 text-center text-sm"><span class="text-slate-500">Já tem conta?</span> <a href="/auth/login" class="ml-1 text-blue-600 hover:text-blue-700 font-medium">Fazer login</a></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></div>`);
  });
}
export {
  _page as default
};
