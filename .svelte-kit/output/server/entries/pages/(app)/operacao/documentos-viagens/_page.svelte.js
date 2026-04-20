import { b as store_get, h as head, u as unsubscribe_stores, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { p as permissoes } from "../../../../../chunks/permissoes.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { S as Search } from "../../../../../chunks/search.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
import { F as File_text } from "../../../../../chunks/file-text.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let canDelete;
    let documentos = [];
    let loading = true;
    let deletingId = "";
    let busca = "";
    function formatBytes(bytes) {
      const n = Number(bytes);
      if (!Number.isFinite(n) || n <= 0) return "-";
      const units = ["B", "KB", "MB", "GB"];
      let idx = 0;
      let val = n;
      while (val >= 1024 && idx < units.length - 1) {
        val /= 1024;
        idx++;
      }
      return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
    }
    const columns = [
      {
        key: "display_name",
        label: "Nome",
        sortable: true,
        formatter: (v, row) => {
          const nome = v || row.file_name;
          const titulo = row.title ? `<div class="text-xs text-slate-500">${row.title}</div>` : "";
          return `<div><div class="font-medium text-slate-900">${nome}</div>${titulo}</div>`;
        }
      },
      {
        key: "mime_type",
        label: "Tipo",
        sortable: true,
        width: "120px",
        formatter: (v) => {
          if (!v) return "-";
          if (v.includes("pdf")) return '<span class="text-red-600 text-xs font-medium">PDF</span>';
          if (v.includes("word") || v.includes("document")) return '<span class="text-blue-600 text-xs font-medium">Word</span>';
          if (v.includes("text")) return '<span class="text-slate-600 text-xs font-medium">Texto</span>';
          return `<span class="text-xs text-slate-500">${v.split("/")[1] || v}</span>`;
        }
      },
      {
        key: "size_bytes",
        label: "Tamanho",
        sortable: true,
        width: "100px",
        formatter: (v) => formatBytes(v)
      },
      {
        key: "created_at",
        label: "Enviado em",
        sortable: true,
        width: "130px",
        formatter: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "uploader",
        label: "Por",
        sortable: false,
        formatter: (_, row) => row.uploader?.nome_completo || row.uploader?.email || "-"
      }
    ];
    async function load() {
      loading = true;
      try {
        const params = new URLSearchParams();
        if (busca.trim()) params.set("q", busca.trim());
        const response = await fetch(`/api/v1/operacao/documentos-viagens?${params.toString()}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        documentos = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar documentos.");
      } finally {
        loading = false;
      }
    }
    canDelete = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("documentos_viagens", "delete") || permissoes.can("operacao", "delete");
    head("1bzyv1i", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Documentos de Viagens | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Documentos de Viagens",
      subtitle: "Biblioteca de documentos e templates para uso nas viagens dos clientes.",
      color: "operacao",
      breadcrumbs: [
        { label: "Operação", href: "/operacao" },
        { label: "Documentos de Viagens" }
      ],
      actions: [
        {
          label: "Atualizar",
          onClick: load,
          variant: "secondary",
          icon: Refresh_cw
        }
      ]
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "operacao",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex gap-4 items-end"><div class="relative flex-1 max-w-sm">`);
        Search($$renderer3, {
          size: 16,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer3.push(`<!----> <input${attr("value", busca)} class="vtur-input w-full pl-9" placeholder="Buscar documentos..."/></div> `);
        Button($$renderer3, {
          variant: "primary",
          size: "sm",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Buscar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    DataTable($$renderer2, {
      columns,
      data: documentos,
      color: "operacao",
      loading,
      title: "Documentos disponíveis",
      searchable: false,
      emptyMessage: "Nenhum documento encontrado",
      $$slots: {
        "row-actions": ($$renderer3, { row }) => {
          {
            $$renderer3.push(`<div class="flex items-center gap-1">`);
            if (canDelete) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<button class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir"${attr("disabled", deletingId === row.id, true)}>`);
              Trash_2($$renderer3, { size: 15 });
              $$renderer3.push(`<!----></button>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--></div>`);
          }
        }
      }
    });
    $$renderer2.push(`<!----> `);
    if (documentos.length === 0 && !loading) {
      $$renderer2.push("<!--[0-->");
      Card($$renderer2, {
        color: "operacao",
        class: "mt-6",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="flex flex-col items-center justify-center py-12 text-slate-500">`);
          File_text($$renderer3, { size: 48, class: "mb-4 opacity-30" });
          $$renderer3.push(`<!----> <p class="font-medium">Nenhum documento cadastrado.</p> <p class="mt-1 text-sm">Os documentos são enviados via API ou pelo sistema legado.</p></div>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
