import { h as head, q as attr, t as ensure_array_like, e as escape_html } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { F as FilterPanel } from "../../../../../chunks/FilterPanel.js";
import { C as ChartJS } from "../../../../../chunks/ChartJS.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { F as Funnel } from "../../../../../chunks/funnel.js";
import { M as Map_pin } from "../../../../../chunks/map-pin.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let destinosOrdenados, destinosFiltrados, destinoTop, vendasPorDestinoData, vendasPorQuantidadeData;
    function getDefaultRange() {
      const today = /* @__PURE__ */ new Date();
      return {
        start: `${today.getFullYear()}-01-01`,
        end: today.toISOString().slice(0, 10)
      };
    }
    const defaultRange = getDefaultRange();
    let destinos = [];
    let empresas = [];
    let vendedores = [];
    let loading = true;
    let dataInicio = defaultRange.start;
    let dataFim = defaultRange.end;
    let empresaSelecionada = "";
    let vendedorSelecionado = "";
    let ordenacao = "receita";
    let recorte = "todos";
    const columns = [
      { key: "destino", label: "Destino", sortable: true },
      {
        key: "quantidade",
        label: "Vendas",
        sortable: true,
        align: "center",
        width: "100px"
      },
      {
        key: "receita",
        label: "Receita",
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
        key: "percentual",
        label: "Participacao",
        sortable: true,
        align: "center",
        width: "140px",
        formatter: (value) => `<div class="flex items-center gap-2"><div class="flex-1 h-2 bg-slate-200 rounded-full"><div class="h-2 bg-financeiro-500 rounded-full" style="width: ${Math.min(value, 100)}%"></div></div><span class="text-sm text-slate-600">${value.toFixed(1)}%</span></div>`
      }
    ];
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    function handleExport() {
      if (destinosFiltrados.length === 0) {
        toast.info("Não há dados para exportar");
        return;
      }
      const headers = [
        "Destino",
        "Vendas",
        "Receita",
        "Ticket Médio",
        "Participação"
      ];
      const rows = destinosFiltrados.map((destino) => [
        destino.destino,
        destino.quantidade,
        destino.receita.toFixed(2).replace(".", ","),
        destino.ticket_medio.toFixed(2).replace(".", ","),
        destino.percentual.toFixed(2).replace(".", ",")
      ]);
      const csv = [
        "\uFEFF" + headers.join(";"),
        ...rows.map((row) => row.join(";"))
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_destinos_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
      link.click();
      toast.success("Relatório exportado com sucesso");
    }
    function handleRowClick(row) {
      const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
        destino: row.destino
      });
      void goto(`/relatorios/vendas?${params.toString()}`);
    }
    destinosOrdenados = [...destinos].sort((left, right) => {
      return right.receita - left.receita;
    });
    destinosFiltrados = /* @__PURE__ */ (() => {
      return destinosOrdenados;
    })();
    destinosFiltrados.reduce((acc, destino) => acc + destino.receita, 0);
    destinosFiltrados.reduce((acc, destino) => acc + destino.quantidade, 0);
    destinoTop = destinosFiltrados.length > 0 ? destinosFiltrados[0] : null;
    vendasPorDestinoData = {
      labels: destinosFiltrados.slice(0, 10).map((destino) => destino.destino.split(" - ")[0]),
      datasets: [
        {
          label: "Receita",
          data: destinosFiltrados.slice(0, 10).map((destino) => destino.receita),
          backgroundColor: [
            "#f97316",
            "#fb923c",
            "#fdba74",
            "#fed7aa",
            "#ffedd5",
            "#cbd5e1"
          ]
        }
      ]
    };
    vendasPorQuantidadeData = {
      labels: destinosFiltrados.slice(0, 5).map((destino) => destino.destino.split(" - ")[0]),
      datasets: [
        {
          label: "Quantidade de Vendas",
          data: destinosFiltrados.slice(0, 5).map((destino) => destino.quantidade),
          backgroundColor: "#f97316"
        }
      ]
    };
    head("1oekclm", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Vendas por Destino | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Vendas por Destino",
      subtitle: "Analise de vendas por destino turistico",
      color: "financeiro",
      breadcrumbs: [
        { label: "Relatorios", href: "/relatorios" },
        { label: "Destinos" }
      ]
    });
    $$renderer2.push(`<!----> `);
    FilterPanel($$renderer2, {
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<div><label for="rel-destinos-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data Inicio</label> <input id="rel-destinos-data-inicio" type="date"${attr("value", dataInicio)} class="vtur-input w-full"/></div> <div><label for="rel-destinos-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data Fim</label> <input id="rel-destinos-data-fim" type="date"${attr("value", dataFim)} class="vtur-input w-full"/></div> <div><label for="rel-destinos-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label> `);
        $$renderer3.select(
          {
            id: "rel-destinos-empresa",
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
        $$renderer3.push(`</div> <div><label for="rel-destinos-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label> `);
        $$renderer3.select(
          {
            id: "rel-destinos-vendedor",
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
        $$renderer3.push(`</div> <div><label for="rel-destinos-ordenacao" class="block text-sm font-medium text-slate-700 mb-1">Ordenar Por</label> `);
        $$renderer3.select(
          {
            id: "rel-destinos-ordenacao",
            value: ordenacao,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "receita" }, ($$renderer5) => {
              $$renderer5.push(`Receita`);
            });
            $$renderer4.option({ value: "quantidade" }, ($$renderer5) => {
              $$renderer5.push(`Quantidade`);
            });
            $$renderer4.option({ value: "ticket_medio" }, ($$renderer5) => {
              $$renderer5.push(`Ticket Medio`);
            });
          }
        );
        $$renderer3.push(`</div> <div><label for="rel-destinos-recorte" class="block text-sm font-medium text-slate-700 mb-1">Recorte</label> `);
        $$renderer3.select(
          {
            id: "rel-destinos-recorte",
            value: recorte,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "todos" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.option({ value: "top5" }, ($$renderer5) => {
              $$renderer5.push(`Top 5`);
            });
            $$renderer4.option({ value: "top10" }, ($$renderer5) => {
              $$renderer5.push(`Top 10`);
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
    $$renderer2.push(`<!----> `);
    if (destinoTop) {
      $$renderer2.push("<!--[0-->");
      Card($$renderer2, {
        color: "financeiro",
        class: "mb-6",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="flex items-center gap-4"><div class="p-4 bg-financeiro-100 rounded-full">`);
          Map_pin($$renderer3, { size: 32, class: "text-financeiro-600" });
          $$renderer3.push(`<!----></div> <div class="flex-1"><h3 class="text-lg font-semibold text-slate-900">Destino em Destaque</h3> <p class="text-2xl font-bold text-financeiro-600">${escape_html(destinoTop.destino)}</p> <div class="flex gap-6 mt-2 text-sm"><span class="text-slate-500">${escape_html(destinoTop.quantidade)} vendas</span> <span class="text-slate-500">${escape_html(formatCurrency(destinoTop.receita))} em receita</span> <span class="text-slate-500">${escape_html(destinoTop.percentual.toFixed(1))}% do total</span></div></div></div>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">`);
    Card($$renderer2, {
      header: "Receita por Destino",
      color: "financeiro",
      children: ($$renderer3) => {
        ChartJS($$renderer3, { type: "doughnut", data: vendasPorDestinoData, height: 280 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Top Destinos (Quantidade)",
      color: "financeiro",
      children: ($$renderer3) => {
        ChartJS($$renderer3, { type: "bar", data: vendasPorQuantidadeData, height: 280 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    DataTable($$renderer2, {
      columns,
      data: destinosFiltrados,
      color: "financeiro",
      loading,
      title: "Detalhamento por Destino",
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
