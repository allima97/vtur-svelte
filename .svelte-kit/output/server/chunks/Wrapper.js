import { c as sanitize_props, d as rest_props, f as fallback, l as element, k as slot, i as attributes, m as bind_props } from "./index2.js";
function Wrapper($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["tag", "show", "use"]);
  let tag = fallback($$props["tag"], "div");
  let show = $$props["show"];
  let use = fallback($$props["use"], () => {
  });
  if (show) {
    $$renderer.push("<!--[0-->");
    element(
      $$renderer,
      tag,
      () => {
        $$renderer.push(`${attributes({ ...$$restProps })}`);
      },
      () => {
        $$renderer.push(`<!--[-->`);
        slot($$renderer, $$props, "default", {}, null);
        $$renderer.push(`<!--]-->`);
      }
    );
  } else {
    $$renderer.push("<!--[-1-->");
    $$renderer.push(`<!--[-->`);
    slot($$renderer, $$props, "default", {}, null);
    $$renderer.push(`<!--]-->`);
  }
  $$renderer.push(`<!--]-->`);
  bind_props($$props, { tag, show, use });
}
export {
  Wrapper as W
};
