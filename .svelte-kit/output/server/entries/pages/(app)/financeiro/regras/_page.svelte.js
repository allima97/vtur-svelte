import { c as sanitize_props, o as spread_props, k as slot, h as head, e as escape_html, q as attr, t as ensure_array_like, p as attr_class, v as stringify } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { C as Circle_check } from "../../../../../chunks/circle-check.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { P as Percent } from "../../../../../chunks/percent.js";
import { L as Loader_circle } from "../../../../../chunks/loader-circle.js";
import { P as Pen } from "../../../../../chunks/pen.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function Circle_off($$renderer, $$props) {
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
    ["path", { "d": "m2 2 20 20" }],
    ["path", { "d": "M8.35 2.69A10 10 0 0 1 21.3 15.65" }],
    ["path", { "d": "M19.08 19.08A10 10 0 1 1 4.92 4.92" }]
  ];
  Icon($$renderer, spread_props([
    { name: "circle-off" },
    $$sanitized_props,
    {
      /**
       * @component @name CircleOff
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMiAyIDIwIDIwIiAvPgogIDxwYXRoIGQ9Ik04LjM1IDIuNjlBMTAgMTAgMCAwIDEgMjEuMyAxNS42NSIgLz4KICA8cGF0aCBkPSJNMTkuMDggMTkuMDhBMTAgMTAgMCAxIDEgNC45MiA0LjkyIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/circle-off
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
function Git_branch($$renderer, $$props) {
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
    ["path", { "d": "M15 6a9 9 0 0 0-9 9V3" }],
    ["circle", { "cx": "18", "cy": "6", "r": "3" }],
    ["circle", { "cx": "6", "cy": "18", "r": "3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "git-branch" },
    $$sanitized_props,
    {
      /**
       * @component @name GitBranch
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTUgNmE5IDkgMCAwIDAtOSA5VjMiIC8+CiAgPGNpcmNsZSBjeD0iMTgiIGN5PSI2IiByPSIzIiAvPgogIDxjaXJjbGUgY3g9IjYiIGN5PSIxOCIgcj0iMyIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/git-branch
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
    let activeRules, inactiveRules, escalonaveis, totalTiers;
    const percentFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const faixas = ["PRE", "POS"];
    const emptyForm = () => ({
      nome: "",
      descricao: "",
      tipo: "GERAL",
      meta_nao_atingida: 0,
      meta_atingida: 0,
      super_meta: 0,
      ativo: true,
      tiers: []
    });
    let rules = [];
    let loading = true;
    let saving = false;
    let actionLoading = false;
    let showForm = false;
    let editId = null;
    let errorMessage = "";
    let validationError = "";
    let form = emptyForm();
    let confirmOpen = false;
    let confirmMode = "inativar";
    let selectedRule = null;
    function normalizeNumber(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    function cloneTiers(tiers) {
      return (tiers || []).map((tier) => ({
        id: tier.id,
        faixa: tier.faixa === "POS" ? "POS" : "PRE",
        de_pct: normalizeNumber(tier.de_pct),
        ate_pct: normalizeNumber(tier.ate_pct),
        inc_pct_meta: normalizeNumber(tier.inc_pct_meta),
        inc_pct_comissao: normalizeNumber(tier.inc_pct_comissao)
      }));
    }
    function normalizeRule(raw) {
      return {
        id: String(raw?.id || ""),
        nome: String(raw?.nome || ""),
        descricao: raw?.descricao ? String(raw.descricao) : null,
        tipo: raw?.tipo === "ESCALONAVEL" ? "ESCALONAVEL" : "GERAL",
        meta_nao_atingida: normalizeNumber(raw?.meta_nao_atingida),
        meta_atingida: normalizeNumber(raw?.meta_atingida),
        super_meta: normalizeNumber(raw?.super_meta),
        ativo: Boolean(raw?.ativo),
        commission_tier: cloneTiers(raw?.commission_tier)
      };
    }
    async function requestApi(method, body) {
      const response = await fetch("/api/v1/parametros/commission-rules", {
        method,
        headers: method === "GET" ? void 0 : { "Content-Type": "application/json" },
        body: method === "GET" ? void 0 : JSON.stringify(body || {})
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || "Erro ao processar regras de comissão.");
      }
      return text ? JSON.parse(text) : null;
    }
    async function loadRules() {
      loading = true;
      errorMessage = "";
      try {
        const data = await requestApi("GET");
        rules = Array.isArray(data) ? data.map((rule) => normalizeRule(rule)) : [];
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao carregar regras de comissão.";
        errorMessage = message;
        rules = [];
        toast.error(message);
      } finally {
        loading = false;
      }
    }
    function formatPercent(value) {
      return percentFormatter.format(normalizeNumber(value));
    }
    function resetForm() {
      form = emptyForm();
      editId = null;
      validationError = "";
      errorMessage = "";
    }
    function openCreateForm() {
      resetForm();
      showForm = true;
    }
    function closeConfirm() {
      confirmOpen = false;
      selectedRule = null;
      actionLoading = false;
    }
    async function confirmRuleAction() {
      if (!selectedRule || actionLoading) return;
      actionLoading = true;
      try {
        if (confirmMode === "inativar") {
          await requestApi("PATCH", { id: selectedRule.id, ativo: false });
          toast.success("Regra inativada com sucesso.");
        }
        await loadRules();
        closeConfirm();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao inativar regra.";
        errorMessage = message;
        toast.error(message);
        actionLoading = false;
      }
    }
    function getSortedTiers(rule, faixa) {
      return cloneTiers(rule.commission_tier).filter((tier) => tier.faixa === faixa).sort((left, right) => left.de_pct - right.de_pct);
    }
    activeRules = rules.filter((rule) => rule.ativo).length;
    inactiveRules = rules.filter((rule) => !rule.ativo).length;
    escalonaveis = rules.filter((rule) => rule.tipo === "ESCALONAVEL").length;
    totalTiers = rules.reduce((total, rule) => total + (rule.commission_tier?.length || 0), 0);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("11wg765", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Regras de Comissão | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Regras de Comissão",
        subtitle: "Defina percentuais fixos ou faixas escalonáveis compartilhadas pela operação.",
        color: "financeiro",
        breadcrumbs: [
          { label: "Financeiro", href: "/financeiro" },
          { label: "Regras" }
        ],
        actions: showForm ? [] : [
          {
            label: "Nova Regra",
            onClick: openCreateForm,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
      Circle_check($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Regras Ativas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(activeRules)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
      Circle_off($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Regras Inativas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(inactiveRules)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
      Git_branch($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Escalonáveis</p> <p class="text-2xl font-bold text-slate-900">${escape_html(escalonaveis)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
      Percent($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Faixas Cadastradas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(totalTiers)}</p></div></div></div> `);
      if (errorMessage) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">${escape_html(errorMessage)}</div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (showForm) {
        $$renderer3.push("<!--[0-->");
        Card($$renderer3, {
          title: editId ? "Editar regra de comissão" : "Nova regra de comissão",
          color: "financeiro",
          class: "mb-6",
          children: ($$renderer4) => {
            $$renderer4.push(`<form class="space-y-5"><div class="grid grid-cols-1 gap-4 xl:grid-cols-4"><div class="xl:col-span-2"><label for="regra-nome" class="mb-1 block text-sm font-medium text-slate-700">Nome *</label> <input id="regra-nome" type="text"${attr("value", form.nome)} class="vtur-input w-full" placeholder="Ex: Comissão padrão comercial"/></div> <div><label for="regra-tipo" class="mb-1 block text-sm font-medium text-slate-700">Tipo</label> `);
            $$renderer4.select(
              {
                id: "regra-tipo",
                value: form.tipo,
                class: "vtur-input w-full"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: "GERAL" }, ($$renderer6) => {
                  $$renderer6.push(`Geral (percentuais fixos)`);
                });
                $$renderer5.option({ value: "ESCALONAVEL" }, ($$renderer6) => {
                  $$renderer6.push(`Escalonável (faixas PRE/POS)`);
                });
              }
            );
            $$renderer4.push(`</div> <div class="flex items-end"><label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><input type="checkbox"${attr("checked", form.ativo, true)} class="rounded border-slate-300 text-financeiro-600 focus:ring-financeiro-500"/> Regra ativa</label></div> <div><label for="meta-nao-atingida" class="mb-1 block text-sm font-medium text-slate-700">Meta não atingida (%)</label> <input id="meta-nao-atingida" type="number" step="0.01"${attr("value", form.meta_nao_atingida)} class="vtur-input w-full"/></div> <div><label for="meta-atingida" class="mb-1 block text-sm font-medium text-slate-700">Meta atingida (%)</label> <input id="meta-atingida" type="number" step="0.01"${attr("value", form.meta_atingida)} class="vtur-input w-full"/></div> <div><label for="super-meta" class="mb-1 block text-sm font-medium text-slate-700">Super meta (%)</label> <input id="super-meta" type="number" step="0.01"${attr("value", form.super_meta)} class="vtur-input w-full"/></div> <div class="xl:col-span-4"><label for="regra-descricao" class="mb-1 block text-sm font-medium text-slate-700">Descrição</label> <textarea id="regra-descricao" rows="3" class="vtur-input w-full" placeholder="Contexto de uso, equipe atendida e observações da regra.">`);
            const $$body = escape_html(form.descricao);
            if ($$body) {
              $$renderer4.push(`${$$body}`);
            }
            $$renderer4.push(`</textarea></div></div> `);
            if (validationError) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">${escape_html(validationError)}</div>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            if (form.tipo === "ESCALONAVEL") {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<div class="rounded-[18px] border border-financeiro-200 bg-financeiro-50/40 p-4"><div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 class="text-base font-semibold text-slate-900">Faixas escalonáveis</h3> <p class="text-sm text-slate-500">Monte faixas PRE e POS sem sobreposição de intervalos.</p></div> <div class="flex flex-wrap gap-2">`);
              Button($$renderer4, {
                type: "button",
                size: "sm",
                variant: "secondary",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->+ Faixa PRE`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              Button($$renderer4, {
                type: "button",
                size: "sm",
                variant: "primary",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->+ Faixa POS`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----></div></div> `);
              if (form.tiers.length === 0) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<div class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">Nenhuma faixa adicionada ainda.</div>`);
              } else {
                $$renderer4.push("<!--[-1-->");
                $$renderer4.push(`<div class="overflow-x-auto"><table class="min-w-full divide-y divide-slate-200 text-sm"><thead class="bg-white/70"><tr class="text-left text-slate-600"><th class="px-3 py-2 font-medium">Faixa</th><th class="px-3 py-2 font-medium">De (%)</th><th class="px-3 py-2 font-medium">Até (%)</th><th class="px-3 py-2 font-medium">Inc. Meta (%)</th><th class="px-3 py-2 font-medium">Inc. Comissão (%)</th><th class="px-3 py-2 font-medium text-right">Ações</th></tr></thead><tbody class="divide-y divide-slate-200 bg-white"><!--[-->`);
                const each_array = ensure_array_like(form.tiers);
                for (let index = 0, $$length = each_array.length; index < $$length; index++) {
                  let tier = each_array[index];
                  $$renderer4.push(`<tr><td class="px-3 py-2">`);
                  $$renderer4.select({ class: "vtur-input min-w-[110px]", value: tier.faixa }, ($$renderer5) => {
                    $$renderer5.option({ value: "PRE" }, ($$renderer6) => {
                      $$renderer6.push(`PRE`);
                    });
                    $$renderer5.option({ value: "POS" }, ($$renderer6) => {
                      $$renderer6.push(`POS`);
                    });
                  });
                  $$renderer4.push(`</td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.de_pct)} class="vtur-input min-w-[120px]"/></td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.ate_pct)} class="vtur-input min-w-[120px]"/></td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.inc_pct_meta)} class="vtur-input min-w-[140px]"/></td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.inc_pct_comissao)} class="vtur-input min-w-[160px]"/></td><td class="px-3 py-2 text-right">`);
                  Button($$renderer4, {
                    type: "button",
                    size: "sm",
                    variant: "danger",
                    children: ($$renderer5) => {
                      $$renderer5.push(`<!---->Remover`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer4.push(`<!----></td></tr>`);
                }
                $$renderer4.push(`<!--]--></tbody></table></div>`);
              }
              $$renderer4.push(`<!--]--></div>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> <div class="flex flex-wrap justify-end gap-3">`);
            Button($$renderer4, {
              type: "button",
              variant: "secondary",
              disabled: saving,
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Cancelar`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            Button($$renderer4, {
              type: "submit",
              variant: "primary",
              loading: saving,
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->${escape_html(editId ? "Salvar alterações" : "Salvar regra")}`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div></form>`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      Card($$renderer3, {
        title: "Regras cadastradas",
        color: "financeiro",
        children: ($$renderer4) => {
          if (loading) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="flex items-center justify-center gap-3 py-10 text-slate-500">`);
            Loader_circle($$renderer4, { size: 20, class: "animate-spin" });
            $$renderer4.push(`<!----> Carregando regras...</div>`);
          } else if (rules.length === 0) {
            $$renderer4.push("<!--[1-->");
            $$renderer4.push(`<div class="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500">`);
            Percent($$renderer4, { size: 42, class: "mx-auto mb-3 opacity-40" });
            $$renderer4.push(`<!----> <p class="font-medium text-slate-700">Nenhuma regra cadastrada</p> <p class="mt-1 text-sm">Crie a primeira regra para estruturar percentuais e faixas da operação.</p> `);
            if (!showForm) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<div class="mt-4">`);
              Button($$renderer4, {
                type: "button",
                variant: "primary",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Criar primeira regra`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----></div>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
            $$renderer4.push(`<div class="space-y-4"><!--[-->`);
            const each_array_1 = ensure_array_like(rules);
            for (let $$index_3 = 0, $$length = each_array_1.length; $$index_3 < $$length; $$index_3++) {
              let rule = each_array_1[$$index_3];
              $$renderer4.push(`<div class="rounded-[18px] border border-slate-200 bg-slate-50/60 p-4"><div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div class="min-w-0 flex-1 space-y-4"><div class="flex flex-wrap items-center gap-2"><h3 class="text-lg font-semibold text-slate-900">${escape_html(rule.nome)}</h3> <span class="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">${escape_html(rule.tipo === "ESCALONAVEL" ? "Escalonável" : "Geral")}</span> <span${attr_class(`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stringify(rule.ativo ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700")}`)}>${escape_html(rule.ativo ? "Ativa" : "Inativa")}</span></div> `);
              if (rule.descricao) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<p class="text-sm text-slate-600">${escape_html(rule.descricao)}</p>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--> <div class="grid grid-cols-1 gap-3 md:grid-cols-3"><div class="rounded-xl border border-slate-200 bg-white px-3 py-3"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Meta não atingida</p> <p class="mt-1 text-lg font-semibold text-slate-900">${escape_html(formatPercent(rule.meta_nao_atingida))}%</p></div> <div class="rounded-xl border border-slate-200 bg-white px-3 py-3"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Meta atingida</p> <p class="mt-1 text-lg font-semibold text-slate-900">${escape_html(formatPercent(rule.meta_atingida))}%</p></div> <div class="rounded-xl border border-slate-200 bg-white px-3 py-3"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Super meta</p> <p class="mt-1 text-lg font-semibold text-slate-900">${escape_html(formatPercent(rule.super_meta))}%</p></div></div> `);
              if (rule.tipo === "ESCALONAVEL") {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<div class="grid grid-cols-1 gap-4 lg:grid-cols-2"><!--[-->`);
                const each_array_2 = ensure_array_like(faixas);
                for (let $$index_2 = 0, $$length2 = each_array_2.length; $$index_2 < $$length2; $$index_2++) {
                  let faixa = each_array_2[$$index_2];
                  $$renderer4.push(`<div class="rounded-xl border border-slate-200 bg-white p-3"><div class="mb-2 flex items-center justify-between"><p class="text-sm font-semibold text-slate-900">Faixas ${escape_html(faixa)}</p> <span class="text-xs text-slate-500">${escape_html(getSortedTiers(rule, faixa).length)} faixa(s)</span></div> `);
                  if (getSortedTiers(rule, faixa).length === 0) {
                    $$renderer4.push("<!--[0-->");
                    $$renderer4.push(`<p class="text-sm text-slate-500">Nenhuma faixa ${escape_html(faixa)} cadastrada.</p>`);
                  } else {
                    $$renderer4.push("<!--[-1-->");
                    $$renderer4.push(`<div class="space-y-2"><!--[-->`);
                    const each_array_3 = ensure_array_like(getSortedTiers(rule, faixa));
                    for (let $$index_1 = 0, $$length3 = each_array_3.length; $$index_1 < $$length3; $$index_1++) {
                      let tier = each_array_3[$$index_1];
                      $$renderer4.push(`<div class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><div class="flex flex-wrap items-center justify-between gap-2"><span class="font-medium">${escape_html(formatPercent(tier.de_pct))}% até ${escape_html(formatPercent(tier.ate_pct))}%</span> <span class="text-slate-500">Meta +${escape_html(formatPercent(tier.inc_pct_meta))}% | Comissão +${escape_html(formatPercent(tier.inc_pct_comissao))}%</span></div></div>`);
                    }
                    $$renderer4.push(`<!--]--></div>`);
                  }
                  $$renderer4.push(`<!--]--></div>`);
                }
                $$renderer4.push(`<!--]--></div>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></div> <div class="flex flex-wrap gap-2 xl:justify-end">`);
              Button($$renderer4, {
                type: "button",
                size: "sm",
                variant: "secondary",
                children: ($$renderer5) => {
                  Pen($$renderer5, { size: 16, class: "mr-1" });
                  $$renderer5.push(`<!----> Editar`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              if (rule.ativo) {
                $$renderer4.push("<!--[0-->");
                Button($$renderer4, {
                  type: "button",
                  size: "sm",
                  variant: "outline",
                  children: ($$renderer5) => {
                    Circle_off($$renderer5, { size: 16, class: "mr-1" });
                    $$renderer5.push(`<!----> Inativar`);
                  },
                  $$slots: { default: true }
                });
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--> `);
              Button($$renderer4, {
                type: "button",
                size: "sm",
                variant: "danger",
                children: ($$renderer5) => {
                  Trash_2($$renderer5, { size: 16, class: "mr-1" });
                  $$renderer5.push(`<!----> Excluir`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----></div></div></div>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Inativar regra",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Inativar",
        confirmVariant: "danger",
        loading: actionLoading,
        onCancel: closeConfirm,
        onConfirm: confirmRuleAction,
        get open() {
          return confirmOpen;
        },
        set open($$value) {
          confirmOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          if (selectedRule) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="space-y-3 text-sm text-slate-600"><p>`);
            {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`A regra <strong class="text-slate-900">${escape_html(selectedRule.nome)}</strong> será marcada como inativa e deixará de ser considerada na operação.`);
            }
            $$renderer4.push(`<!--]--></p> <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"><p><strong>Tipo:</strong> ${escape_html(selectedRule.tipo === "ESCALONAVEL" ? "Escalonável" : "Geral")}</p> <p><strong>Faixas:</strong> ${escape_html(selectedRule.commission_tier?.length || 0)}</p></div></div>`);
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
