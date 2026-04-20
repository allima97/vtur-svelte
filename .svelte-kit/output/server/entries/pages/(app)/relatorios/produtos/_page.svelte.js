import { c as sanitize_props, o as spread_props, k as slot, h as head, p as attr_class, e as escape_html, q as attr, t as ensure_array_like, v as stringify } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { F as FilterPanel } from "../../../../../chunks/FilterPanel.js";
import { C as ChartJS } from "../../../../../chunks/ChartJS.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { W as Wallet } from "../../../../../chunks/wallet.js";
import { T as Trending_up } from "../../../../../chunks/trending-up.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { T as Trophy } from "../../../../../chunks/trophy.js";
import { F as Funnel } from "../../../../../chunks/funnel.js";
function Chart_no_axes_column($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v1.0.1 - ISC
   *
   * ISC License
   *
   * Copyright (c) 2026 Lucide Icons and Contributors
   *
   * Permission to use, copy, modify, and/or distribute this software for any
   * purpose with or without fee is hereby granted, provided that the above
   * copyright notice and this permission notice appear in all copies.
   *
   * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
   * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
   * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
   * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
   * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
   * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
   * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * ---
   *
   * The following Lucide icons are derived from the Feather project:
   *
   * airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out
   *
   * The MIT License (MIT) (for the icons listed above)
   *
   * Copyright (c) 2013-present Cole Bemis
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in all
   * copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   * SOFTWARE.
   *
   */
  const iconNode = [
    ["path", { "d": "M5 21v-6" }],
    ["path", { "d": "M12 21V3" }],
    ["path", { "d": "M19 21V9" }]
  ];
  Icon($$renderer, spread_props([
    { name: "chart-no-axes-column" },
    $$sanitized_props,
    {
      /**
       * @component @name ChartNoAxesColumn
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAyMXYtNiIgLz4KICA8cGF0aCBkPSJNMTIgMjFWMyIgLz4KICA8cGF0aCBkPSJNMTkgMjFWOSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/chart-no-axes-column
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {}, null);
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let tiposDisponiveis, produtosFiltrados, totalReceita, totalLucro, margemMedia, produtoTop, receitaPorProdutoData, margemPorProdutoData;
    function getDefaultRange() {
      const today = /* @__PURE__ */ new Date();
      return {
        start: `${today.getFullYear()}-01-01`,
        end: today.toISOString().slice(0, 10)
      };
    }
    const defaultRange = getDefaultRange();
    let produtos = [];
    let empresas = [];
    let vendedores = [];
    let loading = true;
    let dataInicio = defaultRange.start;
    let dataFim = defaultRange.end;
    let empresaSelecionada = "";
    let vendedorSelecionado = "";
    let tipoSelecionado = "";
    let ordenacao = "receita";
    const columns = [
      { key: "produto", label: "Produto", sortable: true },
      {
        key: "tipo",
        label: "Tipo",
        sortable: true,
        width: "140px",
        formatter: (value) => `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-financeiro-50 text-financeiro-700">${value}</span>`
      },
      {
        key: "quantidade",
        label: "Qtd",
        sortable: true,
        align: "center",
        width: "80px"
      },
      {
        key: "receita",
        label: "Receita",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "lucro",
        label: "Lucro",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "margem",
        label: "Margem",
        sortable: true,
        align: "center",
        width: "100px",
        formatter: (value) => `<span class="font-medium ${value >= 30 ? "text-green-600" : value >= 20 ? "text-financeiro-600" : "text-amber-600"}">${value.toFixed(1)}%</span>`
      }
    ];
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    function handleExport() {
      if (produtosFiltrados.length === 0) {
        toast.info("Não há dados para exportar");
        return;
      }
      const headers = [
        "Produto",
        "Tipo",
        "Quantidade",
        "Receita",
        "Lucro",
        "Margem"
      ];
      const rows = produtosFiltrados.map((produto) => [
        produto.produto,
        produto.tipo,
        produto.quantidade,
        produto.receita.toFixed(2).replace(".", ","),
        produto.lucro.toFixed(2).replace(".", ","),
        produto.margem.toFixed(2).replace(".", ",")
      ]);
      const csv = [
        "\uFEFF" + headers.join(";"),
        ...rows.map((row) => row.join(";"))
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_produtos_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
      link.click();
      toast.success("Relatório exportado com sucesso");
    }
    function handleRowClick(row) {
      const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
        produto: row.produto,
        tipo_produto: row.tipo
      });
      void goto(`/relatorios/vendas?${params.toString()}`);
    }
    tiposDisponiveis = Array.from(new Set(produtos.map((produto) => produto.tipo))).sort((left, right) => left.localeCompare(right, "pt-BR"));
    produtosFiltrados = produtos.filter((produto) => !tipoSelecionado).sort((left, right) => {
      return right.receita - left.receita;
    });
    totalReceita = produtosFiltrados.reduce((acc, produto) => acc + produto.receita, 0);
    totalLucro = produtosFiltrados.reduce((acc, produto) => acc + produto.lucro, 0);
    margemMedia = totalReceita > 0 ? totalLucro / totalReceita * 100 : 0;
    produtoTop = produtosFiltrados.length > 0 ? produtosFiltrados[0] : null;
    receitaPorProdutoData = {
      labels: produtosFiltrados.slice(0, 8).map((produto) => produto.produto),
      datasets: [
        {
          label: "Receita",
          data: produtosFiltrados.slice(0, 8).map((produto) => produto.receita),
          backgroundColor: "#f97316"
        },
        {
          label: "Lucro",
          data: produtosFiltrados.slice(0, 8).map((produto) => produto.lucro),
          backgroundColor: "#22c55e"
        }
      ]
    };
    margemPorProdutoData = {
      labels: produtosFiltrados.slice(0, 8).map((produto) => produto.produto),
      datasets: [
        {
          label: "Margem %",
          data: produtosFiltrados.slice(0, 8).map((produto) => produto.margem),
          borderColor: "#f97316",
          backgroundColor: "rgba(249, 115, 22, 0.1)",
          type: "line",
          yAxisID: "y"
        },
        {
          label: "Quantidade",
          data: produtosFiltrados.slice(0, 8).map((produto) => produto.quantidade),
          backgroundColor: "#fdba74",
          type: "bar",
          yAxisID: "y1"
        }
      ]
    };
    head("4mcc31", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Vendas por Produto | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Vendas por Produto",
      subtitle: "Performance por tipo de produto",
      color: "financeiro",
      breadcrumbs: [
        { label: "Relatorios", href: "/relatorios" },
        { label: "Produtos" }
      ]
    });
    $$renderer2.push(`<!----> `);
    FilterPanel($$renderer2, {
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<div><label for="rel-produtos-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data Inicio</label> <input id="rel-produtos-data-inicio" type="date"${attr("value", dataInicio)} class="vtur-input w-full"/></div> <div><label for="rel-produtos-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data Fim</label> <input id="rel-produtos-data-fim" type="date"${attr("value", dataFim)} class="vtur-input w-full"/></div> <div><label for="rel-produtos-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label> `);
        $$renderer3.select(
          {
            id: "rel-produtos-empresa",
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
        $$renderer3.push(`</div> <div><label for="rel-produtos-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label> `);
        $$renderer3.select(
          {
            id: "rel-produtos-vendedor",
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
        $$renderer3.push(`</div> <div><label for="rel-produtos-tipo" class="block text-sm font-medium text-slate-700 mb-1">Tipo</label> `);
        $$renderer3.select(
          {
            id: "rel-produtos-tipo",
            value: tipoSelecionado,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array_2 = ensure_array_like(tiposDisponiveis);
            for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
              let tipo = each_array_2[$$index_2];
              $$renderer4.option({ value: tipo }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(tipo)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(`</div> <div><label for="rel-produtos-ordenacao" class="block text-sm font-medium text-slate-700 mb-1">Ordenar Por</label> `);
        $$renderer3.select(
          {
            id: "rel-produtos-ordenacao",
            value: ordenacao,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "receita" }, ($$renderer5) => {
              $$renderer5.push(`Receita`);
            });
            $$renderer4.option({ value: "lucro" }, ($$renderer5) => {
              $$renderer5.push(`Lucro`);
            });
            $$renderer4.option({ value: "margem" }, ($$renderer5) => {
              $$renderer5.push(`Margem`);
            });
            $$renderer4.option({ value: "quantidade" }, ($$renderer5) => {
              $$renderer5.push(`Quantidade`);
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
    $$renderer2.push(`<!----> <div${attr_class(`vtur-kpi-grid ${stringify(produtoTop ? "" : "vtur-kpi-grid-3")} mb-6`)}><div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
    Wallet($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Receita Total</p><p class="text-2xl font-bold text-slate-900">${escape_html(formatCurrency(totalReceita))}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
    Trending_up($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Lucro Total</p><p class="text-2xl font-bold text-slate-900">${escape_html(formatCurrency(totalLucro))}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
    Chart_no_axes_column($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Margem Média</p><p class="text-2xl font-bold text-slate-900">${escape_html(margemMedia.toFixed(1))}%</p></div></div> `);
    if (produtoTop) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="vtur-kpi-card border-t-[3px] border-t-amber-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">`);
      Trophy($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Produto Top</p> <p class="text-lg font-bold text-slate-900 truncate">${escape_html(produtoTop.produto)}</p></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">`);
    Card($$renderer2, {
      header: "Receita vs Lucro por Produto",
      color: "financeiro",
      children: ($$renderer3) => {
        ChartJS($$renderer3, { type: "bar", data: receitaPorProdutoData, height: 280 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Margem e Quantidade",
      color: "financeiro",
      children: ($$renderer3) => {
        ChartJS($$renderer3, { type: "bar", data: margemPorProdutoData, height: 280 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    DataTable($$renderer2, {
      columns,
      data: produtosFiltrados,
      color: "financeiro",
      loading,
      title: "Performance por Produto",
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
