import { h as head, e as escape_html, q as attr, t as ensure_array_like } from "../../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../../chunks/PageHeader.js";
import { B as Button } from "../../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../../chunks/ui.js";
import { P as Plus } from "../../../../../../chunks/plus.js";
import { P as Percent } from "../../../../../../chunks/percent.js";
import { C as Circle_check_big } from "../../../../../../chunks/circle-check-big.js";
import { T as Trending_up } from "../../../../../../chunks/trending-up.js";
import { U as Users } from "../../../../../../chunks/users.js";
import { P as Pen } from "../../../../../../chunks/pen.js";
import { T as Trash_2 } from "../../../../../../chunks/trash-2.js";
import { L as Layers } from "../../../../../../chunks/layers.js";
import { C as Circle_x } from "../../../../../../chunks/circle-x.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let regrasAtivas, regrasEscalonaveis;
    let regras = [];
    let loading = true;
    let showDialog = false;
    let showDeleteDialog = false;
    let showVendedoresDialog = false;
    let editingRegra = null;
    let formData = {
      nome: "",
      descricao: "",
      tipo: "GERAL",
      meta_nao_atingida: 0,
      meta_atingida: 0,
      super_meta: 0,
      ativo: true,
      tiers: []
    };
    const columns = [
      { key: "nome", label: "Nome", sortable: true },
      { key: "tipo", label: "Tipo", sortable: true, width: "140px" },
      {
        key: "percentual",
        label: "% Base",
        sortable: true,
        width: "100px",
        align: "center",
        formatter: (_, row) => `${row.meta_atingida}%`
      },
      {
        key: "vendedores",
        label: "Vendedores",
        sortable: false,
        width: "120px",
        align: "center",
        formatter: (_, row) => String(row.vendedores_count || 0)
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "100px",
        formatter: (value) => value ? '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Ativo</span>' : '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Inativo</span>'
      },
      {
        key: "updated_at",
        label: "Atualizado",
        sortable: true,
        width: "150px",
        formatter: (value) => value ? new Date(value).toLocaleDateString("pt-BR") : "-"
      }
    ];
    async function loadRegras() {
      loading = true;
      try {
        const response = await fetch("/api/v1/financeiro/comissoes/regras");
        if (!response.ok) throw new Error("Erro ao carregar regras");
        const data = await response.json();
        regras = data.items || [];
        await loadVendedoresCount();
      } catch (err) {
        toast.error("Erro ao carregar regras de comissão");
        console.error(err);
      } finally {
        loading = false;
      }
    }
    async function loadVendedoresCount() {
      try {
        const response = await fetch("/api/v1/financeiro/comissoes/vendedores");
        if (!response.ok) return;
        const data = await response.json();
        const vendedoresPorRegra = (data.items || []).reduce(
          (acc, item) => {
            if (!acc[item.regra_id]) acc[item.regra_id] = 0;
            if (item.vigente) acc[item.regra_id]++;
            return acc;
          },
          {}
        );
        regras = regras.map((r) => ({ ...r, vendedores_count: vendedoresPorRegra[r.id] || 0 }));
      } catch (err) {
        console.error("Erro ao carregar contagem de vendedores:", err);
      }
    }
    function openNewDialog() {
      editingRegra = null;
      formData = {
        nome: "",
        descricao: "",
        tipo: "GERAL",
        meta_nao_atingida: 0,
        meta_atingida: 0,
        super_meta: 0,
        ativo: true,
        tiers: []
      };
      showDialog = true;
    }
    async function handleSave() {
      try {
        const url = editingRegra ? `/api/v1/financeiro/comissoes/regras/${editingRegra.id}` : "/api/v1/financeiro/comissoes/regras";
        const method = editingRegra ? "PUT" : "POST";
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
        toast.success(editingRegra ? "Regra atualizada com sucesso" : "Regra criada com sucesso");
        showDialog = false;
        await loadRegras();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar regra");
      }
    }
    async function handleDelete() {
      return;
    }
    regrasAtivas = regras.filter((r) => r.ativo).length;
    regrasEscalonaveis = regras.filter((r) => r.tipo === "ESCALONAVEL").length;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("15zwks9", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Regras de Comissão | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Regras de Comissão",
        subtitle: "Configure as regras de comissão para vendedores",
        color: "financeiro",
        breadcrumbs: [
          { label: "Financeiro", href: "/financeiro" },
          { label: "Comissões", href: "/financeiro/comissoes" },
          { label: "Regras" }
        ],
        actions: [
          {
            label: "Nova Regra",
            onClick: openNewDialog,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
      Percent($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total de Regras</p> <p class="text-2xl font-bold text-slate-900">${escape_html(regras.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
      Circle_check_big($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Regras Ativas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(regrasAtivas)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
      Trending_up($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Escalonáveis</p> <p class="text-2xl font-bold text-slate-900">${escape_html(regrasEscalonaveis)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-amber-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">`);
      Users($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Vendedores</p> <p class="text-2xl font-bold text-slate-900">${escape_html(regras.reduce((acc, r) => acc + (r.vendedores_count || 0), 0))}</p></div></div></div> `);
      DataTable($$renderer3, {
        columns,
        data: regras,
        color: "financeiro",
        loading,
        title: "Regras Cadastradas",
        searchable: true,
        filterable: true,
        filters: [
          {
            key: "tipo",
            label: "Tipo",
            type: "select",
            options: [
              { value: "GERAL", label: "Geral" },
              { value: "ESCALONAVEL", label: "Escalonável" }
            ]
          },
          {
            key: "ativo",
            label: "Status",
            type: "select",
            options: [
              { value: "true", label: "Ativo" },
              { value: "false", label: "Inativo" }
            ]
          }
        ],
        emptyMessage: "Nenhuma regra de comissão encontrada",
        $$slots: {
          actions: ($$renderer4, { row }) => {
            {
              $$renderer4.push(`<div class="flex items-center gap-2">`);
              Button($$renderer4, {
                variant: "ghost",
                size: "sm",
                title: "Gerenciar vendedores",
                children: ($$renderer5) => {
                  Users($$renderer5, { size: 16 });
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
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
                color: "danger",
                title: "Excluir",
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
        title: editingRegra ? "Editar Regra" : "Nova Regra de Comissão",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: editingRegra ? "Salvar" : "Criar",
        onConfirm: handleSave,
        get open() {
          return showDialog;
        },
        set open($$value) {
          showDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2"><div><label class="block text-sm font-medium text-slate-700 mb-1">Nome <span class="text-red-500">*</span></label> <input type="text"${attr("value", formData.nome)} class="vtur-input w-full" placeholder="Ex: Comissão Padrão 10%"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Descrição</label> <textarea rows="2" class="vtur-input w-full" placeholder="Descrição opcional da regra...">`);
          const $$body = escape_html(formData.descricao);
          if ($$body) {
            $$renderer4.push(`${$$body}`);
          }
          $$renderer4.push(`</textarea></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Tipo</label> `);
          $$renderer4.select({ value: formData.tipo, class: "vtur-input w-full" }, ($$renderer5) => {
            $$renderer5.option({ value: "GERAL" }, ($$renderer6) => {
              $$renderer6.push(`Geral (Fixo)`);
            });
            $$renderer5.option({ value: "ESCALONAVEL" }, ($$renderer6) => {
              $$renderer6.push(`Escalonável (Faixas)`);
            });
          });
          $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Status</label> `);
          $$renderer4.select({ value: formData.ativo, class: "vtur-input w-full" }, ($$renderer5) => {
            $$renderer5.option({ value: true }, ($$renderer6) => {
              $$renderer6.push(`Ativo`);
            });
            $$renderer5.option({ value: false }, ($$renderer6) => {
              $$renderer6.push(`Inativo`);
            });
          });
          $$renderer4.push(`</div></div> <div class="border-t pt-4"><h4 class="font-medium text-slate-900 mb-3 flex items-center gap-2">`);
          Percent($$renderer4, { size: 16 });
          $$renderer4.push(`<!----> Percentuais</h4> <div class="grid grid-cols-1 sm:grid-cols-3 gap-4"><div><label class="block text-xs font-medium text-slate-600 mb-1">Meta Não Atingida (%)</label> <input type="number" min="0" max="100" step="0.01"${attr("value", formData.meta_nao_atingida)} class="vtur-input w-full"/></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Meta Atingida (%)</label> <input type="number" min="0" max="100" step="0.01"${attr("value", formData.meta_atingida)} class="vtur-input w-full"/></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Super Meta (%)</label> <input type="number" min="0" max="100" step="0.01"${attr("value", formData.super_meta)} class="vtur-input w-full"/></div></div></div> `);
          if (formData.tipo === "ESCALONAVEL") {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="border-t pt-4"><div class="flex items-center justify-between mb-3"><h4 class="font-medium text-slate-900 flex items-center gap-2">`);
            Layers($$renderer4, { size: 16 });
            $$renderer4.push(`<!----> Faixas Escalonáveis</h4> `);
            Button($$renderer4, {
              variant: "secondary",
              size: "sm",
              children: ($$renderer5) => {
                Plus($$renderer5, { size: 14, class: "mr-1" });
                $$renderer5.push(`<!----> Adicionar Faixa`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div> `);
            if (formData.tiers.length === 0) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<p class="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded">Nenhuma faixa configurada. Clique em "Adicionar Faixa" para criar.</p>`);
            } else {
              $$renderer4.push("<!--[-1-->");
              $$renderer4.push(`<div class="space-y-2 max-h-48 overflow-y-auto"><!--[-->`);
              const each_array = ensure_array_like(formData.tiers);
              for (let index = 0, $$length = each_array.length; index < $$length; index++) {
                let tier = each_array[index];
                $$renderer4.push(`<div class="p-3 bg-slate-50 rounded-lg border"><div class="flex items-center justify-between mb-2"><span class="text-sm font-medium">Faixa ${escape_html(index + 1)}</span> <button class="text-red-500 hover:text-red-700">`);
                Circle_x($$renderer4, { size: 16 });
                $$renderer4.push(`<!----></button></div> <div class="grid grid-cols-2 gap-2">`);
                $$renderer4.select({ value: tier.faixa, class: "vtur-input" }, ($$renderer5) => {
                  $$renderer5.option({ value: "PRE" }, ($$renderer6) => {
                    $$renderer6.push(`Pré-meta`);
                  });
                  $$renderer5.option({ value: "POS" }, ($$renderer6) => {
                    $$renderer6.push(`Pós-meta`);
                  });
                });
                $$renderer4.push(` <input type="number"${attr("value", tier.de_pct)} placeholder="De %" class="vtur-input" min="0" max="100" step="0.01"/> <input type="number"${attr("value", tier.ate_pct)} placeholder="Até %" class="vtur-input" min="0" max="100" step="0.01"/> <input type="number"${attr("value", tier.inc_pct_comissao)} placeholder="Inc. Comissão %" class="vtur-input" min="0" max="100" step="0.01"/></div></div>`);
              }
              $$renderer4.push(`<!--]--></div>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Confirmar Exclusão",
        color: "danger",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Excluir",
        onConfirm: handleDelete,
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
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Vendedores",
        color: "financeiro",
        showCancel: true,
        cancelText: "Fechar",
        showConfirm: false,
        get open() {
          return showVendedoresDialog;
        },
        set open($$value) {
          showVendedoresDialog = $$value;
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
