import { b as store_get, u as unsubscribe_stores, h as head, e as escape_html, q as attr, t as ensure_array_like } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { p as permissoes } from "../../../../../chunks/permissoes.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { C as Circle_alert } from "../../../../../chunks/circle-alert.js";
import { C as Clock } from "../../../../../chunks/clock.js";
import { C as Circle_check_big } from "../../../../../chunks/circle-check-big.js";
import { S as Search } from "../../../../../chunks/search.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let canEdit, canDelete, abertos, emAndamento, concluidos;
    const STATUS_OPCOES = [
      { value: "aberto", label: "Aberto" },
      { value: "em_andamento", label: "Em andamento" },
      { value: "concluido", label: "Concluído" },
      { value: "cancelado", label: "Cancelado" }
    ];
    let registros = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let deletingId = "";
    let editingId = null;
    let statusFiltro = "all";
    let busca = "";
    let form = createForm();
    function createForm() {
      return {
        recibo: "",
        tour: "",
        data_solicitacao: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        motivo: "",
        contratante_pax: "",
        ok_quando: "",
        status: "aberto",
        responsavel: "",
        prazo: ""
      };
    }
    function getStatusBadge(status) {
      const styles = {
        aberto: "bg-red-100 text-red-700",
        em_andamento: "bg-amber-100 text-amber-700",
        concluido: "bg-green-100 text-green-700",
        cancelado: "bg-slate-100 text-slate-600"
      };
      const labels = {
        aberto: "Aberto",
        em_andamento: "Em andamento",
        concluido: "Concluído",
        cancelado: "Cancelado"
      };
      const s = status || "aberto";
      return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[s] || "bg-slate-100 text-slate-600"}">${labels[s] || s}</span>`;
    }
    const columns = [
      {
        key: "recibo",
        label: "Recibo",
        sortable: true,
        width: "130px",
        formatter: (v) => v || "-"
      },
      {
        key: "tour",
        label: "Tour",
        sortable: true,
        formatter: (v) => v || "-"
      },
      {
        key: "contratante_pax",
        label: "Contratante/Pax",
        sortable: true,
        formatter: (v) => v || "-"
      },
      {
        key: "motivo",
        label: "Motivo",
        sortable: true,
        formatter: (v) => v ? `<span title="${v}">${v.length > 40 ? v.slice(0, 40) + "..." : v}</span>` : "-"
      },
      {
        key: "data_solicitacao",
        label: "Solicitação",
        sortable: true,
        width: "120px",
        formatter: (v) => v ? (/* @__PURE__ */ new Date(v + "T00:00:00")).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "prazo",
        label: "Prazo",
        sortable: true,
        width: "110px",
        formatter: (v) => {
          if (!v) return "-";
          const d = /* @__PURE__ */ new Date(v + "T00:00:00");
          const hoje = /* @__PURE__ */ new Date();
          const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1e3 * 60 * 60 * 24));
          const label = d.toLocaleDateString("pt-BR");
          if (diff < 0) return `<span class="text-red-600 font-medium">${label}</span>`;
          if (diff <= 3) return `<span class="text-amber-600 font-medium">${label}</span>`;
          return label;
        }
      },
      {
        key: "responsavel",
        label: "Responsável",
        sortable: true,
        formatter: (v) => v || "-"
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "130px",
        formatter: (v) => getStatusBadge(v)
      }
    ];
    async function load() {
      loading = true;
      try {
        const params = new URLSearchParams();
        if (statusFiltro !== "all") ;
        if (busca.trim()) params.set("q", busca.trim());
        const response = await fetch(`/api/v1/operacao/sac?${params.toString()}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        registros = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar registros SAC.");
      } finally {
        loading = false;
      }
    }
    function openNew() {
      editingId = null;
      form = createForm();
      modalOpen = true;
    }
    function openEdit(registro) {
      editingId = registro.id;
      form = {
        recibo: registro.recibo || "",
        tour: registro.tour || "",
        data_solicitacao: registro.data_solicitacao || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        motivo: registro.motivo || "",
        contratante_pax: registro.contratante_pax || "",
        ok_quando: registro.ok_quando || "",
        status: registro.status || "aberto",
        responsavel: registro.responsavel || "",
        prazo: registro.prazo || ""
      };
      modalOpen = true;
    }
    async function save() {
      saving = true;
      try {
        const response = await fetch("/api/v1/operacao/sac", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId || void 0, ...form })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success(editingId ? "Registro atualizado." : "Registro criado.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      } finally {
        saving = false;
      }
    }
    canEdit = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("controle_sac", "edit") || permissoes.can("operacao", "edit");
    canDelete = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("controle_sac", "delete") || permissoes.can("operacao", "delete");
    abertos = registros.filter((r) => r.status === "aberto").length;
    emAndamento = registros.filter((r) => r.status === "em_andamento").length;
    concluidos = registros.filter((r) => r.status === "concluido").length;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("3umvhf", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Controle SAC | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Controle SAC",
        subtitle: "Gerencie solicitações de atendimento ao cliente e acompanhe o status de cada caso.",
        color: "operacao",
        breadcrumbs: [
          { label: "Operação", href: "/operacao" },
          { label: "Controle SAC" }
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
              label: "Novo Registro",
              onClick: openNew,
              variant: "primary",
              icon: Plus
            }
          ] : []
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
      Circle_alert($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Abertos</p> <p class="text-2xl font-bold text-slate-900">${escape_html(abertos)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
      Clock($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Em andamento</p> <p class="text-2xl font-bold text-slate-900">${escape_html(emAndamento)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
      Circle_check_big($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Concluídos</p> <p class="text-2xl font-bold text-slate-900">${escape_html(concluidos)}</p></div></div></div> `);
      Card($$renderer3, {
        color: "operacao",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="flex flex-wrap gap-4 items-end"><div class="relative flex-1 min-w-[200px]">`);
          Search($$renderer4, {
            size: 16,
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          });
          $$renderer4.push(`<!----> <input${attr("value", busca)} class="vtur-input w-full pl-9" placeholder="Buscar por recibo, tour, motivo..."/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="sac-status">Status</label> `);
          $$renderer4.select({ id: "sac-status", value: statusFiltro, class: "vtur-input" }, ($$renderer5) => {
            $$renderer5.option({ value: "all" }, ($$renderer6) => {
              $$renderer6.push(`Todos`);
            });
            $$renderer5.push(`<!--[-->`);
            const each_array = ensure_array_like(STATUS_OPCOES);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let opt = each_array[$$index];
              $$renderer5.option({ value: opt.value }, ($$renderer6) => {
                $$renderer6.push(`${escape_html(opt.label)}`);
              });
            }
            $$renderer5.push(`<!--]-->`);
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
        data: registros,
        color: "operacao",
        loading,
        title: "Registros SAC",
        searchable: false,
        emptyMessage: "Nenhum registro SAC encontrado",
        onRowClick: canEdit ? (row) => openEdit(row) : void 0,
        $$slots: {
          "row-actions": ($$renderer4, { row }) => {
            {
              if (canDelete) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<button class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Excluir"${attr("disabled", deletingId === row.id, true)}>`);
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
        title: editingId ? "Editar Registro SAC" : "Novo Registro SAC",
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
          $$renderer4.push(`<div class="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="sac-recibo">Recibo</label> <input id="sac-recibo"${attr("value", form.recibo)} class="vtur-input w-full" placeholder="Número do recibo"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="sac-tour">Tour</label> <input id="sac-tour"${attr("value", form.tour)} class="vtur-input w-full" placeholder="Nome do tour"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="sac-contratante">Contratante/Pax</label> <input id="sac-contratante"${attr("value", form.contratante_pax)} class="vtur-input w-full" placeholder="Nome do contratante ou passageiro"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="sac-data">Data da Solicitação</label> <input id="sac-data" type="date"${attr("value", form.data_solicitacao)} class="vtur-input w-full"/></div> <div class="md:col-span-2"><label class="mb-1 block text-sm font-medium text-slate-700" for="sac-motivo">Motivo</label> <textarea id="sac-motivo" rows="3" class="vtur-input w-full" placeholder="Descreva o motivo da solicitação">`);
          const $$body = escape_html(form.motivo);
          if ($$body) {
            $$renderer4.push(`${$$body}`);
          }
          $$renderer4.push(`</textarea></div> <div class="md:col-span-2"><label class="mb-1 block text-sm font-medium text-slate-700" for="sac-ok-quando">OK quando</label> <input id="sac-ok-quando"${attr("value", form.ok_quando)} class="vtur-input w-full" placeholder="Condição para encerramento"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="sac-responsavel">Responsável</label> <input id="sac-responsavel"${attr("value", form.responsavel)} class="vtur-input w-full" placeholder="Nome do responsável"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="sac-prazo">Prazo</label> <input id="sac-prazo" type="date"${attr("value", form.prazo)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="sac-status-form">Status</label> `);
          $$renderer4.select(
            {
              id: "sac-status-form",
              value: form.status,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(STATUS_OPCOES);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let opt = each_array_1[$$index_1];
                $$renderer5.option({ value: opt.value }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(opt.label)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div></div>`);
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
