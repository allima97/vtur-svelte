import { c as sanitize_props, o as spread_props, k as slot, f as fallback, p as attr_class, j as clsx, t as ensure_array_like, q as attr, e as escape_html, m as bind_props, h as head } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { M as Message_square } from "../../../../../chunks/message-square.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { T as Tag } from "../../../../../chunks/tag.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function Image($$renderer, $$props) {
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
      {
        "width": "18",
        "height": "18",
        "x": "3",
        "y": "3",
        "rx": "2",
        "ry": "2"
      }
    ],
    ["circle", { "cx": "9", "cy": "9", "r": "2" }],
    ["path", { "d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]
  ];
  Icon($$renderer, spread_props([
    { name: "image" },
    $$sanitized_props,
    {
      /**
       * @component @name Image
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIgLz4KICA8Y2lyY2xlIGN4PSI5IiBjeT0iOSIgcj0iMiIgLz4KICA8cGF0aCBkPSJtMjEgMTUtMy4wODYtMy4wODZhMiAyIDAgMCAwLTIuODI4IDBMNiAyMSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/image
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
function Pencil($$renderer, $$props) {
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
        "d": "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
      }
    ],
    ["path", { "d": "m15 5 4 4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "pencil" },
    $$sanitized_props,
    {
      /**
       * @component @name Pencil
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEuMTc0IDYuODEyYTEgMSAwIDAgMC0zLjk4Ni0zLjk4N0wzLjg0MiAxNi4xNzRhMiAyIDAgMCAwLS41LjgzbC0xLjMyMSA0LjM1MmEuNS41IDAgMCAwIC42MjMuNjIybDQuMzUzLTEuMzJhMiAyIDAgMCAwIC44My0uNDk3eiIgLz4KICA8cGF0aCBkPSJtMTUgNSA0IDQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/pencil
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
function Tabs($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let items = fallback($$props["items"], () => [], true);
    let activeKey = fallback($$props["activeKey"], "");
    let className = fallback($$props["className"], "");
    $$renderer2.push(`<div${attr_class(clsx(`vtur-tabs ${className}`.trim()))} role="tablist"><!--[-->`);
    const each_array = ensure_array_like(items);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<button type="button" role="tab"${attr("aria-selected", activeKey === item.key)}${attr_class(clsx(`vtur-tab ${activeKey === item.key ? "vtur-tab--active" : ""}`.trim()))}${attr("disabled", item.disabled, true)}>`);
      if (item.icon) {
        $$renderer2.push("<!--[0-->");
        if (item.icon) {
          $$renderer2.push("<!--[-->");
          item.icon($$renderer2, { size: 16 });
          $$renderer2.push("<!--]-->");
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push("<!--]-->");
        }
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <span>${escape_html(item.label)}</span> `);
      if (item.badge != null && item.badge !== "" && item.badge !== 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span${attr_class(`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${activeKey === item.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`)}>${escape_html(item.badge)}</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { items, activeKey, className });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const SCOPE_OPTIONS = [
      { value: "system", label: "Sistema" },
      { value: "master", label: "Master" },
      { value: "gestor", label: "Gestor" },
      { value: "user", label: "Usuário" }
    ];
    let categorias = [];
    let temas = [];
    let templates = [];
    let loading = true;
    let activeTab = "templates";
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let editingEntity = "template";
    let formCategoria = { nome: "", icone: "pi pi-tag", sort_order: 0, ativo: true };
    let formTema = {
      nome: "",
      categoria_id: "",
      asset_url: "",
      scope: "system",
      ativo: true
    };
    let formTemplate = {
      nome: "",
      categoria: "",
      titulo: "",
      corpo: "",
      scope: "user",
      ativo: true
    };
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/admin/crm");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        categorias = payload.categorias || [];
        temas = payload.temas || [];
        templates = payload.templates || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar CRM.");
      } finally {
        loading = false;
      }
    }
    async function saveEntity() {
      saving = true;
      try {
        const data = editingEntity === "categoria" ? formCategoria : editingEntity === "tema" ? { ...formTema, categoria_id: formTema.categoria_id || null } : { ...formTemplate, categoria: formTemplate.categoria || null };
        const response = await fetch("/api/v1/admin/crm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity: editingEntity,
            action: "upsert",
            id: editingId || void 0,
            data
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Atualizado." : "Criado.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      } finally {
        saving = false;
      }
    }
    function openEdit(entity, item) {
      editingEntity = entity;
      editingId = item.id;
      if (entity === "categoria") formCategoria = {
        nome: item.nome,
        icone: item.icone || "pi pi-tag",
        sort_order: item.sort_order || 0,
        ativo: item.ativo
      };
      else if (entity === "tema") formTema = {
        nome: item.nome,
        categoria_id: item.categoria_id || "",
        asset_url: item.asset_url || "",
        scope: item.scope || "system",
        ativo: item.ativo
      };
      else formTemplate = {
        nome: item.nome,
        categoria: item.categoria || "",
        titulo: item.titulo,
        corpo: item.corpo,
        scope: item.scope || "user",
        ativo: item.ativo
      };
      modalOpen = true;
    }
    const colsTemplate = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "categoria",
        label: "Ocasião",
        sortable: true,
        formatter: (v) => v || "-"
      },
      {
        key: "scope",
        label: "Escopo",
        sortable: true,
        width: "100px",
        formatter: (v) => SCOPE_OPTIONS.find((s) => s.value === v)?.label || v
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "90px",
        formatter: (v) => v ? '<span class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Ativo</span>' : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Inativo</span>'
      }
    ];
    const colsTema = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "scope",
        label: "Escopo",
        sortable: true,
        width: "100px",
        formatter: (v) => SCOPE_OPTIONS.find((s) => s.value === v)?.label || v
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "90px",
        formatter: (v) => v ? '<span class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Ativo</span>' : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Inativo</span>'
      }
    ];
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1yl06c2", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>CRM Admin | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "CRM Admin",
        subtitle: "Gerencie categorias, temas de arte e templates de mensagem do CRM.",
        breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "CRM" }],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      Tabs($$renderer3, {
        className: "mb-6",
        items: [
          { key: "templates", label: "Templates", icon: Message_square },
          { key: "temas", label: "Temas de Arte", icon: Image },
          { key: "categorias", label: "Categorias", icon: Tag }
        ],
        get activeKey() {
          return activeTab;
        },
        set activeKey($$value) {
          activeTab = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----> `);
      if (activeTab === "templates") {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="mb-4 flex justify-end">`);
        Button($$renderer3, {
          variant: "primary",
          color: "financeiro",
          children: ($$renderer4) => {
            Plus($$renderer4, { size: 16, class: "mr-2" });
            $$renderer4.push(`<!----> Novo Template`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div> `);
        DataTable($$renderer3, {
          columns: colsTemplate,
          data: templates,
          color: "financeiro",
          loading,
          title: "Templates de mensagem",
          searchable: true,
          emptyMessage: "Nenhum template",
          onRowClick: (row) => openEdit("template", row),
          $$slots: {
            "row-actions": ($$renderer4, { row }) => {
              {
                $$renderer4.push(`<button class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"${attr("disabled", deletingId === row.id, true)}>`);
                Trash_2($$renderer4, { size: 15 });
                $$renderer4.push(`<!----></button>`);
              }
            }
          }
        });
        $$renderer3.push(`<!---->`);
      } else if (activeTab === "temas") {
        $$renderer3.push("<!--[1-->");
        $$renderer3.push(`<div class="mb-4 flex justify-end">`);
        Button($$renderer3, {
          variant: "primary",
          color: "financeiro",
          children: ($$renderer4) => {
            Plus($$renderer4, { size: 16, class: "mr-2" });
            $$renderer4.push(`<!----> Novo Tema`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div> `);
        DataTable($$renderer3, {
          columns: colsTema,
          data: temas,
          color: "financeiro",
          loading,
          title: "Temas de arte",
          searchable: true,
          emptyMessage: "Nenhum tema",
          onRowClick: (row) => openEdit("tema", row),
          $$slots: {
            "row-actions": ($$renderer4, { row }) => {
              {
                $$renderer4.push(`<button class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"${attr("disabled", deletingId === row.id, true)}>`);
                Trash_2($$renderer4, { size: 15 });
                $$renderer4.push(`<!----></button>`);
              }
            }
          }
        });
        $$renderer3.push(`<!---->`);
      } else {
        $$renderer3.push("<!--[-1-->");
        $$renderer3.push(`<div class="mb-4 flex justify-end">`);
        Button($$renderer3, {
          variant: "primary",
          color: "financeiro",
          children: ($$renderer4) => {
            Plus($$renderer4, { size: 16, class: "mr-2" });
            $$renderer4.push(`<!----> Nova Categoria`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div> <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"><!--[-->`);
        const each_array = ensure_array_like(categorias);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let cat = each_array[$$index];
          Card($$renderer3, {
            color: "financeiro",
            children: ($$renderer4) => {
              $$renderer4.push(`<div class="flex items-center justify-between"><div class="flex items-center gap-3"><span class="text-2xl">${escape_html(cat.icone?.startsWith("pi") ? "🏷️" : cat.icone || "🏷️")}</span> <div><p class="font-semibold text-slate-900">${escape_html(cat.nome)}</p> <p class="text-xs text-slate-500">Ordem: ${escape_html(cat.sort_order)}</p></div></div> <div class="flex gap-1"><button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">`);
              Pencil($$renderer4, { size: 15 });
              $$renderer4.push(`<!----></button> <button class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"${attr("disabled", deletingId === cat.id, true)}>`);
              Trash_2($$renderer4, { size: 15 });
              $$renderer4.push(`<!----></button></div></div>`);
            },
            $$slots: { default: true }
          });
        }
        $$renderer3.push(`<!--]--> `);
        if (categorias.length === 0 && !loading) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="col-span-3 py-12 text-center text-slate-500">Nenhuma categoria cadastrada.</div>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div>`);
      }
      $$renderer3.push(`<!--]--> `);
      Dialog($$renderer3, {
        title: editingId ? "Editar" : "Novo",
        color: "financeiro",
        size: "lg",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: editingId ? "Salvar" : "Criar",
        loading: saving,
        onConfirm: saveEntity,
        onCancel: () => modalOpen = false,
        get open() {
          return modalOpen;
        },
        set open($$value) {
          modalOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          if (editingEntity === "categoria") {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-cat-nome">Nome *</label> <input id="crm-cat-nome"${attr("value", formCategoria.nome)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-cat-icone">Ícone</label> <input id="crm-cat-icone"${attr("value", formCategoria.icone)} class="vtur-input w-full" placeholder="pi pi-tag"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-cat-ordem">Ordem</label> <input id="crm-cat-ordem" type="number"${attr("value", formCategoria.sort_order)} class="vtur-input w-full"/></div> <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", formCategoria.ativo, true)} class="rounded border-slate-300"/> Ativo</label></div>`);
          } else if (editingEntity === "tema") {
            $$renderer4.push("<!--[1-->");
            $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tema-nome">Nome *</label> <input id="crm-tema-nome"${attr("value", formTema.nome)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tema-url">URL da Arte</label> <input id="crm-tema-url"${attr("value", formTema.asset_url)} class="vtur-input w-full" placeholder="https://..."/></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tema-cat">Categoria</label> `);
            $$renderer4.select(
              {
                id: "crm-tema-cat",
                value: formTema.categoria_id,
                class: "vtur-input w-full"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: "" }, ($$renderer6) => {
                  $$renderer6.push(`Sem categoria`);
                });
                $$renderer5.push(`<!--[-->`);
                const each_array_1 = ensure_array_like(categorias);
                for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                  let cat = each_array_1[$$index_1];
                  $$renderer5.option({ value: cat.id }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(cat.nome)}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
            $$renderer4.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tema-scope">Escopo</label> `);
            $$renderer4.select(
              {
                id: "crm-tema-scope",
                value: formTema.scope,
                class: "vtur-input w-full"
              },
              ($$renderer5) => {
                $$renderer5.push(`<!--[-->`);
                const each_array_2 = ensure_array_like(SCOPE_OPTIONS);
                for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                  let opt = each_array_2[$$index_2];
                  $$renderer5.option({ value: opt.value }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(opt.label)}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
            $$renderer4.push(`</div></div> <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", formTema.ativo, true)} class="rounded border-slate-300"/> Ativo</label></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
            $$renderer4.push(`<div class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tpl-nome">Nome *</label> <input id="crm-tpl-nome"${attr("value", formTemplate.nome)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tpl-cat">Ocasião</label> <input id="crm-tpl-cat"${attr("value", formTemplate.categoria)} class="vtur-input w-full" placeholder="Ex: Aniversário"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tpl-scope">Escopo</label> `);
            $$renderer4.select(
              {
                id: "crm-tpl-scope",
                value: formTemplate.scope,
                class: "vtur-input w-full"
              },
              ($$renderer5) => {
                $$renderer5.push(`<!--[-->`);
                const each_array_3 = ensure_array_like(SCOPE_OPTIONS);
                for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
                  let opt = each_array_3[$$index_3];
                  $$renderer5.option({ value: opt.value }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(opt.label)}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
            $$renderer4.push(`</div> <div class="flex items-end"><label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", formTemplate.ativo, true)} class="rounded border-slate-300"/> Ativo</label></div></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tpl-titulo">Título *</label> <input id="crm-tpl-titulo"${attr("value", formTemplate.titulo)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tpl-corpo">Corpo *</label> <textarea id="crm-tpl-corpo" rows="6" class="vtur-input w-full" placeholder="Use {{nome_cliente}}, {{primeiro_nome}}, {{consultor}}">`);
            const $$body = escape_html(formTemplate.corpo);
            if ($$body) {
              $$renderer4.push(`${$$body}`);
            }
            $$renderer4.push(`</textarea></div></div>`);
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
