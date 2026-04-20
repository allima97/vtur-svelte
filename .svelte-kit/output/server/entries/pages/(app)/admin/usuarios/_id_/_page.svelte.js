import { c as sanitize_props, o as spread_props, k as slot, b as store_get, u as unsubscribe_stores, h as head, e as escape_html, q as attr, t as ensure_array_like } from "../../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/state.svelte.js";
import { p as page } from "../../../../../../chunks/stores.js";
import { P as PageHeader } from "../../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../../chunks/Card.js";
import { B as Button } from "../../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../../chunks/Dialog.js";
import { B as Badge } from "../../../../../../chunks/Badge.js";
import { t as toast } from "../../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../../chunks/refresh-cw.js";
import { I as Icon } from "../../../../../../chunks/Icon.js";
import { M as Mail } from "../../../../../../chunks/mail.js";
function Key_round($$renderer, $$props) {
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
        "d": "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"
      }
    ],
    [
      "circle",
      { "cx": "16.5", "cy": "7.5", "r": ".5", "fill": "currentColor" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "key-round" },
    $$sanitized_props,
    {
      /**
       * @component @name KeyRound
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMi41ODYgMTcuNDE0QTIgMiAwIDAgMCAyIDE4LjgyOFYyMWExIDEgMCAwIDAgMSAxaDNhMSAxIDAgMCAwIDEtMXYtMWExIDEgMCAwIDEgMS0xaDFhMSAxIDAgMCAwIDEtMXYtMWExIDEgMCAwIDEgMS0xaC4xNzJhMiAyIDAgMCAwIDEuNDE0LS41ODZsLjgxNC0uODE0YTYuNSA2LjUgMCAxIDAtNC00eiIgLz4KICA8Y2lyY2xlIGN4PSIxNi41IiBjeT0iNy41IiByPSIuNSIgZmlsbD0iY3VycmVudENvbG9yIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/key-round
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
function Shield_alert($$renderer, $$props) {
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
        "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
      }
    ],
    ["path", { "d": "M12 8v4" }],
    ["path", { "d": "M12 16h.01" }]
  ];
  Icon($$renderer, spread_props([
    { name: "shield-alert" },
    $$sanitized_props,
    {
      /**
       * @component @name ShieldAlert
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgMTNjMCA1LTMuNSA3LjUtNy42NiA4Ljk1YTEgMSAwIDAgMS0uNjctLjAxQzcuNSAyMC41IDQgMTggNCAxM1Y2YTEgMSAwIDAgMSAxLTFjMiAwIDQuNS0xLjIgNi4yNC0yLjcyYTEuMTcgMS4xNyAwIDAgMSAxLjUyIDBDMTQuNTEgMy44MSAxNyA1IDE5IDVhMSAxIDAgMCAxIDEgMXoiIC8+CiAgPHBhdGggZD0iTTEyIDh2NCIgLz4KICA8cGF0aCBkPSJNMTIgMTZoLjAxIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/shield-alert
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
function Shield_check($$renderer, $$props) {
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
        "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
      }
    ],
    ["path", { "d": "m9 12 2 2 4-4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "shield-check" },
    $$sanitized_props,
    {
      /**
       * @component @name ShieldCheck
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgMTNjMCA1LTMuNSA3LjUtNy42NiA4Ljk1YTEgMSAwIDAgMS0uNjctLjAxQzcuNSAyMC41IDQgMTggNCAxM1Y2YTEgMSAwIDAgMSAxLTFjMiAwIDQuNS0xLjIgNi4yNC0yLjcyYTEuMTcgMS4xNyAwIDAgMSAxLjUyIDBDMTQuNTEgMy44MSAxNyA1IDE5IDVhMSAxIDAgMCAxIDEgMXoiIC8+CiAgPHBhdGggZD0ibTkgMTIgMiAyIDQtNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/shield-check
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
    let isCreateMode, currentId;
    const emptyForm = {
      id: "",
      nome_completo: "",
      email: "",
      password: "",
      user_type_id: "",
      company_id: "",
      uso_individual: false,
      active: true,
      participa_ranking: false
    };
    let saving = false;
    let userForm = { ...emptyForm };
    let userMeta = null;
    let permissionsSummary = [];
    let defaultPermissionsSummary = [];
    let userTypes = [];
    let companies = [];
    let avisoTemplates = [];
    let mfaStatus = null;
    let showAvisoDialog = false;
    let showSenhaDialog = false;
    let showMfaDialog = false;
    let avisoTemplateId = "";
    let novaSenha = "";
    let confirmarSenha = "";
    let lastLoadedId = "";
    function formatDateTime(value) {
      if (!value) return "-";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(date);
    }
    async function loadCreateReference() {
      const [typesResponse, companiesResponse, templatesResponse] = await Promise.all([
        fetch("/api/v1/admin/tipos-usuario"),
        fetch("/api/v1/admin/empresas"),
        fetch("/api/v1/admin/avisos")
      ]);
      if (!typesResponse.ok) throw new Error(await typesResponse.text());
      if (!companiesResponse.ok) throw new Error(await companiesResponse.text());
      if (!templatesResponse.ok) throw new Error(await templatesResponse.text());
      const [typesPayload, companiesPayload, templatesPayload] = await Promise.all([
        typesResponse.json(),
        companiesResponse.json(),
        templatesResponse.json()
      ]);
      userTypes = typesPayload.items || [];
      companies = companiesPayload.items || [];
      avisoTemplates = templatesPayload.items || [];
      userForm = { ...emptyForm };
      userMeta = null;
      permissionsSummary = [];
      defaultPermissionsSummary = [];
      mfaStatus = null;
    }
    async function loadMfaStatus(userId) {
      const response = await fetch("/api/v1/admin/auth/mfa-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: [userId] })
      });
      if (!response.ok) {
        mfaStatus = null;
        return;
      }
      const payload = await response.json();
      mfaStatus = payload?.statuses?.[userId] || null;
    }
    async function loadDetail() {
      try {
        if (isCreateMode) {
          await loadCreateReference();
        } else {
          const response = await fetch(`/api/v1/admin/usuarios/${currentId}`);
          if (!response.ok) throw new Error(await response.text());
          const payload = await response.json();
          userMeta = payload.user;
          permissionsSummary = payload.permissions || [];
          defaultPermissionsSummary = payload.default_permissions || [];
          userTypes = payload.available?.user_types || [];
          companies = payload.available?.companies || [];
          avisoTemplates = payload.available?.aviso_templates || [];
          userForm = {
            id: payload.user.id,
            nome_completo: payload.user.nome || "",
            email: payload.user.email || "",
            password: "",
            user_type_id: payload.user.tipo_id || "",
            company_id: payload.user.empresa_id || "",
            uso_individual: Boolean(payload.user.uso_individual),
            active: Boolean(payload.user.ativo),
            participa_ranking: Boolean(payload.user.participa_ranking)
          };
          await loadMfaStatus(payload.user.id);
        }
      } catch (err) {
        console.error(err);
        toast.error("Nao foi possivel carregar o detalhe do usuario.");
      } finally {
      }
    }
    async function sendAviso() {
      try {
        const response = await fetch("/api/v1/admin/avisos/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userForm.id, template_id: avisoTemplateId })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success("Aviso disparado com sucesso.");
        showAvisoDialog = false;
        avisoTemplateId = "";
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Erro ao enviar aviso.");
      }
    }
    async function redefineSenha() {
      try {
        if (!novaSenha.trim() || novaSenha.length < 6) {
          throw new Error("A nova senha precisa ter pelo menos 6 caracteres.");
        }
        if (novaSenha !== confirmarSenha) {
          throw new Error("A confirmacao da senha nao confere.");
        }
        const response = await fetch("/api/v1/admin/auth/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userForm.id,
            password: novaSenha,
            confirm_email: true
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success("Senha atualizada com sucesso.");
        showSenhaDialog = false;
        novaSenha = "";
        confirmarSenha = "";
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha.");
      }
    }
    async function resetarMfa() {
      try {
        const response = await fetch("/api/v1/admin/auth/reset-mfa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userForm.id })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success("2FA resetado com sucesso.");
        showMfaDialog = false;
        await loadMfaStatus(userForm.id);
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Erro ao resetar 2FA.");
      }
    }
    isCreateMode = store_get($$store_subs ??= {}, "$page", page).params.id === "novo";
    currentId = store_get($$store_subs ??= {}, "$page", page).params.id;
    if (store_get($$store_subs ??= {}, "$page", page).params.id && store_get($$store_subs ??= {}, "$page", page).params.id !== lastLoadedId) {
      lastLoadedId = store_get($$store_subs ??= {}, "$page", page).params.id;
      loadDetail();
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("x2dbz", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(isCreateMode ? "Novo usuario" : "Usuario")} | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: isCreateMode ? "Novo usuario" : userMeta?.nome || "Usuario",
        subtitle: isCreateMode ? "Cadastro administrativo com papel, empresa, escopo e senha inicial." : "Edicao administrativa do usuario, com acoes de acesso e seguranca.",
        breadcrumbs: [
          { label: "Administracao", href: "/admin" },
          { label: "Usuarios", href: "/admin/usuarios" },
          { label: isCreateMode ? "Novo" : userMeta?.nome || "Detalhe" }
        ],
        actions: isCreateMode ? [] : [
          {
            label: "Atualizar",
            onClick: loadDetail,
            variant: "secondary",
            icon: Refresh_cw
          },
          {
            label: "Permissoes",
            href: `/admin/permissoes/${currentId}`,
            variant: "outline",
            icon: Shield_check
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="space-y-6">`);
      if (!isCreateMode) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="grid gap-4 md:grid-cols-4">`);
        Card($$renderer3, {
          color: "financeiro",
          children: ($$renderer4) => {
            $$renderer4.push(`<p class="text-sm text-slate-500">Perfil</p> <p class="mt-2 text-lg font-semibold text-slate-900">${escape_html(userMeta?.tipo || "-")}</p>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Card($$renderer3, {
          color: "financeiro",
          children: ($$renderer4) => {
            $$renderer4.push(`<p class="text-sm text-slate-500">Empresa</p> <p class="mt-2 text-lg font-semibold text-slate-900">${escape_html(userMeta?.empresa || "Sem empresa")}</p>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Card($$renderer3, {
          color: "financeiro",
          children: ($$renderer4) => {
            $$renderer4.push(`<p class="text-sm text-slate-500">Permissoes ativas</p> <p class="mt-2 text-lg font-semibold text-slate-900">${escape_html(permissionsSummary.filter((item) => item.ativo).length)}</p>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Card($$renderer3, {
          color: "financeiro",
          children: ($$renderer4) => {
            $$renderer4.push(`<p class="text-sm text-slate-500">MFA</p> <p class="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">`);
            if (mfaStatus?.enabled) {
              $$renderer4.push("<!--[0-->");
              Badge($$renderer4, {
                color: "green",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Ativo`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer4.push("<!--[-1-->");
              Badge($$renderer4, {
                color: "gray",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Nao configurado`);
                },
                $$slots: { default: true }
              });
            }
            $$renderer4.push(`<!--]--></p>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      Card($$renderer3, {
        color: "financeiro",
        title: "Cadastro administrativo",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="grid gap-4 lg:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="usuario-nome">Nome completo</label> <input id="usuario-nome"${attr("value", userForm.nome_completo)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="usuario-email">E-mail</label> <input id="usuario-email" type="email"${attr("value", userForm.email)} class="vtur-input w-full"/></div> `);
          if (isCreateMode) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div><label class="mb-1 block text-sm font-medium text-slate-700" for="usuario-senha">Senha inicial</label> <input id="usuario-senha" type="password"${attr("value", userForm.password)} class="vtur-input w-full"/></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="usuario-tipo">Tipo de usuario</label> `);
          $$renderer4.select(
            {
              id: "usuario-tipo",
              value: userForm.user_type_id,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(userTypes);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let tipo = each_array[$$index];
                $$renderer5.option({ value: tipo.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(tipo.nome || tipo.name)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="usuario-empresa">Empresa</label> `);
          $$renderer4.select(
            {
              id: "usuario-empresa",
              value: userForm.company_id,
              class: "vtur-input w-full",
              disabled: userForm.uso_individual
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(companies);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let company = each_array_1[$$index_1];
                $$renderer5.option({ value: company.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(company.nome_fantasia || company.nome || company.name)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", userForm.uso_individual, true)}/> <div><p class="font-medium text-slate-900">Uso individual</p> <p class="text-sm text-slate-500">Remove o vinculo corporativo com empresa.</p></div></label> <label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", userForm.active, true)}/> <div><p class="font-medium text-slate-900">Usuario ativo</p> <p class="text-sm text-slate-500">Controla acesso imediato ao sistema.</p></div></label> <label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", userForm.participa_ranking, true)}/> <div><p class="font-medium text-slate-900">Participa do ranking</p> <p class="text-sm text-slate-500">Inclui o usuario nos indicadores competitivos.</p></div></label></div> `);
          if (!isCreateMode) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="mt-6 grid gap-4 md:grid-cols-3"><div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-sm text-slate-500">Criado em</p> <p class="mt-2 font-medium text-slate-900">${escape_html(formatDateTime(userMeta?.created_at))}</p></div> <div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-sm text-slate-500">Ultima atualizacao</p> <p class="mt-2 font-medium text-slate-900">${escape_html(formatDateTime(userMeta?.updated_at))}</p></div> <div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-sm text-slate-500">Escopo</p> <p class="mt-2 font-medium text-slate-900">`);
            if (userMeta?.uso_individual) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`Individual`);
            } else if (userMeta?.created_by_gestor) {
              $$renderer4.push("<!--[1-->");
              $$renderer4.push(`Equipe criada por gestor`);
            } else {
              $$renderer4.push("<!--[-1-->");
              $$renderer4.push(`Corporativo`);
            }
            $$renderer4.push(`<!--]--></p></div></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <div class="mt-6 flex flex-wrap gap-3">`);
          Button($$renderer4, {
            variant: "secondary",
            href: "/admin/usuarios",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Voltar`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            variant: "primary",
            color: "financeiro",
            loading: saving,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Salvar usuario`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      if (!isCreateMode) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="grid gap-6 xl:grid-cols-2">`);
        Card($$renderer3, {
          color: "financeiro",
          title: "Permissoes aplicadas",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="space-y-3"><!--[-->`);
            const each_array_2 = ensure_array_like(permissionsSummary.filter((item) => item.ativo).slice(0, 8));
            for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
              let item = each_array_2[$$index_2];
              $$renderer4.push(`<div class="flex items-center justify-between rounded-xl border border-slate-200 p-3"><div><p class="font-medium text-slate-900">${escape_html(item.label)}</p> <p class="text-xs text-slate-500">${escape_html(item.modulo)}</p></div> `);
              Badge($$renderer4, {
                color: "blue",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->${escape_html(item.permissao)}`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----></div>`);
            }
            $$renderer4.push(`<!--]--> `);
            if (permissionsSummary.filter((item) => item.ativo).length === 0) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<p class="text-sm text-slate-500">Nenhuma permissao ativa encontrada.</p>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            Button($$renderer4, {
              variant: "outline",
              href: `/admin/permissoes/${currentId}`,
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Abrir editor completo`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Card($$renderer3, {
          color: "financeiro",
          title: "Acoes administrativas",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="space-y-3"><button type="button" class="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:border-orange-300 hover:bg-orange-50/40"><div class="flex items-center gap-3">`);
            Mail($$renderer4, { size: 18, class: "text-orange-600" });
            $$renderer4.push(`<!----> <div><p class="font-medium text-slate-900">Enviar aviso administrativo</p> <p class="text-sm text-slate-500">Usa templates ativos do modulo de avisos.</p></div></div></button> <button type="button" class="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:border-orange-300 hover:bg-orange-50/40"><div class="flex items-center gap-3">`);
            Key_round($$renderer4, { size: 18, class: "text-orange-600" });
            $$renderer4.push(`<!----> <div><p class="font-medium text-slate-900">Redefinir senha</p> <p class="text-sm text-slate-500">Atualiza a senha diretamente no Auth.</p></div></div></button> <button type="button" class="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:border-orange-300 hover:bg-orange-50/40"><div class="flex items-center gap-3">`);
            Shield_alert($$renderer4, { size: 18, class: "text-orange-600" });
            $$renderer4.push(`<!----> <div><p class="font-medium text-slate-900">Resetar 2FA</p> <p class="text-sm text-slate-500">Remove fatores ativos e obriga nova configuracao.</p></div></div> `);
            if (mfaStatus?.enabled) {
              $$renderer4.push("<!--[0-->");
              Badge($$renderer4, {
                color: "green",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Ativo`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer4.push("<!--[-1-->");
              Badge($$renderer4, {
                color: "gray",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Nao configurado`);
                },
                $$slots: { default: true }
              });
            }
            $$renderer4.push(`<!--]--></button></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--></div> `);
      Dialog($$renderer3, {
        title: "Enviar aviso administrativo",
        size: "md",
        showConfirm: true,
        confirmText: "Enviar aviso",
        onConfirm: sendAviso,
        get open() {
          return showAvisoDialog;
        },
        set open($$value) {
          showAvisoDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="aviso-template">Template</label> `);
          $$renderer4.select(
            {
              id: "aviso-template",
              value: avisoTemplateId,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_3 = ensure_array_like(avisoTemplates);
              for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
                let template = each_array_3[$$index_3];
                $$renderer5.option({ value: template.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(template.nome)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <p class="text-sm text-slate-500">O envio usa as configuracoes globais de e-mail do sistema e aplica as variaveis do usuario atual.</p></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Redefinir senha",
        size: "md",
        showConfirm: true,
        confirmText: "Salvar senha",
        onConfirm: redefineSenha,
        get open() {
          return showSenhaDialog;
        },
        set open($$value) {
          showSenhaDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="nova-senha">Nova senha</label> <input id="nova-senha" type="password"${attr("value", novaSenha)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="confirmar-senha">Confirmacao</label> <input id="confirmar-senha" type="password"${attr("value", confirmarSenha)} class="vtur-input w-full"/></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Resetar 2FA",
        size: "sm",
        showConfirm: true,
        confirmText: "Resetar 2FA",
        confirmVariant: "danger",
        onConfirm: resetarMfa,
        get open() {
          return showMfaDialog;
        },
        set open($$value) {
          showMfaDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<p class="text-sm text-slate-600">Esta acao remove todos os fatores MFA do usuario e exige configuracao novamente no proximo acesso.</p>`);
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
