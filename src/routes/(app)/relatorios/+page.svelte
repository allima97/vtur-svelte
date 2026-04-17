<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import type { ChartData } from 'chart.js';
  import {
    BarChart3,
    PieChart,
    Users,
    TrendingUp,
    MapPin,
    ShoppingCart,
    ArrowRight,
    Filter
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface EmpresaFiltro {
    id: string;
    nome: string;
  }

  interface VendedorFiltro {
    id: string;
    nome: string;
  }

  interface DashboardPayload {
    inicio: string;
    fim: string;
    vendasAgg: {
      totalVendas: number;
      totalTaxas: number;
      totalLiquido: number;
      totalSeguro: number;
      qtdVendas: number;
      ticketMedio: number;
      timeline: Array<{ date: string; value: number }>;
      topDestinos: Array<{ name: string; value: number }>;
      porProduto: Array<{ id: string; name: string; value: number }>;
    };
    metas: Array<{ meta_geral: number | null }>;
    orcamentos: Array<{
      id: string;
      created_at: string | null;
      status: string | null;
      status_negociacao: string | null;
      total: number | null;
      cliente?: { nome?: string | null } | null;
      quote_item?: Array<{
        title?: string | null;
        product_name?: string | null;
        item_type?: string | null;
        city_name?: string | null;
      }> | null;
    }>;
  }

  interface BasePayload {
    empresas: EmpresaFiltro[];
    vendedores: VendedorFiltro[];
  }

  const relatorios = [
    {
      titulo: 'Vendas detalhado',
      descricao: 'Drill-down operacional com leitura por venda, cliente, destino, valor e comissão.',
      icone: ShoppingCart,
      rota: '/relatorios/vendas',
      stats: (dashboard: DashboardPayload) => `${dashboard.vendasAgg.qtdVendas} venda(s)`
    },
    {
      titulo: 'Vendas por destino',
      descricao: 'Participação por destino com caminho direto para o relatório detalhado.',
      icone: MapPin,
      rota: '/relatorios/destinos',
      stats: (dashboard: DashboardPayload) => `${dashboard.vendasAgg.topDestinos.length} destinos no topo`
    },
    {
      titulo: 'Vendas por produto',
      descricao: 'Leitura por produto, receita, margem e contribuição no período.',
      icone: PieChart,
      rota: '/relatorios/produtos',
      stats: (dashboard: DashboardPayload) => `${dashboard.vendasAgg.porProduto.length} produtos em destaque`
    },
    {
      titulo: 'Vendas por cliente',
      descricao: 'Carteira, recorrência e ticket médio com vínculo ao cadastro do cliente.',
      icone: Users,
      rota: '/relatorios/clientes',
      stats: (dashboard: DashboardPayload) => `${dashboard.orcamentos.length} orçamentos recentes relacionados`
    },
    {
      titulo: 'Ranking de vendas',
      descricao: 'Comparativo por responsável com meta, conversão, comissão e tendência.',
      icone: TrendingUp,
      rota: '/relatorios/ranking',
      stats: (dashboard: DashboardPayload) => `${formatCurrency(dashboard.vendasAgg.totalTaxas)} em comissões`
    }
  ];

  function getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      inicio: start.toISOString().slice(0, 10),
      fim: now.toISOString().slice(0, 10)
    };
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function formatDate(value: string | null) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
  }

  function normalizeStatus(status: string) {
    return status
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  const currentMonth = getCurrentMonthRange();

  let dashboard: DashboardPayload = {
    inicio: currentMonth.inicio,
    fim: currentMonth.fim,
    vendasAgg: {
      totalVendas: 0,
      totalTaxas: 0,
      totalLiquido: 0,
      totalSeguro: 0,
      qtdVendas: 0,
      ticketMedio: 0,
      timeline: [],
      topDestinos: [],
      porProduto: []
    },
    metas: [],
    orcamentos: []
  };
  let empresas: EmpresaFiltro[] = [];
  let vendedores: VendedorFiltro[] = [];
  let loading = true;
  let errorMessage: string | null = null;
  let periodoInicio = currentMonth.inicio;
  let periodoFim = currentMonth.fim;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';

  async function loadBaseFilters() {
    try {
      const response = await fetch('/api/v1/relatorios/base');
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as BasePayload;
      empresas = data.empresas || [];
      vendedores = data.vendedores || [];
    } catch (err) {
      empresas = [];
      vendedores = [];
      toast.error('Erro ao carregar filtros de relatórios');
    }
  }

  async function loadDashboard() {
    loading = true;
    errorMessage = null;

    try {
      const params = new URLSearchParams({
        inicio: periodoInicio,
        fim: periodoFim,
        include_orcamentos: '1'
      });

      if (empresaSelecionada) params.set('company_id', empresaSelecionada);
      if (vendedorSelecionado) params.set('vendedor_ids', vendedorSelecionado);

      const response = await fetch(`/api/v1/dashboard/summary?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      dashboard = await response.json();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao carregar relatórios.';
      toast.error(errorMessage);
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    await Promise.all([loadBaseFilters(), loadDashboard()]);
  });

  function applyFilters() {
    void loadDashboard();
  }

  function getStatusBadgeClass(status: string) {
    const normalized = normalizeStatus(status);
    if (normalized.includes('enviado') || normalized.includes('confirm')) return 'vtur-status-badge vtur-status-badge--success';
    if (normalized.includes('pendente')) return 'vtur-status-badge vtur-status-badge--warning';
    if (normalized.includes('aprov')) return 'vtur-status-badge vtur-status-badge--info';
    if (normalized.includes('rejeit') || normalized.includes('cancel')) return 'vtur-status-badge vtur-status-badge--danger';
    return 'vtur-status-badge';
  }

  function openRelatorio(path: string) {
    const params = new URLSearchParams({
      data_inicio: periodoInicio,
      data_fim: periodoFim
    });

    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
    if (vendedorSelecionado) params.set('vendedor_id', vendedorSelecionado);

    void goto(`${path}?${params.toString()}`);
  }

  $: metaTotal = dashboard.metas.reduce((sum, meta) => sum + Number(meta.meta_geral || 0), 0);
  $: atingimento = metaTotal > 0 ? (dashboard.vendasAgg.totalVendas / metaTotal) * 100 : 0;
  $: kpis = [
    {
      title: 'Vendas no período',
      value: formatCurrency(dashboard.vendasAgg.totalVendas),
      subtext: `${dashboard.vendasAgg.qtdVendas} venda(s)`
    },
    {
      title: 'Comissões / taxas',
      value: formatCurrency(dashboard.vendasAgg.totalTaxas),
      subtext: 'Total calculado no período'
    },
    {
      title: 'Ticket médio',
      value: formatCurrency(dashboard.vendasAgg.ticketMedio),
      subtext: 'Média por venda'
    },
    {
      title: 'Meta do período',
      value: formatCurrency(metaTotal),
      subtext: `${atingimento.toFixed(1)}% atingido`
    }
  ];

  $: vendasPorMesData = {
    labels: dashboard.vendasAgg.timeline.map((item) => formatDate(item.date)),
    datasets: [
      {
        label: 'Receita',
        data: dashboard.vendasAgg.timeline.map((item) => item.value),
        backgroundColor: '#f97316',
        borderColor: '#ea580c',
        borderWidth: 2
      }
    ]
  } satisfies ChartData;

  $: vendasPorDestinoData = {
    labels: dashboard.vendasAgg.topDestinos.map((item) => item.name),
    datasets: [
      {
        label: 'Receita',
        data: dashboard.vendasAgg.topDestinos.map((item) => item.value),
        backgroundColor: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#fff7ed']
      }
    ]
  } satisfies ChartData;
</script>

<svelte:head>
  <title>Relatórios | VTUR</title>
</svelte:head>

<PageHeader
  title="Relatórios"
  subtitle="Hub analítico com KPIs, gráficos e atalhos de drill-down para a operação real."
  color="financeiro"
  breadcrumbs={[{ label: 'Relatórios' }]}
/>

<Card color="financeiro" class="mb-6">
  <div class="flex flex-col lg:flex-row gap-4 items-end">
    <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <div>
        <label for="relatorios-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data início</label>
        <input id="relatorios-data-inicio" type="date" bind:value={periodoInicio} class="vtur-input w-full" />
      </div>
      <div>
        <label for="relatorios-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data fim</label>
        <input id="relatorios-data-fim" type="date" bind:value={periodoFim} class="vtur-input w-full" />
      </div>
      <div>
        <label for="relatorios-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
        <select id="relatorios-empresa" bind:value={empresaSelecionada} class="vtur-input w-full">
          <option value="">Todas</option>
          {#each empresas as empresa}
            <option value={empresa.id}>{empresa.nome}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="relatorios-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label>
        <select id="relatorios-vendedor" bind:value={vendedorSelecionado} class="vtur-input w-full">
          <option value="">Todos</option>
          {#each vendedores as vendedor}
            <option value={vendedor.id}>{vendedor.nome}</option>
          {/each}
        </select>
      </div>
      <div class="flex items-end">
        <Button variant="primary" color="financeiro" class_name="w-full" on:click={applyFilters}>
          <Filter size={16} class="mr-2" />
          Atualizar
        </Button>
      </div>
    </div>
  </div>
</Card>

{#if errorMessage}
  <div class="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {errorMessage}
  </div>
{/if}

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  {#each kpis as item}
    <div class="vtur-card p-5 border-l-4 border-l-financeiro-500">
      <p class="text-sm text-slate-500">{item.title}</p>
      <p class="text-2xl font-bold text-slate-900">{item.value}</p>
      <p class="mt-2 text-xs text-slate-500">{item.subtext}</p>
    </div>
  {/each}
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  <Card header="Evolução das vendas" color="financeiro">
    <ChartJS type="bar" data={vendasPorMesData} height={280} />
  </Card>

  <Card header="Top destinos" color="financeiro">
    <ChartJS type="doughnut" data={vendasPorDestinoData} height={280} />
  </Card>
</div>

<h2 class="text-lg font-semibold text-slate-900 mb-4">Relatórios disponíveis</h2>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
  {#each relatorios as relatorio}
    <Card color="financeiro" class="group hover:shadow-lg transition-all duration-200">
      <div class="mb-4 flex items-start justify-between">
        <div class="rounded-lg bg-financeiro-50 p-3">
          <svelte:component this={relatorio.icone} size={24} class="text-financeiro-600" />
        </div>
        <span class="rounded-full bg-financeiro-50 px-2 py-1 text-xs font-medium text-financeiro-700">
          {relatorio.stats(dashboard)}
        </span>
      </div>

      <h3 class="text-lg font-semibold text-slate-900 mb-1">{relatorio.titulo}</h3>
      <p class="text-sm text-slate-500 mb-3">{relatorio.descricao}</p>

      <button
        on:click={() => openRelatorio(relatorio.rota)}
        class="inline-flex items-center gap-1 text-sm font-medium text-financeiro-600 hover:text-financeiro-700 transition-colors"
      >
        Abrir relatório
        <ArrowRight size={16} class="group-hover:translate-x-1 transition-transform" />
      </button>
    </Card>
  {/each}
</div>

<Card header="Orçamentos recentes" color="financeiro">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="vtur-table__head">
        <tr>
          <th class="px-4 py-3 text-left">Data</th>
          <th class="px-4 py-3 text-left">Cliente</th>
          <th class="px-4 py-3 text-left">Destino</th>
          <th class="px-4 py-3 text-left">Status</th>
          <th class="px-4 py-3 text-right">Valor</th>
        </tr>
      </thead>
      <tbody class="vtur-table__body">
        {#if loading}
          <tr>
            <td colspan="5" class="px-4 py-10 text-center text-slate-500">Carregando relatórios...</td>
          </tr>
        {:else if dashboard.orcamentos.length === 0}
          <tr>
            <td colspan="5" class="px-4 py-10 text-center text-slate-500">Nenhum orçamento encontrado no período.</td>
          </tr>
        {:else}
          {#each dashboard.orcamentos as orcamento}
            {@const firstItem = Array.isArray(orcamento.quote_item) ? orcamento.quote_item[0] : null}
            <tr class="cursor-pointer transition-colors hover:bg-slate-50/90" on:click={() => goto(`/orcamentos/${orcamento.id}`)}>
              <td class="px-4 py-4 text-slate-600">{formatDate(orcamento.created_at)}</td>
              <td class="px-4 py-4 font-medium text-slate-900">{String(orcamento.cliente?.nome || 'Cliente sem nome')}</td>
              <td class="px-4 py-4 text-slate-600">
                {String(firstItem?.city_name || firstItem?.product_name || firstItem?.title || firstItem?.item_type || 'Sem itens')}
              </td>
              <td class="px-4 py-4">
                <span class={getStatusBadgeClass(String(orcamento.status_negociacao || orcamento.status || 'Pendente'))}>
                  {String(orcamento.status_negociacao || orcamento.status || 'Pendente')}
                </span>
              </td>
              <td class="px-4 py-4 text-right font-semibold text-slate-900">{formatCurrency(Number(orcamento.total || 0))}</td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</Card>
