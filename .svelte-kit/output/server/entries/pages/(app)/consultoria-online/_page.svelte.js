import { f as fallback, e as escape_html, k as slot, m as bind_props, t as ensure_array_like, p as attr_class, v as stringify, q as attr } from "../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../chunks/Card.js";
import { B as Button } from "../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../chunks/Dialog.js";
import { B as Badge } from "../../../../chunks/Badge.js";
import { t as toast } from "../../../../chunks/ui.js";
import { P as Plus } from "../../../../chunks/plus.js";
import { R as Refresh_cw } from "../../../../chunks/refresh-cw.js";
import { D as Download } from "../../../../chunks/download.js";
import { L as Loader_circle } from "../../../../chunks/loader-circle.js";
import { V as Video } from "../../../../chunks/video.js";
import { C as Calendar } from "../../../../chunks/calendar.js";
import { X } from "../../../../chunks/x.js";
function EmptyState($$renderer, $$props) {
  let title = fallback($$props["title"], "Nenhum resultado encontrado");
  let message = fallback($$props["message"], "Não há dados para exibir no momento.");
  let icon = fallback(
    $$props["icon"],
    null
    // componente Lucide opcional
  );
  $$renderer.push(`<div class="flex flex-col items-center justify-center px-6 py-14 text-center">`);
  if (icon) {
    $$renderer.push("<!--[0-->");
    if (icon) {
      $$renderer.push("<!--[-->");
      icon($$renderer, { size: 40, class: "mb-4 text-slate-300" });
      $$renderer.push("<!--]-->");
    } else {
      $$renderer.push("<!--[!-->");
      $$renderer.push("<!--]-->");
    }
  } else {
    $$renderer.push("<!--[-1-->");
    $$renderer.push(`<svg class="mb-4 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>`);
  }
  $$renderer.push(`<!--]--> <h3 class="mb-1 text-base font-semibold text-slate-800">${escape_html(title)}</h3> <p class="mb-4 max-w-sm text-sm text-slate-500">${escape_html(message)}</p> <!--[-->`);
  slot($$renderer, $$props, "default", {}, null);
  $$renderer.push(`<!--]--></div>`);
  bind_props($$props, { title, message, icon });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const lembreteOptions = [
      { value: "15min", label: "15 minutos antes" },
      { value: "30min", label: "30 minutos antes" },
      { value: "1h", label: "1 hora antes" },
      { value: "2h", label: "2 horas antes" },
      { value: "1d", label: "1 dia antes" }
    ];
    const statusOptions = [
      { value: "", label: "Todas" },
      { value: "aberta", label: "Abertas" },
      { value: "fechada", label: "Fechadas" }
    ];
    let consultorias = [];
    let loading = false;
    let saving = false;
    let showModal = false;
    let editingId = null;
    let statusFilter = "";
    function defaultForm() {
      return {
        cliente_nome: "",
        data_hora: "",
        lembrete: "15min",
        destino: "",
        quantidade_pessoas: 1,
        taxa_consultoria: 0,
        notas: ""
      };
    }
    let form = defaultForm();
    function formatDataHora(iso) {
      if (!iso) return "-";
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    function formatCurrency(val) {
      if (!val) return "-";
      return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    async function loadConsultorias() {
      loading = true;
      try {
        const params = statusFilter ? `?status=${statusFilter}` : "";
        const res = await fetch(`/api/v1/consultorias${params}`);
        if (!res.ok) throw new Error(await res.text());
        consultorias = await res.json();
      } catch (err) {
        toast.error("Erro ao carregar consultorias: " + (err?.message ?? err));
      } finally {
        loading = false;
      }
    }
    function openCreate() {
      editingId = null;
      form = defaultForm();
      showModal = true;
    }
    function closeModal() {
      showModal = false;
      editingId = null;
      form = defaultForm();
    }
    void (typeof window !== "undefined" && loadConsultorias());
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      PageHeader($$renderer3, {
        title: "Consultoria Online",
        subtitle: "Gerencie agendamentos de consultoria",
        color: "operacao",
        actions: [
          {
            label: "Nova Consultoria",
            onClick: openCreate,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="space-y-4">`);
      Card($$renderer3, {
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="flex flex-wrap items-center gap-3"><span class="text-sm font-medium text-slate-600">Filtrar por status:</span> <!--[-->`);
          const each_array = ensure_array_like(statusOptions);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let opt = each_array[$$index];
            $$renderer4.push(`<button type="button"${attr_class(`rounded-full border px-3 py-1 text-sm transition-colors ${stringify(statusFilter === opt.value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400")}`)}>${escape_html(opt.label)}</button>`);
          }
          $$renderer4.push(`<!--]--> <div class="ml-auto flex items-center gap-2"><span class="text-sm text-slate-500">${escape_html(consultorias.length)} registro(s)</span> <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Atualizar"${attr("disabled", loading, true)}>`);
          Refresh_cw($$renderer4, { size: 15, class: loading ? "animate-spin" : "" });
          $$renderer4.push(`<!----></button> <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Exportar iCal">`);
          Download($$renderer4, { size: 15 });
          $$renderer4.push(`<!----></button></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      if (loading) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="flex justify-center py-12">`);
        Loader_circle($$renderer3, { size: 32, class: "animate-spin text-blue-500" });
        $$renderer3.push(`<!----></div>`);
      } else if (consultorias.length === 0) {
        $$renderer3.push("<!--[1-->");
        EmptyState($$renderer3, {
          title: "Nenhuma consultoria encontrada",
          message: "Clique em 'Nova Consultoria' para agendar a primeira.",
          icon: Video
        });
      } else {
        $$renderer3.push("<!--[-1-->");
        $$renderer3.push(`<div class="space-y-2"><!--[-->`);
        const each_array_1 = ensure_array_like(consultorias);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let c = each_array_1[$$index_1];
          Card($$renderer3, {
            children: ($$renderer4) => {
              $$renderer4.push(`<div class="flex items-start justify-between gap-4"><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><span class="font-semibold text-slate-900">${escape_html(c.cliente_nome)}</span> `);
              Badge($$renderer4, {
                color: c.fechada ? "gray" : "teal",
                dot: true,
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->${escape_html(c.fechada ? "Fechada" : "Aberta")}`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              if (c.destino) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<span class="text-sm text-slate-500">— ${escape_html(c.destino)}</span>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></div> <div class="mt-1 flex flex-wrap items-center gap-4 text-sm text-slate-600"><span class="flex items-center gap-1">`);
              Calendar($$renderer4, { size: 14 });
              $$renderer4.push(`<!----> ${escape_html(formatDataHora(c.data_hora))}</span> <span>${escape_html(c.quantidade_pessoas)} pessoa(s)</span> `);
              if (c.taxa_consultoria) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<span>${escape_html(formatCurrency(c.taxa_consultoria))}</span>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--> `);
              if (c.lembrete) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<span class="rounded bg-slate-100 px-2 py-0.5 text-xs">Lembrete: ${escape_html(c.lembrete)}</span>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></div> `);
              if (c.notas) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<p class="mt-1 line-clamp-2 text-sm text-slate-500">${escape_html(c.notas)}</p>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></div> <div class="flex shrink-0 items-center gap-2"><button type="button" class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600">Editar</button> <button type="button"${attr_class(`rounded border px-2 py-1 text-xs transition-colors ${stringify(c.fechada ? "border-green-300 text-green-700 hover:bg-green-50" : "border-orange-300 text-orange-700 hover:bg-orange-50")}`)}>${escape_html(c.fechada ? "Reabrir" : "Fechar")}</button></div></div>`);
            },
            $$slots: { default: true }
          });
        }
        $$renderer3.push(`<!--]--></div>`);
      }
      $$renderer3.push(`<!--]--></div> `);
      Dialog($$renderer3, {
        title: editingId ? "Editar Consultoria" : "Nova Consultoria",
        size: "lg",
        color: "operacao",
        onCancel: closeModal,
        get open() {
          return showModal;
        },
        set open($$value) {
          showModal = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<form class="space-y-4"><div><label for="cliente_nome" class="mb-1 block text-sm font-medium text-slate-700">Nome do Cliente <span class="text-red-500">*</span></label> <input id="cliente_nome" type="text"${attr("value", form.cliente_nome)} class="vtur-input w-full" placeholder="Nome do cliente" required=""/></div> <div><label for="data_hora" class="mb-1 block text-sm font-medium text-slate-700">Data e Hora <span class="text-red-500">*</span></label> <input id="data_hora" type="datetime-local"${attr("value", form.data_hora)} class="vtur-input w-full" required=""/></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label for="lembrete" class="mb-1 block text-sm font-medium text-slate-700">Lembrete</label> `);
          $$renderer4.select(
            {
              id: "lembrete",
              value: form.lembrete,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array_2 = ensure_array_like(lembreteOptions);
              for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                let opt = each_array_2[$$index_2];
                $$renderer5.option({ value: opt.value }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(opt.label)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label for="qtd_pessoas" class="mb-1 block text-sm font-medium text-slate-700">Qtd. Pessoas</label> <input id="qtd_pessoas" type="number"${attr("value", form.quantidade_pessoas)} min="1" class="vtur-input w-full"/></div></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label for="destino" class="mb-1 block text-sm font-medium text-slate-700">Destino</label> <input id="destino" type="text"${attr("value", form.destino)} class="vtur-input w-full" placeholder="Ex: Paris, Miami..."/></div> <div><label for="taxa" class="mb-1 block text-sm font-medium text-slate-700">Taxa de Consultoria (R$)</label> <input id="taxa" type="number"${attr("value", form.taxa_consultoria)} min="0" step="0.01" class="vtur-input w-full"/></div></div> <div><label for="notas" class="mb-1 block text-sm font-medium text-slate-700">Notas</label> <textarea id="notas"${attr("rows", 3)} class="vtur-input w-full" placeholder="Observações sobre a consultoria...">`);
          const $$body = escape_html(form.notas);
          if ($$body) {
            $$renderer4.push(`${$$body}`);
          }
          $$renderer4.push(`</textarea></div> <div class="flex justify-end gap-2 border-t pt-3">`);
          Button($$renderer4, {
            type: "button",
            variant: "secondary",
            disabled: saving,
            children: ($$renderer5) => {
              X($$renderer5, { size: 16, class: "mr-1" });
              $$renderer5.push(`<!----> Cancelar`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            type: "submit",
            variant: "primary",
            color: "operacao",
            loading: saving,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->${escape_html(editingId ? "Salvar Alterações" : "Criar Consultoria")}`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div></form>`);
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
