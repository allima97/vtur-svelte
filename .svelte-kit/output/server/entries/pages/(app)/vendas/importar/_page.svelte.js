import { c as sanitize_props, o as spread_props, k as slot, b as store_get, u as unsubscribe_stores, h as head, p as attr_class, e as escape_html, t as ensure_array_like, q as attr } from "../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
/* empty css                                                               */
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import "../../../../../chunks/ui.js";
import { p as permissoes } from "../../../../../chunks/permissoes.js";
import { c as createSupabaseBrowserClient } from "../../../../../chunks/supabase.js";
import { A as Arrow_left } from "../../../../../chunks/arrow-left.js";
import { F as File_spreadsheet } from "../../../../../chunks/file-spreadsheet.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { E as Eye } from "../../../../../chunks/eye.js";
import { U as Upload } from "../../../../../chunks/upload.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
import { M as Map_pin } from "../../../../../chunks/map-pin.js";
import { C as Calendar } from "../../../../../chunks/calendar.js";
import { C as Circle_check_big } from "../../../../../chunks/circle-check-big.js";
function Ship($$renderer, $$props) {
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
    ["path", { "d": "M12 10.189V14" }],
    ["path", { "d": "M12 2v3" }],
    ["path", { "d": "M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" }],
    [
      "path",
      {
        "d": "M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"
      }
    ],
    [
      "path",
      {
        "d": "M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "ship" },
    $$sanitized_props,
    {
      /**
       * @component @name Ship
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgMTAuMTg5VjE0IiAvPgogIDxwYXRoIGQ9Ik0xMiAydjMiIC8+CiAgPHBhdGggZD0iTTE5IDEzVjdhMiAyIDAgMCAwLTItMkg3YTIgMiAwIDAgMC0yIDJ2NiIgLz4KICA8cGF0aCBkPSJNMTkuMzggMjBBMTEuNiAxMS42IDAgMCAwIDIxIDE0bC04LjE4OC0zLjYzOWEyIDIgMCAwIDAtMS42MjQgMEwzIDE0YTExLjYgMTEuNiAwIDAgMCAyLjgxIDcuNzYiIC8+CiAgPHBhdGggZD0iTTIgMjFjLjYuNSAxLjIgMSAyLjUgMSAyLjUgMCAyLjUtMiA1LTIgMS4zIDAgMS45LjUgMi41IDFzMS4yIDEgMi41IDFjMi41IDAgMi41LTIgNS0yIDEuMyAwIDEuOS41IDIuNSAxIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/ship
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
    var $$store_subs;
    let produtosFiltrados, principal;
    let textInput = "";
    let contratos = [];
    let principalIndex = 0;
    let extracting = false;
    let saving = false;
    let previewOpen = false;
    let previewText = "";
    let previewing = false;
    let produtos = [];
    let tiposPacote = [];
    let buscaCidade = "";
    let cidadeId = "";
    let cidadeNome = "";
    let cidadeSelecionadaLabel = "";
    let buscaDestino = "";
    let dataVenda = "";
    let contatoModalOpen = false;
    let contatoTelefone = "";
    let contatoWhatsapp = "";
    let contatoEmail = "";
    let cidadeAutoIndefinida = false;
    async function forcarCidadeIndefinida() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("cidades").select("id, nome").ilike("nome", "Indefinida").maybeSingle();
      if (data?.id) {
        cidadeAutoIndefinida = true;
        cidadeId = data.id;
        cidadeNome = data.nome;
        cidadeSelecionadaLabel = data.nome;
        buscaCidade = data.nome;
      }
    }
    async function buscarCidadeInicial(termo) {
      if (!termo || termo.length < 2) return;
      try {
        const response = await fetch(`/api/v1/vendas/cidades-busca?q=${encodeURIComponent(termo)}&limite=10`);
        if (response.ok) {
          const payload = await response.json();
          const items = Array.isArray(payload?.items) ? payload.items : [];
          if (items.length > 0) {
            const first = items[0];
            cidadeId = first.id;
            cidadeNome = first.nome;
            cidadeSelecionadaLabel = first.subdivisao_nome ? `${first.nome} (${first.subdivisao_nome})` : first.nome;
            buscaCidade = cidadeSelecionadaLabel;
          }
        }
      } catch {
      } finally {
      }
    }
    function formatCurrency(value) {
      if (value == null || Number.isNaN(Number(value))) return "-";
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
    }
    function formatDate(value) {
      if (!value) return "-";
      const base = value.includes("T") ? value.split("T")[0] : value;
      if (base.includes("/")) return base;
      const parts = base.split("-");
      if (parts.length !== 3) return base;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    function normalizeText(value, opts) {
      let out = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return out;
    }
    function isContratoLocacao(contrato) {
      const term = normalizeText(contrato.produto_principal || contrato.produto_tipo || contrato.produto_detalhes || "");
      if (term.includes("locacao") || term.includes("locadora")) return true;
      if (term.includes("rent a car") || term.includes("rental car")) return true;
      return term.includes("carro") && term.includes("alug");
    }
    !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("vendas", "edit") || permissoes.can("vendas_consulta", "edit");
    produtosFiltrados = cidadeId ? produtos.filter((p) => p.cidade_id === cidadeId || p.todas_as_cidades) : produtos;
    principal = contratos[principalIndex] || contratos[0];
    if (principal && true && !cidadeAutoIndefinida) {
      const term = principal.destino || "";
      if (term && !cidadeId) {
        void buscarCidadeInicial(term);
      }
    }
    if (principal && isContratoLocacao(principal) && !cidadeAutoIndefinida) {
      void forcarCidadeIndefinida();
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("tiktpg", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Importar Contratos | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Importar Contratos",
        subtitle: "Importe contratos CVC ou reservas de cruzeiro para criar vendas automaticamente.",
        color: "vendas",
        breadcrumbs: [{ label: "Vendas", href: "/vendas" }, { label: "Importar" }],
        actions: [
          {
            label: "Voltar",
            href: "/vendas",
            variant: "secondary",
            icon: Arrow_left
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="mx-auto max-w-5xl space-y-6">`);
      Card($$renderer3, {
        title: "Tipo de importação",
        color: "vendas",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="grid grid-cols-1 gap-4 md:grid-cols-2"><button type="button"${attr_class(`rounded-xl border p-4 text-left transition ${"border-vendas-500 bg-vendas-50"}`)}><div class="flex items-center gap-3"><div class="rounded-lg bg-vendas-100 p-2 text-vendas-600">`);
          File_spreadsheet($$renderer4, { size: 20 });
          $$renderer4.push(`<!----></div> <div><p class="font-semibold text-slate-900">Contrato CVC</p> <p class="text-sm text-slate-500">Importe contratos de pacotes, hotéis e serviços CVC.</p></div></div></button> <button type="button"${attr_class(`rounded-xl border p-4 text-left transition ${"border-slate-200 hover:border-vendas-300"}`)}><div class="flex items-center gap-3"><div class="rounded-lg bg-vendas-100 p-2 text-vendas-600">`);
          Ship($$renderer4, { size: 20 });
          $$renderer4.push(`<!----></div> <div><p class="font-semibold text-slate-900">Reserva de Cruzeiro</p> <p class="text-sm text-slate-500">Importe reservas de cruzeiro (roteiro).</p></div></div></button></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Card($$renderer3, {
        title: "Fonte do contrato",
        color: "vendas",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="grid grid-cols-1 gap-6 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700">Upload de PDF</label> <input type="file" accept=".pdf" class="vtur-input w-full"/> <div class="mt-2 flex gap-2">`);
          Button($$renderer4, {
            type: "button",
            variant: "secondary",
            loading: previewing,
            disabled: true,
            children: ($$renderer5) => {
              Eye($$renderer5, { size: 16, class: "mr-2" });
              $$renderer5.push(`<!---->Pré-visualizar PDF`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div></div> <div><label class="mb-1 block text-sm font-medium text-slate-700">Ou cole o texto</label> <textarea class="vtur-input h-32 w-full" placeholder="Cole aqui o texto do contrato...">`);
          const $$body = escape_html(textInput);
          if ($$body) {
            $$renderer4.push(`${$$body}`);
          }
          $$renderer4.push(`</textarea></div></div> <div class="mt-4 flex justify-end">`);
          Button($$renderer4, {
            type: "button",
            variant: "primary",
            color: "vendas",
            loading: extracting,
            children: ($$renderer5) => {
              Upload($$renderer5, { size: 16, class: "mr-2" });
              $$renderer5.push(`<!----> ${escape_html(contratos.length > 0 ? "Adicionar mais recibos" : "Extrair contratos")}`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      if (contratos.length > 0) {
        $$renderer3.push("<!--[0-->");
        Card($$renderer3, {
          title: `Contratos identificados (${contratos.length})`,
          color: "vendas",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="space-y-4"><!--[-->`);
            const each_array = ensure_array_like(contratos);
            for (let index = 0, $$length = each_array.length; index < $$length; index++) {
              let contrato = each_array[index];
              $$renderer4.push(`<div class="rounded-xl border border-slate-200 p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="font-semibold text-slate-900">${escape_html(contrato.contratante?.nome || "Contratante não identificado")} `);
              if (principalIndex === index) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<span class="ml-2 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Principal</span>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></p> <p class="text-sm text-slate-500">Recibo: ${escape_html(contrato.contrato_numero || "-")} • Reserva: ${escape_html(contrato.reserva_numero || "-")} • ${escape_html(formatDate(contrato.data_saida))} a ${escape_html(formatDate(contrato.data_retorno))}</p></div> <div class="flex gap-2">`);
              if (principalIndex !== index) {
                $$renderer4.push("<!--[0-->");
                Button($$renderer4, {
                  type: "button",
                  variant: "secondary",
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->Definir principal`);
                  },
                  $$slots: { default: true }
                });
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--> `);
              Button($$renderer4, {
                type: "button",
                variant: "danger",
                children: ($$renderer5) => {
                  Trash_2($$renderer5, { size: 16 });
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----></div></div> <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"><div><label class="mb-1 block text-sm font-medium text-slate-700">CPF/CNPJ do contratante</label> <input type="text"${attr("value", contrato.contratante?.cpf || "")} class="vtur-input w-full" maxlength="18"/></div> `);
              {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<div><label class="mb-1 block text-sm font-medium text-slate-700">Tipo de pacote</label> `);
                $$renderer4.select(
                  {
                    class: "vtur-input w-full",
                    value: contrato.tipo_pacote || ""
                  },
                  ($$renderer5) => {
                    $$renderer5.option({ value: "" }, ($$renderer6) => {
                      $$renderer6.push(`Selecionar...`);
                    });
                    $$renderer5.push(`<!--[-->`);
                    const each_array_1 = ensure_array_like(tiposPacote);
                    for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                      let tp = each_array_1[$$index];
                      $$renderer5.option({ value: tp.nome }, ($$renderer6) => {
                        $$renderer6.push(`${escape_html(tp.nome)}`);
                      });
                    }
                    $$renderer5.push(`<!--]-->`);
                  }
                );
                $$renderer4.push(`</div>`);
              }
              $$renderer4.push(`<!--]--> <div><label class="mb-1 block text-sm font-medium text-slate-700">Produto principal</label> <input type="text"${attr("value", contrato.produto_principal || "-")} class="vtur-input w-full bg-slate-100" disabled=""/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700">Destino</label> <input type="text"${attr("value", contrato.destino || "-")} class="vtur-input w-full bg-slate-100" disabled=""/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700">Total bruto</label> <input type="text"${attr("value", formatCurrency(contrato.total_bruto))} class="vtur-input w-full bg-slate-100" disabled=""/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700">Taxas</label> <input type="text"${attr("value", formatCurrency((contrato.taxas_embarque || 0) + (contrato.taxa_du || 0)))} class="vtur-input w-full bg-slate-100" disabled=""/></div></div> `);
              if (!isContratoLocacao(contrato) && (normalizeText(contrato.produto_tipo || "").includes("aereo") || contrato.taxa_du != null)) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3"><p class="mb-2 text-sm font-medium text-slate-700">Taxa de DU comissionada</p> <div class="flex items-center gap-4"><label class="flex items-center gap-2 text-sm"><input type="radio"${attr("checked", contrato.aplica_du === true, true)}/> Sim</label> <label class="flex items-center gap-2 text-sm"><input type="radio"${attr("checked", contrato.aplica_du === false, true)}/> Não</label> <input type="number" class="vtur-input w-32"${attr("value", contrato.taxa_du || 0)}/></div></div>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--> `);
              if (contrato.passageiros && contrato.passageiros.length > 0) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<div class="mt-4"><p class="text-sm font-semibold text-slate-700">Passageiros (${escape_html(contrato.passageiros.length)})</p> <div class="mt-2 space-y-1"><!--[-->`);
                const each_array_2 = ensure_array_like(contrato.passageiros);
                for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
                  let p = each_array_2[$$index_1];
                  $$renderer4.push(`<div class="text-sm text-slate-600">${escape_html(p.nome || "-")} • CPF: ${escape_html(p.cpf || "-")} • Nasc.: ${escape_html(formatDate(p.nascimento))}</div>`);
                }
                $$renderer4.push(`<!--]--></div></div>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--> `);
              {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></div>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Card($$renderer3, {
          title: "Destino principal da venda",
          color: "vendas",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"><div class="relative"><label class="mb-1 block text-sm font-medium text-slate-700">`);
            Map_pin($$renderer4, { size: 14, class: "mr-1 inline" });
            $$renderer4.push(`<!---->Cidade</label> <input type="text"${attr("value", buscaCidade)} class="vtur-input w-full" placeholder="Buscar cidade..."${attr("disabled", cidadeAutoIndefinida, true)}/> `);
            {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div> <div><label class="mb-1 block text-sm font-medium text-slate-700">Produto / Destino</label> <input type="text"${attr("value", buscaDestino)} class="vtur-input w-full" placeholder="Selecione o produto..." list="destinos-datalist"/> <datalist id="destinos-datalist"><!--[-->`);
            const each_array_4 = ensure_array_like(produtosFiltrados);
            for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
              let p = each_array_4[$$index_4];
              $$renderer4.option({ value: p.nome }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(p.nome)}`);
              });
            }
            $$renderer4.push(`<!--]--></datalist></div> <div><label class="mb-1 block text-sm font-medium text-slate-700">`);
            Calendar($$renderer4, { size: 14, class: "mr-1 inline" });
            $$renderer4.push(`<!---->Data da venda</label> <input type="date"${attr("value", dataVenda)} class="vtur-input w-full"${attr("max", (/* @__PURE__ */ new Date()).toISOString().slice(0, 10))}/></div> `);
            {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> <div class="flex justify-end gap-3">`);
        Button($$renderer3, {
          type: "button",
          variant: "secondary",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Cancelar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Button($$renderer3, {
          type: "button",
          variant: "primary",
          color: "vendas",
          loading: saving,
          children: ($$renderer4) => {
            Circle_check_big($$renderer4, { size: 16, class: "mr-2" });
            $$renderer4.push(`<!---->Salvar venda`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--></div> `);
      Dialog($$renderer3, {
        title: "Pré-visualização do PDF",
        size: "xl",
        showConfirm: false,
        cancelText: "Fechar",
        onCancel: () => previewOpen = false,
        get open() {
          return previewOpen;
        },
        set open($$value) {
          previewOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<textarea class="vtur-input h-96 w-full font-mono text-xs" readonly="">`);
          const $$body_1 = escape_html(previewText);
          if ($$body_1) {
            $$renderer4.push(`${$$body_1}`);
          }
          $$renderer4.push(`</textarea>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Contato do cliente",
        size: "md",
        showConfirm: false,
        cancelText: "Cancelar",
        onCancel: () => contatoModalOpen = false,
        get open() {
          return contatoModalOpen;
        },
        set open($$value) {
          contatoModalOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700">Telefone</label> <input type="text"${attr("value", contatoTelefone)} class="vtur-input w-full" placeholder="(00) 0000-0000"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label> <input type="text"${attr("value", contatoWhatsapp)} class="vtur-input w-full" placeholder="(00) 00000-0000"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700">E-mail</label> <input type="email"${attr("value", contatoEmail)} class="vtur-input w-full" placeholder="cliente@email.com"/></div> <div class="flex justify-end gap-3 pt-2">`);
          Button($$renderer4, {
            type: "button",
            variant: "secondary",
            loading: saving,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Informar depois`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            type: "button",
            variant: "primary",
            color: "vendas",
            loading: saving,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Salvar venda`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div></div>`);
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
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
