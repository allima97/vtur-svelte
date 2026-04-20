import "clsx";
import { h as head, e as escape_html, q as attr } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import "../../../../../chunks/ui.js";
import { B as Building_2 } from "../../../../../chunks/building-2.js";
import { P as Phone } from "../../../../../chunks/phone.js";
import { M as Map_pin } from "../../../../../chunks/map-pin.js";
import { W as Wallet } from "../../../../../chunks/wallet.js";
import { P as Plus } from "../../../../../chunks/plus.js";
function FornecedoresPage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let rows, filteredRows, stats;
    let loading = true;
    let fornecedores = [];
    let busca = "";
    let filtroStatus = "";
    let filtroLocalizacao = "";
    let filtroFaturamento = "";
    function normalize(value) {
      return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }
    function formatLocalizacao(value) {
      return value === "exterior" ? "Exterior" : "Brasil";
    }
    function formatFaturamento(value) {
      switch (String(value || "")) {
        case "pre_pago":
          return "Pré-pago";
        case "semanal":
          return "Semanal";
        case "quinzenal":
          return "Quinzenal";
        case "mensal":
          return "Mensal";
        default:
          return value || "-";
      }
    }
    function statusBadge(value) {
      return value !== false ? '<span class="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Ativo</span>' : '<span class="inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600">Inativo</span>';
    }
    const columns = [
      { key: "parceiro_nome", label: "Nome fantasia", sortable: true },
      {
        key: "local_label",
        label: "Local",
        sortable: true,
        width: "220px"
      },
      {
        key: "faturamento_label",
        label: "Faturamento",
        sortable: true,
        width: "140px"
      },
      {
        key: "telefone",
        label: "Telefone",
        sortable: true,
        width: "150px"
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        sortable: true,
        width: "150px"
      },
      {
        key: "telefone_emergencia",
        label: "Emergência",
        sortable: true,
        width: "150px"
      },
      { key: "servicos_label", label: "Serviços", sortable: false },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        width: "110px",
        formatter: (value) => statusBadge(value)
      }
    ];
    rows = fornecedores.map((item) => ({
      ...item,
      parceiro_nome: item.nome_fantasia || item.nome_completo || "-",
      local_label: `${formatLocalizacao(item.localizacao)}${item.cidade ? ` - ${item.cidade}` : ""}${item.estado ? `/${item.estado}` : ""}`,
      faturamento_label: formatFaturamento(item.tipo_faturamento),
      contato_label: item.responsavel || "-",
      servicos_label: item.principais_servicos && item.principais_servicos.length > 80 ? `${item.principais_servicos.slice(0, 80)}...` : item.principais_servicos || "-"
    }));
    filteredRows = rows.filter((item) => {
      const termo = normalize(busca);
      if (termo) {
        const haystack = normalize([
          item.parceiro_nome,
          item.nome_completo,
          item.responsavel,
          item.telefone,
          item.whatsapp,
          item.local_label,
          item.servicos_label
        ].join(" "));
        if (!haystack.includes(termo)) return false;
      }
      return true;
    });
    stats = {
      total: fornecedores.length,
      ativos: fornecedores.filter((item) => item.ativo !== false).length,
      exterior: fornecedores.filter((item) => item.localizacao === "exterior").length,
      vinculados: fornecedores.filter((item) => (item.produtos_vinculados || 0) > 0).length
    };
    head("1v3rd73", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Fornecedores | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Fornecedores",
      subtitle: "Cadastros de apoio operacional usados por produtos, operação e fluxo comercial",
      color: "financeiro",
      breadcrumbs: [
        { label: "Cadastros", href: "/cadastros" },
        { label: "Fornecedores" }
      ],
      actions: [
        {
          label: "Novo fornecedor",
          onClick: () => goto(),
          variant: "primary",
          icon: Plus
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
    Building_2($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.total)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
    Phone($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Ativos</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.ativos)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
    Map_pin($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Exterior</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.exterior)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-violet-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">`);
    Wallet($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Com produtos</p><p class="text-2xl font-bold text-slate-900">${escape_html(stats.vinculados)}</p></div></div></div> `);
    Card($$renderer2, {
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid grid-cols-1 gap-4 lg:grid-cols-4"><div><label for="forn-busca" class="mb-1 block text-sm font-medium text-slate-700">Buscar</label> <input id="forn-busca"${attr("value", busca)} class="vtur-input w-full" placeholder="Fantasia, razão social, responsável..."/></div> <div><label for="forn-status" class="mb-1 block text-sm font-medium text-slate-700">Status</label> `);
        $$renderer3.select(
          {
            id: "forn-status",
            value: filtroStatus,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.option({ value: "ativo" }, ($$renderer5) => {
              $$renderer5.push(`Ativo`);
            });
            $$renderer4.option({ value: "inativo" }, ($$renderer5) => {
              $$renderer5.push(`Inativo`);
            });
          }
        );
        $$renderer3.push(`</div> <div><label for="forn-local" class="mb-1 block text-sm font-medium text-slate-700">Localização</label> `);
        $$renderer3.select(
          {
            id: "forn-local",
            value: filtroLocalizacao,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todas`);
            });
            $$renderer4.option({ value: "brasil" }, ($$renderer5) => {
              $$renderer5.push(`Brasil`);
            });
            $$renderer4.option({ value: "exterior" }, ($$renderer5) => {
              $$renderer5.push(`Exterior`);
            });
          }
        );
        $$renderer3.push(`</div> <div><label for="forn-fat" class="mb-1 block text-sm font-medium text-slate-700">Faturamento</label> `);
        $$renderer3.select(
          {
            id: "forn-fat",
            value: filtroFaturamento,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todos`);
            });
            $$renderer4.option({ value: "pre_pago" }, ($$renderer5) => {
              $$renderer5.push(`Pré-pago`);
            });
            $$renderer4.option({ value: "semanal" }, ($$renderer5) => {
              $$renderer5.push(`Semanal`);
            });
            $$renderer4.option({ value: "quinzenal" }, ($$renderer5) => {
              $$renderer5.push(`Quinzenal`);
            });
            $$renderer4.option({ value: "mensal" }, ($$renderer5) => {
              $$renderer5.push(`Mensal`);
            });
          }
        );
        $$renderer3.push(`</div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    DataTable($$renderer2, {
      columns,
      data: filteredRows,
      color: "financeiro",
      loading,
      title: "Base de fornecedores",
      searchable: false,
      filterable: false,
      exportable: false,
      onRowClick: (row) => goto(`/cadastros/fornecedores/${row.id}/editar`),
      emptyMessage: "Nenhum fornecedor encontrado."
    });
    $$renderer2.push(`<!---->`);
  });
}
function _page($$renderer) {
  FornecedoresPage($$renderer);
}
export {
  _page as default
};
