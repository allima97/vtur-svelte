import { h as head, q as attr, e as escape_html } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const emptyTemplate = {
      id: "",
      nome: "",
      assunto: "",
      mensagem: "",
      ativo: true,
      sender_key: "avisos"
    };
    let loading = true;
    let saving = false;
    let deleting = false;
    let templates = [];
    let form = { ...emptyTemplate };
    const columns = [
      {
        key: "nome",
        label: "Template",
        sortable: true,
        formatter: (_value, row) => `
        <div>
          <p class="font-medium text-slate-900">${row.nome}</p>
          <p class="text-xs text-slate-500">${row.assunto}</p>
        </div>
      `
      },
      { key: "sender_key", label: "Remetente", sortable: true },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        formatter: (value) => value ? '<span class="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Ativo</span>' : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Inativo</span>'
      }
    ];
    async function loadPage() {
      loading = true;
      try {
        const response = await fetch("/api/v1/admin/avisos");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        templates = payload.items || [];
        if (!form.id && templates.length > 0) {
          form = { ...templates[0] };
        }
      } catch (err) {
        console.error(err);
        toast.error("Nao foi possivel carregar os templates de aviso.");
        templates = [];
      } finally {
        loading = false;
      }
    }
    function startNewTemplate() {
      form = { ...emptyTemplate };
    }
    head("afqoqj", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Avisos | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Avisos",
      subtitle: "Templates administrativos usados em disparos auxiliares do modulo de usuarios.",
      breadcrumbs: [
        { label: "Administracao", href: "/admin" },
        { label: "Avisos" }
      ],
      actions: [
        {
          label: "Atualizar",
          onClick: loadPage,
          variant: "secondary",
          icon: Refresh_cw
        },
        {
          label: "Novo template",
          onClick: startNewTemplate,
          variant: "primary",
          icon: Plus
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="space-y-6">`);
    DataTable($$renderer2, {
      title: "Templates cadastrados",
      color: "financeiro",
      loading,
      columns,
      data: templates,
      emptyMessage: "Nenhum template administrativo encontrado.",
      onRowClick: (row) => form = { ...row }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "financeiro",
      title: form.id ? `Editar template: ${form.nome}` : "Novo template",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="template-nome">Nome</label> <input id="template-nome"${attr("value", form.nome)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="template-remetente">Remetente</label> `);
        $$renderer3.select(
          {
            id: "template-remetente",
            value: form.sender_key,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "avisos" }, ($$renderer5) => {
              $$renderer5.push(`Avisos`);
            });
            $$renderer4.option({ value: "admin" }, ($$renderer5) => {
              $$renderer5.push(`Admin`);
            });
            $$renderer4.option({ value: "financeiro" }, ($$renderer5) => {
              $$renderer5.push(`Financeiro`);
            });
            $$renderer4.option({ value: "suporte" }, ($$renderer5) => {
              $$renderer5.push(`Suporte`);
            });
          }
        );
        $$renderer3.push(`</div> <div class="md:col-span-2"><label class="mb-1 block text-sm font-medium text-slate-700" for="template-assunto">Assunto</label> <input id="template-assunto"${attr("value", form.assunto)} class="vtur-input w-full"/></div> <div class="md:col-span-2"><label class="mb-1 block text-sm font-medium text-slate-700" for="template-mensagem">Mensagem</label> <textarea id="template-mensagem" rows="10" class="vtur-input w-full">`);
        const $$body = escape_html(form.mensagem);
        if ($$body) {
          $$renderer3.push(`${$$body}`);
        }
        $$renderer3.push(`</textarea> <p class="mt-2 text-xs text-slate-500">Variaveis disponiveis: <code>{{nome}}</code>, <code>{{email}}</code>, <code>{{empresa}}</code>.</p></div> <label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", form.ativo, true)}/> <div><p class="font-medium text-slate-900">Template ativo</p> <p class="text-sm text-slate-500">Disponivel para disparo no detalhe de usuario.</p></div></label></div> <div class="mt-6 flex flex-wrap gap-3">`);
        if (form.id) {
          $$renderer3.push("<!--[0-->");
          Button($$renderer3, {
            variant: "danger",
            loading: deleting,
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Excluir template`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        Button($$renderer3, {
          variant: "primary",
          color: "financeiro",
          loading: saving,
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Salvar template`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
