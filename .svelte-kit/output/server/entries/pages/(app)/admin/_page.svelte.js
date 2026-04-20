import { c as sanitize_props, o as spread_props, k as slot, h as head, e as escape_html, t as ensure_array_like } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../chunks/Card.js";
import { B as Badge } from "../../../../chunks/Badge.js";
import "../../../../chunks/ui.js";
import { U as Users } from "../../../../chunks/users.js";
import { B as Building_2 } from "../../../../chunks/building-2.js";
import { I as Icon } from "../../../../chunks/Icon.js";
import { C as Circle_alert } from "../../../../chunks/circle-alert.js";
import { S as Shield } from "../../../../chunks/shield.js";
import { M as Mail } from "../../../../chunks/mail.js";
import { C as Circle_check } from "../../../../chunks/circle-check.js";
function Bell_ring($$renderer, $$props) {
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
    ["path", { "d": "M10.268 21a2 2 0 0 0 3.464 0" }],
    ["path", { "d": "M22 8c0-2.3-.8-4.3-2-6" }],
    [
      "path",
      {
        "d": "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
      }
    ],
    ["path", { "d": "M4 2C2.8 3.7 2 5.7 2 8" }]
  ];
  Icon($$renderer, spread_props([
    { name: "bell-ring" },
    $$sanitized_props,
    {
      /**
       * @component @name BellRing
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTAuMjY4IDIxYTIgMiAwIDAgMCAzLjQ2NCAwIiAvPgogIDxwYXRoIGQ9Ik0yMiA4YzAtMi4zLS44LTQuMy0yLTYiIC8+CiAgPHBhdGggZD0iTTMuMjYyIDE1LjMyNkExIDEgMCAwIDAgNCAxN2gxNmExIDEgMCAwIDAgLjc0LTEuNjczQzE5LjQxIDEzLjk1NiAxOCAxMi40OTkgMTggOEE2IDYgMCAwIDAgNiA4YzAgNC40OTktMS40MTEgNS45NTYtMi43MzggNy4zMjYiIC8+CiAgPHBhdGggZD0iTTQgMkMyLjggMy43IDIgNS43IDIgOCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/bell-ring
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
function Settings_2($$renderer, $$props) {
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
    ["path", { "d": "M14 17H5" }],
    ["path", { "d": "M19 7h-9" }],
    ["circle", { "cx": "17", "cy": "17", "r": "3" }],
    ["circle", { "cx": "7", "cy": "7", "r": "3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "settings-2" },
    $$sanitized_props,
    {
      /**
       * @component @name Settings2
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTQgMTdINSIgLz4KICA8cGF0aCBkPSJNMTkgN2gtOSIgLz4KICA8Y2lyY2xlIGN4PSIxNyIgY3k9IjE3IiByPSIzIiAvPgogIDxjaXJjbGUgY3g9IjciIGN5PSI3IiByPSIzIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/settings-2
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
function User_round_cog($$renderer, $$props) {
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
    ["path", { "d": "m14.305 19.53.923-.382" }],
    ["path", { "d": "m15.228 16.852-.923-.383" }],
    ["path", { "d": "m16.852 15.228-.383-.923" }],
    ["path", { "d": "m16.852 20.772-.383.924" }],
    ["path", { "d": "m19.148 15.228.383-.923" }],
    ["path", { "d": "m19.53 21.696-.382-.924" }],
    ["path", { "d": "M2 21a8 8 0 0 1 10.434-7.62" }],
    ["path", { "d": "m20.772 16.852.924-.383" }],
    ["path", { "d": "m20.772 19.148.924.383" }],
    ["circle", { "cx": "10", "cy": "8", "r": "5" }],
    ["circle", { "cx": "18", "cy": "18", "r": "3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "user-round-cog" },
    $$sanitized_props,
    {
      /**
       * @component @name UserRoundCog
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTQuMzA1IDE5LjUzLjkyMy0uMzgyIiAvPgogIDxwYXRoIGQ9Im0xNS4yMjggMTYuODUyLS45MjMtLjM4MyIgLz4KICA8cGF0aCBkPSJtMTYuODUyIDE1LjIyOC0uMzgzLS45MjMiIC8+CiAgPHBhdGggZD0ibTE2Ljg1MiAyMC43NzItLjM4My45MjQiIC8+CiAgPHBhdGggZD0ibTE5LjE0OCAxNS4yMjguMzgzLS45MjMiIC8+CiAgPHBhdGggZD0ibTE5LjUzIDIxLjY5Ni0uMzgyLS45MjQiIC8+CiAgPHBhdGggZD0iTTIgMjFhOCA4IDAgMCAxIDEwLjQzNC03LjYyIiAvPgogIDxwYXRoIGQ9Im0yMC43NzIgMTYuODUyLjkyNC0uMzgzIiAvPgogIDxwYXRoIGQ9Im0yMC43NzIgMTkuMTQ4LjkyNC4zODMiIC8+CiAgPGNpcmNsZSBjeD0iMTAiIGN5PSI4IiByPSI1IiAvPgogIDxjaXJjbGUgY3g9IjE4IiBjeT0iMTgiIHI9IjMiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/user-round-cog
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
    const modules = [
      {
        title: "Usuarios",
        description: "Listagem, detalhe, status, papel, escopo, senha e 2FA.",
        href: "/admin/usuarios",
        icon: Users,
        countKey: "usuarios_total"
      },
      {
        title: "Permissoes",
        description: "Permissoes por usuario e configuracao global de modulos.",
        href: "/admin/permissoes",
        icon: Shield
      },
      {
        title: "Tipos de usuario",
        description: "Perfis padrao e permissao default por papel.",
        href: "/admin/tipos-usuario",
        icon: User_round_cog,
        countKey: "tipos_total"
      },
      {
        title: "Empresas",
        description: "Empresas, billing e vinculos de portfolio master.",
        href: "/admin/empresas",
        icon: Building_2,
        countKey: "empresas_total"
      },
      {
        title: "Avisos",
        description: "Templates administrativos e disparos auxiliares.",
        href: "/admin/avisos",
        icon: Bell_ring,
        countKey: "avisos_ativos"
      },
      {
        title: "E-mail",
        description: "Resend/SMTP, remetentes e validacao operacional.",
        href: "/admin/email",
        icon: Mail
      },
      {
        title: "Parametros",
        description: "Configuracoes operacionais, seguranca e conciliacao.",
        href: "/parametros",
        icon: Settings_2
      }
    ];
    head("987w4h", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Administracao | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Administracao",
      subtitle: "Painel consolidado de usuarios, permissoes e configuracoes administrativas.",
      breadcrumbs: [{ label: "Administracao" }]
    });
    $$renderer2.push(`<!----> <div class="space-y-6">`);
    Card($$renderer2, {
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex items-start gap-3">`);
        Shield($$renderer3, { size: 22, class: "mt-0.5 text-orange-600" });
        $$renderer3.push(`<!----> <div class="space-y-1"><p class="text-sm font-semibold text-slate-900">Area critica do sistema</p> <p class="text-sm text-slate-600">Este modulo concentra regras de acesso, perfis, escopo por empresa e configuracoes operacionais.</p></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
    Users($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Usuários ativos</p> <p class="text-2xl font-bold text-slate-900">${escape_html("…")}</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
    Building_2($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Empresas no escopo</p> <p class="text-2xl font-bold text-slate-900">${escape_html("…")}</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-amber-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">`);
    Bell_ring($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Avisos ativos</p> <p class="text-2xl font-bold text-slate-900">${escape_html("…")}</p> <p class="text-xs text-slate-400">Templates prontos para uso</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-red-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">`);
    Circle_alert($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Vínculos master pendentes</p> <p class="text-2xl font-bold text-slate-900">${escape_html("…")}</p> <p class="text-xs text-slate-400">Pendências de portfólio</p></div></div></div> `);
    Card($$renderer2, {
      color: "financeiro",
      title: "Modulos administrativos",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-4 lg:grid-cols-2"><!--[-->`);
        const each_array = ensure_array_like(modules);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let item = each_array[$$index];
          $$renderer3.push(`<button type="button" class="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-orange-300 hover:bg-orange-50/40"><div class="flex items-start justify-between gap-4"><div class="flex items-start gap-3"><div class="rounded-xl bg-orange-100 p-3 text-orange-700">`);
          if (item.icon) {
            $$renderer3.push("<!--[-->");
            item.icon($$renderer3, { size: 20 });
            $$renderer3.push("<!--]-->");
          } else {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push("<!--]-->");
          }
          $$renderer3.push(`</div> <div class="space-y-1"><p class="font-semibold text-slate-900">${escape_html(item.title)}</p> <p class="text-sm text-slate-600">${escape_html(item.description)}</p></div></div> `);
          if (item.countKey) {
            $$renderer3.push("<!--[0-->");
            Badge($$renderer3, {
              color: "yellow",
              size: "sm",
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->${escape_html("...")}`);
              },
              $$slots: { default: true }
            });
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></div></button>`);
        }
        $$renderer3.push(`<!--]--></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "financeiro",
      title: "Status operacional",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-4 md:grid-cols-2"><div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><div class="flex items-center gap-2 text-slate-900">`);
        Circle_check($$renderer3, {
          size: 18,
          class: "text-slate-400"
        });
        $$renderer3.push(`<!----> <p class="font-medium">Disparo de e-mail</p></div> <p class="mt-2 text-sm text-slate-600">${escape_html("Ainda sem configuracao completa de e-mail global.")}</p></div> <div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="font-medium text-slate-900">Escopo atual</p> <p class="mt-2 text-sm text-slate-600">Perfil carregado: <span class="font-semibold">${escape_html("-")}</span></p> <p class="mt-1 text-sm text-slate-500">Empresas em escopo: ${escape_html(0)}</p></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
