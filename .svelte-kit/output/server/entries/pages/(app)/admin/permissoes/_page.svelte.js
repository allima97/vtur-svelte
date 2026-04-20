import { c as sanitize_props, o as spread_props, k as slot, h as head, e as escape_html, t as ensure_array_like, q as attr } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { U as Users } from "../../../../../chunks/users.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { C as Circle_x } from "../../../../../chunks/circle-x.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
function Layout_grid($$renderer, $$props) {
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
      "rect",
      { "width": "7", "height": "7", "x": "3", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "7", "x": "14", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "7", "x": "14", "y": "14", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "7", "x": "3", "y": "14", "rx": "1" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "layout-grid" },
    $$sanitized_props,
    {
      /**
       * @component @name LayoutGrid
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSI3IiB4PSIzIiB5PSIzIiByeD0iMSIgLz4KICA8cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSI3IiB4PSIxNCIgeT0iMyIgcng9IjEiIC8+CiAgPHJlY3Qgd2lkdGg9IjciIGhlaWdodD0iNyIgeD0iMTQiIHk9IjE0IiByeD0iMSIgLz4KICA8cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSI3IiB4PSIzIiB5PSIxNCIgcng9IjEiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/layout-grid
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
    let loading = true;
    let rows = [];
    let globalModules = [];
    let systemModuleCatalog = [];
    let savingGlobal = false;
    const columns = [
      {
        key: "nome",
        label: "Usuario",
        sortable: true,
        formatter: (_value, row) => `
        <div>
          <p class="font-medium text-slate-900">${row.nome}</p>
          <p class="text-xs text-slate-500">${row.email || "-"}</p>
        </div>
      `
      },
      { key: "tipo", label: "Perfil", sortable: true },
      { key: "empresa", label: "Empresa", sortable: true },
      {
        key: "ativos",
        label: "Modulos ativos",
        sortable: true,
        formatter: (value) => `<span class="inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">${value || 0}</span>`
      }
    ];
    function getGlobalEnabled(moduleKey) {
      const row = globalModules.find((item) => item.module_key === moduleKey);
      return row ? row.enabled !== false : true;
    }
    async function loadPage() {
      loading = true;
      try {
        const response = await fetch("/api/v1/admin/permissoes");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        rows = payload.items || [];
        globalModules = (payload.global_modules || []).map((item) => ({ module_key: item.module_key, enabled: item.enabled !== false }));
        systemModuleCatalog = payload.system_module_catalog || [];
      } catch (err) {
        console.error(err);
        toast.error("Nao foi possivel carregar o painel de permissoes.");
        rows = [];
        globalModules = [];
        systemModuleCatalog = [];
      } finally {
        loading = false;
      }
    }
    head("11x64ds", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Permissoes | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Permissoes",
      subtitle: "Controle por usuario e configuracao global dos modulos administrativos.",
      breadcrumbs: [
        { label: "Administracao", href: "/admin" },
        { label: "Permissoes" }
      ],
      actions: [
        {
          label: "Atualizar",
          onClick: loadPage,
          variant: "secondary",
          icon: Refresh_cw
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="space-y-6"><div class="vtur-kpi-grid vtur-kpi-grid-3"><div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
    Users($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Usuários no painel</p><p class="text-2xl font-bold text-slate-900">${escape_html(rows.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
    Layout_grid($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Módulos globais</p><p class="text-2xl font-bold text-slate-900">${escape_html(systemModuleCatalog.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-red-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">`);
    Circle_x($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Módulos desabilitados</p><p class="text-2xl font-bold text-slate-900">${escape_html(systemModuleCatalog.filter((item) => !getGlobalEnabled(item.key)).length)}</p></div></div></div> `);
    Card($$renderer2, {
      color: "financeiro",
      title: "Disponibilidade global dos modulos",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><!--[-->`);
        const each_array = ensure_array_like(systemModuleCatalog);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let item = each_array[$$index];
          $$renderer3.push(`<label class="flex items-center justify-between rounded-xl border border-slate-200 p-4"><div><p class="font-medium text-slate-900">${escape_html(item.label)}</p> <p class="text-xs text-slate-500">${escape_html(item.key)}</p></div> <input type="checkbox"${attr("checked", getGlobalEnabled(item.key), true)}/></label>`);
        }
        $$renderer3.push(`<!--]--></div> <div class="mt-4">`);
        Button($$renderer3, {
          variant: "primary",
          color: "financeiro",
          loading: savingGlobal,
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Salvar disponibilidade global`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    DataTable($$renderer2, {
      title: "Usuarios por permissao",
      color: "financeiro",
      loading,
      columns,
      data: rows,
      emptyMessage: "Nenhum usuario com permissao administrativa encontrado.",
      onRowClick: (row) => goto(`/admin/permissoes/${row.id}`)
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="text-sm text-slate-600">O clique na linha abre o editor completo de permissoes do usuario. A disponibilidade global
      acima controla bloqueios de modulo para todo o sistema.</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
