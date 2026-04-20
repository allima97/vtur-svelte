import { f as fallback, p as attr_class, j as clsx, k as slot, m as bind_props } from "./index2.js";
function KPIGrid($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let columns = fallback($$props["columns"], "auto");
    let className = fallback($$props["className"], "");
    const gridClassMap = {
      auto: "vtur-kpi-grid",
      "1": "vtur-kpi-grid !grid-cols-1",
      "2": "vtur-kpi-grid !grid-cols-1 sm:!grid-cols-2",
      "3": "vtur-kpi-grid !grid-cols-1 md:!grid-cols-3",
      "4": "vtur-kpi-grid !grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4",
      "5": "vtur-kpi-grid vtur-kpi-grid-5",
      "6": "vtur-kpi-grid vtur-kpi-grid-6"
    };
    $$renderer2.push(`<div${attr_class(clsx(`${gridClassMap[String(columns)] ?? gridClassMap.auto} ${className}`.trim()))}><!--[-->`);
    slot($$renderer2, $$props, "default", {}, null);
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { columns, className });
  });
}
export {
  KPIGrid as K
};
