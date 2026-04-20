import { h as head, e as escape_html, q as attr, t as ensure_array_like } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { F as FilterPanel } from "../../../../../chunks/FilterPanel.js";
import { C as ChartJS } from "../../../../../chunks/ChartJS.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { U as Users } from "../../../../../chunks/users.js";
import { W as Wallet } from "../../../../../chunks/wallet.js";
import { T as Trending_up } from "../../../../../chunks/trending-up.js";
import { S as Star } from "../../../../../chunks/star.js";
import { F as Funnel } from "../../../../../chunks/funnel.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let clientesFiltrados, totalClientes, totalGasto, ticketMedioGeral, clientesVIP, categoriasData, gastoPorClienteData;
    function getDefaultRange() {
      const today = /* @__PURE__ */ new Date();
      return {
        start: `${today.getFullYear()}-01-01`,
        end: today.toISOString().slice(0, 10)
      };
    }
    const defaultRange = getDefaultRange();
    let clientes = [];
    let empresas = [];
    let vendedores = [];
    let loading = true;
    let dataInicio = defaultRange.start;
    let dataFim = defaultRange.end;
    let empresaSelecionada = "";
    let vendedorSelecionado = "";
    let categoriaSelecionada = "";
    let ordenacao = "total_gasto";
    const columns = [
      { key: "cliente", label: "Cliente", sortable: true },
      { key: "cpf", label: "CPF", sortable: false, width: "130px" },
      {
        key: "categoria",
        label: "Categoria",
        sortable: true,
        width: "110px",
        formatter: (value) => getCategoriaBadge(value)
      },
      {
        key: "total_compras",
        label: "Compras",
        sortable: true,
        align: "center",
        width: "90px"
      },
      {
        key: "total_gasto",
        label: "Total Gasto",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "ticket_medio",
        label: "Ticket Medio",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "frequencia",
        label: "Freq./Mes",
        sortable: true,
        align: "center",
        width: "100px",
        formatter: (value) => value.toFixed(1)
      },
      {
        key: "ultima_compra",
        label: "Ultima Compra",
        sortable: true,
        width: "130px",
        formatter: (value) => value ? new Date(value).toLocaleDateString("pt-BR") : "-"
      }
    ];
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    function getCategoriaBadge(categoria) {
      const styles = {
        VIP: "bg-financeiro-500 text-white",
        Regular: "bg-financeiro-100 text-financeiro-700",
        Ocasional: "bg-slate-100 text-slate-700"
      };
      return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[categoria] || "bg-slate-100 text-slate-700"}">${categoria}</span>`;
    }
    function handleExport() {
      if (clientesFiltrados.length === 0) {
        toast.info("Não há dados para exportar");
        return;
      }
      const headers = [
        "Cliente",
        "Categoria",
        "Compras",
        "Total Gasto",
        "Ticket Médio",
        "Frequência",
        "Última Compra"
      ];
      const rows = clientesFiltrados.map((cliente) => [
        cliente.cliente,
        cliente.categoria,
        cliente.total_compras,
        cliente.total_gasto.toFixed(2).replace(".", ","),
        cliente.ticket_medio.toFixed(2).replace(".", ","),
        cliente.frequencia.toFixed(2).replace(".", ","),
        cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleDateString("pt-BR") : ""
      ]);
      const csv = [
        "\uFEFF" + headers.join(";"),
        ...rows.map((row) => row.join(";"))
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_clientes_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
      link.click();
      toast.success("Relatório exportado com sucesso");
    }
    function handleRowClick(row) {
      if (row.cliente_id) {
        void goto(`/clientes/${row.cliente_id}`);
      }
    }
    clientesFiltrados = clientes.filter((cliente) => !categoriaSelecionada).sort((left, right) => {
      return right.total_gasto - left.total_gasto;
    });
    totalClientes = clientesFiltrados.length;
    totalGasto = clientesFiltrados.reduce((acc, cliente) => acc + cliente.total_gasto, 0);
    ticketMedioGeral = totalClientes > 0 ? totalGasto / totalClientes : 0;
    clientesVIP = clientesFiltrados.filter((cliente) => cliente.categoria === "VIP").length;
    categoriasData = {
      labels: ["VIP", "Regular", "Ocasional"],
      datasets: [
        {
          label: "Clientes",
          data: [
            clientesFiltrados.filter((cliente) => cliente.categoria === "VIP").length,
            clientesFiltrados.filter((cliente) => cliente.categoria === "Regular").length,
            clientesFiltrados.filter((cliente) => cliente.categoria === "Ocasional").length
          ],
          backgroundColor: ["#f97316", "#fb923c", "#cbd5e1"]
        }
      ]
    };
    gastoPorClienteData = {
      labels: clientesFiltrados.slice(0, 5).map((cliente) => cliente.cliente.split(" ")[0]),
      datasets: [
        {
          label: "Total Gasto",
          data: clientesFiltrados.slice(0, 5).map((cliente) => cliente.total_gasto),
          backgroundColor: "#f97316"
        }
      ]
    };
    head("a32u20", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Vendas por Cliente | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Vendas por Cliente",
      subtitle: "Analise de clientes e historico de compras",
      color: "financeiro",
      breadcrumbs: [
        { label: "Relatorios", href: "/relatorios" },
        { label: "Clientes" }
      ]
    });
    $$renderer2.push(`<!----> `);
    FilterPanel($$renderer2, {
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<div><label for="rel-clientes-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data Inicio</label> <input id="rel-clientes-data-inicio" type="date"${attr("value", dataInicio)} class="vtur-input w-full"/></div> <div><label for="rel-clientes-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data Fim</label> <input id="rel-clientes-data-fim" type="date"${attr("value", dataFim)} class="vtur-input w-full"/></div> <div><label for="rel-clientes-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label> `);
        $$renderer3.select(
          {
            id: "rel-clientes-empresa",
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
        $$renderer3.push(`</div> <div><label for="rel-clientes-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label> `);
        $$renderer3.select(
          {
            id: "rel-clientes-vendedor",
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
        $$renderer3.push(`</div> <div><label for="rel-clientes-categoria" class="block text-sm font-medium text-slate-700 mb-1">Categoria</label> `);
        $$renderer3.select(
          {
            id: "rel-clientes-categoria",
            value: categoriaSelecionada,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todas`);
            });
            $$renderer4.option({ value: "VIP" }, ($$renderer5) => {
              $$renderer5.push(`VIP`);
            });
            $$renderer4.option({ value: "Regular" }, ($$renderer5) => {
              $$renderer5.push(`Regular`);
            });
            $$renderer4.option({ value: "Ocasional" }, ($$renderer5) => {
              $$renderer5.push(`Ocasional`);
            });
          }
        );
        $$renderer3.push(`</div> <div><label for="rel-clientes-ordenacao" class="block text-sm font-medium text-slate-700 mb-1">Ordenar Por</label> `);
        $$renderer3.select(
          {
            id: "rel-clientes-ordenacao",
            value: ordenacao,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "total_gasto" }, ($$renderer5) => {
              $$renderer5.push(`Total Gasto`);
            });
            $$renderer4.option({ value: "total_compras" }, ($$renderer5) => {
              $$renderer5.push(`Quantidade`);
            });
            $$renderer4.option({ value: "ticket_medio" }, ($$renderer5) => {
              $$renderer5.push(`Ticket Medio`);
            });
            $$renderer4.option({ value: "ultima_compra" }, ($$renderer5) => {
              $$renderer5.push(`Ultima Compra`);
            });
          }
        );
        $$renderer3.push(`</div>`);
      },
      $$slots: {
        default: true,
        actions: ($$renderer3) => {
          {
            Button($$renderer3, {
              variant: "primary",
              color: "financeiro",
              children: ($$renderer4) => {
                Funnel($$renderer4, { size: 16, class: "mr-2" });
                $$renderer4.push(`<!----> Gerar`);
              },
              $$slots: { default: true }
            });
          }
        }
      }
    });
    $$renderer2.push(`<!----> <div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
    Users($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total de Clientes</p><p class="text-2xl font-bold text-slate-900">${escape_html(totalClientes)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
    Wallet($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Receita Total</p><p class="text-2xl font-bold text-slate-900">${escape_html(formatCurrency(totalGasto))}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
    Trending_up($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Ticket Médio</p><p class="text-2xl font-bold text-slate-900">${escape_html(formatCurrency(ticketMedioGeral))}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-violet-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">`);
    Star($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Clientes VIP</p><p class="text-2xl font-bold text-slate-900">${escape_html(clientesVIP)}</p></div></div></div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">`);
    Card($$renderer2, {
      header: "Clientes por Categoria",
      color: "financeiro",
      children: ($$renderer3) => {
        ChartJS($$renderer3, { type: "doughnut", data: categoriasData, height: 250 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Top 5 Clientes (Gasto)",
      color: "financeiro",
      children: ($$renderer3) => {
        ChartJS($$renderer3, { type: "bar", data: gastoPorClienteData, height: 250 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    DataTable($$renderer2, {
      columns,
      data: clientesFiltrados,
      color: "financeiro",
      loading,
      title: "Detalhamento por Cliente",
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
