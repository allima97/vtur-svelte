import { b as store_get, u as unsubscribe_stores, h as head, e as escape_html, q as attr, t as ensure_array_like } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { p as permissoes } from "../../../../../chunks/permissoes.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { T as Target } from "../../../../../chunks/target.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let canEdit, canDelete, totalMetas, metasAtivas;
    let metas = [];
    let vendedores = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let form = createForm();
    function createForm() {
      const now = /* @__PURE__ */ new Date();
      return {
        vendedor_id: "",
        periodo: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        meta_geral: "",
        meta_diferenciada: "",
        ativo: true
      };
    }
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    }
    function formatPeriodo(value) {
      if (!value) return "-";
      const [year, month] = value.split("-");
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
    const columns = [
      {
        key: "vendedor",
        label: "Vendedor",
        sortable: true,
        formatter: (_, row) => String(row.vendedor?.nome_completo || "Vendedor")
      },
      {
        key: "periodo",
        label: "Período",
        sortable: true,
        formatter: (value) => formatPeriodo(value)
      },
      {
        key: "meta_geral",
        label: "Meta Geral",
        sortable: true,
        align: "right",
        formatter: (value) => formatCurrency(value)
      },
      {
        key: "meta_diferenciada",
        label: "Meta Diferenciada",
        sortable: true,
        align: "right",
        formatter: (value) => value ? formatCurrency(value) : "-"
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "100px",
        formatter: (value) => value ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Ativa</span>' : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inativa</span>'
      }
    ];
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/parametros/metas");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        metas = payload.items || [];
        vendedores = payload.vendedores || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar metas.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = createForm();
      if (vendedores.length === 1) form.vendedor_id = vendedores[0].id;
      modalOpen = true;
    }
    function openEdit(meta) {
      editingId = meta.id;
      form = {
        vendedor_id: meta.vendedor_id,
        periodo: meta.periodo.slice(0, 7),
        meta_geral: String(meta.meta_geral || ""),
        meta_diferenciada: String(meta.meta_diferenciada || ""),
        ativo: meta.ativo
      };
      modalOpen = true;
    }
    async function save() {
      if (!form.vendedor_id) {
        toast.error("Selecione o vendedor.");
        return;
      }
      if (!form.periodo) {
        toast.error("Informe o período.");
        return;
      }
      if (!form.meta_geral) {
        toast.error("Informe a meta geral.");
        return;
      }
      saving = true;
      try {
        const response = await fetch("/api/v1/parametros/metas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId || void 0,
            vendedor_id: form.vendedor_id,
            periodo: form.periodo,
            meta_geral: Number(String(form.meta_geral).replace(",", ".")),
            meta_diferenciada: Number(String(form.meta_diferenciada || "0").replace(",", ".")),
            ativo: form.ativo
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Meta atualizada." : "Meta criada.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar meta.");
      } finally {
        saving = false;
      }
    }
    function buildMonthOptions() {
      const items = [];
      const now = /* @__PURE__ */ new Date();
      for (let i = -12; i <= 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        items.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      }
      return items;
    }
    const monthOptions = buildMonthOptions();
    canEdit = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("metas", "edit") || permissoes.can("parametros", "edit");
    canDelete = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("metas", "delete") || permissoes.can("parametros", "delete");
    totalMetas = metas.reduce((acc, m) => acc + Number(m.meta_geral || 0), 0);
    metasAtivas = metas.filter((m) => m.ativo).length;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1xgcy5r", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Metas | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Metas de Vendedores",
        subtitle: "Defina e acompanhe as metas mensais por vendedor.",
        color: "financeiro",
        breadcrumbs: [
          { label: "Parâmetros", href: "/parametros" },
          { label: "Metas" }
        ],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          },
          ...canEdit ? [
            {
              label: "Nova Meta",
              onClick: openNew,
              variant: "primary",
              icon: Plus
            }
          ] : []
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
      Target($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total de metas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(metas.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
      Target($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Metas ativas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(metasAtivas)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
      Target($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Volume total</p> <p class="text-2xl font-bold text-slate-900">${escape_html(formatCurrency(totalMetas))}</p></div></div></div> `);
      DataTable($$renderer3, {
        columns,
        data: metas,
        color: "financeiro",
        loading,
        title: "Metas cadastradas",
        searchable: true,
        emptyMessage: "Nenhuma meta cadastrada",
        onRowClick: canEdit ? (row) => openEdit(row) : void 0,
        $$slots: {
          "row-actions": ($$renderer4, { row }) => {
            {
              if (canDelete) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<button class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Excluir"${attr("disabled", deletingId === row.id, true)}>`);
                Trash_2($$renderer4, { size: 15 });
                $$renderer4.push(`<!----></button>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]-->`);
            }
          }
        }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: editingId ? "Editar Meta" : "Nova Meta",
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
          $$renderer4.push(`<div class="space-y-4">`);
          if (vendedores.length > 0) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div><label class="mb-1 block text-sm font-medium text-slate-700" for="meta-vendedor">Vendedor *</label> `);
            $$renderer4.select(
              {
                id: "meta-vendedor",
                value: form.vendedor_id,
                class: "vtur-input w-full"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: "" }, ($$renderer6) => {
                  $$renderer6.push(`Selecione...`);
                });
                $$renderer5.push(`<!--[-->`);
                const each_array = ensure_array_like(vendedores);
                for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                  let v = each_array[$$index];
                  $$renderer5.option({ value: v.id }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(v.nome_completo || "Vendedor")}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
            $$renderer4.push(`</div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="meta-periodo">Período *</label> `);
          $$renderer4.select(
            {
              id: "meta-periodo",
              value: form.periodo,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(monthOptions);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let opt = each_array_1[$$index_1];
                $$renderer5.option({ value: opt.value }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(opt.label)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="meta-geral">Meta Geral (R$) *</label> <input id="meta-geral" type="number" step="0.01" min="0"${attr("value", form.meta_geral)} class="vtur-input w-full" placeholder="0,00"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="meta-diferenciada">Meta Diferenciada (R$)</label> <input id="meta-diferenciada" type="number" step="0.01" min="0"${attr("value", form.meta_diferenciada)} class="vtur-input w-full" placeholder="0,00"/> <p class="mt-1 text-xs text-slate-500">Opcional. Meta específica por produto diferenciado.</p></div> <div><label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.ativo, true)} class="rounded border-slate-300"/> Meta ativa</label></div></div>`);
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
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
