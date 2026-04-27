<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import DashboardCustomizeDialog from './DashboardCustomizeDialog.svelte';
  import ModalAvisoCliente from '$lib/components/modais/ModalAvisoCliente.svelte';
  import {
    TrendingUp,
    ShoppingCart,
    Target,
    Calendar,
    FileText,
    Award,
    SlidersHorizontal,

    MapPin,
    Gift,
    Send,
    BarChart2,
    Plane,
    UserPlus,
    Clock
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
    topDestinos: Array<{ name: string; value: number; count?: number }>;
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
    numero_venda?: string | null;
    data_embarque: string | null;
    data_final: string | null;
    cliente_nome: string;
    destino: string | null;
    vendedor_nome?: string | null;
    status?: string | null;
  };

  type FollowUp = {
    id: string;
    venda_id: string | null;
    cliente_nome: string;
    destino_nome: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    follow_up_fechado?: boolean | null;
    data_embarque: string | null;
    updated_at?: string | null;
  };

  type Consultoria = {
    id: string;
    cliente_nome: string;
    data_hora: string;
    lembrete: string;
    destino: string | null;
    orcamento_id: string | null;
  };

  type ActivityItem = {
    id: string;
    titulo: string;
    subtitulo: string;
    tempo: string;
    icon: 'venda' | 'orcamento' | 'aniversario' | 'viagem' | 'followup';
  };

  let loading = true;
  let errorMessage: string | null = null;
  let showCustomize = false;
  let savingCustomize = false;


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
  const defaultMonth = defaultPeriod.inicio.slice(0, 7);

  let periodoInicio = defaultPeriod.inicio;
  let periodoFim = defaultPeriod.fim;
  let filtroPeriodoModo: 'mes' | 'periodo' = 'mes';
  let mesSelecionado = defaultMonth;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';
  let filtrosInicializados = false;
  let lastAppliedFilterKey = '';
  let applyFiltersTimer: ReturnType<typeof setTimeout> | null = null;

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

  // Modal aviso aniversariante
  let showAvisoAniversario = false;
  let avisoAniv: { id: string; nome: string; telefone: string; email: string; nascimento: string | null } | null = null;

  function abrirAvisoAniversario(aniv: Aniversariante) {
    avisoAniv = {
      id: aniv.cliente_id || aniv.id,
      nome: aniv.nome,
      telefone: aniv.whatsapp || aniv.telefone || '',
      email: '',
      nascimento: aniv.nascimento || null
    };
    showAvisoAniversario = true;
  }
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

  function formatAgeFromBirthDate(value: string | null | undefined): number | null {
    if (!value) return null;
    const birth = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
    return Math.max(0, age);
  }

  function formatBirthdayContext(value: string | null | undefined): string {
    if (!value) return '-';
    const birth = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return '-';

    const today = new Date();
    const sameMonth = birth.getMonth() === today.getMonth();
    const dayDelta = birth.getDate() - today.getDate();
    if (sameMonth && dayDelta === 0) return 'Hoje';
    if (sameMonth && dayDelta === 1) return 'Amanha';
    return formatDate(value);
  }

  function formatRelativeTime(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return formatDate(value);

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.max(0, Math.round(diffMs / 60000));
    if (diffMin < 60) return `Ha ${diffMin} minuto${diffMin === 1 ? '' : 's'}`;

    const diffHour = Math.round(diffMin / 60);
    if (diffHour < 24) return `Ha ${diffHour} hora${diffHour === 1 ? '' : 's'}`;

    const diffDays = Math.round(diffHour / 24);
    if (diffDays <= 7) return `Ha ${diffDays} dia${diffDays === 1 ? '' : 's'}`;

    return formatDate(value);
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

  function getMetaAtingimentoColor(percentual: number) {
    const pct = clamp(percentual, 0, 100);
    // 0–80%: vermelho → laranja
    if (pct < 80) {
      const ratio = pct / 80;
      return interpolateRgb([239, 68, 68], [249, 115, 22], ratio);
    }
    // 80–100%: laranja → verde
    const ratio = (pct - 80) / 20;
    return interpolateRgb([249, 115, 22], [34, 197, 94], ratio);
  }

  function getMonthRange(monthValue: string) {
    const raw = String(monthValue || '').trim();
    if (!/^\d{4}-\d{2}$/.test(raw)) {
      return { inicio: defaultPeriod.inicio, fim: defaultPeriod.fim };
    }

    const [yearText, monthText] = raw.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const lastDay = new Date(year, month, 0).getDate();
    return {
      inicio: `${yearText}-${monthText}-01`,
      fim: `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`
    };
  }

  function syncUrl() {
    const params = new URLSearchParams();
    params.set('modo', filtroPeriodoModo);
    if (filtroPeriodoModo === 'mes') {
      params.set('mes', mesSelecionado);
    } else {
      params.set('inicio', periodoInicio);
      params.set('fim', periodoFim);
    }
    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
    if (vendedorSelecionado) params.set('vendedor_id', vendedorSelecionado);

    void goto(`/dashboard/geral?${params.toString()}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  }

  function scheduleAutoApply() {
    if (applyFiltersTimer) clearTimeout(applyFiltersTimer);
    applyFiltersTimer = setTimeout(() => {
      lastAppliedFilterKey = currentFilterKey;
      syncUrl();
      void atualizar();
      applyFiltersTimer = null;
    }, 250);
  }

  $: metaTotal = metas.reduce((sum, m) => sum + Number(m.meta_geral || 0), 0);
  $: metaSeguroTotal = metas.reduce((sum, m) => sum + Number(m.meta_diferenciada || 0), 0);
  $: atingimentoPct = metaTotal > 0 ? (vendasAgg.totalVendas / metaTotal) * 100 : 0;
  $: atingimentoSeguroPct = metaSeguroTotal > 0 ? (vendasAgg.totalSeguro / metaSeguroTotal) * 100 : 0;
  $: atingimentoPctClamped = clamp(atingimentoPct, 0, 100);
  $: atingimentoSeguroPctClamped = clamp(atingimentoSeguroPct, 0, 100);
  $: metaAtingimentoColor = getMetaAtingimentoColor(atingimentoPctClamped);
  $: metaSeguroAtingimentoColor = getMetaAtingimentoColor(atingimentoSeguroPctClamped);
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

  $: activityFeed = [
    ...followUps.slice(0, 2).map((item) => ({
      id: `fu-${item.id}`,
      titulo: item.destino_nome ? `Follow-up ${item.destino_nome}` : 'Follow-up pendente',
      subtitulo: item.cliente_nome || 'Cliente',
      tempo: formatRelativeTime(item.updated_at || item.data_fim || item.data_embarque),
      icon: 'followup'
    }) as ActivityItem),
    ...orcamentos.slice(0, 2).map((item) => ({
      id: `orc-${item.id}`,
      titulo: 'Orcamento enviado',
      subtitulo: item.cliente?.nome || 'Cliente',
      tempo: formatRelativeTime(item.created_at),
      icon: 'orcamento'
    }) as ActivityItem),
    ...viagens.slice(0, 2).map((item) => ({
      id: `v-${item.id}`,
      titulo: 'Viagem confirmada',
      subtitulo: item.cliente_nome || '-',
      tempo: formatRelativeTime(item.data_embarque),
      icon: 'viagem'
    }) as ActivityItem),
    ...aniversariantes
      .filter((item) => formatBirthdayContext(item.nascimento) === 'Hoje')
      .slice(0, 1)
      .map((item) => ({
        id: `aniv-${item.id}`,
        titulo: 'Aniversario hoje',
        subtitulo: item.nome,
        tempo: 'Hoje',
        icon: 'aniversario'
      }) as ActivityItem)
  ].slice(0, 6);

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
        backgroundColor: ['#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#fff7ed', '#e2e8f0']
      }
    ]
  } satisfies ChartData;

  $: availableWidgetIds = DEFAULT_WIDGET_ORDER.filter((id) => {
    if (id === 'consultorias' && !podeVerConsultoria) return false;
    if (id === 'viagens' && !podeVerOperacao) return false;
    return true;
  });

  $: activeWidgetOrder = widgetOrder.filter((id) => availableWidgetIds.includes(id) && widgetVisible[id] !== false);
  $: showVendedorFiltro = Boolean(
    userCtx && ['ADMIN', 'MASTER', 'GESTOR'].includes(String(userCtx.papel || '').toUpperCase()) && vendedoresFiltro.length > 0
  );

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

  $: if (filtroPeriodoModo === 'mes') {
    const range = getMonthRange(mesSelecionado);
    if (periodoInicio !== range.inicio) periodoInicio = range.inicio;
    if (periodoFim !== range.fim) periodoFim = range.fim;
  }

  $: currentFilterKey = [
    filtroPeriodoModo,
    mesSelecionado,
    periodoInicio,
    periodoFim,
    empresaSelecionada,
    vendedorSelecionado
  ].join('|');

  $: if (filtrosInicializados && currentFilterKey !== lastAppliedFilterKey) {
    scheduleAutoApply();
  }

  $: if (userCtx && !showVendedorFiltro && vendedorSelecionado) {
    vendedorSelecionado = '';
  }

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
          const d = await apiGet<{ items?: Viagem[]; proximas?: any[] }>('/api/v1/dashboard/viagens', params);
          if (Array.isArray(d.items)) {
            viagens = d.items;
          } else {
            viagens = (d.proximas || []).map((item: any) => ({
              id: String(item.id || ''),
              numero_venda: item.numero_venda ? String(item.numero_venda) : null,
              data_embarque: item.data_embarque ? String(item.data_embarque) : null,
              data_final: item.data_final ? String(item.data_final) : null,
              cliente_nome: String(item.cliente_nome || 'Cliente'),
              destino: item.destino ? String(item.destino) : null,
              vendedor_nome: item.vendedor_nome ? String(item.vendedor_nome) : null,
              status: 'confirmada'
            }));
          }
        } catch {
          viagens = [];
        }
      })(),
      (async () => {
        try {
          const d = await apiGet<{ items: any[] }>('/api/v1/dashboard/follow-ups', params);
          followUps = (d.items || []).map((item: any) => ({
            id: String(item.id || ''),
            venda_id: item.venda_id ? String(item.venda_id) : null,
            cliente_nome: String(item.cliente_nome || 'Cliente'),
            destino_nome: item.destino_nome ? String(item.destino_nome) : null,
            data_inicio: item.data_inicio ? String(item.data_inicio) : null,
            data_fim: item.data_fim ? String(item.data_fim) : null,
            data_embarque: item.data_embarque ? String(item.data_embarque) : null,
            follow_up_fechado: Boolean(item.follow_up_fechado),
            updated_at: item.updated_at ? String(item.updated_at) : null
          }));
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
    lastAppliedFilterKey = currentFilterKey;
    filtrosInicializados = true;
  });

  onDestroy(() => {
    if (applyFiltersTimer) clearTimeout(applyFiltersTimer);
  });

  function handleOrcamentoClick(row: Orcamento) {
    void goto(`/orcamentos/${row.id}`);
  }

  function goToRanking() {
    const mes = filtroPeriodoModo === 'mes' ? mesSelecionado : periodoInicio.slice(0, 7);
    const params = new URLSearchParams({ mes });
    void goto(`/relatorios/ranking?${params.toString()}`);
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
    { label: 'Ranking', onClick: goToRanking, variant: 'secondary', icon: BarChart2 }
  ]}
/>

<!-- Filtros -->
<Card color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
    <FieldSelect
      id="dash-periodo-modo"
      label="Período"
      bind:value={filtroPeriodoModo}
      options={[
        { value: 'mes', label: 'Mês completo' },
        { value: 'periodo', label: 'Data específica' }
      ]}
      class_name="w-full"
    />

    {#if filtroPeriodoModo === 'mes'}
      <FieldInput id="dash-mes" label="Mês" type="month" bind:value={mesSelecionado} class_name="w-full" />
    {:else}
      <FieldInput id="dash-inicio" label="Data início" type="date" bind:value={periodoInicio} class_name="w-full" />
      <FieldInput id="dash-fim" label="Data fim" type="date" bind:value={periodoFim} class_name="w-full" />
    {/if}

    {#if (userCtx?.papel === 'MASTER' || userCtx?.papel === 'ADMIN') && empresas.length > 0}
      <FieldSelect
        id="dash-empresa"
        label="Empresa"
        bind:value={empresaSelecionada}
        options={[{ value: '', label: 'Todas' }, ...empresas.map((e) => ({ value: e.id, label: e.nome }))]}
        class_name="w-full"
      />
    {/if}
    {#if showVendedorFiltro}
      <FieldSelect
        id="dash-vendedor"
        label="Vendedor"
        bind:value={vendedorSelecionado}
        options={[{ value: '', label: 'Todos' }, ...vendedoresFiltro.map((v) => ({ value: v.id, label: v.nome }))]}
        class_name="w-full"
      />
    {/if}
  </div>
</Card>

{#if errorMessage}
  <div class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
{/if}

<!-- KPIs — intocáveis conforme instrução -->
{#if activeWidgetOrder.includes('kpis')}
  <KPIGrid className="mb-6" columns={kpiGridColumns}>
    {#each activeKpiOrder as kpiId}
      {#if kpiId === 'vendas_periodo'}
        <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><TrendingUp size={18} /></div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-slate-500 sm:text-sm">Vendas no período</p>
            {#if loading}<div class="mt-1 h-7 w-24 animate-pulse rounded bg-slate-200"></div>
            {:else}<p class="truncate text-lg font-bold text-slate-900 sm:text-2xl">{formatCurrency(vendasAgg.totalVendas)}</p>
              <p class="mt-0.5 truncate text-xs text-slate-400">Lucro: {formatCurrency(vendasAgg.totalLiquido)}</p>{/if}
          </div>
        </div>
      {:else if kpiId === 'qtd_vendas'}
        <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-500"><ShoppingCart size={18} /></div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-slate-500 sm:text-sm">Qtd. vendas</p>
            {#if loading}<div class="mt-1 h-7 w-16 animate-pulse rounded bg-slate-200"></div>
            {:else}<p class="text-lg font-bold text-slate-900 sm:text-2xl">{vendasAgg.qtdVendas}</p>
              <p class="mt-0.5 truncate text-xs text-slate-400">Ticket: {formatCurrency(vendasAgg.ticketMedio)}</p>{/if}
          </div>
        </div>
      {:else if kpiId === 'meta_mes'}
        <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-500"><Target size={18} /></div>
          <div class="min-w-0 w-full flex-1">
            <p class="text-xs font-medium text-slate-500 sm:text-sm">Meta do mês</p>
            {#if loading}<div class="mt-1 h-7 w-24 animate-pulse rounded bg-slate-200"></div>
            {:else}<p class="truncate text-lg font-bold text-slate-900 sm:text-2xl">{formatCurrency(metaTotal)}</p>
              {#if metaTotal > 0}
                <div class="mt-1.5 w-full">
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div class="h-1.5 rounded-full transition-all duration-500" style={`width:${atingimentoPctClamped.toFixed(1)}%;background-color:${metaAtingimentoColor};`}></div>
                  </div>
                  <p class="mt-0.5 text-xs text-slate-400">{atingimentoPct.toFixed(1)}% atingido</p>
                </div>
              {:else}<p class="mt-0.5 text-xs text-slate-400">Sem meta</p>{/if}
            {/if}
          </div>
        </div>
      {:else if kpiId === 'dias_mes'}
        <div class="vtur-kpi-card border-t-[3px] border-t-slate-300">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Calendar size={18} /></div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-slate-500 sm:text-sm">Dias no mês</p>
            {#if loading}<div class="mt-1 h-7 w-16 animate-pulse rounded bg-slate-200"></div>
            {:else}<p class="text-lg font-bold text-slate-900 sm:text-2xl">{diasRestantes}d</p>
              {#if metaDiaria > 0}<p class="mt-0.5 truncate text-xs text-slate-400">Meta/dia: {formatCurrency(metaDiaria)}</p>
              {:else if diasRestantes === 0}<p class="mt-0.5 text-xs text-slate-400">Fim do mês</p>
              {:else}<p class="mt-0.5 text-xs text-slate-400">Meta atingida ✓</p>{/if}
            {/if}
          </div>
        </div>
      {:else if kpiId === 'seguro_viagem' && (loading || vendasAgg.totalSeguro > 0)}
        <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><Award size={18} /></div>
          <div class="min-w-0 w-full flex-1">
            <p class="text-xs font-medium text-slate-500 sm:text-sm">Seguro viagem</p>
            {#if loading}<div class="mt-1 h-7 w-24 animate-pulse rounded bg-slate-200"></div>
            {:else}<p class="truncate text-lg font-bold text-slate-900 sm:text-2xl">{formatCurrency(vendasAgg.totalSeguro)}</p>
              {#if metaSeguroTotal > 0}
                <div class="mt-1.5 w-full">
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div class="h-1.5 rounded-full transition-all duration-500" style={`width:${atingimentoSeguroPctClamped.toFixed(1)}%;background-color:${metaSeguroAtingimentoColor};`}></div>
                  </div>
                  <p class="mt-0.5 text-xs text-slate-400">{atingimentoSeguroPct.toFixed(1)}% meta</p>
                </div>
              {:else}<p class="mt-0.5 text-xs text-slate-400">Sem meta de seguro</p>{/if}
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  </KPIGrid>
{/if}

<!-- Linha 1: Evolução das vendas -->
{#if activeWidgetOrder.includes('timeline')}
  <div class="mb-6">
    <div class="vtur-card p-4 sm:p-6">
      <div class="mb-4 flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <h3 class="text-base font-bold text-slate-900">Evolução das vendas</h3>
          <p class="hidden text-sm text-slate-500 sm:block">Análise do desempenho de vendas no período selecionado</p>
        </div>
        <Button variant="secondary" size="sm" on:click={() => goto('/relatorios/vendas')} class_name="shrink-0">
          <BarChart2 size={14} class="mr-1.5" />Ver detalhes
        </Button>
      </div>
      {#if loading}
        <div class="h-52 animate-pulse rounded-xl bg-slate-100"></div>
      {:else if vendasAgg.timeline.length === 0}
        <p class="py-12 text-center text-sm text-slate-400">Nenhuma venda no período.</p>
      {:else}
        <ChartJS type="line" data={timelineChartData} height={200} />
      {/if}
    </div>
  </div>
{/if}

<!-- Linha 2: Top destinos + Vendas por produto -->
{#if activeWidgetOrder.includes('top_destinos') || activeWidgetOrder.includes('por_produto')}
  <div class="mb-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
    {#if activeWidgetOrder.includes('top_destinos')}
      <div class="vtur-card p-6">
        <div class="mb-4">
          <h3 class="text-base font-bold text-slate-900">Top destinos</h3>
          <p class="text-sm text-slate-500">Mais vendidos do período</p>
        </div>
        <div class="border-t border-slate-100 pt-4">
          {#if loading}
            <div class="space-y-3">
              {#each [1, 2, 3, 4, 5] as _}
                <div class="h-10 animate-pulse rounded-lg bg-slate-100"></div>
              {/each}
            </div>
          {:else if vendasAgg.topDestinos.length === 0}
            <p class="py-8 text-center text-sm text-slate-400">Nenhum destino no período.</p>
          {:else}
            <div class="divide-y divide-slate-100">
              {#each vendasAgg.topDestinos.slice(0, 5) as destino, i}
                <div class="flex items-center gap-3 py-2.5">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">{i + 1}</span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-slate-900">{destino.name}</p>
                    <p class="text-xs text-slate-500">{destino.count || 0} vendas</p>
                  </div>
                  <span class="whitespace-nowrap text-sm font-bold text-vendas-600">{formatCurrency(destino.value)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if activeWidgetOrder.includes('por_produto')}
      <div class="vtur-card p-6">
        <div class="mb-4">
          <h3 class="text-base font-bold text-slate-900">Vendas por produto</h3>
          <p class="text-sm text-slate-500">Distribuição de receita por produto</p>
        </div>
        <div class="border-t border-slate-100 pt-4">
          {#if loading}
            <div class="h-48 animate-pulse rounded-xl bg-slate-100"></div>
          {:else if vendasAgg.porProduto.length === 0}
            <p class="py-8 text-center text-sm text-slate-400">Nenhum produto no período.</p>
          {:else}
            <ChartJS type="bar" data={produtoChartData} height={220} />
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<!-- Linha 3: Próximas viagens + Atividades recentes + Aniversariantes -->
{#if (activeWidgetOrder.includes('viagens') && podeVerOperacao) || activeWidgetOrder.includes('aniversariantes') || true}
  <div class="mb-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
    {#if activeWidgetOrder.includes('viagens') && podeVerOperacao}
      <div class="vtur-card p-6">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Plane size={18} />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Próximas Viagens</h3>
              <p class="text-xs text-slate-500">Saídas nos próximos dias</p>
            </div>
          </div>
          <a href="/operacao/viagens" class="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            Ver todas <span class="text-base">→</span>
          </a>
        </div>
        <div class="border-t border-slate-100 pt-4">
          {#if loading}
            <div class="space-y-3">
              {#each [1, 2, 3] as _}
                <div class="h-16 animate-pulse rounded-xl bg-slate-100"></div>
              {/each}
            </div>
          {:else if viagens.length === 0}
            <p class="py-8 text-center text-sm text-slate-400">Nenhuma viagem próxima.</p>
          {:else}
            <div class="space-y-3">
              {#each viagens.slice(0, 5) as v}
                {@const statusLabel = v.status === 'confirmada' ? 'Confirmado' : v.status === 'em_viagem' ? 'Em viagem' : v.status === 'pendente' ? 'Pendente' : v.status || 'Pendente'}
                {@const statusClass = v.status === 'confirmada' ? 'bg-green-100 text-green-700' : v.status === 'em_viagem' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}
                <a
                  href="/operacao/viagens/{v.id}"
                  class="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-indigo-50 hover:border-indigo-200 transition-colors group"
                >
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                    <MapPin size={18} />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{v.destino || '-'}</p>
                    <p class="truncate text-xs text-slate-500">{v.cliente_nome || '-'}</p>
                    <p class="text-xs text-slate-400 mt-0.5">
                      <span class="inline-flex items-center gap-1"><Calendar size={12} /> {formatDate(v.data_embarque)}</span>
                      {#if v.numero_venda}<span class="ml-2 inline-flex items-center gap-1">#{v.numero_venda}</span>{/if}
                    </p>
                  </div>
                  <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold {statusClass}">{statusLabel}</span>
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="vtur-card p-6">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock size={18} />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">Atividades Recentes</h3>
            <p class="text-xs text-slate-500">Últimas movimentações no sistema</p>
          </div>
        </div>
      </div>
      <div class="border-t border-slate-100 pt-4">
        {#if loading}
          <div class="space-y-4">
            {#each [1, 2, 3, 4] as _}
              <div class="flex items-center gap-4">
                <div class="h-10 w-10 animate-pulse rounded-full bg-slate-100"></div>
                <div class="flex-1 space-y-1">
                  <div class="h-4 w-40 animate-pulse rounded bg-slate-100"></div>
                  <div class="h-3 w-24 animate-pulse rounded bg-slate-100"></div>
                </div>
              </div>
            {/each}
          </div>
        {:else if activityFeed.length === 0}
          <p class="py-6 text-center text-sm text-slate-400">Nenhuma atividade recente.</p>
        {:else}
          <div class="space-y-0">
            {#each activityFeed as item, idx}
              <div class="relative flex items-start gap-4 py-3">
                {#if idx < activityFeed.length - 1}
                  <span class="absolute left-[19px] top-12 h-[calc(100%-12px)] w-px bg-slate-200"></span>
                {/if}
                <div class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-sm">
                  {#if item.icon === 'orcamento'}<FileText size={18} class="text-amber-500" />
                  {:else if item.icon === 'aniversario'}<Gift size={18} class="text-green-500" />
                  {:else if item.icon === 'viagem'}<Plane size={18} class="text-indigo-500" />
                  {:else if item.icon === 'followup'}<Clock size={18} class="text-violet-500" />
                  {:else}<Clock size={18} class="text-slate-400" />{/if}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-slate-900">{item.titulo}</p>
                  <p class="text-xs text-slate-500">{item.subtitulo}</p>
                </div>
                <span class="shrink-0 pt-1 text-xs text-slate-400">{item.tempo}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    {#if activeWidgetOrder.includes('aniversariantes')}
      <div class="vtur-card p-6">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <Gift size={18} />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Aniversariantes</h3>
              <p class="text-xs text-slate-500">Próximos aniversários</p>
            </div>
          </div>
        </div>
        <div class="border-t border-slate-100 pt-4">
          {#if loading}
            <div class="space-y-3">
              {#each [1, 2, 3] as _}
                <div class="h-12 animate-pulse rounded-xl bg-slate-100"></div>
              {/each}
            </div>
          {:else if aniversariantes.length === 0}
            <p class="py-8 text-center text-sm text-slate-400">Nenhum aniversariante este mês.</p>
          {:else}
            <div class="space-y-1">
              {#each aniversariantes.slice(0, 5) as aniv}
                {@const iniciais = aniv.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                {@const idade = formatAgeFromBirthDate(aniv.nascimento)}
                {@const contexto = formatBirthdayContext(aniv.nascimento)}
                <button
                  type="button"
                  on:click={() => abrirAvisoAniversario(aniv)}
                  title="Enviar aviso de aniversário"
                  class="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-green-50 transition-colors group text-left"
                >
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white group-hover:bg-green-600 transition-colors">{iniciais}</div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-slate-900 group-hover:text-green-700 transition-colors">{aniv.nome}</p>
                    <p class="text-xs text-slate-500">{#if idade !== null}{idade} anos{/if}{#if idade !== null} • {/if}{contexto}</p>
                  </div>
                  <span class="shrink-0 text-slate-300 group-hover:text-green-500 transition-colors" title="Enviar aviso">
                    <Send size={15} />
                  </span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<!-- Linha 4: Tarefas pendentes + Orçamentos recentes -->
{#if activeWidgetOrder.includes('followups') || activeWidgetOrder.includes('orcamentos')}
  <div class="mb-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
    {#if activeWidgetOrder.includes('followups')}
      <div class="vtur-card p-6">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <FileText size={18} />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Tarefas Pendentes</h3>
              <p class="text-xs text-slate-500">Ações prioritárias</p>
            </div>
          </div>
          <a href="/vendas" class="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            Ver todas <span class="text-base">→</span>
          </a>
        </div>
        <div class="border-t border-slate-100 pt-4">
          {#if loading}
            <div class="space-y-3">
              {#each [1, 2, 3] as _}
                <div class="h-16 animate-pulse rounded-xl bg-slate-100"></div>
              {/each}
            </div>
          {:else if followUps.length === 0}
            <p class="py-8 text-center text-sm text-slate-400">Nenhum follow-up pendente.</p>
          {:else}
            <div class="space-y-3">
              {#each followUps.slice(0, 5) as fu, i}
                {@const prioridade = i === 0 ? { label: 'Alta', class: 'bg-red-100 text-red-600' } : i === 1 ? { label: 'Media', class: 'bg-amber-100 text-amber-600' } : { label: 'Baixa', class: 'bg-blue-100 text-blue-600' }}
                <div class="rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors {i === 1 ? 'border-indigo-100 bg-indigo-50/40' : ''}">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-semibold text-slate-900">
                      {#if fu.destino_nome}Follow-up {fu.destino_nome}
                      {:else}Follow-up pendente{/if}
                    </p>
                    <span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold {prioridade.class}">{prioridade.label}</span>
                  </div>
                  <p class="mt-1 text-xs text-slate-500 flex items-center gap-3">
                    <span class="flex items-center gap-1">Cliente: {fu.cliente_nome || '-'}</span>
                    <span class="flex items-center gap-1"><Clock size={12} /> {formatDate(fu.data_fim || fu.data_embarque)}</span>
                  </p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if activeWidgetOrder.includes('orcamentos')}
      <div class="vtur-card p-6">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <FileText size={18} />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Orçamentos Recentes</h3>
              <p class="text-xs text-slate-500">Últimas propostas</p>
            </div>
          </div>
          <a href="/orcamentos" class="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            Ver todos <span class="text-base">→</span>
          </a>
        </div>
        <div class="border-t border-slate-100 pt-4">
          {#if loading}
            <div class="space-y-3">
              {#each [1, 2, 3] as _}
                <div class="h-14 animate-pulse rounded-xl bg-slate-100"></div>
              {/each}
            </div>
          {:else if orcamentos.length === 0}
            <p class="py-8 text-center text-sm text-slate-400">Nenhum orçamento no período.</p>
          {:else}
            <div class="space-y-2">
              {#each orcamentos.slice(0, 5) as orc}
                {@const statusLabel = orc.status === 'aprovado' ? 'Aprovado' : orc.status === 'enviado' ? 'Enviado' : orc.status === 'aguardando' ? 'Aguardando' : orc.status || '-'}
                {@const statusClass = orc.status === 'aprovado' ? 'bg-green-100 text-green-700' : orc.status === 'enviado' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}
                <button
                  type="button"
                  class="w-full rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
                  on:click={() => handleOrcamentoClick(orc)}
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-semibold text-slate-900">{orc.cliente?.nome || 'Cliente'}</p>
                        <span class="rounded-full px-2 py-0.5 text-xs font-semibold {statusClass}">{statusLabel}</span>
                      </div>
                      <p class="text-xs text-slate-500 mt-0.5">
                        {orc.quote_item?.[0]?.city_name || orc.quote_item?.[0]?.title || '-'}
                      </p>
                      <p class="text-xs text-slate-400">{formatDate(orc.created_at)}</p>
                    </div>
                    <span class="shrink-0 text-sm font-bold text-slate-900">{formatCurrency(orc.total || 0)}</span>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<!-- Linha 5: Consultorias (largura total, quando disponível) -->
{#if activeWidgetOrder.includes('consultorias') && podeVerConsultoria}
  <div class="mb-6 vtur-card p-6">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <UserPlus size={18} />
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900">Consultorias agendadas</h3>
          <p class="text-xs text-slate-500">Próximas sessões</p>
        </div>
      </div>
    </div>
    <div class="border-t border-slate-100 pt-4">
      {#if loading}
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          {#each [1,2,3] as _}
            <div class="h-16 animate-pulse rounded-xl bg-slate-100"></div>
          {/each}
        </div>
      {:else if consultorias.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhuma consultoria agendada.</p>
      {:else}
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {#each consultorias.slice(0, 6) as c}
            <div class="rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
              <p class="text-sm font-semibold text-slate-900 truncate">{c.cliente_nome}</p>
              <p class="text-xs text-slate-500 mt-0.5">{formatDateTime(c.data_hora)}{#if c.destino} · {c.destino}{/if}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

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

{#if avisoAniv}
  <ModalAvisoCliente
    bind:open={showAvisoAniversario}
    clienteId={avisoAniv.id}
    clienteNome={avisoAniv.nome}
    clienteTelefone={avisoAniv.telefone}
    clienteEmail={avisoAniv.email}
    clienteNascimento={avisoAniv.nascimento}
    onClose={() => { showAvisoAniversario = false; avisoAniv = null; }}
    onEnviar={() => toast.success('Aviso preparado com sucesso.')}
  />
{/if}

