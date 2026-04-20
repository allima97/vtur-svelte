import { h as head, q as attr, t as ensure_array_like, e as escape_html } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const CONTINENTES = [
      "África",
      "América do Norte",
      "América do Sul",
      "América Central",
      "Ásia",
      "Europa",
      "Oceania",
      "Antártida"
    ];
    let paises = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let form = { nome: "", codigo_iso: "", continente: "" };
    const columns = [
      { key: "nome", label: "País", sortable: true },
      {
        key: "codigo_iso",
        label: "ISO",
        sortable: true,
        width: "80px",
        formatter: (v) => v || "-"
      },
      {
        key: "continente",
        label: "Continente",
        sortable: true,
        formatter: (v) => v || "-"
      }
    ];
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/paises");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        paises = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar países.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = { nome: "", codigo_iso: "", continente: "" };
      modalOpen = true;
    }
    function openEdit(p) {
      editingId = p.id;
      form = {
        nome: p.nome,
        codigo_iso: p.codigo_iso || "",
        continente: p.continente || ""
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
        const response = await fetch("/api/v1/paises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId || void 0,
            nome: form.nome,
            codigo_iso: form.codigo_iso || null,
            continente: form.continente || null
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "País atualizado." : "País criado.");
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
      head("1qhv3qq", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Países | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Países",
        subtitle: "Cadastro de países utilizados nos destinos e clientes.",
        breadcrumbs: [
          { label: "Cadastros", href: "/cadastros" },
          { label: "Países" }
        ],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          },
          {
            label: "Novo País",
            onClick: openNew,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      DataTable($$renderer3, {
        columns,
        data: paises,
        loading,
        title: "Países cadastrados",
        searchable: true,
        emptyMessage: "Nenhum país encontrado",
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
        title: editingId ? "Editar País" : "Novo País",
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
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="pais-nome">Nome *</label> <input id="pais-nome"${attr("value", form.nome)} class="vtur-input w-full" placeholder="Nome do país"/></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="pais-iso">Código ISO</label> <input id="pais-iso"${attr("value", form.codigo_iso)} class="vtur-input w-full" placeholder="Ex: BR, US" maxlength="3"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="pais-continente">Continente</label> `);
          $$renderer4.select(
            {
              id: "pais-continente",
              value: form.continente,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione...`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(CONTINENTES);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let c = each_array[$$index];
                $$renderer5.option({ value: c }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(c)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div></div></div>`);
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
