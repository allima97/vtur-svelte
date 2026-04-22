<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import CalculatorModal from '$lib/components/modais/CalculatorModal.svelte';
  import DashboardCustomizeDialog from './DashboardCustomizeDialog.svelte';
  import {
    Filter,
    RefreshCw,
    TrendingUp,
    ShoppingCart,
    Target,
    Calendar,
    FileText,
    Award,
    SlidersHorizontal,
    Calculator
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';
  import {
    buildDashboardPrefsPayload,
    createVisibilityMap,
    DASHBOARD_KPIS,
    DASHBOARD_WIDGETS,
    DEFAULT_KPI_ORDER,
    DEFAULT_WIDGET_ORDER,
    moveItem,
    parseDashboardPrefs,
    readDashboardPrefsFromStorage,
    saveDashboardPrefsToStorage,
    type DashboardKpiId,
    type DashboardWidgetId,
    type WidgetPrefRow
  } from './dashboardPrefs';

  export let title = 'Dashboard';
  export let subtitle = '';

  type VendasAgg = {
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

  type Meta = {
    id: string;
    vendedor_id: string;
    periodo: string;
    meta_geral: number;
    meta_diferenciada: number;
    ativo: boolean;
    scope?: string | null;
  };

  type Orcamento = {
    id: string;
    created_at: string;
    status: string | null;
    status_negociacao?: string | null;
    total: number | null;
    cliente?: { id: string; nome?: string | null } | null;
    quote_item?: Array<{ title?: string | null; product_name?: string | null; city_name?: string | null }> | null;
  };

  type Aniversariante = {
    id: string;
    nome: string;
    nascimento: string | null;
    telefone?: string | null;
    whatsapp?: string | null;
    pessoa_tipo?: string | null;
    cliente_id?: string | null;
  };

  type Viagem = {
    id: string;
    venda_id?: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    status: string | null;
    origem: string | null;
    destino: string | null;
    clientes?: { nome: string | null } | null;
    recibo?: { numero_recibo?: string | null } | null;
  };

  type FollowUp = {
    id: string;
    venda_id: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    follow_up_fechado?: boolean | null;
    venda?: {
      data_embarque: string | null;
      clientes?: { nome: string | null; whatsapp?: string | null; telefone?: string | null } | null;
      destino_cidade?: { nome: string | null } | null;
    } | null;
  };

  type Consultoria = {
    id: string;
    cliente_nome: string;
    data_hora: string;
    lembrete: string;
    destino: string | null;
    orcamento_id: string | null;
  };

  let loading = true;
  let errorMessage: string | null = null;
  let showCustomize = false;
  let savingCustomize = false;
  let showCalculator = false;

  function getDefaultPeriod() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return {
      inicio: `${y}-${m}-01`,
      fim: today.toISOString().slice(0, 10)
    };
  }

  const defaultPeriod = getDefaultPeriod();

  let periodoInicio = defaultPeriod.inicio;
  let periodoFim = defaultPeriod.fim;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';

  let vendasAgg: VendasAgg = {
    totalVendas: 0,
    totalTaxas: 0,
    totalLiquido: 0,
    totalSeguro: 0,
    qtdVendas: 0,
    ticketMedio: 0,
    timeline: [],
    topDestinos: [],
    porProduto: []
  };
  let metas: Meta[] = [];
  let orcamentos: Orcamento[] = [];
  let userCtx: { nome: string | null; papel: string; vendedorIds: string[] } | null = null;
  let podeVerOperacao = false;
  let podeVerConsultoria = false;

  let aniversariantes: Aniversariante[] = [];
  let viagens: Viagem[] = [];
  let followUps: FollowUp[] = [];
  let consultorias: Consultoria[] = [];

  let empresas: { id: string; nome: string }[] = [];
  let vendedoresFiltro: { id: string; nome: string }[] = [];

  let widgetOrder: DashboardWidgetId[] = [...DEFAULT_WIDGET_ORDER];
  let widgetVisible = createVisibilityMap(DEFAULT_WIDGET_ORDER, true);
  let kpiOrder: DashboardKpiId[] = [...DEFAULT_KPI_ORDER];
  let kpiVisible = createVisibilityMap(DEFAULT_KPI_ORDER, true);

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const [y, m, d] = String(value).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  function formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    const d = new Date(value);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  $: metaTotal = metas.reduce((sum, m) => sum + Number(m.meta_geral || 0), 0);
  $: atingimentoPct = metaTotal > 0 ? (vendasAgg.totalVendas / metaTotal) * 100 : 0;
  $: qtdOrcamentos = orcamentos.length;
  $: conversaoPct = qtdOrcamentos > 0 ? (vendasAgg.qtdVendas / qtdOrcamentos) * 100 : 0;

  $: diasRestantes = (() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    fimMes.setHours(0, 0, 0, 0);
    const diff = Math.ceil((fimMes.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  })();

  $: metaDiaria = (() => {
    const restante = metaTotal - vendasAgg.totalVendas;
    if (diasRestantes <= 0 || restante <= 0) return 0;
    return restante / diasRestantes;
  })();

  $: timelineChartData = {
    labels: vendasAgg.timeline.map((t) => formatDate(t.date)),
    datasets: [
      {
        label: 'Receita',
        data: vendasAgg.timeline.map((t) => t.value),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.12)',
        fill: true,
        tension: 0.3
      }
    ]
  } satisfies ChartData;

  $: destinoChartData = {
    labels: vendasAgg.topDestinos.map((d) => d.name),
    datasets: [
      {
        label: 'Receita',
        data: vendasAgg.topDestinos.map((d) => d.value),
        backgroundColor: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5']
      }
    ]
  } satisfies ChartData;

  $: produtoChartData = {
    labels: vendasAgg.porProduto.map((p) => p.name),
    datasets: [
      {
        label: 'Receita',
        data: vendasAgg.porProduto.map((p) => p.value),
        backgroundColor: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#e2e8f0']
      }
    ]
  } satisfies ChartData;

  $: availableWidgetIds = DEFAULT_WIDGET_ORDER.filter((id) => {
    if (id === 'consultorias' && !podeVerConsultoria) return false;
    if (id === 'viagens' && !podeVerOperacao) return false;
    return true;
  });

  $: activeWidgetOrder = widgetOrder.filter((id) => availableWidgetIds.includes(id) && widgetVisible[id] !== false);

  $: activeKpiOrder = kpiOrder.filter((id) => {
    if (kpiVisible[id] === false) return false;
    if (id === 'seguro_viagem' && !loading && vendasAgg.totalSeguro <= 0) return false;
    return true;
  });

  $: kpiGridColumns = (() => {
    const count = Math.max(1, activeKpiOrder.length);
    if (count >= 6) return 6;
    if (count === 5) return 5;
    if (count === 4) return 4;
    if (count === 3) return 3;
    if (count === 2) return 2;
    return 1;
  })() as 1 | 2 | 3 | 4 | 5 | 6;

  async function loadBase() {
    try {
      const data = await apiGet<{ empresas: { id: string; nome: string }[]; vendedores: { id: string; nome: string }[] }>('/api/v1/relatorios/base');
      empresas = data.empresas || [];
      vendedoresFiltro = data.vendedores || [];
    } catch {
      empresas = [];
      vendedoresFiltro = [];
    }
  }

  function applyPrefs(rows: WidgetPrefRow[]) {
    if (rows.length > 0) {
      const parsed = parseDashboardPrefs(rows);
      widgetOrder = parsed.widgetOrder;
      widgetVisible = parsed.widgetVisible;
      kpiOrder = parsed.kpiOrder;
      kpiVisible = parsed.kpiVisible;
      saveDashboardPrefsToStorage('dashboard_widgets', parsed.widgetOrder, parsed.widgetVisible);
      saveDashboardPrefsToStorage('dashboard_kpis', parsed.kpiOrder, parsed.kpiVisible);
      return;
    }

    const widgetStorage = readDashboardPrefsFromStorage('dashboard_widgets', DEFAULT_WIDGET_ORDER);
    const kpiStorage = readDashboardPrefsFromStorage('dashboard_kpis', DEFAULT_KPI_ORDER);

    if (widgetStorage) {
      widgetOrder = widgetStorage.order;
      widgetVisible = widgetStorage.visible;
    }
    if (kpiStorage) {
      kpiOrder = kpiStorage.order;
      kpiVisible = kpiStorage.visible;
    }
  }

  async function loadDashboard() {
    loading = true;
    errorMessage = null;

    try {
      const data = await apiGet<any>('/api/v1/dashboard/summary', {
        inicio: periodoInicio,
        fim: periodoFim,
        include_orcamentos: 1,
        company_id: empresaSelecionada || undefined,
        vendedor_ids: vendedorSelecionado || undefined
      });

      vendasAgg = data.vendasAgg || vendasAgg;
      metas = data.metas || [];
      orcamentos = data.orcamentos || [];
      userCtx = data.userCtx || null;
      podeVerOperacao = Boolean(data.podeVerOperacao);
      podeVerConsultoria = Boolean(data.podeVerConsultoria);
      applyPrefs((data.widgetPrefs || []) as WidgetPrefRow[]);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dashboard.';
      toast.error('Erro ao carregar dashboard');
    } finally {
      loading = false;
    }
  }

  async function loadOperacional() {
    const params: Record<string, any> = {};
    if (empresaSelecionada) params.empresa_id = empresaSelecionada;
    if (vendedorSelecionado) params.vendedor_id = vendedorSelecionado;

    await Promise.allSettled([
      (async () => {
        try {
          const d = await apiGet<{ items: Aniversariante[] }>('/api/v1/dashboard/aniversariantes', params);
          aniversariantes = d.items || [];
        } catch {
          aniversariantes = [];
        }
      })(),
      (async () => {
        if (!podeVerOperacao) return;
        try {
          const d = await apiGet<{ items: Viagem[] }>('/api/v1/dashboard/viagens', params);
          viagens = d.items || [];
        } catch {
          viagens = [];
        }
      })(),
      (async () => {
        try {
          const d = await apiGet<{ items: FollowUp[] }>('/api/v1/dashboard/follow-ups', params);
          followUps = d.items || [];
        } catch {
          followUps = [];
        }
      })(),
      (async () => {
        if (!podeVerConsultoria) return;
        try {
          const d = await apiGet<{ items: Consultoria[] }>('/api/v1/dashboard/consultorias', params);
          consultorias = d.items || [];
        } catch {
          consultorias = [];
        }
      })()
    ]);
  }

  async function atualizar() {
    await loadDashboard();
    await loadOperacional();
  }

  async function salvarPreferencias() {
    savingCustomize = true;
    try {
      const payload = {
        items: buildDashboardPrefsPayload(widgetOrder, widgetVisible, kpiOrder, kpiVisible)
      };
      const response = await fetch('/api/v1/dashboard/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      saveDashboardPrefsToStorage('dashboard_widgets', widgetOrder, widgetVisible);
      saveDashboardPrefsToStorage('dashboard_kpis', kpiOrder, kpiVisible);
      toast.success('Preferências do dashboard salvas.');
      showCustomize = false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar preferências.');
    } finally {
      savingCustomize = false;
    }
  }

  function toggleWidget(id: DashboardWidgetId) {
    widgetVisible = { ...widgetVisible, [id]: widgetVisible[id] === false };
  }

  function moveWidget(id: DashboardWidgetId, direction: 'up' | 'down') {
    widgetOrder = moveItem(widgetOrder, id, direction);
  }

  function toggleKpi(id: DashboardKpiId) {
    kpiVisible = { ...kpiVisible, [id]: kpiVisible[id] === false };
  }

  function moveKpi(id: DashboardKpiId, direction: 'up' | 'down') {
    kpiOrder = moveItem(kpiOrder, id, direction);
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    periodoInicio = params.get('inicio') || defaultPeriod.inicio;
    periodoFim = params.get('fim') || defaultPeriod.fim;
    empresaSelecionada = params.get('empresa_id') || '';
    vendedorSelecionado = params.get('vendedor_id') || '';

    const widgetStorage = readDashboardPrefsFromStorage('dashboard_widgets', DEFAULT_WIDGET_ORDER);
    const kpiStorage = readDashboardPrefsFromStorage('dashboard_kpis', DEFAULT_KPI_ORDER);
    if (widgetStorage) {
      widgetOrder = widgetStorage.order;
      widgetVisible = widgetStorage.visible;
    }
    if (kpiStorage) {
      kpiOrder = kpiStorage.order;
      kpiVisible = kpiStorage.visible;
    }

    await loadBase();
    await loadDashboard();
    await loadOperacional();
  });

  function handleOrcamentoClick(row: Orcamento) {
    void goto(`/orcamentos/${row.id}`);
  }
</script>

<svelte:head>
  <title>{title} | VTUR</title>
</svelte:head>

<PageHeader
  {title}
  {subtitle}
  color="financeiro"
  breadcrumbs={[{ label: 'Dashboard' }]}
  actions={[
    { label: 'Personalizar', onClick: () => (showCustomize = true), variant: 'secondary', icon: SlidersHorizontal },
    { label: 'Calculadora', onClick: () => (showCalculator = true), variant: 'outline', icon: Calculator }
  ]}
/>

<Card color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
    <FieldInput id="dash-inicio" label="Data início" type="date" bind:value={periodoInicio} class_name="w-full" />
    <FieldInput id="dash-fim" label="Data fim" type="date" bind:value={periodoFim} class_name="w-full" />
    {#if empresas.length > 0}
      <FieldSelect
        id="dash-empresa"
        label="Empresa"
        bind:value={empresaSelecionada}
        options={[{ value: '', label: 'Todas' }, ...empresas.map((e) => ({ value: e.id, label: e.nome }))]}
        placeholder={null}
        class_name="w-full"
      />
    {/if}
    {#if vendedoresFiltro.length > 0}
      <FieldSelect
        id="dash-vendedor"
        label="Vendedor"
        bind:value={vendedorSelecionado}
        options={[{ value: '', label: 'Todos' }, ...vendedoresFiltro.map((v) => ({ value: v.id, label: v.nome }))]}
        placeholder={null}
        class_name="w-full"
      />
    {/if}
    <div class="flex items-end gap-2 xl:col-span-2">
      <Button
        variant="primary"
        color="financeiro"
        class_name="w-full justify-center sm:w-auto sm:min-w-[180px]"
        on:click={atualizar}
      >
        <Filter size={16} class="mr-2" />
        Aplicar
      </Button>
      <Button variant="outline" color="financeiro" on:click={atualizar} class_name="px-3">
        <RefreshCw size={16} class={loading ? 'animate-spin' : ''} />
      </Button>
    </div>
  </div>
</Card>

{#if errorMessage}
  <div class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    {errorMessage}
  </div>
{/if}

{#each activeWidgetOrder as widgetId}
  {#if widgetId === 'kpis'}
    <KPIGrid className="mb-6" columns={kpiGridColumns}>
      {#each activeKpiOrder as kpiId}
        {#if kpiId === 'vendas_periodo'}
          <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <TrendingUp size={20} />
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Vendas no período</p>
              {#if loading}
                <div class="mt-1 h-7 w-28 animate-pulse rounded bg-slate-200"></div>
              {:else}
                <p class="text-2xl font-bold text-slate-900">{formatCurrency(vendasAgg.totalVendas)}</p>
                <p class="mt-0.5 text-xs text-slate-400">Lucro: {formatCurrency(vendasAgg.totalLiquido)}</p>
              {/if}
            </div>
          </div>
        {:else if kpiId === 'qtd_vendas'}
          <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">
              <ShoppingCart size={20} />
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Qtd. vendas</p>
              {#if loading}
                <div class="mt-1 h-7 w-16 animate-pulse rounded bg-slate-200"></div>
              {:else}
                <p class="text-2xl font-bold text-slate-900">{vendasAgg.qtdVendas}</p>
                <p class="mt-0.5 text-xs text-slate-400">Ticket: {formatCurrency(vendasAgg.ticketMedio)}</p>
              {/if}
            </div>
          </div>
        {:else if kpiId === 'orcamentos'}
          <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
              <FileText size={20} />
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Orçamentos</p>
              {#if loading}
                <div class="mt-1 h-7 w-16 animate-pulse rounded bg-slate-200"></div>
              {:else}
                <p class="text-2xl font-bold text-slate-900">{qtdOrcamentos}</p>
                <p class="mt-0.5 text-xs text-slate-400">Conv.: {conversaoPct.toFixed(1)}%</p>
              {/if}
            </div>
          </div>
        {:else if kpiId === 'meta_mes'}
          <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
              <Target size={20} />
            </div>
            <div class="w-full">
              <p class="text-sm font-medium text-slate-500">Meta do mês</p>
              {#if loading}
                <div class="mt-1 h-7 w-28 animate-pulse rounded bg-slate-200"></div>
              {:else}
                <p class="text-2xl font-bold text-slate-900">{formatCurrency(metaTotal)}</p>
                {#if metaTotal > 0}
                  <div class="mt-2 w-full">
                    <div class="h-1.5 w-full rounded-full bg-slate-200">
                      <div class="h-1.5 rounded-full bg-teal-500 transition-all" style={`width:${Math.min(atingimentoPct, 100).toFixed(1)}%`}></div>
                    </div>
                    <p class="mt-0.5 text-xs text-slate-400">{atingimentoPct.toFixed(1)}% atingido</p>
                  </div>
                {:else}
                  <p class="mt-0.5 text-xs text-slate-400">Sem meta cadastrada</p>
                {/if}
              {/if}
            </div>
          </div>
        {:else if kpiId === 'dias_mes'}
          <div class="vtur-kpi-card border-t-[3px] border-t-slate-300">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Calendar size={20} />
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Dias no mês</p>
              {#if loading}
                <div class="mt-1 h-7 w-16 animate-pulse rounded bg-slate-200"></div>
              {:else}
                <p class="text-2xl font-bold text-slate-900">{diasRestantes}d</p>
                {#if metaDiaria > 0}
                  <p class="mt-0.5 text-xs text-slate-400">Meta/dia: {formatCurrency(metaDiaria)}</p>
                {:else if diasRestantes === 0}
                  <p class="mt-0.5 text-xs text-slate-400">Fim do mês</p>
                {:else}
                  <p class="mt-0.5 text-xs text-slate-400">Meta atingida ✓</p>
                {/if}
              {/if}
            </div>
          </div>
        {:else if kpiId === 'seguro_viagem' && (loading || vendasAgg.totalSeguro > 0)}
          <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Award size={20} />
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Seguro viagem</p>
              {#if loading}
                <div class="mt-1 h-7 w-24 animate-pulse rounded bg-slate-200"></div>
              {:else}
                <p class="text-2xl font-bold text-slate-900">{formatCurrency(vendasAgg.totalSeguro)}</p>
                <p class="mt-0.5 text-xs text-slate-400">No período</p>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </KPIGrid>
  {:else if widgetId === 'timeline'}
    <Card header="Evolução das vendas" color="financeiro" class="mb-6">
      {#if loading}
        <div class="h-48 animate-pulse rounded-xl bg-slate-100"></div>
      {:else if vendasAgg.timeline.length === 0}
        <p class="py-8 text-center text-sm text-slate-400">Nenhuma venda no período.</p>
      {:else}
        <ChartJS type="line" data={timelineChartData} height={200} />
      {/if}
    </Card>
  {:else if widgetId === 'top_destinos'}
    <Card header="Top destinos" color="financeiro" class="mb-6">
      {#if loading}
        <div class="h-48 animate-pulse rounded-xl bg-slate-100"></div>
      {:else if vendasAgg.topDestinos.length === 0}
        <p class="py-8 text-center text-sm text-slate-400">Nenhum destino no período.</p>
      {:else}
        <ChartJS type="pie" data={destinoChartData} height={200} />
      {/if}
    </Card>
  {:else if widgetId === 'por_produto'}
    <Card header="Vendas por produto" color="financeiro" class="mb-6">
      {#if loading}
        <div class="h-48 animate-pulse rounded-xl bg-slate-100"></div>
      {:else if vendasAgg.porProduto.length === 0}
        <p class="py-8 text-center text-sm text-slate-400">Nenhum produto no período.</p>
      {:else}
        <ChartJS type="bar" data={produtoChartData} height={220} />
      {/if}
    </Card>
  {:else if widgetId === 'orcamentos'}
    <Card header="Orçamentos recentes" color="financeiro" class="mb-6">
      {#if loading}
        <div class="space-y-2">
          {#each [1, 2, 3] as _}
            <div class="h-10 animate-pulse rounded bg-slate-100"></div>
          {/each}
        </div>
      {:else if orcamentos.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhum orçamento no período.</p>
      {:else}
        <div class="divide-y divide-slate-100">
          {#each orcamentos.slice(0, 8) as orc}
            <Button
              type="button"
              variant="unstyled"
              size="sm"
              class_name="block w-full rounded px-1 py-2.5 text-left transition-colors hover:bg-slate-50"
              on:click={() => handleOrcamentoClick(orc)}
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-slate-900">{orc.cliente?.nome || 'Cliente'}</p>
                  <p class="text-xs text-slate-400">{formatDate(orc.created_at)} · {orc.status || '-'}</p>
                </div>
                <span class="ml-3 whitespace-nowrap text-sm font-semibold text-financeiro-700">{formatCurrency(orc.total || 0)}</span>
              </div>
            </Button>
          {/each}
        </div>
      {/if}
    </Card>
  {:else if widgetId === 'aniversariantes'}
    <Card header="Aniversariantes do mês" color="financeiro" class="mb-6">
      {#if loading}
        <div class="space-y-2">
          {#each [1, 2, 3] as _}
            <div class="h-10 animate-pulse rounded bg-slate-100"></div>
          {/each}
        </div>
      {:else if aniversariantes.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhum aniversariante este mês.</p>
      {:else}
        <div class="divide-y divide-slate-100">
          {#each aniversariantes.slice(0, 8) as aniv}
            <div class="flex items-center justify-between py-2.5 px-1">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-900">{aniv.nome}</p>
                <p class="text-xs text-slate-400">{formatDate(aniv.nascimento?.replace(/^(\d+)-(\d+)-(\d{4})$/, '$3-$2-$1') || aniv.nascimento)}</p>
              </div>
              {#if aniv.whatsapp || aniv.telefone}
                <a
                  href={`https://wa.me/55${(aniv.whatsapp || aniv.telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Feliz aniversário, ${aniv.nome}! 🎉`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ml-2 whitespace-nowrap text-xs text-green-600 hover:underline"
                >WhatsApp</a>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  {:else if widgetId === 'viagens' && podeVerOperacao}
    <Card header="Próximas viagens" color="financeiro" class="mb-6">
      {#if loading}
        <div class="space-y-2">
          {#each [1, 2, 3] as _}
            <div class="h-10 animate-pulse rounded bg-slate-100"></div>
          {/each}
        </div>
      {:else if viagens.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhuma viagem próxima.</p>
      {:else}
        <div class="divide-y divide-slate-100">
          {#each viagens.slice(0, 6) as v}
            <div class="py-2.5 px-1">
              <p class="truncate text-sm font-medium text-slate-900">{v.clientes?.nome || '-'}</p>
              <p class="text-xs text-slate-400">
                {formatDate(v.data_inicio)} → {formatDate(v.data_fim)}
                {#if v.destino} · {v.destino}{/if}
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  {:else if widgetId === 'followups'}
    <Card header="Follow-Up pendente" color="financeiro" class="mb-6">
      {#if loading}
        <div class="space-y-2">
          {#each [1, 2, 3] as _}
            <div class="h-10 animate-pulse rounded bg-slate-100"></div>
          {/each}
        </div>
      {:else if followUps.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhum follow-up pendente.</p>
      {:else}
        <div class="divide-y divide-slate-100">
          {#each followUps.slice(0, 6) as fu}
            <div class="py-2.5 px-1">
              <p class="truncate text-sm font-medium text-slate-900">{fu.venda?.clientes?.nome || '-'}</p>
              <p class="text-xs text-slate-400">
                Embarque: {formatDate(fu.venda?.data_embarque)}
                {#if fu.venda?.destino_cidade?.nome} · {fu.venda.destino_cidade.nome}{/if}
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  {:else if widgetId === 'consultorias' && podeVerConsultoria}
    <Card header="Consultorias agendadas" color="financeiro" class="mb-6">
      {#if loading}
        <div class="space-y-2">
          {#each [1, 2, 3] as _}
            <div class="h-10 animate-pulse rounded bg-slate-100"></div>
          {/each}
        </div>
      {:else if consultorias.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhuma consultoria agendada.</p>
      {:else}
        <div class="divide-y divide-slate-100">
          {#each consultorias.slice(0, 6) as c}
            <div class="py-2.5 px-1">
              <p class="truncate text-sm font-medium text-slate-900">{c.cliente_nome}</p>
              <p class="text-xs text-slate-400">
                {formatDateTime(c.data_hora)}
                {#if c.destino} · {c.destino}{/if}
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  {/if}
{/each}

<DashboardCustomizeDialog
  bind:open={showCustomize}
  loading={savingCustomize}
  {widgetOrder}
  {widgetVisible}
  {kpiOrder}
  {kpiVisible}
  widgetOptions={DASHBOARD_WIDGETS.filter((item) => availableWidgetIds.includes(item.id))}
  kpiOptions={DASHBOARD_KPIS}
  onClose={() => (showCustomize = false)}
  onSave={salvarPreferencias}
  onMoveWidget={moveWidget}
  onToggleWidget={toggleWidget}
  onMoveKpi={moveKpi}
  onToggleKpi={toggleKpi}
/>

<CalculatorModal
  open={showCalculator}
  valorBruto={vendasAgg.totalVendas}
  onClose={() => (showCalculator = false)}
  onConfirm={() => {
    showCalculator = false;
  }}
/>
