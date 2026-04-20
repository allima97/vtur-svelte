import { h as head, t as ensure_array_like, e as escape_html, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let subdivisoes = [];
    let paises = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let filtroPais = "";
    let form = { nome: "", pais_id: "", codigo_admin1: "", tipo: "" };
    const columns = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "pais",
        label: "País",
        sortable: false,
        formatter: (_, row) => row.pais?.nome || "-"
      },
      {
        key: "codigo_admin1",
        label: "Código",
        sortable: true,
        width: "100px",
        formatter: (v) => v || "-"
      },
      {
        key: "tipo",
        label: "Tipo",
        sortable: true,
        width: "120px",
        formatter: (v) => v || "-"
      }
    ];
    async function load() {
      loading = true;
      try {
        const params = new URLSearchParams();
        if (filtroPais) ;
        const response = await fetch(`/api/v1/subdivisoes?${params.toString()}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        subdivisoes = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar estados.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = {
        nome: "",
        pais_id: paises[0]?.id || "",
        codigo_admin1: "",
        tipo: ""
      };
      modalOpen = true;
    }
    function openEdit(s) {
      editingId = s.id;
      form = {
        nome: s.nome,
        pais_id: s.pais_id,
        codigo_admin1: s.codigo_admin1 || "",
        tipo: s.tipo || ""
      };
      modalOpen = true;
    }
    async function save() {
      if (!form.nome.trim()) {
        toast.error("Nome obrigatório.");
        return;
      }
      if (!form.pais_id) {
        toast.error("País obrigatório.");
        return;
      }
      saving = true;
      try {
        const response = await fetch("/api/v1/subdivisoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId || void 0,
            nome: form.nome,
            pais_id: form.pais_id,
            codigo_admin1: form.codigo_admin1 || null,
            tipo: form.tipo || null
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Estado atualizado." : "Estado criado.");
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
      head("fqz5hi", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Estados/Províncias | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Estados / Províncias",
        subtitle: "Cadastro de estados e províncias vinculados a países.",
        breadcrumbs: [
          { label: "Cadastros", href: "/cadastros" },
          { label: "Estados" }
        ],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          },
          {
            label: "Novo Estado",
            onClick: openNew,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      Card($$renderer3, {
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="flex gap-4 items-end"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="est-pais">País</label> `);
          $$renderer4.select({ id: "est-pais", value: filtroPais, class: "vtur-input" }, ($$renderer5) => {
            $$renderer5.option({ value: "" }, ($$renderer6) => {
              $$renderer6.push(`Todos`);
            });
            $$renderer5.push(`<!--[-->`);
            const each_array = ensure_array_like(paises);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let p = each_array[$$index];
              $$renderer5.option({ value: p.id }, ($$renderer6) => {
                $$renderer6.push(`${escape_html(p.nome)}`);
              });
            }
            $$renderer5.push(`<!--]-->`);
          });
          $$renderer4.push(`</div> `);
          Button($$renderer4, {
            variant: "primary",
            size: "sm",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Filtrar`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      DataTable($$renderer3, {
        columns,
        data: subdivisoes,
        loading,
        title: "Estados/Províncias",
        searchable: true,
        emptyMessage: "Nenhum estado encontrado",
        onRowClick: (row) => openEdit(row),
        $$slots: {
          "row-actions": ($$renderer4, { row }) => {
            {
              $$renderer4.push(`<button class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"${attr("disabled", deletingId === row.id, true)}>`);
              Trash_2($$renderer4, { size: 15 });
              $$renderer4.push(`<!----></button>`);
            }
          }
        }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: editingId ? "Editar Estado" : "Novo Estado",
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
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="est-nome">Nome *</label> <input id="est-nome"${attr("value", form.nome)} class="vtur-input w-full" placeholder="Nome do estado/província"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="est-pais-form">País *</label> `);
          $$renderer4.select(
            {
              id: "est-pais-form",
              value: form.pais_id,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione...`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(paises);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let p = each_array_1[$$index_1];
                $$renderer5.option({ value: p.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(p.nome)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="est-codigo">Código</label> <input id="est-codigo"${attr("value", form.codigo_admin1)} class="vtur-input w-full" placeholder="Ex: SP, RJ"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="est-tipo">Tipo</label> <input id="est-tipo"${attr("value", form.tipo)} class="vtur-input w-full" placeholder="Ex: Estado, Província"/></div></div></div>`);
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
