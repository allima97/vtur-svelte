import { h as head } from "../../../../chunks/index2.js";
import { g as goto } from "../../../../chunks/client.js";
import { D as DataTable } from "../../../../chunks/DataTable.js";
import { P as PageHeader } from "../../../../chunks/PageHeader.js";
import { K as KPICard } from "../../../../chunks/KPICard.js";
import { K as KPIGrid } from "../../../../chunks/KPIGrid.js";
import { t as toast } from "../../../../chunks/ui.js";
import { P as Plus } from "../../../../chunks/plus.js";
import { F as File_spreadsheet } from "../../../../chunks/file-spreadsheet.js";
import { S as Shopping_cart } from "../../../../chunks/shopping-cart.js";
import { D as Dollar_sign } from "../../../../chunks/dollar-sign.js";
import { C as Calendar } from "../../../../chunks/calendar.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let resumo;
    let vendas = [];
    let loading = true;
    let filters = [];
    const columns = [
      {
        key: "codigo",
        label: "Código",
        sortable: true,
        width: "130px"
      },
      { key: "cliente", label: "Cliente", sortable: true },
      { key: "destino", label: "Destino", sortable: true },
      {
        key: "data_embarque",
        label: "Embarque",
        sortable: true,
        width: "120px",
        formatter: (value) => value ? new Date(value).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "valor_total",
        label: "Valor Total",
        sortable: true,
        align: "right",
        formatter: (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0)
      },
      {
        key: "valor_taxas",
        label: "Taxas",
        sortable: true,
        align: "right",
        formatter: (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0)
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "130px",
        formatter: (value) => {
          const styles = {
            confirmada: "bg-green-100 text-green-700",
            pendente: "bg-amber-100 text-amber-700",
            cancelada: "bg-red-100 text-red-700",
            concluida: "bg-blue-100 text-blue-700"
          };
          const labels = {
            confirmada: "Confirmada",
            pendente: "Pendente",
            cancelada: "Cancelada",
            concluida: "Concluída"
          };
          return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value]}">${labels[value]}</span>`;
        }
      },
      {
        key: "vendedor",
        label: "Vendedor",
        sortable: true,
        width: "160px"
      }
    ];
    function handleRowClick(row) {
      goto(`/vendas/${row.id}`);
    }
    function handleExport() {
      toast.info("A exportação sera ligada na proxima etapa. Os dados reais ja estao conectados.");
    }
    function getResumoVendas() {
      const total = vendas.reduce((acc, venda) => acc + Number(venda.valor_total || 0), 0);
      const taxas = vendas.reduce((acc, venda) => acc + Number(venda.valor_taxas || 0), 0);
      const confirmadas = vendas.filter((venda) => venda.status === "confirmada").length;
      const pendentes = vendas.filter((venda) => venda.status === "pendente").length;
      return { total, taxas, confirmadas, pendentes };
    }
    filters = [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "confirmada", label: "Confirmada" },
          { value: "pendente", label: "Pendente" },
          { value: "cancelada", label: "Cancelada" },
          { value: "concluida", label: "Concluída" }
        ]
      },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        options: [
          { value: "pacote", label: "Pacote" },
          { value: "hotel", label: "Hotel" },
          { value: "passagem", label: "Passagem" },
          { value: "servico", label: "Serviço" }
        ]
      },
      {
        key: "vendedor",
        label: "Vendedor",
        type: "select",
        options: Array.from(new Set(vendas.map((venda) => String(venda.vendedor || "").trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right, "pt-BR")).map((vendedor) => ({ value: vendedor, label: vendedor }))
      }
    ];
    resumo = getResumoVendas();
    head("pavuqx", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Vendas | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Vendas",
      subtitle: "Gerencie as vendas com leitura real do banco compartilhado do VTUR.",
      color: "vendas",
      breadcrumbs: [{ label: "Vendas" }],
      actions: [
        {
          label: "Nova Venda",
          href: "/vendas/nova",
          variant: "primary",
          icon: Plus
        },
        {
          label: "Importar",
          href: "/vendas/importar",
          variant: "secondary",
          icon: File_spreadsheet
        }
      ]
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    KPIGrid($$renderer2, {
      className: "mb-6",
      columns: 4,
      children: ($$renderer3) => {
        KPICard($$renderer3, {
          title: "Total de vendas",
          value: vendas.length,
          color: "vendas",
          icon: Shopping_cart
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Valor total",
          value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(resumo.total),
          color: "vendas",
          icon: Dollar_sign
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Confirmadas",
          value: resumo.confirmadas,
          color: "clientes",
          icon: Calendar
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Pendentes",
          value: resumo.pendentes,
          color: "financeiro",
          icon: Calendar
        });
        $$renderer3.push(`<!---->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    DataTable($$renderer2, {
      columns,
      data: vendas,
      color: "vendas",
      loading,
      title: "Lista de Vendas",
      filters,
      searchable: true,
      filterable: true,
      exportable: true,
      onRowClick: handleRowClick,
      onExport: handleExport,
      emptyMessage: "Nenhuma venda encontrada para o escopo atual"
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
