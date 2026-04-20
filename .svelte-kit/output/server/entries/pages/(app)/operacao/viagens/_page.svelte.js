import { h as head } from "../../../../../chunks/index2.js";
import { g as goto } from "../../../../../chunks/client.js";
import { D as DataTable } from "../../../../../chunks/DataTable.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { K as KPICard } from "../../../../../chunks/KPICard.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { P as Plane } from "../../../../../chunks/plane.js";
import { C as Calendar } from "../../../../../chunks/calendar.js";
import { C as Clock } from "../../../../../chunks/clock.js";
import { F as File_text } from "../../../../../chunks/file-text.js";
import { U as Users } from "../../../../../chunks/users.js";
import { C as Credit_card } from "../../../../../chunks/credit-card.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let resumo;
    let viagens = [];
    let viagensFiltradas = [];
    let loading = true;
    let errorMessage = null;
    let filtroBusca = "";
    let filtroStatus = "";
    let filtroPeriodo = "";
    async function loadViagens() {
      loading = true;
      errorMessage = null;
      try {
        const params = new URLSearchParams();
        if (filtroStatus) params.set("status", filtroStatus);
        if (filtroPeriodo) params.set("periodo", filtroPeriodo);
        const response = await fetch(`/api/v1/viagens?${params.toString()}`);
        if (!response.ok) throw new Error("Erro ao carregar viagens");
        const data = await response.json();
        viagens = (data.items || []).map((v) => ({
          id: v.id,
          codigo: v.venda_id ? `VND-${v.venda_id.slice(0, 8)}` : v.id.slice(0, 8),
          cliente: v.cliente_nome,
          cliente_id: v.cliente_id,
          destino: v.destino,
          data_inicio: v.data_inicio,
          data_fim: v.data_fim,
          numero_pessoas: v.numero_passageiros || 1,
          dias_viagem: calcularDias(v.data_inicio, v.data_fim),
          status: normalizarStatus(v.status),
          tipo: v.tipo_viagem || "nacional",
          valor_total: v.valor_total || 0,
          responsavel: v.responsavel_nome || "Não atribuído",
          venda_id: v.venda_id,
          created_at: v.created_at
        }));
        aplicarFiltrosBusca();
      } catch (err) {
        errorMessage = "Erro ao carregar viagens";
        toast.error(errorMessage);
        viagens = [];
        viagensFiltradas = [];
      } finally {
        loading = false;
      }
    }
    function normalizarStatus(status) {
      const statusMap = {
        "planejada": "programada",
        "programada": "programada",
        "confirmada": "programada",
        "em_viagem": "em_andamento",
        "em_andamento": "em_andamento",
        "concluida": "concluida",
        "cancelada": "cancelada"
      };
      return statusMap[status] || "programada";
    }
    function calcularDias(inicio, fim) {
      if (!inicio || !fim) return 0;
      const d1 = new Date(inicio);
      const d2 = new Date(fim);
      const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1e3 * 60 * 60 * 24));
      return diff + 1;
    }
    function aplicarFiltrosBusca() {
      if (!filtroBusca.trim()) {
        viagensFiltradas = viagens;
        return;
      }
      const termo = filtroBusca.toLowerCase().trim();
      viagensFiltradas = viagens.filter((v) => v.cliente?.toLowerCase().includes(termo) || v.destino?.toLowerCase().includes(termo) || v.codigo?.toLowerCase().includes(termo) || v.responsavel?.toLowerCase().includes(termo));
    }
    function handleBusca(valor) {
      filtroBusca = valor;
      aplicarFiltrosBusca();
    }
    function handleFiltroChange(key, value) {
      if (key === "status") {
        filtroStatus = value;
      } else if (key === "periodo") {
        filtroPeriodo = value;
      }
      loadViagens();
    }
    function handleRowClick(row) {
      goto(`/operacao/viagens/${row.id}`);
    }
    function handleExport() {
      if (viagensFiltradas.length === 0) {
        toast.info("Não há viagens para exportar");
        return;
      }
      const headers = [
        "Código",
        "Cliente",
        "Destino",
        "Início",
        "Fim",
        "Dias",
        "Pessoas",
        "Status",
        "Valor"
      ];
      const rows = viagensFiltradas.map((v) => [
        v.codigo,
        v.cliente,
        v.destino,
        v.data_inicio ? new Date(v.data_inicio).toLocaleDateString("pt-BR") : "",
        v.data_fim ? new Date(v.data_fim).toLocaleDateString("pt-BR") : "",
        v.dias_viagem.toString(),
        v.numero_pessoas.toString(),
        v.status,
        v.valor_total.toFixed(2).replace(".", ",")
      ]);
      const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `viagens_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success("Viagens exportadas com sucesso!");
    }
    const columns = [
      {
        key: "codigo",
        label: "Código",
        sortable: true,
        width: "120px"
      },
      {
        key: "cliente",
        label: "Cliente / Destino",
        sortable: true,
        formatter: (value, row) => {
          return `<div class="flex flex-col">
          <span class="font-medium text-slate-900">${value}</span>
          <span class="text-xs text-slate-500 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full ${row.tipo === "internacional" ? "bg-purple-400" : "bg-green-400"}"></span>
            ${row.destino}
          </span>
        </div>`;
        }
      },
      {
        key: "data_inicio",
        label: "Período",
        sortable: true,
        width: "150px",
        formatter: (value, row) => {
          const hoje = /* @__PURE__ */ new Date();
          const inicio = new Date(value);
          const fim = new Date(row.data_fim);
          let alerta = "";
          if (inicio <= hoje && hoje <= fim) {
            alerta = '<span class="text-amber-600 font-medium">• Em viagem</span>';
          } else if (inicio < hoje) {
            alerta = '<span class="text-slate-400">• Concluída</span>';
          } else {
            const dias = Math.ceil((inicio.getTime() - hoje.getTime()) / (1e3 * 60 * 60 * 24));
            if (dias <= 7) alerta = `<span class="text-red-600 font-medium">• Falta ${dias}d</span>`;
          }
          return `<div class="text-sm">
          <div>${inicio.toLocaleDateString("pt-BR")} - ${fim.toLocaleDateString("pt-BR")}</div>
          <div class="text-xs">${row.dias_viagem} dias ${alerta}</div>
        </div>`;
        }
      },
      {
        key: "numero_pessoas",
        label: "Viajantes",
        sortable: true,
        width: "90px",
        align: "center",
        formatter: (value) => `<span class="inline-flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> ${value}</span>`
      },
      {
        key: "valor_total",
        label: "Valor",
        sortable: true,
        width: "120px",
        align: "right",
        formatter: (value) => {
          return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
        }
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "130px",
        formatter: (value) => {
          const styles = {
            programada: "bg-blue-100 text-blue-700",
            em_andamento: "bg-amber-100 text-amber-700",
            concluida: "bg-green-100 text-green-700",
            cancelada: "bg-red-100 text-red-700"
          };
          const labels = {
            programada: "Programada",
            em_andamento: "Em andamento",
            concluida: "Concluída",
            cancelada: "Cancelada"
          };
          return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[value]}">${labels[value]}</span>`;
        }
      },
      {
        key: "responsavel",
        label: "Responsável",
        sortable: true,
        width: "130px"
      }
    ];
    const filters = [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "", label: "Todos" },
          { value: "programada", label: "Programada" },
          { value: "em_andamento", label: "Em andamento" },
          { value: "concluida", label: "Concluída" },
          { value: "cancelada", label: "Cancelada" }
        ]
      },
      {
        key: "periodo",
        label: "Período",
        type: "select",
        options: [
          { value: "", label: "Todos" },
          { value: "hoje", label: "Hoje" },
          { value: "semana", label: "Esta semana" },
          { value: "mes", label: "Este mês" },
          { value: "proximos_30", label: "Próximos 30 dias" }
        ]
      }
    ];
    function getResumo() {
      const lista = viagensFiltradas.length > 0 ? viagensFiltradas : viagens;
      const programadas = lista.filter((v) => v.status === "programada").length;
      const emAndamento = lista.filter((v) => v.status === "em_andamento").length;
      const concluidas = lista.filter((v) => v.status === "concluida").length;
      const canceladas = lista.filter((v) => v.status === "cancelada").length;
      const totalViajantes = lista.reduce((acc, v) => acc + v.numero_pessoas, 0);
      const valorTotal = lista.reduce((acc, v) => acc + (v.valor_total || 0), 0);
      return {
        total: lista.length,
        programadas,
        emAndamento,
        concluidas,
        canceladas,
        totalViajantes,
        valorTotal
      };
    }
    resumo = getResumo();
    head("1j3f588", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Viagens | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Viagens",
      subtitle: "Gerencie as viagens programadas e acompanhe o status operacional",
      color: "clientes",
      breadcrumbs: [
        { label: "Operação", href: "/operacao" },
        { label: "Viagens" }
      ],
      actions: [
        {
          label: "Nova Viagem",
          href: "/operacao/viagens/nova",
          variant: "primary",
          icon: Plus
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="vtur-kpi-grid vtur-kpi-grid-6 mb-6">`);
    KPICard($$renderer2, {
      title: "Total",
      value: resumo.total,
      color: "clientes",
      icon: Plane
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Programadas",
      value: resumo.programadas,
      color: "clientes",
      icon: Calendar
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Em Andamento",
      value: resumo.emAndamento,
      color: "clientes",
      icon: Clock
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Concluídas",
      value: resumo.concluidas,
      color: "clientes",
      icon: File_text
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Viajantes",
      value: resumo.totalViajantes,
      color: "clientes",
      icon: Users
    });
    $$renderer2.push(`<!----> `);
    KPICard($$renderer2, {
      title: "Valor Total",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(resumo.valorTotal),
      color: "clientes",
      icon: Credit_card
    });
    $$renderer2.push(`<!----></div> `);
    DataTable($$renderer2, {
      columns,
      data: viagensFiltradas,
      color: "clientes",
      loading,
      title: "Lista de Viagens",
      filters,
      searchable: true,
      filterable: true,
      exportable: true,
      onRowClick: handleRowClick,
      onExport: handleExport,
      onSearch: handleBusca,
      onFilterChange: handleFiltroChange,
      emptyMessage: "Nenhuma viagem encontrada"
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
