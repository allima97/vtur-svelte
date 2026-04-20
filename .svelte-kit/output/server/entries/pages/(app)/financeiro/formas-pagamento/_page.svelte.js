import { h as head, e as escape_html, p as attr_class, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { C as Credit_card } from "../../../../../chunks/credit-card.js";
import { C as Circle_check_big } from "../../../../../chunks/circle-check-big.js";
import { C as Circle_x } from "../../../../../chunks/circle-x.js";
import { P as Pen } from "../../../../../chunks/pen.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let ativas, inativas, semComissao, comDesconto, formasVisiveis;
    let formasPagamento = [];
    let loading = true;
    let showFormDialog = false;
    let showDeleteDialog = false;
    let processando = false;
    let editando = null;
    let form = {
      nome: "",
      descricao: "",
      paga_comissao: true,
      permite_desconto: false,
      desconto_padrao_pct: null,
      ativo: true
    };
    const columns = [
      {
        key: "nome",
        label: "Nome",
        sortable: true,
        formatter: (value, row) => {
          const detalhes = [];
          if (row.permite_desconto) detalhes.push("Permite desconto");
          if (row.paga_comissao === false) detalhes.push("Sem comissão");
          return `<div class="flex flex-col"><span class="font-medium text-slate-900">${value}</span><span class="text-xs text-slate-500">${detalhes.join(" · ") || (row.descricao || "-")}</span></div>`;
        }
      },
      {
        key: "descricao",
        label: "Descrição",
        formatter: (value) => value || "-"
      },
      {
        key: "paga_comissao",
        label: "Paga Comissão",
        width: "130px",
        align: "center",
        formatter: (value) => value !== false ? '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Sim</span>' : '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Não</span>'
      },
      {
        key: "permite_desconto",
        label: "Desconto",
        width: "120px",
        align: "center",
        formatter: (value, row) => value ? `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">${row.desconto_padrao_pct ?? 0}%</span>` : '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Não</span>'
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "100px",
        formatter: (value) => value ? '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Ativo</span>' : '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Inativo</span>'
      }
    ];
    async function carregarFormasPagamento() {
      loading = true;
      try {
        const response = await fetch("/api/v1/financeiro/formas-pagamento");
        if (response.ok) {
          const data = await response.json();
          formasPagamento = data.items || [];
        } else {
          toast.error("Erro ao carregar formas de pagamento");
        }
      } catch (err) {
        console.error("Erro:", err);
        toast.error("Erro ao carregar dados");
      } finally {
        loading = false;
      }
    }
    function abrirForm(forma) {
      {
        editando = null;
        form = {
          nome: "",
          descricao: "",
          paga_comissao: true,
          permite_desconto: false,
          desconto_padrao_pct: null,
          ativo: true
        };
      }
      showFormDialog = true;
    }
    async function salvar() {
      if (!form.nome) {
        toast.error("Nome é obrigatório");
        return;
      }
      processando = true;
      try {
        const url = "/api/v1/financeiro/formas-pagamento";
        const method = editando ? "PATCH" : "POST";
        const body = editando ? { ...form, id: editando.id } : form;
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao salvar");
        }
        toast.success(editando ? "Forma de pagamento atualizada!" : "Forma de pagamento criada!");
        showFormDialog = false;
        await carregarFormasPagamento();
      } catch (err) {
        toast.error(err.message || "Erro ao salvar");
      } finally {
        processando = false;
      }
    }
    async function excluir() {
      return;
    }
    ativas = formasPagamento.filter((f) => f.ativo);
    inativas = formasPagamento.filter((f) => !f.ativo);
    semComissao = formasPagamento.filter((f) => f.paga_comissao === false);
    comDesconto = formasPagamento.filter((f) => Boolean(f.permite_desconto));
    formasVisiveis = formasPagamento.filter((f) => {
      return true;
    });
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("fze0sm", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Formas de Pagamento | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Formas de Pagamento",
        subtitle: "Cadastre e gerencie as formas de pagamento aceitas",
        color: "financeiro",
        breadcrumbs: [
          { label: "Financeiro", href: "/financeiro" },
          { label: "Formas de Pagamento" }
        ],
        actions: [
          {
            label: "Nova Forma",
            onClick: () => abrirForm(),
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
      Credit_card($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total</p> <p class="text-2xl font-bold text-slate-900">${escape_html(formasPagamento.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
      Circle_check_big($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Ativas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(ativas.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
      Circle_x($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Inativas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(inativas.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
      Circle_check_big($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Com Desconto</p> <p class="text-2xl font-bold text-slate-900">${escape_html(comDesconto.length)}</p></div></div></div> <div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">A tela agora ajuda a revisar rapidamente formas <strong>ativas</strong>, <strong>inativas</strong>, sem comissão e com política de desconto.</div> `);
      Card($$renderer3, {
        color: "financeiro",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="flex flex-wrap items-center gap-2"><button type="button"${attr_class(`rounded-full border px-4 py-2 text-sm font-medium ${"border-financeiro-300 bg-financeiro-50 text-financeiro-800"}`)}>Todas (${escape_html(formasPagamento.length)})</button> <button type="button"${attr_class(`rounded-full border px-4 py-2 text-sm font-medium ${"border-slate-200 bg-white text-slate-700"}`)}>Ativas (${escape_html(ativas.length)})</button> <button type="button"${attr_class(`rounded-full border px-4 py-2 text-sm font-medium ${"border-slate-200 bg-white text-slate-700"}`)}>Inativas (${escape_html(inativas.length)})</button> <button type="button"${attr_class(`rounded-full border px-4 py-2 text-sm font-medium ${"border-slate-200 bg-white text-slate-700"}`)}>Sem comissão (${escape_html(semComissao.length)})</button> <button type="button"${attr_class(`rounded-full border px-4 py-2 text-sm font-medium ${"border-slate-200 bg-white text-slate-700"}`)}>Com desconto (${escape_html(comDesconto.length)})</button></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      DataTable($$renderer3, {
        columns,
        data: formasVisiveis,
        color: "financeiro",
        loading,
        title: "Formas de Pagamento Cadastradas",
        emptyMessage: "Nenhuma forma de pagamento encontrada",
        searchable: true,
        $$slots: {
          actions: ($$renderer4, { row }) => {
            {
              $$renderer4.push(`<div class="flex items-center gap-2">`);
              Button($$renderer4, {
                variant: "ghost",
                size: "sm",
                title: "Editar",
                children: ($$renderer5) => {
                  Pen($$renderer5, { size: 16 });
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              Button($$renderer4, {
                variant: "ghost",
                size: "sm",
                title: "Excluir",
                class_name: "text-red-600 hover:text-red-700",
                children: ($$renderer5) => {
                  Trash_2($$renderer5, { size: 16 });
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----></div>`);
            }
          }
        }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: editando ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: editando ? "Salvar" : "Criar",
        confirmVariant: "primary",
        loading: processando,
        onConfirm: salvar,
        get open() {
          return showFormDialog;
        },
        set open($$value) {
          showFormDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Nome *</label> <input type="text"${attr("value", form.nome)} placeholder="ex: PIX" class="vtur-input w-full"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Descrição</label> <input type="text"${attr("value", form.descricao)} placeholder="Descrição opcional" class="vtur-input w-full"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Desconto padrão (%)</label> <input type="number"${attr("value", form.desconto_padrao_pct)} min="0" max="100" step="0.01" placeholder="0" class="vtur-input w-full"/></div> <div class="space-y-2"><label class="flex items-center gap-2"><input type="checkbox"${attr("checked", form.paga_comissao, true)} class="rounded border-slate-300 text-financeiro-600 focus:ring-financeiro-500"/> <span class="text-sm text-slate-700">Paga comissão</span></label> <label class="flex items-center gap-2"><input type="checkbox"${attr("checked", form.permite_desconto, true)} class="rounded border-slate-300 text-financeiro-600 focus:ring-financeiro-500"/> <span class="text-sm text-slate-700">Permite desconto</span></label> <label class="flex items-center gap-2"><input type="checkbox"${attr("checked", form.ativo, true)} class="rounded border-slate-300 text-financeiro-600 focus:ring-financeiro-500"/> <span class="text-sm text-slate-700">Ativo</span></label></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Excluir Forma de Pagamento",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Excluir",
        confirmVariant: "danger",
        loading: processando,
        onConfirm: excluir,
        get open() {
          return showDeleteDialog;
        },
        set open($$value) {
          showDeleteDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]-->`);
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
