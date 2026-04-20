import { h as head, e as escape_html } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import "clsx";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import "../../../../../chunks/ui.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { L as Loader_circle } from "../../../../../chunks/loader-circle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let circuitos = [];
    let showDeleteDialog = false;
    let circuitoToDelete = null;
    async function confirmDelete() {
      return;
    }
    ({
      total: circuitos.length,
      ativos: circuitos.filter((c) => c.ativo).length,
      nacionais: circuitos.filter((c) => c.tipo === "nacional").length,
      internacionais: circuitos.filter((c) => c.tipo === "internacional").length,
      precoMedio: circuitos.length > 0 ? circuitos.reduce((acc, c) => acc + (c.preco_base || 0), 0) / circuitos.length : 0
    });
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("16ytxkc", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Circuitos | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Circuitos",
        subtitle: "Gerenciamento de roteiros e pacotes combinados",
        color: "financeiro",
        breadcrumbs: [
          { label: "Cadastros", href: "/cadastros" },
          { label: "Circuitos" }
        ],
        actions: [
          {
            label: "Novo Circuito",
            onClick: () => goto(),
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="flex items-center justify-center py-12">`);
        Loader_circle($$renderer3, { size: 48, class: "animate-spin text-financeiro-600" });
        $$renderer3.push(`<!----> <span class="ml-3 text-slate-600">Carregando circuitos...</span></div>`);
      }
      $$renderer3.push(`<!--]--> `);
      Dialog($$renderer3, {
        title: "Confirmar Exclusão",
        size: "sm",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Excluir",
        onConfirm: confirmDelete,
        onCancel: () => showDeleteDialog = false,
        get open() {
          return showDeleteDialog;
        },
        set open($$value) {
          showDeleteDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<p class="text-slate-600">Tem certeza que deseja excluir o circuito <strong>${escape_html(circuitoToDelete?.nome)}</strong>?
    Esta ação não pode ser desfeita.</p>`);
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
