import { h as head, e as escape_html, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { D as Dollar_sign } from "../../../../../chunks/dollar-sign.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let totalMrr;
    let planos = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let form = {
      nome: "",
      descricao: "",
      valor_mensal: "",
      moeda: "BRL",
      ativo: true
    };
    const columns = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "descricao",
        label: "Descrição",
        sortable: false,
        formatter: (v) => v || "-"
      },
      {
        key: "valor_mensal",
        label: "Mensalidade",
        sortable: true,
        align: "right",
        formatter: (v, row) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: row.moeda || "BRL" }).format(v || 0)
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "90px",
        formatter: (v) => v ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Ativo</span>' : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inativo</span>'
      }
    ];
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/admin/planos");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        planos = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar planos.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = {
        nome: "",
        descricao: "",
        valor_mensal: "",
        moeda: "BRL",
        ativo: true
      };
      modalOpen = true;
    }
    function openEdit(p) {
      editingId = p.id;
      form = {
        nome: p.nome,
        descricao: p.descricao || "",
        valor_mensal: String(p.valor_mensal || ""),
        moeda: p.moeda || "BRL",
        ativo: p.ativo
      };
      modalOpen = true;
    }
    async function save() {
      if (!form.nome.trim()) {
        toast.error("Nome obrigatório.");
        return;
      }
      saving = true;
      try {
        const response = await fetch("/api/v1/admin/planos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId || void 0,
            nome: form.nome,
            descricao: form.descricao || null,
            valor_mensal: Number(form.valor_mensal || 0),
            moeda: form.moeda,
            ativo: form.ativo
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Plano atualizado." : "Plano criado.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      } finally {
        saving = false;
      }
    }
    totalMrr = planos.filter((p) => p.ativo).reduce((acc, p) => acc + p.valor_mensal, 0);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1u4pjov", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Planos | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Planos de Assinatura",
        subtitle: "Gerencie os planos disponíveis para as empresas clientes.",
        breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Planos" }],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          },
          {
            label: "Novo Plano",
            onClick: openNew,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
      Dollar_sign($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total de planos</p> <p class="text-2xl font-bold text-slate-900">${escape_html(planos.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
      Dollar_sign($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Planos ativos</p> <p class="text-2xl font-bold text-slate-900">${escape_html(planos.filter((p) => p.ativo).length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
      Dollar_sign($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">MRR potencial</p> <p class="text-2xl font-bold text-slate-900">${escape_html(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalMrr))}</p></div></div></div> `);
      DataTable($$renderer3, {
        columns,
        data: planos,
        color: "financeiro",
        loading,
        title: "Planos cadastrados",
        searchable: true,
        emptyMessage: "Nenhum plano cadastrado",
        onRowClick: (row) => openEdit(row),
        $$slots: {
          "row-actions": ($$renderer4, { row }) => {
            {
              $$renderer4.push(`<button class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir"${attr("disabled", deletingId === row.id, true)}>`);
              Trash_2($$renderer4, { size: 15 });
              $$renderer4.push(`<!----></button>`);
            }
          }
        }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: editingId ? "Editar Plano" : "Novo Plano",
        color: "financeiro",
        size: "md",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: editingId ? "Salvar" : "Criar",
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
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="plano-nome">Nome *</label> <input id="plano-nome"${attr("value", form.nome)} class="vtur-input w-full" placeholder="Ex: Starter, Pro, Enterprise"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="plano-desc">Descrição</label> <textarea id="plano-desc" rows="2" class="vtur-input w-full" placeholder="Descrição do plano...">`);
          const $$body = escape_html(form.descricao);
          if ($$body) {
            $$renderer4.push(`${$$body}`);
          }
          $$renderer4.push(`</textarea></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="plano-valor">Mensalidade</label> <input id="plano-valor" type="number" step="0.01" min="0"${attr("value", form.valor_mensal)} class="vtur-input w-full" placeholder="0,00"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="plano-moeda">Moeda</label> `);
          $$renderer4.select(
            {
              id: "plano-moeda",
              value: form.moeda,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "BRL" }, ($$renderer6) => {
                $$renderer6.push(`BRL (R$)`);
              });
              $$renderer5.option({ value: "USD" }, ($$renderer6) => {
                $$renderer6.push(`USD ($)`);
              });
              $$renderer5.option({ value: "EUR" }, ($$renderer6) => {
                $$renderer6.push(`EUR (€)`);
              });
            }
          );
          $$renderer4.push(`</div></div> <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.ativo, true)} class="rounded border-slate-300"/> Plano ativo</label></div>`);
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
