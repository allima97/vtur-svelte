import { c as sanitize_props, d as rest_props, an as setContext, f as fallback, l as element, k as slot, i as attributes, j as clsx, m as bind_props, o as spread_props, p as attr_class, z as sanitize_slots, g as getContext, b as store_get, w as attr_style, t as ensure_array_like, q as attr, e as escape_html, v as stringify, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { p as page } from "../../../chunks/stores.js";
import { a as auth } from "../../../chunks/auth.js";
import "@supabase/ssr";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
import { i as isMobile, s as sidebar } from "../../../chunks/ui.js";
import { p as permissoes } from "../../../chunks/permissoes.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { U as Users } from "../../../chunks/users.js";
import { S as Shopping_cart } from "../../../chunks/shopping-cart.js";
import { F as File_text } from "../../../chunks/file-text.js";
import { P as Plane } from "../../../chunks/plane.js";
import { T as Ticket } from "../../../chunks/ticket.js";
import { S as Square_check_big } from "../../../chunks/square-check-big.js";
import { C as Calendar } from "../../../chunks/calendar.js";
import { C as Circle_alert } from "../../../chunks/circle-alert.js";
import { M as Megaphone } from "../../../chunks/megaphone.js";
import { V as Video } from "../../../chunks/video.js";
import { G as Gift } from "../../../chunks/gift.js";
import { T as Trending_up } from "../../../chunks/trending-up.js";
import { F as File_spreadsheet } from "../../../chunks/file-spreadsheet.js";
import { W as Wallet } from "../../../chunks/wallet.js";
import { S as Settings } from "../../../chunks/settings.js";
import { S as Shield } from "../../../chunks/shield.js";
import { C as Chevron_down } from "../../../chunks/chevron-down.js";
import { R as Refresh_cw } from "../../../chunks/refresh-cw.js";
import { M as Message_square } from "../../../chunks/message-square.js";
import { C as Credit_card } from "../../../chunks/credit-card.js";
import { P as Package } from "../../../chunks/package.js";
import { B as Building_2 } from "../../../chunks/building-2.js";
import { S as Star } from "../../../chunks/star.js";
import { twMerge, twJoin } from "tailwind-merge";
import * as dom from "@floating-ui/dom";
import { w as writable } from "../../../chunks/index.js";
import { W as Wrapper } from "../../../chunks/Wrapper.js";
import { B as Bell } from "../../../chunks/bell.js";
import { U as User } from "../../../chunks/user.js";
const bgColors = {
  gray: "bg-gray-50 dark:bg-gray-800",
  red: "bg-red-50 dark:bg-gray-800",
  yellow: "bg-yellow-50 dark:bg-gray-800 ",
  green: "bg-green-50 dark:bg-gray-800 ",
  indigo: "bg-indigo-50 dark:bg-gray-800 ",
  purple: "bg-purple-50 dark:bg-gray-800 ",
  pink: "bg-pink-50 dark:bg-gray-800 ",
  blue: "bg-blue-50 dark:bg-gray-800 ",
  light: "bg-gray-50 dark:bg-gray-700",
  dark: "bg-gray-50 dark:bg-gray-800",
  default: "bg-white dark:bg-gray-800",
  dropdown: "bg-white dark:bg-gray-700",
  navbar: "bg-white dark:bg-gray-900",
  navbarUl: "bg-gray-50 dark:bg-gray-800",
  form: "bg-gray-50 dark:bg-gray-700",
  primary: "bg-primary-50 dark:bg-gray-800 ",
  orange: "bg-orange-50 dark:bg-orange-800",
  none: ""
};
function Frame($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "tag",
    "color",
    "rounded",
    "border",
    "shadow",
    "node",
    "use",
    "options",
    "role",
    "transition",
    "params",
    "open"
  ]);
  $$renderer.component(($$renderer2) => {
    const noop = () => {
    };
    setContext("background", true);
    let tag = fallback($$props["tag"], () => $$restProps.href ? "a" : "div", true);
    let color = fallback($$props["color"], "default");
    let rounded = fallback($$props["rounded"], false);
    let border = fallback($$props["border"], false);
    let shadow = fallback($$props["shadow"], false);
    let node = fallback($$props["node"], () => void 0, true);
    let use = fallback($$props["use"], noop);
    let options = fallback($$props["options"], () => ({}), true);
    let role = fallback($$props["role"], () => void 0, true);
    let transition = fallback($$props["transition"], () => void 0, true);
    let params = fallback($$props["params"], () => ({}), true);
    let open = fallback($$props["open"], true);
    const textColors = {
      gray: "text-gray-800 dark:text-gray-300",
      red: "text-red-800 dark:text-red-400",
      yellow: "text-yellow-800 dark:text-yellow-300",
      green: "text-green-800 dark:text-green-400",
      indigo: "text-indigo-800 dark:text-indigo-400",
      purple: "text-purple-800 dark:text-purple-400",
      pink: "text-pink-800 dark:text-pink-400",
      blue: "text-blue-800 dark:text-blue-400",
      light: "text-gray-700 dark:text-gray-300",
      dark: "text-gray-700 dark:text-gray-300",
      default: "text-gray-500 dark:text-gray-400",
      dropdown: "text-gray-700 dark:text-gray-200",
      navbar: "text-gray-700 dark:text-gray-200",
      navbarUl: "text-gray-700 dark:text-gray-400",
      form: "text-gray-900 dark:text-white",
      primary: "text-primary-800 dark:text-primary-400",
      orange: "text-orange-800 dark:text-orange-400",
      none: ""
    };
    const borderColors = {
      gray: "border-gray-300 dark:border-gray-800 divide-gray-300 dark:divide-gray-800",
      red: "border-red-300 dark:border-red-800 divide-red-300 dark:divide-red-800",
      yellow: "border-yellow-300 dark:border-yellow-800 divide-yellow-300 dark:divide-yellow-800",
      green: "border-green-300 dark:border-green-800 divide-green-300 dark:divide-green-800",
      indigo: "border-indigo-300 dark:border-indigo-800 divide-indigo-300 dark:divide-indigo-800",
      purple: "border-purple-300 dark:border-purple-800 divide-purple-300 dark:divide-purple-800",
      pink: "border-pink-300 dark:border-pink-800 divide-pink-300 dark:divide-pink-800",
      blue: "border-blue-300 dark:border-blue-800 divide-blue-300 dark:divide-blue-800",
      light: "border-gray-500 divide-gray-500",
      dark: "border-gray-500 divide-gray-500",
      default: "border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700",
      dropdown: "border-gray-100 dark:border-gray-600 divide-gray-100 dark:divide-gray-600",
      navbar: "border-gray-100 dark:border-gray-700 divide-gray-100 dark:divide-gray-700",
      navbarUl: "border-gray-100 dark:border-gray-700 divide-gray-100 dark:divide-gray-700",
      form: "border-gray-300 dark:border-gray-700 divide-gray-300 dark:divide-gray-700",
      primary: "border-primary-500 dark:border-primary-200  divide-primary-500 dark:divide-primary-200 ",
      orange: "border-orange-300 dark:border-orange-800 divide-orange-300 dark:divide-orange-800",
      none: ""
    };
    let divClass;
    color = color ?? "default";
    setContext("color", color);
    divClass = twMerge(bgColors[color], textColors[color], rounded && "rounded-lg", border && "border", borderColors[color], shadow && "shadow-md", $$sanitized_props.class);
    if (transition && open) {
      $$renderer2.push("<!--[0-->");
      element(
        $$renderer2,
        tag,
        () => {
          $$renderer2.push(`${attributes({ role, ...$$restProps, class: clsx(divClass) })}`);
        },
        () => {
          $$renderer2.push(`<!--[-->`);
          slot($$renderer2, $$props, "default", {}, null);
          $$renderer2.push(`<!--]-->`);
        }
      );
    } else if (open) {
      $$renderer2.push("<!--[1-->");
      element(
        $$renderer2,
        tag,
        () => {
          $$renderer2.push(`${attributes({ role, ...$$restProps, class: clsx(divClass) })}`);
        },
        () => {
          $$renderer2.push(`<!--[-->`);
          slot($$renderer2, $$props, "default", {}, null);
          $$renderer2.push(`<!--]-->`);
        }
      );
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, {
      tag,
      color,
      rounded,
      border,
      shadow,
      node,
      use,
      options,
      role,
      transition,
      params,
      open
    });
  });
}
function Popper($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "activeContent",
    "arrow",
    "offset",
    "placement",
    "trigger",
    "triggeredBy",
    "reference",
    "strategy",
    "open",
    "yOnly",
    "middlewares"
  ]);
  $$renderer.component(($$renderer2) => {
    let middleware;
    let activeContent = fallback($$props["activeContent"], false);
    let arrow = fallback($$props["arrow"], true);
    let offset = fallback($$props["offset"], 8);
    let placement = fallback($$props["placement"], "top");
    let trigger = fallback($$props["trigger"], "hover");
    let triggeredBy = fallback($$props["triggeredBy"], () => void 0, true);
    let reference = fallback($$props["reference"], () => void 0, true);
    let strategy = fallback($$props["strategy"], "absolute");
    let open = fallback($$props["open"], false);
    let yOnly = fallback($$props["yOnly"], false);
    let middlewares = fallback($$props["middlewares"], () => [dom.flip(), dom.shift()], true);
    let referenceEl;
    let floatingEl;
    let arrowEl;
    const px = (n) => n ? `${n}px` : "";
    let arrowSide;
    const oppositeSideMap = { left: "right", right: "left", bottom: "top", top: "bottom" };
    function updatePosition() {
      dom.computePosition(referenceEl, floatingEl, { placement, strategy, middleware }).then(({
        x,
        y,
        middlewareData,
        placement: placement2,
        strategy: strategy2
      }) => {
        floatingEl.style.position = strategy2;
        floatingEl.style.left = yOnly ? "0" : px(x);
        floatingEl.style.top = px(y);
        if (middlewareData.arrow && arrowEl instanceof HTMLDivElement) {
          arrowEl.style.left = px(middlewareData.arrow.x);
          arrowEl.style.top = px(middlewareData.arrow.y);
          arrowSide = oppositeSideMap[placement2.split("-")[0]];
          arrowEl.style[arrowSide] = px(-arrowEl.offsetWidth / 2 - ($$sanitized_props.border ? 1 : 0));
        }
      });
    }
    function init(node, _referenceEl) {
      floatingEl = node;
      let cleanup = dom.autoUpdate(_referenceEl, floatingEl, updatePosition);
      return {
        update(_referenceEl2) {
          cleanup();
          cleanup = dom.autoUpdate(_referenceEl2, floatingEl, updatePosition);
        },
        destroy() {
          cleanup();
        }
      };
    }
    let arrowClass;
    placement && (referenceEl = referenceEl);
    middleware = [
      ...middlewares,
      dom.offset(+offset),
      arrowEl
    ];
    arrowClass = twJoin("absolute pointer-events-none block w-[10px] h-[10px] rotate-45 bg-inherit border-inherit", $$sanitized_props.border && arrowSide === "bottom" && "border-b border-e", $$sanitized_props.border && arrowSide === "top" && "border-t border-s ", $$sanitized_props.border && arrowSide === "right" && "border-t border-e ", $$sanitized_props.border && arrowSide === "left" && "border-b border-s ");
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      if (!referenceEl) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div></div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (referenceEl) {
        $$renderer3.push("<!--[0-->");
        Frame($$renderer3, spread_props([
          {
            use: init,
            options: referenceEl,
            role: "tooltip",
            tabindex: activeContent ? -1 : void 0
          },
          $$restProps,
          {
            get open() {
              return open;
            },
            set open($$value) {
              open = $$value;
              $$settled = false;
            },
            children: ($$renderer4) => {
              $$renderer4.push(`<!--[-->`);
              slot($$renderer4, $$props, "default", {}, null);
              $$renderer4.push(`<!--]--> `);
              if (arrow) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<div${attr_class(clsx(arrowClass))}></div>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]-->`);
            },
            $$slots: { default: true }
          }
        ]));
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]-->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, {
      activeContent,
      arrow,
      offset,
      placement,
      trigger,
      triggeredBy,
      reference,
      strategy,
      open,
      yOnly,
      middlewares
    });
  });
}
function Dropdown($$renderer, $$props) {
  const $$slots = sanitize_slots($$props);
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "activeUrl",
    "open",
    "containerClass",
    "classContainer",
    "headerClass",
    "classHeader",
    "footerClass",
    "classFooter",
    "activeClass",
    "classActive",
    "arrow",
    "trigger",
    "placement",
    "color",
    "shadow",
    "rounded"
  ]);
  $$renderer.component(($$renderer2) => {
    let containerCls, headerCls, ulCls, footerCls;
    let activeUrl = fallback($$props["activeUrl"], () => void 0, true);
    let open = fallback($$props["open"], false);
    let containerClass = fallback($$props["containerClass"], "divide-y z-50");
    let classContainer = fallback($$props["classContainer"], () => void 0, true);
    let headerClass = fallback($$props["headerClass"], "py-1 overflow-hidden rounded-t-lg");
    let classHeader = fallback($$props["classHeader"], () => void 0, true);
    let footerClass = fallback($$props["footerClass"], "py-1 overflow-hidden rounded-b-lg");
    let classFooter = fallback($$props["classFooter"], () => void 0, true);
    let activeClass = fallback($$props["activeClass"], "text-primary-700 dark:text-primary-700 hover:text-primary-900 dark:hover:text-primary-900");
    let classActive = fallback($$props["classActive"], () => void 0, true);
    let arrow = fallback($$props["arrow"], false);
    let trigger = fallback($$props["trigger"], "click");
    let placement = fallback($$props["placement"], "bottom");
    let color = fallback($$props["color"], "dropdown");
    let shadow = fallback($$props["shadow"], true);
    let rounded = fallback($$props["rounded"], true);
    const activeUrlStore = writable("");
    let activeCls = twMerge(activeClass, classActive);
    setContext("DropdownType", { activeClass: activeCls });
    setContext("activeUrl", activeUrlStore);
    activeUrlStore.set(activeUrl ?? "");
    containerCls = twMerge(containerClass, classContainer);
    headerCls = twMerge(headerClass, classHeader);
    ulCls = twMerge("py-1", $$sanitized_props.class);
    footerCls = twMerge(footerClass, classFooter);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      Popper($$renderer3, spread_props([
        { activeContent: true },
        $$restProps,
        {
          trigger,
          arrow,
          placement,
          shadow,
          rounded,
          color,
          class: containerCls,
          get open() {
            return open;
          },
          set open($$value) {
            open = $$value;
            $$settled = false;
          },
          children: ($$renderer4) => {
            if ($$slots.header) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<div${attr_class(clsx(headerCls))}><!--[-->`);
              slot($$renderer4, $$props, "header", {}, null);
              $$renderer4.push(`<!--]--></div>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> <ul${attr_class(clsx(ulCls))}><!--[-->`);
            slot($$renderer4, $$props, "default", {}, null);
            $$renderer4.push(`<!--]--></ul> `);
            if ($$slots.footer) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<div${attr_class(clsx(footerCls))}><!--[-->`);
              slot($$renderer4, $$props, "footer", {}, null);
              $$renderer4.push(`<!--]--></div>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]-->`);
          },
          $$slots: { default: true }
        }
      ]));
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, {
      activeUrl,
      open,
      containerClass,
      classContainer,
      headerClass,
      classHeader,
      footerClass,
      classFooter,
      activeClass,
      classActive,
      arrow,
      trigger,
      placement,
      color,
      shadow,
      rounded
    });
  });
}
function DropdownDivider($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["divClass"]);
  $$renderer.component(($$renderer2) => {
    let divClass = fallback($$props["divClass"], "my-1 h-px bg-gray-100 dark:bg-gray-600");
    $$renderer2.push(`<div${attributes({
      ...$$restProps,
      class: clsx(twMerge(divClass, $$sanitized_props.class))
    })}></div>`);
    bind_props($$props, { divClass });
  });
}
function DropdownItem($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["defaultClass", "href", "activeClass"]);
  $$renderer.component(($$renderer2) => {
    let active, liClass;
    let defaultClass = fallback($$props["defaultClass"], "font-medium py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600");
    let href = fallback($$props["href"], () => void 0, true);
    let activeClass = fallback($$props["activeClass"], () => void 0, true);
    const context = getContext("DropdownType") ?? {};
    const activeUrlStore = getContext("activeUrl");
    let sidebarUrl = "";
    activeUrlStore.subscribe((value) => {
      sidebarUrl = value;
    });
    let wrap = true;
    function init(node) {
      wrap = node.parentElement?.tagName === "UL";
    }
    active = sidebarUrl ? href === sidebarUrl : false;
    liClass = twMerge(defaultClass, href ? "block" : "w-full text-left", active && (activeClass ?? context.activeClass), $$sanitized_props.class);
    Wrapper($$renderer2, {
      tag: "li",
      show: wrap,
      use: init,
      children: ($$renderer3) => {
        element(
          $$renderer3,
          href ? "a" : "button",
          () => {
            $$renderer3.push(`${attributes({
              href,
              type: href ? void 0 : "button",
              role: href ? "link" : "button",
              ...$$restProps,
              class: clsx(liClass)
            })}`);
          },
          () => {
            $$renderer3.push(`<!--[-->`);
            slot($$renderer3, $$props, "default", {}, null);
            $$renderer3.push(`<!--]-->`);
          }
        );
      },
      $$slots: { default: true }
    });
    bind_props($$props, { defaultClass, href, activeClass });
  });
}
function Banknote($$renderer, $$props) {
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
      { "width": "20", "height": "12", "x": "2", "y": "6", "rx": "2" }
    ],
    ["circle", { "cx": "12", "cy": "12", "r": "2" }],
    ["path", { "d": "M6 12h.01M18 12h.01" }]
  ];
  Icon($$renderer, spread_props([
    { name: "banknote" },
    $$sanitized_props,
    {
      /**
       * @component @name Banknote
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iMTIiIHg9IjIiIHk9IjYiIHJ4PSIyIiAvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjIiIC8+CiAgPHBhdGggZD0iTTYgMTJoLjAxTTE4IDEyaC4wMSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/banknote
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
function Circle_user($$renderer, $$props) {
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
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    ["circle", { "cx": "12", "cy": "10", "r": "3" }],
    [
      "path",
      { "d": "M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "circle-user" },
    $$sanitized_props,
    {
      /**
       * @component @name CircleUser
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSIzIiAvPgogIDxwYXRoIGQ9Ik03IDIwLjY2MlYxOWEyIDIgMCAwIDEgMi0yaDZhMiAyIDAgMCAxIDIgMnYxLjY2MiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/circle-user
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
function Layout_dashboard($$renderer, $$props) {
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
      { "width": "7", "height": "9", "x": "3", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "5", "x": "14", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "9", "x": "14", "y": "12", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "5", "x": "3", "y": "16", "rx": "1" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "layout-dashboard" },
    $$sanitized_props,
    {
      /**
       * @component @name LayoutDashboard
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSI5IiB4PSIzIiB5PSIzIiByeD0iMSIgLz4KICA8cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSI1IiB4PSIxNCIgeT0iMyIgcng9IjEiIC8+CiAgPHJlY3Qgd2lkdGg9IjciIGhlaWdodD0iOSIgeD0iMTQiIHk9IjEyIiByeD0iMSIgLz4KICA8cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSI1IiB4PSIzIiB5PSIxNiIgcng9IjEiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/layout-dashboard
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
function Log_out($$renderer, $$props) {
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
    ["path", { "d": "m16 17 5-5-5-5" }],
    ["path", { "d": "M21 12H9" }],
    ["path", { "d": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "log-out" },
    $$sanitized_props,
    {
      /**
       * @component @name LogOut
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTYgMTcgNS01LTUtNSIgLz4KICA8cGF0aCBkPSJNMjEgMTJIOSIgLz4KICA8cGF0aCBkPSJNOSAyMUg1YTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/log-out
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
function Map_pinned($$renderer, $$props) {
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
        "d": "M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0"
      }
    ],
    ["circle", { "cx": "12", "cy": "8", "r": "2" }],
    [
      "path",
      {
        "d": "M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "map-pinned" },
    $$sanitized_props,
    {
      /**
       * @component @name MapPinned
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTggOGMwIDMuNjEzLTMuODY5IDcuNDI5LTUuMzkzIDguNzk1YTEgMSAwIDAgMS0xLjIxNCAwQzkuODcgMTUuNDI5IDYgMTEuNjEzIDYgOGE2IDYgMCAwIDEgMTIgMCIgLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjIiIC8+CiAgPHBhdGggZD0iTTguNzE0IDE0aC0zLjcxYTEgMSAwIDAgMC0uOTQ4LjY4M2wtMi4wMDQgNkExIDEgMCAwIDAgMyAyMmgxOGExIDEgMCAwIDAgLjk0OC0xLjMxNmwtMi02YTEgMSAwIDAgMC0uOTQ5LS42ODRoLTMuNzEyIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/map-pinned
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
function Map($$renderer, $$props) {
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
        "d": "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
      }
    ],
    ["path", { "d": "M15 5.764v15" }],
    ["path", { "d": "M9 3.236v15" }]
  ];
  Icon($$renderer, spread_props([
    { name: "map" },
    $$sanitized_props,
    {
      /**
       * @component @name Map
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTQuMTA2IDUuNTUzYTIgMiAwIDAgMCAxLjc4OCAwbDMuNjU5LTEuODNBMSAxIDAgMCAxIDIxIDQuNjE5djEyLjc2NGExIDEgMCAwIDEtLjU1My44OTRsLTQuNTUzIDIuMjc3YTIgMiAwIDAgMS0xLjc4OCAwbC00LjIxMi0yLjEwNmEyIDIgMCAwIDAtMS43ODggMGwtMy42NTkgMS44M0ExIDEgMCAwIDEgMyAxOS4zODFWNi42MThhMSAxIDAgMCAxIC41NTMtLjg5NGw0LjU1My0yLjI3N2EyIDIgMCAwIDEgMS43ODggMHoiIC8+CiAgPHBhdGggZD0iTTE1IDUuNzY0djE1IiAvPgogIDxwYXRoIGQ9Ik05IDMuMjM2djE1IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/map
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
function Menu($$renderer, $$props) {
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
    ["path", { "d": "M4 5h16" }],
    ["path", { "d": "M4 12h16" }],
    ["path", { "d": "M4 19h16" }]
  ];
  Icon($$renderer, spread_props([
    { name: "menu" },
    $$sanitized_props,
    {
      /**
       * @component @name Menu
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNCA1aDE2IiAvPgogIDxwYXRoIGQ9Ik00IDEyaDE2IiAvPgogIDxwYXRoIGQ9Ik00IDE5aDE2IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/menu
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
function Sidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let currentPath, currentUser, userDisplayName, userEmail, currentNavEntry;
    const menuSections = [
      {
        title: "INFORMATIVOS",
        collapsible: false,
        items: [
          { name: "Dashboard", href: "/", icon: Layout_dashboard },
          {
            name: "Tarefas",
            href: "/operacao/tarefas",
            icon: Square_check_big
          },
          { name: "Agenda", href: "/operacao/agenda", icon: Calendar },
          {
            name: "Acompanhamento",
            href: "/operacao/acompanhamento",
            icon: File_text
          },
          {
            name: "Recados",
            href: "/operacao/recados",
            icon: Message_square
          },
          {
            name: "Aniversariantes",
            href: "/aniversariantes",
            icon: Gift
          }
        ]
      },
      {
        title: "OPERAÇÃO",
        collapsible: true,
        items: [
          { name: "Vendas", href: "/vendas", icon: Shopping_cart },
          { name: "Clientes", href: "/clientes", icon: Users },
          { name: "Viagens", href: "/operacao/viagens", icon: Plane },
          { name: "Orçamentos", href: "/orcamentos", icon: File_text },
          {
            name: "Roteiros",
            href: "/orcamentos/roteiros",
            icon: Map
          },
          { name: "Vouchers", href: "/operacao/vouchers", icon: Ticket },
          {
            name: "Controle SAC",
            href: "/operacao/controle-sac",
            icon: Circle_alert
          },
          {
            name: "Campanhas",
            href: "/operacao/campanhas",
            icon: Megaphone
          },
          {
            name: "Documentos",
            href: "/operacao/documentos-viagens",
            icon: File_text
          },
          {
            name: "Consultoria Online",
            href: "/consultoria-online",
            icon: Video
          }
        ]
      },
      {
        title: "FINANCEIRO",
        collapsible: true,
        items: [
          { name: "Caixa", href: "/financeiro/caixa", icon: Trending_up },
          {
            name: "Conciliação",
            href: "/financeiro/conciliacao",
            icon: File_spreadsheet
          },
          {
            name: "Comissionamento",
            href: "/financeiro/comissoes",
            icon: Wallet
          },
          {
            name: "Fechamento",
            href: "/comissoes/fechamento",
            icon: Wallet
          },
          {
            name: "Ajustes Vendas",
            href: "/financeiro/ajustes-vendas",
            icon: Settings
          },
          {
            name: "Formas de Pagto",
            href: "/financeiro/formas-pagamento",
            icon: Credit_card
          },
          { name: "Regras", href: "/financeiro/regras", icon: Settings }
        ]
      },
      {
        title: "RELATÓRIOS",
        collapsible: true,
        items: [
          {
            name: "Vendas",
            href: "/relatorios/vendas",
            icon: File_spreadsheet
          },
          {
            name: "Por produto",
            href: "/relatorios/produtos",
            icon: Package
          },
          {
            name: "Por cliente",
            href: "/relatorios/clientes",
            icon: Users
          },
          {
            name: "Por destino",
            href: "/relatorios/destinos",
            icon: Map_pinned
          },
          {
            name: "Ranking",
            href: "/relatorios/ranking",
            icon: File_spreadsheet
          }
        ]
      },
      {
        title: "PARÂMETROS",
        collapsible: true,
        items: [
          { name: "Parâmetros", href: "/parametros", icon: Settings },
          { name: "Metas", href: "/parametros/metas", icon: Trending_up },
          { name: "Equipe", href: "/parametros/equipe", icon: Users },
          { name: "Escalas", href: "/parametros/escalas", icon: Calendar },
          { name: "Câmbios", href: "/parametros/cambios", icon: Banknote },
          {
            name: "Tipo Pacotes",
            href: "/parametros/tipo-pacotes",
            icon: Package
          },
          {
            name: "Tipo Produtos",
            href: "/parametros/tipo-produtos",
            icon: Package
          },
          {
            name: "Orçamentos PDF",
            href: "/parametros/orcamentos",
            icon: File_text
          },
          {
            name: "Avisos / CRM",
            href: "/parametros/avisos",
            icon: Message_square
          },
          {
            name: "Empresa",
            href: "/parametros/empresa",
            icon: Building_2
          }
        ]
      },
      {
        title: "PERFIL",
        collapsible: true,
        items: [
          { name: "Meu Perfil", href: "/perfil", icon: Circle_user },
          { name: "Minha Escala", href: "/perfil/escala", icon: Calendar },
          { name: "Autenticação 2FA", href: "/perfil/mfa", icon: Shield },
          {
            name: "Personalizar Menu",
            href: "/perfil/personalizar",
            icon: Settings
          },
          {
            name: "Preferências",
            href: "/operacao/minhas-preferencias",
            icon: Star
          }
        ]
      }
    ];
    const adminItems = [
      { name: "Administração", href: "/admin", icon: Shield },
      { name: "Usuários", href: "/admin/usuarios", icon: Users },
      { name: "Permissões", href: "/admin/permissoes", icon: Shield },
      { name: "Tipos", href: "/admin/tipos-usuario", icon: Users },
      { name: "Empresas", href: "/admin/empresas", icon: Building_2 },
      { name: "Financeiro", href: "/admin/financeiro", icon: Wallet },
      { name: "Planos", href: "/admin/planos", icon: Credit_card },
      {
        name: "Aniversariantes",
        href: "/admin/aniversariantes",
        icon: Gift
      },
      { name: "Avisos", href: "/admin/avisos", icon: File_text },
      { name: "E-mail", href: "/admin/email", icon: Settings },
      { name: "CRM", href: "/admin/crm", icon: Message_square },
      {
        name: "Módulos",
        href: "/admin/modulos-sistema",
        icon: Settings
      },
      {
        name: "Param. Importação",
        href: "/admin/parametros-importacao",
        icon: Settings
      }
    ];
    let collapsed = {};
    let refreshingPerms = false;
    function isActive(href) {
      if (!href) return false;
      if (href === "/") return currentPath === "/";
      return currentPath.startsWith(href);
    }
    const mobileNavEntries = [
      { name: "Dashboard", href: "/", icon: Layout_dashboard },
      { name: "Clientes", href: "/clientes", icon: Users },
      { name: "Vendas", href: "/vendas", icon: Shopping_cart },
      { name: "Orçamentos", href: "/orcamentos", icon: File_text },
      {
        name: "Roteiros",
        href: "/orcamentos/roteiros",
        icon: Map
      },
      { name: "Viagens", href: "/operacao/viagens", icon: Plane },
      { name: "Vouchers", href: "/operacao/vouchers", icon: Ticket },
      {
        name: "Tarefas",
        href: "/operacao/tarefas",
        icon: Square_check_big
      },
      { name: "Agenda", href: "/operacao/agenda", icon: Calendar },
      {
        name: "Acompanhamento",
        href: "/operacao/acompanhamento",
        icon: File_text
      },
      {
        name: "SAC",
        href: "/operacao/controle-sac",
        icon: Circle_alert
      },
      {
        name: "Campanhas",
        href: "/operacao/campanhas",
        icon: Megaphone
      },
      {
        name: "Documentos",
        href: "/operacao/documentos-viagens",
        icon: File_text
      },
      {
        name: "Consultoria",
        href: "/consultoria-online",
        icon: Video
      },
      {
        name: "Aniversariantes",
        href: "/aniversariantes",
        icon: Gift
      },
      { name: "Caixa", href: "/financeiro/caixa", icon: Trending_up },
      {
        name: "Conciliação",
        href: "/financeiro/conciliacao",
        icon: File_spreadsheet
      },
      {
        name: "Comissões",
        href: "/financeiro/comissoes",
        icon: Wallet
      },
      {
        name: "Fechamento",
        href: "/comissoes/fechamento",
        icon: Wallet
      },
      {
        name: "Relatórios",
        href: "/relatorios",
        icon: File_spreadsheet
      },
      { name: "Parâmetros", href: "/parametros", icon: Settings },
      { name: "Admin", href: "/admin", icon: Shield },
      { name: "Perfil", href: "/perfil", icon: Circle_user }
    ];
    currentPath = store_get($$store_subs ??= {}, "$page", page).url.pathname;
    currentUser = store_get($$store_subs ??= {}, "$auth", auth).user;
    userDisplayName = currentUser?.user_metadata?.nome_completo || currentUser?.user_metadata?.nome || currentUser?.email?.split("@")[0] || "Usuario";
    userEmail = currentUser?.email || "Sem email";
    currentNavEntry = (() => {
      const sorted = [...mobileNavEntries].sort((a, b) => b.href.length - a.href.length);
      if (currentPath === "/") return mobileNavEntries.find((e) => e.href === "/") ?? mobileNavEntries[0];
      return sorted.find((e) => e.href !== "/" && currentPath.startsWith(e.href)) ?? mobileNavEntries[0];
    })();
    if (store_get($$store_subs ??= {}, "$isMobile", isMobile) && store_get($$store_subs ??= {}, "$sidebar", sidebar).isOpen) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="fixed inset-0 bg-black/50 z-[998]" role="button" tabindex="0" aria-label="Fechar menu"></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (!store_get($$store_subs ??= {}, "$isMobile", isMobile) || store_get($$store_subs ??= {}, "$sidebar", sidebar).isOpen) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<aside${attr_class("vtur-sidebar", void 0, {
        "vtur-sidebar--open": store_get($$store_subs ??= {}, "$isMobile", isMobile) && store_get($$store_subs ??= {}, "$sidebar", sidebar).isOpen
      })} aria-label="Menu principal do sistema"${attr_style(store_get($$store_subs ??= {}, "$isMobile", isMobile) ? "position:fixed;top:0;left:0;height:100svh;width:min(88vw,300px);z-index:999;" : "")}><div class="vtur-sidebar__header"><a href="/" class="vtur-sidebar__brand"><img src="/brand/vtur-symbol.svg" alt="VTUR" class="vtur-sidebar__brand-image"/> <div class="vtur-sidebar__brand-copy"><span class="vtur-sidebar__brand-wordmark">VTUR</span> <span class="vtur-sidebar__brand-tagline">CRM para Franquias CVC</span></div></a></div> <div class="vtur-sidebar__body scrollbar-dark"><!--[-->`);
      const each_array = ensure_array_like(menuSections);
      for (let idx = 0, $$length = each_array.length; idx < $$length; idx++) {
        let section = each_array[idx];
        $$renderer2.push(`<section class="vtur-sidebar__section">`);
        if (section.collapsible) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button type="button" class="vtur-sidebar__section-toggle"${attr("aria-expanded", !collapsed[idx])}><span class="vtur-sidebar__section-title">${escape_html(section.title)}</span> `);
          Chevron_down($$renderer2, {
            size: 12,
            class: `transition-transform duration-200 ${stringify(collapsed[idx] ? "" : "rotate-180")}`
          });
          $$renderer2.push(`<!----></button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<h2 class="vtur-sidebar__section-title px-1">${escape_html(section.title)}</h2>`);
        }
        $$renderer2.push(`<!--]--> `);
        if (!section.collapsible || !collapsed[idx]) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<nav class="vtur-sidebar__nav"${attr("aria-label", section.title)}><!--[-->`);
          const each_array_1 = ensure_array_like(section.items);
          for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
            let item = each_array_1[$$index];
            if (item.disabled) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<div class="vtur-sidebar__item vtur-sidebar__item--disabled" aria-disabled="true"><div class="vtur-sidebar__item-main">`);
              if (item.icon) {
                $$renderer2.push("<!--[-->");
                item.icon($$renderer2, { size: 17, class: "vtur-sidebar__item-icon" });
                $$renderer2.push("<!--]-->");
              } else {
                $$renderer2.push("<!--[!-->");
                $$renderer2.push("<!--]-->");
              }
              $$renderer2.push(` <span class="vtur-sidebar__item-label">${escape_html(item.name)}</span></div> `);
              if (item.badge) {
                $$renderer2.push("<!--[0-->");
                $$renderer2.push(`<span class="vtur-sidebar__badge">${escape_html(item.badge)}</span>`);
              } else {
                $$renderer2.push("<!--[-1-->");
              }
              $$renderer2.push(`<!--]--></div>`);
            } else if (item.href) {
              $$renderer2.push("<!--[1-->");
              $$renderer2.push(`<a${attr("href", item.href)}${attr_class("vtur-sidebar__item", void 0, { "vtur-sidebar__item--active": isActive(item.href) })}${attr("aria-current", isActive(item.href) ? "page" : void 0)}><div class="vtur-sidebar__item-main">`);
              if (item.icon) {
                $$renderer2.push("<!--[-->");
                item.icon($$renderer2, {
                  size: 17,
                  class: `vtur-sidebar__item-icon ${stringify(isActive(item.href) ? "text-blue-600" : "")}`
                });
                $$renderer2.push("<!--]-->");
              } else {
                $$renderer2.push("<!--[!-->");
                $$renderer2.push("<!--]-->");
              }
              $$renderer2.push(` <span class="vtur-sidebar__item-label">${escape_html(item.name)}</span></div> `);
              if (item.badge) {
                $$renderer2.push("<!--[0-->");
                $$renderer2.push(`<span class="vtur-sidebar__badge">${escape_html(item.badge)}</span>`);
              } else {
                $$renderer2.push("<!--[-1-->");
              }
              $$renderer2.push(`<!--]--></a>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]--></nav>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></section>`);
      }
      $$renderer2.push(`<!--]--> `);
      if (store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || store_get($$store_subs ??= {}, "$permissoes", permissoes).isMaster || store_get($$store_subs ??= {}, "$permissoes", permissoes).permissoes.admin || store_get($$store_subs ??= {}, "$permissoes", permissoes).permissoes.admin_users) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<section class="vtur-sidebar__section"><h2 class="vtur-sidebar__section-title px-1">ADMIN</h2> <nav class="vtur-sidebar__nav" aria-label="Admin"><!--[-->`);
        const each_array_2 = ensure_array_like(adminItems);
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let item = each_array_2[$$index_2];
          $$renderer2.push(`<a${attr("href", item.href)}${attr_class("vtur-sidebar__item", void 0, { "vtur-sidebar__item--active": isActive(item.href) })}${attr("aria-current", isActive(item.href) ? "page" : void 0)}><div class="vtur-sidebar__item-main">`);
          if (item.icon) {
            $$renderer2.push("<!--[-->");
            item.icon($$renderer2, {
              size: 17,
              class: `vtur-sidebar__item-icon ${stringify(isActive(item.href) ? "text-blue-600" : "")}`
            });
            $$renderer2.push("<!--]-->");
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push("<!--]-->");
          }
          $$renderer2.push(` <span class="vtur-sidebar__item-label">${escape_html(item.name)}</span></div></a>`);
        }
        $$renderer2.push(`<!--]--></nav></section>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="vtur-sidebar__footer"><div class="vtur-sidebar__quick-actions"><a href="/operacao/agenda" class="vtur-sidebar__quick-link">`);
      Calendar($$renderer2, { size: 15 });
      $$renderer2.push(`<!----> <span>Agenda</span></a> <button type="button" class="vtur-sidebar__quick-link"${attr("disabled", refreshingPerms, true)} aria-label="Atualizar permissões">`);
      Refresh_cw($$renderer2, { size: 15, class: "" });
      $$renderer2.push(`<!----> <span>${escape_html("Atualizar permissões")}</span></button></div> <div class="vtur-sidebar__profile"><div class="vtur-sidebar__avatar">${escape_html(userDisplayName.slice(0, 2).toUpperCase())}</div> <div class="vtur-sidebar__profile-copy"><p class="vtur-sidebar__profile-name">${escape_html(userDisplayName)}</p> <p class="vtur-sidebar__profile-meta">${escape_html(userEmail)}</p></div></div></div></aside>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (store_get($$store_subs ??= {}, "$isMobile", isMobile)) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<nav class="fixed bottom-0 left-0 right-0 z-[996] border-t border-slate-700/60 bg-slate-900/96 backdrop-blur-md" style="display:grid;grid-template-columns:72px minmax(0,1fr) 72px;align-items:center;gap:6px;padding:8px 10px;padding-bottom:max(8px,env(safe-area-inset-bottom));box-sizing:border-box;" aria-label="Navegação principal"><button type="button"${attr_class(`flex flex-col items-center justify-center gap-1 rounded-xl border-0 bg-transparent px-2 py-2 transition-colors ${stringify(store_get($$store_subs ??= {}, "$sidebar", sidebar).isOpen ? "text-sky-400" : "text-slate-400")}`)} style="min-height:52px;" aria-label="Abrir menu">`);
      Menu($$renderer2, { size: 24 });
      $$renderer2.push(`<!----> <span class="text-[10px] font-medium leading-none">Menu</span></button> <a${attr("href", currentNavEntry.href)} class="flex flex-row items-center justify-center gap-2 rounded-xl no-underline transition-colors text-sky-200" style="background:rgba(37,99,235,0.22);min-height:52px;padding:10px 14px;"${attr("aria-label", currentNavEntry.name)}>`);
      if (currentNavEntry.icon) {
        $$renderer2.push("<!--[-->");
        currentNavEntry.icon($$renderer2, { size: 24 });
        $$renderer2.push("<!--]-->");
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push("<!--]-->");
      }
      $$renderer2.push(` <span class="text-base font-extrabold leading-tight truncate">${escape_html(currentNavEntry.name)}</span></a> <span aria-hidden="true"></span></nav>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function Topbar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let currentUser, userDisplayName, userEmail, userInitials;
    let userDropdownOpen = false;
    currentUser = store_get($$store_subs ??= {}, "$auth", auth).user;
    userDisplayName = currentUser?.user_metadata?.nome_completo || currentUser?.user_metadata?.nome || currentUser?.email?.split("@")[0] || "Usuario";
    userEmail = currentUser?.email || "Sem email";
    userInitials = userDisplayName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<header class="vtur-topbar"><div class="vtur-topbar__inner"><div class="vtur-topbar__left"><a href="/" class="vtur-topbar__brand" aria-label="VTUR inicio"><img src="/brand/vtur-symbol.svg" alt="VTUR" class="vtur-topbar__brand-image"/> `);
      if (!store_get($$store_subs ??= {}, "$isMobile", isMobile)) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="vtur-topbar__brand-copy"><span class="vtur-topbar__brand-wordmark">VTUR</span> <span class="vtur-topbar__brand-tagline">CRM para Franquias CVC</span></div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--></a></div> <div class="vtur-topbar__actions">`);
      if (!store_get($$store_subs ??= {}, "$isMobile", isMobile)) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<a href="/operacao/agenda" class="vtur-icon-button" aria-label="Ir para Agenda">`);
        Calendar($$renderer3, { size: 18 });
        $$renderer3.push(`<!----></a> <button class="vtur-icon-button relative" type="button" aria-label="Recados">`);
        Bell($$renderer3, { size: 18 });
        $$renderer3.push(`<!----></button>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> <div class="relative"><button id="user-menu-btn" type="button" class="vtur-user-chip cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200" aria-label="Menu do usuário" aria-haspopup="true"${attr("aria-expanded", userDropdownOpen)}><div class="vtur-user-chip__avatar">${escape_html(userInitials || "VT")}</div> `);
      if (!store_get($$store_subs ??= {}, "$isMobile", isMobile)) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="vtur-user-chip__copy"><span class="vtur-user-chip__name">${escape_html(userDisplayName)}</span> <span class="vtur-user-chip__email">${escape_html(userEmail)}</span></div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--></button> `);
      Dropdown($$renderer3, {
        triggeredBy: "#user-menu-btn",
        class: "z-[1100] min-w-[200px]",
        get open() {
          return userDropdownOpen;
        },
        set open($$value) {
          userDropdownOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="px-4 py-3"><p class="truncate text-xs font-medium text-slate-800">${escape_html(userDisplayName)}</p> <p class="truncate text-xs text-slate-500">${escape_html(userEmail)}</p></div> `);
          DropdownDivider($$renderer4, {});
          $$renderer4.push(`<!----> `);
          DropdownItem($$renderer4, {
            href: "/perfil",
            children: ($$renderer5) => {
              User($$renderer5, { size: 15, class: "mr-2 text-slate-500" });
              $$renderer5.push(`<!----> Meu Perfil`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          DropdownItem($$renderer4, {
            href: "/operacao/agenda",
            children: ($$renderer5) => {
              Calendar($$renderer5, { size: 15, class: "mr-2 text-slate-500" });
              $$renderer5.push(`<!----> Minha Agenda`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          DropdownItem($$renderer4, {
            href: "/perfil/mfa",
            children: ($$renderer5) => {
              Shield($$renderer5, { size: 15, class: "mr-2 text-slate-500" });
              $$renderer5.push(`<!----> Autenticação 2FA`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          DropdownItem($$renderer4, {
            href: "/parametros",
            children: ($$renderer5) => {
              Settings($$renderer5, { size: 15, class: "mr-2 text-slate-500" });
              $$renderer5.push(`<!----> Parâmetros`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          DropdownDivider($$renderer4, {});
          $$renderer4.push(`<!----> `);
          DropdownItem($$renderer4, {
            class: "text-red-600 hover:bg-red-50",
            children: ($$renderer5) => {
              Log_out($$renderer5, { size: 15, class: "mr-2" });
              $$renderer5.push(`<!----> ${escape_html("Sair")}`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----></div></div></div></header>`);
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
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    $$renderer2.push(`<div class="vtur-app-shell">`);
    Topbar($$renderer2);
    $$renderer2.push(`<!----> `);
    Sidebar($$renderer2);
    $$renderer2.push(`<!----> <main class="vtur-layout"${attr_style(store_get($$store_subs ??= {}, "$isMobile", isMobile) ? "margin-left:0;padding-top:3.5rem;padding-left:0.75rem;padding-right:0.75rem;padding-bottom:calc(60px + env(safe-area-inset-bottom,0px) + 0.5rem);" : "")}><div class="vtur-page-wrap">`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="flex items-center justify-center min-h-[60vh]"><div class="flex flex-col items-center gap-3 text-slate-400"><svg class="animate-spin h-8 w-8 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg> <span class="text-sm">Carregando...</span></div></div>`);
    }
    $$renderer2.push(`<!--]--></div></main></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
