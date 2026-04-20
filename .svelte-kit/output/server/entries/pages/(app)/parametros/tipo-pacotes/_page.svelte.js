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
    let tipos = [];
    let regras = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let form = createForm();
    function createForm() {
      return {
        nome: "",
        ativo: true,
        rule_id: "",
        fix_meta_nao_atingida: "",
        fix_meta_atingida: "",
        fix_super_meta: ""
      };
    }
    const columns = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "100px",
        formatter: (value) => value ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Ativo</span>' : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inativo</span>'
      },
      {
        key: "fix_meta_nao_atingida",
        label: "% Meta não batida",
        sortable: true,
        align: "right",
        formatter: (value) => value != null ? `${value}%` : "-"
      },
      {
        key: "fix_meta_atingida",
        label: "% Meta batida",
        sortable: true,
        align: "right",
        formatter: (value) => value != null ? `${value}%` : "-"
      },
      {
        key: "fix_super_meta",
        label: "% Super meta",
        sortable: true,
        align: "right",
        formatter: (value) => value != null ? `${value}%` : "-"
      }
    ];
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/parametros/tipo-pacotes");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        tipos = payload.items || [];
        regras = payload.regras || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar tipos de pacote.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = createForm();
      modalOpen = true;
    }
    function openEdit(tipo) {
      editingId = tipo.id;
      form = {
        nome: tipo.nome,
        ativo: tipo.ativo,
        rule_id: tipo.rule_id || "",
        fix_meta_nao_atingida: tipo.fix_meta_nao_atingida != null ? String(tipo.fix_meta_nao_atingida) : "",
        fix_meta_atingida: tipo.fix_meta_atingida != null ? String(tipo.fix_meta_atingida) : "",
        fix_super_meta: tipo.fix_super_meta != null ? String(tipo.fix_super_meta) : ""
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
        const toNum = (v) => v.trim() === "" ? null : Number(v);
        const response = await fetch("/api/v1/parametros/tipo-pacotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId || void 0,
            nome: form.nome.trim(),
            ativo: form.ativo,
            rule_id: form.rule_id || null,
            fix_meta_nao_atingida: toNum(form.fix_meta_nao_atingida),
            fix_meta_atingida: toNum(form.fix_meta_atingida),
            fix_super_meta: toNum(form.fix_super_meta)
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Tipo de pacote atualizado." : "Tipo de pacote criado.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar tipo de pacote.");
      } finally {
        saving = false;
      }
    }
    canEdit = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("parametros", "edit");
    canDelete = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("parametros", "admin");
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("17katc3", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Tipos de Pacote | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Tipos de Pacote",
        subtitle: "Gerencie os tipos de pacote utilizados nos recibos de vendas.",
        color: "financeiro",
        breadcrumbs: [
          { label: "Parâmetros", href: "/parametros" },
          { label: "Tipos de Pacote" }
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
              label: "Novo Tipo",
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
        data: tipos,
        color: "financeiro",
        loading,
        title: "Tipos de pacote",
        searchable: true,
        emptyMessage: "Nenhum tipo de pacote cadastrado",
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
        title: editingId ? "Editar Tipo de Pacote" : "Novo Tipo de Pacote",
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
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="tp-nome">Nome *</label> <input id="tp-nome"${attr("value", form.nome)} class="vtur-input w-full" placeholder="Ex: Pacote Completo"/></div> `);
          if (regras.length > 0) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div><label class="mb-1 block text-sm font-medium text-slate-700" for="tp-regra">Regra de comissão</label> `);
            $$renderer4.select(
              {
                id: "tp-regra",
                value: form.rule_id,
                class: "vtur-input w-full"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: "" }, ($$renderer6) => {
                  $$renderer6.push(`Sem regra específica`);
                });
                $$renderer5.push(`<!--[-->`);
                const each_array = ensure_array_like(regras);
                for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                  let r = each_array[$$index];
                  $$renderer5.option({ value: r.id }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(r.nome)}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
            $$renderer4.push(`</div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <div class="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="tp-nao-batida">% Meta não batida</label> <input id="tp-nao-batida" type="number" step="0.01"${attr("value", form.fix_meta_nao_atingida)} class="vtur-input w-full" placeholder="-"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tp-batida">% Meta batida</label> <input id="tp-batida" type="number" step="0.01"${attr("value", form.fix_meta_atingida)} class="vtur-input w-full" placeholder="-"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tp-super">% Super meta</label> <input id="tp-super" type="number" step="0.01"${attr("value", form.fix_super_meta)} class="vtur-input w-full" placeholder="-"/></div></div> <p class="text-xs text-slate-500">Percentuais fixos de comissão para este tipo de pacote. Deixe em branco para usar a regra geral.</p> <div><label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.ativo, true)} class="rounded border-slate-300"/> Tipo ativo</label></div></div>`);
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
