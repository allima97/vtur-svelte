import { k as slot, m as bind_props } from "../../chunks/index2.js";
import "@supabase/ssr";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import { a as auth, s as sessionSynced } from "../../chunks/auth.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let data = $$props["data"];
    if (data.session && data.user) {
      auth.setAuth(data.user, data.session);
      sessionSynced.set(true);
    }
    $$renderer2.push(`<!--[-->`);
    slot($$renderer2, $$props, "default", {}, null);
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { data });
  });
}
export {
  _layout as default
};
