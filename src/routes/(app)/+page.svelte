<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Button } from 'flowbite-svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { Filter, BarChart3, Settings } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import type { ChartData } from 'chart.js';

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
    userCtx: {
      usuarioId: string;
      nome: string | null;
      papel: string;
      vendedorIds: string[];
    };
    podeVerOperacao: boolean;
    podeVerConsultoria: boolean;
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
    metas: Array<{
      id: string;
      vendedor_id: string;
      periodo: string;
      meta_geral: number;
      meta_diferenciada: number | null;
      ativo: boolean;
      scope: string | null;
    }>;
    orcamentos: Array<{
      id: string;
      created_at: string | null;
      status: string | null;
      status_negociacao: string | null;
      total: number | null;
      cliente?: { id?: string | null; nome?: string | null } | null;
      quote_item?: Array<{
        id?: string | null;
        title?: string | null;
        product_name?: string | null;
        item_type?: string | null;
        city_name?: string | null;
      }> | null;
    }>;
  }

  const emptyDashboard: DashboardPayload = {
    inicio: '',
    fim: '',
    userCtx: {
      usuarioId: '',
      nome: null,
      papel: 'VENDEDOR',
      vendedorIds: []
    },
    podeVerOperacao: false,
    podeVerConsultoria: false,
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

  function getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      inicio: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
      fim: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
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

  let dashboard: DashboardPayload = emptyDashboard;
  let loading = true;
  let showFilters = false;
  let errorMessage: string | null = null;
  let periodoInicio = currentMonth.inicio;
  let periodoFim = currentMonth.fim;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';
  let empresas: EmpresaFiltro[] = [];
  let vendedores: VendedorFiltro[] = [];

  async function loadBaseFilters() {
    try {
      const response = await fetch('/api/v1/relatorios/base');
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      empresas = data.empresas || [];
      vendedores = data.vendedores || [];
    } catch (err) {
      empresas = [];
      vendedores = [];
      toast.error('Erro ao carregar filtros do dashboard');
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

      if (empresaSelecionada) {
        params.set('company_id', empresaSelecionada);
      }

      if (vendedorSelecionado) {
        params.set('vendedor_ids', vendedorSelecionado);
      }

      const response = await fetch(`/api/v1/dashboard/summary?${params.toString()}`);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      dashboard = await response.json();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dashboard.';
      dashboard = emptyDashboard;
      toast.error(errorMessage);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void Promise.all([loadBaseFilters(), loadDashboard()]);
  });

  function applyFilters() {
    void loadDashboard();
  }

  function handleOrcamentoClick(id: string) {
    void goto(`/orcamentos/${id}`);
  }

  function getRemainingDays() {
    const today = new Date();
    const end = new Date(`${periodoFim}T23:59:59`);
    const diff = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  function getStatusColor(status: string) {
    const normalized = normalizeStatus(status);

    if (normalized.includes('enviado') || normalized.includes('confirm')) return 'text-green-600';
    if (normalized.includes('pendente')) return 'text-amber-600';
    if (normalized.includes('aprov')) return 'text-blue-600';
    if (normalized.includes('rejeit') || normalized.includes('cancel')) return 'text-red-600';

    return 'text-slate-600';
  }

  function getStatusBadgeClass(status: string) {
    const normalized = normalizeStatus(status);

    if (normalized.includes('enviado') || normalized.includes('confirm')) {
      return 'vtur-status-badge vtur-status-badge--success';
    }
    if (normalized.includes('pendente')) {
      return 'vtur-status-badge vtur-status-badge--warning';
    }
    if (normalized.includes('aprov')) {
      return 'vtur-status-badge vtur-status-badge--info';
    }
    if (normalized.includes('rejeit') || normalized.includes('cancel')) {
      return 'vtur-status-badge vtur-status-badge--danger';
    }

    return 'vtur-status-badge';
  }

  $: metaTotal = dashboard.metas.reduce((sum, meta) => sum + Number(meta.meta_geral || 0), 0);
  $: diasRestantes = getRemainingDays();
  $: faltanteMeta = Math.max(metaTotal - dashboard.vendasAgg.totalVendas, 0);
  $: metaDiaria = diasRestantes > 0 ? faltanteMeta / diasRestantes : 0;
  $: atingimento = metaTotal > 0 ? (dashboard.vendasAgg.totalVendas / metaTotal) * 100 : 0;

  $: kpis = [
    {
      title: 'VENDAS NO PERÍODO',
      value: formatCurrency(dashboard.vendasAgg.totalVendas),
      subtext: `${dashboard.vendasAgg.qtdVendas} venda(s) no período`
    },
    {
      title: 'QTD. VENDAS',
      value: String(dashboard.vendasAgg.qtdVendas),
      subtext: 'No período selecionado'
    },
    {
      title: 'TICKET MÉDIO',
      value: formatCurrency(dashboard.vendasAgg.ticketMedio),
      subtext: 'Média por venda'
    },
    {
      title: 'META DO MÊS',
      value: formatCurrency(metaTotal),
      subtext: 'Meta ativa no período'
    },
    {
      title: 'META DIÁRIA',
      value: formatCurrency(metaDiaria),
      subtext: 'Necessário para bater a meta'
    },
    {
      title: 'ATINGIMENTO META',
      value: `${atingimento.toFixed(1)}%`,
      subtext: 'Percentual alcançado'
    },
    {
      title: 'DIAS RESTANTES',
      value: String(diasRestantes),
      subtext: 'Até o fim do período'
    }
  ];

  $: vendasPorDestinoData = {
    labels: dashboard.vendasAgg.topDestinos.map((item) => item.name),
    datasets: [
      {
        data: dashboard.vendasAgg.topDestinos.map((item) => item.value),
        backgroundColor: ['#0f766e', '#16a34a', '#0ea5e9', '#f97316', '#7c3aed'],
        borderWidth: 0
      }
    ]
  } satisfies ChartData;

  $: vendasPorProdutoData = {
    labels: dashboard.vendasAgg.porProduto.map((item) => item.name),
    datasets: [
      {
        label: 'Receita por produto',
        data: dashboard.vendasAgg.porProduto.map((item) => item.value),
        backgroundColor: '#0f766e',
        borderRadius: 6
      }
    ]
  } satisfies ChartData;

  $: evolucaoVendasData = {
    labels: dashboard.vendasAgg.timeline.map((item) => formatDate(item.date)),
    datasets: [
      {
        label: 'Vendas',
        data: dashboard.vendasAgg.timeline.map((item) => item.value),
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15, 118, 110, 0.12)',
        fill: true,
        tension: 0.35
      }
    ]
  } satisfies ChartData;

  $: orcamentosRecentes = dashboard.orcamentos.map((orcamento) => {
    const firstItem = Array.isArray(orcamento.quote_item) ? orcamento.quote_item[0] : null;

    return {
      id: orcamento.id,
      data: formatDate(orcamento.created_at),
      cliente: String(orcamento.cliente?.nome || 'Cliente sem nome'),
      destino: String(
        firstItem?.city_name || firstItem?.product_name || firstItem?.title || 'Orcamento sem itens'
      ),
      status: String(orcamento.status_negociacao || orcamento.status || 'Pendente'),
      valor: formatCurrency(Number(orcamento.total || 0))
    };
  });
</script>

<svelte:head>
  <title>Dashboard | VTUR</title>
</svelte:head>

<PageHeader
  title="Dashboard comercial"
  subtitle="Acompanhe vendas, metas e orçamentos com uma leitura clara, objetiva e consistente do desempenho comercial."
  color="blue"
  breadcrumbs={[{ label: 'Dashboard' }]}
/>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
  <div>
    <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p>
    <p class="text-sm text-slate-500">Visão consolidada do período selecionado.</p>
  </div>
  <div class="flex flex-wrap gap-3">
  <Button color="light" size="sm" class="border border-slate-300 bg-white" on:click={() => (showFilters = !showFilters)}>
    <Filter size={16} class="mr-2" />
    Filtros
  </Button>
  <Button color="blue" size="sm" on:click={() => toast.info('A personalizacao de widgets sera portada na proxima etapa.')}>
    <Settings size={16} class="mr-2" />
    Personalizar dashboard
  </Button>
  <Button color="light" size="sm" class="border border-slate-300 bg-white" on:click={() => goto('/relatorios/ranking')}>
    <BarChart3 size={16} class="mr-2" />
    Ranking de vendas
  </Button>
  </div>
</div>

{#if showFilters}
  <Card color="vendas" class="mb-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label for="filtro-data-inicio" class="mb-1 block text-sm font-medium text-slate-700">Data Início</label>
        <input id="filtro-data-inicio" type="date" class="vtur-input w-full" bind:value={periodoInicio} />
      </div>
      <div>
        <label for="filtro-data-fim" class="mb-1 block text-sm font-medium text-slate-700">Data Fim</label>
        <input id="filtro-data-fim" type="date" class="vtur-input w-full" bind:value={periodoFim} />
      </div>
      <div>
        <label for="filtro-empresa" class="mb-1 block text-sm font-medium text-slate-700">Empresa</label>
        <select id="filtro-empresa" class="vtur-input w-full" bind:value={empresaSelecionada}>
          <option value="">Todas</option>
          {#each empresas as empresa}
            <option value={empresa.id}>{empresa.nome}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="filtro-vendedor" class="mb-1 block text-sm font-medium text-slate-700">Vendedor</label>
        <select id="filtro-vendedor" class="vtur-input w-full" bind:value={vendedorSelecionado}>
          <option value="">Todos</option>
          {#each vendedores as vendedor}
            <option value={vendedor.id}>{vendedor.nome}</option>
          {/each}
        </select>
      </div>
      <div class="flex items-end">
        <Button color="blue" size="sm" class="w-full" on:click={applyFilters}>
          Aplicar período
        </Button>
      </div>
    </div>
  </Card>
{/if}

{#if errorMessage}
  <div class="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {errorMessage}
  </div>
{/if}

{#if loading}
  <Card color="vendas" class="mb-6">
    <div class="py-10 text-center text-sm text-slate-500">Carregando indicadores do dashboard...</div>
  </Card>
{/if}

<div class="mb-6 w-full">
  <Card color="vendas" padding="md">
    <div class="mb-5 flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-slate-900">Indicadores do período</h3>
        <p class="text-sm text-slate-500">Resumo comercial do intervalo filtrado.</p>
      </div>
      <div class="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 md:block">
        Atualizado conforme o período ativo
      </div>
    </div>

    <div class="vtur-kpi-grid">
      {#each kpis as kpi}
        <div class="vtur-kpi-card">
          <p class="vtur-kpi-card__title">{kpi.title}</p>
          <p class="vtur-kpi-card__value" title={kpi.value}>
            {kpi.value}
          </p>
          <p class="vtur-kpi-card__subtext">{kpi.subtext}</p>
        </div>
      {/each}
    </div>
  </Card>
</div>

<div class="vtur-dashboard-grid">
  <Card color="vendas">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h3 class="text-base font-semibold text-slate-900">Vendas por destino</h3>
        <p class="text-xs text-slate-500">Top destinos por receita no período.</p>
      </div>
    </div>
    {#if dashboard.vendasAgg.topDestinos.length > 0}
      <ChartJS type="doughnut" data={vendasPorDestinoData} height={260} />
    {:else}
      <div class="py-12 text-center text-sm text-slate-500">Sem dados de destino no período.</div>
    {/if}
  </Card>

  <Card color="vendas">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h3 class="text-base font-semibold text-slate-900">Vendas por produto</h3>
        <p class="text-xs text-slate-500">Receita agregada por categoria de produto.</p>
      </div>
    </div>
    {#if dashboard.vendasAgg.porProduto.length > 0}
      <ChartJS type="bar" data={vendasPorProdutoData} height={260} />
    {:else}
      <div class="py-12 text-center text-sm text-slate-500">Sem dados de produto no período.</div>
    {/if}
  </Card>

  <Card color="vendas">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h3 class="text-base font-semibold text-slate-900">Evolução das vendas</h3>
        <p class="text-xs text-slate-500">Linha temporal de receita por dia.</p>
      </div>
    </div>
    {#if dashboard.vendasAgg.timeline.length > 0}
      <ChartJS type="line" data={evolucaoVendasData} height={260} />
    {:else}
      <div class="py-12 text-center text-sm text-slate-500">Sem evolução registrada no período.</div>
    {/if}
  </Card>
</div>

<Card color="vendas" padding="md">
  <div class="mb-4">
    <h3 class="text-base font-semibold text-slate-900">
      Orçamentos recentes ({orcamentosRecentes.length})
    </h3>
    <p class="text-xs text-slate-500">Últimas propostas comerciais registradas no período.</p>
  </div>

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
        {#if orcamentosRecentes.length === 0}
          <tr>
            <td colspan="5" class="px-4 py-10 text-center text-slate-500">
              Nenhum orçamento encontrado no período.
            </td>
          </tr>
        {:else}
          {#each orcamentosRecentes as orcamento}
            <tr class="cursor-pointer transition-colors hover:bg-slate-50/90" on:click={() => handleOrcamentoClick(orcamento.id)}>
              <td class="px-4 py-4 text-slate-600">{orcamento.data}</td>
              <td class="px-4 py-4 font-medium text-slate-900">{orcamento.cliente}</td>
              <td class="max-w-md truncate px-4 py-4 text-slate-600">{orcamento.destino}</td>
              <td class="px-4 py-4">
                <span class={getStatusBadgeClass(orcamento.status)}>{orcamento.status}</span>
              </td>
              <td class="px-4 py-4 text-right font-semibold text-slate-900">{orcamento.valor}</td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</Card>
