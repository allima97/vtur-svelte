import { h as head, q as attr, e as escape_html, t as ensure_array_like } from "../../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../../chunks/Card.js";
import { B as Button } from "../../../../../../chunks/Button2.js";
import "../../../../../../chunks/ui.js";
import { R as Route } from "../../../../../../chunks/route.js";
import { T as Trash_2 } from "../../../../../../chunks/trash-2.js";
import { P as Plus } from "../../../../../../chunks/plus.js";
import { A as Arrow_left } from "../../../../../../chunks/arrow-left.js";
import { S as Save } from "../../../../../../chunks/save.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let saving = false;
    let circuito = {
      codigo: "",
      nome: "",
      tipo: "nacional",
      dias: 5,
      noites: 4,
      descricao: "",
      preco_base: 0,
      vagas: 20,
      saidas: "",
      guia: true,
      ativo: true
    };
    let roteiro = [
      { dia: 1, titulo: "Chegada", descricao: "", refeicoes: [] },
      { dia: 2, titulo: "", descricao: "", refeicoes: [] }
    ];
    let destinosSelecionados = [""];
    const destinosDisponiveis = [
      "Rio de Janeiro",
      "Salvador",
      "Gramado",
      "Fortaleza",
      "Paris",
      "Lisboa",
      "Barcelona",
      "Cancún",
      "Porto Seguro",
      "Florianópolis"
    ];
    head("6izzjp", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Novo Circuito | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Novo Circuito",
      subtitle: "Cadastrar novo roteiro ou pacote combinado",
      color: "financeiro",
      breadcrumbs: [
        { label: "Cadastros", href: "/cadastros" },
        { label: "Circuitos", href: "/cadastros/circuitos" },
        { label: "Novo" }
      ]
    });
    $$renderer2.push(`<!----> <form>`);
    Card($$renderer2, {
      header: "Informações Básicas",
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label for="novo-circuito-codigo" class="block text-sm font-medium text-slate-700 mb-1">Código <span class="text-red-500">*</span></label> <div class="relative">`);
        Route($$renderer3, {
          size: 18,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer3.push(`<!----> <input id="novo-circuito-codigo" type="text"${attr("value", circuito.codigo)} placeholder="Ex: CIR-001" class="vtur-input w-full pl-10" required=""/></div></div> <div><label for="novo-circuito-nome" class="block text-sm font-medium text-slate-700 mb-1">Nome do Circuito <span class="text-red-500">*</span></label> <input id="novo-circuito-nome" type="text"${attr("value", circuito.nome)} placeholder="Ex: Rota das Emoções" class="vtur-input w-full" required=""/></div> <div><label for="novo-circuito-tipo" class="block text-sm font-medium text-slate-700 mb-1">Tipo</label> `);
        $$renderer3.select(
          {
            id: "novo-circuito-tipo",
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
        $$renderer3.push(`</div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label for="novo-circuito-dias" class="block text-sm font-medium text-slate-700 mb-1">Dias</label> <input id="novo-circuito-dias" type="number"${attr("value", circuito.dias)} min="1" class="vtur-input w-full"/></div> <div><label for="novo-circuito-noites" class="block text-sm font-medium text-slate-700 mb-1">Noites</label> <input id="novo-circuito-noites" type="number"${attr("value", circuito.noites)} min="1" class="vtur-input w-full"/></div></div> <div><label for="novo-circuito-preco-base" class="block text-sm font-medium text-slate-700 mb-1">Preço Base</label> <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span> <input id="novo-circuito-preco-base" type="number"${attr("value", circuito.preco_base)} placeholder="0,00" min="0" step="0.01" class="vtur-input w-full pl-10"/></div></div> <div><label for="novo-circuito-vagas" class="block text-sm font-medium text-slate-700 mb-1">Vagas por Saída</label> <input id="novo-circuito-vagas" type="number"${attr("value", circuito.vagas)} min="1" class="vtur-input w-full"/></div> <div><label for="novo-circuito-saidas" class="block text-sm font-medium text-slate-700 mb-1">Dias de Saída</label> <input id="novo-circuito-saidas" type="text"${attr("value", circuito.saidas)} placeholder="Ex: Ter, Sab / Semanal / Quinzenal" class="vtur-input w-full"/></div> <div><p class="block text-sm font-medium text-slate-700 mb-1">Guia Acompanhante</p> <div class="flex items-center gap-4 mt-2"><label class="flex items-center gap-2 cursor-pointer"><input type="radio"${attr("checked", circuito.guia === true, true)}${attr("value", true)} class="w-4 h-4 text-financeiro-600"/> <span class="text-sm text-slate-700">Sim</span></label> <label class="flex items-center gap-2 cursor-pointer"><input type="radio"${attr("checked", circuito.guia === false, true)}${attr("value", false)} class="w-4 h-4 text-slate-600"/> <span class="text-sm text-slate-700">Não</span></label></div></div> <div><p class="block text-sm font-medium text-slate-700 mb-1">Status</p> <div class="flex items-center gap-4 mt-2"><label class="flex items-center gap-2 cursor-pointer"><input type="radio"${attr("checked", circuito.ativo === true, true)}${attr("value", true)} class="w-4 h-4 text-financeiro-600"/> <span class="text-sm text-slate-700">Ativo</span></label> <label class="flex items-center gap-2 cursor-pointer"><input type="radio"${attr("checked", circuito.ativo === false, true)}${attr("value", false)} class="w-4 h-4 text-slate-600"/> <span class="text-sm text-slate-700">Inativo</span></label></div></div> <div class="md:col-span-2"><label for="novo-circuito-descricao" class="block text-sm font-medium text-slate-700 mb-1">Descrição Geral</label> <textarea id="novo-circuito-descricao" rows="3" placeholder="Descrição do circuito, principais atrativos..." class="vtur-input w-full">`);
        const $$body = escape_html(circuito.descricao);
        if ($$body) {
          $$renderer3.push(`${$$body}`);
        }
        $$renderer3.push(`</textarea></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Destinos do Circuito",
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="space-y-3"><!--[-->`);
        const each_array = ensure_array_like(destinosSelecionados);
        for (let index = 0, $$length = each_array.length; index < $$length; index++) {
          each_array[index];
          $$renderer3.push(`<div class="flex items-center gap-3"><span class="w-8 h-8 flex items-center justify-center bg-financeiro-100 text-financeiro-700 rounded-full font-medium text-sm">${escape_html(index + 1)}</span> `);
          $$renderer3.select(
            {
              value: destinosSelecionados[index],
              class: "vtur-input flex-1"
            },
            ($$renderer4) => {
              $$renderer4.option({ value: "" }, ($$renderer5) => {
                $$renderer5.push(`Selecione um destino...`);
              });
              $$renderer4.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(destinosDisponiveis);
              for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                let d = each_array_1[$$index];
                $$renderer4.option({ value: d }, ($$renderer5) => {
                  $$renderer5.push(`${escape_html(d)}`);
                });
              }
              $$renderer4.push(`<!--]-->`);
            }
          );
          $$renderer3.push(` `);
          if (destinosSelecionados.length > 1) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<button type="button" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">`);
            Trash_2($$renderer3, { size: 18 });
            $$renderer3.push(`<!----></button>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></div>`);
        }
        $$renderer3.push(`<!--]--> <button type="button" class="flex items-center gap-2 text-financeiro-600 hover:text-financeiro-700 font-medium text-sm mt-4">`);
        Plus($$renderer3, { size: 18 });
        $$renderer3.push(`<!----> Adicionar Destino</button></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Roteiro Diário",
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="space-y-6"><!--[-->`);
        const each_array_2 = ensure_array_like(roteiro);
        for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
          let dia = each_array_2[index];
          $$renderer3.push(`<div class="p-4 border border-slate-200 rounded-lg bg-slate-50"><div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><span class="w-10 h-10 flex items-center justify-center bg-financeiro-500 text-white rounded-full font-bold">D${escape_html(dia.dia)}</span> <input type="text"${attr("value", dia.titulo)} placeholder="Título do dia" class="vtur-input bg-white"/></div> `);
          if (roteiro.length > 1) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<button type="button" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">`);
            Trash_2($$renderer3, { size: 18 });
            $$renderer3.push(`<!----></button>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></div> <div class="ml-13"><textarea rows="2" placeholder="Descrição das atividades do dia..." class="vtur-input w-full bg-white mb-3">`);
          const $$body_1 = escape_html(dia.descricao);
          if ($$body_1) {
            $$renderer3.push(`${$$body_1}`);
          }
          $$renderer3.push(`</textarea> <div class="flex items-center gap-4"><span class="text-sm font-medium text-slate-700">Refeições incluídas:</span> <!--[-->`);
          const each_array_3 = ensure_array_like(["Café", "Almoço", "Jantar"]);
          for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
            let refeicao = each_array_3[$$index_2];
            $$renderer3.push(`<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox"${attr("checked", dia.refeicoes.includes(refeicao), true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-600">${escape_html(refeicao)}</span></label>`);
          }
          $$renderer3.push(`<!--]--></div></div></div>`);
        }
        $$renderer3.push(`<!--]--> <button type="button" class="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-financeiro-300 text-financeiro-600 hover:border-financeiro-500 hover:bg-financeiro-50 rounded-lg transition-colors font-medium">`);
        Plus($$renderer3, { size: 20 });
        $$renderer3.push(`<!----> Adicionar Dia</button></div>`);
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
          $$renderer3.push(`<!----> Salvar Circuito`);
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
