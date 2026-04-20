import { f as fallback, q as attr, p as attr_class, t as ensure_array_like, e as escape_html, m as bind_props, v as stringify } from "./index2.js";
import { B as Button } from "./Button2.js";
import "./ui.js";
import { C as Calculator } from "./calculator.js";
import { X } from "./x.js";
import { D as Dollar_sign } from "./dollar-sign.js";
import { P as Percent } from "./percent.js";
import { C as Credit_card } from "./credit-card.js";
function CalculatorModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let valorDesconto, valorFinal, comissaoValor;
    let open = fallback($$props["open"], false);
    let valorBruto = fallback($$props["valorBruto"], 0);
    let onClose = fallback($$props["onClose"], () => {
    });
    let onConfirm = fallback($$props["onConfirm"], () => {
    });
    let calc = {
      valorBruto: valorBruto || 0,
      descontoPercentual: 0,
      taxas: 0,
      comissaoPercentual: 10,
      // Padrão 10%
      parcelas: 1
    };
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    }
    valorDesconto = calc.valorBruto * calc.descontoPercentual / 100;
    valorFinal = calc.valorBruto - valorDesconto - calc.taxas;
    comissaoValor = valorFinal * calc.comissaoPercentual / 100;
    if (open) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true"><div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"><div class="flex items-center justify-between p-4 border-b border-slate-100 bg-vendas-50"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg bg-vendas-100 flex items-center justify-center">`);
      Calculator($$renderer2, { size: 24, class: "text-vendas-600" });
      $$renderer2.push(`<!----></div> <div><h3 class="text-lg font-semibold text-slate-900">Calculadora de Valores</h3> <p class="text-sm text-slate-500">Calcule comissões, descontos e parcelas</p></div></div> <button class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">`);
      X($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button></div> <div class="p-6 overflow-y-auto max-h-[60vh]"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Valor Bruto</label> <div class="relative">`);
      Dollar_sign($$renderer2, {
        size: 18,
        class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      });
      $$renderer2.push(`<!----> <input type="number"${attr("value", calc.valorBruto)} min="0" step="0.01" class="vtur-input pl-10 w-full" placeholder="0,00"/></div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Desconto</label> <div class="flex gap-2 mb-2"><button type="button"${attr_class(`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${stringify(
        "bg-vendas-100 border-vendas-300 text-vendas-700"
      )}`)}>`);
      Percent($$renderer2, { size: 14, class: "inline mr-1" });
      $$renderer2.push(`<!----> %</button> <button type="button"${attr_class(`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${stringify("bg-white border-slate-200 text-slate-600")}`)}>`);
      Dollar_sign($$renderer2, { size: 14, class: "inline mr-1" });
      $$renderer2.push(`<!----> R$</button></div> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="relative">`);
        Percent($$renderer2, {
          size: 18,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer2.push(`<!----> <input type="number"${attr("value", calc.descontoPercentual)} min="0" max="100" step="0.01" class="vtur-input pl-10 w-full" placeholder="0,00"/></div> <div class="flex gap-1 mt-2"><!--[-->`);
        const each_array = ensure_array_like([5, 10, 15, 20]);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let pct = each_array[$$index];
          $$renderer2.push(`<button type="button" class="px-2 py-1 text-xs bg-slate-100 hover:bg-vendas-100 text-slate-600 hover:text-vendas-700 rounded transition-colors">${escape_html(pct)}%</button>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Taxas (cartão, etc.)</label> <div class="relative">`);
      Dollar_sign($$renderer2, {
        size: 18,
        class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      });
      $$renderer2.push(`<!----> <input type="number"${attr("value", calc.taxas)} min="0" step="0.01" class="vtur-input pl-10 w-full" placeholder="0,00"/></div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">% Comissão</label> <div class="relative">`);
      Percent($$renderer2, {
        size: 18,
        class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      });
      $$renderer2.push(`<!----> <input type="number"${attr("value", calc.comissaoPercentual)} min="0" max="100" step="0.01" class="vtur-input pl-10 w-full" placeholder="10,00"/></div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Número de Parcelas</label> <div class="relative">`);
      Credit_card($$renderer2, {
        size: 18,
        class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      });
      $$renderer2.push(`<!----> `);
      $$renderer2.select({ value: calc.parcelas, class: "vtur-input pl-10 w-full" }, ($$renderer3) => {
        $$renderer3.option({ value: 1 }, ($$renderer4) => {
          $$renderer4.push(`À vista`);
        });
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let num = each_array_1[$$index_1];
          $$renderer3.option({ value: num }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(num)}x`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      });
      $$renderer2.push(`</div></div></div> <div class="bg-slate-50 rounded-xl p-4 space-y-4"><h4 class="font-medium text-slate-900">Resumo</h4> <div class="flex justify-between items-center py-2 border-b border-slate-200"><span class="text-slate-600">Valor Bruto</span> <span class="font-medium text-slate-900">${escape_html(formatCurrency(calc.valorBruto))}</span></div> <div class="flex justify-between items-center py-2 border-b border-slate-200"><span class="text-red-600">Desconto</span> <span class="font-medium text-red-600">-${escape_html(formatCurrency(valorDesconto))}</span></div> <div class="flex justify-between items-center py-2 border-b border-slate-200"><span class="text-orange-600">Taxas</span> <span class="font-medium text-orange-600">-${escape_html(formatCurrency(calc.taxas))}</span></div> <div class="flex justify-between items-center py-3 bg-vendas-100 rounded-lg px-3"><span class="font-semibold text-vendas-900">Valor Final</span> <span class="font-bold text-xl text-vendas-700">${escape_html(formatCurrency(valorFinal))}</span></div> <div class="flex justify-between items-center py-2 border-b border-slate-200"><span class="text-slate-600">Comissão (${escape_html(calc.comissaoPercentual)}%)</span> <span class="font-medium text-slate-900">${escape_html(formatCurrency(comissaoValor))}</span></div> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="flex justify-between items-center py-2 pt-4 border-t-2 border-slate-200"><span class="font-semibold text-slate-900">Receita Líquida</span> <span class="font-bold text-lg text-green-600">${escape_html(formatCurrency(valorFinal - comissaoValor))}</span></div></div></div></div> <div class="flex items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50">`);
      Button($$renderer2, {
        variant: "ghost",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->Limpar`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> <div class="flex gap-3">`);
      Button($$renderer2, {
        variant: "secondary",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->Cancelar`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Button($$renderer2, {
        variant: "primary",
        color: "vendas",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->Aplicar Valores`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----></div></div></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open, valorBruto, onClose, onConfirm });
  });
}
export {
  CalculatorModal as C
};
