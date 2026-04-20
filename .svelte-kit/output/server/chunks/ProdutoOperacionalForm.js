import { f as fallback, m as bind_props, h as head, e as escape_html } from "./index2.js";
import { g as goto } from "./client.js";
import { P as PageHeader } from "./PageHeader.js";
import "clsx";
import { D as Dialog } from "./Dialog.js";
import { t as toast } from "./ui.js";
function ProdutoOperacionalForm($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let isCreateMode, routeBase, pageTitle, pageSubtitle;
    let mode = fallback($$props["mode"], "produtos");
    let produtoId = fallback($$props["produtoId"], null);
    let deleting = false;
    let showDeleteDialog = false;
    async function handleDelete() {
      if (!produtoId) return;
      deleting = true;
      try {
        const response = await fetch(`/api/v1/produtos/${produtoId}`, { method: "DELETE" });
        if (!response.ok) throw new Error(await response.text());
        toast.success("Registro excluído com sucesso.");
        goto(routeBase);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao excluir registro.");
      } finally {
        deleting = false;
        showDeleteDialog = false;
      }
    }
    isCreateMode = !produtoId;
    routeBase = mode === "destinos" ? "/cadastros/destinos" : "/cadastros/produtos";
    pageTitle = isCreateMode ? mode === "destinos" ? "Novo destino" : "Novo produto" : mode === "destinos" ? "Editar destino" : "Editar produto";
    pageSubtitle = isCreateMode ? "Cadastro operacional consumido por vendas, orçamentos e operação" : "Atualize o cadastro operacional completo do registro";
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("3hcc81", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(pageTitle)} | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: pageTitle,
        subtitle: pageSubtitle,
        color: "financeiro",
        breadcrumbs: [
          { label: "Cadastros", href: "/cadastros" },
          {
            label: mode === "destinos" ? "Destinos" : "Produtos",
            href: routeBase
          },
          { label: isCreateMode ? "Novo" : "Editar" }
        ]
      });
      $$renderer3.push(`<!----> `);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="flex justify-center py-12"><div class="h-12 w-12 animate-spin rounded-full border-b-2 border-financeiro-600"></div></div>`);
      }
      $$renderer3.push(`<!--]--> `);
      Dialog($$renderer3, {
        title: "Excluir cadastro",
        size: "sm",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: deleting ? "Excluindo..." : "Excluir",
        onConfirm: handleDelete,
        onCancel: () => showDeleteDialog = false,
        get open() {
          return showDeleteDialog;
        },
        set open($$value) {
          showDeleteDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<p class="text-slate-600">Tem certeza que deseja excluir este registro? Se houver vínculos com vendas, orçamentos ou operação, a exclusão pode ser bloqueada pelo banco.</p>`);
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
    bind_props($$props, { mode, produtoId });
  });
}
export {
  ProdutoOperacionalForm as P
};
