import { f as fallback, w as attr_style, m as bind_props, v as stringify } from "./index2.js";
import { o as onDestroy } from "./index-server.js";
import "chart.js/auto";
function ChartJS($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let type = fallback($$props["type"], "line");
    let data = $$props["data"];
    let options = fallback($$props["options"], () => ({}), true);
    let height = fallback($$props["height"], 300);
    onDestroy(() => {
    });
    $$renderer2.push(`<div${attr_style(`height: ${stringify(height)}px;`)}><canvas></canvas></div>`);
    bind_props($$props, { type, data, options, height });
  });
}
export {
  ChartJS as C
};
