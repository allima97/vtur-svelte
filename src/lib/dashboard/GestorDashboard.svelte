<script lang="ts">
  import { dev } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import type { ChartData, TooltipItem } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { FieldInput, FieldSelect, LoadingState } from '$lib/components/ui';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { Award, BarChart2, Building2, Calendar, Clock, Gift, MapPin, RefreshCw, ShoppingCart, SlidersHorizontal, Target, TrendingUp, Users, Wallet } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';
  import { goto } from '$app/navigation';
  import { monthRangeFromKey, todayISODateLocal } from '$lib/date';
  import { formatDate as formatDateValue } from '$lib/utils/formatters';
  import { toUserMessage } from '$lib/utils/errors';

  export let title = 'Dashboard do gestor';
  export let subtitle = 'Visão consolidada da equipe e desempenho comercial.';

  // ── Widgets configuráveis (personalização) ──────────────────────────────
  type GestorWidgetId =
    | 'top_vendedores'
    | 'timeline'
    | 'top_destinos'
    | 'clientes'
    | 'ultimas_compras'
    | 'followups'
    | 'aniversariantes'
    | 'comparativo_vendas'
    | 'comparativo_metas';

  const GESTOR_WIDGETS: Array<{ id: GestorWidgetId; titulo: string }> = [
    { id: 'top_vendedores',     titulo: 'Top 3 vendedores' },
    { id: 'timeline',          titulo: 'Evolução das vendas' },
    { id: 'top_destinos',      titulo: 'Top destinos' },
    { id: 'clientes',          titulo: 'Clientes que mais gastaram' },
    { id: 'ultimas_compras',   titulo: 'Últimas compras' },
    { id: 'followups',         titulo: 'Follow-up' },
    { id: 'aniversariantes',   titulo: 'Aniversariantes' },
    { id: 'comparativo_vendas', titulo: 'Comparativo de vendas por empresa' },
    { id: 'comparativo_metas', titulo: 'Atingimento de meta por empresa' },
  ];

  const PREFS_KEY = 'gestor_dashboard_widgets';
  const BRL_CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  function loadWidgetPrefs(): Record<GestorWidgetId, boolean> {
    const defaults = Object.fromEntries(GESTOR_WIDGETS.map((w) => [w.id, true])) as Record<GestorWidgetId, boolean>;
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      for (const w of GESTOR_WIDGETS) {
        if (typeof parsed[w.id] === 'boolean') defaults[w.id] = parsed[w.id];
      }
    } catch { /* ignore */ }
    return defaults;
  }

  function saveWidgetPrefs(prefs: Record<GestorWidgetId, boolean>) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  let widgetVisible: Record<GestorWidgetId, boolean> = loadWidgetPrefs();
  let showCustomize = false;

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
    cliente_nome?: string | null;
    destino_nome?: string | null;
    data_inicio?: string | null;
    data_fim?: string | null;
    data_embarque?: string | null;
    data_final?: string | null;
    follow_up_fechado?: boolean | null;
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

  type Aniversariante = {
    id: string;
    nome: string;
    nascimento: string | null;
    telefone?: string | null;
    whatsapp?: string | null;
    aniversario_hoje?: boolean | null;
  };

  type EmpresaComparativoItem = {
    company_id: string;
    nome: string;
    totalVendas: number;
    qtdVendas: number;
    totalMeta: number;
    atingimentoPct: number;
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
  let aniversariantes: Aniversariante[] = [];
  let empresasComparativo: EmpresaComparativoItem[] = [];
  let loadingComparativo = false;

  function formatCurrency(value: number) {
    return BRL_CURRENCY_FORMATTER.format(value || 0);
  }

  function formatDate(value: string | null | undefined) {
    return formatDateValue(value);
  }

  function getInitials(value: string | null | undefined) {
    return String(value || '-')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || '-';
  }

  function formatBirthdayContext(value: string | null | undefined) {
    const raw = String(value || '').trim();
    const match = raw.match(/^\d{4}-(\d{2})-(\d{2})/);
    if (!match) return '-';
    const today = todayISODateLocal();
    const todayParts = today.match(/^\d{4}-(\d{2})-(\d{2})/);
    const monthDay = `${match[1]}-${match[2]}`;
    if (todayParts && monthDay === `${todayParts[1]}-${todayParts[2]}`) return 'Hoje';
    return `${match[2]}/${match[1]}`;
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
  $: chartsAtivos =
    (widgetVisible.timeline !== false ? 1 : 0) +
    (widgetVisible.top_destinos !== false ? 1 : 0) +
    (widgetVisible.comparativo_vendas !== false && userCtx?.papel === 'MASTER' ? 1 : 0) +
    (widgetVisible.comparativo_metas !== false && userCtx?.papel === 'MASTER' ? 1 : 0);
  $: gridCols =
    chartsAtivos === 1 ? 'grid-cols-1' :
    chartsAtivos === 2 ? 'grid-cols-1 lg:grid-cols-2' :
    chartsAtivos === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
                         'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
  $: followUpHeader = isFiltroVendedorAtivo
    ? `Follow-up de ${vendedorSelecionadoNome}`
    : 'Follow-up';
  $: followUpEmptyLabel = isFiltroVendedorAtivo
    ? `Nenhum cliente retornado pendente de follow-up para ${vendedorSelecionadoNome}.`
    : 'Nenhum cliente retornado pendente de follow-up.';
  function getMonthRange(monthValue: string) {
    const raw = String(monthValue || '').trim();
    if (!/^\d{4}-\d{2}$/.test(raw)) return { inicio: defaultPeriod.inicio, fim: defaultPeriod.fim };
    return monthRangeFromKey(raw) || { inicio: defaultPeriod.inicio, fim: defaultPeriod.fim };
  }

  function getFollowUpCliente(item: FollowUp) {
    return item.cliente_nome || item.venda?.clientes?.nome || '-';
  }

  function getFollowUpDestino(item: FollowUp) {
    return item.destino_nome || item.venda?.destino_cidade?.nome || '';
  }

  function getFollowUpRetorno(item: FollowUp) {
    return item.data_fim || item.data_final || item.venda?.data_embarque || null;
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

  // Paleta de cores distintas por empresa (até 12 empresas)
  const EMPRESA_COLORS = [
    '#3b82f6', // blue-500
    '#f97316', // orange-500
    '#10b981', // emerald-500
    '#a855f7', // purple-500
    '#ef4444', // red-500
    '#06b6d4', // cyan-500
    '#eab308', // yellow-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#8b5cf6', // violet-500
    '#f59e0b', // amber-500
    '#6366f1', // indigo-500
  ];

  $: comparativoVendasChartData = {
    labels: empresasComparativo.map((e) => e.nome),
    datasets: [
      {
        label: 'Vendas no período',
        data: empresasComparativo.map((e) => e.totalVendas),
        backgroundColor: empresasComparativo.map((_, i) => EMPRESA_COLORS[i % EMPRESA_COLORS.length]),
        borderRadius: 6,
        borderSkipped: false,
      }
    ]
  } satisfies ChartData;

  $: comparativoMetasChartData = {
    labels: empresasComparativo.map((e) => e.nome),
    datasets: [
      {
        label: 'Meta do período',
        data: empresasComparativo.map((e) => e.totalMeta),
        backgroundColor: empresasComparativo.map((_, i) => EMPRESA_COLORS[i % EMPRESA_COLORS.length] + '40'),
        borderColor: empresasComparativo.map((_, i) => EMPRESA_COLORS[i % EMPRESA_COLORS.length]),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Vendas realizadas',
        data: empresasComparativo.map((e) => e.totalVendas),
        backgroundColor: empresasComparativo.map((_, i) => EMPRESA_COLORS[i % EMPRESA_COLORS.length]),
        borderRadius: 6,
        borderSkipped: false,
      }
    ]
  } satisfies ChartData;

  // Opções para gráfico de barras horizontais
  const horizontalBarOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => {
            const parsed = typeof ctx.parsed === 'object' && ctx.parsed
              ? ctx.parsed
              : null;
            const value = parsed?.x ?? parsed?.y ?? 0;
            return ' ' + BRL_CURRENCY_FORMATTER.format(value);
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(148,163,184,0.15)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
          callback: (value: unknown) => {
            const numericValue = Number(value);
            if (numericValue >= 1_000_000) return `R$ ${(numericValue / 1_000_000).toFixed(1)}M`;
            if (numericValue >= 1_000) return `R$ ${(numericValue / 1_000).toFixed(0)}K`;
            return `R$ ${numericValue}`;
          }
        }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#475569', font: { size: 12 } }
      }
    }
  };

  const metasBarOptions = {
    ...horizontalBarOptions,
    plugins: {
      ...horizontalBarOptions.plugins,
      legend: { display: true, position: 'bottom' as const, labels: { color: '#475569', font: { size: 12 }, boxWidth: 12 } },
    }
  };

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
    } catch (err: unknown) {
      errorMessage = toUserMessage(err, 'Erro ao carregar dashboard do gestor.');
      toast.error('Erro ao carregar dashboard do gestor.');
    } finally {
      loading = false;
    }
  }

  async function loadOperational() {
    const params: Record<string, string> = {};
    if (userCtx?.papel !== 'MASTER') {
      if (empresaSelecionada) params.company_id = empresaSelecionada;
      if (vendedorSelecionado) params.vendedor_ids = vendedorSelecionado;
    }

    try {
      const data = await apiGet<{ items: FollowUp[] }>('/api/v1/dashboard/follow-ups', {
        ...params,
        inicio: '1900-01-01',
        fim: todayISODateLocal(),
        status: 'abertos',
        limit: 8
      });
      followUps = data.items || [];
    } catch {
      followUps = [];
    }
  }

  async function loadComprasResumo() {
    try {
      const isMaster = userCtx?.papel === 'MASTER';
      const payload = await apiGet<DashboardCompraPayload>('/api/v1/dashboard/ultimas-compras', {
        inicio: periodoInicio,
        fim: periodoFim,
        company_id: isMaster ? undefined : empresaSelecionada || undefined,
        vendedor_ids: isMaster ? undefined : vendedorSelecionado || undefined,
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

  async function loadAniversariantes() {
    try {
      const data = await apiGet<{ items?: Aniversariante[] }>('/api/v1/dashboard/aniversariantes', {
        dias: 30,
        company_id: userCtx?.papel === 'MASTER' ? undefined : empresaSelecionada || undefined,
        limit: 5
      });
      aniversariantes = data.items || [];
    } catch {
      aniversariantes = [];
    }
  }

  async function loadComparativo() {
    // Só carrega se MASTER (ou ADMIN) e pelo menos um widget de comparativo visível
    const papel = userCtx?.papel;
    if (papel !== 'MASTER' && papel !== 'ADMIN') return;
    if (widgetVisible.comparativo_vendas === false && widgetVisible.comparativo_metas === false) return;
    loadingComparativo = true;
    try {
      const data = await apiGet<{ empresas: EmpresaComparativoItem[] }>(
        '/api/v1/dashboard/comparativo-empresas',
        { inicio: periodoInicio, fim: periodoFim }
      );
      empresasComparativo = data.empresas || [];
    } catch (err) {
      if (dev) console.error('[comparativo] erro ao carregar:', err);
      empresasComparativo = [];
    } finally {
      loadingComparativo = false;
    }
  }

  async function atualizar() {
    if (empresaSelecionada !== lastBaseCompanyId) {
      await loadBase();
    }
    await loadDashboard();
    await Promise.all([loadOperational(), loadComprasResumo(), loadAniversariantes(), loadComparativo()]);
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
    await loadDashboard();
    await Promise.all([loadOperational(), loadComprasResumo(), loadAniversariantes(), loadComparativo()]);
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
    { label: 'Personalizar', onClick: () => (showCustomize = true), variant: 'secondary', icon: SlidersHorizontal },
    { label: 'Ranking', onClick: goToRanking, variant: 'secondary', icon: BarChart2 },
    { label: 'Atualizar', onClick: atualizar, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<!-- Painel de personalização ─────────────────────────────────────────────── -->
{#if showCustomize}
  <div class="fixed inset-0 z-50 flex items-start justify-end" role="dialog" aria-modal="true">
    <!-- Overlay -->
    <button
      type="button"
      class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      on:click={() => (showCustomize = false)}
      aria-label="Fechar personalização"
    ></button>
    <!-- Painel lateral -->
    <div class="relative z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div class="flex items-center gap-2">
          <SlidersHorizontal size={18} class="text-slate-500" />
          <h2 class="text-base font-bold text-slate-900">Personalizar dashboard</h2>
        </div>
        <button
          type="button"
          on:click={() => (showCustomize = false)}
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Fechar"
        >✕</button>
      </div>
      <div class="flex-1 overflow-y-auto p-5 space-y-2">
        <p class="mb-3 text-xs text-slate-500">Ative ou desative os widgets exibidos neste dashboard.</p>
        {#each GESTOR_WIDGETS as widget}
          <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50 transition-colors">
            <span class="text-sm font-medium text-slate-700">{widget.titulo}</span>
            <input
              type="checkbox"
              class="h-4 w-4 rounded accent-orange-500"
              checked={widgetVisible[widget.id] !== false}
              on:change={(e) => {
                widgetVisible = { ...widgetVisible, [widget.id]: (e.target as HTMLInputElement).checked };
                saveWidgetPrefs(widgetVisible);
                if ((widget.id === 'comparativo_vendas' || widget.id === 'comparativo_metas')
                    && (e.target as HTMLInputElement).checked
                    && empresasComparativo.length === 0) {
                  void loadComparativo();
                }
              }}
            />
          </label>
        {/each}
      </div>
    </div>
  </div>
{/if}

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

{#if widgetVisible.top_vendedores !== false}
<div class="vtur-card mb-6 p-6">
  <div class="mb-4 flex items-center gap-3">
    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
      <Award size={18} />
    </div>
    <div>
      <h3 class="text-base font-bold text-slate-900">Top 3 vendedores</h3>
      <p class="text-xs text-slate-500">{userCtx?.papel === 'MASTER' ? 'Ranking de todas as lojas do master por receita' : 'Ranking da equipe por receita'}</p>
    </div>
  </div>
  <div class="border-t border-slate-100 pt-4">
    {#if loading}
      <LoadingState compact={true} />
    {:else if topVendedores.length === 0}
      <p class="py-6 text-center text-sm text-slate-400">Sem vendedores com compras no período.</p>
    {:else}
      <div class="grid gap-3 md:grid-cols-3">
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

<!-- ── Grade unificada de gráficos: 1–4 painéis, sempre 100% da largura ── -->
{#if chartsAtivos > 0}
<div class="mb-6 grid gap-4 sm:gap-6 {gridCols}">

  <!-- Evolução das vendas -->
  {#if widgetVisible.timeline !== false}
  <div class="vtur-card p-6">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
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
  {/if}

  <!-- Top destinos -->
  {#if widgetVisible.top_destinos !== false}
  <div class="vtur-card p-6">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
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
  {/if}

  <!-- Comparativo de vendas por empresa (MASTER) -->
  {#if widgetVisible.comparativo_vendas !== false && userCtx?.papel === 'MASTER'}
  <div class="vtur-card p-6">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Building2 size={18} />
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900">Vendas por empresa</h3>
          <p class="text-xs text-slate-500">Receita total por empresa no período</p>
        </div>
      </div>
      {#if !loadingComparativo && empresasComparativo.length > 0}
        <span class="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
          {empresasComparativo.length} empresa{empresasComparativo.length !== 1 ? 's' : ''}
        </span>
      {/if}
    </div>
    <div class="border-t border-slate-100 pt-4">
      {#if loadingComparativo}
        <LoadingState compact={true} />
      {:else if empresasComparativo.length === 0}
        <p class="py-8 text-center text-sm text-slate-400">Sem dados de vendas por empresa no período.</p>
      {:else}
        {@const chartH = Math.max(180, empresasComparativo.length * 44)}
        <div style="height:{chartH}px">
          <ChartJS type="bar" data={comparativoVendasChartData} options={horizontalBarOptions} height={chartH} />
        </div>
      {/if}
    </div>
  </div>
  {/if}

  <!-- Atingimento de meta por empresa (MASTER) -->
  {#if widgetVisible.comparativo_metas !== false && userCtx?.papel === 'MASTER'}
  <div class="vtur-card p-6">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        <Target size={18} />
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900">Meta por empresa</h3>
        <p class="text-xs text-slate-500">Meta vs. realizado por empresa</p>
      </div>
    </div>
    <div class="border-t border-slate-100 pt-4">
      {#if loadingComparativo}
        <LoadingState compact={true} />
      {:else if empresasComparativo.length === 0}
        <p class="py-8 text-center text-sm text-slate-400">Sem dados por empresa no período.</p>
      {:else if empresasComparativo.every((e) => e.totalMeta === 0)}
        <p class="py-8 text-center text-sm text-slate-400">Nenhuma empresa com meta cadastrada.</p>
      {:else}
        {@const metaEmpresas = empresasComparativo.filter((e) => e.totalMeta > 0)}
        <!-- Mini badges de atingimento -->
        <div class="mb-3 flex flex-wrap gap-2">
          {#each metaEmpresas as emp}
            {@const color = EMPRESA_COLORS[empresasComparativo.indexOf(emp) % EMPRESA_COLORS.length]}
            <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
              style="background-color:{color}"
              title="{emp.nome}: {emp.atingimentoPct.toFixed(1)}% da meta">
              {emp.nome.length > 12 ? emp.nome.slice(0, 11) + '…' : emp.nome} · {emp.atingimentoPct.toFixed(0)}%
            </span>
          {/each}
        </div>
        {@const chartH = Math.max(180, metaEmpresas.length * 56)}
        <div style="height:{chartH}px">
          <ChartJS type="bar" data={comparativoMetasChartData} options={metasBarOptions} height={chartH} />
        </div>
      {/if}
    </div>
  </div>
  {/if}

</div>
{/if}

{/if}
