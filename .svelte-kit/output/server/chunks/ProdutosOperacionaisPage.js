import { c as sanitize_props, o as spread_props, k as slot, f as fallback, h as head, e as escape_html, m as bind_props, q as attr, t as ensure_array_like } from "./index2.js";
import { g as goto } from "./client.js";
import { P as PageHeader } from "./PageHeader.js";
import { C as Card } from "./Card.js";
import { D as DataTable } from "./DataTable.js";
import "./ui.js";
import { P as Package } from "./package.js";
import { M as Map_pin } from "./map-pin.js";
import { I as Icon } from "./Icon.js";
import { H as Hotel } from "./hotel.js";
import { P as Plus } from "./plus.js";
function Earth($$renderer, $$props) {
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
    ["path", { "d": "M21.54 15H17a2 2 0 0 0-2 2v4.54" }],
    [
      "path",
      {
        "d": "M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"
      }
    ],
    [
      "path",
      {
        "d": "M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"
      }
    ],
    ["circle", { "cx": "12", "cy": "12", "r": "10" }]
  ];
  Icon($$renderer, spread_props([
    { name: "earth" },
    $$sanitized_props,
    {
      /**
       * @component @name Earth
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEuNTQgMTVIMTdhMiAyIDAgMCAwLTIgMnY0LjU0IiAvPgogIDxwYXRoIGQ9Ik03IDMuMzRWNWEzIDMgMCAwIDAgMyAzYTIgMiAwIDAgMSAyIDJjMCAxLjEuOSAyIDIgMmEyIDIgMCAwIDAgMi0yYzAtMS4xLjktMiAyLTJoMy4xNyIgLz4KICA8cGF0aCBkPSJNMTEgMjEuOTVWMThhMiAyIDAgMCAwLTItMmEyIDIgMCAwIDEtMi0ydi0xYTIgMiAwIDAgMC0yLTJIMi4wNSIgLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/earth
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
function ProdutosOperacionaisPage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let rows, filteredRows, stats, routeBase, title, subtitle;
    let mode = fallback($$props["mode"], "produtos");
    let loading = true;
    let produtos = [];
    let tipos = [];
    let cidades = [];
    let fornecedores = [];
    let search = "";
    let filtroTipo = "";
    let filtroStatus = "";
    let filtroAbrangencia = "";
    function formatCidade(cidadeId) {
      if (!cidadeId) return "-";
      const cidade = cidades.find((item) => item.id === cidadeId);
      if (!cidade) return "-";
      const estado = cidade.estado || cidade.uf || cidade.subdivisao_nome || cidade.subdivisao?.sigla || cidade.subdivisao?.nome || "";
      return estado ? `${cidade.nome} (${estado})` : cidade.nome || "-";
    }
    function formatTipo(tipoId) {
      const tipo = tipos.find((item) => item.id === tipoId);
      return tipo?.nome || tipo?.tipo || "-";
    }
    function formatFornecedor(fornecedorId) {
      const fornecedor = fornecedores.find((item) => item.id === fornecedorId);
      return fornecedor?.nome_fantasia || fornecedor?.nome_completo || "-";
    }
    function formatDate(value) {
      if (!value) return "-";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("pt-BR");
    }
    function statusBadge(value) {
      return value !== false ? '<span class="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Ativo</span>' : '<span class="inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600">Inativo</span>';
    }
    function abrangenciaBadge(row) {
      return row.todas_as_cidades ? '<span class="inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700">Global</span>' : '<span class="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">Por cidade</span>';
    }
    const columns = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "tipo_nome",
        label: "Tipo",
        sortable: true,
        width: "180px"
      },
      {
        key: "destino",
        label: "Destino",
        sortable: true,
        width: "180px"
      },
      {
        key: "cidade_nome",
        label: "Cidade",
        sortable: true,
        width: "180px"
      },
      {
        key: "fornecedor_nome",
        label: "Fornecedor",
        sortable: true,
        width: "180px"
      },
      {
        key: "todas_as_cidades",
        label: "Abrangência",
        sortable: true,
        width: "120px",
        formatter: (_value, row) => abrangenciaBadge(row)
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "110px",
        formatter: (value) => statusBadge(value)
      },
      {
        key: "updated_at",
        label: "Atualizado",
        sortable: true,
        width: "120px",
        formatter: (value) => formatDate(value)
      }
    ];
    rows = produtos.map((produto) => ({
      ...produto,
      tipo_nome: formatTipo(produto.tipo_produto),
      cidade_nome: formatCidade(produto.cidade_id),
      fornecedor_nome: formatFornecedor(produto.fornecedor_id)
    }));
    filteredRows = rows.filter((produto) => {
      const term = search.trim().toLowerCase();
      if (term) {
        const haystack = [
          produto.nome,
          produto.destino,
          produto.tipo_nome,
          produto.cidade_nome,
          produto.fornecedor_nome
        ].join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
    stats = {
      total: produtos.length,
      ativos: produtos.filter((item) => item.ativo !== false).length,
      globais: produtos.filter((item) => item.todas_as_cidades === true).length,
      hospedagem: produtos.filter((item) => {
        const tipo = formatTipo(item.tipo_produto).toLowerCase();
        return ["hotel", "pousada", "resort", "flat"].some((keyword) => tipo.includes(keyword));
      }).length
    };
    routeBase = mode === "destinos" ? "/cadastros/destinos" : "/cadastros/produtos";
    title = mode === "destinos" ? "Destinos" : "Produtos";
    subtitle = mode === "destinos" ? "Base operacional compartilhada com produtos, vendas e orçamentos" : "Base operacional de produtos, destinos e atributos consumidos pela operação";
    head("1vi93qf", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(title)} | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title,
      subtitle,
      color: "financeiro",
      breadcrumbs: [{ label: "Cadastros", href: "/cadastros" }, { label: title }],
      actions: [
        {
          label: mode === "destinos" ? "Novo destino" : "Novo produto",
          onClick: () => goto(),
          variant: "primary",
          icon: Plus
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
    Package($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.total)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
    Map_pin($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Ativos</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.ativos)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
    Earth($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Globais</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.globais)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-violet-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">`);
    Hotel($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Hospedagem</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.hospedagem)}</p></div></div></div> `);
    Card($$renderer2, {
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid grid-cols-1 gap-4 lg:grid-cols-4"><div><label for="produtos-busca" class="mb-1 block text-sm font-medium text-slate-700">Buscar</label> <input id="produtos-busca"${attr("value", search)} class="vtur-input w-full" placeholder="Nome, destino, tipo, cidade..."/></div> <div><label for="produtos-tipo" class="mb-1 block text-sm font-medium text-slate-700">Tipo</label> `);
        $$renderer3.select(
          {
            id: "produtos-tipo",
            value: filtroTipo,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array = ensure_array_like(tipos);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let tipo = each_array[$$index];
              $$renderer4.option({ value: tipo.id }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(tipo.nome || tipo.tipo)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(`</div> <div><label for="produtos-status" class="mb-1 block text-sm font-medium text-slate-700">Status</label> `);
        $$renderer3.select(
          {
            id: "produtos-status",
            value: filtroStatus,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.option({ value: "ativo" }, ($$renderer5) => {
              $$renderer5.push(`Ativo`);
            });
            $$renderer4.option({ value: "inativo" }, ($$renderer5) => {
              $$renderer5.push(`Inativo`);
            });
          }
        );
        $$renderer3.push(`</div> <div><label for="produtos-abrangencia" class="mb-1 block text-sm font-medium text-slate-700">Abrangência</label> `);
        $$renderer3.select(
          {
            id: "produtos-abrangencia",
            value: filtroAbrangencia,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todas`);
            });
            $$renderer4.option({ value: "global" }, ($$renderer5) => {
              $$renderer5.push(`Global`);
            });
            $$renderer4.option({ value: "cidade" }, ($$renderer5) => {
              $$renderer5.push(`Por cidade`);
            });
          }
        );
        $$renderer3.push(`</div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    DataTable($$renderer2, {
      columns,
      data: filteredRows,
      color: "financeiro",
      loading,
      title: `Base de ${title.toLowerCase()}`,
      searchable: false,
      filterable: false,
      exportable: false,
      onRowClick: (row) => goto(`${routeBase}/${row.id}/editar`),
      emptyMessage: `Nenhum ${mode === "destinos" ? "destino" : "produto"} encontrado.`
    });
    $$renderer2.push(`<!---->`);
    bind_props($$props, { mode });
  });
}
export {
  ProdutosOperacionaisPage as P
};
