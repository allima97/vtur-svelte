import { c as sanitize_props, o as spread_props, k as slot, h as head, e as escape_html, t as ensure_array_like } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import "clsx";
import { t as toast } from "../../../../../chunks/ui.js";
import { U as Users } from "../../../../../chunks/users.js";
import { U as User_check, a as User_x } from "../../../../../chunks/user-x.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
function User_cog($$renderer, $$props) {
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
    ["path", { "d": "M10 15H6a4 4 0 0 0-4 4v2" }],
    ["path", { "d": "m14.305 16.53.923-.382" }],
    ["path", { "d": "m15.228 13.852-.923-.383" }],
    ["path", { "d": "m16.852 12.228-.383-.923" }],
    ["path", { "d": "m16.852 17.772-.383.924" }],
    ["path", { "d": "m19.148 12.228.383-.923" }],
    ["path", { "d": "m19.53 18.696-.382-.924" }],
    ["path", { "d": "m20.772 13.852.924-.383" }],
    ["path", { "d": "m20.772 16.148.924.383" }],
    ["circle", { "cx": "18", "cy": "15", "r": "3" }],
    ["circle", { "cx": "9", "cy": "7", "r": "4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "user-cog" },
    $$sanitized_props,
    {
      /**
       * @component @name UserCog
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTAgMTVINmE0IDQgMCAwIDAtNCA0djIiIC8+CiAgPHBhdGggZD0ibTE0LjMwNSAxNi41My45MjMtLjM4MiIgLz4KICA8cGF0aCBkPSJtMTUuMjI4IDEzLjg1Mi0uOTIzLS4zODMiIC8+CiAgPHBhdGggZD0ibTE2Ljg1MiAxMi4yMjgtLjM4My0uOTIzIiAvPgogIDxwYXRoIGQ9Im0xNi44NTIgMTcuNzcyLS4zODMuOTI0IiAvPgogIDxwYXRoIGQ9Im0xOS4xNDggMTIuMjI4LjM4My0uOTIzIiAvPgogIDxwYXRoIGQ9Im0xOS41MyAxOC42OTYtLjM4Mi0uOTI0IiAvPgogIDxwYXRoIGQ9Im0yMC43NzIgMTMuODUyLjkyNC0uMzgzIiAvPgogIDxwYXRoIGQ9Im0yMC43NzIgMTYuMTQ4LjkyNC4zODMiIC8+CiAgPGNpcmNsZSBjeD0iMTgiIGN5PSIxNSIgcj0iMyIgLz4KICA8Y2lyY2xlIGN4PSI5IiBjeT0iNyIgcj0iNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/user-cog
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
    let empresas, filteredUsuarios, stats;
    let loading = true;
    let usuarios = [];
    let filtroTipo = "";
    let filtroStatus = "";
    let filtroEmpresa = "";
    let filtroEscopo = "";
    function formatDateTime(value) {
      if (!value) return "-";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
    }
    function userCell(row) {
      const initials = row.nome.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
      return `
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">
          ${initials || "U"}
        </div>
        <div class="min-w-0">
          <p class="truncate font-medium text-slate-900">${row.nome}</p>
          <p class="truncate text-xs text-slate-500">${row.email || "-"}</p>
        </div>
      </div>
    `;
    }
    function badge(label, tone) {
      const classes = {
        gray: "bg-slate-100 text-slate-700",
        green: "bg-emerald-100 text-emerald-700",
        yellow: "bg-amber-100 text-amber-700",
        red: "bg-rose-100 text-rose-700",
        blue: "bg-blue-100 text-blue-700"
      };
      return `<span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ${classes[tone]}">${label}</span>`;
    }
    const columns = [
      {
        key: "nome",
        label: "Usuario",
        sortable: true,
        formatter: (_value, row) => userCell(row)
      },
      {
        key: "tipo",
        label: "Perfil",
        sortable: true,
        formatter: (value) => badge(value || "OUTRO", "blue")
      },
      { key: "empresa", label: "Empresa", sortable: true },
      {
        key: "escopo",
        label: "Escopo",
        sortable: true,
        formatter: (_value, row) => row.uso_individual ? badge("Individual", "yellow") : row.created_by_gestor ? badge("Equipe gestor", "gray") : badge("Corporativo", "green")
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        formatter: (_value, row) => badge(row.ativo ? "Ativo" : "Inativo", row.ativo ? "green" : "red")
      },
      {
        key: "ranking",
        label: "Ranking",
        sortable: true,
        formatter: (_value, row) => badge(row.participa_ranking ? "Participa" : "Nao participa", row.participa_ranking ? "green" : "gray")
      },
      {
        key: "updated_at",
        label: "Atualizado",
        sortable: true,
        formatter: (value) => formatDateTime(value)
      }
    ];
    async function loadUsuarios() {
      loading = true;
      try {
        const response = await fetch("/api/v1/admin/usuarios");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        usuarios = payload.items || [];
      } catch (err) {
        console.error(err);
        toast.error("Nao foi possivel carregar os usuarios administrativos.");
        usuarios = [];
      } finally {
        loading = false;
      }
    }
    empresas = Array.from(new Set(usuarios.map((row) => row.empresa).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    filteredUsuarios = usuarios.filter((row) => {
      return true;
    });
    stats = {
      total: usuarios.length,
      ativos: usuarios.filter((row) => row.ativo).length,
      inativos: usuarios.filter((row) => !row.ativo).length,
      individuais: usuarios.filter((row) => row.uso_individual).length
    };
    head("mw5elz", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Usuarios | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Usuarios",
      subtitle: "Listagem administrativa consolidada com papel, empresa, escopo e status real.",
      breadcrumbs: [
        { label: "Administracao", href: "/admin" },
        { label: "Usuarios" }
      ],
      actions: [
        {
          label: "Atualizar",
          onClick: loadUsuarios,
          variant: "secondary",
          icon: Refresh_cw
        },
        {
          label: "Novo usuario",
          href: "/admin/usuarios/novo",
          variant: "primary",
          icon: Plus
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="space-y-6"><div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-slate-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">`);
    Users($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.total)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
    User_check($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Ativos</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.ativos)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-red-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">`);
    User_x($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Inativos</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.inativos)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
    User_cog($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Uso individual</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.individuais)}</p></div></div></div> `);
    Card($$renderer2, {
      color: "financeiro",
      title: "Filtros",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-4 md:grid-cols-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="usuarios-tipo">Perfil</label> `);
        $$renderer3.select(
          {
            id: "usuarios-tipo",
            value: filtroTipo,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array = ensure_array_like(Array.from(new Set(usuarios.map((row) => row.tipo))).sort((a, b) => a.localeCompare(b)));
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let tipo = each_array[$$index];
              $$renderer4.option({ value: tipo }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(tipo)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="usuarios-status">Status</label> `);
        $$renderer3.select(
          {
            id: "usuarios-status",
            value: filtroStatus,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.option({ value: "true" }, ($$renderer5) => {
              $$renderer5.push(`Ativo`);
            });
            $$renderer4.option({ value: "false" }, ($$renderer5) => {
              $$renderer5.push(`Inativo`);
            });
          }
        );
        $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="usuarios-empresa">Empresa</label> `);
        $$renderer3.select(
          {
            id: "usuarios-empresa",
            value: filtroEmpresa,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todas`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(empresas);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let empresa = each_array_1[$$index_1];
              $$renderer4.option({ value: empresa }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(empresa)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="usuarios-escopo">Escopo</label> `);
        $$renderer3.select(
          {
            id: "usuarios-escopo",
            value: filtroEscopo,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.option({ value: "corporativo" }, ($$renderer5) => {
              $$renderer5.push(`Corporativo`);
            });
            $$renderer4.option({ value: "individual" }, ($$renderer5) => {
              $$renderer5.push(`Individual`);
            });
          }
        );
        $$renderer3.push(`</div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    DataTable($$renderer2, {
      title: "Usuarios administrados",
      color: "financeiro",
      loading,
      columns,
      data: filteredUsuarios,
      emptyMessage: "Nenhum usuario encontrado para o escopo atual.",
      onRowClick: (row) => goto(`/admin/usuarios/${row.id}`)
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="text-sm text-slate-600">Abertura do registro ocorre pelo clique na linha. O detalhe concentra edicao, acoes sensiveis,
      vinculo de empresa, papel, ranking, disparo de aviso, redefinicao de senha e reset de 2FA.</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
