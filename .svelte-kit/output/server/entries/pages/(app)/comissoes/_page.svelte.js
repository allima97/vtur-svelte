import { h as head, q as attr, t as ensure_array_like, e as escape_html, w as attr_style, v as stringify } from "../../../../chunks/index2.js";
import { o as onDestroy } from "../../../../chunks/index-server.js";
import { P as PageHeader, C as Chevron_right } from "../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../chunks/Card.js";
import { B as Button } from "../../../../chunks/Button2.js";
import { K as KPICard } from "../../../../chunks/KPICard.js";
import { t as toast } from "../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../chunks/refresh-cw.js";
import { F as File_text } from "../../../../chunks/file-text.js";
import { D as Dollar_sign } from "../../../../chunks/dollar-sign.js";
import { T as Trending_up } from "../../../../chunks/trending-up.js";
import { C as Calculator } from "../../../../chunks/calculator.js";
import { U as Users } from "../../../../chunks/users.js";
import { L as Loader_circle } from "../../../../chunks/loader-circle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let totalComissao, totalPago, totalPendente, vendedoresAtivos;
    let items = [];
    let resumo = [];
    let loading = true;
    (/* @__PURE__ */ new Date()).getMonth() + 1;
    let filtroAno = (/* @__PURE__ */ new Date()).getFullYear();
    let filtroStatus = "todas";
    let abortController = null;
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    }
    function progressoPago(r) {
      if (!r.total_comissao) return 0;
      return Math.min(100, Math.round(r.total_pago / r.total_comissao * 100));
    }
    async function load() {
      if (abortController) abortController.abort();
      abortController = new AbortController();
      loading = true;
      try {
        const params = new URLSearchParams({ ano: String(filtroAno) });
        if (filtroStatus !== "todas") ;
        const response = await fetch(`/api/v1/financeiro/comissoes?${params.toString()}`, { signal: abortController.signal });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        items = data.items ?? [];
        resumo = data.resumo ?? [];
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error(err instanceof Error ? err.message : "Erro ao carregar comissões.");
      } finally {
        loading = false;
      }
    }
    onDestroy(() => {
      if (abortController) abortController.abort();
    });
    totalComissao = resumo.reduce((a, r) => a + r.total_comissao, 0);
    totalPago = resumo.reduce((a, r) => a + r.total_pago, 0);
    totalPendente = resumo.reduce((a, r) => a + r.total_pendente, 0);
    vendedoresAtivos = resumo.length;
    head("awplo1", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Comissões | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Comissões",
      subtitle: "Acompanhe comissões por vendedor e acesse o fechamento mensal.",
      color: "comissoes",
      breadcrumbs: [{ label: "Comissões" }],
      actions: [
        {
          label: "Atualizar",
          onClick: load,
          variant: "secondary",
          icon: Refresh_cw
        },
        {
          label: "Fechamento",
          href: "/comissoes/fechamento",
          variant: "primary",
          icon: File_text
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="vtur-kpi-grid mb-6">`);
    KPICard($$renderer2, {
      title: "Total comissões",
      value: formatCurrency(totalComissao),
      color: "comissoes",
      icon: Dollar_sign
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Total pago",
      value: formatCurrency(totalPago),
      color: "comissoes",
      icon: Trending_up
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Pendente",
      value: formatCurrency(totalPendente),
      color: "comissoes",
      icon: Calculator
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Vendedores ativos",
      value: vendedoresAtivos,
      color: "comissoes",
      icon: Users
    });
    $$renderer2.push(`<!----></div> `);
    Card($$renderer2, {
      color: "comissoes",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex flex-wrap gap-4 items-end"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="c-ano">Ano</label> <input id="c-ano" type="number"${attr("value", filtroAno)} min="2020" max="2100" class="vtur-input w-24"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="c-status">Status</label> `);
        $$renderer3.select({ id: "c-status", value: filtroStatus, class: "vtur-input" }, ($$renderer4) => {
          $$renderer4.option({ value: "todas" }, ($$renderer5) => {
            $$renderer5.push(`Todas`);
          });
          $$renderer4.option({ value: "pendente" }, ($$renderer5) => {
            $$renderer5.push(`Pendentes`);
          });
          $$renderer4.option({ value: "pago" }, ($$renderer5) => {
            $$renderer5.push(`Pagas`);
          });
        });
        $$renderer3.push(`</div> `);
        Button($$renderer3, {
          variant: "primary",
          color: "comissoes",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Filtrar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Button($$renderer3, {
          variant: "secondary",
          href: "/comissoes/fechamento",
          children: ($$renderer4) => {
            File_text($$renderer4, { size: 16, class: "mr-2" });
            $$renderer4.push(`<!----> Fechamento mensal`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Resumo por Vendedor",
      color: "comissoes",
      children: ($$renderer3) => {
        if (loading) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="flex items-center justify-center py-16">`);
          Loader_circle($$renderer3, { size: 28, class: "animate-spin text-comissoes-600" });
          $$renderer3.push(`<!----> <span class="ml-2 text-slate-500">Carregando...</span></div>`);
        } else if (resumo.length === 0) {
          $$renderer3.push("<!--[1-->");
          $$renderer3.push(`<div class="flex flex-col items-center justify-center py-16 text-slate-400">`);
          Calculator($$renderer3, { size: 40, class: "mb-3 opacity-40" });
          $$renderer3.push(`<!----> <p class="font-medium">Nenhuma comissão encontrada</p> <p class="text-sm mt-1">Ajuste os filtros ou verifique se há vendas cadastradas.</p></div>`);
        } else {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><th class="py-3 pr-4">Vendedor</th><th class="py-3 pr-4 text-right">Vendas</th><th class="py-3 pr-4 text-right">Comissão Total</th><th class="py-3 pr-4 text-right">Pago</th><th class="py-3 pr-4 text-right">Pendente</th><th class="py-3 pr-4">Progresso</th><th class="py-3"></th></tr></thead><tbody class="divide-y divide-slate-100"><!--[-->`);
          const each_array = ensure_array_like(resumo);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let r = each_array[$$index];
            const pct = progressoPago(r);
            $$renderer3.push(`<tr class="hover:bg-slate-50 transition-colors"><td class="py-3 pr-4 font-medium text-slate-900">${escape_html(r.vendedor_nome)}</td><td class="py-3 pr-4 text-right text-slate-600">${escape_html(r.total_vendas)}</td><td class="py-3 pr-4 text-right font-semibold text-slate-800">${escape_html(formatCurrency(r.total_comissao))}</td><td class="py-3 pr-4 text-right text-green-600 font-medium">${escape_html(formatCurrency(r.total_pago))}</td><td class="py-3 pr-4 text-right text-amber-600 font-medium">${escape_html(formatCurrency(r.total_pendente))}</td><td class="py-3 pr-4 min-w-[120px]"><div class="flex items-center gap-2"><div class="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden"><div class="h-full rounded-full bg-green-500 transition-all"${attr_style(`width: ${stringify(pct)}%`)}></div></div> <span class="text-xs text-slate-500 w-8 text-right">${escape_html(pct)}%</span></div></td><td class="py-3"><a${attr("href", `/comissoes/fechamento?vendedor_id=${stringify(r.vendedor_id)}`)} class="inline-flex items-center text-comissoes-600 hover:text-comissoes-800 text-xs font-medium">Ver `);
            Chevron_right($$renderer3, { size: 14 });
            $$renderer3.push(`<!----></a></td></tr>`);
          }
          $$renderer3.push(`<!--]--></tbody></table></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
