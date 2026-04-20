import { c as sanitize_props, o as spread_props, k as slot, z as sanitize_slots, f as fallback, e as escape_html, q as attr, t as ensure_array_like, w as attr_style, p as attr_class, m as bind_props } from "./index2.js";
import { B as Button } from "./Button2.js";
import { S as Search } from "./search.js";
import { I as Icon } from "./Icon.js";
import { L as Loader_circle } from "./loader-circle.js";
import { C as Chevron_left } from "./chevron-left.js";
import { C as Chevron_right } from "./PageHeader.js";
import { F as Funnel } from "./funnel.js";
import { D as Download } from "./download.js";
import { h as html } from "./html.js";
function Arrow_up_down($$renderer, $$props) {
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
    ["path", { "d": "m21 16-4 4-4-4" }],
    ["path", { "d": "M17 20V4" }],
    ["path", { "d": "m3 8 4-4 4 4" }],
    ["path", { "d": "M7 4v16" }]
  ];
  Icon($$renderer, spread_props([
    { name: "arrow-up-down" },
    $$sanitized_props,
    {
      /**
       * @component @name ArrowUpDown
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMjEgMTYtNCA0LTQtNCIgLz4KICA8cGF0aCBkPSJNMTcgMjBWNCIgLz4KICA8cGF0aCBkPSJtMyA4IDQtNCA0IDQiIC8+CiAgPHBhdGggZD0iTTcgNHYxNiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/arrow-up-down
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
function Chevrons_left($$renderer, $$props) {
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
    ["path", { "d": "m11 17-5-5 5-5" }],
    ["path", { "d": "m18 17-5-5 5-5" }]
  ];
  Icon($$renderer, spread_props([
    { name: "chevrons-left" },
    $$sanitized_props,
    {
      /**
       * @component @name ChevronsLeft
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTEgMTctNS01IDUtNSIgLz4KICA8cGF0aCBkPSJtMTggMTctNS01IDUtNSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/chevrons-left
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
function Chevrons_right($$renderer, $$props) {
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
    ["path", { "d": "m6 17 5-5-5-5" }],
    ["path", { "d": "m13 17 5-5-5-5" }]
  ];
  Icon($$renderer, spread_props([
    { name: "chevrons-right" },
    $$sanitized_props,
    {
      /**
       * @component @name ChevronsRight
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtNiAxNyA1LTUtNS01IiAvPgogIDxwYXRoIGQ9Im0xMyAxNyA1LTUtNS01IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/chevrons-right
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
function DataTable($$renderer, $$props) {
  const $$slots = sanitize_slots($$props);
  $$renderer.component(($$renderer2) => {
    let filteredData, totalPages, paginatedData, startIndex, endIndex;
    let data = fallback($$props["data"], () => [], true);
    let columns = fallback($$props["columns"], () => [], true);
    let color = fallback($$props["color"], "clientes");
    let loading = fallback($$props["loading"], false);
    let selectable = fallback($$props["selectable"], false);
    let searchable = fallback($$props["searchable"], true);
    let filterable = fallback($$props["filterable"], true);
    let exportable = fallback($$props["exportable"], true);
    let pagination = fallback($$props["pagination"], true);
    let pageSize = fallback($$props["pageSize"], 10);
    let pageSizeOptions = fallback($$props["pageSizeOptions"], () => [10, 25, 50, 100], true);
    let filters = fallback($$props["filters"], () => [], true);
    let title = fallback($$props["title"], "");
    let emptyMessage = fallback($$props["emptyMessage"], "Nenhum registro encontrado");
    let keyExtractor = fallback($$props["keyExtractor"], (row) => row.id || Math.random().toString());
    let onRowClick = fallback($$props["onRowClick"], void 0);
    let onSelectionChange = fallback($$props["onSelectionChange"], void 0);
    let onExport = fallback($$props["onExport"], void 0);
    let searchQuery = "";
    let activeFilters = {};
    let currentPage = 1;
    let currentPageSize = pageSize;
    let sortKey = null;
    let selectedRows = /* @__PURE__ */ new Set();
    let selectAll = false;
    function getCellValue(row, column) {
      const value = row[column.key];
      if (column.formatter) {
        return column.formatter(value, row);
      }
      return value != null ? String(value) : "-";
    }
    function isHtmlContent(value) {
      return /<[^>]+>/.test(value);
    }
    filteredData = (() => {
      let result = [...data];
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== "" && value != null) {
          result = result.filter((row) => {
            const rowValue = row[key];
            if (Array.isArray(value)) {
              return value.includes(String(rowValue));
            }
            return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
          });
        }
      });
      return result;
    })();
    totalPages = Math.ceil(filteredData.length / currentPageSize);
    if (Object.keys(activeFilters).length > 0) {
      currentPage = 1;
    }
    paginatedData = pagination ? filteredData.slice((currentPage - 1) * currentPageSize, currentPage * currentPageSize) : filteredData;
    startIndex = (currentPage - 1) * currentPageSize + 1;
    endIndex = Math.min(currentPage * currentPageSize, filteredData.length);
    $$renderer2.push(`<div class="space-y-4">`);
    if (title || searchable || filterable || exportable) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">`);
      if (title) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<h3 class="text-lg font-semibold text-slate-900">${escape_html(title)}</h3>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="flex flex-wrap items-center gap-2">`);
      if (searchable) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="relative">`);
        Search($$renderer2, {
          size: 18,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer2.push(`<!----> <input type="text" placeholder="Buscar..."${attr("value", searchQuery)} class="vtur-input vtur-input--search w-full pl-10 pr-4 py-2 sm:w-72"/></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (filterable && filters.length > 0) {
        $$renderer2.push("<!--[0-->");
        Button($$renderer2, {
          variant: "secondary",
          class_name: Object.keys(activeFilters).length > 0 ? "vtur-button--active-filter" : "",
          children: ($$renderer3) => {
            Funnel($$renderer3, { size: 16, class: "mr-2" });
            $$renderer3.push(`<!----> Filtros `);
            if (Object.keys(activeFilters).length > 0) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<span class="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">${escape_html(Object.keys(activeFilters).length)}</span>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (exportable) {
        $$renderer2.push("<!--[0-->");
        Button($$renderer2, {
          variant: "ghost",
          children: ($$renderer3) => {
            Download($$renderer3, { size: 16, class: "mr-2" });
            $$renderer3.push(`<!----> Exportar`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="vtur-table-shell"><div class="overflow-x-auto"><table class="w-full text-sm table-mobile-cards"><thead class="vtur-table__head"><tr>`);
    if (selectable) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<th class="w-10 px-4 py-3"><input type="checkbox"${attr("checked", selectAll, true)} class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"/></th>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--><!--[-->`);
    const each_array_2 = ensure_array_like(columns);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let column = each_array_2[$$index_2];
      $$renderer2.push(`<th class="px-6 py-3 text-left"${attr_style(column.width ? `width: ${column.width}` : "")}>`);
      if (column.sortable) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<button class="flex items-center gap-1 transition-colors hover:text-slate-900">${escape_html(column.label)} `);
        if (sortKey === column.key) {
          $$renderer2.push("<!--[0-->");
          {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]-->`);
        } else {
          $$renderer2.push("<!--[-1-->");
          Arrow_up_down($$renderer2, { size: 14, class: "text-slate-400" });
        }
        $$renderer2.push(`<!--]--></button>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`${escape_html(column.label)}`);
      }
      $$renderer2.push(`<!--]--></th>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$slots["row-actions"] || $$slots.actions) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<th class="px-6 py-3 text-right">Ações</th>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></tr></thead><tbody class="vtur-table__body">`);
    if (loading) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<tr><td${attr("colspan", columns.length + (selectable ? 1 : 0) + ($$slots["row-actions"] || $$slots.actions ? 1 : 0))} class="px-6 py-12 text-center">`);
      Loader_circle($$renderer2, { size: 32, class: "mx-auto animate-spin text-slate-400" });
      $$renderer2.push(`<!----> <p class="mt-2 text-slate-500">Carregando...</p></td></tr>`);
    } else if (paginatedData.length === 0) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<tr><td${attr("colspan", columns.length + (selectable ? 1 : 0) + ($$slots["row-actions"] || $$slots.actions ? 1 : 0))} class="px-6 py-12 text-center text-slate-500">${escape_html(emptyMessage)}</td></tr>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--[-->`);
      const each_array_3 = ensure_array_like(paginatedData);
      for (let $$index_4 = 0, $$length = each_array_3.length; $$index_4 < $$length; $$index_4++) {
        let row = each_array_3[$$index_4];
        $$renderer2.push(`<tr${attr_class("transition-colors hover:bg-slate-50/90", void 0, { "cursor-pointer": onRowClick })}>`);
        if (selectable) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<td class="px-4 py-4"><input type="checkbox"${attr("checked", selectedRows.has(keyExtractor(row)), true)} class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"/></td>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--><!--[-->`);
        const each_array_4 = ensure_array_like(columns);
        for (let $$index_3 = 0, $$length2 = each_array_4.length; $$index_3 < $$length2; $$index_3++) {
          let column = each_array_4[$$index_3];
          $$renderer2.push(`<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900"${attr("data-label", column.label)}>`);
          if (column.component) {
            $$renderer2.push("<!--[0-->");
            if (column.component) {
              $$renderer2.push("<!--[-->");
              column.component($$renderer2, spread_props([column.componentProps?.(row) || {}]));
              $$renderer2.push("<!--]-->");
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push("<!--]-->");
            }
          } else {
            $$renderer2.push("<!--[-1-->");
            const cellValue = getCellValue(row, column);
            if (isHtmlContent(cellValue)) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`${html(cellValue)}`);
            } else {
              $$renderer2.push("<!--[-1-->");
              $$renderer2.push(`${escape_html(cellValue)}`);
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]--></td>`);
        }
        $$renderer2.push(`<!--]-->`);
        if ($$slots["row-actions"] || $$slots.actions) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<td class="px-6 py-4 text-right td-actions"><!--[-->`);
          slot($$renderer2, $$props, "row-actions", { row }, null);
          $$renderer2.push(`<!--]--> <!--[-->`);
          slot($$renderer2, $$props, "actions", { row }, null);
          $$renderer2.push(`<!--]--></td>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></tr>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div> `);
    if (pagination && filteredData.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="vtur-table-pagination"><div class="text-sm text-slate-500">Mostrando <span class="font-medium">${escape_html(startIndex)}</span> a <span class="font-medium">${escape_html(endIndex)}</span> de <span class="font-medium">${escape_html(filteredData.length)}</span> registros</div> <div class="flex items-center gap-4">`);
      $$renderer2.select(
        {
          value: currentPageSize,
          class: "vtur-input w-20 px-2 py-1 text-sm"
        },
        ($$renderer3) => {
          $$renderer3.push(`<!--[-->`);
          const each_array_5 = ensure_array_like(pageSizeOptions);
          for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
            let size = each_array_5[$$index_5];
            $$renderer3.option({ value: size }, ($$renderer4) => {
              $$renderer4.push(`${escape_html(size)}`);
            });
          }
          $$renderer3.push(`<!--]-->`);
        }
      );
      $$renderer2.push(` <div class="flex items-center gap-1"><button${attr("disabled", currentPage === 1, true)} class="rounded-lg p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">`);
      Chevrons_left($$renderer2, { size: 16 });
      $$renderer2.push(`<!----></button> <button${attr("disabled", currentPage === 1, true)} class="rounded-lg p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">`);
      Chevron_left($$renderer2, { size: 16 });
      $$renderer2.push(`<!----></button> <span class="px-3 py-1 text-sm">Página ${escape_html(currentPage)} de ${escape_html(totalPages)}</span> <button${attr("disabled", currentPage === totalPages, true)} class="rounded-lg p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">`);
      Chevron_right($$renderer2, { size: 16 });
      $$renderer2.push(`<!----></button> <button${attr("disabled", currentPage === totalPages, true)} class="rounded-lg p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">`);
      Chevrons_right($$renderer2, { size: 16 });
      $$renderer2.push(`<!----></button></div></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div>`);
    bind_props($$props, {
      data,
      columns,
      color,
      loading,
      selectable,
      searchable,
      filterable,
      exportable,
      pagination,
      pageSize,
      pageSizeOptions,
      filters,
      title,
      emptyMessage,
      keyExtractor,
      onRowClick,
      onSelectionChange,
      onExport
    });
  });
}
export {
  DataTable as D
};
