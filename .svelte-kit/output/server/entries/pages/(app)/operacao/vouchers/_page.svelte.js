import { h as head, e as escape_html, q as attr } from "../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { V as VoucherPreviewModal, a as VoucherEditorModal } from "../../../../../chunks/VoucherPreviewModal.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { T as Ticket } from "../../../../../chunks/ticket.js";
import { F as File_text } from "../../../../../chunks/file-text.js";
import { S as Search } from "../../../../../chunks/search.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let filteredVouchers;
    let vouchers = [];
    let assets = [];
    let loading = true;
    let searchQuery = "";
    let showEditor = false;
    let showPreview = false;
    let previewVoucher = null;
    let editingVoucher = null;
    let companyId = null;
    let deleteConfirmVoucher = null;
    let showDeleteDialog = false;
    const columns = [
      { key: "nome", label: "Nome", sortable: true },
      {
        key: "provider",
        label: "Fornecedor",
        sortable: true,
        width: "140px",
        formatter: (v) => {
          const labels = { special_tours: "Special Tours", europamundo: "Europamundo" };
          const colors = {
            special_tours: "bg-blue-100 text-blue-700",
            europamundo: "bg-orange-100 text-orange-700"
          };
          return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[v]}">${labels[v] || v}</span>`;
        }
      },
      {
        key: "codigo_fornecedor",
        label: "Código",
        sortable: true,
        width: "120px"
      },
      {
        key: "data_inicio",
        label: "Data Início",
        sortable: true,
        width: "120px",
        formatter: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "data_fim",
        label: "Data Fim",
        sortable: true,
        width: "120px",
        formatter: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "100px",
        formatter: (v) => v ? '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Ativo</span>' : '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Inativo</span>'
      }
    ];
    async function loadData() {
      return;
    }
    function handleRowClick(row) {
      console.log("[Vouchers] Clique no voucher:", row.nome, row.id);
      previewVoucher = row;
      showPreview = true;
      console.log("[Vouchers] showPreview:", showPreview, "previewVoucher:", previewVoucher);
    }
    function handleNew() {
      editingVoucher = null;
      showEditor = true;
    }
    async function handleDelete() {
      if (!deleteConfirmVoucher) return;
      try {
        const response = await fetch(`/api/v1/vouchers/${deleteConfirmVoucher.id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Erro ao excluir");
        toast.success("Voucher excluído!");
        deleteConfirmVoucher = null;
        await loadData();
      } catch (err) {
        toast.error("Erro ao excluir voucher");
      }
    }
    showDeleteDialog = !!deleteConfirmVoucher;
    filteredVouchers = vouchers.filter((v) => {
      return true;
    });
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1tkh2ug", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Vouchers | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Vouchers",
        subtitle: "Gerenciamento de vouchers Special Tours e Europamundo",
        color: "clientes",
        breadcrumbs: [
          { label: "Operação", href: "/operacao" },
          { label: "Vouchers" }
        ],
        actions: [
          {
            label: "Novo Voucher",
            onClick: handleNew,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
      Ticket($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total</p> <p class="text-2xl font-bold text-slate-900">${escape_html(vouchers.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
      Ticket($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Special Tours</p> <p class="text-2xl font-bold text-slate-900">${escape_html(vouchers.filter((v) => v.provider === "special_tours").length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
      Ticket($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Europamundo</p> <p class="text-2xl font-bold text-slate-900">${escape_html(vouchers.filter((v) => v.provider === "europamundo").length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
      File_text($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Ativos</p> <p class="text-2xl font-bold text-slate-900">${escape_html(vouchers.filter((v) => v.ativo).length)}</p></div></div></div> `);
      Card($$renderer3, {
        color: "clientes",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="flex gap-4"><div class="relative flex-1 max-w-md">`);
          Search($$renderer4, {
            size: 18,
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          });
          $$renderer4.push(`<!----> <input type="text" placeholder="Buscar vouchers..."${attr("value", searchQuery)} class="vtur-input pl-10 w-full"/></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      DataTable($$renderer3, {
        columns,
        data: filteredVouchers,
        color: "clientes",
        loading,
        title: "Lista de Vouchers",
        searchable: false,
        onRowClick: handleRowClick,
        emptyMessage: "Nenhum voucher encontrado",
        $$slots: {
          "row-actions": ($$renderer4, { row }) => {
            {
              $$renderer4.push(`<div class="flex items-center gap-1"><button class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">`);
              Trash_2($$renderer4, { size: 16 });
              $$renderer4.push(`<!----></button></div>`);
            }
          }
        }
      });
      $$renderer3.push(`<!----> `);
      VoucherPreviewModal($$renderer3, {
        voucher: previewVoucher,
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
      VoucherEditorModal($$renderer3, {
        voucher: editingVoucher,
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
      Dialog($$renderer3, {
        title: "Confirmar Exclusão",
        color: "danger",
        confirmText: "Excluir",
        cancelText: "Cancelar",
        onConfirm: handleDelete,
        onCancel: () => deleteConfirmVoucher = null,
        get open() {
          return showDeleteDialog;
        },
        set open($$value) {
          showDeleteDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<p class="text-slate-600">Tem certeza que deseja excluir o voucher <strong>${escape_html(deleteConfirmVoucher?.nome)}</strong>?
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
