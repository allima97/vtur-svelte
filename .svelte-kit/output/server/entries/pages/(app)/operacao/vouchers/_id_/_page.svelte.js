import { h as head, e as escape_html } from "../../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../../chunks/PageHeader.js";
import "clsx";
import { a as VoucherEditorModal, V as VoucherPreviewModal } from "../../../../../../chunks/VoucherPreviewModal.js";
import "../../../../../../chunks/ui.js";
import { D as Dialog } from "../../../../../../chunks/Dialog.js";
import { A as Arrow_left } from "../../../../../../chunks/arrow-left.js";
import { L as Loader_circle } from "../../../../../../chunks/loader-circle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let voucher = null;
    let assets = [];
    let showDeleteDialog = false;
    let showEditor = false;
    let showPreview = false;
    let companyId = null;
    async function excluirVoucher() {
      return;
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("rotp5c", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html("Detalhes do Voucher")} | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Detalhes do Voucher",
        subtitle: "Carregando...",
        color: "clientes",
        breadcrumbs: [
          { label: "Operação", href: "/operacao" },
          { label: "Vouchers", href: "/operacao/vouchers" },
          { label: "Detalhes" }
        ],
        actions: [
          {
            label: "Voltar",
            href: "/operacao/vouchers",
            variant: "secondary",
            icon: Arrow_left
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="flex items-center justify-center py-20">`);
        Loader_circle($$renderer3, { size: 48, class: "animate-spin text-clientes-600" });
        $$renderer3.push(`<!----> <span class="ml-3 text-slate-600">Carregando voucher...</span></div>`);
      }
      $$renderer3.push(`<!--]--> `);
      VoucherEditorModal($$renderer3, {
        voucher,
        companyId,
        assets,
        get open() {
          return showEditor;
        },
        set open($$value) {
          showEditor = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----> `);
      VoucherPreviewModal($$renderer3, {
        voucher,
        assets,
        get open() {
          return showPreview;
        },
        set open($$value) {
          showPreview = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Confirmar Exclusão",
        color: "danger",
        confirmText: "Excluir",
        cancelText: "Cancelar",
        onConfirm: excluirVoucher,
        onCancel: () => showDeleteDialog = false,
        get open() {
          return showDeleteDialog;
        },
        set open($$value) {
          showDeleteDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<p class="text-slate-600">Tem certeza que deseja excluir o voucher <strong>${escape_html(voucher?.nome)}</strong>? 
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
