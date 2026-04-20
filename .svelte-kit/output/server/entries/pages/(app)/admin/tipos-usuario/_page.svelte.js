import { h as head } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let loading = true;
    let rows = [];
    const columns = [
      {
        key: "nome",
        label: "Tipo de usuario",
        sortable: true,
        formatter: (_value, row) => `
        <div>
          <p class="font-medium text-slate-900">${row.nome}</p>
          <p class="text-xs text-slate-500">${row.descricao || "Sem descricao"}</p>
        </div>
      `
      },
      { key: "usuarios", label: "Usuarios", sortable: true },
      {
        key: "permissoes_padrao",
        label: "Permissoes padrao",
        sortable: true
      }
    ];
    async function loadPage() {
      loading = true;
      try {
        const response = await fetch("/api/v1/admin/tipos-usuario");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        rows = payload.items || [];
      } catch (err) {
        console.error(err);
        toast.error("Nao foi possivel carregar os tipos de usuario.");
      } finally {
        loading = false;
      }
    }
    head("1vqlf2w", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Tipos de usuario | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Tipos de usuario",
      subtitle: "Perfis administrativos com permissoes padrao aplicadas a novos usuarios.",
      breadcrumbs: [
        { label: "Administracao", href: "/admin" },
        { label: "Tipos de usuario" }
      ],
      actions: [
        {
          label: "Atualizar",
          onClick: loadPage,
          variant: "secondary",
          icon: Refresh_cw
        },
        {
          label: "Novo tipo",
          href: "/admin/tipos-usuario/novo",
          variant: "primary",
          icon: Plus
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="space-y-6">`);
    Card($$renderer2, {
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="text-sm text-slate-600">Cada tipo concentra as permissoes default copiadas para o \`modulo_acesso\` quando um usuario
      novo e vinculado ao perfil correspondente.</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    DataTable($$renderer2, {
      title: "Perfis cadastrados",
      color: "financeiro",
      loading,
      columns,
      data: rows,
      emptyMessage: "Nenhum tipo de usuario encontrado.",
      onRowClick: (row) => goto(`/admin/tipos-usuario/${row.id}`)
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
