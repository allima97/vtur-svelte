import { h as head, t as ensure_array_like, e as escape_html, q as attr } from "../../../../../chunks/index2.js";
import { o as onDestroy } from "../../../../../chunks/index-server.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { K as KPICard } from "../../../../../chunks/KPICard.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { D as Dollar_sign } from "../../../../../chunks/dollar-sign.js";
import { T as Trending_up } from "../../../../../chunks/trending-up.js";
import { C as Calculator } from "../../../../../chunks/calculator.js";
import { U as Users } from "../../../../../chunks/users.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let totalComissoes, totalVendas, pendentes, vendedoresUnicos;
    let comissoes = [];
    let vendedores = [];
    let loading = true;
    let filtroMes = (/* @__PURE__ */ new Date()).getMonth() + 1;
    let filtroAno = (/* @__PURE__ */ new Date()).getFullYear();
    let filtroVendedor = "";
    let filtroStatus = "todas";
    let abortController = null;
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    }
    const columns = [
      {
        key: "numero_venda",
        label: "Venda",
        sortable: true,
        width: "120px"
      },
      { key: "vendedor", label: "Vendedor", sortable: true },
      { key: "cliente", label: "Cliente", sortable: true },
      {
        key: "data_venda",
        label: "Data",
        sortable: true,
        width: "110px",
        formatter: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "valor_venda",
        label: "Valor Venda",
        sortable: true,
        align: "right",
        formatter: (v) => formatCurrency(v)
      },
      {
        key: "percentual_aplicado",
        label: "%",
        sortable: true,
        width: "70px",
        align: "center",
        formatter: (v) => `${v ?? 10}%`
      },
      {
        key: "valor_comissao",
        label: "Comissão",
        sortable: true,
        align: "right",
        formatter: (v) => formatCurrency(v)
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "110px",
        formatter: (v) => {
          const norm = v?.toLowerCase();
          const styles = {
            pendente: "bg-amber-100 text-amber-700",
            pago: "bg-green-100 text-green-700",
            cancelada: "bg-red-100 text-red-700"
          };
          const labels = { pendente: "Pendente", pago: "Pago", cancelada: "Cancelada" };
          return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[norm] ?? "bg-slate-100 text-slate-600"}">${labels[norm] ?? v}</span>`;
        }
      }
    ];
    async function load() {
      if (abortController) abortController.abort();
      abortController = new AbortController();
      loading = true;
      try {
        const params = new URLSearchParams();
        if (filtroStatus !== "todas") ;
        params.set("mes", String(filtroMes));
        params.set("ano", String(filtroAno));
        if (filtroVendedor) ;
        const response = await fetch(`/api/v1/financeiro/comissoes/calcular?${params.toString()}`, { signal: abortController.signal });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        comissoes = data.items ?? [];
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error(err instanceof Error ? err.message : "Erro ao carregar comissões.");
      } finally {
        loading = false;
      }
    }
    function handleExport() {
      if (comissoes.length === 0) {
        toast.info("Nenhuma comissão para exportar.");
        return;
      }
      const headers = [
        "Venda",
        "Vendedor",
        "Cliente",
        "Data",
        "Valor Venda",
        "%",
        "Comissão",
        "Status"
      ];
      const rows = comissoes.map((c) => [
        c.numero_venda,
        c.vendedor,
        c.cliente,
        c.data_venda ? new Date(c.data_venda).toLocaleDateString("pt-BR") : "",
        c.valor_venda.toFixed(2),
        c.percentual_aplicado ?? 10,
        c.valor_comissao.toFixed(2),
        c.status
      ]);
      const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `fechamento_comissoes_${filtroMes}_${filtroAno}.csv`;
      link.click();
      toast.success("Exportado com sucesso.");
    }
    onDestroy(() => {
      if (abortController) abortController.abort();
    });
    function buildMonthOptions() {
      return Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(2024, i, 1).toLocaleDateString("pt-BR", { month: "long" })
      }));
    }
    totalComissoes = comissoes.reduce((acc, c) => acc + c.valor_comissao, 0);
    totalVendas = comissoes.reduce((acc, c) => acc + c.valor_venda, 0);
    pendentes = comissoes.filter((c) => c.status === "PENDENTE" || c.status === "pendente").length;
    vendedoresUnicos = new Set(comissoes.map((c) => c.vendedor_id)).size;
    head("k34tre", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Fechamento de Comissões | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Fechamento de Comissões",
      subtitle: "Visualize e exporte o fechamento de comissões por período e vendedor.",
      color: "comissoes",
      breadcrumbs: [
        { label: "Comissões", href: "/comissoes" },
        { label: "Fechamento" }
      ],
      actions: [
        {
          label: "Atualizar",
          onClick: load,
          variant: "secondary",
          icon: Refresh_cw
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="vtur-kpi-grid mb-6">`);
    KPICard($$renderer2, {
      title: "Total comissões",
      value: formatCurrency(totalComissoes),
      color: "comissoes",
      icon: Dollar_sign
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Total vendas",
      value: formatCurrency(totalVendas),
      color: "comissoes",
      icon: Trending_up
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Pendentes",
      value: pendentes,
      color: "comissoes",
      icon: Calculator
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Vendedores",
      value: vendedoresUnicos,
      color: "comissoes",
      icon: Users
    });
    $$renderer2.push(`<!----></div> `);
    Card($$renderer2, {
      color: "comissoes",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex flex-wrap gap-4 items-end"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="fech-mes">Mês</label> `);
        $$renderer3.select({ id: "fech-mes", value: filtroMes, class: "vtur-input" }, ($$renderer4) => {
          $$renderer4.push(`<!--[-->`);
          const each_array = ensure_array_like(buildMonthOptions());
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let opt = each_array[$$index];
            $$renderer4.option({ value: opt.value }, ($$renderer5) => {
              $$renderer5.push(`${escape_html(opt.label)}`);
            });
          }
          $$renderer4.push(`<!--]-->`);
        });
        $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="fech-ano">Ano</label> <input id="fech-ano" type="number"${attr("value", filtroAno)} min="2020" max="2100" class="vtur-input w-24"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="fech-status">Status</label> `);
        $$renderer3.select({ id: "fech-status", value: filtroStatus, class: "vtur-input" }, ($$renderer4) => {
          $$renderer4.option({ value: "todas" }, ($$renderer5) => {
            $$renderer5.push(`Todas`);
          });
          $$renderer4.option({ value: "pendente" }, ($$renderer5) => {
            $$renderer5.push(`Pendentes`);
          });
          $$renderer4.option({ value: "pago" }, ($$renderer5) => {
            $$renderer5.push(`Pagas`);
          });
          $$renderer4.option({ value: "cancelada" }, ($$renderer5) => {
            $$renderer5.push(`Canceladas`);
          });
        });
        $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="fech-vendedor">Vendedor</label> `);
        $$renderer3.select(
          {
            id: "fech-vendedor",
            value: filtroVendedor,
            class: "vtur-input"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(vendedores);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let v = each_array_1[$$index_1];
              $$renderer4.option({ value: v.id }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(v.nome_completo || v.email)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
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
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Exportar CSV`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    DataTable($$renderer2, {
      columns,
      data: comissoes,
      color: "comissoes",
      loading,
      title: `Fechamento ${filtroMes}/${filtroAno} — ${comissoes.length} registros`,
      searchable: true,
      exportable: true,
      onExport: handleExport,
      emptyMessage: "Nenhuma comissão encontrada para o período"
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
