import { b as store_get, u as unsubscribe_stores, h as head, q as attr, t as ensure_array_like, e as escape_html } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { p as permissoes } from "../../../../../chunks/permissoes.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { S as Search } from "../../../../../chunks/search.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let canEdit;
    let items = [];
    let vendedores = [];
    let loading = true;
    let modalOpen = false;
    let saving = false;
    let selectedItem = null;
    let inicio = (() => {
      const d = /* @__PURE__ */ new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    })();
    let fim = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    let filtroVendedor = "";
    let busca = "";
    let form = {
      vendedor_destino_id: "",
      percentual_destino: "50",
      observacao: ""
    };
    function formatCurrency(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    }
    const columns = [
      {
        key: "numero_recibo",
        label: "Recibo",
        sortable: true,
        width: "130px"
      },
      { key: "cliente_nome", label: "Cliente", sortable: true },
      {
        key: "vendedor_origem_nome",
        label: "Vendedor Origem",
        sortable: true,
        width: "160px"
      },
      {
        key: "data_venda",
        label: "Data Venda",
        sortable: true,
        width: "110px",
        formatter: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "valor_total",
        label: "Valor",
        sortable: true,
        align: "right",
        formatter: (v) => formatCurrency(v)
      },
      {
        key: "rateio",
        label: "Rateio",
        sortable: false,
        formatter: (_, row) => {
          if (!row.rateio || !row.rateio.ativo) return '<span class="text-slate-400 text-xs">Sem rateio</span>';
          const nome = row.rateio.vendedor_destino?.nome_completo || "Vendedor";
          return `<span class="text-xs">${nome} · ${row.rateio.percentual_destino}%</span>`;
        }
      }
    ];
    async function load() {
      loading = true;
      try {
        const params = new URLSearchParams({ inicio, fim });
        if (filtroVendedor) ;
        if (busca.trim()) params.set("q", busca.trim());
        const response = await fetch(`/api/v1/financeiro/ajustes-vendas?${params.toString()}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        items = payload.items || [];
        vendedores = payload.vendedores || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar ajustes.");
      } finally {
        loading = false;
      }
    }
    function openEdit(item) {
      selectedItem = item;
      form = {
        vendedor_destino_id: item.rateio?.vendedor_destino_id || "",
        percentual_destino: String(item.rateio?.percentual_destino ?? 50),
        observacao: item.rateio?.observacao || ""
      };
      modalOpen = true;
    }
    async function save() {
      if (!selectedItem) return;
      if (!form.vendedor_destino_id) {
        toast.error("Selecione o vendedor destino.");
        return;
      }
      saving = true;
      try {
        const response = await fetch("/api/v1/financeiro/ajustes-vendas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ajuste_id: selectedItem.id,
            vendedor_destino_id: form.vendedor_destino_id,
            percentual_destino: Number(form.percentual_destino),
            observacao: form.observacao
          })
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success("Rateio salvo com sucesso.");
        modalOpen = false;
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar rateio.");
      } finally {
        saving = false;
      }
    }
    canEdit = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || store_get($$store_subs ??= {}, "$permissoes", permissoes).isMaster || store_get($$store_subs ??= {}, "$permissoes", permissoes).isGestor;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("hymyem", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Ajustes de Vendas | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Ajustes de Vendas",
        subtitle: "Configure o rateio de comissões entre vendedores para recibos específicos.",
        color: "financeiro",
        breadcrumbs: [
          { label: "Financeiro", href: "/financeiro" },
          { label: "Ajustes de Vendas" }
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
      $$renderer3.push(`<!----> `);
      Card($$renderer3, {
        color: "financeiro",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="flex flex-wrap gap-4 items-end"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="aj-inicio">Data início</label> <input id="aj-inicio" type="date"${attr("value", inicio)} class="vtur-input"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="aj-fim">Data fim</label> <input id="aj-fim" type="date"${attr("value", fim)} class="vtur-input"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="aj-vendedor">Vendedor</label> `);
          $$renderer4.select(
            {
              id: "aj-vendedor",
              value: filtroVendedor,
              class: "vtur-input"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Todos`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(vendedores);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let v = each_array[$$index];
                $$renderer5.option({ value: v.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(v.nome_completo || "Vendedor")}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div class="relative">`);
          Search($$renderer4, {
            size: 16,
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          });
          $$renderer4.push(`<!----> <input${attr("value", busca)} class="vtur-input pl-9" placeholder="Buscar..."/></div> `);
          Button($$renderer4, {
            variant: "primary",
            color: "financeiro",
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
        data: items,
        color: "financeiro",
        loading,
        title: "Recibos disponíveis para rateio",
        searchable: false,
        emptyMessage: "Nenhum recibo encontrado para o período",
        onRowClick: canEdit ? (row) => openEdit(row) : void 0
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Configurar Rateio",
        color: "financeiro",
        size: "md",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Salvar Rateio",
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
          if (selectedItem) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="space-y-4"><div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><p class="font-semibold text-slate-900">${escape_html(selectedItem.cliente_nome)}</p> <p class="text-slate-600">Recibo: ${escape_html(selectedItem.numero_recibo)} · ${escape_html(formatCurrency(selectedItem.valor_total))}</p> <p class="text-slate-500">Vendedor origem: ${escape_html(selectedItem.vendedor_origem_nome)}</p></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="rateio-destino">Vendedor destino *</label> `);
            $$renderer4.select(
              {
                id: "rateio-destino",
                value: form.vendedor_destino_id,
                class: "vtur-input w-full"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: "" }, ($$renderer6) => {
                  $$renderer6.push(`Selecione...`);
                });
                $$renderer5.push(`<!--[-->`);
                const each_array_1 = ensure_array_like(vendedores.filter((v) => v.id !== selectedItem?.vendedor_origem_id));
                for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                  let v = each_array_1[$$index_1];
                  $$renderer5.option({ value: v.id }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(v.nome_completo || "Vendedor")}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
            $$renderer4.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="rateio-pct">% para o vendedor destino</label> <input id="rateio-pct" type="number" min="1" max="99" step="1"${attr("value", form.percentual_destino)} class="vtur-input w-full"/> <p class="mt-1 text-xs text-slate-500">Origem ficará com ${escape_html(100 - Number(form.percentual_destino || 0))}% e destino com ${escape_html(form.percentual_destino)}%.</p></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="rateio-obs">Observação</label> <input id="rateio-obs"${attr("value", form.observacao)} class="vtur-input w-full" placeholder="Motivo do rateio (opcional)"/></div></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]-->`);
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
