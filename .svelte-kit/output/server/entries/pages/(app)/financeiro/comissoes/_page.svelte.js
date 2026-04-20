import { h as head, e as escape_html, q as attr, t as ensure_array_like, p as attr_class } from "../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { K as KPICard } from "../../../../../chunks/KPICard.js";
import { K as KPIGrid } from "../../../../../chunks/KPIGrid.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { S as Settings } from "../../../../../chunks/settings.js";
import { L as Loader_circle } from "../../../../../chunks/loader-circle.js";
import { C as Clock } from "../../../../../chunks/clock.js";
import { C as Circle_check_big } from "../../../../../chunks/circle-check-big.js";
import { W as Wallet } from "../../../../../chunks/wallet.js";
import { U as Users } from "../../../../../chunks/users.js";
import { D as Download } from "../../../../../chunks/download.js";
import { D as Dollar_sign } from "../../../../../chunks/dollar-sign.js";
import { C as Circle_alert } from "../../../../../chunks/circle-alert.js";
import { F as File_text } from "../../../../../chunks/file-text.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let pendentes, pagas, totalPendente, totalPago, valorSelecionado, comissoesVisiveis;
    let comissoes = [];
    let resumoVendedores = [];
    let vendedores = [];
    let loading = true;
    let filtroStatus = "todas";
    let filtroVendedor = "";
    let comissoesSelecionadas = [];
    let showPagamentoDialog = false;
    let showPagamentoMultiploDialog = false;
    let showDetalhesDialog = false;
    let dataPagamento = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let observacoesPagamento = "";
    async function loadComissoes() {
      loading = true;
      try {
        const params = new URLSearchParams();
        if (filtroStatus !== "todas") ;
        if (filtroVendedor) ;
        const response = await fetch(`/api/v1/financeiro/comissoes?${params.toString()}`);
        if (!response.ok) throw new Error("Erro ao carregar comissões");
        const data = await response.json();
        comissoes = (data.items || []).map((item) => ({
          ...item,
          valor_venda: Number(item.valor_venda || 0),
          valor_comissao: Number(item.valor_comissao || 0),
          valor_pago: Number(item.valor_pago || 0),
          valor_taxas: Number(item.valor_taxas || 0),
          status: String(item.status || "pendente").toLowerCase()
        }));
        resumoVendedores = data.resumo || [];
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar comissões");
      } finally {
        loading = false;
      }
    }
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    }
    function getStatusBadge(status) {
      const key = (status || "").toLowerCase();
      const cls = key === "pago" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700";
      const label = key === "pago" ? "Pago" : "Pendente";
      return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${cls}">${label}</span>`;
    }
    const columns = [
      {
        key: "numero_venda",
        label: "Venda",
        sortable: true,
        width: "120px"
      },
      { key: "vendedor", label: "Vendedor", sortable: true },
      { key: "cliente", label: "Cliente", sortable: true },
      {
        key: "data_venda",
        label: "Data Venda",
        sortable: true,
        width: "110px",
        formatter: (value) => value ? new Date(value).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "valor_venda",
        label: "Valor Venda",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "valor_comissao",
        label: "Comissão",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "valor_pago",
        label: "Pago",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "110px",
        formatter: (value) => getStatusBadge(value)
      }
    ];
    async function handleConfirmarPagamento() {
      return;
    }
    async function handlePagamentoMultiplo() {
      if (comissoesSelecionadas.length === 0) return;
      try {
        const response = await fetch("/api/v1/financeiro/comissoes/pagamento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comissao_ids: comissoesSelecionadas,
            data_pagamento: dataPagamento,
            observacoes: observacoesPagamento
          })
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        toast.success(`${data.pagas} comissões marcadas como pagas`);
        showPagamentoMultiploDialog = false;
        comissoesSelecionadas = [];
        await loadComissoes();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao registrar pagamentos");
      } finally {
      }
    }
    function onSelectionChange(selected) {
      comissoesSelecionadas = selected.filter((id) => comissoes.find((x) => x.id === id && x.status === "pendente"));
    }
    pendentes = comissoes.filter((c) => c.status === "pendente");
    pagas = comissoes.filter((c) => c.status === "pago");
    totalPendente = pendentes.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);
    totalPago = pagas.reduce((acc, c) => acc + Number(c.valor_pago || c.valor_comissao || 0), 0);
    valorSelecionado = comissoes.filter((c) => comissoesSelecionadas.includes(c.id)).reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);
    comissoesVisiveis = comissoes;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("n6ywle", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Comissões | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Comissões",
        subtitle: "Gerencie as comissões dos vendedores",
        color: "financeiro",
        breadcrumbs: [
          { label: "Financeiro", href: "/financeiro" },
          { label: "Comissões" }
        ],
        actions: [
          {
            label: "Regras",
            href: "/financeiro/regras",
            variant: "secondary",
            icon: Settings
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      if (loading) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="flex items-center justify-center py-12">`);
        Loader_circle($$renderer3, { size: 40, class: "animate-spin text-financeiro-600" });
        $$renderer3.push(`<!----><span class="ml-3 text-slate-600">Carregando comissões...</span></div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
        $$renderer3.push(`<div class="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p> <p class="text-sm text-slate-500">Resumo da fila de pagamento interno com foco em backlog, liquidação e priorização por vendedor.</p></div></div> `);
        KPIGrid($$renderer3, {
          className: "mb-6",
          columns: 4,
          children: ($$renderer4) => {
            $$renderer4.push(`<button class="vtur-kpi-card border-t-[3px] border-t-amber-400 text-left hover:shadow-lg transition-all duration-200"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">`);
            Clock($$renderer4, { size: 20 });
            $$renderer4.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Comissões pendentes</p> <p class="text-2xl font-bold text-slate-900">${escape_html(pendentes.length)}</p></div></button> <button class="vtur-kpi-card border-t-[3px] border-t-green-400 text-left hover:shadow-lg transition-all duration-200"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
            Circle_check_big($$renderer4, { size: 20 });
            $$renderer4.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total pago</p> <p class="text-2xl font-bold text-slate-900">${escape_html(formatCurrency(totalPago))}</p></div></button> <button class="vtur-kpi-card border-t-[3px] border-t-orange-400 text-left hover:shadow-lg transition-all duration-200"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
            Wallet($$renderer4, { size: 20 });
            $$renderer4.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Valor pendente</p> <p class="text-2xl font-bold text-slate-900">${escape_html(formatCurrency(totalPendente))}</p></div></button> <button class="vtur-kpi-card border-t-[3px] border-t-blue-400 text-left hover:shadow-lg transition-all duration-200"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
            Users($$renderer4, { size: 20 });
            $$renderer4.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Vendedores na base</p> <p class="text-2xl font-bold text-slate-900">${escape_html(resumoVendedores.length)}</p></div></button>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Card($$renderer3, {
          header: "Filtros",
          color: "financeiro",
          class: "mb-6",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="flex flex-wrap gap-4 items-end"><div><label class="block text-sm font-medium text-slate-700 mb-1">Status</label>`);
            $$renderer4.select({ value: filtroStatus, class: "vtur-input" }, ($$renderer5) => {
              $$renderer5.option({ value: "todas" }, ($$renderer6) => {
                $$renderer6.push(`Todas`);
              });
              $$renderer5.option({ value: "pendente" }, ($$renderer6) => {
                $$renderer6.push(`Pendentes`);
              });
              $$renderer5.option({ value: "pago" }, ($$renderer6) => {
                $$renderer6.push(`Pagas`);
              });
            });
            $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label>`);
            $$renderer4.select({ value: filtroVendedor, class: "vtur-input" }, ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Todos`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(vendedores);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let v = each_array[$$index];
                $$renderer5.option({ value: v.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(v.nome_completo || v.email)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            });
            $$renderer4.push(`</div> `);
            Button($$renderer4, {
              variant: "secondary",
              children: ($$renderer5) => {
                Clock($$renderer5, { size: 16, class: "mr-2" });
                $$renderer5.push(`<!---->Atualizar`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            Button($$renderer4, {
              variant: "secondary",
              children: ($$renderer5) => {
                Download($$renderer5, { size: 16, class: "mr-2" });
                $$renderer5.push(`<!---->Exportar`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div> <div class="mt-4 flex flex-wrap items-center gap-2"><button type="button"${attr_class(`rounded-full border px-4 py-2 text-sm font-medium ${"border-slate-200 bg-white text-slate-700"}`)}>`);
            {
              $$renderer4.push("<!--[-1-->");
              $$renderer4.push(`Ver backlog de comissões (${escape_html(pendentes.length)})`);
            }
            $$renderer4.push(`<!--]--></button> `);
            {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        KPIGrid($$renderer3, {
          className: "mb-6",
          columns: 5,
          children: ($$renderer4) => {
            KPICard($$renderer4, {
              title: "Pendentes",
              value: pendentes.length,
              color: "financeiro",
              icon: Clock
            });
            $$renderer4.push(`<!----> `);
            KPICard($$renderer4, {
              title: "Total pago",
              value: formatCurrency(totalPago),
              color: "operacao",
              icon: Circle_check_big
            });
            $$renderer4.push(`<!----> `);
            KPICard($$renderer4, {
              title: "Total em comissões",
              value: comissoes.length,
              color: "financeiro",
              icon: Dollar_sign
            });
            $$renderer4.push(`<!----> `);
            KPICard($$renderer4, {
              title: "Vendedores",
              value: resumoVendedores.length,
              color: "clientes",
              icon: Users
            });
            $$renderer4.push(`<!----> `);
            KPICard($$renderer4, {
              title: "Backlog",
              value: pendentes.length,
              color: "slate",
              icon: Circle_alert
            });
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> <div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">A tela de comissões agora funciona também como fila operacional: <strong>${escape_html(pendentes.length)}</strong> pendências de pagamento somando <strong>${escape_html(formatCurrency(totalPendente))}</strong>.</div> `);
        if (resumoVendedores.length > 0) {
          $$renderer3.push("<!--[0-->");
          Card($$renderer3, {
            header: "Resumo por Vendedor",
            color: "financeiro",
            class: "mb-6",
            children: ($$renderer4) => {
              $$renderer4.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><!--[-->`);
              const each_array_1 = ensure_array_like(resumoVendedores);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let dados = each_array_1[$$index_1];
                $$renderer4.push(`<div class="p-4 bg-slate-50 rounded-lg"><p class="font-medium text-slate-900 truncate"${attr("title", dados.vendedor_nome)}>${escape_html(dados.vendedor_nome)}</p><div class="mt-2 space-y-1 text-sm"><div class="flex justify-between"><span class="text-slate-500">Vendas:</span><span class="font-medium">${escape_html(dados.total_vendas)}</span></div><div class="flex justify-between"><span class="text-slate-500">Comissão:</span><span class="font-medium">${escape_html(formatCurrency(dados.total_comissao))}</span></div><div class="flex justify-between"><span class="text-slate-500">Pago:</span><span class="font-medium text-green-600">${escape_html(formatCurrency(dados.total_pago))}</span></div><div class="flex justify-between"><span class="text-slate-500">Pendente:</span><span class="font-medium text-amber-600">${escape_html(formatCurrency(dados.total_pendente))}</span></div></div></div>`);
              }
              $$renderer4.push(`<!--]--></div>`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        if (comissoesSelecionadas.length > 0) {
          $$renderer3.push("<!--[0-->");
          Card($$renderer3, {
            header: "Pagamento em Lote",
            color: "financeiro",
            class: "mb-6",
            children: ($$renderer4) => {
              $$renderer4.push(`<div class="flex items-center justify-between"><div><p class="text-sm text-slate-600"><strong>${escape_html(comissoesSelecionadas.length)}</strong> comissões selecionadas</p><p class="text-lg font-semibold text-financeiro-600">${escape_html(formatCurrency(valorSelecionado))}</p></div>`);
              Button($$renderer4, {
                variant: "primary",
                color: "financeiro",
                children: ($$renderer5) => {
                  Circle_check_big($$renderer5, { size: 16, class: "mr-2" });
                  $$renderer5.push(`<!---->Pagar Selecionadas`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----></div>`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        DataTable($$renderer3, {
          columns,
          data: comissoesVisiveis,
          color: "financeiro",
          loading,
          title: "Comissões",
          searchable: true,
          filterable: false,
          exportable: false,
          selectable: filtroStatus !== "pago",
          onSelectionChange,
          emptyMessage: "Nenhuma comissão encontrada",
          $$slots: {
            actions: ($$renderer4, { row }) => {
              {
                $$renderer4.push(`<div class="flex items-center gap-1">`);
                Button($$renderer4, {
                  variant: "ghost",
                  size: "sm",
                  children: ($$renderer5) => {
                    File_text($$renderer5, { size: 16 });
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!---->`);
                if (row.status === "pendente") {
                  $$renderer4.push("<!--[0-->");
                  Button($$renderer4, {
                    variant: "primary",
                    color: "financeiro",
                    size: "sm",
                    children: ($$renderer5) => {
                      $$renderer5.push(`<!---->Pagar`);
                    },
                    $$slots: { default: true }
                  });
                } else {
                  $$renderer4.push("<!--[-1-->");
                }
                $$renderer4.push(`<!--]--></div>`);
              }
            }
          }
        });
        $$renderer3.push(`<!---->`);
      }
      $$renderer3.push(`<!--]--> `);
      Dialog($$renderer3, {
        title: "Confirmar Pagamento",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Confirmar Pagamento",
        onConfirm: handleConfirmarPagamento,
        get open() {
          return showPagamentoDialog;
        },
        set open($$value) {
          showPagamentoDialog = $$value;
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
        title: "Pagamento em Lote",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: `Pagar ${comissoesSelecionadas.length} Comissões`,
        onConfirm: handlePagamentoMultiplo,
        get open() {
          return showPagamentoMultiploDialog;
        },
        set open($$value) {
          showPagamentoMultiploDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4"><div class="p-4 bg-blue-50 rounded-lg"><p class="font-medium text-blue-900">Resumo do Pagamento</p><div class="mt-2 space-y-1 text-sm"><div class="flex justify-between"><span class="text-blue-700">Comissões selecionadas:</span><span class="font-medium">${escape_html(comissoesSelecionadas.length)}</span></div><div class="flex justify-between"><span class="text-blue-700">Valor total:</span><span class="font-medium text-lg">${escape_html(formatCurrency(valorSelecionado))}</span></div></div></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Data do Pagamento</label><input type="date"${attr("value", dataPagamento)} class="vtur-input w-full"/></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Observações</label><textarea rows="2" class="vtur-input w-full" placeholder="Observações para todos os pagamentos...">`);
          const $$body_1 = escape_html(observacoesPagamento);
          if ($$body_1) {
            $$renderer4.push(`${$$body_1}`);
          }
          $$renderer4.push(`</textarea></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Detalhes da Comissão",
        color: "financeiro",
        showCancel: true,
        cancelText: "Fechar",
        showConfirm: false,
        get open() {
          return showDetalhesDialog;
        },
        set open($$value) {
          showDetalhesDialog = $$value;
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
