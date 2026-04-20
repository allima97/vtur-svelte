import { b as store_get, u as unsubscribe_stores, h as head, e as escape_html, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { p as permissoes } from "../../../../../chunks/permissoes.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { M as Megaphone } from "../../../../../chunks/megaphone.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let canEdit, ativas, vencidas;
    let campanhas = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let filtroStatus = "";
    let form = createForm();
    function createForm() {
      return {
        titulo: "",
        imagem_url: "",
        link_url: "",
        link_instagram: "",
        link_facebook: "",
        data_campanha: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        validade_ate: "",
        regras: "",
        status: "ativa"
      };
    }
    function getStatusBadge(status) {
      const styles = {
        ativa: "bg-green-100 text-green-700",
        inativa: "bg-slate-100 text-slate-600",
        cancelada: "bg-red-100 text-red-700"
      };
      const labels = { ativa: "Ativa", inativa: "Inativa", cancelada: "Cancelada" };
      return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-600"}">${labels[status] || status}</span>`;
    }
    const columns = [
      { key: "titulo", label: "Título", sortable: true },
      {
        key: "data_campanha",
        label: "Data",
        sortable: true,
        width: "110px",
        formatter: (v) => v ? (/* @__PURE__ */ new Date(v + "T00:00:00")).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "validade_ate",
        label: "Válida até",
        sortable: true,
        width: "110px",
        formatter: (v) => {
          if (!v) return "-";
          const d = /* @__PURE__ */ new Date(v + "T00:00:00");
          const hoje = /* @__PURE__ */ new Date();
          const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1e3 * 60 * 60 * 24));
          const label = d.toLocaleDateString("pt-BR");
          if (diff < 0) return `<span class="text-red-600">${label}</span>`;
          if (diff <= 3) return `<span class="text-amber-600">${label}</span>`;
          return label;
        }
      },
      {
        key: "link_url",
        label: "Link",
        sortable: false,
        width: "80px",
        formatter: (v) => v ? `<a href="${v}" target="_blank" class="text-financeiro-600 hover:underline text-xs">Abrir</a>` : "-"
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "100px",
        formatter: (v) => getStatusBadge(v)
      }
    ];
    async function load() {
      loading = true;
      try {
        const params = new URLSearchParams();
        if (filtroStatus) ;
        const response = await fetch(`/api/v1/operacao/campanhas?${params.toString()}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        campanhas = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar campanhas.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = createForm();
      modalOpen = true;
    }
    function openEdit(c) {
      editingId = c.id;
      form = {
        titulo: c.titulo,
        imagem_url: c.imagem_url || "",
        link_url: c.link_url || "",
        link_instagram: c.link_instagram || "",
        link_facebook: c.link_facebook || "",
        data_campanha: c.data_campanha,
        validade_ate: c.validade_ate || "",
        regras: c.regras || "",
        status: c.status
      };
      modalOpen = true;
    }
    async function save() {
      if (!form.titulo.trim()) {
        toast.error("Título obrigatório.");
        return;
      }
      if (!form.data_campanha) {
        toast.error("Data obrigatória.");
        return;
      }
      saving = true;
      try {
        const response = await fetch("/api/v1/operacao/campanhas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId || void 0, ...form })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Campanha atualizada." : "Campanha criada.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      } finally {
        saving = false;
      }
    }
    canEdit = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || store_get($$store_subs ??= {}, "$permissoes", permissoes).isMaster || store_get($$store_subs ??= {}, "$permissoes", permissoes).isGestor;
    ativas = campanhas.filter((c) => c.status === "ativa").length;
    vencidas = campanhas.filter((c) => c.validade_ate && /* @__PURE__ */ new Date(c.validade_ate + "T00:00:00") < /* @__PURE__ */ new Date()).length;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1ea20vb", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Campanhas | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Campanhas",
        subtitle: "Gerencie campanhas promocionais com imagens, links e regras de validade.",
        color: "operacao",
        breadcrumbs: [
          { label: "Operação", href: "/operacao" },
          { label: "Campanhas" }
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
              label: "Nova Campanha",
              onClick: openNew,
              variant: "primary",
              icon: Plus
            }
          ] : []
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
      Megaphone($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total</p> <p class="text-2xl font-bold text-slate-900">${escape_html(campanhas.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
      Megaphone($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Ativas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(ativas)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
      Megaphone($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Vencidas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(vencidas)}</p></div></div></div> `);
      Card($$renderer3, {
        color: "operacao",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="flex gap-4 items-end"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="camp-status">Status</label> `);
          $$renderer4.select({ id: "camp-status", value: filtroStatus, class: "vtur-input" }, ($$renderer5) => {
            $$renderer5.option({ value: "" }, ($$renderer6) => {
              $$renderer6.push(`Todos`);
            });
            $$renderer5.option({ value: "ativa" }, ($$renderer6) => {
              $$renderer6.push(`Ativas`);
            });
            $$renderer5.option({ value: "inativa" }, ($$renderer6) => {
              $$renderer6.push(`Inativas`);
            });
            $$renderer5.option({ value: "cancelada" }, ($$renderer6) => {
              $$renderer6.push(`Canceladas`);
            });
          });
          $$renderer4.push(`</div> `);
          Button($$renderer4, {
            variant: "primary",
            size: "sm",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Filtrar`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      DataTable($$renderer3, {
        columns,
        data: campanhas,
        color: "operacao",
        loading,
        title: "Campanhas",
        searchable: true,
        emptyMessage: "Nenhuma campanha encontrada",
        onRowClick: canEdit ? (row) => openEdit(row) : void 0,
        $$slots: {
          "row-actions": ($$renderer4, { row }) => {
            {
              if (canEdit) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<button class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir"${attr("disabled", deletingId === row.id, true)}>`);
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
        title: editingId ? "Editar Campanha" : "Nova Campanha",
        color: "operacao",
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
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="camp-titulo">Título *</label> <input id="camp-titulo"${attr("value", form.titulo)} class="vtur-input w-full" placeholder="Título da campanha"/></div> <div class="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="camp-data">Data da Campanha *</label> <input id="camp-data" type="date"${attr("value", form.data_campanha)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="camp-validade">Válida até</label> <input id="camp-validade" type="date"${attr("value", form.validade_ate)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="camp-status-form">Status</label> `);
          $$renderer4.select(
            {
              id: "camp-status-form",
              value: form.status,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "ativa" }, ($$renderer6) => {
                $$renderer6.push(`Ativa`);
              });
              $$renderer5.option({ value: "inativa" }, ($$renderer6) => {
                $$renderer6.push(`Inativa`);
              });
              $$renderer5.option({ value: "cancelada" }, ($$renderer6) => {
                $$renderer6.push(`Cancelada`);
              });
            }
          );
          $$renderer4.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="camp-imagem">URL da Imagem</label> <input id="camp-imagem"${attr("value", form.imagem_url)} class="vtur-input w-full" placeholder="https://..."/></div></div> <div class="grid grid-cols-1 gap-4 md:grid-cols-3"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="camp-link">Link principal</label> <input id="camp-link"${attr("value", form.link_url)} class="vtur-input w-full" placeholder="https://..."/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="camp-instagram">Instagram</label> <input id="camp-instagram"${attr("value", form.link_instagram)} class="vtur-input w-full" placeholder="https://instagram.com/..."/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="camp-facebook">Facebook</label> <input id="camp-facebook"${attr("value", form.link_facebook)} class="vtur-input w-full" placeholder="https://facebook.com/..."/></div></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="camp-regras">Regras / Condições</label> <textarea id="camp-regras" rows="4" class="vtur-input w-full" placeholder="Condições e regras da campanha...">`);
          const $$body = escape_html(form.regras);
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
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
