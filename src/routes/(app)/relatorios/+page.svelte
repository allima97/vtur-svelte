<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import type { ChartData, ChartOptions } from 'chart.js';
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
  import { permissoes } from '$lib/stores/permissoes';

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

  function getMonthRange(ym: string) {
    const [y, m] = ym.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return {
      inicio: start.toISOString().slice(0, 10),
      fim: end.toISOString().slice(0, 10)
    };
  }

  const lineChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(ctx.raw))}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148,163,184,0.1)' },
        ticks: { font: { size: 11, family: "'Inter', sans-serif" } }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: "'Inter', sans-serif" } }
      }
    }
  };

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
  const defaultMonth = new Date().toISOString().slice(0, 7);

  let mesSelecionado = defaultMonth;
  let applyFiltersTimer: ReturnType<typeof setTimeout> | null = null;

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

  onDestroy(() => {
    if (applyFiltersTimer) clearTimeout(applyFiltersTimer);
  });

  function applyFilters() {
    void loadDashboard();
  }

  function scheduleApply() {
    if (applyFiltersTimer) clearTimeout(applyFiltersTimer);
    applyFiltersTimer = setTimeout(() => {
      void loadDashboard();
      applyFiltersTimer = null;
    }, 400);
  }

  $: if ($permissoes.isVendedor && mesSelecionado) {
    const range = getMonthRange(mesSelecionado);
    periodoInicio = range.inicio;
    periodoFim = range.fim;
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
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: '#6366f1',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
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
  {#if $permissoes.isVendedor}
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FieldInput
        id="relatorios-mes"
        label="Mês"
        type="month"
        bind:value={mesSelecionado}
        class_name="w-full"
        on:change={scheduleApply}
      />
    </div>
  {:else}
    <div class="flex flex-col lg:flex-row gap-4 items-end">
      <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <FieldInput id="relatorios-data-inicio" label="Data início" type="date" bind:value={periodoInicio} class_name="w-full" />
        <FieldInput id="relatorios-data-fim" label="Data fim" type="date" bind:value={periodoFim} min={periodoInicio || null} class_name="w-full" />
        <FieldSelect
          id="relatorios-empresa"
          label="Empresa"
          bind:value={empresaSelecionada}
          options={[{ value: '', label: 'Todas' }, ...empresas.map((e) => ({ value: e.id, label: e.nome }))]}
          placeholder="Todas"
          class_name="w-full"
        />
        <FieldSelect
          id="relatorios-vendedor"
          label="Vendedor"
          bind:value={vendedorSelecionado}
          options={[{ value: '', label: 'Todos' }, ...vendedores.map((v) => ({ value: v.id, label: v.nome }))]}
          placeholder="Todos"
          class_name="w-full"
        />
        <div class="flex items-end">
          <Button variant="secondary" color="financeiro" class_name="w-full" on:click={applyFilters}>
            <Filter size={16} class="mr-2" />
            Atualizar
          </Button>
        </div>
      </div>
    </div>
  {/if}
</Card>

{#if errorMessage}
  <div class="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {errorMessage}
  </div>
{/if}

<div class="vtur-kpi-grid mb-8">
  {#each kpis as item}
    <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
      <div>
        <p class="text-sm font-medium text-slate-500">{item.title}</p>
        <p class="text-2xl font-bold text-slate-900">{item.value}</p>
        <p class="mt-1 text-xs text-slate-400">{item.subtext}</p>
      </div>
    </div>
  {/each}
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  <Card header="Evolução das vendas" color="financeiro">
    <ChartJS type="line" data={vendasPorMesData} options={lineChartOptions} height={280} />
  </Card>

  <Card header="Top destinos" color="financeiro">
    <ChartJS type="doughnut" data={vendasPorDestinoData} height={280} />
  </Card>
</div>

<Card color="financeiro" class="mb-8">
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-lg font-semibold text-slate-900">Relatórios disponíveis</h2>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
    {#each relatorios as relatorio}
      <Card color="financeiro" class="group h-full hover:shadow-lg transition-all duration-200 !p-4">
        <div class="mb-3 flex items-start justify-between gap-2">
          <div class="rounded-lg bg-financeiro-50 p-2.5">
            <svelte:component this={relatorio.icone} size={20} class="text-financeiro-600" />
          </div>
          <span class="rounded-full bg-financeiro-50 px-2 py-1 text-[11px] font-medium leading-tight text-financeiro-700 text-right">
            {relatorio.stats(dashboard)}
          </span>
        </div>

        <h3 class="mb-1 text-base font-semibold leading-tight text-slate-900">{relatorio.titulo}</h3>
        <p class="mb-3 text-xs leading-5 text-slate-500">{relatorio.descricao}</p>

        <Button
          on:click={() => openRelatorio(relatorio.rota)}
          variant="unstyled"
          size="sm"
          class_name="inline-flex items-center gap-1 text-sm font-medium text-financeiro-600 hover:text-financeiro-700 transition-colors"
        >
          Abrir relatório
          <ArrowRight size={16} class="group-hover:translate-x-1 transition-transform" />
        </Button>
      </Card>
    {/each}
  </div>
</Card>


