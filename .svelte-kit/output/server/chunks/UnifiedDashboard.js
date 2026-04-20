import { f as fallback, h as head, p as attr_class, m as bind_props, e as escape_html, q as attr, t as ensure_array_like, v as stringify } from "./index2.js";
import "@sveltejs/kit/internal";
import "./exports.js";
import "./utils.js";
import "@sveltejs/kit/internal/server";
import "./root.js";
import "./state.svelte.js";
import { P as PageHeader } from "./PageHeader.js";
import { C as Card } from "./Card.js";
import { B as Button } from "./Button2.js";
import { K as KPIGrid } from "./KPIGrid.js";
import "chart.js/auto";
import "./ui.js";
import { F as Funnel } from "./funnel.js";
import { R as Refresh_cw } from "./refresh-cw.js";
import { T as Trending_up } from "./trending-up.js";
import { S as Shopping_cart } from "./shopping-cart.js";
import { F as File_text } from "./file-text.js";
import { T as Target } from "./target.js";
import { C as Calendar } from "./calendar.js";
function UnifiedDashboard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let title = fallback($$props["title"], "Dashboard");
    let subtitle = fallback($$props["subtitle"], "");
    function getDefaultPeriod() {
      const today = /* @__PURE__ */ new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      return {
        inicio: `${y}-${m}-01`,
        fim: today.toISOString().slice(0, 10)
      };
    }
    const defaultPeriod = getDefaultPeriod();
    let periodoInicio = defaultPeriod.inicio;
    let periodoFim = defaultPeriod.fim;
    let empresaSelecionada = "";
    let vendedorSelecionado = "";
    let vendasAgg = {
      timeline: [],
      topDestinos: [],
      porProduto: []
    };
    let metas = [];
    let empresas = [];
    let vendedoresFiltro = [];
    function formatDate(value) {
      if (!value) return "-";
      const [y, m, d] = String(value).slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    }
    metas.reduce((sum, m) => sum + Number(m.meta_geral || 0), 0);
    (() => {
      const hoje = /* @__PURE__ */ new Date();
      hoje.setHours(0, 0, 0, 0);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      fimMes.setHours(0, 0, 0, 0);
      const diff = Math.ceil((fimMes.getTime() - hoje.getTime()) / (1e3 * 60 * 60 * 24));
      return Math.max(0, diff);
    })();
    ({
      labels: vendasAgg.timeline.map((t) => formatDate(t.date)),
      datasets: [
        {
          label: "Receita",
          data: vendasAgg.timeline.map((t) => t.value),
          borderColor: "#f97316",
          backgroundColor: "rgba(249,115,22,0.12)",
          fill: true,
          tension: 0.3
        }
      ]
    });
    ({
      labels: vendasAgg.topDestinos.map((d) => d.name),
      datasets: [
        {
          label: "Receita",
          data: vendasAgg.topDestinos.map((d) => d.value),
          backgroundColor: ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5"]
        }
      ]
    });
    ({
      labels: vendasAgg.porProduto.map((p) => p.name),
      datasets: [
        {
          label: "Receita",
          data: vendasAgg.porProduto.map((p) => p.value),
          backgroundColor: [
            "#f97316",
            "#fb923c",
            "#fdba74",
            "#fed7aa",
            "#ffedd5",
            "#e2e8f0"
          ]
        }
      ]
    });
    head("ihtky0", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(title)} | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title,
      subtitle,
      color: "financeiro",
      breadcrumbs: [{ label: "Dashboard" }]
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6"><div><label for="dash-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data início</label> <input id="dash-inicio" type="date"${attr("value", periodoInicio)} class="vtur-input w-full"/></div> <div><label for="dash-fim" class="block text-sm font-medium text-slate-700 mb-1">Data fim</label> <input id="dash-fim" type="date"${attr("value", periodoFim)} class="vtur-input w-full"/></div> `);
        if (empresas.length > 0) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div><label for="dash-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label> `);
          $$renderer3.select(
            {
              id: "dash-empresa",
              value: empresaSelecionada,
              class: "vtur-input w-full"
            },
            ($$renderer4) => {
              $$renderer4.option({ value: "" }, ($$renderer5) => {
                $$renderer5.push(`Todas`);
              });
              $$renderer4.push(`<!--[-->`);
              const each_array = ensure_array_like(empresas);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let e = each_array[$$index];
                $$renderer4.option({ value: e.id }, ($$renderer5) => {
                  $$renderer5.push(`${escape_html(e.nome)}`);
                });
              }
              $$renderer4.push(`<!--]-->`);
            }
          );
          $$renderer3.push(`</div>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        if (vendedoresFiltro.length > 0) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div><label for="dash-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label> `);
          $$renderer3.select(
            {
              id: "dash-vendedor",
              value: vendedorSelecionado,
              class: "vtur-input w-full"
            },
            ($$renderer4) => {
              $$renderer4.option({ value: "" }, ($$renderer5) => {
                $$renderer5.push(`Todos`);
              });
              $$renderer4.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(vendedoresFiltro);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let v = each_array_1[$$index_1];
                $$renderer4.option({ value: v.id }, ($$renderer5) => {
                  $$renderer5.push(`${escape_html(v.nome)}`);
                });
              }
              $$renderer4.push(`<!--]-->`);
            }
          );
          $$renderer3.push(`</div>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> <div class="flex items-end gap-2 xl:col-span-2">`);
        Button($$renderer3, {
          variant: "primary",
          color: "financeiro",
          class_name: "flex-1",
          children: ($$renderer4) => {
            Funnel($$renderer4, { size: 16, class: "mr-2" });
            $$renderer4.push(`<!----> Aplicar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Button($$renderer3, {
          variant: "outline",
          color: "financeiro",
          class_name: "px-3",
          children: ($$renderer4) => {
            Refresh_cw($$renderer4, { size: 16, class: "animate-spin" });
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    KPIGrid($$renderer2, {
      className: "mb-6",
      columns: 5,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
        Trending_up($$renderer3, { size: 20 });
        $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Vendas no período</p> `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="h-7 w-28 bg-slate-200 rounded animate-pulse mt-1"></div>`);
        }
        $$renderer3.push(`<!--]--></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
        Shopping_cart($$renderer3, { size: 20 });
        $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Qtd. vendas</p> `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="h-7 w-16 bg-slate-200 rounded animate-pulse mt-1"></div>`);
        }
        $$renderer3.push(`<!--]--></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
        File_text($$renderer3, { size: 20 });
        $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Orçamentos</p> `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="h-7 w-16 bg-slate-200 rounded animate-pulse mt-1"></div>`);
        }
        $$renderer3.push(`<!--]--></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
        Target($$renderer3, { size: 20 });
        $$renderer3.push(`<!----></div> <div class="w-full"><p class="text-sm font-medium text-slate-500">Meta do mês</p> `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="h-7 w-28 bg-slate-200 rounded animate-pulse mt-1"></div>`);
        }
        $$renderer3.push(`<!--]--></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-slate-300"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">`);
        Calendar($$renderer3, { size: 20 });
        $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Dias no mês</p> `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="h-7 w-16 bg-slate-200 rounded animate-pulse mt-1"></div>`);
        }
        $$renderer3.push(`<!--]--></div></div> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">`);
    Card($$renderer2, {
      header: "Evolução das vendas",
      color: "financeiro",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="h-48 bg-slate-100 animate-pulse rounded-xl"></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Top destinos",
      color: "financeiro",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="h-48 bg-slate-100 animate-pulse rounded-xl"></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    {
      $$renderer2.push("<!--[0-->");
      Card($$renderer2, {
        header: "Vendas por produto",
        color: "financeiro",
        class: "mb-6",
        children: ($$renderer3) => {
          {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<div class="h-48 bg-slate-100 animate-pulse rounded-xl"></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
    }
    $$renderer2.push(`<!--]--> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">`);
    Card($$renderer2, {
      header: "Orçamentos recentes",
      color: "financeiro",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="space-y-2"><!--[-->`);
          const each_array_2 = ensure_array_like([1, 2, 3]);
          for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
            each_array_2[$$index_2];
            $$renderer3.push(`<div class="h-10 bg-slate-100 animate-pulse rounded"></div>`);
          }
          $$renderer3.push(`<!--]--></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Aniversariantes do mês",
      color: "financeiro",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="space-y-2"><!--[-->`);
          const each_array_4 = ensure_array_like([1, 2, 3]);
          for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
            each_array_4[$$index_4];
            $$renderer3.push(`<div class="h-10 bg-slate-100 animate-pulse rounded"></div>`);
          }
          $$renderer3.push(`<!--]--></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> <div${attr_class(`grid grid-cols-1 ${stringify("lg:grid-cols-2")} gap-6 mb-6`)}>`);
    {
      $$renderer2.push("<!--[0-->");
      Card($$renderer2, {
        header: "Próximas viagens",
        color: "financeiro",
        children: ($$renderer3) => {
          {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<div class="space-y-2"><!--[-->`);
            const each_array_6 = ensure_array_like([1, 2, 3]);
            for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
              each_array_6[$$index_6];
              $$renderer3.push(`<div class="h-10 bg-slate-100 animate-pulse rounded"></div>`);
            }
            $$renderer3.push(`<!--]--></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
    }
    $$renderer2.push(`<!--]--> `);
    Card($$renderer2, {
      header: "Follow-Up pendente",
      color: "financeiro",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="space-y-2"><!--[-->`);
          const each_array_8 = ensure_array_like([1, 2, 3]);
          for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
            each_array_8[$$index_8];
            $$renderer3.push(`<div class="h-10 bg-slate-100 animate-pulse rounded"></div>`);
          }
          $$renderer3.push(`<!--]--></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { title, subtitle });
  });
}
export {
  UnifiedDashboard as U
};
