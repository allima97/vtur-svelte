import { f as fallback, m as bind_props, h as head, e as escape_html } from "./index2.js";
import { g as goto } from "./client.js";
import { P as PageHeader } from "./PageHeader.js";
import "clsx";
import { D as Dialog } from "./Dialog.js";
import { t as toast } from "./ui.js";
function FornecedorForm($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let isCreateMode, title;
    let fornecedorId = fallback($$props["fornecedorId"], null);
    let deleting = false;
    let showDeleteDialog = false;
    async function handleDelete() {
      if (!fornecedorId) return;
      deleting = true;
      try {
        const response = await fetch(`/api/v1/fornecedores/${fornecedorId}`, { method: "DELETE" });
        if (!response.ok) throw new Error(await response.text());
        toast.success("Fornecedor excluído com sucesso.");
        goto("/cadastros/fornecedores");
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "Erro ao excluir fornecedor.");
      } finally {
        deleting = false;
        showDeleteDialog = false;
      }
    }
    isCreateMode = !fornecedorId;
    title = isCreateMode ? "Novo fornecedor" : "Editar fornecedor";
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1wv6m1o", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(title)} | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title,
        subtitle: "Centralize contato, faturamento, localização e serviços do parceiro em um único cadastro",
        color: "financeiro",
        breadcrumbs: [
          { label: "Cadastros", href: "/cadastros" },
          { label: "Fornecedores", href: "/cadastros/fornecedores" },
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
        title: "Excluir fornecedor",
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
          $$renderer4.push(`<p class="text-slate-600">Tem certeza que deseja excluir este fornecedor? Se houver produtos vinculados, a exclusão será bloqueada.</p>`);
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
    bind_props($$props, { fornecedorId });
  });
}
export {
  FornecedorForm as F
};
