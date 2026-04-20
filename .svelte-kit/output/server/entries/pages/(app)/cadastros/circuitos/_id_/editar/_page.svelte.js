import { h as head, q as attr, e as escape_html } from "../../../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../../../chunks/exports.js";
import "../../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../../chunks/root.js";
import "../../../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../../../chunks/Card.js";
import { B as Button } from "../../../../../../../chunks/Button2.js";
import "../../../../../../../chunks/ui.js";
import { R as Route } from "../../../../../../../chunks/route.js";
import { A as Arrow_left } from "../../../../../../../chunks/arrow-left.js";
import { S as Save } from "../../../../../../../chunks/save.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let saving = false;
    let circuito = {
      codigo: "CIR-001",
      nome: "Rota das Emoções",
      tipo: "nacional",
      dias: 7,
      noites: 6,
      descricao: "Circuito incrível pelo Nordeste",
      preco_base: 3200,
      vagas: 20,
      saidas: "Ter, Sab",
      guia: true
    };
    head("za84q0", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Editar Circuito | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Editar Circuito",
      subtitle: "Atualizar informações do circuito",
      color: "financeiro",
      breadcrumbs: [
        { label: "Cadastros", href: "/cadastros" },
        { label: "Circuitos", href: "/cadastros/circuitos" },
        { label: "Editar" }
      ]
    });
    $$renderer2.push(`<!----> <form>`);
    Card($$renderer2, {
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label for="circuito-codigo" class="block text-sm font-medium text-slate-700 mb-1">Código *</label> <div class="relative">`);
        Route($$renderer3, {
          size: 18,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer3.push(`<!----> <input id="circuito-codigo" type="text"${attr("value", circuito.codigo)} class="vtur-input w-full pl-10" required=""/></div></div> <div><label for="circuito-nome" class="block text-sm font-medium text-slate-700 mb-1">Nome *</label> <input id="circuito-nome" type="text"${attr("value", circuito.nome)} class="vtur-input w-full" required=""/></div> <div><label for="circuito-tipo" class="block text-sm font-medium text-slate-700 mb-1">Tipo</label> `);
        $$renderer3.select(
          {
            id: "circuito-tipo",
            value: circuito.tipo,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "nacional" }, ($$renderer5) => {
              $$renderer5.push(`Nacional`);
            });
            $$renderer4.option({ value: "internacional" }, ($$renderer5) => {
              $$renderer5.push(`Internacional`);
            });
          }
        );
        $$renderer3.push(`</div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label for="circuito-dias" class="block text-sm font-medium text-slate-700 mb-1">Dias</label> <input id="circuito-dias" type="number"${attr("value", circuito.dias)} min="1" class="vtur-input w-full"/></div> <div><label for="circuito-noites" class="block text-sm font-medium text-slate-700 mb-1">Noites</label> <input id="circuito-noites" type="number"${attr("value", circuito.noites)} min="1" class="vtur-input w-full"/></div></div> <div><label for="circuito-preco-base" class="block text-sm font-medium text-slate-700 mb-1">Preço Base</label> <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span> <input id="circuito-preco-base" type="number"${attr("value", circuito.preco_base)} min="0" step="0.01" class="vtur-input w-full pl-10"/></div></div> <div><label for="circuito-vagas" class="block text-sm font-medium text-slate-700 mb-1">Vagas</label> <input id="circuito-vagas" type="number"${attr("value", circuito.vagas)} min="1" class="vtur-input w-full"/></div> <div><label for="circuito-saidas" class="block text-sm font-medium text-slate-700 mb-1">Dias de Saída</label> <input id="circuito-saidas" type="text"${attr("value", circuito.saidas)} class="vtur-input w-full"/></div> <div><p class="block text-sm font-medium text-slate-700 mb-1">Guia</p> <div class="flex items-center gap-4 mt-2"><label class="flex items-center gap-2 cursor-pointer"><input type="radio"${attr("checked", circuito.guia === true, true)}${attr("value", true)} class="w-4 h-4 text-financeiro-600"/> <span class="text-sm text-slate-700">Sim</span></label> <label class="flex items-center gap-2 cursor-pointer"><input type="radio"${attr("checked", circuito.guia === false, true)}${attr("value", false)} class="w-4 h-4 text-slate-600"/> <span class="text-sm text-slate-700">Não</span></label></div></div> <div class="md:col-span-2"><label for="circuito-descricao" class="block text-sm font-medium text-slate-700 mb-1">Descrição</label> <textarea id="circuito-descricao" rows="4" class="vtur-input w-full">`);
        const $$body = escape_html(circuito.descricao);
        if ($$body) {
          $$renderer3.push(`${$$body}`);
        }
        $$renderer3.push(`</textarea></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="flex items-center justify-end gap-3">`);
    Button($$renderer2, {
      variant: "secondary",
      children: ($$renderer3) => {
        Arrow_left($$renderer3, { size: 18, class: "mr-2" });
        $$renderer3.push(`<!----> Voltar`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      variant: "primary",
      color: "financeiro",
      type: "submit",
      disabled: saving,
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-1-->");
          Save($$renderer3, { size: 18, class: "mr-2" });
          $$renderer3.push(`<!----> Salvar Alterações`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></form>`);
  });
}
export {
  _page as default
};
