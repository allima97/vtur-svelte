import { h as head } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("7b6bud", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Acesso negado | VTUR</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex items-center justify-center bg-slate-50 px-4"><div class="max-w-md w-full text-center"><div class="mb-6 flex justify-center"><div class="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path></svg></div></div> <h1 class="text-2xl font-bold text-slate-900 mb-2">Acesso negado</h1> <p class="text-slate-500 mb-8">Você não tem permissão para acessar esta página.<br/> Entre em contato com o administrador do sistema.</p> <div class="flex flex-col sm:flex-row gap-3 justify-center"><button class="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">Ir para o início</button> <button class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Voltar</button></div></div></div>`);
  });
}
export {
  _page as default
};
