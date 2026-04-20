import { h as head, q as attr, e as escape_html } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { B as Badge } from "../../../../../chunks/Badge.js";
import { K as KPICard } from "../../../../../chunks/KPICard.js";
import "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { C as Calendar_days } from "../../../../../chunks/calendar-days.js";
import { S as Search } from "../../../../../chunks/search.js";
import { E as External_link } from "../../../../../chunks/external-link.js";
import { L as Loader_circle } from "../../../../../chunks/loader-circle.js";
import { M as Message_circle } from "../../../../../chunks/message-circle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let rows, resumo;
    const columns = [
      { key: "cliente_nome", label: "Cliente", sortable: true },
      { key: "destino_nome", label: "Destino", sortable: true },
      { key: "retornoLabel", label: "Retorno", sortable: true },
      { key: "embarqueLabel", label: "Embarque", sortable: true },
      { key: "statusLabel", label: "Status", sortable: true },
      { key: "followUpResumo", label: "Follow-up", sortable: true }
    ];
    const todayIso = (() => {
      const now = /* @__PURE__ */ new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    })();
    function thirtyDaysAgo() {
      const date = /* @__PURE__ */ new Date();
      date.setDate(date.getDate() - 30);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
    let loading = true;
    let saving = false;
    let errorMessage = null;
    let searchQuery = "";
    let statusFilter = "abertos";
    let inicio = thirtyDaysAgo();
    let fim = todayIso;
    let items = [];
    let modalOpen = false;
    let selectedItem = null;
    let form = { texto: "", fechado: false };
    function formatDate(value) {
      if (!value) return "-";
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return parsed.toLocaleDateString("pt-BR");
    }
    function sanitizePhone(value) {
      return String(value || "").replace(/\D/g, "");
    }
    async function loadFollowUps() {
      loading = true;
      errorMessage = null;
      try {
        const params = new URLSearchParams({ inicio, fim, status: statusFilter });
        const response = await fetch(`/api/v1/dashboard/follow-ups?${params.toString()}`, { credentials: "same-origin" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Erro ao carregar follow-ups.");
        }
        items = Array.isArray(payload?.items) ? payload.items : [];
      } catch (error) {
        console.error(error);
        errorMessage = error instanceof Error ? error.message : "Erro ao carregar follow-ups.";
        items = [];
      } finally {
        loading = false;
      }
    }
    function openItem(item) {
      selectedItem = item;
      form = {
        texto: item.follow_up_text || "",
        fechado: Boolean(item.follow_up_fechado)
      };
      modalOpen = true;
    }
    function currentWhatsAppLink(item) {
      const phone = sanitizePhone(item.cliente_whatsapp || item.cliente_telefone);
      if (!phone) return null;
      return `https://wa.me/${phone}`;
    }
    rows = items.map((item) => ({
      ...item,
      retornoLabel: formatDate(item.data_fim || item.data_final),
      embarqueLabel: formatDate(item.data_inicio || item.data_embarque),
      statusLabel: item.follow_up_fechado ? "Fechado" : "Aberto",
      followUpResumo: item.follow_up_text?.trim() ? item.follow_up_text.trim() : "Sem anotacao"
    })).filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return [
        item.cliente_nome,
        item.destino_nome || "",
        item.followUpResumo,
        item.statusLabel
      ].join(" ").toLowerCase().includes(query);
    });
    resumo = {
      total: items.length,
      atrasados: items.filter((item) => !item.follow_up_fechado && String(item.data_fim || item.data_final || "") < todayIso).length,
      semTexto: items.filter((item) => !String(item.follow_up_text || "").trim()).length,
      fechados: items.filter((item) => item.follow_up_fechado).length
    };
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1ynlzsa", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Acompanhamento | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Acompanhamento",
        subtitle: "Follow-up operacional derivado de viagens e vendas, respeitando escopo por perfil.",
        color: "operacao",
        breadcrumbs: [
          { label: "Operacao", href: "/operacao" },
          { label: "Acompanhamento" }
        ],
        actions: [
          {
            label: "Atualizar",
            onClick: loadFollowUps,
            variant: "secondary",
            icon: Refresh_cw
          }
        ]
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid mb-6">`);
      KPICard($$renderer3, {
        title: "Itens no periodo",
        value: resumo.total,
        color: "operacao",
        icon: Calendar_days
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "Atrasados",
        value: resumo.atrasados,
        color: "operacao",
        icon: Calendar_days
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "Sem texto",
        value: resumo.semTexto,
        color: "operacao",
        icon: Search
      });
      $$renderer3.push(`<!----> `);
      KPICard($$renderer3, {
        title: "Fechados",
        value: resumo.fechados,
        color: "operacao",
        icon: External_link
      });
      $$renderer3.push(`<!----></div> `);
      Card($$renderer3, {
        color: "operacao",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="grid grid-cols-1 lg:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))] gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1" for="follow-search">Busca</label> <div class="relative">`);
          Search($$renderer4, {
            size: 16,
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          });
          $$renderer4.push(`<!----> <input id="follow-search"${attr("value", searchQuery)} class="vtur-input w-full pl-9" placeholder="Cliente, destino ou texto do follow-up"/></div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="follow-status">Status</label> `);
          $$renderer4.select(
            {
              id: "follow-status",
              value: statusFilter,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "abertos" }, ($$renderer6) => {
                $$renderer6.push(`Abertos`);
              });
              $$renderer5.option({ value: "todos" }, ($$renderer6) => {
                $$renderer6.push(`Todos`);
              });
              $$renderer5.option({ value: "fechados" }, ($$renderer6) => {
                $$renderer6.push(`Fechados`);
              });
            }
          );
          $$renderer4.push(`</div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="follow-start">Inicio</label> <input id="follow-start" type="date"${attr("value", inicio)} class="vtur-input w-full"/></div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="follow-end">Fim</label> <input id="follow-end" type="date"${attr("value", fim)} class="vtur-input w-full"/></div></div> <div class="mt-4 flex flex-wrap gap-2">`);
          Button($$renderer4, {
            variant: "primary",
            size: "sm",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Aplicar periodo`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            variant: "ghost",
            size: "sm",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Limpar filtros`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Card($$renderer3, {
        color: "operacao",
        children: ($$renderer4) => {
          if (loading) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="flex items-center justify-center gap-3 py-16 text-slate-500">`);
            Loader_circle($$renderer4, { size: 20, class: "animate-spin" });
            $$renderer4.push(`<!----> Carregando acompanhamento...</div>`);
          } else if (errorMessage) {
            $$renderer4.push("<!--[1-->");
            $$renderer4.push(`<div class="py-8 text-sm text-red-600">${escape_html(errorMessage)}</div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
            DataTable($$renderer4, {
              columns,
              data: rows,
              color: "operacao",
              loading: false,
              searchable: false,
              filterable: false,
              exportable: false,
              onRowClick: (row) => openItem(row),
              emptyMessage: "Nenhum follow-up encontrado para o periodo"
            });
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Detalhe do acompanhamento",
        color: "operacao",
        size: "lg",
        showCancel: true,
        cancelText: "Fechar",
        showConfirm: false,
        loading: saving,
        onCancel: () => {
          modalOpen = false;
          selectedItem = null;
        },
        get open() {
          return modalOpen;
        },
        set open($$value) {
          modalOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          if (selectedItem) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="space-y-5"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><span class="block text-xs uppercase tracking-wide text-slate-400">Cliente</span> <strong class="text-slate-900">${escape_html(selectedItem.cliente_nome)}</strong> `);
            if (selectedItem.destino_nome) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<p class="mt-1 text-sm text-slate-600">${escape_html(selectedItem.destino_nome)}</p>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div> <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><span class="block text-xs uppercase tracking-wide text-slate-400">Periodo da viagem</span> <strong class="text-slate-900">${escape_html(formatDate(selectedItem.data_inicio || selectedItem.data_embarque))} ate ${escape_html(formatDate(selectedItem.data_fim || selectedItem.data_final))}</strong> <div class="mt-2 flex flex-wrap gap-2">`);
            if (form.fechado) {
              $$renderer4.push("<!--[0-->");
              Badge($$renderer4, {
                color: "green",
                size: "sm",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Fechado`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer4.push("<!--[-1-->");
              Badge($$renderer4, {
                color: "yellow",
                size: "sm",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Aberto`);
                },
                $$slots: { default: true }
              });
            }
            $$renderer4.push(`<!--]--></div></div></div> <div><label class="block text-sm font-medium text-slate-700 mb-1" for="follow-text">Texto do follow-up</label> <textarea id="follow-text" class="vtur-input w-full" rows="6" placeholder="Registre aqui o retorno operacional, feedback do cliente e proximos passos.">`);
            const $$body = escape_html(form.texto);
            if ($$body) {
              $$renderer4.push(`${$$body}`);
            }
            $$renderer4.push(`</textarea></div> <div class="flex flex-wrap items-center gap-4"><label class="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox"${attr("checked", form.fechado, true)} class="rounded border-slate-300"/> Marcar follow-up como fechado</label></div> <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><h4 class="text-sm font-semibold text-slate-900 mb-2">Vinculos operacionais</h4> <div class="flex flex-wrap gap-2">`);
            if (selectedItem.cliente_id) {
              $$renderer4.push("<!--[0-->");
              Button($$renderer4, {
                href: `/clientes/${selectedItem.cliente_id}`,
                variant: "secondary",
                size: "sm",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Cliente`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            if (selectedItem.venda_id) {
              $$renderer4.push("<!--[0-->");
              Button($$renderer4, {
                href: `/vendas/${selectedItem.venda_id}`,
                variant: "secondary",
                size: "sm",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Venda`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            Button($$renderer4, {
              href: `/operacao/viagens/${selectedItem.id}`,
              variant: "secondary",
              size: "sm",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Viagem`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            if (currentWhatsAppLink(selectedItem)) {
              $$renderer4.push("<!--[0-->");
              Button($$renderer4, {
                href: currentWhatsAppLink(selectedItem) || void 0,
                variant: "secondary",
                size: "sm",
                children: ($$renderer5) => {
                  Message_circle($$renderer5, { size: 14, class: "mr-1.5" });
                  $$renderer5.push(`<!----> WhatsApp`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div></div></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: {
          default: true,
          actions: ($$renderer4) => {
            {
              Button($$renderer4, {
                variant: "primary",
                loading: saving,
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Salvar follow-up`);
                },
                $$slots: { default: true }
              });
            }
          }
        }
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
