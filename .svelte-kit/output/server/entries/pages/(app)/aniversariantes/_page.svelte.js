import { h as head } from "../../../../chunks/index2.js";
import { g as goto } from "../../../../chunks/client.js";
import { P as PageHeader } from "../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../chunks/Card.js";
import "clsx";
import { D as DataTable } from "../../../../chunks/DataTable.js";
import { K as KPICard } from "../../../../chunks/KPICard.js";
import { t as toast } from "../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../chunks/refresh-cw.js";
import { G as Gift } from "../../../../chunks/gift.js";
import { C as Calendar_days } from "../../../../chunks/calendar-days.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let hoje, proximos7;
    let aniversariantes = [];
    let loading = true;
    let diasAfrente = 30;
    const columns = [
      {
        key: "nome",
        label: "Cliente",
        sortable: true,
        formatter: (v, row) => {
          const badge = row.aniversario_hoje ? '<span class="ml-2 inline-flex rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-700">Hoje!</span>' : "";
          return `<div class="font-medium text-slate-900">${v}${badge}</div>`;
        }
      },
      {
        key: "nascimento",
        label: "Aniversário",
        sortable: true,
        width: "130px",
        formatter: (v) => {
          if (!v) return "-";
          const d = /* @__PURE__ */ new Date(v + "T00:00:00");
          return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
        }
      },
      {
        key: "whatsapp",
        label: "Contato",
        sortable: false,
        formatter: (v, row) => {
          const contato = v || row.telefone;
          if (!contato) return row.email || "-";
          const phone = contato.replace(/\D/g, "");
          return `<a href="https://wa.me/${phone}" target="_blank" class="inline-flex items-center gap-1 text-green-600 hover:underline text-xs">${contato}</a>`;
        }
      }
    ];
    async function load() {
      loading = true;
      try {
        const response = await fetch(`/api/v1/dashboard/aniversariantes?dias=${diasAfrente}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        aniversariantes = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar aniversariantes.");
      } finally {
        loading = false;
      }
    }
    hoje = aniversariantes.filter((a) => a.aniversario_hoje).length;
    proximos7 = aniversariantes.filter((a) => {
      if (!a.nascimento) return false;
      const d = /* @__PURE__ */ new Date(a.nascimento + "T00:00:00");
      const now = /* @__PURE__ */ new Date();
      for (let i = 0; i <= 7; i++) {
        const check = new Date(now);
        check.setDate(now.getDate() + i);
        if (d.getMonth() === check.getMonth() && d.getDate() === check.getDate()) return true;
      }
      return false;
    }).length;
    head("js1qz5", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aniversariantes | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Aniversariantes",
      subtitle: "Clientes com aniversário nos próximos dias — oportunidade de relacionamento.",
      color: "clientes",
      breadcrumbs: [{ label: "Aniversariantes" }],
      actions: [
        {
          label: "Atualizar",
          onClick: load,
          variant: "secondary",
          icon: Refresh_cw
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6">`);
    KPICard($$renderer2, {
      title: "Aniversário hoje",
      value: hoje,
      color: "clientes",
      icon: Gift
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Próximos 7 dias",
      value: proximos7,
      color: "clientes",
      icon: Calendar_days
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: `Próximos ${diasAfrente} dias`,
      value: aniversariantes.length,
      color: "clientes",
      icon: Calendar_days
    });
    $$renderer2.push(`<!----></div> `);
    Card($$renderer2, {
      color: "clientes",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex items-center gap-4"><label class="text-sm font-medium text-slate-700" for="dias-afrente">Mostrar próximos</label> `);
        $$renderer3.select({ id: "dias-afrente", value: diasAfrente, class: "vtur-input" }, ($$renderer4) => {
          $$renderer4.option({ value: 7 }, ($$renderer5) => {
            $$renderer5.push(`7 dias`);
          });
          $$renderer4.option({ value: 15 }, ($$renderer5) => {
            $$renderer5.push(`15 dias`);
          });
          $$renderer4.option({ value: 30 }, ($$renderer5) => {
            $$renderer5.push(`30 dias`);
          });
          $$renderer4.option({ value: 60 }, ($$renderer5) => {
            $$renderer5.push(`60 dias`);
          });
          $$renderer4.option({ value: 90 }, ($$renderer5) => {
            $$renderer5.push(`90 dias`);
          });
        });
        $$renderer3.push(`</div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    DataTable($$renderer2, {
      columns,
      data: aniversariantes,
      color: "clientes",
      loading,
      title: "Aniversariantes",
      searchable: true,
      emptyMessage: "Nenhum aniversariante encontrado no período",
      onRowClick: (row) => goto(`/clientes/${row.id}`)
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
