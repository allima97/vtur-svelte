import { b as store_get, u as unsubscribe_stores, h as head, q as attr, t as ensure_array_like, e as escape_html, v as stringify } from "../../../../../chunks/index2.js";
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
    let canEdit;
    const SCOPE_OPTIONS = [
      { value: "system", label: "Sistema (todos)" },
      { value: "master", label: "Master" },
      { value: "gestor", label: "Gestor" },
      { value: "user", label: "Usuário" }
    ];
    const OCASIOES = [
      "Aniversário",
      "Natal",
      "Ano Novo",
      "Páscoa",
      "Dia das Mães",
      "Dia dos Pais",
      "Dia dos Namorados",
      "Dia do Cliente",
      "Cliente Premium",
      "Promoção Exclusiva",
      "Sugestão de Destino",
      "Upgrade VIP",
      "Boas-vindas",
      "Pós-viagem",
      "Outro"
    ];
    let templates = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let form = createForm();
    function createForm() {
      return {
        nome: "",
        categoria: "",
        titulo: "",
        corpo: "",
        scope: "user",
        ativo: true
      };
    }
    const columns = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "categoria",
        label: "Ocasião",
        sortable: true,
        formatter: (v) => v || "-"
      },
      {
        key: "scope",
        label: "Escopo",
        sortable: true,
        width: "110px",
        formatter: (v) => {
          const found = SCOPE_OPTIONS.find((s) => s.value === v);
          return found ? `<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">${found.label}</span>` : v;
        }
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
        const response = await fetch("/api/v1/admin/crm");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        templates = payload.templates || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar templates.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = createForm();
      modalOpen = true;
    }
    function openEdit(t) {
      editingId = t.id;
      form = {
        nome: t.nome,
        categoria: t.categoria || "",
        titulo: t.titulo,
        corpo: t.corpo,
        scope: t.scope,
        ativo: t.ativo
      };
      modalOpen = true;
    }
    async function save() {
      if (!form.nome.trim()) {
        toast.error("Nome obrigatório.");
        return;
      }
      if (!form.titulo.trim()) {
        toast.error("Título obrigatório.");
        return;
      }
      if (!form.corpo.trim()) {
        toast.error("Corpo obrigatório.");
        return;
      }
      saving = true;
      try {
        const response = await fetch("/api/v1/admin/crm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity: "template",
            action: "upsert",
            id: editingId || void 0,
            data: {
              nome: form.nome,
              categoria: form.categoria || null,
              titulo: form.titulo,
              corpo: form.corpo,
              scope: form.scope,
              ativo: form.ativo
            }
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Template atualizado." : "Template criado.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      } finally {
        saving = false;
      }
    }
    canEdit = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("parametros", "edit");
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("c4ouzu", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Avisos / CRM | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Avisos e Templates CRM",
        subtitle: "Gerencie os templates de mensagens para envio aos clientes por ocasião.",
        color: "financeiro",
        breadcrumbs: [
          { label: "Parâmetros", href: "/parametros" },
          { label: "Avisos / CRM" }
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
              label: "Novo Template",
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
        data: templates,
        color: "financeiro",
        loading,
        title: "Templates de mensagem",
        searchable: true,
        emptyMessage: "Nenhum template cadastrado",
        onRowClick: canEdit ? (row) => openEdit(row) : void 0,
        $$slots: {
          "row-actions": ($$renderer4, { row }) => {
            {
              if (canEdit) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<button class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir"${attr("disabled", deletingId === row.id, true)}>`);
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
        title: editingId ? "Editar Template" : "Novo Template",
        color: "financeiro",
        size: "lg",
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
          $$renderer4.push(`<div class="space-y-4"><div class="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="tpl-nome">Nome *</label> <input id="tpl-nome"${attr("value", form.nome)} class="vtur-input w-full" placeholder="Nome do template"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tpl-ocasiao">Ocasião</label> `);
          $$renderer4.select(
            {
              id: "tpl-ocasiao",
              value: form.categoria,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione...`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(OCASIOES);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let oc = each_array[$$index];
                $$renderer5.option({ value: oc }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(oc)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tpl-scope">Escopo</label> `);
          $$renderer4.select(
            {
              id: "tpl-scope",
              value: form.scope,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(SCOPE_OPTIONS);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let opt = each_array_1[$$index_1];
                $$renderer5.option({ value: opt.value }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(opt.label)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div class="flex items-end"><label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.ativo, true)} class="rounded border-slate-300"/> Template ativo</label></div></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tpl-titulo">Título *</label> <input id="tpl-titulo"${attr("value", form.titulo)} class="vtur-input w-full" placeholder="Título da mensagem"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tpl-corpo">Corpo *</label> <textarea id="tpl-corpo" rows="6" class="vtur-input w-full"${attr("placeholder", `Texto da mensagem. Use ${stringify({ nome_cliente })} para variáveis.`)}>`);
          const $$body = escape_html(form.corpo);
          if ($$body) {
            $$renderer4.push(`${$$body}`);
          }
          $$renderer4.push(`</textarea> <p class="mt-1 text-xs text-slate-500">Variáveis disponíveis: {{nome_cliente}}, {{primeiro_nome}}, {{consultor}}</p></div></div>`);
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
