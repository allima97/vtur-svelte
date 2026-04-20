import { h as head, q as attr } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let roteiros = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let form = { nome: "", duracao: "", inicio_cidade: "", fim_cidade: "" };
    const columns = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "duracao",
        label: "Duração",
        sortable: true,
        width: "100px",
        formatter: (v) => v ? `${v} dias` : "-"
      },
      {
        key: "inicio_cidade",
        label: "Origem",
        sortable: true,
        formatter: (v) => v || "-"
      },
      {
        key: "fim_cidade",
        label: "Destino",
        sortable: true,
        formatter: (v) => v || "-"
      },
      {
        key: "updated_at",
        label: "Atualizado",
        sortable: true,
        width: "130px",
        formatter: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "-"
      }
    ];
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/roteiros");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        roteiros = payload.roteiros || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar roteiros.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = { nome: "", duracao: "", inicio_cidade: "", fim_cidade: "" };
      modalOpen = true;
    }
    async function save() {
      if (!form.nome.trim()) {
        toast.error("Nome obrigatório.");
        return;
      }
      saving = true;
      try {
        const response = await fetch("/api/v1/roteiros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId || void 0,
            nome: form.nome,
            duracao: form.duracao ? Number(form.duracao) : null,
            inicio_cidade: form.inicio_cidade || null,
            fim_cidade: form.fim_cidade || null
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Roteiro atualizado." : "Roteiro criado.");
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
      head("1v7x2d3", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Roteiros | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Roteiros Personalizados",
        subtitle: "Crie e gerencie roteiros de viagem para usar nos orçamentos.",
        color: "clientes",
        breadcrumbs: [
          { label: "Orçamentos", href: "/orcamentos" },
          { label: "Roteiros" }
        ],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          },
          {
            label: "Novo Roteiro",
            onClick: openNew,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      DataTable($$renderer3, {
        columns,
        data: roteiros,
        color: "clientes",
        loading,
        title: "Roteiros cadastrados",
        searchable: true,
        emptyMessage: "Nenhum roteiro cadastrado",
        onRowClick: (row) => goto(`/orcamentos/roteiros/${row.id}`),
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
        title: editingId ? "Editar Roteiro" : "Novo Roteiro",
        color: "clientes",
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
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="rot-nome">Nome *</label> <input id="rot-nome"${attr("value", form.nome)} class="vtur-input w-full" placeholder="Ex: Europa Clássica 10 dias"/></div> <div class="grid grid-cols-1 sm:grid-cols-3 gap-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="rot-duracao">Duração (dias)</label> <input id="rot-duracao" type="number" min="1"${attr("value", form.duracao)} class="vtur-input w-full" placeholder="10"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="rot-origem">Cidade de origem</label> <input id="rot-origem"${attr("value", form.inicio_cidade)} class="vtur-input w-full" placeholder="Lisboa"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="rot-destino">Cidade de destino</label> <input id="rot-destino"${attr("value", form.fim_cidade)} class="vtur-input w-full" placeholder="Paris"/></div></div></div>`);
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
