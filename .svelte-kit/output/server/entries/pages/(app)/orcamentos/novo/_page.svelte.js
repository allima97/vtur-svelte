import { h as head, q as attr, p as attr_class, e as escape_html, t as ensure_array_like } from "../../../../../chunks/index2.js";
import { o as onDestroy } from "../../../../../chunks/index-server.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import "../../../../../chunks/ui.js";
import { S as Search } from "../../../../../chunks/search.js";
import { X } from "../../../../../chunks/x.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { F as File_text } from "../../../../../chunks/file-text.js";
import { A as Arrow_left } from "../../../../../chunks/arrow-left.js";
import { S as Save } from "../../../../../chunks/save.js";
import { S as Send } from "../../../../../chunks/send.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let valorTotal;
    let formData = {
      currency: "BRL",
      valid_until: "",
      notes: "",
      itens: [makeItem(0)]
    };
    let saving = false;
    let errors = {};
    let searchClienteQuery = "";
    function makeItem(index) {
      return {
        title: "",
        product_name: "",
        item_type: "servico",
        quantity: 1,
        unit_price: 0,
        total_amount: 0,
        city_name: "",
        order_index: index
      };
    }
    onDestroy(() => {
    });
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    }
    const tiposItem = [
      { value: "servico", label: "Serviço" },
      { value: "pacote", label: "Pacote" },
      { value: "hotel", label: "Hotel" },
      { value: "passagem", label: "Passagem" },
      { value: "passeio", label: "Passeio" },
      { value: "transfer", label: "Transfer" },
      { value: "seguro", label: "Seguro" },
      { value: "outro", label: "Outro" }
    ];
    valorTotal = formData.itens.reduce((acc, item) => acc + (item.total_amount || 0), 0);
    head("19raqb6", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Novo Orçamento | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Novo Orçamento",
      subtitle: "Crie um novo orçamento para o cliente",
      color: "orcamentos",
      breadcrumbs: [
        { label: "Orçamentos", href: "/orcamentos" },
        { label: "Novo Orçamento" }
      ]
    });
    $$renderer2.push(`<!----> <form class="space-y-6">`);
    Card($$renderer2, {
      header: "Dados do Cliente",
      color: "orcamentos",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="space-y-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Cliente <span class="text-red-500">*</span></label> `);
        {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<div class="relative">`);
          Search($$renderer3, {
            size: 18,
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          });
          $$renderer3.push(`<!----> <input type="text"${attr("value", searchClienteQuery)} placeholder="Buscar cliente por nome, email ou CPF..."${attr_class("vtur-input pl-10 w-full", void 0, { "border-red-500": errors.cliente })} autocomplete="off"/> `);
          {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></div> `);
          if (errors.cliente) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<p class="mt-1 text-sm text-red-600">${escape_html(errors.cliente)}</p>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]--></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Dados do Orçamento",
      color: "orcamentos",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label for="valid_until" class="block text-sm font-medium text-slate-700 mb-1">Válido até <span class="text-red-500">*</span></label> <div class="flex gap-2"><input id="valid_until" type="date"${attr("value", formData.valid_until)}${attr_class("vtur-input flex-1", void 0, { "border-red-500": errors.valid_until })}/> <div class="flex gap-1"><!--[-->`);
        const each_array_1 = ensure_array_like([7, 15, 30]);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let dias = each_array_1[$$index_1];
          $$renderer3.push(`<button type="button" class="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">${escape_html(dias)}d</button>`);
        }
        $$renderer3.push(`<!--]--></div></div> `);
        if (errors.valid_until) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<p class="mt-1 text-sm text-red-600">${escape_html(errors.valid_until)}</p>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div> <div><label for="currency" class="block text-sm font-medium text-slate-700 mb-1">Moeda</label> `);
        $$renderer3.select(
          {
            id: "currency",
            value: formData.currency,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "BRL" }, ($$renderer5) => {
              $$renderer5.push(`Real (R$)`);
            });
            $$renderer4.option({ value: "USD" }, ($$renderer5) => {
              $$renderer5.push(`Dólar (US$)`);
            });
            $$renderer4.option({ value: "EUR" }, ($$renderer5) => {
              $$renderer5.push(`Euro (€)`);
            });
          }
        );
        $$renderer3.push(`</div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Itens do Orçamento",
      color: "orcamentos",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="space-y-3"><!--[-->`);
        const each_array_2 = ensure_array_like(formData.itens);
        for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
          let item = each_array_2[index];
          $$renderer3.push(`<div class="flex gap-3 items-start p-4 bg-slate-50 rounded-lg border border-slate-100"><div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3"><div class="md:col-span-4"><label class="block text-xs font-medium text-slate-500 mb-1">Descrição *</label> <input type="text"${attr("value", item.title)} class="vtur-input w-full" placeholder="Ex: Passagem Aérea Ida e Volta"/></div> <div class="md:col-span-2"><label class="block text-xs font-medium text-slate-500 mb-1">Tipo</label> `);
          $$renderer3.select({ value: item.item_type, class: "vtur-input w-full" }, ($$renderer4) => {
            $$renderer4.push(`<!--[-->`);
            const each_array_3 = ensure_array_like(tiposItem);
            for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
              let tipo = each_array_3[$$index_2];
              $$renderer4.option({ value: tipo.value }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(tipo.label)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          });
          $$renderer3.push(`</div> <div class="md:col-span-2"><label class="block text-xs font-medium text-slate-500 mb-1">Destino</label> <input type="text"${attr("value", item.city_name)} class="vtur-input w-full" placeholder="Cidade"/></div> <div class="md:col-span-1"><label class="block text-xs font-medium text-slate-500 mb-1">Qtd</label> <input type="number"${attr("value", item.quantity)} min="1" class="vtur-input w-full"/></div> <div class="md:col-span-2"><label class="block text-xs font-medium text-slate-500 mb-1">Valor Unit.</label> <input type="number"${attr("value", item.unit_price)} min="0" step="0.01" class="vtur-input w-full"/></div> <div class="md:col-span-1"><label class="block text-xs font-medium text-slate-500 mb-1">Total</label> <div class="px-2 py-2 bg-white rounded-lg text-sm font-semibold text-slate-800 text-right border border-slate-200">${escape_html(formatCurrency(item.total_amount))}</div></div></div> `);
          if (formData.itens.length > 1) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<button type="button" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-5 flex-shrink-0" aria-label="Remover item">`);
            X($$renderer3, { size: 18 });
            $$renderer3.push(`<!----></button>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></div>`);
        }
        $$renderer3.push(`<!--]--> `);
        if (errors.itens) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<p class="text-sm text-red-600">${escape_html(errors.itens)}</p>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        Button($$renderer3, {
          type: "button",
          variant: "secondary",
          children: ($$renderer4) => {
            Plus($$renderer4, { size: 16, class: "mr-2" });
            $$renderer4.push(`<!----> Adicionar Item`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div> <div class="mt-6 pt-4 border-t border-slate-200"><div class="flex justify-end"><div class="text-right"><p class="text-sm text-slate-500">Valor Total do Orçamento</p> <p class="text-3xl font-bold text-orcamentos-600">${escape_html(formatCurrency(valorTotal))}</p></div></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Observações e Condições",
      color: "orcamentos",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="relative">`);
        File_text($$renderer3, {
          size: 18,
          class: "absolute left-3 top-3 text-slate-400 pointer-events-none"
        });
        $$renderer3.push(`<!----> <textarea rows="4" class="vtur-input pl-10 w-full" placeholder="Informações adicionais, condições de pagamento, validade da proposta...">`);
        const $$body = escape_html(formData.notes);
        if ($$body) {
          $$renderer3.push(`${$$body}`);
        }
        $$renderer3.push(`</textarea></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="flex items-center justify-end gap-3">`);
    Button($$renderer2, {
      type: "button",
      variant: "secondary",
      disabled: saving,
      children: ($$renderer3) => {
        Arrow_left($$renderer3, { size: 16, class: "mr-2" });
        $$renderer3.push(`<!----> Cancelar`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      type: "button",
      variant: "secondary",
      disabled: saving,
      loading: saving,
      children: ($$renderer3) => {
        Save($$renderer3, { size: 16, class: "mr-2" });
        $$renderer3.push(`<!----> Salvar Rascunho`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      type: "button",
      variant: "primary",
      color: "orcamentos",
      loading: saving,
      children: ($$renderer3) => {
        Send($$renderer3, { size: 16, class: "mr-2" });
        $$renderer3.push(`<!----> Salvar e Enviar`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></form>`);
  });
}
export {
  _page as default
};
