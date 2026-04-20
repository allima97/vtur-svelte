import { h as head, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let termos = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let form = { termo: "", descricao: "", ativo: true };
    const columns = [
      { key: "termo", label: "Termo", sortable: true },
      {
        key: "descricao",
        label: "Descrição",
        sortable: true,
        formatter: (v) => v || "-"
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
        const response = await fetch("/api/v1/parametros/nao-comissionaveis");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        termos = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar termos.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = { termo: "", descricao: "", ativo: true };
      modalOpen = true;
    }
    function openEdit(t) {
      editingId = t.id;
      form = { termo: t.termo, descricao: t.descricao || "", ativo: t.ativo };
      modalOpen = true;
    }
    async function save() {
      if (!form.termo.trim()) {
        toast.error("Termo obrigatório.");
        return;
      }
      saving = true;
      try {
        const response = await fetch("/api/v1/parametros/nao-comissionaveis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId || void 0, ...form })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Termo atualizado." : "Termo criado.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      } finally {
        saving = false;
      }
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1dnox5c", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Parâmetros de Importação | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Parâmetros de Importação",
        subtitle: "Gerencie os termos não comissionáveis usados na importação e conciliação de vendas.",
        breadcrumbs: [
          { label: "Admin", href: "/admin" },
          { label: "Parâmetros de Importação" }
        ],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          },
          {
            label: "Novo Termo",
            onClick: openNew,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      Card($$renderer3, {
        color: "financeiro",
        class: "mb-4",
        children: ($$renderer4) => {
          $$renderer4.push(`<p class="text-sm text-slate-600">Termos não comissionáveis são palavras ou expressões que, quando encontradas nos recibos durante a importação ou conciliação, fazem com que o valor correspondente não seja incluído no cálculo de comissões.</p>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      DataTable($$renderer3, {
        columns,
        data: termos,
        color: "financeiro",
        loading,
        title: "Termos não comissionáveis",
        searchable: true,
        emptyMessage: "Nenhum termo cadastrado",
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
        title: editingId ? "Editar Termo" : "Novo Termo",
        color: "financeiro",
        size: "sm",
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
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="nc-termo">Termo *</label> <input id="nc-termo"${attr("value", form.termo)} class="vtur-input w-full" placeholder="Ex: SEGURO, DU, RAV"/> <p class="mt-1 text-xs text-slate-500">Texto que será buscado nos recibos (case-insensitive).</p></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="nc-desc">Descrição</label> <input id="nc-desc"${attr("value", form.descricao)} class="vtur-input w-full" placeholder="Explicação do termo"/></div> <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.ativo, true)} class="rounded border-slate-300"/> Termo ativo</label></div>`);
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
