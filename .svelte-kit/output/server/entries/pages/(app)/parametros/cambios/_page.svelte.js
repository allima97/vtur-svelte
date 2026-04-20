import { b as store_get, u as unsubscribe_stores, h as head, q as attr, t as ensure_array_like, e as escape_html } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { p as permissoes } from "../../../../../chunks/permissoes.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let canEdit, canDelete;
    let cambios = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    const MOEDAS = [
      "USD",
      "EUR",
      "ARS",
      "GBP",
      "CAD",
      "AUD",
      "CHF",
      "JPY",
      "MXN",
      "CLP",
      "UYU",
      "PYG"
    ];
    let form = {
      moeda: "USD",
      data: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      valor: ""
    };
    const columns = [
      { key: "moeda", label: "Moeda", sortable: true, width: "100px" },
      {
        key: "data",
        label: "Data",
        sortable: true,
        width: "120px",
        formatter: (value) => value ? (/* @__PURE__ */ new Date(value + "T00:00:00")).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "valor",
        label: "Valor (R$)",
        sortable: true,
        align: "right",
        formatter: (value) => value != null ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 6 }).format(value) : "-"
      },
      {
        key: "owner_user",
        label: "Registrado por",
        sortable: false,
        formatter: (_, row) => String(row.owner_user?.nome_completo || "-")
      }
    ];
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/parametros/cambios");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        cambios = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar câmbios.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = {
        moeda: "USD",
        data: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        valor: ""
      };
      modalOpen = true;
    }
    function openEdit(cambio) {
      editingId = cambio.id;
      form = {
        moeda: cambio.moeda,
        data: cambio.data,
        valor: String(cambio.valor ?? "")
      };
      modalOpen = true;
    }
    async function save() {
      if (!form.moeda.trim()) {
        toast.error("Informe a moeda.");
        return;
      }
      if (!form.data) {
        toast.error("Informe a data.");
        return;
      }
      if (!form.valor) {
        toast.error("Informe o valor.");
        return;
      }
      saving = true;
      try {
        const response = await fetch("/api/v1/parametros/cambios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId || void 0,
            moeda: form.moeda.trim().toUpperCase(),
            data: form.data,
            valor: Number(String(form.valor).replace(",", "."))
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Câmbio atualizado." : "Câmbio registrado.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar câmbio.");
      } finally {
        saving = false;
      }
    }
    canEdit = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("cambios", "edit") || permissoes.can("parametros", "edit");
    canDelete = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("cambios", "delete") || permissoes.can("parametros", "delete");
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("chn4dd", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Câmbios | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Câmbios",
        subtitle: "Registre as cotações de moedas estrangeiras para uso nos orçamentos e relatórios.",
        color: "financeiro",
        breadcrumbs: [
          { label: "Parâmetros", href: "/parametros" },
          { label: "Câmbios" }
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
              label: "Novo Câmbio",
              onClick: openNew,
              variant: "primary",
              icon: Plus
            }
          ] : []
        ]
      });
      $$renderer3.push(`<!----> `);
      DataTable($$renderer3, {
        columns,
        data: cambios,
        color: "financeiro",
        loading,
        title: "Histórico de câmbios",
        searchable: true,
        emptyMessage: "Nenhum câmbio registrado",
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
        title: editingId ? "Editar Câmbio" : "Novo Câmbio",
        color: "financeiro",
        size: "sm",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: editingId ? "Salvar" : "Registrar",
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
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="cambio-moeda">Moeda *</label> <div class="flex gap-2">`);
          $$renderer4.select(
            {
              id: "cambio-moeda",
              value: form.moeda,
              class: "vtur-input flex-1"
            },
            ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(MOEDAS);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let m = each_array[$$index];
                $$renderer5.option({ value: m }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(m)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(` <input type="text"${attr("value", form.moeda)} class="vtur-input w-24" placeholder="Outra" maxlength="5"/></div> <p class="mt-1 text-xs text-slate-500">Selecione ou digite o código da moeda (ex: USD, EUR).</p></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="cambio-data">Data *</label> <input id="cambio-data" type="date"${attr("value", form.data)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="cambio-valor">Valor em R$ *</label> <input id="cambio-valor" type="number" step="0.000001" min="0"${attr("value", form.valor)} class="vtur-input w-full" placeholder="Ex: 5.123456"/> <p class="mt-1 text-xs text-slate-500">Valor de 1 unidade da moeda em reais.</p></div></div>`);
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
