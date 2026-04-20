import { h as head, q as attr, t as ensure_array_like, e as escape_html } from "../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import "chart.js/auto";
import { t as toast } from "../../../../../chunks/ui.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { L as Loader_circle } from "../../../../../chunks/loader-circle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let movimentacoes = [];
    let showMovimentacaoDialog = false;
    let processando = false;
    let novaMovimentacao = {
      tipo: "entrada",
      categoria: "outro",
      descricao: "",
      valor: 0,
      data_movimentacao: "",
      forma_pagamento_id: "",
      observacoes: ""
    };
    let formasPagamento = [];
    async function handleCriarMovimentacao() {
      {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }
    }
    movimentacoes.filter((m) => m.tipo === "entrada").length;
    movimentacoes.filter((m) => m.tipo === "saida").length;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1t0mbbz", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Caixa | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Dashboard de Caixa",
        subtitle: "Acompanhe o fluxo de caixa e movimentações financeiras",
        color: "financeiro",
        breadcrumbs: [
          { label: "Financeiro", href: "/financeiro" },
          { label: "Caixa" }
        ],
        actions: [
          {
            label: "Nova Movimentação",
            onClick: () => showMovimentacaoDialog = true,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="flex items-center justify-center py-20">`);
        Loader_circle($$renderer3, { size: 48, class: "animate-spin text-financeiro-600" });
        $$renderer3.push(`<!----></div>`);
      }
      $$renderer3.push(`<!--]--> `);
      Dialog($$renderer3, {
        title: "Nova Movimentação",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Salvar",
        confirmVariant: "primary",
        loading: processando,
        onConfirm: handleCriarMovimentacao,
        get open() {
          return showMovimentacaoDialog;
        },
        set open($$value) {
          showMovimentacaoDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Tipo *</label> `);
          $$renderer4.select({ value: novaMovimentacao.tipo, class: "vtur-input w-full" }, ($$renderer5) => {
            $$renderer5.option({ value: "entrada" }, ($$renderer6) => {
              $$renderer6.push(`Entrada (Receita)`);
            });
            $$renderer5.option({ value: "saida" }, ($$renderer6) => {
              $$renderer6.push(`Saída (Despesa)`);
            });
          });
          $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Categoria</label> `);
          $$renderer4.select(
            {
              value: novaMovimentacao.categoria,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "venda" }, ($$renderer6) => {
                $$renderer6.push(`Venda`);
              });
              $$renderer5.option({ value: "comissao" }, ($$renderer6) => {
                $$renderer6.push(`Comissão`);
              });
              $$renderer5.option({ value: "fornecedor" }, ($$renderer6) => {
                $$renderer6.push(`Fornecedor`);
              });
              $$renderer5.option({ value: "despesa_operacional" }, ($$renderer6) => {
                $$renderer6.push(`Despesa Operacional`);
              });
              $$renderer5.option({ value: "outro" }, ($$renderer6) => {
                $$renderer6.push(`Outro`);
              });
            }
          );
          $$renderer4.push(`</div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Descrição *</label> <input type="text"${attr("value", novaMovimentacao.descricao)} placeholder="Descrição da movimentação" class="vtur-input w-full"/></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Valor *</label> <input type="number" step="0.01" min="0"${attr("value", novaMovimentacao.valor)} placeholder="0,00" class="vtur-input w-full"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Data *</label> <input type="date"${attr("value", novaMovimentacao.data_movimentacao)} class="vtur-input w-full"/></div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label> `);
          $$renderer4.select(
            {
              value: novaMovimentacao.forma_pagamento_id,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione...`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_2 = ensure_array_like(formasPagamento);
              for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                let fp = each_array_2[$$index_2];
                $$renderer5.option({ value: fp.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(fp.nome)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Observações</label> <textarea rows="2" placeholder="Observações opcionais" class="vtur-input w-full">`);
          const $$body = escape_html(novaMovimentacao.observacoes);
          if ($$body) {
            $$renderer4.push(`${$$body}`);
          }
          $$renderer4.push(`</textarea></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  _page as default
};
