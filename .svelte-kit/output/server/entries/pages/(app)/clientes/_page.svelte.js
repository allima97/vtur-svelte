import { h as head, e as escape_html } from "../../../../chunks/index2.js";
import { g as goto } from "../../../../chunks/client.js";
import { D as DataTable } from "../../../../chunks/DataTable.js";
import { P as PageHeader } from "../../../../chunks/PageHeader.js";
import { K as KPICard } from "../../../../chunks/KPICard.js";
import { K as KPIGrid } from "../../../../chunks/KPIGrid.js";
import { t as toast } from "../../../../chunks/ui.js";
import { P as Plus } from "../../../../chunks/plus.js";
import { U as Users } from "../../../../chunks/users.js";
import { C as Clock } from "../../../../chunks/clock.js";
import { C as Calendar_days } from "../../../../chunks/calendar-days.js";
import { W as Wallet } from "../../../../chunks/wallet.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let statusAtivos, aniversariantesHoje, totalCarteira, clientesComViagem, clientesEmNegociacao, filters;
    let clientes = [];
    let loading = true;
    const columns = [
      {
        key: "nome",
        label: "Cliente",
        sortable: true,
        formatter: (_value, row) => {
          const aniversario = row.aniversario_hoje ? '<span class="ml-2 rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-700">Aniversario</span>' : "";
          const tags = row.tags.length ? `<div class="mt-1 text-xs text-slate-500">${row.tags.join(", ")}</div>` : "";
          return `<div><div class="font-semibold text-slate-900">${row.nome}${aniversario}</div><div class="text-xs text-slate-500">${row.email || "Sem e-mail"}</div>${tags}</div>`;
        }
      },
      { key: "documento", label: "CPF/CNPJ", sortable: true },
      {
        key: "contato",
        label: "Contato",
        sortable: true,
        formatter: (_value, row) => `<div><div>${row.whatsapp || row.telefone || "-"}</div><div class="text-xs text-slate-500">${row.email || "Sem e-mail"}</div></div>`
      },
      {
        key: "cidade_uf",
        label: "Cidade/UF",
        sortable: true,
        formatter: (value) => value || "-"
      },
      {
        key: "tipo_pessoa",
        label: "Tipo",
        sortable: true,
        formatter: (value, row) => `${value === "PJ" ? "PJ" : "PF"} · ${row.tipo_cliente || "passageiro"}`
      },
      {
        key: "classificacao",
        label: "Classificacao",
        sortable: true,
        formatter: (value) => value || "-"
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        formatter: (value, row) => {
          const styles = {
            ativo: "bg-green-100 text-green-700",
            inativo: "bg-red-100 text-red-700",
            prospect: "bg-blue-100 text-blue-700"
          };
          const labels = { ativo: "Ativo", inativo: "Inativo", prospect: "Prospect" };
          const extra = row.total_viagens > 0 ? ` · ${row.total_viagens} viagens` : row.total_orcamentos > 0 ? ` · ${row.total_orcamentos} orc.` : "";
          return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value]}">${labels[value]}${extra}</span>`;
        }
      },
      {
        key: "total_gasto",
        label: "Total Gasto",
        sortable: true,
        align: "right",
        formatter: (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0)
      },
      {
        key: "ultima_compra",
        label: "Ultima Compra",
        sortable: true,
        formatter: (value, row) => value ? `${new Date(value).toLocaleDateString("pt-BR")} · ${row.total_orcamentos} orc.` : row.total_orcamentos > 0 ? `Sem venda · ${row.total_orcamentos} orc.` : "-"
      }
    ];
    function handleRowClick(row) {
      goto(`/clientes/${row.id}`);
    }
    function handleExport() {
      toast.info("Exportacao ainda pendente. A listagem real de clientes ja esta conectada.");
    }
    statusAtivos = clientes.filter((item) => item.status === "ativo").length;
    aniversariantesHoje = clientes.filter((item) => item.aniversario_hoje).length;
    totalCarteira = clientes.reduce((acc, item) => acc + Number(item.total_gasto || 0), 0);
    clientesComViagem = clientes.filter((item) => item.total_viagens > 0).length;
    clientesEmNegociacao = clientes.filter((item) => item.total_orcamentos > 0 && item.total_viagens === 0).length;
    filters = [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "ativo", label: "Ativo" },
          { value: "inativo", label: "Inativo" },
          { value: "prospect", label: "Prospect" }
        ]
      },
      {
        key: "estado",
        label: "Estado",
        type: "select",
        options: Array.from(new Set(clientes.map((cliente) => String(cliente.estado || "").trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right, "pt-BR")).map((uf) => ({ value: uf, label: uf }))
      },
      {
        key: "tipo_pessoa",
        label: "Tipo de Pessoa",
        type: "select",
        options: [
          { value: "PF", label: "Pessoa Fisica" },
          { value: "PJ", label: "Pessoa Juridica" }
        ]
      },
      {
        key: "classificacao",
        label: "Classificacao",
        type: "select",
        options: ["A", "B", "C", "D", "E"].map((item) => ({ value: item, label: item }))
      },
      {
        key: "aniversario_hoje",
        label: "Aniversariante Hoje",
        type: "select",
        options: [
          { value: "true", label: "Sim" },
          { value: "false", label: "Nao" }
        ]
      }
    ];
    head("1hp9571", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Clientes | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Clientes",
      subtitle: "Carteira de clientes com contato, historico comercial e relacionamento com vendas e orcamentos.",
      breadcrumbs: [{ label: "Clientes" }],
      actions: [
        {
          label: "Novo Cliente",
          href: "/clientes/novo",
          variant: "primary",
          icon: Plus
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p> <p class="text-sm text-slate-500">Resumo da carteira com foco em relacionamento, negociacao e reativacao.</p></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    KPIGrid($$renderer2, {
      className: "mb-6",
      columns: 5,
      children: ($$renderer3) => {
        KPICard($$renderer3, {
          title: "Clientes na carteira",
          value: clientes.length,
          color: "clientes",
          icon: Users
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Clientes ativos",
          value: statusAtivos,
          color: "operacao",
          icon: Users
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Em negociação",
          value: clientesEmNegociacao,
          color: "financeiro",
          icon: Clock
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Aniversariantes hoje",
          value: aniversariantesHoje,
          color: "clientes",
          icon: Calendar_days
        });
        $$renderer3.push(`<!----> `);
        KPICard($$renderer3, {
          title: "Total gasto",
          value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCarteira),
          color: "slate",
          icon: Wallet
        });
        $$renderer3.push(`<!---->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">A carteira consolida <strong class="text-slate-900">${escape_html(clientesComViagem)}</strong> clientes com histórico de viagens e <strong class="text-slate-900">${escape_html(clientesEmNegociacao)}</strong> em negociação com orçamentos em aberto.</div> `);
    DataTable($$renderer2, {
      columns,
      data: clientes,
      color: "clientes",
      loading,
      title: "Carteira de Clientes",
      filters,
      searchable: true,
      filterable: true,
      exportable: true,
      onRowClick: handleRowClick,
      onExport: handleExport,
      emptyMessage: "Nenhum cliente encontrado para o escopo atual"
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
