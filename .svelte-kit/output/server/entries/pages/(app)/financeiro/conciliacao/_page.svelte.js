import { c as sanitize_props, o as spread_props, k as slot, h as head, q as attr, t as ensure_array_like, e as escape_html, p as attr_class, v as stringify } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { K as KPICard } from "../../../../../chunks/KPICard.js";
import "../../../../../chunks/ui.js";
import { C as Clock } from "../../../../../chunks/clock.js";
import { C as Circle_check_big } from "../../../../../chunks/circle-check-big.js";
import { C as Circle_alert } from "../../../../../chunks/circle-alert.js";
import { T as Trending_up } from "../../../../../chunks/trending-up.js";
import { S as Search } from "../../../../../chunks/search.js";
import { D as Download } from "../../../../../chunks/download.js";
import { C as Calendar } from "../../../../../chunks/calendar.js";
import { C as Credit_card } from "../../../../../chunks/credit-card.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { U as Upload } from "../../../../../chunks/upload.js";
function File_check($$renderer, $$props) {
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
        "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
      }
    ],
    ["path", { "d": "M14 2v5a1 1 0 0 0 1 1h5" }],
    ["path", { "d": "m9 15 2 2 4-4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "file-check" },
    $$sanitized_props,
    {
      /**
       * @component @name FileCheck
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNiAyMmEyIDIgMCAwIDEtMi0yVjRhMiAyIDAgMCAxIDItMmg4YTIuNCAyLjQgMCAwIDEgMS43MDQuNzA2bDMuNTg4IDMuNTg4QTIuNCAyLjQgMCAwIDEgMjAgOHYxMmEyIDIgMCAwIDEtMiAyeiIgLz4KICA8cGF0aCBkPSJNMTQgMnY1YTEgMSAwIDAgMCAxIDFoNSIgLz4KICA8cGF0aCBkPSJtOSAxNSAyIDIgNC00IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/file-check
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
    let pagamentosFiltrados, pendentes, conciliados, divergentes, totalPendente, totalConciliado, totalDivergente, backlogFinanceiro, totalBacklogFinanceiro, pagamentosVisiveis;
    let pagamentos = [];
    let vendas = [];
    let formasPagamento = [];
    let loading = true;
    let searchQuery = "";
    let filtroStatus = "todas";
    let filtroFormaPagamento = "todas";
    let dataInicio = "";
    let dataFim = "";
    let showConciliarDialog = false;
    let showUploadDialog = false;
    let showDetalheDialog = false;
    let pagamentoSelecionado = null;
    let vendaSelecionada = "";
    let processando = false;
    const columns = [
      {
        key: "codigo",
        label: "Código",
        sortable: true,
        width: "120px"
      },
      {
        key: "cliente",
        label: "Cliente / Descrição",
        sortable: true,
        formatter: (value, row) => {
          return `<div class="flex flex-col"><span class="font-medium text-slate-900">${value}</span><span class="text-xs text-slate-500">${row.descricao}</span></div>`;
        }
      },
      {
        key: "data_pagamento",
        label: "Data",
        sortable: true,
        width: "110px",
        formatter: (value) => new Date(value).toLocaleDateString("pt-BR")
      },
      {
        key: "forma_pagamento",
        label: "Forma",
        sortable: true,
        width: "140px"
      },
      {
        key: "valor",
        label: "Valor",
        sortable: true,
        width: "130px",
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "120px",
        formatter: (value) => getStatusHtml(value)
      }
    ];
    function getStatusHtml(status) {
      const styles = {
        conciliado: "bg-green-100 text-green-700",
        pendente: "bg-amber-100 text-amber-700",
        divergente: "bg-red-100 text-red-700",
        cancelado: "bg-slate-100 text-slate-600"
      };
      const labels = {
        conciliado: "Conciliado",
        pendente: "Pendente",
        divergente: "Divergente",
        cancelado: "Cancelado"
      };
      return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pendente}">${labels[status] || status}</span>`;
    }
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    }
    function abrirDetalhe(pagamento) {
      pagamentoSelecionado = pagamento;
      vendaSelecionada = pagamento.venda_id || "";
      showDetalheDialog = true;
    }
    async function handleUpload() {
      return;
    }
    pagamentosFiltrados = pagamentos;
    pendentes = pagamentos.filter((p) => p.status === "pendente");
    conciliados = pagamentos.filter((p) => p.status === "conciliado");
    divergentes = pagamentos.filter((p) => p.status === "divergente");
    totalPendente = pendentes.reduce((acc, p) => acc + p.valor, 0);
    totalConciliado = conciliados.reduce((acc, p) => acc + p.valor, 0);
    totalDivergente = divergentes.reduce((acc, p) => acc + p.valor, 0);
    backlogFinanceiro = pagamentos.filter((p) => p.status === "pendente" || p.status === "divergente");
    totalBacklogFinanceiro = backlogFinanceiro.reduce((acc, p) => acc + p.valor, 0);
    pagamentosVisiveis = pagamentosFiltrados.filter((p) => {
      return true;
    });
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("12zrs0y", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Conciliação | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Conciliação",
        subtitle: "Concilie pagamentos recebidos com vendas",
        color: "financeiro",
        breadcrumbs: [
          { label: "Financeiro", href: "/financeiro" },
          { label: "Conciliação" }
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid vtur-kpi-grid-5 mb-6">`);
      KPICard($$renderer3, {
        title: "Pendentes",
        value: pendentes.length,
        subtitle: formatCurrency(totalPendente),
        color: "financeiro",
        icon: Clock
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "Conciliados",
        value: conciliados.length,
        subtitle: formatCurrency(totalConciliado),
        color: "financeiro",
        icon: Circle_check_big
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "Divergentes",
        value: divergentes.length,
        subtitle: formatCurrency(totalDivergente),
        color: "financeiro",
        icon: Circle_alert
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "Backlog",
        value: backlogFinanceiro.length,
        subtitle: formatCurrency(totalBacklogFinanceiro),
        color: "financeiro",
        icon: Circle_alert
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "Total",
        value: pagamentos.length,
        subtitle: formatCurrency(pagamentos.reduce((acc, p) => acc + p.valor, 0)),
        color: "financeiro",
        icon: Trending_up
      });
      $$renderer3.push(`<!----></div> `);
      Card($$renderer3, {
        color: "financeiro",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="flex flex-col lg:flex-row gap-4 items-end"><div class="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"><div class="relative">`);
          Search($$renderer4, {
            size: 18,
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          });
          $$renderer4.push(`<!----> <input type="text" placeholder="Buscar pagamentos..."${attr("value", searchQuery)} class="vtur-input pl-10 w-full"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Status</label> `);
          $$renderer4.select({ value: filtroStatus, class: "vtur-input w-full" }, ($$renderer5) => {
            $$renderer5.option({ value: "todas" }, ($$renderer6) => {
              $$renderer6.push(`Todos`);
            });
            $$renderer5.option({ value: "pendente" }, ($$renderer6) => {
              $$renderer6.push(`Pendentes`);
            });
            $$renderer5.option({ value: "conciliado" }, ($$renderer6) => {
              $$renderer6.push(`Conciliados`);
            });
            $$renderer5.option({ value: "divergente" }, ($$renderer6) => {
              $$renderer6.push(`Divergentes`);
            });
            $$renderer5.option({ value: "cancelado" }, ($$renderer6) => {
              $$renderer6.push(`Cancelados`);
            });
          });
          $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label> `);
          $$renderer4.select({ value: filtroFormaPagamento, class: "vtur-input w-full" }, ($$renderer5) => {
            $$renderer5.option({ value: "todas" }, ($$renderer6) => {
              $$renderer6.push(`Todas`);
            });
            $$renderer5.push(`<!--[-->`);
            const each_array = ensure_array_like(formasPagamento);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let fp = each_array[$$index];
              $$renderer5.option({ value: fp.id }, ($$renderer6) => {
                $$renderer6.push(`${escape_html(fp.nome)}`);
              });
            }
            $$renderer5.push(`<!--]-->`);
          });
          $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Data Início</label> <input type="date"${attr("value", dataInicio)} class="vtur-input w-full"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Data Fim</label> <input type="date"${attr("value", dataFim)} class="vtur-input w-full"/></div></div> `);
          Button($$renderer4, {
            variant: "secondary",
            children: ($$renderer5) => {
              Download($$renderer5, { size: 18, class: "mr-2" });
              $$renderer5.push(`<!----> Exportar`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div> <div class="mt-4 flex flex-wrap items-center gap-2"><button type="button"${attr_class(`rounded-full border px-4 py-2 text-sm font-medium ${"border-slate-200 bg-white text-slate-700"}`)}>`);
          {
            $$renderer4.push("<!--[-1-->");
            $$renderer4.push(`Ver backlog financeiro (${escape_html(backlogFinanceiro.length)})`);
          }
          $$renderer4.push(`<!--]--></button> <button type="button"${attr_class(`rounded-full border px-4 py-2 text-sm font-medium ${"border-slate-200 bg-white text-slate-700"}`)}>`);
          {
            $$renderer4.push("<!--[-1-->");
            $$renderer4.push(`Ver pendentes (${escape_html(pendentes.length)})`);
          }
          $$renderer4.push(`<!--]--></button> <button type="button"${attr_class(`rounded-full border px-4 py-2 text-sm font-medium ${"border-slate-200 bg-white text-slate-700"}`)}>`);
          {
            $$renderer4.push("<!--[-1-->");
            $$renderer4.push(`Ver divergentes (${escape_html(divergentes.length)})`);
          }
          $$renderer4.push(`<!--]--></button> `);
          {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> <div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">A conciliação agora permite isolar rapidamente <strong>pendentes</strong>, <strong>divergentes</strong> e um <strong>backlog financeiro consolidado</strong>, acelerando a fila operacional do fechamento.</div> `);
      DataTable($$renderer3, {
        columns,
        data: pagamentosVisiveis,
        color: "financeiro",
        loading,
        title: "Pagamentos",
        emptyMessage: "Nenhum pagamento encontrado",
        onRowClick: abrirDetalhe
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Detalhes do Pagamento",
        color: "financeiro",
        showCancel: true,
        cancelText: "Fechar",
        showConfirm: false,
        get open() {
          return showDetalheDialog;
        },
        set open($$value) {
          showDetalheDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          if (pagamentoSelecionado) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="space-y-4"><div class="p-4 bg-slate-50 rounded-lg"><div class="flex justify-between items-start mb-2"><div><p class="text-sm text-slate-500">Código</p> <p class="font-semibold text-slate-900">${escape_html(pagamentoSelecionado.codigo)}</p></div> <p class="text-2xl font-bold text-financeiro-600">${escape_html(formatCurrency(pagamentoSelecionado.valor))}</p></div> <p class="text-slate-700">${escape_html(pagamentoSelecionado.cliente)}</p> <p class="text-sm text-slate-500">${escape_html(pagamentoSelecionado.descricao)}</p> <div class="flex items-center gap-4 mt-2 text-sm text-slate-500"><span class="flex items-center gap-1">`);
            Calendar($$renderer4, { size: 14 });
            $$renderer4.push(`<!---->${escape_html(new Date(pagamentoSelecionado.data_pagamento).toLocaleDateString("pt-BR"))}</span> <span class="flex items-center gap-1">`);
            Credit_card($$renderer4, { size: 14 });
            $$renderer4.push(`<!---->${escape_html(pagamentoSelecionado.forma_pagamento)}</span></div> <div class="mt-3"><span${attr_class(`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stringify(getStatusHtml(pagamentoSelecionado.status).split('"')[1])}`)}>${escape_html(pagamentoSelecionado.status === "conciliado" ? "Conciliado" : pagamentoSelecionado.status === "pendente" ? "Pendente" : pagamentoSelecionado.status === "divergente" ? "Divergente" : "Cancelado")}</span></div></div> `);
            if (pagamentoSelecionado.venda_codigo) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<div class="p-4 bg-green-50 rounded-lg border border-green-200"><p class="text-sm text-green-700 font-medium mb-1">Venda Vinculada</p> <p class="text-green-900">${escape_html(pagamentoSelecionado.venda_codigo)}</p></div>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            if (pagamentoSelecionado.comprovante) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<div class="p-4 bg-blue-50 rounded-lg border border-blue-200"><p class="text-sm text-blue-700 font-medium mb-2">Comprovante Anexado</p> <a${attr("href", pagamentoSelecionado.comprovante)} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">`);
              File_check($$renderer4, { size: 18 });
              $$renderer4.push(`<!---->Visualizar Comprovante</a></div>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> <div class="flex gap-3 pt-2">`);
            if (pagamentoSelecionado.status === "pendente") {
              $$renderer4.push("<!--[0-->");
              Button($$renderer4, {
                variant: "primary",
                color: "financeiro",
                class_name: "flex-1 justify-center",
                children: ($$renderer5) => {
                  Circle_check_big($$renderer5, { size: 16, class: "mr-2" });
                  $$renderer5.push(`<!---->Conciliar`);
                },
                $$slots: { default: true }
              });
            } else if (pagamentoSelecionado.status === "divergente") {
              $$renderer4.push("<!--[1-->");
              Button($$renderer4, {
                variant: "secondary",
                class_name: "flex-1 justify-center",
                children: ($$renderer5) => {
                  Circle_alert($$renderer5, { size: 16, class: "mr-2" });
                  $$renderer5.push(`<!---->Revisar`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            if (!pagamentoSelecionado.comprovante) {
              $$renderer4.push("<!--[0-->");
              Button($$renderer4, {
                variant: "secondary",
                children: ($$renderer5) => {
                  Upload($$renderer5, { size: 16, class: "mr-2" });
                  $$renderer5.push(`<!---->Anexar Comprovante`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Conciliar Pagamento",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: false,
        get open() {
          return showConciliarDialog;
        },
        set open($$value) {
          showConciliarDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          if (pagamentoSelecionado) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="space-y-4"><div class="p-4 bg-slate-50 rounded-lg"><div class="flex justify-between items-start mb-2"><div><p class="text-sm text-slate-500">Pagamento</p> <p class="font-semibold text-slate-900">${escape_html(pagamentoSelecionado.codigo)}</p></div> <p class="text-xl font-bold text-financeiro-600">${escape_html(formatCurrency(pagamentoSelecionado.valor))}</p></div> <p class="text-slate-700">${escape_html(pagamentoSelecionado.cliente)}</p> <p class="text-sm text-slate-500">${escape_html(pagamentoSelecionado.descricao)}</p></div> <div><p class="text-sm font-medium text-slate-700 mb-2">Vincular à Venda</p> `);
            $$renderer4.select({ value: vendaSelecionada, class: "vtur-input w-full" }, ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione a venda...`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(vendas);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let venda = each_array_1[$$index_1];
                $$renderer5.option({ value: venda.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(venda.codigo)} - ${escape_html(venda.cliente_nome)} (${escape_html(formatCurrency(venda.valor_total))})`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            });
            $$renderer4.push(` <p class="text-xs text-slate-500 mt-1">Selecione a venda correspondente a este pagamento</p></div> <div class="flex gap-3 pt-4">`);
            Button($$renderer4, {
              variant: "primary",
              color: "financeiro",
              class_name: "flex-1 justify-center",
              disabled: processando,
              children: ($$renderer5) => {
                {
                  $$renderer5.push("<!--[-1-->");
                  Circle_check_big($$renderer5, { size: 16, class: "mr-2" });
                }
                $$renderer5.push(`<!--]--> Confirmar Conciliação`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            Button($$renderer4, {
              variant: "secondary",
              disabled: processando,
              children: ($$renderer5) => {
                Circle_alert($$renderer5, { size: 16, class: "mr-2" });
                $$renderer5.push(`<!---->Divergente`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Anexar Comprovante",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Enviar",
        confirmVariant: "primary",
        loading: processando,
        onConfirm: handleUpload,
        confirmDisabled: true,
        get open() {
          return showUploadDialog;
        },
        set open($$value) {
          showUploadDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          if (pagamentoSelecionado) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="space-y-4"><div class="p-4 bg-slate-50 rounded-lg"><p class="text-sm text-slate-500">Pagamento</p> <p class="font-semibold text-slate-900">${escape_html(pagamentoSelecionado.codigo)}</p> <p class="text-financeiro-600 font-medium">${escape_html(formatCurrency(pagamentoSelecionado.valor))}</p></div> <div><label class="block text-sm font-medium text-slate-700 mb-2">Selecione o arquivo</label> <input type="file" accept=".jpg,.jpeg,.png,.pdf" class="vtur-input w-full"/> <p class="text-xs text-slate-500 mt-1">Formatos aceitos: JPG, PNG, PDF. Tamanho máximo: 5MB</p></div> `);
            {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div>`);
          } else {
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
