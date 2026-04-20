import { c as sanitize_props, o as spread_props, k as slot, f as fallback, e as escape_html, t as ensure_array_like, p as attr_class, v as stringify, q as attr, m as bind_props } from "./index2.js";
import { B as Button } from "./Button2.js";
import "./ui.js";
import { c as createEmptyVoucherExtraData, n as normalizeVoucherExtraData, s as splitLinesFromMultilineText } from "./extraData.js";
import { X } from "./x.js";
import { M as Map_pin } from "./map-pin.js";
import { C as Calendar } from "./calendar.js";
import { H as Hotel } from "./hotel.js";
import { I as Icon } from "./Icon.js";
import { C as Circle_check_big } from "./circle-check-big.js";
import { F as File_text } from "./file-text.js";
import { U as Users } from "./users.js";
import { P as Plus } from "./plus.js";
import { T as Trash_2 } from "./trash-2.js";
import { C as Chevron_down } from "./chevron-down.js";
import { P as Plane } from "./plane.js";
import { C as Circle_alert } from "./circle-alert.js";
import { P as Phone } from "./phone.js";
import { S as Save } from "./save.js";
function Chevron_up($$renderer, $$props) {
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
  const iconNode = [["path", { "d": "m18 15-6-6-6 6" }]];
  Icon($$renderer, spread_props([
    { name: "chevron-up" },
    $$sanitized_props,
    {
      /**
       * @component @name ChevronUp
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTggMTUtNi02LTYgNiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/chevron-up
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
function File_down($$renderer, $$props) {
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
        "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
      }
    ],
    ["path", { "d": "M14 2v5a1 1 0 0 0 1 1h5" }],
    ["path", { "d": "M12 18v-6" }],
    ["path", { "d": "m9 15 3 3 3-3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "file-down" },
    $$sanitized_props,
    {
      /**
       * @component @name FileDown
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNiAyMmEyIDIgMCAwIDEtMi0yVjRhMiAyIDAgMCAxIDItMmg4YTIuNCAyLjQgMCAwIDEgMS43MDQuNzA2bDMuNTg4IDMuNTg4QTIuNCAyLjQgMCAwIDEgMjAgOHYxMmEyIDIgMCAwIDEtMiAyeiIgLz4KICA8cGF0aCBkPSJNMTQgMnY1YTEgMSAwIDAgMCAxIDFoNSIgLz4KICA8cGF0aCBkPSJNMTIgMTh2LTYiIC8+CiAgPHBhdGggZD0ibTkgMTUgMyAzIDMtMyIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/file-down
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
function Info($$renderer, $$props) {
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
    ["path", { "d": "M12 16v-4" }],
    ["path", { "d": "M12 8h.01" }]
  ];
  Icon($$renderer, spread_props([
    { name: "info" },
    $$sanitized_props,
    {
      /**
       * @component @name Info
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8cGF0aCBkPSJNMTIgMTZ2LTQiIC8+CiAgPHBhdGggZD0iTTEyIDhoLjAxIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/info
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
function Move_down($$renderer, $$props) {
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
    ["path", { "d": "M8 18L12 22L16 18" }],
    ["path", { "d": "M12 2V22" }]
  ];
  Icon($$renderer, spread_props([
    { name: "move-down" },
    $$sanitized_props,
    {
      /**
       * @component @name MoveDown
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNOCAxOEwxMiAyMkwxNiAxOCIgLz4KICA8cGF0aCBkPSJNMTIgMlYyMiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/move-down
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
function Move_up($$renderer, $$props) {
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
    ["path", { "d": "M8 6L12 2L16 6" }],
    ["path", { "d": "M12 2V22" }]
  ];
  Icon($$renderer, spread_props([
    { name: "move-up" },
    $$sanitized_props,
    {
      /**
       * @component @name MoveUp
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNOCA2TDEyIDJMMTYgNiIgLz4KICA8cGF0aCBkPSJNMTIgMlYyMiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/move-up
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
function Printer($$renderer, $$props) {
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
        "d": "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
      }
    ],
    ["path", { "d": "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" }],
    [
      "rect",
      { "x": "6", "y": "14", "width": "12", "height": "8", "rx": "1" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "printer" },
    $$sanitized_props,
    {
      /**
       * @component @name Printer
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNiAxOEg0YTIgMiAwIDAgMS0yLTJ2LTVhMiAyIDAgMCAxIDItMmgxNmEyIDIgMCAwIDEgMiAydjVhMiAyIDAgMCAxLTIgMmgtMiIgLz4KICA8cGF0aCBkPSJNNiA5VjNhMSAxIDAgMCAxIDEtMWgxMGExIDEgMCAwIDEgMSAxdjYiIC8+CiAgPHJlY3QgeD0iNiIgeT0iMTQiIHdpZHRoPSIxMiIgaGVpZ2h0PSI4IiByeD0iMSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/printer
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
function Smartphone($$renderer, $$props) {
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
        "width": "14",
        "height": "20",
        "x": "5",
        "y": "2",
        "rx": "2",
        "ry": "2"
      }
    ],
    ["path", { "d": "M12 18h.01" }]
  ];
  Icon($$renderer, spread_props([
    { name: "smartphone" },
    $$sanitized_props,
    {
      /**
       * @component @name Smartphone
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMTQiIGhlaWdodD0iMjAiIHg9IjUiIHk9IjIiIHJ4PSIyIiByeT0iMiIgLz4KICA8cGF0aCBkPSJNMTIgMThoLjAxIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/smartphone
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
function Square_pen($$renderer, $$props) {
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
        "d": "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
      }
    ],
    [
      "path",
      {
        "d": "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "square-pen" },
    $$sanitized_props,
    {
      /**
       * @component @name SquarePen
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgM0g1YTIgMiAwIDAgMC0yIDJ2MTRhMiAyIDAgMCAwIDIgMmgxNGEyIDIgMCAwIDAgMi0ydi03IiAvPgogIDxwYXRoIGQ9Ik0xOC4zNzUgMi42MjVhMSAxIDAgMCAxIDMgM2wtOS4wMTMgOS4wMTRhMiAyIDAgMCAxLS44NTMuNTA1bC0yLjg3My44NGEuNS41IDAgMCAxLS42Mi0uNjJsLjg0LTIuODczYTIgMiAwIDAgMSAuNTA2LS44NTJ6IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/square-pen
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
function createEmptyVoucherImport(provider) {
  return {
    provider,
    nome: "",
    codigo_systur: "",
    codigo_fornecedor: "",
    reserva_online: "",
    passageiros: "",
    tipo_acomodacao: "",
    operador: "",
    resumo: "",
    data_inicio: "",
    data_fim: "",
    dias: [],
    hoteis: [],
    extra_data: createEmptyVoucherExtraData()
  };
}
function VoucherEditorModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let open = fallback($$props["open"], false);
    let voucher = fallback($$props["voucher"], null);
    let companyId = fallback($$props["companyId"], null);
    let assets = fallback($$props["assets"], () => [], true);
    let form;
    let currentStep = 0;
    let saving = false;
    let savingAsDraft = false;
    let circuitPasteText = "";
    let hotelPasteText = "";
    let activeDayIndexes = [];
    let activeHotelIndexes = [];
    let validationErrors = {};
    const steps = [
      {
        label: "Dados da Viagem",
        icon: Map_pin,
        description: "Informações básicas"
      },
      { label: "Dia a Dia", icon: Calendar, description: "Circuito" },
      { label: "Hotéis", icon: Hotel, description: "Acomodações" },
      { label: "Extras", icon: Info, description: "Traslados e mais" }
    ];
    const providers = [
      { value: "special_tours", label: "Special Tours" },
      { value: "europamundo", label: "Europamundo" }
    ];
    const acomodacaoOptions = [
      "Duplo",
      "Triplo",
      "Quádruplo",
      "Individual",
      "Casal",
      "Família (2 adultos + 1 criança)",
      "Família (2 adultos + 2 crianças)"
    ];
    const statusOptions = [
      { value: "Confirmado", label: "Confirmado" },
      { value: "Pendente", label: "Pendente" },
      { value: "Sob Consulta", label: "Sob Consulta" },
      { value: "Não Disponível", label: "Não Disponível" }
    ];
    function initForm() {
      const empty = createEmptyVoucherImport("special_tours");
      return {
        id: null,
        provider: empty.provider,
        nome: empty.nome,
        codigo_systur: empty.codigo_systur,
        codigo_fornecedor: empty.codigo_fornecedor,
        reserva_online: empty.reserva_online,
        passageiros: empty.passageiros,
        tipo_acomodacao: empty.tipo_acomodacao,
        operador: empty.operador,
        resumo: empty.resumo,
        data_inicio: empty.data_inicio,
        data_fim: empty.data_fim,
        ativo: true,
        status: "rascunho",
        extra_data: normalizeVoucherExtraData(empty.extra_data),
        dias: [],
        hoteis: []
      };
    }
    function formFromVoucher(v) {
      return {
        id: v.id,
        provider: v.provider,
        nome: v.nome || "",
        codigo_systur: v.codigo_systur || "",
        codigo_fornecedor: v.codigo_fornecedor || "",
        reserva_online: v.reserva_online || "",
        passageiros: v.passageiros || "",
        tipo_acomodacao: v.tipo_acomodacao || "",
        operador: v.operador || "",
        resumo: v.resumo || "",
        data_inicio: v.data_inicio || "",
        data_fim: v.data_fim || "",
        ativo: v.ativo !== false,
        status: v.status || "finalizado",
        extra_data: normalizeVoucherExtraData(v.extra_data, v.provider),
        dias: (v.voucher_dias || []).map((d, i) => ({ ...d, ordem: d.ordem ?? i })),
        hoteis: (v.voucher_hoteis || []).map((h, i) => ({ ...h, ordem: h.ordem ?? i }))
      };
    }
    function formatDateBR2(value) {
      if (!value) return "";
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
    }
    function getStepStatus(stepIndex) {
      if (stepIndex < currentStep) return "completed";
      if (stepIndex === currentStep) return "current";
      return "pending";
    }
    if (open) {
      form = voucher ? formFromVoucher(voucher) : initForm();
      currentStep = 0;
      circuitPasteText = "";
      hotelPasteText = "";
      activeDayIndexes = [];
      activeHotelIndexes = [];
      validationErrors = {};
    }
    if (
      // ========== PASSAGEIROS ==========
      // ========== APPS RECOMENDADOS ==========
      // ========== VALIDAÇÃO ==========
      // Só permite voltar ou avançar se passar na validação
      // ========== SALVAMENTO ==========
      // Validação final
      open
    ) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="fixed inset-0 bg-slate-900/50 z-[100] flex items-start justify-center pt-4 pb-4 px-4" style="overflow-y: auto;"><div class="bg-white rounded-xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col" style="max-height: calc(100vh - 32px);"><div class="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-clientes-50 to-white"><div><h2 class="text-xl font-bold text-slate-900">${escape_html(voucher ? "Editar Voucher" : "Novo Voucher")}</h2> <p class="text-sm text-slate-500">${escape_html(providers.find((p) => p.value === form.provider)?.label)} `);
      if (form.status === "rascunho") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Rascunho</span>`);
      } else if (form.status === "finalizado") {
        $$renderer2.push("<!--[1-->");
        $$renderer2.push(`<span class="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Finalizado</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></p></div> <button class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">`);
      X($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button></div> <div class="bg-slate-50 border-b border-slate-200"><div class="flex"><!--[-->`);
      const each_array = ensure_array_like(steps);
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        let step = each_array[i];
        const status = getStepStatus(i);
        $$renderer2.push(`<button type="button"${attr_class(`flex-1 py-4 px-2 flex flex-col items-center justify-center gap-1 text-sm font-medium transition-all relative ${stringify(status === "current" ? "bg-white text-clientes-700 border-b-2 border-clientes-500" : status === "completed" ? "text-green-600 hover:bg-green-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100")}`)}><div class="flex items-center gap-2"><div${attr_class(`w-6 h-6 rounded-full flex items-center justify-center text-xs ${stringify(status === "current" ? "bg-clientes-500 text-white" : status === "completed" ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500")}`)}>`);
        if (status === "completed") {
          $$renderer2.push("<!--[0-->");
          Circle_check_big($$renderer2, { size: 14 });
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`${escape_html(i + 1)}`);
        }
        $$renderer2.push(`<!--]--></div> <span class="hidden sm:inline font-semibold">${escape_html(step.label)}</span></div> <span class="text-xs opacity-75 hidden md:inline">${escape_html(step.description)}</span></button>`);
      }
      $$renderer2.push(`<!--]--></div></div> <div class="flex-1 overflow-y-auto p-6 bg-slate-50" style="min-height: 400px;">`);
      if (currentStep === 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="space-y-6"><div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><label class="block text-sm font-medium text-slate-700 mb-3">Fornecedor</label> `);
        if (voucher) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="py-2 px-4 rounded-lg border-2 border-clientes-500 bg-clientes-50 text-clientes-700 inline-block font-medium">${escape_html(providers.find((p) => p.value === form.provider)?.label)}</div> <p class="text-xs text-slate-500 mt-2">O fornecedor não pode ser alterado em um voucher existente.</p>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="flex gap-3"><!--[-->`);
          const each_array_1 = ensure_array_like(providers);
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let p = each_array_1[$$index_1];
            $$renderer2.push(`<button type="button"${attr_class(`flex-1 py-3 px-4 rounded-lg border-2 transition-all font-medium ${stringify(form.provider === p.value ? "border-clientes-500 bg-clientes-50 text-clientes-700 shadow-sm" : "border-slate-200 hover:border-slate-300 text-slate-600")}`)}>${escape_html(p.label)}</button>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]--></div> <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">`);
        File_text($$renderer2, { size: 20, class: "text-clientes-500" });
        $$renderer2.push(`<!----> Informações Principais</h3> <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="md:col-span-2"><label class="block text-sm font-medium text-slate-700 mb-1">Nome do Voucher <span class="text-red-500">*</span></label> <input type="text"${attr("value", form.nome)}${attr_class(`vtur-input w-full ${stringify(validationErrors.nome ? "border-red-500" : "")}`)} placeholder="Ex: Circuito Europa 2024"/> `);
        if (validationErrors.nome) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<p class="text-red-500 text-xs mt-1">${escape_html(validationErrors.nome)}</p>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Código SYSTUR</label> <input type="text"${attr("value", form.codigo_systur)} class="vtur-input w-full" placeholder="Código interno"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Código Fornecedor</label> <input type="text"${attr("value", form.codigo_fornecedor)} class="vtur-input w-full" placeholder="Código do fornecedor"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Reserva Online</label> <input type="text"${attr("value", form.reserva_online)} class="vtur-input w-full" placeholder="Número da reserva"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Localizador Agência</label> <input type="text"${attr("value", form.extra_data.localizador_agencia)} class="vtur-input w-full" placeholder="Localizador da agência"/></div></div></div> <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">`);
        Calendar($$renderer2, { size: 20, class: "text-clientes-500" });
        $$renderer2.push(`<!----> Datas da Viagem</h3> <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Data Início <span class="text-red-500">*</span></label> <input type="date"${attr("value", form.data_inicio)}${attr_class(`vtur-input w-full ${stringify(validationErrors.data_inicio ? "border-red-500" : "")}`)}/> `);
        if (validationErrors.data_inicio) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<p class="text-red-500 text-xs mt-1">${escape_html(validationErrors.data_inicio)}</p>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Data Fim</label> <input type="date"${attr("value", form.data_fim)} class="vtur-input w-full"/></div></div></div> <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Tipo de Acomodação</label> `);
        $$renderer2.select({ value: form.tipo_acomodacao, class: "vtur-input w-full" }, ($$renderer3) => {
          $$renderer3.option({ value: "" }, ($$renderer4) => {
            $$renderer4.push(`Selecione...`);
          });
          $$renderer3.push(`<!--[-->`);
          const each_array_2 = ensure_array_like(acomodacaoOptions);
          for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
            let opt = each_array_2[$$index_2];
            $$renderer3.option({ value: opt }, ($$renderer4) => {
              $$renderer4.push(`${escape_html(opt)}`);
            });
          }
          $$renderer3.push(`<!--]-->`);
        });
        $$renderer2.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Operador</label> <input type="text"${attr("value", form.operador)} class="vtur-input w-full" placeholder="Nome do operador"/></div></div></div> <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-semibold text-slate-900 flex items-center gap-2">`);
        Users($$renderer2, { size: 20, class: "text-clientes-500" });
        $$renderer2.push(`<!----> Passageiros</h3> `);
        Button($$renderer2, {
          variant: "secondary",
          size: "sm",
          children: ($$renderer3) => {
            Plus($$renderer3, { size: 14, class: "mr-1" });
            $$renderer3.push(`<!----> Adicionar Passageiro`);
          },
          $$slots: { default: true }
        });
        $$renderer2.push(`<!----></div> `);
        if (form.extra_data.passageiros_detalhes?.length) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="space-y-3"><!--[-->`);
          const each_array_3 = ensure_array_like(form.extra_data.passageiros_detalhes);
          for (let i = 0, $$length = each_array_3.length; i < $$length; i++) {
            let passenger = each_array_3[i];
            $$renderer2.push(`<div class="p-4 bg-slate-50 rounded-lg border border-slate-200"><div class="flex items-center justify-between mb-3"><span class="text-sm font-medium text-slate-700">Passageiro ${escape_html(i + 1)}</span> <button class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">`);
            Trash_2($$renderer2, { size: 16 });
            $$renderer2.push(`<!----></button></div> <div class="grid grid-cols-1 md:grid-cols-3 gap-3"><div class="md:col-span-2"><label class="block text-xs font-medium text-slate-600 mb-1">Nome Completo</label> <input type="text"${attr("value", passenger.nome)} class="vtur-input w-full" placeholder="Nome do passageiro"/></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Passaporte</label> <input type="text"${attr("value", passenger.passaporte || "")} class="vtur-input w-full" placeholder="Número do passaporte"/></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Data Nascimento</label> <input type="date"${attr("value", passenger.data_nascimento || "")} class="vtur-input w-full"/></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Nacionalidade</label> <input type="text"${attr("value", passenger.nacionalidade || "")} class="vtur-input w-full" placeholder="Ex: Brasileira"/></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Tipo</label> `);
            $$renderer2.select({ value: passenger.tipo || "", class: "vtur-input w-full" }, ($$renderer3) => {
              $$renderer3.option({ value: "" }, ($$renderer4) => {
                $$renderer4.push(`Selecione...`);
              });
              $$renderer3.option({ value: "ADT" }, ($$renderer4) => {
                $$renderer4.push(`Adulto`);
              });
              $$renderer3.option({ value: "CHD" }, ($$renderer4) => {
                $$renderer4.push(`Criança`);
              });
              $$renderer3.option({ value: "INF" }, ($$renderer4) => {
                $$renderer4.push(`Bebê`);
              });
            });
            $$renderer2.push(`</div></div></div>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">`);
          Users($$renderer2, { size: 32, class: "mx-auto mb-2 opacity-50" });
          $$renderer2.push(`<!----> <p>Nenhum passageiro adicionado</p> <p class="text-sm">Clique em "Adicionar Passageiro" para incluir</p></div>`);
        }
        $$renderer2.push(`<!--]--></div> <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><label class="block text-sm font-medium text-slate-700 mb-2">Resumo da Viagem</label> <textarea rows="4" class="vtur-input w-full" placeholder="Descreva o resumo da viagem...">`);
        const $$body = escape_html(form.resumo);
        if ($$body) {
          $$renderer2.push(`${$$body}`);
        }
        $$renderer2.push(`</textarea></div></div>`);
      } else if (currentStep === 1) {
        $$renderer2.push("<!--[1-->");
        $$renderer2.push(`<div class="space-y-6"><div class="bg-blue-50 p-5 rounded-xl border border-blue-200"><label class="block text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">`);
        File_text($$renderer2, { size: 16 });
        $$renderer2.push(`<!----> Importar do Special Tours (colar texto)</label> <textarea rows="4" class="vtur-input w-full border-blue-200 focus:border-blue-500" placeholder="Cole aqui o itinerário do Special Tours...">`);
        const $$body_1 = escape_html(circuitPasteText);
        if ($$body_1) {
          $$renderer2.push(`${$$body_1}`);
        }
        $$renderer2.push(`</textarea> <div class="flex gap-2 mt-3">`);
        Button($$renderer2, {
          variant: "secondary",
          size: "sm",
          children: ($$renderer3) => {
            File_text($$renderer3, { size: 14, class: "mr-1" });
            $$renderer3.push(`<!----> Importar Itinerário`);
          },
          $$slots: { default: true }
        });
        $$renderer2.push(`<!----> `);
        if (circuitPasteText) {
          $$renderer2.push("<!--[0-->");
          Button($$renderer2, {
            variant: "ghost",
            size: "sm",
            children: ($$renderer3) => {
              $$renderer3.push(`<!---->Limpar`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div></div> <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-semibold text-slate-900">Dias do Circuito</h3> `);
        Button($$renderer2, {
          variant: "primary",
          size: "sm",
          children: ($$renderer3) => {
            Plus($$renderer3, { size: 14, class: "mr-1" });
            $$renderer3.push(`<!----> Adicionar Dia`);
          },
          $$slots: { default: true }
        });
        $$renderer2.push(`<!----></div> `);
        if (form.dias.length === 0) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">`);
          Calendar($$renderer2, { size: 40, class: "mx-auto mb-3 opacity-50" });
          $$renderer2.push(`<!----> <p class="font-medium">Nenhum dia adicionado</p> <p class="text-sm mt-1">Importe ou adicione manualmente os dias do circuito</p></div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="space-y-3"><!--[-->`);
          const each_array_4 = ensure_array_like(form.dias);
          for (let i = 0, $$length = each_array_4.length; i < $$length; i++) {
            let dia = each_array_4[i];
            $$renderer2.push(`<div class="border border-slate-200 rounded-xl overflow-hidden bg-white"><div class="w-full px-4 py-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition-colors cursor-pointer"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-full bg-clientes-100 text-clientes-700 flex items-center justify-center font-bold">${escape_html(dia.dia_numero)}</div> <div>`);
            if (dia.titulo) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<p class="font-medium text-slate-900">${escape_html(dia.titulo)}</p>`);
            } else {
              $$renderer2.push("<!--[-1-->");
              $$renderer2.push(`<p class="font-medium text-slate-400">Dia ${escape_html(dia.dia_numero)}</p>`);
            }
            $$renderer2.push(`<!--]--> `);
            if (dia.data_referencia) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<p class="text-sm text-slate-500">${escape_html(formatDateBR2(dia.data_referencia))}</p>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--></div></div> <div class="flex items-center gap-2"><button${attr("disabled", i === 0, true)} class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors">`);
            Move_up($$renderer2, { size: 18 });
            $$renderer2.push(`<!----></button> <button${attr("disabled", i === form.dias.length - 1, true)} class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors">`);
            Move_down($$renderer2, { size: 18 });
            $$renderer2.push(`<!----></button> <button class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">`);
            Trash_2($$renderer2, { size: 18 });
            $$renderer2.push(`<!----></button> `);
            if (activeDayIndexes.includes(i) ? Chevron_up : Chevron_down) {
              $$renderer2.push("<!--[-->");
              (activeDayIndexes.includes(i) ? Chevron_up : Chevron_down)($$renderer2, { size: 20, class: "text-slate-400 ml-2" });
              $$renderer2.push("<!--]-->");
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push("<!--]-->");
            }
            $$renderer2.push(`</div></div> `);
            if (activeDayIndexes.includes(i)) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<div class="p-4 space-y-4 border-t border-slate-100"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Título do Dia</label> <input type="text"${attr("value", dia.titulo)} class="vtur-input w-full" placeholder="Ex: Lisboa - Chegada"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Cidade</label> <input type="text"${attr("value", dia.cidade)} class="vtur-input w-full" placeholder="Nome da cidade"/></div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Descrição das Atividades</label> <textarea rows="5" class="vtur-input w-full" placeholder="Descreva as atividades do dia...">`);
              const $$body_2 = escape_html(dia.descricao);
              if ($$body_2) {
                $$renderer2.push(`${$$body_2}`);
              }
              $$renderer2.push(`</textarea></div></div>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--></div>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      } else if (currentStep === 2) {
        $$renderer2.push("<!--[2-->");
        $$renderer2.push(`<div class="space-y-6"><div class="bg-blue-50 p-5 rounded-xl border border-blue-200"><label class="block text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">`);
        File_text($$renderer2, { size: 16 });
        $$renderer2.push(`<!----> Importar Hotéis do Special Tours (colar texto)</label> <textarea rows="4" class="vtur-input w-full border-blue-200 focus:border-blue-500" placeholder="Cole aqui a lista de hotéis...">`);
        const $$body_3 = escape_html(hotelPasteText);
        if ($$body_3) {
          $$renderer2.push(`${$$body_3}`);
        }
        $$renderer2.push(`</textarea> <div class="flex gap-2 mt-3">`);
        Button($$renderer2, {
          variant: "secondary",
          size: "sm",
          children: ($$renderer3) => {
            File_text($$renderer3, { size: 14, class: "mr-1" });
            $$renderer3.push(`<!----> Importar Hotéis`);
          },
          $$slots: { default: true }
        });
        $$renderer2.push(`<!----> `);
        if (hotelPasteText) {
          $$renderer2.push("<!--[0-->");
          Button($$renderer2, {
            variant: "ghost",
            size: "sm",
            children: ($$renderer3) => {
              $$renderer3.push(`<!---->Limpar`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div></div> <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-semibold text-slate-900">Hotéis Confirmados</h3> `);
        Button($$renderer2, {
          variant: "primary",
          size: "sm",
          children: ($$renderer3) => {
            Plus($$renderer3, { size: 14, class: "mr-1" });
            $$renderer3.push(`<!----> Adicionar Hotel`);
          },
          $$slots: { default: true }
        });
        $$renderer2.push(`<!----></div> `);
        if (form.hoteis.length === 0) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">`);
          Hotel($$renderer2, { size: 40, class: "mx-auto mb-3 opacity-50" });
          $$renderer2.push(`<!----> <p class="font-medium">Nenhum hotel adicionado</p> <p class="text-sm mt-1">Importe ou adicione manualmente os hotéis</p></div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="space-y-3"><!--[-->`);
          const each_array_5 = ensure_array_like(form.hoteis);
          for (let i = 0, $$length = each_array_5.length; i < $$length; i++) {
            let hotel = each_array_5[i];
            $$renderer2.push(`<div class="border border-slate-200 rounded-xl overflow-hidden bg-white"><div class="w-full px-4 py-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition-colors cursor-pointer"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">`);
            Hotel($$renderer2, { size: 20 });
            $$renderer2.push(`<!----></div> <div><p class="font-medium text-slate-900">${escape_html(hotel.hotel || `Hotel ${i + 1}`)}</p> `);
            if (hotel.cidade) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<p class="text-sm text-slate-500">${escape_html(hotel.cidade)}</p>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--></div></div> <div class="flex items-center gap-2"><button${attr("disabled", i === 0, true)} class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors">`);
            Move_up($$renderer2, { size: 18 });
            $$renderer2.push(`<!----></button> <button${attr("disabled", i === form.hoteis.length - 1, true)} class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors">`);
            Move_down($$renderer2, { size: 18 });
            $$renderer2.push(`<!----></button> <button class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">`);
            Trash_2($$renderer2, { size: 18 });
            $$renderer2.push(`<!----></button> `);
            if (activeHotelIndexes.includes(i) ? Chevron_up : Chevron_down) {
              $$renderer2.push("<!--[-->");
              (activeHotelIndexes.includes(i) ? Chevron_up : Chevron_down)($$renderer2, { size: 20, class: "text-slate-400 ml-2" });
              $$renderer2.push("<!--]-->");
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push("<!--]-->");
            }
            $$renderer2.push(`</div></div> `);
            if (activeHotelIndexes.includes(i)) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<div class="p-4 space-y-4 border-t border-slate-100"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Cidade *</label> <input type="text"${attr("value", hotel.cidade)} class="vtur-input w-full" placeholder="Nome da cidade"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Hotel *</label> <input type="text"${attr("value", hotel.hotel)} class="vtur-input w-full" placeholder="Nome do hotel"/></div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Endereço</label> <input type="text"${attr("value", hotel.endereco)} class="vtur-input w-full" placeholder="Endereço completo do hotel"/></div> <div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Check-in</label> <input type="date"${attr("value", hotel.data_inicio)} class="vtur-input w-full"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Check-out</label> <input type="date"${attr("value", hotel.data_fim)} class="vtur-input w-full"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Noites</label> <input type="number"${attr("value", hotel.noites)} class="vtur-input w-full bg-slate-100" readonly=""/></div></div> <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Telefone</label> <input type="text"${attr("value", hotel.telefone)} class="vtur-input w-full" placeholder="Telefone do hotel"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Contato</label> <input type="text"${attr("value", hotel.contato)} class="vtur-input w-full" placeholder="Nome do contato"/></div></div> <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Status</label> `);
              $$renderer2.select({ value: hotel.status, class: "vtur-input w-full" }, ($$renderer3) => {
                $$renderer3.option({ value: "" }, ($$renderer4) => {
                  $$renderer4.push(`Selecione...`);
                });
                $$renderer3.push(`<!--[-->`);
                const each_array_6 = ensure_array_like(statusOptions);
                for (let $$index_5 = 0, $$length2 = each_array_6.length; $$index_5 < $$length2; $$index_5++) {
                  let opt = each_array_6[$$index_5];
                  $$renderer3.option({ value: opt.value }, ($$renderer4) => {
                    $$renderer4.push(`${escape_html(opt.label)}`);
                  });
                }
                $$renderer3.push(`<!--]-->`);
              });
              $$renderer2.push(`</div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Observação</label> <textarea rows="2" class="vtur-input w-full" placeholder="Observações sobre o hotel...">`);
              const $$body_4 = escape_html(hotel.observacao);
              if ($$body_4) {
                $$renderer2.push(`${$$body_4}`);
              }
              $$renderer2.push(`</textarea></div></div>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--></div>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      } else if (currentStep === 3) {
        $$renderer2.push("<!--[3-->");
        $$renderer2.push(`<div class="space-y-6"><div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">`);
        Plane($$renderer2, { size: 20, class: "text-clientes-500" });
        $$renderer2.push(`<!----> Traslados</h3> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="p-4 bg-green-50 rounded-lg border border-green-200"><h4 class="font-medium text-green-900 mb-3 flex items-center gap-2">`);
        Plane($$renderer2, { size: 16, class: "rotate-45" });
        $$renderer2.push(`<!----> Traslado Chegada</h4> <div class="space-y-3"><div><label class="block text-xs font-medium text-slate-600 mb-1">Detalhes</label> <textarea rows="3" class="vtur-input w-full border-green-200" placeholder="Detalhes do traslado de chegada...">`);
        const $$body_5 = escape_html(form.extra_data.traslado_chegada?.detalhes || "");
        if ($$body_5) {
          $$renderer2.push(`${$$body_5}`);
        }
        $$renderer2.push(`</textarea></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Notas</label> <textarea rows="2" class="vtur-input w-full border-green-200" placeholder="Notas importantes...">`);
        const $$body_6 = escape_html(form.extra_data.traslado_chegada?.notas || "");
        if ($$body_6) {
          $$renderer2.push(`${$$body_6}`);
        }
        $$renderer2.push(`</textarea></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Telefone Transferista</label> <input type="text"${attr("value", form.extra_data.traslado_chegada?.telefone_transferista || "")} class="vtur-input w-full border-green-200" placeholder="+34 999 999 999"/></div></div></div> <div class="p-4 bg-orange-50 rounded-lg border border-orange-200"><h4 class="font-medium text-orange-900 mb-3 flex items-center gap-2">`);
        Plane($$renderer2, { size: 16, class: "-rotate-45" });
        $$renderer2.push(`<!----> Traslado Saída</h4> <div class="space-y-3"><div><label class="block text-xs font-medium text-slate-600 mb-1">Detalhes</label> <textarea rows="3" class="vtur-input w-full border-orange-200" placeholder="Detalhes do traslado de saída...">`);
        const $$body_7 = escape_html(form.extra_data.traslado_saida?.detalhes || "");
        if ($$body_7) {
          $$renderer2.push(`${$$body_7}`);
        }
        $$renderer2.push(`</textarea></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Notas</label> <textarea rows="2" class="vtur-input w-full border-orange-200" placeholder="Notas importantes...">`);
        const $$body_8 = escape_html(form.extra_data.traslado_saida?.notas || "");
        if ($$body_8) {
          $$renderer2.push(`${$$body_8}`);
        }
        $$renderer2.push(`</textarea></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Telefone Transferista</label> <input type="text"${attr("value", form.extra_data.traslado_saida?.telefone_transferista || "")} class="vtur-input w-full border-orange-200" placeholder="+34 999 999 999"/></div></div></div></div></div> <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">`);
        Circle_alert($$renderer2, { size: 20, class: "text-amber-500" });
        $$renderer2.push(`<!----> Informações Importantes</h3> <textarea rows="5" class="vtur-input w-full" placeholder="Liste aqui as informações importantes para o passageiro...">`);
        const $$body_9 = escape_html(form.extra_data.informacoes_importantes || "");
        if ($$body_9) {
          $$renderer2.push(`${$$body_9}`);
        }
        $$renderer2.push(`</textarea></div> <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-semibold text-slate-900 flex items-center gap-2">`);
        Smartphone($$renderer2, { size: 20, class: "text-clientes-500" });
        $$renderer2.push(`<!----> Apps Recomendados</h3> `);
        Button($$renderer2, {
          variant: "secondary",
          size: "sm",
          children: ($$renderer3) => {
            Plus($$renderer3, { size: 14, class: "mr-1" });
            $$renderer3.push(`<!----> Adicionar App`);
          },
          $$slots: { default: true }
        });
        $$renderer2.push(`<!----></div> `);
        if (form.extra_data.apps_recomendados?.length) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="space-y-3"><!--[-->`);
          const each_array_7 = ensure_array_like(form.extra_data.apps_recomendados);
          for (let i = 0, $$length = each_array_7.length; i < $$length; i++) {
            let app = each_array_7[i];
            $$renderer2.push(`<div class="p-4 bg-slate-50 rounded-lg border border-slate-200"><div class="flex items-center justify-between mb-3"><span class="text-sm font-medium text-slate-700">App ${escape_html(i + 1)}</span> <button class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">`);
            Trash_2($$renderer2, { size: 16 });
            $$renderer2.push(`<!----></button></div> <div class="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label class="block text-xs font-medium text-slate-600 mb-1">Nome do App</label> <input type="text"${attr("value", app.nome)} class="vtur-input w-full" placeholder="Ex: Google Tradutor"/></div> <div><label class="block text-xs font-medium text-slate-600 mb-1">Descrição</label> <input type="text"${attr("value", app.descricao || "")} class="vtur-input w-full" placeholder="Para que serve o app"/></div></div></div>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">`);
          Smartphone($$renderer2, { size: 32, class: "mx-auto mb-2 opacity-50" });
          $$renderer2.push(`<!----> <p>Nenhum app adicionado</p> <p class="text-sm">Adicione apps úteis para a viagem</p></div>`);
        }
        $$renderer2.push(`<!--]--></div> <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">`);
        Phone($$renderer2, { size: 20, class: "text-red-500" });
        $$renderer2.push(`<!----> Contatos de Emergência</h3> <div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Escritório</label> <input type="text"${attr("value", form.extra_data.emergencia?.escritorio || "")} class="vtur-input w-full" placeholder="+55 11 9999-9999"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">Emergência 24h</label> <input type="text"${attr("value", form.extra_data.emergencia?.emergencia_24h || "")} class="vtur-input w-full" placeholder="+34 652 99 00 47"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label> <input type="text"${attr("value", form.extra_data.emergencia?.whatsapp || "")} class="vtur-input w-full" placeholder="+55 11 99999-9999"/></div></div></div></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center"><div>`);
      if (currentStep > 0) {
        $$renderer2.push("<!--[0-->");
        Button($$renderer2, {
          variant: "secondary",
          children: ($$renderer3) => {
            $$renderer3.push(`<!---->← Etapa Anterior`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="flex gap-3">`);
      Button($$renderer2, {
        variant: "ghost",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->Cancelar`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      if (currentStep < steps.length - 1) {
        $$renderer2.push("<!--[0-->");
        Button($$renderer2, {
          variant: "primary",
          children: ($$renderer3) => {
            $$renderer3.push(`<!---->Próxima Etapa →`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer2.push("<!--[-1-->");
        Button($$renderer2, {
          variant: "secondary",
          disabled: savingAsDraft,
          children: ($$renderer3) => {
            {
              $$renderer3.push("<!--[-1-->");
              Save($$renderer3, { size: 18, class: "mr-2" });
              $$renderer3.push(`<!----> Salvar Rascunho`);
            }
            $$renderer3.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
        $$renderer2.push(`<!----> `);
        Button($$renderer2, {
          variant: "primary",
          disabled: saving,
          children: ($$renderer3) => {
            {
              $$renderer3.push("<!--[-1-->");
              Circle_check_big($$renderer3, { size: 18, class: "mr-2" });
              $$renderer3.push(`<!----> Finalizar Voucher`);
            }
            $$renderer3.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
        $$renderer2.push(`<!---->`);
      }
      $$renderer2.push(`<!--]--></div></div></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open, voucher, companyId, assets });
  });
}
function textValue(value) {
  return String(value || "").trim();
}
function escapeHtml(value) {
  return textValue(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function normalizeLookupValue(value) {
  return textValue(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function formatDateBR(value) {
  const raw = textValue(value);
  if (!raw) return "";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const shortMatch = raw.match(/^(\d{2})\/(\d{2})$/);
  if (shortMatch) return raw;
  return raw;
}
function providerLabel(provider) {
  if (provider === "special_tours") return "Special Tours";
  if (provider === "europamundo") return "Europamundo";
  return "Voucher";
}
const EUROPAMUNDO_APP_ICON_RULES = [
  {
    match: (value) => value.includes("suitcase") || value.includes("suit case"),
    iconUrl: "/icons/vouchers/europamundo/suitcase.webp",
    alt: "Mobile Suitcase"
  },
  {
    match: (value) => value.includes("uber"),
    iconUrl: "/icons/vouchers/europamundo/uber.webp",
    alt: "Uber"
  },
  {
    match: (value) => value.includes("google tradutor") || value.includes("google translator") || value.includes("google translate") || value.includes("tradutor google") || value.includes("translate"),
    iconUrl: "/icons/vouchers/europamundo/google-tradutor.webp",
    alt: "Google Tradutor"
  },
  {
    match: (value) => value === "xe" || value.includes("xe currency") || value.startsWith("xe "),
    iconUrl: "/icons/vouchers/europamundo/xe-currency.webp",
    alt: "XE Currency"
  },
  {
    match: (value) => value.includes("accuweather") || value.includes("accuwheather") || value.includes("wheather"),
    iconUrl: "/icons/vouchers/europamundo/accuweather.webp",
    alt: "AccuWeather"
  },
  {
    match: (value) => value.includes("yelp"),
    iconUrl: "/icons/vouchers/europamundo/yelp.webp",
    alt: "Yelp"
  },
  {
    match: (value) => value.includes("europamundo"),
    iconUrl: "/icons/vouchers/europamundo/europamundo.webp",
    alt: "Europamundo"
  }
];
function getEuropamundoAppIcon(appName, assets = []) {
  const normalized = normalizeLookupValue(appName);
  if (!normalized) return null;
  const matchedRule = EUROPAMUNDO_APP_ICON_RULES.find((rule) => rule.match(normalized)) || null;
  if (!matchedRule) return null;
  const uploadedAsset = sortAssets(
    assets.filter(
      (asset) => asset.provider === "europamundo" && asset.asset_kind === "app_icon" && textValue(asset.preview_url) && matchedRule.match(normalizeLookupValue(asset.label))
    )
  )[0];
  if (uploadedAsset?.preview_url) {
    return {
      iconUrl: uploadedAsset.preview_url,
      alt: matchedRule.alt
    };
  }
  return matchedRule;
}
function buildEuropamundoAppCard(app, assets = []) {
  const icon = getEuropamundoAppIcon(app.nome, assets);
  return `
    <article class="sheet-card europa-app-card">
      <div class="europa-app-header">
        ${icon ? `<img class="europa-app-icon" src="${escapeHtml(icon.iconUrl)}" alt="${escapeHtml(icon.alt || app.nome || "App")}" />` : ""}
        <div class="europa-app-name">${escapeHtml(app.nome || "-")}</div>
      </div>
      <div class="europa-app-description">${escapeHtml(app.descricao || "").replace(/\n/g, "<br/>")}</div>
    </article>`;
}
function sortAssets(items) {
  return items.slice().sort((a, b) => {
    const firstOrder = Number(a.ordem ?? 0);
    const secondOrder = Number(b.ordem ?? 0);
    if (firstOrder !== secondOrder) return firstOrder - secondOrder;
    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
  });
}
function pickAssetUrl(assets, provider, kind) {
  const preferred = sortAssets(
    assets.filter((asset) => asset.asset_kind === kind && asset.provider === provider && textValue(asset.preview_url))
  )[0];
  if (preferred?.preview_url) return preferred.preview_url;
  const generic = sortAssets(
    assets.filter((asset) => asset.asset_kind === kind && asset.provider === "generic" && textValue(asset.preview_url))
  )[0];
  return generic?.preview_url || "";
}
function pickAssetUrls(assets, provider, kind) {
  const preferred = sortAssets(
    assets.filter((asset) => asset.asset_kind === kind && asset.provider === provider && textValue(asset.preview_url))
  );
  if (preferred.length) return preferred.map((asset) => asset.preview_url || "").filter(Boolean);
  return sortAssets(
    assets.filter((asset) => asset.asset_kind === kind && asset.provider === "generic" && textValue(asset.preview_url))
  ).map((asset) => asset.preview_url || "").filter(Boolean);
}
function buildRouteTitle(voucher) {
  const code = textValue(voucher.codigo_fornecedor || voucher.codigo_systur);
  const name = textValue(voucher.nome || "Voucher");
  if (!code) return name;
  if (name.toLowerCase().startsWith(code.toLowerCase())) return name;
  return `${code} - ${name}`;
}
function parseDayTitle(value) {
  const raw = textValue(value);
  const match = raw.match(/^\(([^)]+)\)\s*:\s*(.+)$/);
  if (!match) return { note: "", title: raw };
  return {
    note: textValue(match[1]),
    title: textValue(match[2])
  };
}
function buildDayHeading(dia) {
  const parsed = parseDayTitle(dia.titulo);
  const dayLabel = `Dia ${dia.dia_numero}${parsed.note ? ` (${parsed.note})` : ""}`;
  const prefix = dia.data_referencia ? `${formatDateBR(dia.data_referencia)} – ${dayLabel}` : dayLabel;
  return `${prefix}${parsed.title ? `: ${parsed.title}` : ""}`;
}
function addDaysToIsoDate(startDate, offset) {
  const match = textValue(startDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function normalizePreviewDays(items, startDate) {
  const sorted = items.slice().sort((a, b) => (a.ordem ?? a.dia_numero) - (b.ordem ?? b.dia_numero)).map((item, index) => ({ ...item, ordem: index }));
  if (!addDaysToIsoDate(textValue(startDate), 0)) return sorted;
  return sorted.map((item, index) => ({
    ...item,
    data_referencia: addDaysToIsoDate(textValue(startDate), index),
    ordem: index
  }));
}
function splitPassengerLines(value) {
  return textValue(value).split(/\n+/).map((line) => line.trim()).filter(Boolean);
}
function renderBulletListFromLines(lines) {
  const normalized = lines.map(textValue).filter(Boolean);
  if (!normalized.length) return "";
  return `<ul class="voucher-bullet-list">${normalized.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}
function splitLinesIntoPrintableGroups(lines, maxChars = 900) {
  const normalized = lines.flatMap((line) => splitTextIntoPrintableChunks(line, maxChars)).map((line) => textValue(line)).filter(Boolean);
  if (!normalized.length) return [];
  const groups = [];
  let current = [];
  let currentChars = 0;
  for (const line of normalized) {
    const lineChars = line.length + 2;
    if (current.length && currentChars + lineChars > maxChars) {
      groups.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(line);
    currentChars += lineChars;
  }
  if (current.length) groups.push(current);
  return groups;
}
function rebalanceTrailingSparsePage(pages, getUnits, maxUnitsPerPage, overflowAllowance = 1) {
  if (pages.length < 2) return pages;
  const copy = pages.map((page) => page.slice());
  const lastPageIndex = copy.length - 1;
  const lastPage = copy[lastPageIndex];
  if (lastPage.length !== 1) return copy;
  const previousPageIndex = lastPageIndex - 1;
  const previousPage = copy[previousPageIndex];
  const limit = typeof maxUnitsPerPage === "function" ? Math.max(1, maxUnitsPerPage(previousPageIndex)) : Math.max(1, maxUnitsPerPage);
  const previousUnits = previousPage.reduce((sum, item) => sum + Math.max(1, getUnits(item)), 0);
  const lastItemUnits = Math.max(1, getUnits(lastPage[0]));
  if (previousUnits + lastItemUnits <= limit + overflowAllowance) {
    previousPage.push(lastPage[0]);
    copy.pop();
  }
  return copy;
}
function buildHotelDateRange(hotel) {
  const start = formatDateBR(hotel.data_inicio);
  const end = formatDateBR(hotel.data_fim);
  if (start && end) return `${start} a ${end}`;
  return start || end;
}
function buildUnifiedHotelCard(hotel, options = {}) {
  const showCity = options.showCity !== false;
  const addressLabel = options.addressLabel || "Endereço";
  const periodLabel = options.periodLabel || "Check In/Out";
  const period = buildHotelDateRange(hotel);
  return `
    <article class="sheet-card voucher-hotel-card">
      ${showCity && textValue(hotel.cidade) ? `<div class="voucher-hotel-city">${escapeHtml(hotel.cidade || "-")}</div>` : ""}
      ${textValue(hotel.hotel) ? `<div class="voucher-hotel-detail voucher-hotel-name"><strong>Hotel:</strong> ${escapeHtml(hotel.hotel)}</div>` : ""}
      ${period ? `<div class="voucher-hotel-detail voucher-hotel-period"><strong>${escapeHtml(periodLabel)}:</strong> ${escapeHtml(period)}</div>` : ""}
      ${textValue(hotel.endereco) ? `<div class="voucher-hotel-detail"><strong>${escapeHtml(addressLabel)}:</strong> ${escapeHtml(hotel.endereco)}</div>` : ""}
      ${textValue(hotel.telefone) ? `<div class="voucher-hotel-detail"><strong>Telefone:</strong> ${escapeHtml(hotel.telefone)}</div>` : ""}
      ${textValue(hotel.observacao) ? `<div class="voucher-hotel-note">${escapeHtml(hotel.observacao || "")}</div>` : ""}
    </article>`;
}
function splitTextIntoPrintableChunks(value, maxChars = 1400) {
  const normalized = textValue(value).replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  if (normalized.length <= maxChars) return [normalized];
  const sentenceParts = normalized.split(/(?<=[.!?;:])\s+/);
  const chunks = [];
  let current = "";
  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };
  for (const part of sentenceParts) {
    const next = current ? `${current} ${part}` : part;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) pushCurrent();
    if (part.length <= maxChars) {
      current = part;
      continue;
    }
    let remaining = part;
    while (remaining.length > maxChars) {
      chunks.push(remaining.slice(0, maxChars).trim());
      remaining = remaining.slice(maxChars).trim();
    }
    current = remaining;
  }
  pushCurrent();
  return chunks.length ? chunks : [normalized];
}
function buildProgramPrintBlocks(items) {
  return items.flatMap((dia) => {
    const heading = buildDayHeading(dia);
    const chunks = splitTextIntoPrintableChunks(dia.descricao, 1200);
    return chunks.map((chunk, index) => ({
      heading: index === 0 ? heading : `${heading} (continuação)`,
      description: chunk,
      units: Math.max(1, Math.ceil(String(chunk || "").length / 850))
    }));
  });
}
function paginateByUnits(items, getUnits, maxUnitsPerPage) {
  const pages = [];
  let currentPage = [];
  let currentUnits = 0;
  let pageIndex = 0;
  for (const item of items) {
    const units = Math.max(1, getUnits(item));
    const maxUnitsForCurrentPage = typeof maxUnitsPerPage === "function" ? Math.max(1, maxUnitsPerPage(pageIndex)) : Math.max(1, maxUnitsPerPage);
    if (currentPage.length && currentUnits + units > maxUnitsForCurrentPage) {
      pages.push(currentPage);
      currentPage = [];
      currentUnits = 0;
      pageIndex += 1;
    }
    currentPage.push(item);
    currentUnits += units;
  }
  if (currentPage.length) pages.push(currentPage);
  return pages;
}
function buildHotelPrintUnits(hotel) {
  const payload = [hotel.cidade, hotel.hotel, hotel.endereco, hotel.telefone, hotel.observacao].map(textValue).join(" ");
  return Math.max(1, Math.ceil(payload.length / 900));
}
function buildAppPrintUnits(app) {
  const payload = [app.nome, app.descricao].map(textValue).join(" ");
  return Math.max(1, Math.ceil(payload.length / 1e3));
}
function renderProgramSections(params) {
  const blocks = buildProgramPrintBlocks(params.dias);
  if (!blocks.length) return "";
  const pageLimit = (pageIndex) => pageIndex === 0 ? 6 : 7;
  const pages = paginateByUnits(blocks, (item) => item.units, pageLimit);
  return pages.map(
    (pageBlocks, pageIndex) => `
        <section class="sheet">
          ${buildSpecialHeader(params.cvcLogo, params.providerLogo, params.providerName)}
          ${buildBand("PROGRAMA DE VIAGEM")}
          ${pageIndex === 0 ? `<div class="sheet-card sheet-card-center">
                  <div class="route-title">${escapeHtml(params.routeTitle)}</div>
                  ${textValue(params.referenceLabel) && textValue(params.referenceValue) ? `<div class="route-ref">${escapeHtml(params.referenceLabel || "")}: ${escapeHtml(params.referenceValue || "")}</div>` : ""}
                </div>` : ""}
          <div class="program-list">
            ${pageBlocks.map(
      (block) => `
                  <article class="program-card">
                    <div class="program-heading">${escapeHtml(block.heading)}</div>
                    <div class="program-description">${escapeHtml(block.description || "").replace(/\n/g, "<br/>")}</div>
                  </article>`
    ).join("")}
          </div>
        </section>`
  ).join("");
}
function renderHotelSections(params) {
  if (!params.hoteis.length) return "";
  const pageLimit = 6;
  const pages = rebalanceTrailingSparsePage(
    paginateByUnits(params.hoteis, buildHotelPrintUnits, pageLimit),
    buildHotelPrintUnits,
    pageLimit,
    1
  );
  return pages.map(
    (pageHotels) => `
        <section class="sheet">
          ${buildSpecialHeader(params.cvcLogo, params.providerLogo, params.providerName)}
          ${buildBand("LISTA DE HOTÉIS")}
          <div class="voucher-hotel-list hotel-list-standalone">
            ${pageHotels.map((hotel) => params.renderCard(hotel)).join("")}
          </div>
        </section>`
  ).join("");
}
function renderEuropamundoPassengerSections(params) {
  const pageLimit = (pageIndex) => pageIndex === 0 ? 13 : 17;
  const pages = rebalanceTrailingSparsePage(
    paginateByUnits(params.passageiros, () => 1, pageLimit),
    () => 1,
    pageLimit,
    2
  );
  if (!pages.length) {
    return `
      <section class="sheet">
        ${buildSpecialHeader(params.cvcLogo, params.providerLogo, "Europamundo")}
        ${buildBand("DADOS DE SUA VIAGEM")}
        <div class="sheet-card sheet-card-center">
          <div class="route-title">${escapeHtml(params.routeTitle)}</div>
        </div>
        <div class="sheet-card">
          ${params.infoTable}
        </div>
      </section>`;
  }
  return pages.map(
    (pageRows, pageIndex) => `
        <section class="sheet">
          ${buildSpecialHeader(params.cvcLogo, params.providerLogo, "Europamundo")}
          ${buildBand("DADOS DE SUA VIAGEM")}
          ${pageIndex === 0 ? `<div class="sheet-card sheet-card-center">
                  <div class="route-title">${escapeHtml(params.routeTitle)}</div>
                </div>
                <div class="sheet-card">
                  ${params.infoTable}
                </div>` : ""}
          <div class="sheet-card europa-passenger-card">
            <div class="europa-passenger-title">PASSAGEIROS${pageIndex > 0 ? " (continuação)" : ""}</div>
            <div class="europa-passenger-table-wrap">
              <table class="europa-passenger-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Passaporte</th>
                    <th>Data nasc.</th>
                    <th>Nacionalidade</th>
                  </tr>
                </thead>
                <tbody>
                  ${pageRows.map(
      (passageiro) => `
                        <tr>
                          <td>${escapeHtml(passageiro.nome || "-")}</td>
                          <td>${escapeHtml(passageiro.passenger_id || "-")}</td>
                          <td>${escapeHtml(passageiro.tipo || "-")}</td>
                          <td>${escapeHtml(passageiro.passaporte || "-")}</td>
                          <td>${escapeHtml(formatDateBR(passageiro.data_nascimento) || "-")}</td>
                          <td>${escapeHtml(passageiro.nacionalidade || "-")}</td>
                        </tr>`
    ).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </section>`
  ).join("");
}
function buildEuropamundoTransferBlocks(title, transfer, notesTitle) {
  const detailsLines = splitLinesFromMultilineText(transfer?.detalhes);
  const notesLines = splitLinesFromMultilineText(transfer?.notas);
  const detailGroups = splitLinesIntoPrintableGroups(detailsLines, 820);
  const noteGroups = splitLinesIntoPrintableGroups(notesLines, 820);
  const totalBlocks = Math.max(detailGroups.length, noteGroups.length, textValue(transfer?.telefone_transferista) ? 1 : 0);
  if (!totalBlocks) return [];
  return Array.from({ length: totalBlocks }, (_, index) => ({
    title: index === 0 ? title : `${title} (continuação)`,
    detailsLines: detailGroups[index] || [],
    phone: index === 0 ? textValue(transfer?.telefone_transferista) : "",
    notesLines: noteGroups[index] || [],
    notesTitle: noteGroups[index]?.length ? index === 0 ? notesTitle : `${notesTitle} (continuação)` : ""
  }));
}
function renderEuropamundoTransferSections(params) {
  const blocks = [
    ...buildEuropamundoTransferBlocks("TRANSFER IN", params.transferIn, "Notas traslado de chegada"),
    ...buildEuropamundoTransferBlocks("TRANSFER OUT", params.transferOut, "Notas traslado de saída")
  ];
  if (!blocks.length) return "";
  const pages = paginateByUnits(blocks, () => 1, 2);
  return pages.map(
    (pageBlocks) => `
        <section class="sheet">
          ${buildSpecialHeader(params.cvcLogo, params.providerLogo, "Europamundo")}
          ${buildBand("TRASLADOS")}
          <div class="europa-transfer-grid europa-transfer-grid--print-safe">
            ${pageBlocks.map(
      (block) => `
                  <article class="sheet-card europa-transfer-card">
                    <div class="europa-transfer-title">${escapeHtml(block.title)}</div>
                    ${block.detailsLines.length ? `<div class="europa-transfer-content">${block.detailsLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>` : ""}
                    ${block.phone ? `<div class="europa-transfer-phone">Telefone do transferista: ${escapeHtml(block.phone)}</div>` : ""}
                    ${block.notesLines.length ? `<div class="europa-transfer-notes-title">${escapeHtml(block.notesTitle)}</div>${renderBulletListFromLines(block.notesLines)}` : ""}
                  </article>`
    ).join("")}
          </div>
        </section>`
  ).join("");
}
function renderBulletListSections(params) {
  const groups = splitLinesIntoPrintableGroups(splitLinesFromMultilineText(params.content), 1650);
  if (!groups.length) return "";
  return groups.map(
    (group, pageIndex) => `
        <section class="sheet">
          ${buildSpecialHeader(params.cvcLogo, params.providerLogo, params.providerName)}
          ${buildBand(params.title)}
          <div class="sheet-card ${escapeHtml(params.cardClass || "").trim()}">
            ${pageIndex > 0 ? `<div class="europa-section-continuation">Continuação</div>` : ""}
            ${renderBulletListFromLines(group)}
          </div>
        </section>`
  ).join("");
}
function renderEuropamundoAppSections(params) {
  if (!params.apps.length) return "";
  const pageLimit = 6;
  const pages = paginateByUnits(params.apps, buildAppPrintUnits, pageLimit);
  return pages.map(
    (pageApps) => `
        <section class="sheet">
          ${buildSpecialHeader(params.cvcLogo, params.providerLogo, "Europamundo")}
          ${buildBand("APPS RECOMENDADOS")}
          <div class="europa-apps-grid">
            ${pageApps.map((app) => buildEuropamundoAppCard(app, params.assets || [])).join("")}
          </div>
        </section>`
  ).join("");
}
function buildSpecialHeader(cvcLogo, providerLogo, providerName) {
  const providerClass = textValue(providerName).toLowerCase() === "europamundo" ? " voucher-header--europamundo" : "";
  const providerLogoClass = textValue(providerName).toLowerCase() === "europamundo" ? " voucher-header-logo--europamundo" : "";
  return `
    <div class="voucher-header${providerClass}">
      <div class="voucher-header-logo">
        ${cvcLogo ? `<img src="${escapeHtml(cvcLogo)}" alt="CVC" />` : `<div class="voucher-header-placeholder">CVC</div>`}
      </div>
      <div class="voucher-header-center">
        <div class="voucher-header-title">VOUCHER</div>
        <div class="voucher-header-subtitle">Documentação da Viagem</div>
      </div>
      <div class="voucher-header-logo voucher-header-logo-right${providerLogoClass}">
        ${providerLogo ? `<img src="${escapeHtml(providerLogo)}" alt="${escapeHtml(providerName)}" />` : `<div class="voucher-header-placeholder">${escapeHtml(providerName)}</div>`}
      </div>
    </div>`;
}
function buildBand(title) {
  return `<div class="voucher-band">${escapeHtml(title)}</div>`;
}
function buildInfoRow(label, content) {
  return `
    <div class="info-row">
      <div class="info-label">${escapeHtml(label)}</div>
      <div class="info-value">${content}</div>
    </div>`;
}
function buildSpecialToursPreviewDocument(voucher, assets) {
  const cvcLogo = pickAssetUrl(assets, "cvc", "logo");
  const providerLogo = pickAssetUrl(assets, "special_tours", "logo");
  const providerImages = pickAssetUrls(assets, "special_tours", "image");
  const routeTitle = buildRouteTitle(voucher);
  const passengerLines = splitPassengerLines(voucher.passageiros);
  const dias = normalizePreviewDays(voucher.voucher_dias || [], voucher.data_inicio);
  const hoteis = (voucher.voucher_hoteis || []).slice().sort((a, b) => {
    const firstHasDate = Boolean(String(a.data_inicio || "").trim() || String(a.data_fim || "").trim());
    const secondHasDate = Boolean(String(b.data_inicio || "").trim() || String(b.data_fim || "").trim());
    if (firstHasDate !== secondHasDate) return firstHasDate ? -1 : 1;
    const firstDate = String(a.data_inicio || "");
    const secondDate = String(b.data_inicio || "");
    if (firstDate !== secondDate) return firstDate.localeCompare(secondDate);
    return Number(a.ordem ?? 0) - Number(b.ordem ?? 0);
  });
  const infoTable = `
    <div class="info-table">
      ${buildInfoRow(
    "Passageiros:",
    passengerLines.length ? passengerLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("") : `<div>-</div>`
  )}
      ${buildInfoRow("Tipo Acomodação:", escapeHtml(voucher.tipo_acomodacao || "-"))}
      ${buildInfoRow("Identificador:", escapeHtml(voucher.reserva_online || "-"))}
      ${buildInfoRow("Data Início:", escapeHtml(formatDateBR(voucher.data_inicio) || "-"))}
      ${buildInfoRow("Data Final:", escapeHtml(formatDateBR(voucher.data_fim) || "-"))}
    </div>`;
  const programSection = renderProgramSections({
    providerName: "Special Tours",
    cvcLogo,
    providerLogo,
    routeTitle,
    referenceLabel: voucher.reserva_online ? "S/REF" : "",
    referenceValue: voucher.reserva_online || "",
    dias
  });
  const hotelSection = renderHotelSections({
    providerName: "Special Tours",
    cvcLogo,
    providerLogo,
    hoteis,
    renderCard: (hotel) => buildUnifiedHotelCard(hotel, {
      showCity: false,
      addressLabel: "Endereço / Address",
      periodLabel: "Check In/Out"
    })
  });
  const appSection = providerImages.length ? `
      <section class="sheet sheet-keep-together">
        ${buildSpecialHeader(cvcLogo, providerLogo, "Special Tours")}
        <div class="sheet-keep-together-block">
          ${buildBand("BAIXE O APLICATIVO CONQUISTA")}
          <div class="provider-images">
            ${providerImages.map(
    (imageUrl, index) => `
                  <div class="provider-image-card">
                    <img src="${escapeHtml(imageUrl)}" alt="Imagem padrão ${index + 1} do voucher" />
                  </div>`
  ).join("")}
          </div>
        </div>
      </section>` : "";
  const emergencySection = `
    <section class="sheet">
      ${buildSpecialHeader(cvcLogo, providerLogo, "Special Tours")}
      ${buildBand("TELEFONE DE EMERGÊNCIA")}
      <div class="sheet-card emergency-card">
        <p>Nos adicione no seu WhatsApp e em caso de emergência durante a sua viagem,<br/>ou qualquer outra dúvida, entre em contato conosco.</p>
        <p>Apenas para passageiros em viagem:</p>
        <p class="emergency-strong">+34 652 99 00 47</p>
        <p><a href="mailto:onboard@specialtours.com">onboard@specialtours.com</a></p>
        ${voucher.reserva_online ? `<p class="emergency-id">IDENTIFICADOR: ${escapeHtml(voucher.reserva_online)}</p>` : ""}
      </div>
    </section>`;
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(routeTitle || "Voucher")}</title>
    <style>
      :root {
        --page-bg: #eef3fb;
        --card-bg: #ffffff;
        --border: #cfd8e6;
        --border-strong: #9aaac2;
        --text: #1f2430;
        --accent: #243aa3;
        --accent-soft: #b1144f;
        --shadow: 0 12px 28px rgba(25, 38, 74, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: linear-gradient(180deg, #f3f6fb 0%, var(--page-bg) 100%);
        color: var(--text);
        font-family: "Georgia", "Times New Roman", serif;
      }
      .document {
        width: min(1020px, calc(100vw - 28px));
        margin: 0 auto;
        padding: 24px 0 32px;
      }
      .sheet {
        background: transparent;
        margin-bottom: 28px;
        page-break-after: always;
      }
      .sheet:last-child {
        page-break-after: auto;
      }
      .voucher-header,
      .voucher-band,
      .sheet-card,
      .program-card {
        background: var(--card-bg);
        border: 1px solid var(--border-strong);
        border-radius: 18px;
        box-shadow: var(--shadow);
      }
      .voucher-header {
        display: grid;
        grid-template-columns: 150px 1fr 150px;
        align-items: center;
        gap: 18px;
        padding: 18px 20px;
        width: 100%;
      }
      .voucher-header--europamundo {
        grid-template-columns: 190px 1fr 190px;
      }
      .voucher-header-logo {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        min-height: 76px;
      }
      .voucher-header-logo-right {
        justify-content: flex-end;
      }
      .voucher-header-logo img {
        max-width: 120px;
        max-height: 78px;
        object-fit: contain;
      }
      .voucher-header-logo--europamundo img {
        max-width: 160px;
        max-height: 92px;
      }
      .voucher-header-placeholder {
        min-width: 92px;
        min-height: 60px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        border: 1px dashed var(--border);
        border-radius: 14px;
        color: #5c6780;
        font-family: "Arial", sans-serif;
        font-size: 13px;
      }
      .voucher-header-center {
        text-align: center;
        color: var(--accent);
      }
      .voucher-header-title {
        font-size: clamp(32px, 4vw, 48px);
        font-weight: 700;
        letter-spacing: 0.02em;
        line-height: 1;
      }
      .voucher-header-subtitle {
        font-size: clamp(17px, 2vw, 28px);
        font-weight: 700;
        margin-top: 8px;
      }
      .voucher-band {
        margin-top: 18px;
        padding: 14px 18px;
        text-align: center;
        font-size: clamp(22px, 2vw, 34px);
        font-weight: 700;
      }
      .sheet-card {
        margin-top: 18px;
        padding: 22px 24px;
      }
      .sheet-card-center {
        text-align: center;
      }
      .route-title {
        max-width: 880px;
        margin: 0 auto;
        font-size: clamp(18px, 1.65vw, 28px);
        font-weight: 700;
        line-height: 1.25;
      }
      .route-ref {
        margin-top: 10px;
        font-size: clamp(16px, 1.35vw, 22px);
      }
      .info-table {
        display: grid;
        gap: 0;
      }
      .info-row {
        display: grid;
        grid-template-columns: minmax(210px, 30%) 1fr;
        border-top: 1px solid var(--border);
      }
      .info-row:first-child {
        border-top: 0;
      }
      .info-label,
      .info-value {
        padding: 16px 18px;
        min-height: 70px;
      }
      .info-label {
        color: var(--accent-soft);
        font-size: clamp(16px, 1.3vw, 24px);
        font-weight: 700;
        border-right: 1px solid var(--border);
        white-space: nowrap;
      }
      .info-value {
        font-size: clamp(16px, 1.35vw, 24px);
        font-weight: 700;
        line-height: 1.35;
      }
      .program-list,
      .provider-images {
        display: grid;
        gap: 16px;
        margin-top: 18px;
      }
      .program-card {
        padding: 14px 16px;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .sheet-keep-together,
      .sheet-keep-together-block {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .program-heading {
        font-size: clamp(15px, 1.2vw, 22px);
        font-weight: 700;
        line-height: 1.4;
      }
      .program-description {
        margin-top: 10px;
        font-size: clamp(15px, 1.05vw, 20px);
        line-height: 1.55;
      }
      .voucher-hotel-list,
      .hotel-list {
        display: grid;
        gap: 14px;
      }
      .hotel-list-standalone {
        margin-top: 18px;
      }
      .voucher-hotel-card {
        margin-top: 0;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .voucher-hotel-city {
        font-size: clamp(18px, 1.45vw, 24px);
        font-weight: 700;
        color: var(--accent);
      }
      .voucher-hotel-name {
        margin-top: 14px;
      }
      .voucher-hotel-period {
        margin-top: 10px;
      }
      .voucher-hotel-detail {
        margin-top: 10px;
        font-size: clamp(15px, 1.08vw, 20px);
        line-height: 1.55;
      }
      .voucher-hotel-detail strong {
        font-weight: 700;
      }
      .voucher-hotel-note {
        margin-top: 12px;
        color: #475569;
        font-style: italic;
      }
      .provider-image-card {
        display: flex;
        justify-content: center;
        width: 100%;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .provider-image-card img {
        width: 100%;
        max-width: 100%;
        max-height: none;
        display: block;
        border-radius: 12px;
        object-fit: contain;
      }
      .emergency-card {
        text-align: center;
        padding: 36px 32px;
        font-size: clamp(16px, 1.15vw, 22px);
        line-height: 1.6;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .emergency-card p {
        margin: 0 0 16px;
      }
      .emergency-strong,
      .emergency-id {
        font-weight: 700;
        font-style: italic;
      }
      .emergency-card a {
        color: #2b47a8;
      }
      @media screen and (max-width: 720px) {
        .document {
          width: calc(100vw - 18px);
          padding: 12px 0 24px;
        }
        .voucher-header {
          grid-template-columns: 1fr;
          justify-items: center;
          text-align: center;
        }
        .voucher-header-logo,
        .voucher-header-logo-right {
          justify-content: center;
        }
        .info-row {
          grid-template-columns: 1fr;
        }
        .info-label {
          border-right: 0;
          border-bottom: 1px solid var(--border);
          min-height: auto;
          padding-bottom: 10px;
        }
        .info-value {
          min-height: auto;
          padding-top: 12px;
        }
      }
      @media print {
        @page {
          margin: 8mm 8mm 5mm;
        }
        body {
          background: #fff;
        }
        .document {
          width: auto;
          padding: 0;
        }
        .sheet {
          margin-bottom: 0 !important;
        }
        .voucher-header {
          grid-template-columns: 150px 1fr 150px !important;
          align-items: center !important;
        }
        .voucher-header--europamundo {
          grid-template-columns: 190px 1fr 190px !important;
        }
        .voucher-header-logo {
          justify-content: flex-start !important;
        }
        .voucher-header-logo-right {
          justify-content: flex-end !important;
        }
        .info-row {
          grid-template-columns: minmax(210px, 30%) 1fr !important;
        }
        .info-label {
          border-right: 1px solid var(--border) !important;
          border-bottom: 0 !important;
        }
        .provider-image-card img {
          width: 100%;
          max-width: 100%;
          max-height: none;
        }
        .voucher-band {
          margin-top: 12px !important;
          padding: 12px 16px !important;
        }
        .sheet-card {
          margin-top: 12px !important;
          padding: 18px 20px !important;
        }
        .program-list,
        .provider-images,
        .voucher-hotel-list,
        .hotel-list {
          gap: 12px !important;
          margin-top: 12px !important;
        }
        .hotel-list-standalone {
          margin-top: 12px !important;
        }
        .voucher-hotel-card {
          padding: 14px 16px !important;
        }
        .voucher-hotel-name {
          margin-top: 8px !important;
        }
        .voucher-hotel-period,
        .voucher-hotel-detail {
          margin-top: 6px !important;
          line-height: 1.4 !important;
        }
        .voucher-hotel-note {
          margin-top: 8px !important;
        }
        .program-card {
          padding: 12px 14px !important;
        }
        .emergency-card {
          padding: 28px 24px !important;
        }
        .program-card,
        .voucher-hotel-card,
        .provider-image-card,
        .voucher-header,
        .voucher-band,
        .sheet-keep-together,
        .sheet-keep-together-block,
        .emergency-card {
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
        }
        .voucher-header,
        .voucher-band,
        .sheet-card,
        .program-card {
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="document">
      <section class="sheet">
        ${buildSpecialHeader(cvcLogo, providerLogo, "Special Tours")}
        ${buildBand("DADOS DE SUA VIAGEM")}
        ${buildBand(routeTitle)}
        <div class="sheet-card">
          ${infoTable}
        </div>
      </section>
      ${programSection}
      ${hotelSection}
      ${appSection}
      ${emergencySection}
    </main>
  </body>
</html>`;
}
function buildEuropamundoPreviewDocument(voucher, assets) {
  const cvcLogo = pickAssetUrl(assets, "cvc", "logo");
  const providerLogo = pickAssetUrl(assets, "europamundo", "logo");
  const extraData = normalizeVoucherExtraData(voucher.extra_data);
  const passageiros = (extraData.passageiros_detalhes || []).slice().sort((a, b) => a.ordem - b.ordem);
  const dias = normalizePreviewDays(voucher.voucher_dias || [], voucher.data_inicio);
  const hoteis = (voucher.voucher_hoteis || []).slice().sort((a, b) => {
    const firstDate = String(a.data_inicio || "");
    const secondDate = String(b.data_inicio || "");
    if (firstDate !== secondDate) return firstDate.localeCompare(secondDate);
    return Number(a.ordem ?? 0) - Number(b.ordem ?? 0);
  });
  const apps = (extraData.apps_recomendados || []).slice().sort((a, b) => a.ordem - b.ordem);
  const routeTitle = textValue(voucher.nome || "Voucher");
  const infoTable = `
    <div class="info-table">
      ${buildInfoRow("Localizador:", escapeHtml(voucher.reserva_online || "-"))}
      ${buildInfoRow("Data de Partida:", escapeHtml(formatDateBR(voucher.data_inicio) || "-"))}
      ${buildInfoRow("Data de Finalização:", escapeHtml(formatDateBR(voucher.data_fim) || "-"))}
      ${buildInfoRow("Tipo de Quarto:", escapeHtml(voucher.tipo_acomodacao || "-"))}
    </div>`;
  const tripDataSections = renderEuropamundoPassengerSections({
    cvcLogo,
    providerLogo,
    routeTitle,
    infoTable,
    passageiros
  });
  const transfersSection = renderEuropamundoTransferSections({
    cvcLogo,
    providerLogo,
    transferIn: extraData.traslado_chegada,
    transferOut: extraData.traslado_saida
  });
  const programSection = renderProgramSections({
    providerName: "Europamundo",
    cvcLogo,
    providerLogo,
    routeTitle,
    referenceLabel: voucher.reserva_online ? "LOCALIZADOR" : "",
    referenceValue: voucher.reserva_online || "",
    dias
  });
  const hotelsSection = renderHotelSections({
    providerName: "Europamundo",
    cvcLogo,
    providerLogo,
    hoteis,
    renderCard: (hotel) => buildUnifiedHotelCard(hotel, {
      showCity: true,
      addressLabel: "Endereço",
      periodLabel: "Check In/Out"
    })
  });
  const importantInfoSection = renderBulletListSections({
    providerName: "Europamundo",
    cvcLogo,
    providerLogo,
    title: "INFORMAÇÕES IMPORTANTES",
    content: extraData.informacoes_importantes,
    cardClass: "europa-info-card"
  });
  const appsSection = renderEuropamundoAppSections({
    cvcLogo,
    providerLogo,
    apps,
    assets
  });
  const emergencySection = textValue(extraData.emergencia?.escritorio) || textValue(extraData.emergencia?.emergencia_24h) || textValue(extraData.emergencia?.whatsapp) ? `
        <section class="sheet">
          ${buildSpecialHeader(cvcLogo, providerLogo, "Europamundo")}
          ${buildBand("TELEFONE DE EMERGÊNCIA")}
          <div class="sheet-card emergency-card">
            <p>Apenas para passageiros em viagem:</p>
            ${textValue(extraData.emergencia?.escritorio) ? `<p><strong>Escritório:</strong> ${escapeHtml(extraData.emergencia?.escritorio || "")}</p>` : ""}
            ${textValue(extraData.emergencia?.emergencia_24h) ? `<p class="emergency-strong">Emergência 24 horas: ${escapeHtml(extraData.emergencia?.emergencia_24h || "")}</p>` : ""}
            ${textValue(extraData.emergencia?.whatsapp) ? `<p>WhatsApp emergências: ${escapeHtml(extraData.emergencia?.whatsapp || "")}</p>` : ""}
            ${voucher.reserva_online ? `<p class="emergency-id">LOCALIZADOR: ${escapeHtml(voucher.reserva_online)}</p>` : ""}
          </div>
        </section>` : "";
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(routeTitle || "Voucher")}</title>
    <style>
      :root {
        --page-bg: #eef3fb;
        --card-bg: #ffffff;
        --border: #cfd8e6;
        --border-strong: #9aaac2;
        --text: #1f2430;
        --accent: #243aa3;
        --accent-soft: #b1144f;
        --shadow: 0 12px 28px rgba(25, 38, 74, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: linear-gradient(180deg, #f3f6fb 0%, var(--page-bg) 100%);
        color: var(--text);
        font-family: "Georgia", "Times New Roman", serif;
      }
      .document {
        width: min(1020px, calc(100vw - 28px));
        margin: 0 auto;
        padding: 24px 0 32px;
      }
      .sheet {
        background: transparent;
        margin-bottom: 28px;
        page-break-after: always;
      }
      .sheet:last-child {
        page-break-after: auto;
      }
      .voucher-header,
      .voucher-band,
      .sheet-card,
      .program-card {
        background: var(--card-bg);
        border: 1px solid var(--border-strong);
        border-radius: 18px;
        box-shadow: var(--shadow);
      }
      .voucher-header {
        display: grid;
        grid-template-columns: 150px 1fr 150px;
        align-items: center;
        gap: 18px;
        padding: 18px 20px;
        width: 100%;
      }
      .voucher-header--europamundo {
        grid-template-columns: 190px 1fr 190px;
      }
      .voucher-header-logo {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        min-height: 76px;
      }
      .voucher-header-logo-right {
        justify-content: flex-end;
      }
      .voucher-header-logo img {
        max-width: 120px;
        max-height: 78px;
        object-fit: contain;
      }
      .voucher-header-logo--europamundo img {
        max-width: 160px;
        max-height: 92px;
      }
      .voucher-header-placeholder {
        min-width: 92px;
        min-height: 60px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        border: 1px dashed var(--border);
        border-radius: 14px;
        color: #5c6780;
        font-family: "Arial", sans-serif;
        font-size: 13px;
      }
      .voucher-header-center {
        text-align: center;
        color: var(--accent);
      }
      .voucher-header-title {
        font-size: clamp(32px, 4vw, 48px);
        font-weight: 700;
        letter-spacing: 0.02em;
        line-height: 1;
      }
      .voucher-header-subtitle {
        font-size: clamp(17px, 2vw, 28px);
        font-weight: 700;
        margin-top: 8px;
      }
      .voucher-band {
        margin-top: 18px;
        padding: 14px 18px;
        text-align: center;
        font-size: clamp(22px, 2vw, 34px);
        font-weight: 700;
      }
      .sheet-card {
        margin-top: 18px;
        padding: 22px 24px;
      }
      .sheet-card-center {
        text-align: center;
      }
      .route-title {
        max-width: 880px;
        margin: 0 auto;
        font-size: clamp(18px, 1.65vw, 28px);
        font-weight: 700;
        line-height: 1.25;
      }
      .route-ref {
        margin-top: 10px;
        font-size: clamp(16px, 1.35vw, 22px);
      }
      .info-table {
        display: grid;
        gap: 0;
      }
      .info-row {
        display: grid;
        grid-template-columns: minmax(210px, 30%) 1fr;
        border-top: 1px solid var(--border);
      }
      .info-row:first-child {
        border-top: 0;
      }
      .info-label,
      .info-value {
        padding: 16px 18px;
        min-height: 70px;
      }
      .info-label {
        color: var(--accent-soft);
        font-size: clamp(16px, 1.3vw, 24px);
        font-weight: 700;
        border-right: 1px solid var(--border);
        white-space: nowrap;
      }
      .info-value {
        font-size: clamp(16px, 1.35vw, 24px);
        font-weight: 700;
        line-height: 1.35;
      }
      .europa-passenger-title,
      .europa-transfer-title,
      .europa-app-name {
        font-size: clamp(18px, 1.4vw, 24px);
        font-weight: 700;
      }
      .europa-app-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .europa-app-icon {
        width: 40px;
        height: 40px;
        min-width: 40px;
        border-radius: 10px;
        object-fit: cover;
        display: block;
      }
      .europa-passenger-table-wrap {
        overflow-x: auto;
        margin-top: 14px;
      }
      .europa-passenger-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      .europa-passenger-table th,
      .europa-passenger-table td {
        border: 1px solid var(--border);
        padding: 10px 12px;
        text-align: left;
        vertical-align: top;
      }
      .europa-passenger-table th {
        background: #f6f8fc;
        font-weight: 700;
      }
      .program-list,
      .voucher-hotel-list,
      .europa-apps-grid {
        display: grid;
        gap: 16px;
        margin-top: 18px;
      }
      .program-card {
        padding: 14px 16px;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .program-heading {
        font-size: clamp(15px, 1.2vw, 22px);
        font-weight: 700;
        line-height: 1.4;
      }
      .program-description {
        margin-top: 10px;
        font-size: clamp(15px, 1.05vw, 20px);
        line-height: 1.55;
      }
      .europa-transfer-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 18px;
      }
      .europa-transfer-card,
      .europa-app-card,
      .europa-info-card,
      .europa-passenger-card {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .europa-transfer-content {
        display: grid;
        gap: 8px;
        margin-top: 14px;
        line-height: 1.55;
      }
      .europa-transfer-phone {
        margin-top: 16px;
        font-weight: 700;
        color: var(--accent);
      }
      .europa-transfer-notes-title {
        margin-top: 18px;
        font-weight: 700;
      }
      .voucher-bullet-list {
        margin: 14px 0 0;
        padding-left: 20px;
        line-height: 1.6;
      }
      .voucher-bullet-list li + li {
        margin-top: 8px;
      }
      .europa-section-continuation {
        margin-bottom: 12px;
        font-weight: 700;
        color: var(--accent);
      }
      .europa-app-description {
        margin-top: 12px;
        line-height: 1.6;
      }
      .emergency-card {
        text-align: center;
        padding: 36px 32px;
        font-size: clamp(16px, 1.15vw, 22px);
        line-height: 1.6;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .emergency-card p {
        margin: 0 0 16px;
      }
      .emergency-strong,
      .emergency-id {
        font-weight: 700;
        font-style: italic;
      }
      @media screen and (max-width: 720px) {
        .document {
          width: calc(100vw - 18px);
          padding: 12px 0 24px;
        }
        .voucher-header {
          grid-template-columns: 1fr;
          justify-items: center;
          text-align: center;
        }
        .voucher-header-logo,
        .voucher-header-logo-right {
          justify-content: center;
        }
        .info-row {
          grid-template-columns: 1fr;
        }
        .info-label {
          border-right: 0;
          border-bottom: 1px solid var(--border);
          min-height: auto;
          padding-bottom: 10px;
        }
        .info-value {
          min-height: auto;
          padding-top: 12px;
        }
        .europa-transfer-grid {
          grid-template-columns: 1fr;
        }
      }
      @media print {
        @page {
          margin: 8mm 8mm 5mm;
        }
        body {
          background: #fff;
        }
        .document {
          width: auto;
          padding: 0;
        }
        .sheet {
          margin-bottom: 0 !important;
        }
        .voucher-header {
          grid-template-columns: 150px 1fr 150px !important;
          align-items: center !important;
        }
        .voucher-header--europamundo {
          grid-template-columns: 190px 1fr 190px !important;
        }
        .voucher-header-logo {
          justify-content: flex-start !important;
        }
        .voucher-header-logo-right {
          justify-content: flex-end !important;
        }
        .info-row {
          grid-template-columns: minmax(210px, 30%) 1fr !important;
        }
        .info-label {
          border-right: 1px solid var(--border) !important;
          border-bottom: 0 !important;
        }
        .europa-transfer-grid,
        .europa-transfer-grid--print-safe {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .voucher-band {
          margin-top: 12px !important;
          padding: 12px 16px !important;
        }
        .sheet-card {
          margin-top: 12px !important;
          padding: 18px 20px !important;
        }
        .program-list,
        .voucher-hotel-list,
        .europa-apps-grid,
        .europa-transfer-grid,
        .europa-transfer-grid--print-safe {
          gap: 12px !important;
          margin-top: 12px !important;
        }
        .voucher-hotel-card {
          padding: 14px 16px !important;
        }
        .voucher-hotel-name {
          margin-top: 8px !important;
        }
        .voucher-hotel-period,
        .voucher-hotel-detail {
          margin-top: 6px !important;
          line-height: 1.4 !important;
        }
        .voucher-hotel-note {
          margin-top: 8px !important;
        }
        .program-card {
          padding: 12px 14px !important;
        }
        .europa-app-header {
          gap: 10px !important;
        }
        .europa-app-icon {
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
        }
        .emergency-card {
          padding: 28px 24px !important;
        }
        .program-card,
        .sheet-card,
        .voucher-header,
        .voucher-band {
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="document">
      ${tripDataSections}
      ${transfersSection}
      ${programSection}
      ${hotelsSection}
      ${importantInfoSection}
      ${appsSection}
      ${emergencySection}
    </main>
  </body>
</html>`;
}
function buildGenericVoucherPreviewDocument(voucher, assets) {
  const dias = normalizePreviewDays(voucher.voucher_dias || [], voucher.data_inicio);
  const hoteis = (voucher.voucher_hoteis || []).slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const cvcLogo = pickAssetUrl(assets, "cvc", "logo");
  const providerLogo = pickAssetUrl(assets, voucher.provider, "logo");
  const routeTitle = buildRouteTitle(voucher);
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(routeTitle || "Voucher")}</title>
    <style>
      body {
        margin: 0;
        background: #eef3fb;
        color: #1f2430;
        font-family: "Georgia", "Times New Roman", serif;
      }
      .document {
        width: min(960px, calc(100vw - 28px));
        margin: 0 auto;
        padding: 24px 0 32px;
      }
      .card {
        background: #fff;
        border: 1px solid #cfd8e6;
        border-radius: 18px;
        box-shadow: 0 12px 28px rgba(25, 38, 74, 0.08);
        padding: 20px 22px;
        margin-bottom: 16px;
      }
      .top {
        display: grid;
        grid-template-columns: 150px 1fr 150px;
        align-items: center;
        gap: 18px;
      }
      .top img {
        max-width: 120px;
        max-height: 78px;
        object-fit: contain;
      }
      .title {
        text-align: center;
        color: #243aa3;
        font-size: 32px;
        font-weight: 700;
      }
      .subtitle {
        text-align: center;
        color: #243aa3;
        font-size: 20px;
        font-weight: 700;
        margin-top: 8px;
      }
      .route-title {
        font-size: 24px;
        font-weight: 700;
        text-align: center;
      }
      .block-title {
        font-size: 22px;
        font-weight: 700;
        margin: 0 0 12px;
      }
      .day {
        border-top: 1px solid #d6ddea;
        padding-top: 12px;
        margin-top: 12px;
      }
      .day:first-child {
        border-top: 0;
        padding-top: 0;
        margin-top: 0;
      }
      .day-heading {
        font-weight: 700;
        margin-bottom: 8px;
      }
      .hotel {
        border-top: 1px solid #d6ddea;
        padding-top: 12px;
        margin-top: 12px;
      }
      .hotel:first-child {
        border-top: 0;
        padding-top: 0;
        margin-top: 0;
      }
      @media print {
        body {
          background: #fff;
        }
        .card {
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="document">
      <section class="card">
        <div class="top">
          <div>${cvcLogo ? `<img src="${escapeHtml(cvcLogo)}" alt="CVC" />` : ""}</div>
          <div>
            <div class="title">VOUCHER</div>
            <div class="subtitle">Documentação da Viagem</div>
          </div>
          <div style="text-align:right;">${providerLogo ? `<img src="${escapeHtml(providerLogo)}" alt="${escapeHtml(providerLabel(voucher.provider))}" />` : ""}</div>
        </div>
      </section>
      <section class="card">
        <div class="route-title">${escapeHtml(routeTitle)}</div>
      </section>
      ${dias.length ? `<section class="card">
              <h2 class="block-title">PROGRAMA DE VIAGEM</h2>
              ${dias.map(
    (dia) => `<div class="day">
                    <div class="day-heading">${escapeHtml(buildDayHeading(dia))}</div>
                    <div>${escapeHtml(dia.descricao || "").replace(/\n/g, "<br/>")}</div>
                  </div>`
  ).join("")}
            </section>` : ""}
      ${hoteis.length ? `<section class="card">
              <h2 class="block-title">LISTA DE HOTÉIS</h2>
              ${hoteis.map(
    (hotel) => `<div class="hotel">
                    <div><b>Hotel:</b> ${escapeHtml(hotel.hotel || "-")}</div>
                    ${hotel.endereco ? `<div><b>Endereço:</b> ${escapeHtml(hotel.endereco)}</div>` : ""}
                    ${hotel.telefone ? `<div><b>Telefone:</b> ${escapeHtml(hotel.telefone)}</div>` : ""}
                    ${buildHotelDateRange(hotel) ? `<div><b>Check In/Out:</b> ${escapeHtml(buildHotelDateRange(hotel))}</div>` : ""}
                  </div>`
  ).join("")}
            </section>` : ""}
    </main>
  </body>
</html>`;
}
function buildVoucherPreviewDocument(voucher, assets = []) {
  if (voucher.provider === "special_tours") {
    return buildSpecialToursPreviewDocument(voucher, assets);
  }
  if (voucher.provider === "europamundo") {
    return buildEuropamundoPreviewDocument(voucher, assets);
  }
  return buildGenericVoucherPreviewDocument(voucher, assets);
}
function VoucherPreviewModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let docHtml;
    let open = fallback($$props["open"], false);
    let voucher = fallback($$props["voucher"], null);
    let assets = fallback($$props["assets"], () => [], true);
    docHtml = open && voucher ? buildVoucherPreviewDocument(voucher, assets) : "";
    if (open && voucher) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="fixed z-[100] flex flex-col bg-slate-100 voucher-preview-area svelte-10857u1"><header class="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm shrink-0 gap-3"><div class="min-w-0"><h2 class="text-base md:text-xl font-bold text-slate-900 truncate">${escape_html(voucher.nome)}</h2> <p class="text-xs md:text-sm text-slate-500 mt-0.5">${escape_html(voucher.provider === "special_tours" ? "Special Tours" : "Europamundo")} `);
      if (voucher.codigo_fornecedor) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="hidden sm:inline">• Código: ${escape_html(voucher.codigo_fornecedor)}</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></p></div> <div class="flex items-center gap-2 shrink-0">`);
      Button($$renderer2, {
        variant: "secondary",
        class_name: "!px-2 md:!px-4",
        children: ($$renderer3) => {
          Square_pen($$renderer3, { size: 18 });
          $$renderer3.push(`<!----> <span class="hidden md:inline ml-2">Editar</span>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Button($$renderer2, {
        variant: "secondary",
        class_name: "!px-2 md:!px-4",
        children: ($$renderer3) => {
          Printer($$renderer3, { size: 18 });
          $$renderer3.push(`<!----> <span class="hidden md:inline ml-2">Imprimir</span>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Button($$renderer2, {
        variant: "primary",
        class_name: "!px-2 md:!px-4",
        children: ($$renderer3) => {
          File_down($$renderer3, { size: 18 });
          $$renderer3.push(`<!----> <span class="hidden md:inline ml-2">Salvar PDF</span>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> <button class="ml-1 md:ml-2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Fechar">`);
      X($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button></div></header> <div class="flex-1 overflow-auto p-2 md:p-6"><div class="max-w-5xl mx-auto h-full">`);
      if (docHtml) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<iframe${attr("srcdoc", docHtml)} class="w-full h-full min-h-[500px] md:min-h-[600px] bg-white shadow-lg rounded-lg" title="Voucher Preview" sandbox="allow-scripts allow-same-origin"></iframe>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="flex items-center justify-center h-full text-slate-500">Carregando preview...</div>`);
      }
      $$renderer2.push(`<!--]--></div></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open, voucher, assets });
  });
}
export {
  VoucherPreviewModal as V,
  VoucherEditorModal as a
};
