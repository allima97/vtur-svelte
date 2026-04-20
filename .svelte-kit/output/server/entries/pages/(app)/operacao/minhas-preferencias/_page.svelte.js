import { h as head, q as attr, t as ensure_array_like, e as escape_html } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
import { S as Search } from "../../../../../chunks/search.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let preferencias = [];
    let tipos = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let cidadeBusca = "";
    let cidadeResultados = [];
    let form = createForm();
    function createForm() {
      return {
        tipo_produto_id: "",
        cidade_id: "",
        cidade_nome: "",
        nome: "",
        localizacao: "",
        classificacao: "",
        observacao: ""
      };
    }
    const CLASSIFICACOES = ["A", "B", "C", "D", "E"];
    const columns = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "tipo_produto",
        label: "Tipo",
        sortable: false,
        formatter: (_, row) => row.tipo_produto?.nome || "-"
      },
      {
        key: "cidade",
        label: "Cidade",
        sortable: false,
        formatter: (_, row) => row.cidade?.nome || "-"
      },
      {
        key: "localizacao",
        label: "Localização",
        sortable: true,
        formatter: (v) => v || "-"
      },
      {
        key: "classificacao",
        label: "Classif.",
        sortable: true,
        width: "90px",
        formatter: (v) => v ? `<span class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">${v}</span>` : "-"
      }
    ];
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/operacao/preferencias");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        preferencias = payload.items || [];
        tipos = payload.tipos || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar preferências.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = createForm();
      cidadeBusca = "";
      cidadeResultados = [];
      modalOpen = true;
    }
    function openEdit(p) {
      editingId = p.id;
      form = {
        tipo_produto_id: p.tipo_produto_id || "",
        cidade_id: p.cidade_id || "",
        cidade_nome: p.cidade?.nome || "",
        nome: p.nome,
        localizacao: p.localizacao || "",
        classificacao: p.classificacao || "",
        observacao: p.observacao || ""
      };
      cidadeBusca = p.cidade?.nome || "";
      cidadeResultados = [];
      modalOpen = true;
    }
    async function save() {
      if (!form.nome.trim()) {
        toast.error("Nome obrigatório.");
        return;
      }
      saving = true;
      try {
        const response = await fetch("/api/v1/operacao/preferencias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId || void 0,
            tipo_produto_id: form.tipo_produto_id || null,
            cidade_id: form.cidade_id || null,
            nome: form.nome,
            localizacao: form.localizacao || null,
            classificacao: form.classificacao || null,
            observacao: form.observacao || null
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Preferência atualizada." : "Preferência criada.");
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
      head("8gfqsr", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Minhas Preferências | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Minhas Preferências",
        subtitle: "Cadastre seus destinos e produtos favoritos para agilizar a criação de orçamentos.",
        color: "operacao",
        breadcrumbs: [
          { label: "Operação", href: "/operacao" },
          { label: "Minhas Preferências" }
        ],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          },
          {
            label: "Nova Preferência",
            onClick: openNew,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      DataTable($$renderer3, {
        columns,
        data: preferencias,
        color: "operacao",
        loading,
        title: "Preferências cadastradas",
        searchable: true,
        emptyMessage: "Nenhuma preferência cadastrada",
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
        title: editingId ? "Editar Preferência" : "Nova Preferência",
        color: "operacao",
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
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="pref-nome">Nome *</label> <input id="pref-nome"${attr("value", form.nome)} class="vtur-input w-full" placeholder="Ex: Hotel Copacabana Palace"/></div> <div class="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="pref-tipo">Tipo de Produto</label> `);
          $$renderer4.select(
            {
              id: "pref-tipo",
              value: form.tipo_produto_id,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione...`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(tipos);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let t = each_array[$$index];
                $$renderer5.option({ value: t.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(t.nome)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="pref-classificacao">Classificação</label> `);
          $$renderer4.select(
            {
              id: "pref-classificacao",
              value: form.classificacao,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Selecione...`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(CLASSIFICACOES);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let c = each_array_1[$$index_1];
                $$renderer5.option({ value: c }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(c)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div></div> <div class="relative"><label class="mb-1 block text-sm font-medium text-slate-700" for="pref-cidade">Cidade</label> <div class="relative">`);
          Search($$renderer4, {
            size: 16,
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          });
          $$renderer4.push(`<!----> <input id="pref-cidade"${attr("value", cidadeBusca)} class="vtur-input w-full pl-9" placeholder="Buscar cidade..."/></div> `);
          if (cidadeResultados.length > 0) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg"><!--[-->`);
            const each_array_2 = ensure_array_like(cidadeResultados);
            for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
              let cidade = each_array_2[$$index_2];
              $$renderer4.push(`<button type="button" class="w-full px-3 py-2 text-left text-sm hover:bg-slate-50">${escape_html(cidade.nome)}`);
              if (cidade.subdivisao_nome) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`, ${escape_html(cidade.subdivisao_nome)}`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></button>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="pref-localizacao">Localização</label> <input id="pref-localizacao"${attr("value", form.localizacao)} class="vtur-input w-full" placeholder="Endereço, bairro, referência..."/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="pref-obs">Observação</label> <textarea id="pref-obs" rows="3" class="vtur-input w-full" placeholder="Notas sobre este destino/produto...">`);
          const $$body = escape_html(form.observacao);
          if ($$body) {
            $$renderer4.push(`${$$body}`);
          }
          $$renderer4.push(`</textarea></div></div>`);
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
