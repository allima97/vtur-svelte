<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { FieldInput, FieldSelect, LoadingState } from '$lib/components/ui';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { Award, BarChart2, Calendar, Clock, MapPin, RefreshCw, ShoppingCart, Target, TrendingUp, Users, Wallet } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';
  import { goto } from '$app/navigation';
  import { monthRangeFromKey, todayISODateLocal } from '$lib/date';
  import { formatDate as formatDateValue } from '$lib/utils/formatters';

  export let title = 'Dashboard do gestor';
  export let subtitle = 'Visão consolidada da equipe e desempenho comercial.';

  type Meta = {
    id: string;
    vendedor_id: string;
    periodo: string;
    meta_geral: number;
    meta_diferenciada: number;
    ativo: boolean;
    scope?: string | null;
  };

  type FollowUp = {
    id: string;
    venda?: {
      data_embarque: string | null;
      clientes?: { nome: string | null } | null;
      destino_cidade?: { nome: string | null } | null;
    } | null;
  };

  type SummaryPayload = {
    userCtx?: { nome: string | null; papel: string; vendedorIds: string[] } | null;
    vendasAgg?: {
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
    metas?: Meta[];
  };

  type DashboardCompra = {
    id: string;
    cliente_id: string | null;
    cliente_nome: string;
    cliente_email: string | null;
    cliente_telefone: string | null;
    cliente_whatsapp: string | null;
    cliente_nascimento: string | null;
    vendedor_nome: string;
    data_compra: string | null;
    data_saida: string | null;
    destino: string;
    valor: number;
  };

  type DashboardCompraPayload = {
    topVendedores?: Array<{ vendedor_id: string; vendedor_nome: string; valor: number; quantidade: number }>;
    topClientes?: Array<{ cliente_id: string | null; cliente_nome: string; data_saida: string | null; destino: string; valor: number; quantidade: number }>;
    ultimasCompras?: DashboardCompra[];
  };

  let loading = true;
  let errorMessage: string | null = null;
  let userCtx: SummaryPayload['userCtx'] = null;

  function getDefaultPeriod() {
    const today = todayISODateLocal();
    return { inicio: `${today.slice(0, 7)}-01`, fim: today };
  }

  const defaultPeriod = getDefaultPeriod();
  const defaultMonth = defaultPeriod.inicio.slice(0, 7);

  let filtroPeriodoModo: 'mes' | 'periodo' = 'mes';
  let mesSelecionado = defaultMonth;
  let periodoInicio = defaultPeriod.inicio;
  let periodoFim = defaultPeriod.fim;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';

  let empresas: { id: string; nome: string }[] = [];
  let vendedoresFiltro: { id: string; nome: string }[] = [];
  let filtrosInicializados = false;
  let lastAppliedFilterKey = '';
  let lastBaseCompanyId = '';
  let applyFiltersTimer: ReturnType<typeof setTimeout> | null = null;

  let vendasAgg: NonNullable<SummaryPayload['vendasAgg']> = {
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
  let followUps: FollowUp[] = [];
  let topVendedores: NonNullable<DashboardCompraPayload['topVendedores']> = [];
  let topClientes: NonNullable<DashboardCompraPayload['topClientes']> = [];
  let ultimasCompras: DashboardCompra[] = [];

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  function formatDate(value: string | null | undefined) {
    return formatDateValue(value);
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function interpolateRgb(from: [number, number, number], to: [number, number, number], t: number) {
    const ratio = clamp(t, 0, 1);
    const r = Math.round(from[0] + (to[0] - from[0]) * ratio);
    const g = Math.round(from[1] + (to[1] - from[1]) * ratio);
    const b = Math.round(from[2] + (to[2] - from[2]) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function getAtingimentoColor(percentual: number) {
    const pct = clamp(percentual, 0, 100);
    if (pct < 80) return interpolateRgb([239, 68, 68], [249, 115, 22], pct / 80);
    return interpolateRgb([249, 115, 22], [34, 197, 94], (pct - 80) / 20);
  }

  $: metaTotal = metas.reduce((sum, item) => sum + Number(item.meta_geral || 0), 0);
  $: atingimento = metaTotal > 0 ? (vendasAgg.totalVendas / metaTotal) * 100 : 0;
  $: metaSeguroTotal = metas.reduce((sum, item) => sum + Number(item.meta_diferenciada || 0), 0);
  $: atingimentoSeguro = metaSeguroTotal > 0 ? (vendasAgg.totalSeguro / metaSeguroTotal) * 100 : 0;
  $: atingimentoVendasClamped = clamp(atingimento, 0, 100);
  $: atingimentoSeguroClamped = clamp(atingimentoSeguro, 0, 100);
  $: atingimentoVendasColor = getAtingimentoColor(atingimento);
  $: atingimentoMetaColor = getAtingimentoColor(atingimento);
  $: atingimentoSeguroColor = getAtingimentoColor(atingimentoSeguro);
  $: teamSize = userCtx?.vendedorIds?.length || 0;
  $: vendedorSelecionadoNome =
    vendedoresFiltro.find((item) => item.id === vendedorSelecionado)?.nome?.trim() || '';
  $: isFiltroVendedorAtivo = Boolean(vendedorSelecionado && vendedorSelecionadoNome);
  $: salesLabel = isFiltroVendedorAtivo
    ? `Vendas de ${vendedorSelecionadoNome}`
    : userCtx?.papel === 'MASTER'
      ? 'Vendas das equipes'
      : 'Vendas da equipe';
  $: countLabel = isFiltroVendedorAtivo ? `Qtd. vendas de ${vendedorSelecionadoNome}` : 'Qtd. vendas';
  $: metaLabel = isFiltroVendedorAtivo ? `Meta de ${vendedorSelecionadoNome}` : 'Meta da equipe';
  $: scopeLabel = isFiltroVendedorAtivo ? 'Vendedor no escopo' : 'Equipe no escopo';
  $: scopeHelperLabel = isFiltroVendedorAtivo
    ? `Filtro: ${vendedorSelecionadoNome}`
    : `Papel: ${userCtx?.papel || '-'}`;
  $: evolucaoHeader = isFiltroVendedorAtivo
    ? `Evolução das vendas de ${vendedorSelecionadoNome}`
    : userCtx?.papel === 'MASTER'
      ? 'Evolução das vendas das equipes'
      : 'Evolução das vendas';
  $: destinosHeader = isFiltroVendedorAtivo
    ? `Top destinos de ${vendedorSelecionadoNome}`
    : userCtx?.papel === 'MASTER'
      ? 'Top destinos das equipes'
      : 'Top destinos da equipe';
  $: followUpHeader = isFiltroVendedorAtivo
    ? `Follow-up de ${vendedorSelecionadoNome}`
    : 'Follow-up';
  $: followUpEmptyLabel = isFiltroVendedorAtivo
    ? `Nenhum follow-up pendente de ${vendedorSelecionadoNome}.`
    : 'Nenhum follow-up pendente.';
  $: comprasScopeLabel = userCtx?.papel === 'MASTER' ? 'todas as equipes' : 'equipe';
  function getMonthRange(monthValue: string) {
    const raw = String(monthValue || '').trim();
    if (!/^\d{4}-\d{2}$/.test(raw)) return { inicio: defaultPeriod.inicio, fim: defaultPeriod.fim };
    return monthRangeFromKey(raw) || { inicio: defaultPeriod.inicio, fim: defaultPeriod.fim };
  }

  function goToRanking() {
    const mes = filtroPeriodoModo === 'mes' ? mesSelecionado : periodoInicio.slice(0, 7);
    void goto(`/relatorios/ranking?mes=${mes}`);
  }

  $: if (filtroPeriodoModo === 'mes') {
    const range = getMonthRange(mesSelecionado);
    if (periodoInicio !== range.inicio) periodoInicio = range.inicio;
    if (periodoFim !== range.fim) periodoFim = range.fim;
  }

  $: currentFilterKey = [filtroPeriodoModo, mesSelecionado, periodoInicio, periodoFim, empresaSelecionada, vendedorSelecionado].join('|');

  $: timelineChartData = {
    labels: vendasAgg.timeline.map((item) => formatDate(item.date)),
    datasets: [
      {
        label: salesLabel,
        data: vendasAgg.timeline.map((item) => item.value),
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2,132,199,0.12)',
        fill: true,
        tension: 0.32
      }
    ]
  } satisfies ChartData;

  $: destinosChartData = {
    labels: vendasAgg.topDestinos.map((item) => item.name),
    datasets: [
      {
        label: 'Receita',
        data: vendasAgg.topDestinos.map((item) => item.value),
        backgroundColor: ['#0f766e', '#14b8a6', '#2dd4bf', '#99f6e4', '#ccfbf1']
      }
    ]
  } satisfies ChartData;

  async function loadBase() {
    try {
      const data = await apiGet<{ empresas: { id: string; nome: string }[]; vendedores: { id: string; nome: string }[] }>(
        '/api/v1/dashboard/base',
        { empresa_id: empresaSelecionada || undefined }
      );
      empresas = data.empresas || [];
      vendedoresFiltro = data.vendedores || [];
      if (vendedorSelecionado && !vendedoresFiltro.some((item) => item.id === vendedorSelecionado)) {
        vendedorSelecionado = '';
      }
    } catch {
      empresas = [];
      vendedoresFiltro = [];
      vendedorSelecionado = '';
    } finally {
      lastBaseCompanyId = empresaSelecionada;
    }
  }

  async function loadDashboard() {
    loading = true;
    errorMessage = null;

    try {
      const payload = await apiGet<SummaryPayload>('/api/v1/dashboard/summary', {
        inicio: periodoInicio,
        fim: periodoFim,
        include_orcamentos: 0,
        company_id: empresaSelecionada || undefined,
        vendedor_ids: vendedorSelecionado || undefined
      });

      userCtx = payload.userCtx || null;
      vendasAgg = payload.vendasAgg || vendasAgg;
      metas = payload.metas || [];
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dashboard do gestor.';
      toast.error('Erro ao carregar dashboard do gestor.');
    } finally {
      loading = false;
    }
  }

  async function loadOperational() {
    const params: Record<string, string> = {};
    if (empresaSelecionada) params.company_id = empresaSelecionada;
    if (vendedorSelecionado) params.vendedor_ids = vendedorSelecionado;

    try {
      const data = await apiGet<{ items: FollowUp[] }>('/api/v1/dashboard/follow-ups', {
        ...params,
        limit: 8
      });
      followUps = data.items || [];
    } catch {
      followUps = [];
    }
  }

  async function loadComprasResumo() {
    try {
      const payload = await apiGet<DashboardCompraPayload>('/api/v1/dashboard/ultimas-compras', {
        inicio: periodoInicio,
        fim: periodoFim,
        company_id: empresaSelecionada || undefined,
        vendedor_ids: vendedorSelecionado || undefined,
        limit: 5
      });
      topVendedores = payload.topVendedores || [];
      topClientes = payload.topClientes || [];
      ultimasCompras = payload.ultimasCompras || [];
    } catch {
      topVendedores = [];
      topClientes = [];
      ultimasCompras = [];
    }
  }

  async function atualizar() {
    if (empresaSelecionada !== lastBaseCompanyId) {
      await loadBase();
    }
    await Promise.all([loadDashboard(), loadOperational(), loadComprasResumo()]);
  }

  $: if (filtrosInicializados && currentFilterKey !== lastAppliedFilterKey) {
    if (applyFiltersTimer) clearTimeout(applyFiltersTimer);
    applyFiltersTimer = setTimeout(() => {
      lastAppliedFilterKey = currentFilterKey;
      void atualizar();
      applyFiltersTimer = null;
    }, 250);
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const modoParam = String(params.get('modo') || '').trim().toLowerCase();
    filtroPeriodoModo = modoParam === 'periodo' ? 'periodo' : 'mes';

    const inicioParam = params.get('inicio') || defaultPeriod.inicio;
    const fimParam = params.get('fim') || defaultPeriod.fim;
    periodoInicio = inicioParam;
    periodoFim = fimParam;

    const mesParam = params.get('mes') || inicioParam.slice(0, 7) || defaultMonth;
    mesSelecionado = mesParam;

    if (filtroPeriodoModo === 'mes') {
      const range = getMonthRange(mesSelecionado);
      periodoInicio = range.inicio;
      periodoFim = range.fim;
    }

    empresaSelecionada = params.get('empresa_id') || '';
    vendedorSelecionado = params.get('vendedor_id') || '';

    await loadBase();
    await Promise.all([loadDashboard(), loadOperational(), loadComprasResumo()]);
    lastAppliedFilterKey = currentFilterKey;
    filtrosInicializados = true;
  });

  onDestroy(() => { if (applyFiltersTimer) clearTimeout(applyFiltersTimer); });
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
    { label: 'Ranking', onClick: goToRanking, variant: 'secondary', icon: BarChart2 },
    { label: 'Atualizar', onClick: atualizar, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<Card color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
    <FieldSelect
      id="gestor-periodo-modo"
      label="Período"
      bind:value={filtroPeriodoModo}
      options={[
        { value: 'mes', label: 'Mês completo' },
        { value: 'periodo', label: 'Data específica' }
      ]}
      class_name="w-full"
    />

    {#if filtroPeriodoModo === 'mes'}
      <FieldInput id="gestor-mes" label="Mês" type="month" bind:value={mesSelecionado} class_name="w-full" />
    {:else}
      <FieldInput id="gestor-inicio" label="Data início" type="date" bind:value={periodoInicio} class_name="w-full" />
      <FieldInput id="gestor-fim" label="Data fim" type="date" bind:value={periodoFim} class_name="w-full" />
    {/if}

    {#if userCtx?.papel === 'MASTER' && empresas.length > 0}
      <FieldSelect
        id="gestor-empresa"
        label="Empresa"
        bind:value={empresaSelecionada}
        options={[{ value: '', label: 'Todas' }, ...empresas.map((item) => ({ value: item.id, label: item.nome }))]}
        class_name="w-full"
      />
    {/if}
    {#if vendedoresFiltro.length > 0}
      <FieldSelect
        id="gestor-vendedor"
        label="Vendedor"
        bind:value={vendedorSelecionado}
        options={[{ value: '', label: 'Todos' }, ...vendedoresFiltro.map((item) => ({ value: item.id, label: item.nome }))]}
        class_name="w-full"
      />
    {/if}
  </div>
</Card>

{#if errorMessage}
  <div class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
{/if}

<KPIGrid
  className="mb-6"
  columns={5}
  {loading}
>
  <div class="vtur-kpi-card">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><TrendingUp size={18} /></div>
    <div class="min-w-0 w-full flex-1">
      <p class="text-xs font-medium text-slate-500 sm:text-sm">{salesLabel}</p>
      {#if loading}
        <div class="mt-1 h-7 w-28 animate-pulse rounded bg-slate-200"></div>
        <div class="mt-1.5 h-3 w-20 animate-pulse rounded bg-slate-100"></div>
      {:else}
        <p class="truncate text-lg font-bold text-slate-900 sm:text-2xl">{formatCurrency(vendasAgg.totalVendas)}</p>
        <p class="mt-0.5 truncate text-xs text-slate-400">Líquido: {formatCurrency(vendasAgg.totalLiquido)}</p>
        {#if metaTotal > 0}
          <div class="mt-1.5 w-full">
            <div class="h-1.5 w-full rounded-full bg-slate-200">
              <div class="h-1.5 rounded-full transition-all" style={`width:${atingimentoVendasClamped.toFixed(1)}%;background:${atingimentoVendasColor};`}></div>
            </div>
            <p class="mt-0.5 text-xs text-slate-400">{atingimento.toFixed(1)}% da meta</p>
          </div>
        {:else}
          <p class="mt-0.5 text-xs text-slate-400">Sem meta</p>
        {/if}
      {/if}
    </div>
  </div>

  <div class="vtur-kpi-card">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Wallet size={18} /></div>
    <div class="min-w-0 flex-1">
      <p class="text-xs font-medium text-slate-500 sm:text-sm">{countLabel}</p>
      {#if loading}
        <div class="mt-1 h-7 w-16 animate-pulse rounded bg-slate-200"></div>
        <div class="mt-1.5 h-3 w-24 animate-pulse rounded bg-slate-100"></div>
      {:else}
        <p class="text-lg font-bold text-slate-900 sm:text-2xl">{vendasAgg.qtdVendas}</p>
        <p class="mt-0.5 truncate text-xs text-slate-400">Ticket: {formatCurrency(vendasAgg.ticketMedio)}</p>
      {/if}
    </div>
  </div>

  <div class="vtur-kpi-card">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Target size={18} /></div>
    <div class="min-w-0 w-full flex-1">
      <p class="text-xs font-medium text-slate-500 sm:text-sm">{metaLabel}</p>
      {#if loading}
        <div class="mt-1 h-7 w-28 animate-pulse rounded bg-slate-200"></div>
        <div class="mt-1.5 h-3 w-16 animate-pulse rounded bg-slate-100"></div>
      {:else}
        <p class="truncate text-lg font-bold text-slate-900 sm:text-2xl">{formatCurrency(metaTotal)}</p>
        {#if metaTotal > 0}
          <div class="mt-1.5 w-full">
            <div class="h-1.5 w-full rounded-full bg-slate-200">
              <div class="h-1.5 rounded-full transition-all" style={`width:${atingimentoVendasClamped.toFixed(1)}%;background:${atingimentoMetaColor};`}></div>
            </div>
            <p class="mt-0.5 text-xs text-slate-400">{atingimento.toFixed(1)}%</p>
          </div>
        {:else}
          <p class="mt-0.5 text-xs text-slate-400">Sem meta</p>
        {/if}
      {/if}
    </div>
  </div>

  <div class="vtur-kpi-card">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Users size={18} /></div>
    <div class="min-w-0 flex-1">
      <p class="text-xs font-medium text-slate-500 sm:text-sm">{scopeLabel}</p>
      {#if loading}
        <div class="mt-1 h-7 w-12 animate-pulse rounded bg-slate-200"></div>
        <div class="mt-1.5 h-3 w-20 animate-pulse rounded bg-slate-100"></div>
      {:else}
        <p class="text-lg font-bold text-slate-900 sm:text-2xl">{isFiltroVendedorAtivo ? 1 : teamSize}</p>
        <p class="mt-0.5 truncate text-xs text-slate-400">{scopeHelperLabel}</p>
      {/if}
    </div>
  </div>

  <div class="vtur-kpi-card">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Wallet size={18} /></div>
    <div class="min-w-0 w-full flex-1">
      <p class="text-xs font-medium text-slate-500 sm:text-sm">Seguro viagem</p>
      {#if loading}
        <div class="mt-1 h-7 w-28 animate-pulse rounded bg-slate-200"></div>
        <div class="mt-1.5 h-3 w-16 animate-pulse rounded bg-slate-100"></div>
      {:else}
        <p class="truncate text-lg font-bold text-slate-900 sm:text-2xl">{formatCurrency(vendasAgg.totalSeguro)}</p>
        {#if metaSeguroTotal > 0}
          <div class="mt-1.5 w-full">
            <div class="h-1.5 w-full rounded-full bg-slate-200">
              <div class="h-1.5 rounded-full transition-all" style={`width:${atingimentoSeguroClamped.toFixed(1)}%;background:${atingimentoSeguroColor};`}></div>
            </div>
            <p class="mt-0.5 text-xs text-slate-400">{atingimentoSeguro.toFixed(1)}% meta</p>
          </div>
        {:else}
          <p class="mt-0.5 text-xs text-slate-400">Sem meta de seguro</p>
        {/if}
      {/if}
    </div>
  </div>
</KPIGrid>

<div class="grid gap-4 sm:gap-6 lg:grid-cols-2">
  <div class="vtur-card p-6">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
        <TrendingUp size={18} />
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900">{evolucaoHeader}</h3>
        <p class="text-xs text-slate-500">Receita por data no período selecionado</p>
      </div>
    </div>
    <div class="border-t border-slate-100 pt-4">
      {#if loading}
        <LoadingState compact={true} />
      {:else if vendasAgg.timeline.length === 0}
        <p class="py-8 text-center text-sm text-slate-400">Sem vendas no período.</p>
      {:else}
        <ChartJS type="line" data={timelineChartData} height={220} />
      {/if}
    </div>
  </div>

  <div class="vtur-card p-6">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
        <MapPin size={18} />
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900">{destinosHeader}</h3>
        <p class="text-xs text-slate-500">Destinos com maior receita</p>
      </div>
    </div>
    <div class="border-t border-slate-100 pt-4">
      {#if loading}
        <LoadingState compact={true} />
      {:else if vendasAgg.topDestinos.length === 0}
        <p class="py-8 text-center text-sm text-slate-400">Sem destinos no período.</p>
      {:else}
        <ChartJS type="doughnut" data={destinosChartData} height={220} />
      {/if}
    </div>
  </div>

  <div class="vtur-card p-6">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
        <Award size={18} />
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900">Top 3 vendedores</h3>
        <p class="text-xs text-slate-500">Ranking de {comprasScopeLabel} por receita</p>
      </div>
    </div>
    <div class="border-t border-slate-100 pt-4">
      {#if loading}
        <LoadingState compact={true} />
      {:else if topVendedores.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Sem vendedores com compras no período.</p>
      {:else}
        <div class="space-y-3">
          {#each topVendedores as item, index}
            <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:border-orange-200 hover:bg-orange-50">
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">{index + 1}</span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">{item.vendedor_nome}</p>
                  <p class="text-xs text-slate-500">{item.quantidade} compra(s)</p>
                </div>
              </div>
              <p class="shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(item.valor)}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="vtur-card p-6">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
        <Users size={18} />
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900">Clientes que mais gastaram</h3>
        <p class="text-xs text-slate-500">Maiores valores no mês selecionado</p>
      </div>
    </div>
    <div class="border-t border-slate-100 pt-4">
      {#if loading}
        <LoadingState compact={true} />
      {:else if topClientes.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Sem clientes com compras no período.</p>
      {:else}
        <div class="space-y-3">
          {#each topClientes as item}
            <div class="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:border-green-200 hover:bg-green-50">
              <div class="flex min-w-0 gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
                  {item.cliente_nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">{item.cliente_nome}</p>
                  <p class="truncate text-xs text-slate-500">Saída: {formatDate(item.data_saida)} · {item.destino}</p>
                </div>
              </div>
              <p class="shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(item.valor)}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="vtur-card p-6">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <ShoppingCart size={18} />
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900">Últimas compras</h3>
        <p class="text-xs text-slate-500">Compras mais recentes do período</p>
      </div>
    </div>
    <div class="border-t border-slate-100 pt-4">
      {#if loading}
        <LoadingState compact={true} />
      {:else if ultimasCompras.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Sem compras recentes no período.</p>
      {:else}
        <div class="space-y-3">
          {#each ultimasCompras.slice(0, 5) as item}
            <div class="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50">
              <div class="flex min-w-0 gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Calendar size={18} />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">{item.cliente_nome}</p>
                  <p class="truncate text-xs text-slate-500">Saída: {formatDate(item.data_saida)} · {item.destino}</p>
                  <p class="text-xs text-slate-400">Compra: {formatDate(item.data_compra)} · {item.vendedor_nome}</p>
                </div>
              </div>
              <p class="shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(item.valor)}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="vtur-card p-6">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        <Clock size={18} />
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900">{followUpHeader}</h3>
        <p class="text-xs text-slate-500">Pendências operacionais do período</p>
      </div>
    </div>
    <div class="border-t border-slate-100 pt-4">
      {#if loading}
        <LoadingState compact={true} />
      {:else if followUps.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">{followUpEmptyLabel}</p>
      {:else}
        <div class="space-y-0">
          {#each followUps.slice(0, 6) as item, idx}
            <div class="relative flex items-start gap-4 py-3">
              {#if idx < followUps.slice(0, 6).length - 1}
                <span class="absolute left-[19px] top-12 h-[calc(100%-12px)] w-px bg-slate-200"></span>
              {/if}
              <div class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white text-violet-500 shadow-sm">
                <Clock size={18} />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-slate-900">{item.venda?.clientes?.nome || '-'}</p>
                <p class="text-xs text-slate-500">Embarque: {formatDate(item.venda?.data_embarque)}{#if item.venda?.destino_cidade?.nome} · {item.venda.destino_cidade.nome}{/if}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
