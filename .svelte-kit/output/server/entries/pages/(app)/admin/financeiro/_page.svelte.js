import { h as head, e as escape_html, t as ensure_array_like, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { B as Building_2 } from "../../../../../chunks/building-2.js";
import { D as Dollar_sign } from "../../../../../chunks/dollar-sign.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let ativas, atrasadas, totalMrr;
    const STATUS_LABELS = {
      active: "Ativa",
      trial: "Trial",
      past_due: "Atrasada",
      suspended: "Suspensa",
      canceled: "Cancelada"
    };
    const STATUS_COLORS = {
      active: "bg-green-100 text-green-700",
      trial: "bg-blue-100 text-blue-700",
      past_due: "bg-amber-100 text-amber-700",
      suspended: "bg-orange-100 text-orange-700",
      canceled: "bg-red-100 text-red-700"
    };
    let billings = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let selectedBilling = null;
    let form = {
      status: "active",
      valor_mensal: "",
      ultimo_pagamento: "",
      proximo_vencimento: ""
    };
    const columns = [
      { key: "company_nome", label: "Empresa", sortable: true },
      {
        key: "plan_nome",
        label: "Plano",
        sortable: true,
        formatter: (v) => v || "-"
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "120px",
        formatter: (v) => `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[v] || "bg-slate-100 text-slate-600"}">${STATUS_LABELS[v] || v}</span>`
      },
      {
        key: "valor_mensal",
        label: "Mensalidade",
        sortable: true,
        align: "right",
        formatter: (v) => v != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "-"
      },
      {
        key: "proximo_vencimento",
        label: "Próx. Vencimento",
        sortable: true,
        width: "140px",
        formatter: (v) => {
          if (!v) return "-";
          const d = /* @__PURE__ */ new Date(v + "T00:00:00");
          const hoje = /* @__PURE__ */ new Date();
          const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1e3 * 60 * 60 * 24));
          const label = d.toLocaleDateString("pt-BR");
          if (diff < 0) return `<span class="text-red-600 font-medium">${label}</span>`;
          if (diff <= 7) return `<span class="text-amber-600 font-medium">${label}</span>`;
          return label;
        }
      }
    ];
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/admin/empresas");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        billings = (payload.items || []).map((item) => ({
          id: item.id,
          company_id: item.id,
          company_nome: item.nome_fantasia || item.nome_empresa || "Empresa",
          plan_nome: item.billing?.plan?.nome || null,
          status: item.billing?.status || "trial",
          valor_mensal: item.billing?.valor_mensal || null,
          ultimo_pagamento: item.billing?.ultimo_pagamento || null,
          proximo_vencimento: item.billing?.proximo_vencimento || null
        }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar dados financeiros.");
      } finally {
        loading = false;
      }
    }
    function openEdit(row) {
      selectedBilling = row;
      form = {
        status: row.status,
        valor_mensal: row.valor_mensal != null ? String(row.valor_mensal) : "",
        ultimo_pagamento: row.ultimo_pagamento || "",
        proximo_vencimento: row.proximo_vencimento || ""
      };
      modalOpen = true;
    }
    async function save() {
      if (!selectedBilling) return;
      saving = true;
      try {
        const response = await fetch("/api/v1/admin/empresas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedBilling.company_id,
            billing_status: form.status,
            billing_valor_mensal: form.valor_mensal ? Number(form.valor_mensal) : null,
            billing_ultimo_pagamento: form.ultimo_pagamento || null,
            billing_proximo_vencimento: form.proximo_vencimento || null
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success("Billing atualizado.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      } finally {
        saving = false;
      }
    }
    ativas = billings.filter((b) => b.status === "active").length;
    atrasadas = billings.filter((b) => b.status === "past_due").length;
    totalMrr = billings.filter((b) => b.status === "active").reduce((acc, b) => acc + (b.valor_mensal || 0), 0);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1o6yoxq", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Financeiro Admin | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Financeiro Admin",
        subtitle: "Gerencie o billing e status de assinatura das empresas.",
        breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Financeiro" }],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
      Building_2($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Empresas ativas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(ativas)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-amber-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">`);
      Building_2($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Atrasadas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(atrasadas)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
      Dollar_sign($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">MRR (ativas)</p> <p class="text-2xl font-bold text-slate-900">${escape_html(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalMrr))}</p></div></div></div> `);
      DataTable($$renderer3, {
        columns,
        data: billings,
        color: "financeiro",
        loading,
        title: "Billing por empresa",
        searchable: true,
        emptyMessage: "Nenhuma empresa encontrada",
        onRowClick: (row) => openEdit(row)
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: selectedBilling ? `Billing — ${selectedBilling.company_nome}` : "Billing",
        color: "financeiro",
        size: "md",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Salvar",
        loading: saving,
        onConfirm: save,
        onCancel: () => modalOpen = false,
        get open() {
          return modalOpen;
        },
        set open($$value) {
          modalOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="bill-status">Status</label> `);
          $$renderer4.select(
            {
              id: "bill-status",
              value: form.status,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(Object.entries(STATUS_LABELS));
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let [key, label] = each_array[$$index];
                $$renderer5.option({ value: key }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(label)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="bill-valor">Mensalidade (R$)</label> <input id="bill-valor" type="number" step="0.01"${attr("value", form.valor_mensal)} class="vtur-input w-full" placeholder="0,00"/></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="bill-ultimo">Último pagamento</label> <input id="bill-ultimo" type="date"${attr("value", form.ultimo_pagamento)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="bill-proximo">Próx. vencimento</label> <input id="bill-proximo" type="date"${attr("value", form.proximo_vencimento)} class="vtur-input w-full"/></div></div></div>`);
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
  });
}
export {
  _page as default
};
