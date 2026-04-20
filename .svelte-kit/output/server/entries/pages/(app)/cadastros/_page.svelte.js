import { h as head, t as ensure_array_like, e as escape_html } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../chunks/Card.js";
import { M as Map_pin } from "../../../../chunks/map-pin.js";
import { P as Package } from "../../../../chunks/package.js";
import { B as Building_2 } from "../../../../chunks/building-2.js";
import { R as Route } from "../../../../chunks/route.js";
import { S as Search } from "../../../../chunks/search.js";
import { P as Plus } from "../../../../chunks/plus.js";
import { A as Arrow_right } from "../../../../chunks/arrow-right.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const cadastros = [
      {
        titulo: "Destinos",
        descricao: "Gerencie destinos turísticos, cidades e países",
        icone: Map_pin,
        cor: "financeiro",
        rota: "/cadastros/destinos",
        stats: "45 destinos",
        acao: "Novo Destino"
      },
      {
        titulo: "Produtos",
        descricao: "Pacotes, passeios, serviços e produtos vendidos",
        icone: Package,
        cor: "financeiro",
        rota: "/cadastros/produtos",
        stats: "128 produtos",
        acao: "Novo Produto"
      },
      {
        titulo: "Fornecedores",
        descricao: "Hotéis, companhias aéreas, operadoras locais",
        icone: Building_2,
        cor: "financeiro",
        rota: "/cadastros/fornecedores",
        stats: "32 fornecedores",
        acao: "Novo Fornecedor"
      },
      {
        titulo: "Circuitos",
        descricao: "Roteiros pré-montados e pacotes combinados",
        icone: Route,
        cor: "financeiro",
        rota: "/cadastros/circuitos",
        stats: "18 circuitos",
        acao: "Novo Circuito"
      }
    ];
    head("1cwfny6", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Cadastros | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Cadastros",
      subtitle: "Gerenciamento de dados mestres",
      color: "financeiro",
      breadcrumbs: [{ label: "Cadastros" }]
    });
    $$renderer2.push(`<!----> <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><!--[-->`);
    const each_array = ensure_array_like(cadastros);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      Card($$renderer2, {
        color: "financeiro",
        class: "group hover:shadow-lg transition-all duration-200",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="flex items-start gap-4"><div class="p-4 rounded-xl" style="background-color: var(--color-financeiro-50);">`);
          if (item.icone) {
            $$renderer3.push("<!--[-->");
            item.icone($$renderer3, { size: 28, class: "text-financeiro-600" });
            $$renderer3.push("<!--]-->");
          } else {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push("<!--]-->");
          }
          $$renderer3.push(`</div> <div class="flex-1"><div class="flex items-center justify-between"><h3 class="text-lg font-semibold text-slate-900">${escape_html(item.titulo)}</h3> <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-financeiro-50 text-financeiro-700">${escape_html(item.stats)}</span></div> <p class="text-sm text-slate-500 mt-1 mb-4">${escape_html(item.descricao)}</p> <div class="flex items-center gap-3"><button class="flex items-center gap-1 text-sm font-medium text-financeiro-600 hover:text-financeiro-700 transition-colors">`);
          Search($$renderer3, { size: 16 });
          $$renderer3.push(`<!----> Consultar</button> <span class="text-slate-300">|</span> <button class="flex items-center gap-1 text-sm font-medium text-financeiro-600 hover:text-financeiro-700 transition-colors">`);
          Plus($$renderer3, { size: 16 });
          $$renderer3.push(`<!----> ${escape_html(item.acao)}</button> <span class="ml-auto">`);
          Arrow_right($$renderer3, {
            size: 16,
            class: "text-slate-400 group-hover:text-financeiro-500 group-hover:translate-x-1 transition-all"
          });
          $$renderer3.push(`<!----></span></div></div></div>`);
        },
        $$slots: { default: true }
      });
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
