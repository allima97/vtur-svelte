import { h as head, e as escape_html, t as ensure_array_like, p as attr_class } from "../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../chunks/Card.js";
import "@supabase/ssr";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let sessionInfo = "Carregando...";
    let apiTests = [];
    head("14z42u2", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Diagnostico | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Diagnostico de Sistema",
      subtitle: "Verifique o status de conexao e APIs.",
      color: "financeiro"
    });
    $$renderer2.push(`<!----> <div class="space-y-6">`);
    Card($$renderer2, {
      header: "Sessao do Usuario",
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="space-y-2"><p><strong>Status:</strong> ${escape_html(sessionInfo)}</p> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Teste de APIs",
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<table class="w-full text-sm"><thead><tr class="text-left border-b"><th class="pb-2">API</th><th class="pb-2">Status</th><th class="pb-2">Detalhes</th><th class="pb-2">Tempo</th></tr></thead><tbody><!--[-->`);
        const each_array = ensure_array_like(apiTests);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let test = each_array[$$index];
          $$renderer3.push(`<tr class="border-b border-slate-100"><td class="py-2 font-mono text-xs">${escape_html(test.name)}</td><td class="py-2"><span${attr_class("", void 0, { "text-green-600": test.status === "OK" })}>${escape_html(test.status)}</span></td><td class="py-2 text-slate-600">${escape_html(test.detail)}</td><td class="py-2">${escape_html(test.time)}ms</td></tr>`);
        }
        $$renderer3.push(`<!--]-->`);
        if (apiTests.length === 0) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<tr><td colspan="4" class="py-4 text-center text-slate-500">Clique em "Executar Diagnostico" para testar</td></tr>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></tbody></table> <div class="mt-4"><button class="px-4 py-2 bg-financeiro-600 text-white rounded-lg hover:bg-financeiro-700">Executar Diagnostico</button></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Informacoes do Navegador",
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="space-y-2 text-sm"><p><strong>User Agent:</strong> <span class="font-mono">${escape_html(navigator.userAgent)}</span></p> <p><strong>Cookies Habilitados:</strong> ${escape_html(navigator.cookieEnabled ? "Sim" : "Nao")}</p></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
