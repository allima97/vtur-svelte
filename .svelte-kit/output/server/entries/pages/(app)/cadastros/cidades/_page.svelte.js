import { h as head, q as attr, t as ensure_array_like, e as escape_html } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { S as Search } from "../../../../../chunks/search.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let cidades = [];
    let subdivisoes = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let busca = "";
    let filtroSubdivisao = "";
    let form = { nome: "", subdivisao_id: "", descricao: "" };
    const columns = [
      { key: "nome", label: "Cidade", sortable: true },
      {
        key: "subdivisao",
        label: "Estado/Província",
        sortable: false,
        formatter: (_, row) => {
          const sub = row.subdivisao?.nome || "-";
          const pais = row.subdivisao?.pais?.nome || "";
          return pais ? `${sub} · ${pais}` : sub;
        }
      },
      {
        key: "descricao",
        label: "Descrição",
        sortable: false,
        formatter: (v) => v || "-"
      }
    ];
    async function load() {
      loading = true;
      try {
        const params = new URLSearchParams();
        if (busca.trim()) params.set("q", busca.trim());
        if (filtroSubdivisao) ;
        params.set("pageSize", "100");
        const response = await fetch(`/api/v1/cidades?${params.toString()}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        cidades = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar cidades.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = { nome: "", subdivisao_id: "", descricao: "" };
      modalOpen = true;
    }
    function openEdit(c) {
      editingId = c.id;
      form = {
        nome: c.nome,
        subdivisao_id: c.subdivisao_id || "",
        descricao: c.descricao || ""
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
        const response = await fetch("/api/v1/cidades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId || void 0,
            nome: form.nome,
            subdivisao_id: form.subdivisao_id || null,
            descricao: form.descricao || null
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Cidade atualizada." : "Cidade criada.");
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
      head("sfobug", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Cidades | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Cidades",
        subtitle: "Cadastro de cidades utilizadas nos destinos e produtos.",
        breadcrumbs: [
          { label: "Cadastros", href: "/cadastros" },
          { label: "Cidades" }
        ],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          },
          {
            label: "Nova Cidade",
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
          $$renderer4.push(`<div class="flex flex-wrap gap-4 items-end"><div class="relative flex-1 min-w-[200px]">`);
          Search($$renderer4, {
            size: 16,
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          });
          $$renderer4.push(`<!----> <input${attr("value", busca)} class="vtur-input w-full pl-9" placeholder="Buscar cidade..."/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="cid-sub">Estado/Província</label> `);
          $$renderer4.select({ id: "cid-sub", value: filtroSubdivisao, class: "vtur-input" }, ($$renderer5) => {
            $$renderer5.option({ value: "" }, ($$renderer6) => {
              $$renderer6.push(`Todos`);
            });
            $$renderer5.push(`<!--[-->`);
            const each_array = ensure_array_like(subdivisoes);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let s = each_array[$$index];
              $$renderer5.option({ value: s.id }, ($$renderer6) => {
                $$renderer6.push(`${escape_html(s.nome)}`);
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
        data: cidades,
        loading,
        title: "Cidades cadastradas",
        searchable: false,
        emptyMessage: "Nenhuma cidade encontrada",
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
        title: editingId ? "Editar Cidade" : "Nova Cidade",
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
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="cid-nome">Nome *</label> <input id="cid-nome"${attr("value", form.nome)} class="vtur-input w-full" placeholder="Nome da cidade"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="cid-sub-form">Estado/Província</label> `);
          $$renderer4.select(
            {
              id: "cid-sub-form",
              value: form.subdivisao_id,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione...`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(subdivisoes);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let s = each_array_1[$$index_1];
                $$renderer5.option({ value: s.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(s.nome)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="cid-desc">Descrição</label> <input id="cid-desc"${attr("value", form.descricao)} class="vtur-input w-full" placeholder="Opcional"/></div></div>`);
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
