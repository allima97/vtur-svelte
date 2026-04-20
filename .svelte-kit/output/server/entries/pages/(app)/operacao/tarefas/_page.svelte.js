import { c as sanitize_props, o as spread_props, k as slot, h as head, q as attr, t as ensure_array_like, e as escape_html, p as attr_class, w as attr_style, v as stringify } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { B as Badge } from "../../../../../chunks/Badge.js";
import { K as KPICard } from "../../../../../chunks/KPICard.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { T as Tag } from "../../../../../chunks/tag.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { S as Square_check_big } from "../../../../../chunks/square-check-big.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { L as Layers } from "../../../../../chunks/layers.js";
import { S as Search } from "../../../../../chunks/search.js";
import { L as Loader_circle } from "../../../../../chunks/loader-circle.js";
function Archive($$renderer, $$props) {
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
      { "width": "20", "height": "5", "x": "2", "y": "3", "rx": "1" }
    ],
    ["path", { "d": "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }],
    ["path", { "d": "M10 12h4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "archive" },
    $$sanitized_props,
    {
      /**
       * @component @name Archive
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iNSIgeD0iMiIgeT0iMyIgcng9IjEiIC8+CiAgPHBhdGggZD0iTTQgOHYxMWEyIDIgMCAwIDAgMiAyaDEyYTIgMiAwIDAgMCAyLTJWOCIgLz4KICA8cGF0aCBkPSJNMTAgMTJoNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/archive
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
function Folder_kanban($$renderer, $$props) {
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
        "d": "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
      }
    ],
    ["path", { "d": "M8 10v4" }],
    ["path", { "d": "M12 10v2" }],
    ["path", { "d": "M16 10v6" }]
  ];
  Icon($$renderer, spread_props([
    { name: "folder-kanban" },
    $$sanitized_props,
    {
      /**
       * @component @name FolderKanban
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNCAyMGgxNmEyIDIgMCAwIDAgMi0yVjhhMiAyIDAgMCAwLTItMmgtNy45M2EyIDIgMCAwIDEtMS42Ni0uOWwtLjgyLTEuMkEyIDIgMCAwIDAgNy45MyAzSDRhMiAyIDAgMCAwLTIgMnYxM2MwIDEuMS45IDIgMiAyWiIgLz4KICA8cGF0aCBkPSJNOCAxMHY0IiAvPgogIDxwYXRoIGQ9Ik0xMiAxMHYyIiAvPgogIDxwYXRoIGQ9Ik0xNiAxMHY2IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/folder-kanban
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
function List($$renderer, $$props) {
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
    ["path", { "d": "M3 5h.01" }],
    ["path", { "d": "M3 12h.01" }],
    ["path", { "d": "M3 19h.01" }],
    ["path", { "d": "M8 5h13" }],
    ["path", { "d": "M8 12h13" }],
    ["path", { "d": "M8 19h13" }]
  ];
  Icon($$renderer, spread_props([
    { name: "list" },
    $$sanitized_props,
    {
      /**
       * @component @name List
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyA1aC4wMSIgLz4KICA8cGF0aCBkPSJNMyAxMmguMDEiIC8+CiAgPHBhdGggZD0iTTMgMTloLjAxIiAvPgogIDxwYXRoIGQ9Ik04IDVoMTMiIC8+CiAgPHBhdGggZD0iTTggMTJoMTMiIC8+CiAgPHBhdGggZD0iTTggMTloMTMiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/list
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
    let enrichedItems, activeItems, archivedItems, statusGroups, resumo;
    const STATUS_COLUMNS = [
      {
        value: "novo",
        label: "A Fazer",
        colorClass: "bg-blue-600 text-white",
        bodyClass: "bg-blue-50/70"
      },
      {
        value: "agendado",
        label: "Fazendo",
        colorClass: "bg-amber-500 text-white",
        bodyClass: "bg-amber-50/80"
      },
      {
        value: "em_andamento",
        label: "Feito",
        colorClass: "bg-emerald-600 text-white",
        bodyClass: "bg-emerald-50/80"
      }
    ];
    const PRIORITY_OPTIONS = [
      { value: "alta", label: "Alta" },
      { value: "media", label: "Media" },
      { value: "baixa", label: "Baixa" }
    ];
    const CATEGORY_PALETTE = [
      "#d1007a",
      "#7a008f",
      "#d97706",
      "#d02a1e",
      "#facc15",
      "#2e7d32",
      "#2d9cdb",
      "#1e3a8a"
    ];
    const defaultTaskForm = () => ({
      titulo: "",
      descricao: "",
      categoria_id: "",
      prioridade: "media",
      status: "novo"
    });
    const defaultCategoryForm = () => ({ nome: "", cor: CATEGORY_PALETTE[0] });
    let loading = true;
    let errorMessage = null;
    let categorias = [];
    let itens = [];
    let searchQuery = "";
    let filtroStatus = "todas";
    let filtroPrioridade = "todas";
    let filtroCategoria = "todas";
    let taskModalOpen = false;
    let taskLoading = false;
    let taskSaving = false;
    let selectedTaskId = null;
    let taskForm = defaultTaskForm();
    let taskMeta = { arquivo: null, created_at: null, updated_at: null };
    let categoryModalOpen = false;
    let categorySaving = false;
    let selectedCategoryId = null;
    let categoryForm = defaultCategoryForm();
    let selectedCategoryLinkedCount = 0;
    function normalizeVisibleStatus(status) {
      if (status === "agendado") return "agendado";
      if (status === "em_andamento" || status === "concluido") return "em_andamento";
      return "novo";
    }
    function formatDateTime(value) {
      if (!value) return "-";
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return parsed.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    function getPriorityLabel(value) {
      return PRIORITY_OPTIONS.find((item) => item.value === value)?.label || "Media";
    }
    function getPriorityBadge(value) {
      if (value === "alta") return "red";
      if (value === "baixa") return "green";
      return "yellow";
    }
    function getStatusLabel(value) {
      return STATUS_COLUMNS.find((item) => item.value === value)?.label || "A Fazer";
    }
    function getCategoryColor(categoriaId) {
      return categorias.find((item) => item.id === categoriaId)?.cor || "#cbd5e1";
    }
    function getCategoryName(categoriaId) {
      return categorias.find((item) => item.id === categoriaId)?.nome || "Sem categoria";
    }
    function textColorFor(background) {
      const hex = String(background || "").replace("#", "");
      const normalized = hex.length === 3 ? hex.replace(/(.)/g, "$1$1") : hex;
      const numeric = Number.parseInt(normalized, 16);
      const r = numeric >> 16 & 255;
      const g = numeric >> 8 & 255;
      const b = numeric & 255;
      const yiq = (r * 299 + g * 587 + b * 114) / 1e3;
      return yiq >= 150 ? "#0f172a" : "#f8fafc";
    }
    async function loadBoard() {
      loading = true;
      errorMessage = null;
      try {
        const response = await fetch("/api/v1/todo/board", { credentials: "same-origin" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Erro ao carregar tarefas.");
        }
        categorias = Array.isArray(payload?.categorias) ? payload.categorias : [];
        itens = Array.isArray(payload?.itens) ? payload.itens : [];
      } catch (error) {
        console.error(error);
        errorMessage = error instanceof Error ? error.message : "Erro ao carregar tarefas.";
        categorias = [];
        itens = [];
      } finally {
        loading = false;
      }
    }
    function matchesFilters(item) {
      const query = searchQuery.trim().toLowerCase();
      if (query && !item.searchBlob.includes(query)) return false;
      return true;
    }
    function resetTaskModal() {
      selectedTaskId = null;
      taskForm = defaultTaskForm();
      taskMeta = { arquivo: null, created_at: null, updated_at: null };
      taskLoading = false;
    }
    function resetCategoryModal() {
      selectedCategoryId = null;
      categoryForm = defaultCategoryForm();
      selectedCategoryLinkedCount = 0;
    }
    function openNewTask() {
      resetTaskModal();
      taskModalOpen = true;
    }
    async function saveTask() {
      if (!taskForm.titulo.trim()) {
        toast.error("Informe o titulo da tarefa.");
        return;
      }
      taskSaving = true;
      try {
        const response = await fetch("/api/v1/todo/item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            id: selectedTaskId || void 0,
            titulo: taskForm.titulo,
            descricao: taskForm.descricao || null,
            categoria_id: taskForm.categoria_id || null,
            prioridade: taskForm.prioridade,
            status: taskForm.status
          })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Erro ao salvar tarefa.");
        }
        toast.success(selectedTaskId ? "Tarefa atualizada." : "Tarefa criada.");
        taskModalOpen = false;
        resetTaskModal();
        await loadBoard();
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Erro ao salvar tarefa.");
      } finally {
        taskSaving = false;
      }
    }
    function openNewCategory() {
      resetCategoryModal();
      categoryModalOpen = true;
    }
    enrichedItems = itens.map((item) => {
      const visibleStatus = normalizeVisibleStatus(item.status);
      const categoriaNome = getCategoryName(item.categoria_id);
      const categoriaCor = getCategoryColor(item.categoria_id);
      const prioridadeLabel = getPriorityLabel(item.prioridade);
      const statusLabel = getStatusLabel(visibleStatus);
      const createdAtLabel = formatDateTime(item.created_at);
      const updatedAtLabel = formatDateTime(item.updated_at || item.created_at);
      const enriched = {
        ...item,
        visibleStatus,
        categoriaNome,
        categoriaCor,
        prioridadeLabel,
        prioridadeBadge: getPriorityBadge(item.prioridade),
        statusLabel,
        createdAtLabel,
        updatedAtLabel,
        searchBlob: [
          item.titulo,
          item.descricao || "",
          categoriaNome,
          prioridadeLabel,
          statusLabel
        ].join(" ").toLowerCase()
      };
      return enriched;
    }).sort((left, right) => {
      const statusOrder = STATUS_COLUMNS.findIndex((item) => item.value === left.visibleStatus) - STATUS_COLUMNS.findIndex((item) => item.value === right.visibleStatus);
      if (statusOrder !== 0) return statusOrder;
      const priorityOrder = (value) => {
        if (value === "alta") return 0;
        if (value === "media") return 1;
        return 2;
      };
      const diff = priorityOrder(left.prioridade) - priorityOrder(right.prioridade);
      if (diff !== 0) return diff;
      return String(right.created_at || "").localeCompare(String(left.created_at || ""));
    });
    activeItems = enrichedItems.filter((item) => !item.arquivo && matchesFilters(item));
    archivedItems = enrichedItems.filter((item) => Boolean(item.arquivo) && matchesFilters(item));
    statusGroups = STATUS_COLUMNS.map((column) => ({
      ...column,
      items: activeItems.filter((item) => item.visibleStatus === column.value)
    }));
    resumo = {
      ativos: enrichedItems.filter((item) => !item.arquivo).length,
      aFazer: enrichedItems.filter((item) => !item.arquivo && item.visibleStatus === "novo").length,
      fazendo: enrichedItems.filter((item) => !item.arquivo && item.visibleStatus === "agendado").length,
      feitos: enrichedItems.filter((item) => !item.arquivo && item.visibleStatus === "em_andamento").length,
      arquivadas: enrichedItems.filter((item) => Boolean(item.arquivo)).length
    };
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("21el4x", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Tarefas | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Tarefas",
        subtitle: "Crie, categorize e acompanhe suas tarefas no board operacional do legado.",
        color: "operacao",
        breadcrumbs: [
          { label: "Operacao", href: "/operacao" },
          { label: "Tarefas" }
        ],
        actions: [
          {
            label: "Nova categoria",
            onClick: openNewCategory,
            variant: "secondary",
            icon: Tag
          },
          {
            label: "Nova tarefa",
            onClick: openNewTask,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid vtur-kpi-grid-5 mb-6">`);
      KPICard($$renderer3, {
        title: "Ativas",
        value: resumo.ativos,
        color: "operacao",
        icon: Square_check_big
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "A Fazer",
        value: resumo.aFazer,
        color: "operacao",
        icon: List
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "Fazendo",
        value: resumo.fazendo,
        color: "operacao",
        icon: Folder_kanban
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "Feitas",
        value: resumo.feitos,
        color: "operacao",
        icon: Layers
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "Arquivadas",
        value: resumo.arquivadas,
        color: "operacao",
        icon: Archive
      });
      $$renderer3.push(`<!----></div> `);
      Card($$renderer3, {
        color: "operacao",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="grid grid-cols-1 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))] gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1" for="todo-search">Busca</label> <div class="relative">`);
          Search($$renderer4, {
            size: 16,
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          });
          $$renderer4.push(`<!----> <input id="todo-search"${attr("value", searchQuery)} class="vtur-input w-full pl-9" placeholder="Titulo, descricao, categoria ou prioridade"/></div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="todo-status">Coluna</label> `);
          $$renderer4.select(
            {
              id: "todo-status",
              value: filtroStatus,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "todas" }, ($$renderer6) => {
                $$renderer6.push(`Todas`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(STATUS_COLUMNS);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let column = each_array[$$index];
                $$renderer5.option({ value: column.value }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(column.label)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="todo-priority">Prioridade</label> `);
          $$renderer4.select(
            {
              id: "todo-priority",
              value: filtroPrioridade,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "todas" }, ($$renderer6) => {
                $$renderer6.push(`Todas`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(PRIORITY_OPTIONS);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let option = each_array_1[$$index_1];
                $$renderer5.option({ value: option.value }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(option.label)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="todo-category">Categoria</label> `);
          $$renderer4.select(
            {
              id: "todo-category",
              value: filtroCategoria,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "todas" }, ($$renderer6) => {
                $$renderer6.push(`Todas`);
              });
              $$renderer5.option({ value: "sem_categoria" }, ($$renderer6) => {
                $$renderer6.push(`Sem categoria`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_2 = ensure_array_like(categorias);
              for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                let categoria = each_array_2[$$index_2];
                $$renderer5.option({ value: categoria.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(categoria.nome)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="todo-view">Visualizacao</label> <div class="flex gap-2"><button id="todo-view" type="button"${attr_class(`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${stringify(
            "border-operacao-300 bg-operacao-50 text-operacao-700"
          )}`)}>Kanban</button> <button type="button"${attr_class(`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${stringify("border-slate-200 text-slate-600 hover:bg-slate-50")}`)}>Lista</button></div></div></div> <div class="mt-4 flex flex-wrap gap-2">`);
          Button($$renderer4, {
            variant: "ghost",
            size: "sm",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Limpar filtros`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            variant: "secondary",
            size: "sm",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Atualizar board`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Card($$renderer3, {
        color: "operacao",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="flex items-center justify-between gap-3 mb-4"><div><h3 class="text-lg font-semibold text-slate-900">Categorias</h3> <p class="text-sm text-slate-500">Mesmo fluxo do legado: categorias por usuario para organizar o board.</p></div> `);
          Button($$renderer4, {
            variant: "secondary",
            size: "sm",
            children: ($$renderer5) => {
              Plus($$renderer5, { size: 14, class: "mr-1.5" });
              $$renderer5.push(`<!----> Nova categoria`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div> `);
          if (categorias.length === 0) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">Nenhuma categoria cadastrada. Crie categorias para agrupar tarefas como no board do \`vtur-app\`.</div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
            $$renderer4.push(`<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"><!--[-->`);
            const each_array_3 = ensure_array_like(categorias);
            for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
              let categoria = each_array_3[$$index_3];
              $$renderer4.push(`<button type="button" class="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-operacao-200 hover:shadow-md"><div class="flex items-start justify-between gap-3"><div class="flex items-center gap-3 min-w-0"><span class="inline-block h-4 w-4 rounded-full border border-white/30"${attr_style(`background:${stringify(categoria.cor || "#cbd5e1")}`)}></span> <div class="min-w-0"><h4 class="font-semibold text-slate-900 truncate">${escape_html(categoria.nome)}</h4> <p class="text-xs text-slate-500">Clique para editar cor e nome</p></div></div> <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">${escape_html(itens.filter((item) => item.categoria_id === categoria.id).length)}</span></div></button>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Card($$renderer3, {
        color: "operacao",
        class: "mb-6",
        padding: "none",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="border-b border-slate-100 px-5 py-4"><h3 class="text-lg font-semibold text-slate-900">Board de tarefas</h3> <p class="text-sm text-slate-500">`);
          {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`Clique no card para abrir o registro e editar status, prioridade, categoria e arquivo.`);
          }
          $$renderer4.push(`<!--]--></p></div> `);
          if (loading) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="flex items-center justify-center gap-3 py-16 text-slate-500">`);
            Loader_circle($$renderer4, { size: 20, class: "animate-spin" });
            $$renderer4.push(`<!----> Carregando board...</div>`);
          } else if (errorMessage) {
            $$renderer4.push("<!--[1-->");
            $$renderer4.push(`<div class="px-5 py-8 text-sm text-red-600">${escape_html(errorMessage)}</div>`);
          } else if (activeItems.length === 0) {
            $$renderer4.push("<!--[2-->");
            $$renderer4.push(`<div class="px-5 py-12 text-center text-slate-500">Nenhuma tarefa ativa encontrada com os filtros atuais.</div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
            $$renderer4.push(`<div class="grid grid-cols-1 xl:grid-cols-3 gap-4 p-5"><!--[-->`);
            const each_array_4 = ensure_array_like(statusGroups);
            for (let $$index_5 = 0, $$length = each_array_4.length; $$index_5 < $$length; $$index_5++) {
              let group = each_array_4[$$index_5];
              $$renderer4.push(`<div class="rounded-2xl border border-slate-200 bg-slate-50/80 overflow-hidden"><div${attr_class(`flex items-center justify-between px-4 py-3 ${stringify(group.colorClass)}`)}><div><h4 class="font-semibold">${escape_html(group.label)}</h4> <p class="text-xs text-white/80">${escape_html(group.items.length)} tarefa(s)</p></div></div> <div${attr_class(`p-3 space-y-3 min-h-[14rem] ${stringify(group.bodyClass)}`)}>`);
              if (group.items.length === 0) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<div class="rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">Nenhum item nesta coluna.</div>`);
              } else {
                $$renderer4.push("<!--[-1-->");
                $$renderer4.push(`<!--[-->`);
                const each_array_5 = ensure_array_like(group.items);
                for (let $$index_4 = 0, $$length2 = each_array_5.length; $$index_4 < $$length2; $$index_4++) {
                  let item = each_array_5[$$index_4];
                  $$renderer4.push(`<button type="button" class="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-operacao-200 hover:shadow-md"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><h5 class="font-semibold text-slate-900 truncate">${escape_html(item.titulo)}</h5> <div class="mt-2 flex flex-wrap items-center gap-2"><span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"${attr_style(`background:${stringify(item.categoriaCor)}; color:${stringify(textColorFor(item.categoriaCor))}`)}>${escape_html(item.categoriaNome)}</span> `);
                  Badge($$renderer4, {
                    color: item.prioridadeBadge,
                    size: "sm",
                    children: ($$renderer5) => {
                      $$renderer5.push(`<!---->${escape_html(item.prioridadeLabel)}`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer4.push(`<!----></div></div> <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">${escape_html(item.updatedAtLabel)}</span></div> `);
                  if (item.descricao) {
                    $$renderer4.push("<!--[0-->");
                    $$renderer4.push(`<p class="mt-3 line-clamp-2 text-sm text-slate-600">${escape_html(item.descricao)}</p>`);
                  } else {
                    $$renderer4.push("<!--[-1-->");
                  }
                  $$renderer4.push(`<!--]--></button>`);
                }
                $$renderer4.push(`<!--]-->`);
              }
              $$renderer4.push(`<!--]--></div></div>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Card($$renderer3, {
        color: "operacao",
        children: ($$renderer4) => {
          $$renderer4.push(`<button type="button" class="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"><div><h3 class="font-semibold text-slate-900">Arquivadas</h3> <p class="text-sm text-slate-500">Mesmo comportamento do board legado para restaurar historico de tarefas.</p></div> <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">${escape_html(archivedItems.length)}</span></button> `);
          {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: selectedTaskId ? "Detalhe da tarefa" : "Nova tarefa",
        color: "operacao",
        size: "lg",
        showCancel: true,
        cancelText: "Fechar",
        showConfirm: !taskLoading,
        confirmText: selectedTaskId ? "Salvar alteracoes" : "Criar tarefa",
        loading: taskSaving,
        onCancel: () => {
          taskModalOpen = false;
          resetTaskModal();
        },
        onConfirm: saveTask,
        get open() {
          return taskModalOpen;
        },
        set open($$value) {
          taskModalOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          if (taskLoading) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="flex items-center justify-center gap-3 py-10 text-slate-500">`);
            Loader_circle($$renderer4, { size: 18, class: "animate-spin" });
            $$renderer4.push(`<!----> Carregando tarefa...</div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
            $$renderer4.push(`<div class="space-y-5"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="md:col-span-2"><label class="block text-sm font-medium text-slate-700 mb-1" for="task-title">Titulo</label> <input id="task-title"${attr("value", taskForm.titulo)} class="vtur-input w-full" placeholder="Descreva a tarefa"/></div> <div class="md:col-span-2"><label class="block text-sm font-medium text-slate-700 mb-1" for="task-description">Descricao</label> <textarea id="task-description" class="vtur-input w-full" rows="4" placeholder="Observacoes da tarefa">`);
            const $$body = escape_html(taskForm.descricao);
            if ($$body) {
              $$renderer4.push(`${$$body}`);
            }
            $$renderer4.push(`</textarea></div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="task-category">Categoria</label> `);
            $$renderer4.select(
              {
                id: "task-category",
                value: taskForm.categoria_id,
                class: "vtur-input w-full"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: "" }, ($$renderer6) => {
                  $$renderer6.push(`Sem categoria`);
                });
                $$renderer5.push(`<!--[-->`);
                const each_array_6 = ensure_array_like(categorias);
                for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
                  let categoria = each_array_6[$$index_6];
                  $$renderer5.option({ value: categoria.id }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(categoria.nome)}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
            $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="task-priority">Prioridade</label> `);
            $$renderer4.select(
              {
                id: "task-priority",
                value: taskForm.prioridade,
                class: "vtur-input w-full"
              },
              ($$renderer5) => {
                $$renderer5.push(`<!--[-->`);
                const each_array_7 = ensure_array_like(PRIORITY_OPTIONS);
                for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
                  let option = each_array_7[$$index_7];
                  $$renderer5.option({ value: option.value }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(option.label)}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
            $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="task-status">Status</label> `);
            $$renderer4.select(
              {
                id: "task-status",
                value: taskForm.status,
                class: "vtur-input w-full"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: "novo" }, ($$renderer6) => {
                  $$renderer6.push(`A Fazer`);
                });
                $$renderer5.option({ value: "agendado" }, ($$renderer6) => {
                  $$renderer6.push(`Fazendo`);
                });
                $$renderer5.option({ value: "em_andamento" }, ($$renderer6) => {
                  $$renderer6.push(`Feito`);
                });
                $$renderer5.option({ value: "concluido" }, ($$renderer6) => {
                  $$renderer6.push(`Concluido`);
                });
              }
            );
            $$renderer4.push(`</div> <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p class="text-sm font-medium text-slate-700">Fluxo atual</p> <div class="mt-2 flex flex-wrap gap-2">`);
            Badge($$renderer4, {
              color: getPriorityBadge(taskForm.prioridade),
              size: "sm",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->${escape_html(getPriorityLabel(taskForm.prioridade))}`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            Badge($$renderer4, {
              color: "operacao",
              size: "sm",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->${escape_html(getStatusLabel(normalizeVisibleStatus(taskForm.status)))}`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            if (taskMeta.arquivo) {
              $$renderer4.push("<!--[0-->");
              Badge($$renderer4, {
                color: "gray",
                size: "sm",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Arquivada`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div></div></div> `);
            if (selectedTaskId) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><h4 class="text-sm font-semibold text-slate-900 mb-2">Historico do registro</h4> <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600"><div><span class="block text-xs uppercase tracking-wide text-slate-400">Criada em</span> <strong class="text-slate-900">${escape_html(formatDateTime(taskMeta.created_at))}</strong></div> <div><span class="block text-xs uppercase tracking-wide text-slate-400">Ultima atualizacao</span> <strong class="text-slate-900">${escape_html(formatDateTime(taskMeta.updated_at || taskMeta.created_at))}</strong></div></div></div>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div>`);
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: {
          default: true,
          actions: ($$renderer4) => {
            {
              if (selectedTaskId && !taskLoading) {
                $$renderer4.push("<!--[0-->");
                Button($$renderer4, {
                  variant: "ghost",
                  children: ($$renderer5) => {
                    if (taskMeta.arquivo) {
                      $$renderer5.push("<!--[0-->");
                      $$renderer5.push(`Restaurar`);
                    } else {
                      $$renderer5.push("<!--[-1-->");
                      $$renderer5.push(`Arquivar`);
                    }
                    $$renderer5.push(`<!--]-->`);
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!----> `);
                Button($$renderer4, {
                  variant: "danger",
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->Excluir`);
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!---->`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]-->`);
            }
          }
        }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: selectedCategoryId ? "Editar categoria" : "Nova categoria",
        color: "operacao",
        showCancel: true,
        cancelText: "Fechar",
        showConfirm: false,
        loading: categorySaving,
        onCancel: () => {
          categoryModalOpen = false;
          resetCategoryModal();
        },
        get open() {
          return categoryModalOpen;
        },
        set open($$value) {
          categoryModalOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-5"><div><label class="block text-sm font-medium text-slate-700 mb-1" for="category-name">Nome</label> <input id="category-name"${attr("value", categoryForm.nome)} class="vtur-input w-full" placeholder="Nome da categoria"/></div> <div><p class="block text-sm font-medium text-slate-700 mb-2">Cor</p> <div class="grid grid-cols-4 gap-2"><!--[-->`);
          const each_array_8 = ensure_array_like(CATEGORY_PALETTE);
          for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
            let color = each_array_8[$$index_8];
            $$renderer4.push(`<button type="button"${attr_class(`h-10 rounded-xl border transition ${stringify(categoryForm.cor === color ? "border-slate-900 ring-2 ring-slate-200" : "border-slate-200")}`)}${attr_style(`background:${stringify(color)}`)}${attr("aria-label", `Selecionar cor ${color}`)}></button>`);
          }
          $$renderer4.push(`<!--]--></div></div> <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p class="text-sm font-medium text-slate-700">Vinculos atuais</p> <p class="mt-1 text-sm text-slate-600">${escape_html(selectedCategoryLinkedCount)} tarefa(s) vinculada(s) a esta categoria.</p></div></div>`);
        },
        $$slots: {
          default: true,
          actions: ($$renderer4) => {
            {
              Button($$renderer4, {
                variant: "primary",
                loading: categorySaving,
                children: ($$renderer5) => {
                  if (selectedCategoryId) {
                    $$renderer5.push("<!--[0-->");
                    $$renderer5.push(`Salvar categoria`);
                  } else {
                    $$renderer5.push("<!--[-1-->");
                    $$renderer5.push(`Criar categoria`);
                  }
                  $$renderer5.push(`<!--]-->`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              if (selectedCategoryId) {
                $$renderer4.push("<!--[0-->");
                Button($$renderer4, {
                  variant: "danger",
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->Excluir`);
                  },
                  $$slots: { default: true }
                });
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]-->`);
            }
          }
        }
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
