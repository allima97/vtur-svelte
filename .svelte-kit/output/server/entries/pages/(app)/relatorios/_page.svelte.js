import { c as sanitize_props, o as spread_props, k as slot, h as head, t as ensure_array_like, e as escape_html, q as attr } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../chunks/Card.js";
import { B as Button } from "../../../../chunks/Button2.js";
import { C as ChartJS } from "../../../../chunks/ChartJS.js";
import "../../../../chunks/ui.js";
import { F as Funnel } from "../../../../chunks/funnel.js";
import { S as Shopping_cart } from "../../../../chunks/shopping-cart.js";
import { M as Map_pin } from "../../../../chunks/map-pin.js";
import { I as Icon } from "../../../../chunks/Icon.js";
import { U as Users } from "../../../../chunks/users.js";
import { T as Trending_up } from "../../../../chunks/trending-up.js";
import { A as Arrow_right } from "../../../../chunks/arrow-right.js";
function Chart_pie($$renderer, $$props) {
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
    [
      "path",
      {
        "d": "M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"
      }
    ],
    ["path", { "d": "M21.21 15.89A10 10 0 1 1 8 2.83" }]
  ];
  Icon($$renderer, spread_props([
    { name: "chart-pie" },
    $$sanitized_props,
    {
      /**
       * @component @name ChartPie
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEgMTJjLjU1MiAwIDEuMDA1LS40NDkuOTUtLjk5OGExMCAxMCAwIDAgMC04Ljk1My04Ljk1MWMtLjU1LS4wNTUtLjk5OC4zOTgtLjk5OC45NXY4YTEgMSAwIDAgMCAxIDF6IiAvPgogIDxwYXRoIGQ9Ik0yMS4yMSAxNS44OUExMCAxMCAwIDEgMSA4IDIuODMiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/chart-pie
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
    let metaTotal, atingimento, kpis, vendasPorMesData, vendasPorDestinoData;
    const relatorios = [
      {
        titulo: "Vendas detalhado",
        descricao: "Drill-down operacional com leitura por venda, cliente, destino, valor e comissão.",
        icone: Shopping_cart,
        rota: "/relatorios/vendas",
        stats: (dashboard2) => `${dashboard2.vendasAgg.qtdVendas} venda(s)`
      },
      {
        titulo: "Vendas por destino",
        descricao: "Participação por destino com caminho direto para o relatório detalhado.",
        icone: Map_pin,
        rota: "/relatorios/destinos",
        stats: (dashboard2) => `${dashboard2.vendasAgg.topDestinos.length} destinos no topo`
      },
      {
        titulo: "Vendas por produto",
        descricao: "Leitura por produto, receita, margem e contribuição no período.",
        icone: Chart_pie,
        rota: "/relatorios/produtos",
        stats: (dashboard2) => `${dashboard2.vendasAgg.porProduto.length} produtos em destaque`
      },
      {
        titulo: "Vendas por cliente",
        descricao: "Carteira, recorrência e ticket médio com vínculo ao cadastro do cliente.",
        icone: Users,
        rota: "/relatorios/clientes",
        stats: (dashboard2) => `${dashboard2.orcamentos.length} orçamentos recentes relacionados`
      },
      {
        titulo: "Ranking de vendas",
        descricao: "Comparativo por responsável com meta, conversão, comissão e tendência.",
        icone: Trending_up,
        rota: "/relatorios/ranking",
        stats: (dashboard2) => `${formatCurrency(dashboard2.vendasAgg.totalTaxas)} em comissões`
      }
    ];
    function getCurrentMonthRange() {
      const now = /* @__PURE__ */ new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        inicio: start.toISOString().slice(0, 10),
        fim: now.toISOString().slice(0, 10)
      };
    }
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    function formatDate(value) {
      if (!value) return "-";
      return new Date(value).toLocaleDateString("pt-BR");
    }
    const currentMonth = getCurrentMonthRange();
    let dashboard = {
      inicio: currentMonth.inicio,
      fim: currentMonth.fim,
      vendasAgg: {
        totalVendas: 0,
        totalTaxas: 0,
        totalLiquido: 0,
        totalSeguro: 0,
        qtdVendas: 0,
        ticketMedio: 0,
        timeline: [],
        topDestinos: [],
        porProduto: []
      },
      metas: [],
      orcamentos: []
    };
    let empresas = [];
    let vendedores = [];
    let periodoInicio = currentMonth.inicio;
    let periodoFim = currentMonth.fim;
    let empresaSelecionada = "";
    let vendedorSelecionado = "";
    metaTotal = dashboard.metas.reduce((sum, meta) => sum + Number(meta.meta_geral || 0), 0);
    atingimento = metaTotal > 0 ? dashboard.vendasAgg.totalVendas / metaTotal * 100 : 0;
    kpis = [
      {
        title: "Vendas no período",
        value: formatCurrency(dashboard.vendasAgg.totalVendas),
        subtext: `${dashboard.vendasAgg.qtdVendas} venda(s)`
      },
      {
        title: "Comissões / taxas",
        value: formatCurrency(dashboard.vendasAgg.totalTaxas),
        subtext: "Total calculado no período"
      },
      {
        title: "Ticket médio",
        value: formatCurrency(dashboard.vendasAgg.ticketMedio),
        subtext: "Média por venda"
      },
      {
        title: "Meta do período",
        value: formatCurrency(metaTotal),
        subtext: `${atingimento.toFixed(1)}% atingido`
      }
    ];
    vendasPorMesData = {
      labels: dashboard.vendasAgg.timeline.map((item) => formatDate(item.date)),
      datasets: [
        {
          label: "Receita",
          data: dashboard.vendasAgg.timeline.map((item) => item.value),
          backgroundColor: "#f97316",
          borderColor: "#ea580c",
          borderWidth: 2
        }
      ]
    };
    vendasPorDestinoData = {
      labels: dashboard.vendasAgg.topDestinos.map((item) => item.name),
      datasets: [
        {
          label: "Receita",
          data: dashboard.vendasAgg.topDestinos.map((item) => item.value),
          backgroundColor: [
            "#f97316",
            "#fb923c",
            "#fdba74",
            "#fed7aa",
            "#ffedd5",
            "#fff7ed"
          ]
        }
      ]
    };
    head("1mehn0k", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Relatórios | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Relatórios",
      subtitle: "Hub analítico com KPIs, gráficos e atalhos de drill-down para a operação real.",
      color: "financeiro",
      breadcrumbs: [{ label: "Relatórios" }]
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex flex-col lg:flex-row gap-4 items-end"><div class="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4"><div><label for="relatorios-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data início</label> <input id="relatorios-data-inicio" type="date"${attr("value", periodoInicio)} class="vtur-input w-full"/></div> <div><label for="relatorios-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data fim</label> <input id="relatorios-data-fim" type="date"${attr("value", periodoFim)} class="vtur-input w-full"/></div> <div><label for="relatorios-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label> `);
        $$renderer3.select(
          {
            id: "relatorios-empresa",
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
        $$renderer3.push(`</div> <div><label for="relatorios-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label> `);
        $$renderer3.select(
          {
            id: "relatorios-vendedor",
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
        $$renderer3.push(`</div> <div class="flex items-end">`);
        Button($$renderer3, {
          variant: "primary",
          color: "financeiro",
          class_name: "w-full",
          children: ($$renderer4) => {
            Funnel($$renderer4, { size: 16, class: "mr-2" });
            $$renderer4.push(`<!----> Atualizar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="vtur-kpi-grid mb-8"><!--[-->`);
    const each_array_2 = ensure_array_like(kpis);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let item = each_array_2[$$index_2];
      $$renderer2.push(`<div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div><p class="text-sm font-medium text-slate-500">${escape_html(item.title)}</p> <p class="text-2xl font-bold text-slate-900">${escape_html(item.value)}</p> <p class="mt-1 text-xs text-slate-400">${escape_html(item.subtext)}</p></div></div>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">`);
    Card($$renderer2, {
      header: "Evolução das vendas",
      color: "financeiro",
      children: ($$renderer3) => {
        ChartJS($$renderer3, { type: "bar", data: vendasPorMesData, height: 280 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Top destinos",
      color: "financeiro",
      children: ($$renderer3) => {
        ChartJS($$renderer3, { type: "doughnut", data: vendasPorDestinoData, height: 280 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> <h2 class="text-lg font-semibold text-slate-900 mb-4">Relatórios disponíveis</h2> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"><!--[-->`);
    const each_array_3 = ensure_array_like(relatorios);
    for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
      let relatorio = each_array_3[$$index_3];
      Card($$renderer2, {
        color: "financeiro",
        class: "group hover:shadow-lg transition-all duration-200",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="mb-4 flex items-start justify-between"><div class="rounded-lg bg-financeiro-50 p-3">`);
          if (relatorio.icone) {
            $$renderer3.push("<!--[-->");
            relatorio.icone($$renderer3, { size: 24, class: "text-financeiro-600" });
            $$renderer3.push("<!--]-->");
          } else {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push("<!--]-->");
          }
          $$renderer3.push(`</div> <span class="rounded-full bg-financeiro-50 px-2 py-1 text-xs font-medium text-financeiro-700">${escape_html(relatorio.stats(dashboard))}</span></div> <h3 class="text-lg font-semibold text-slate-900 mb-1">${escape_html(relatorio.titulo)}</h3> <p class="text-sm text-slate-500 mb-3">${escape_html(relatorio.descricao)}</p> <button class="inline-flex items-center gap-1 text-sm font-medium text-financeiro-600 hover:text-financeiro-700 transition-colors">Abrir relatório `);
          Arrow_right($$renderer3, {
            size: 16,
            class: "group-hover:translate-x-1 transition-transform"
          });
          $$renderer3.push(`<!----></button>`);
        },
        $$slots: { default: true }
      });
    }
    $$renderer2.push(`<!--]--></div> `);
    Card($$renderer2, {
      header: "Orçamentos recentes",
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="vtur-table__head"><tr><th class="px-4 py-3 text-left">Data</th><th class="px-4 py-3 text-left">Cliente</th><th class="px-4 py-3 text-left">Destino</th><th class="px-4 py-3 text-left">Status</th><th class="px-4 py-3 text-right">Valor</th></tr></thead><tbody class="vtur-table__body">`);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<tr><td colspan="5" class="px-4 py-10 text-center text-slate-500">Carregando relatórios...</td></tr>`);
        }
        $$renderer3.push(`<!--]--></tbody></table></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
