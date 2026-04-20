import { c as sanitize_props, o as spread_props, k as slot, f as fallback, t as ensure_array_like, q as attr, e as escape_html, p as attr_class, m as bind_props, v as stringify } from "./index2.js";
import { B as Button } from "./Button2.js";
import { H as House } from "./house.js";
import { I as Icon } from "./Icon.js";
function Chevron_right($$renderer, $$props) {
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
  const iconNode = [["path", { "d": "m9 18 6-6-6-6" }]];
  Icon($$renderer, spread_props([
    { name: "chevron-right" },
    $$sanitized_props,
    {
      /**
       * @component @name ChevronRight
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/chevron-right
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
function PageHeader($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let accentClass;
    let title = $$props["title"];
    let subtitle = fallback($$props["subtitle"], null);
    let breadcrumbs = fallback($$props["breadcrumbs"], () => [], true);
    let actions = fallback($$props["actions"], () => [], true);
    let color = fallback($$props["color"], null);
    const accentClasses = {
      clientes: "from-blue-600 to-cyan-500",
      vendas: "from-green-600 to-emerald-500",
      financeiro: "from-orange-600 to-amber-500",
      operacao: "from-teal-600 to-cyan-500",
      orcamentos: "from-blue-600 to-indigo-500",
      blue: "from-blue-600 to-cyan-500",
      green: "from-green-600 to-emerald-500",
      orange: "from-orange-600 to-amber-500",
      teal: "from-teal-600 to-cyan-500"
    };
    accentClass = accentClasses[color || ""] || "from-slate-900 to-slate-500";
    $$renderer2.push(`<div class="vtur-page-header mb-4 sm:mb-6">`);
    if (breadcrumbs.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<nav class="mb-2 flex flex-wrap items-center gap-1.5 text-sm text-slate-500"><a href="/" class="transition-colors hover:text-slate-900">`);
      House($$renderer2, { size: 14 });
      $$renderer2.push(`<!----></a> <!--[-->`);
      const each_array = ensure_array_like(breadcrumbs);
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        let crumb = each_array[i];
        Chevron_right($$renderer2, { size: 14, class: "text-slate-400" });
        $$renderer2.push(`<!----> `);
        if (crumb.href && i < breadcrumbs.length - 1) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<a${attr("href", crumb.href)} class="transition-colors hover:text-slate-900">${escape_html(crumb.label)}</a>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<span class="font-medium text-slate-900">${escape_html(crumb.label)}</span>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></nav>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="vtur-card px-4 py-3 sm:px-5 sm:py-4"><div${attr_class(`mb-3 h-1 w-14 rounded-full bg-gradient-to-r ${stringify(accentClass)} sm:mb-4 sm:h-1.5 sm:w-20`)}></div> <div class="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between"><div class="min-w-0 flex-1"><h1 class="text-xl sm:text-[1.7rem] font-semibold tracking-tight text-slate-900 leading-tight">${escape_html(title)}</h1> `);
    if (subtitle) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="mt-1 text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500 line-clamp-2 sm:line-clamp-none">${escape_html(subtitle)}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (actions.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end"><!--[-->`);
      const each_array_1 = ensure_array_like(actions);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let action = each_array_1[$$index_1];
        if (action.href) {
          $$renderer2.push("<!--[0-->");
          Button($$renderer2, {
            href: action.href,
            variant: action.variant || "primary",
            size: "sm",
            class_name: "min-h-[40px] sm:min-h-0",
            children: ($$renderer3) => {
              if (action.icon) {
                $$renderer3.push("<!--[0-->");
                if (action.icon) {
                  $$renderer3.push("<!--[-->");
                  action.icon($$renderer3, { size: 16, class: "mr-1.5" });
                  $$renderer3.push("<!--]-->");
                } else {
                  $$renderer3.push("<!--[!-->");
                  $$renderer3.push("<!--]-->");
                }
              } else {
                $$renderer3.push("<!--[-1-->");
              }
              $$renderer3.push(`<!--]--> ${escape_html(action.label)}`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer2.push("<!--[-1-->");
          Button($$renderer2, {
            variant: action.variant || "primary",
            size: "sm",
            class_name: "min-h-[40px] sm:min-h-0",
            children: ($$renderer3) => {
              if (action.icon) {
                $$renderer3.push("<!--[0-->");
                if (action.icon) {
                  $$renderer3.push("<!--[-->");
                  action.icon($$renderer3, { size: 16, class: "mr-1.5" });
                  $$renderer3.push("<!--]-->");
                } else {
                  $$renderer3.push("<!--[!-->");
                  $$renderer3.push("<!--]-->");
                }
              } else {
                $$renderer3.push("<!--[-1-->");
              }
              $$renderer3.push(`<!--]--> ${escape_html(action.label)}`);
            },
            $$slots: { default: true }
          });
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div></div>`);
    bind_props($$props, { title, subtitle, breadcrumbs, actions, color });
  });
}
export {
  Chevron_right as C,
  PageHeader as P
};
