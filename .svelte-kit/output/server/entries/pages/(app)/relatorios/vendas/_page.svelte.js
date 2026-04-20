import { h as head, q as attr, t as ensure_array_like, e as escape_html } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { C as ChartJS } from "../../../../../chunks/ChartJS.js";
import { K as KPICard } from "../../../../../chunks/KPICard.js";
import { K as KPIGrid } from "../../../../../chunks/KPIGrid.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { F as Funnel } from "../../../../../chunks/funnel.js";
import { S as Shopping_cart } from "../../../../../chunks/shopping-cart.js";
import { D as Dollar_sign } from "../../../../../chunks/dollar-sign.js";
import { T as Trending_up } from "../../../../../chunks/trending-up.js";
import { U as Users } from "../../../../../chunks/users.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let vendasFiltradas, totalVendas, vendasPorMesData;
    function getDefaultRange() {
      const today = /* @__PURE__ */ new Date();
      return {
        start: `${today.getFullYear()}-01-01`,
        end: today.toISOString().slice(0, 10)
      };
    }
    function formatMonthLabel(monthKey) {
      const [year, month] = monthKey.split("-").map(Number);
      return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1));
    }
    const defaultRange = getDefaultRange();
    let vendas = [];
    let vendedores = [];
    let empresas = [];
    let resumo = {
      total_vendas: 0,
      vendas_canceladas: 0,
      total_valor: 0,
      total_comissao: 0,
      ticket_medio: 0
    };
    let loading = true;
    let dataInicio = defaultRange.start;
    let dataFim = defaultRange.end;
    let vendedorSelecionado = "";
    let empresaSelecionada = "";
    let statusSelecionado = "";
    const columns = [
      {
        key: "codigo",
        label: "Código",
        sortable: true,
        width: "120px"
      },
      {
        key: "data_venda",
        label: "Data",
        sortable: true,
        width: "100px",
        formatter: (value) => value ? new Date(value).toLocaleDateString("pt-BR") : "-"
      },
      { key: "cliente_nome", label: "Cliente", sortable: true },
      {
        key: "vendedor_nome",
        label: "Vendedor",
        sortable: true,
        width: "160px"
      },
      { key: "destino_nome", label: "Destino", sortable: true },
      { key: "destino_cidade_nome", label: "Cidade", sortable: true },
      {
        key: "valor_total",
        label: "Valor",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "valor_taxas",
        label: "Taxas",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "comissao",
        label: "Comissão",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "120px",
        formatter: (value) => getStatusBadge(value)
      },
      {
        key: "forma_pagamento",
        label: "Pagamento",
        sortable: true,
        width: "140px"
      }
    ];
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    function getStatusBadge(status) {
      const styles = {
        confirmada: "bg-green-100 text-green-700",
        pendente: "bg-amber-100 text-amber-700",
        concluida: "bg-blue-100 text-blue-700",
        cancelada: "bg-red-100 text-red-700"
      };
      const labels = {
        confirmada: "Confirmada",
        pendente: "Pendente",
        concluida: "Concluída",
        cancelada: "Cancelada"
      };
      return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status] || "bg-slate-100 text-slate-600"}">${labels[status] || status}</span>`;
    }
    function handleExport() {
      if (vendas.length === 0) {
        toast.info("Não há vendas para exportar");
        return;
      }
      const headers = [
        "Código",
        "Data",
        "Cliente",
        "CPF",
        "Vendedor",
        "Destino",
        "Cidade",
        "Valor",
        "Taxas",
        "Comissão",
        "Status",
        "Pagamento"
      ];
      const rows = vendas.map((venda) => [
        venda.codigo,
        venda.data_venda ? new Date(venda.data_venda).toLocaleDateString("pt-BR") : "",
        venda.cliente_nome,
        venda.cliente_cpf || "",
        venda.vendedor_nome,
        venda.destino_nome,
        venda.destino_cidade_nome || "",
        venda.valor_total.toFixed(2).replace(".", ","),
        venda.valor_taxas.toFixed(2).replace(".", ","),
        venda.comissao.toFixed(2).replace(".", ","),
        venda.status,
        venda.forma_pagamento
      ]);
      const csv = [
        "\uFEFF" + headers.join(";"),
        ...rows.map((row) => row.join(";"))
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_vendas_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
      link.click();
      toast.success("Relatório exportado com sucesso");
    }
    function handleRowClick(row) {
      void goto(`/vendas/${row.id}`);
    }
    vendasFiltradas = vendas;
    totalVendas = vendasFiltradas.reduce((acc, venda) => acc + (venda.valor_total || 0), 0);
    vendasFiltradas.reduce((acc, venda) => acc + (venda.comissao || 0), 0);
    vendasFiltradas.length > 0 ? totalVendas / vendasFiltradas.length : 0;
    vendasPorMesData = (() => {
      const monthMap = /* @__PURE__ */ new Map();
      vendasFiltradas.forEach((venda) => {
        if (!venda.data_venda) return;
        const key = venda.data_venda.slice(0, 7);
        monthMap.set(key, (monthMap.get(key) || 0) + (venda.valor_total || 0));
      });
      const ordered = Array.from(monthMap.entries()).sort((left, right) => left[0].localeCompare(right[0]));
      return {
        labels: ordered.map(([key]) => formatMonthLabel(key)),
        datasets: [
          {
            label: "Receita",
            data: ordered.map(([, value]) => value),
            backgroundColor: "#f97316"
          }
        ]
      };
    })();
    head("1fg910s", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Relatório de Vendas | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Relatório de Vendas",
      subtitle: "Leitura detalhada das vendas com drill-down operacional por cliente, destino, produto e responsável.",
      color: "financeiro",
      breadcrumbs: [
        { label: "Relatórios", href: "/relatorios" },
        { label: "Vendas" }
      ]
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex flex-col gap-4"><div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6"><div><label for="rel-vendas-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data início</label> <input id="rel-vendas-data-inicio" type="date"${attr("value", dataInicio)} class="vtur-input w-full"/></div> <div><label for="rel-vendas-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data fim</label> <input id="rel-vendas-data-fim" type="date"${attr("value", dataFim)} class="vtur-input w-full"/></div> <div><label for="rel-vendas-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label> `);
        $$renderer3.select(
          {
            id: "rel-vendas-empresa",
            value: empresaSelecionada,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todas`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array = ensure_array_like(empresas);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let empresa = each_array[$$index];
              $$renderer4.option({ value: empresa.id }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(empresa.nome)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(`</div> <div><label for="rel-vendas-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label> `);
        $$renderer3.select(
          {
            id: "rel-vendas-vendedor",
            value: vendedorSelecionado,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(vendedores);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let vendedor = each_array_1[$$index_1];
              $$renderer4.option({ value: vendedor.id }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(vendedor.nome)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(`</div> <div><label for="rel-vendas-status" class="block text-sm font-medium text-slate-700 mb-1">Status</label> `);
        $$renderer3.select(
          {
            id: "rel-vendas-status",
            value: statusSelecionado,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.option({ value: "confirmada" }, ($$renderer5) => {
              $$renderer5.push(`Confirmada`);
            });
            $$renderer4.option({ value: "pendente" }, ($$renderer5) => {
              $$renderer5.push(`Pendente`);
            });
            $$renderer4.option({ value: "concluida" }, ($$renderer5) => {
              $$renderer5.push(`Concluída`);
            });
            $$renderer4.option({ value: "cancelada" }, ($$renderer5) => {
              $$renderer5.push(`Cancelada`);
            });
          }
        );
        $$renderer3.push(`</div> <div class="flex items-end">`);
        Button($$renderer3, {
          variant: "primary",
          color: "financeiro",
          class_name: "w-full",
          children: ($$renderer4) => {
            Funnel($$renderer4, { size: 16, class: "mr-2" });
            $$renderer4.push(`<!----> Aplicar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div></div> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    KPIGrid($$renderer2, {
      className: "mb-6",
      columns: 5,
      children: ($$renderer3) => {
        KPICard($$renderer3, {
          title: "Total vendas",
          value: resumo.total_vendas,
          color: "financeiro",
          icon: Shopping_cart
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Receita total",
          value: formatCurrency(resumo.total_valor),
          color: "financeiro",
          icon: Dollar_sign
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Comissões",
          value: formatCurrency(resumo.total_comissao),
          color: "financeiro",
          icon: Trending_up
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Ticket médio",
          value: formatCurrency(resumo.ticket_medio),
          color: "financeiro",
          icon: Trending_up
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Canceladas",
          value: resumo.vendas_canceladas,
          color: "financeiro",
          icon: Users
        });
        $$renderer3.push(`<!---->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">`);
    Card($$renderer2, {
      header: "Receita por mês",
      color: "financeiro",
      children: ($$renderer3) => {
        ChartJS($$renderer3, { type: "bar", data: vendasPorMesData, height: 280 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Leitura operacional",
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="space-y-4 text-sm text-slate-600"><p>O detalhamento abaixo usa o fluxo real de vendas do período, com vínculo para o registro de origem e filtros reaproveitados pelos relatórios de cliente, destino, produto e ranking.</p> <p>Clique em qualquer linha para abrir a venda. Quando você chega aqui por drill-down, o contexto é preservado na URL e no payload do backend.</p></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    DataTable($$renderer2, {
      columns,
      data: vendasFiltradas,
      color: "financeiro",
      loading,
      title: "Detalhamento de vendas",
      searchable: true,
      exportable: true,
      onExport: handleExport,
      onRowClick: handleRowClick
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
