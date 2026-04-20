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
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let form = createForm();
    function createForm() {
      return {
        nome: "",
        tipo: "servico",
        descricao: "",
        ativo: true,
        soma_na_meta: true,
        regra_comissionamento: "padrao",
        usa_meta_produto: false,
        meta_produto_valor: "",
        comissao_produto_meta_pct: "",
        descontar_meta_geral: false,
        exibe_kpi_comissao: true
      };
    }
    const TIPOS = [
      { value: "servico", label: "Serviço" },
      { value: "pacote", label: "Pacote" },
      { value: "hotel", label: "Hotel" },
      { value: "aereo", label: "Aéreo" },
      { value: "seguro", label: "Seguro" },
      { value: "transfer", label: "Transfer" },
      { value: "cruzeiro", label: "Cruzeiro" },
      { value: "outro", label: "Outro" }
    ];
    const REGRAS = [
      { value: "padrao", label: "Padrão" },
      { value: "fixo", label: "Fixo" },
      { value: "nao_comissionavel", label: "Não comissionável" }
    ];
    const columns = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "tipo",
        label: "Tipo",
        sortable: true,
        width: "120px",
        formatter: (value) => {
          const found = TIPOS.find((t) => t.value === value);
          return found ? found.label : value;
        }
      },
      {
        key: "soma_na_meta",
        label: "Soma na meta",
        sortable: true,
        width: "120px",
        formatter: (value) => value ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Sim</span>' : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Não</span>'
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "100px",
        formatter: (value) => value ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Ativo</span>' : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inativo</span>'
      }
    ];
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/tipo-produtos?all=1");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        tipos = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar tipos de produto.");
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
        nome: tipo.nome || "",
        tipo: tipo.tipo || "servico",
        descricao: tipo.descricao || "",
        ativo: tipo.ativo,
        soma_na_meta: tipo.soma_na_meta,
        regra_comissionamento: tipo.regra_comissionamento || "padrao",
        usa_meta_produto: Boolean(tipo.usa_meta_produto),
        meta_produto_valor: tipo.meta_produto_valor != null ? String(tipo.meta_produto_valor) : "",
        comissao_produto_meta_pct: tipo.comissao_produto_meta_pct != null ? String(tipo.comissao_produto_meta_pct) : "",
        descontar_meta_geral: Boolean(tipo.descontar_meta_geral),
        exibe_kpi_comissao: tipo.exibe_kpi_comissao !== false
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
        const toNum = (v) => String(v).trim() === "" ? null : Number(v);
        const response = await fetch("/api/v1/tipo-produtos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId || void 0,
            nome: form.nome.trim(),
            tipo: form.tipo,
            descricao: form.descricao || null,
            ativo: form.ativo,
            soma_na_meta: form.soma_na_meta,
            regra_comissionamento: form.regra_comissionamento,
            usa_meta_produto: form.usa_meta_produto,
            meta_produto_valor: toNum(form.meta_produto_valor),
            comissao_produto_meta_pct: toNum(form.comissao_produto_meta_pct),
            descontar_meta_geral: form.descontar_meta_geral,
            exibe_kpi_comissao: form.exibe_kpi_comissao
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Tipo de produto atualizado." : "Tipo de produto criado.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar tipo de produto.");
      } finally {
        saving = false;
      }
    }
    canEdit = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("parametros", "edit");
    canDelete = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("parametros", "admin");
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("ti1b18", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Tipos de Produto | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Tipos de Produto",
        subtitle: "Gerencie os tipos de produto utilizados nos recibos e no comissionamento.",
        color: "financeiro",
        breadcrumbs: [
          { label: "Parâmetros", href: "/parametros" },
          { label: "Tipos de Produto" }
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
        title: "Tipos de produto",
        searchable: true,
        emptyMessage: "Nenhum tipo de produto cadastrado",
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
        title: editingId ? "Editar Tipo de Produto" : "Novo Tipo de Produto",
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
          $$renderer4.push(`<div class="space-y-4"><div class="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-nome">Nome *</label> <input id="tprod-nome"${attr("value", form.nome)} class="vtur-input w-full" placeholder="Ex: Pacote Aéreo + Hotel"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-tipo">Tipo</label> `);
          $$renderer4.select(
            {
              id: "tprod-tipo",
              value: form.tipo,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(TIPOS);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let t = each_array[$$index];
                $$renderer5.option({ value: t.value }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(t.label)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-descricao">Descrição</label> <input id="tprod-descricao"${attr("value", form.descricao)} class="vtur-input w-full" placeholder="Descrição opcional"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-regra">Regra de comissionamento</label> `);
          $$renderer4.select(
            {
              id: "tprod-regra",
              value: form.regra_comissionamento,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(REGRAS);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let r = each_array_1[$$index_1];
                $$renderer5.option({ value: r.value }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(r.label)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.soma_na_meta, true)} class="rounded border-slate-300"/> Soma na meta</label> <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.exibe_kpi_comissao, true)} class="rounded border-slate-300"/> Exibe KPI de comissão</label> <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.usa_meta_produto, true)} class="rounded border-slate-300"/> Usa meta de produto</label> <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.descontar_meta_geral, true)} class="rounded border-slate-300"/> Descontar da meta geral</label></div> `);
          if (form.usa_meta_produto) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-meta-valor">Meta do produto (R$)</label> <input id="tprod-meta-valor" type="number" step="0.01"${attr("value", form.meta_produto_valor)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-comissao-pct">% Comissão produto</label> <input id="tprod-comissao-pct" type="number" step="0.01"${attr("value", form.comissao_produto_meta_pct)} class="vtur-input w-full"/></div></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <div><label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.ativo, true)} class="rounded border-slate-300"/> Tipo ativo</label></div></div>`);
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
