<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldSelect } from '$lib/components/ui';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import {
    TrendingUp,
    TrendingDown,
    Minus,
    BarChart3,
    RefreshCw,
    Building2,
  } from 'lucide-svelte';
  import type { ChartData, ChartOptions } from 'chart.js';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { apiGet } from '$lib/services/api';

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------
  interface MesBucket {
    mes: number;
    totalVendas: number;
    qtdVendas: number;
  }

  interface AnoEvolucao {
    ano: number;
    meses: MesBucket[];
    totalAno: number;
    qtdAno: number;
  }

  interface EvolucaoAnualResult {
    anos: AnoEvolucao[];
    crescimentoYoY: Record<string, number | null>;
  }

  interface EmpresaFiltro {
    id: string;
    nome: string;
  }

  // ---------------------------------------------------------------------------
  // Paleta de cores por ano (até 5 anos)
  // ---------------------------------------------------------------------------
  const ANO_COLORS = [
    { border: '#2457a6', bg: 'rgba(36, 87, 166, 0.15)' },
    { border: '#0f766e', bg: 'rgba(15, 118, 110, 0.15)' },
    { border: '#b45309', bg: 'rgba(180, 83, 9, 0.15)' },
    { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.15)' },
    { border: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)' },
  ];

  const MESES_LABELS = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const currentYear = new Date().getFullYear();

  // Anos disponíveis: 2020 → ano atual
  const anosDisponiveis: number[] = [];
  for (let y = currentYear; y >= 2020; y--) anosDisponiveis.push(y);

  // Seleção: por padrão últimos 2 anos
  let anosSelecionados: number[] = [currentYear - 1, currentYear];
  let empresaSelecionada = '';
  let empresas: EmpresaFiltro[] = [];
  let loading = false;
  let loadingBase = false;
  let data: EvolucaoAnualResult | null = null;

  // Toggle de seleção de anos (max 4)
  function toggleAno(ano: number) {
    if (anosSelecionados.includes(ano)) {
      if (anosSelecionados.length > 1) {
        anosSelecionados = anosSelecionados.filter((a) => a !== ano);
      }
    } else {
      if (anosSelecionados.length < 4) {
        anosSelecionados = [...anosSelecionados, ano].sort((a, b) => a - b);
      } else {
        toast.warning('Selecione no máximo 4 anos para comparar.');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Format helpers
  // ---------------------------------------------------------------------------
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatCurrencyShort(value: number): string {
    if (value >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
    }
    if (value >= 1_000) {
      return `R$ ${(value / 1_000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  }

  function formatPct(value: number | null): string {
    if (value === null) return '–';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  async function loadBase() {
    if (!$permissoes.isMaster) return;
    loadingBase = true;
    try {
      const base = await apiGet<{ empresas?: EmpresaFiltro[] }>('/api/v1/relatorios/base');
      empresas = (base.empresas || []).map((e: any) => ({
        id: String(e.id || e.company_id || ''),
        nome: String(e.nome_fantasia || e.nome_empresa || e.nome || 'Empresa'),
      }));
    } catch {
      empresas = [];
    } finally {
      loadingBase = false;
    }
  }

  async function loadDesempenho() {
    if (anosSelecionados.length === 0) return;
    loading = true;
    try {
      const params = new URLSearchParams();
      params.set('anos', anosSelecionados.join(','));
      if (empresaSelecionada) params.set('company_id', empresaSelecionada);

      const res = await apiGet<{ data: EvolucaoAnualResult }>(`/api/v1/dashboard/evolucao-anual?${params}`);
      data = res.data;
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar análise de desempenho.');
      data = null;
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    await loadBase();
    await loadDesempenho();
  });

  // ---------------------------------------------------------------------------
  // Reactive chart data
  // ---------------------------------------------------------------------------
  $: evolucaoLineData = (() => {
    if (!data?.anos?.length) return null;
    const datasets = data.anos.map((ano, idx) => {
      const color = ANO_COLORS[idx % ANO_COLORS.length];
      return {
        label: String(ano.ano),
        data: ano.meses.map((m) => m.totalVendas),
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.3,
      };
    });
    return { labels: MESES_LABELS, datasets } as ChartData;
  })();

  $: comparativoBarData = (() => {
    if (!data?.anos?.length) return null;
    const datasets = data.anos.map((ano, idx) => {
      const color = ANO_COLORS[idx % ANO_COLORS.length];
      return {
        label: String(ano.ano),
        data: ano.meses.map((m) => m.totalVendas),
        backgroundColor: color.bg.replace('0.15)', '0.7)'),
        borderColor: color.border,
        borderWidth: 1.5,
        borderRadius: 4,
      };
    });
    return { labels: MESES_LABELS, datasets } as ChartData;
  })();

  $: qtdVendasLineData = (() => {
    if (!data?.anos?.length) return null;
    const datasets = data.anos.map((ano, idx) => {
      const color = ANO_COLORS[idx % ANO_COLORS.length];
      return {
        label: String(ano.ano),
        data: ano.meses.map((m) => m.qtdVendas),
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2,
        pointRadius: 3,
        fill: false,
        tension: 0.3,
      };
    });
    return { labels: MESES_LABELS, datasets } as ChartData;
  })();

  // Ticket médio mensal
  $: ticketMedioLineData = (() => {
    if (!data?.anos?.length) return null;
    const datasets = data.anos.map((ano, idx) => {
      const color = ANO_COLORS[idx % ANO_COLORS.length];
      return {
        label: String(ano.ano),
        data: ano.meses.map((m) =>
          m.qtdVendas > 0 ? Math.round(m.totalVendas / m.qtdVendas) : 0
        ),
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2,
        pointRadius: 3,
        fill: false,
        tension: 0.3,
      };
    });
    return { labels: MESES_LABELS, datasets } as ChartData;
  })();

  // Opções dos gráficos
  const lineOptions: ChartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.raw))}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (val) => formatCurrencyShort(Number(val)),
        },
      },
    },
  };

  const qtdOptions: ChartOptions = {
    scales: {
      y: { beginAtZero: true },
    },
  };

  const ticketOptions: ChartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.raw))}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (val) => formatCurrencyShort(Number(val)),
        },
      },
    },
  };

  const barOptions: ChartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.raw))}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (val) => formatCurrencyShort(Number(val)),
        },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  // Crescimento YoY para KPI cards
  $: yoyEntries = data?.crescimentoYoY
    ? Object.entries(data.crescimentoYoY)
    : [];

  // Melhor mês por ano
  $: melhorMesPorAno = data?.anos?.map((ano) => {
    const melhor = ano.meses.reduce(
      (best, m) => (m.totalVendas > best.totalVendas ? m : best),
      ano.meses[0],
    );
    return {
      ano: ano.ano,
      mes: melhor ? MESES_LABELS[melhor.mes - 1] : '–',
      valor: melhor ? melhor.totalVendas : 0,
    };
  }) ?? [];

  // Pior mês por ano (considerando apenas meses com dados)
  $: piorMesPorAno = data?.anos?.map((ano) => {
    const comDados = ano.meses.filter((m) => m.totalVendas > 0);
    if (!comDados.length) return { ano: ano.ano, mes: '–', valor: 0 };
    const pior = comDados.reduce(
      (worst, m) => (m.totalVendas < worst.totalVendas ? m : worst),
      comDados[0],
    );
    return {
      ano: ano.ano,
      mes: MESES_LABELS[pior.mes - 1],
      valor: pior.totalVendas,
    };
  }) ?? [];

  function yoyIcon(pct: number | null) {
    if (pct === null) return Minus;
    if (pct > 0) return TrendingUp;
    if (pct < 0) return TrendingDown;
    return Minus;
  }

  function yoyColor(pct: number | null): string {
    if (pct === null) return 'text-slate-400';
    if (pct > 0) return 'text-emerald-600';
    if (pct < 0) return 'text-red-600';
    return 'text-slate-400';
  }
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950">
  <PageHeader
    title="Análise de Desempenho"
    subtitle="Compare a evolução das vendas entre múltiplos anos"
    color="vendas"
    breadcrumbs={[
      { label: 'Relatórios', href: '/relatorios' },
      { label: 'Análise de Desempenho' },
    ]}
    actions={[
      {
        label: loading ? 'Carregando...' : 'Atualizar',
        onClick: () => loadDesempenho(),
        variant: 'secondary',
        icon: RefreshCw,
      },
    ]}
  />

  <div class="mx-auto max-w-screen-xl space-y-6 p-4 sm:p-6">

    <!-- Filtros -->
    <Card>
      <div class="flex flex-wrap items-end gap-4">
        <!-- Seleção de anos -->
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium text-slate-500">Anos para comparar (máx. 4)</span>
          <div class="flex flex-wrap gap-2">
            {#each anosDisponiveis as ano}
              {@const ativo = anosSelecionados.includes(ano)}
              {@const idx = anosSelecionados.indexOf(ano)}
              <button
                type="button"
                class="rounded-full border px-3 py-1 text-sm font-medium transition-all {ativo
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'}"
                style={ativo ? `background-color: ${ANO_COLORS[idx % ANO_COLORS.length].border}` : ''}
                on:click={() => toggleAno(ano)}
              >
                {ano}
              </button>
            {/each}
          </div>
        </div>

        <!-- Filtro empresa (só MASTER) -->
        {#if $permissoes.isMaster && empresas.length > 0}
          <div class="min-w-[220px]">
            <FieldSelect
              label="Empresa"
              bind:value={empresaSelecionada}
              options={[
                { value: '', label: 'Todas as empresas' },
                ...empresas.map((e) => ({ value: e.id, label: e.nome })),
              ]}
            />
          </div>
        {/if}

        <Button
          variant="primary"
          size="sm"
          on:click={loadDesempenho}
          disabled={loading || anosSelecionados.length === 0}
          class="self-end"
        >
          {loading ? 'Carregando...' : 'Aplicar'}
        </Button>
      </div>
    </Card>

    {#if loading && !data}
      <!-- Skeleton -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        {#each [1, 2, 3, 4] as _}
          <Card>
            <div class="animate-pulse space-y-3">
              <div class="h-4 w-1/3 rounded bg-slate-200"></div>
              <div class="h-48 rounded bg-slate-100"></div>
            </div>
          </Card>
        {/each}
      </div>
    {:else if data?.anos?.length}

      <!-- KPIs de crescimento YoY -->
      {#if yoyEntries.length > 0 || data.anos.length > 0}
        <div>
          <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Resumo por ano
          </h2>
          <KPIGrid columns={data.anos.length <= 2 ? 2 : data.anos.length <= 3 ? 3 : 4}>
            {#each data.anos as anoData, idx}
              {@const color = ANO_COLORS[idx % ANO_COLORS.length]}
              <div
                class="vtur-kpi-card"
                style="border-top: 3px solid {color.border};"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-xs font-medium text-slate-500">{anoData.ano}</p>
                    <p class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {formatCurrencyShort(anoData.totalAno)}
                    </p>
                    <p class="mt-0.5 text-xs text-slate-500">
                      {anoData.qtdAno} vendas · Ticket médio {anoData.qtdAno > 0
                        ? formatCurrencyShort(anoData.totalAno / anoData.qtdAno)
                        : '–'}
                    </p>
                  </div>
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style="background-color: {color.bg.replace('0.15)', '0.15)')}; color: {color.border};"
                  >
                    <BarChart3 class="h-5 w-5" />
                  </div>
                </div>

                <!-- YoY para este ano -->
                {#each yoyEntries as [key, pct]}
                  {#if key.endsWith(`->${anoData.ano}`)}
                    {@const prevAno = key.split('->')[0]}
                    <div class="mt-2 flex items-center gap-1 {yoyColor(pct)} text-xs font-medium">
                      <svelte:component this={yoyIcon(pct)} class="h-3.5 w-3.5" />
                      <span>{formatPct(pct)} vs {prevAno}</span>
                    </div>
                  {/if}
                {/each}
              </div>
            {/each}
          </KPIGrid>
        </div>
      {/if}

      <!-- Gráficos principais -->
      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">

        <!-- Evolução de receita (linha) -->
        <Card>
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Evolução de Receita
              </h3>
              <p class="text-xs text-slate-400">Receita mensal acumulada por ano</p>
            </div>
          </div>
          {#if evolucaoLineData}
            <ChartJS type="line" data={evolucaoLineData} options={lineOptions} height={280} />
          {/if}
        </Card>

        <!-- Comparativo de barras -->
        <Card>
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Comparativo Mensal
            </h3>
            <p class="text-xs text-slate-400">Receita lado a lado por mês</p>
          </div>
          {#if comparativoBarData}
            <ChartJS type="bar" data={comparativoBarData} options={barOptions} height={280} />
          {/if}
        </Card>

        <!-- Quantidade de vendas -->
        <Card>
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Quantidade de Vendas
            </h3>
            <p class="text-xs text-slate-400">Número de vendas por mês</p>
          </div>
          {#if qtdVendasLineData}
            <ChartJS type="line" data={qtdVendasLineData} options={qtdOptions} height={280} />
          {/if}
        </Card>

        <!-- Ticket médio -->
        <Card>
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Ticket Médio Mensal
            </h3>
            <p class="text-xs text-slate-400">Receita média por venda</p>
          </div>
          {#if ticketMedioLineData}
            <ChartJS type="line" data={ticketMedioLineData} options={ticketOptions} height={280} />
          {/if}
        </Card>
      </div>

      <!-- Destaques: melhor e pior mês por ano -->
      <div>
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Destaques por ano
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {#each data.anos as anoData, idx}
            {@const color = ANO_COLORS[idx % ANO_COLORS.length]}
            {@const melhor = melhorMesPorAno[idx]}
            {@const pior = piorMesPorAno[idx]}
            <Card class="space-y-3">
              <div class="flex items-center gap-2">
                <span
                  class="inline-block h-3 w-3 rounded-full"
                  style="background-color: {color.border};"
                ></span>
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {anoData.ano}
                </span>
              </div>

              <div class="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                <p class="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  🏆 Melhor mês
                </p>
                <p class="mt-0.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {melhor?.mes ?? '–'}
                </p>
                <p class="text-xs text-emerald-600 dark:text-emerald-400">
                  {melhor ? formatCurrency(melhor.valor) : '–'}
                </p>
              </div>

              <div class="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                <p class="text-xs font-medium text-red-500 dark:text-red-400">
                  📉 Menor mês (c/ dados)
                </p>
                <p class="mt-0.5 text-sm font-semibold text-red-600 dark:text-red-300">
                  {pior?.mes ?? '–'}
                </p>
                <p class="text-xs text-red-500 dark:text-red-400">
                  {pior ? formatCurrency(pior.valor) : '–'}
                </p>
              </div>
            </Card>
          {/each}
        </div>
      </div>

    {:else if !loading}
      <Card>
        <div class="py-12 text-center text-slate-400">
          <BarChart3 class="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p class="text-sm">Nenhum dado encontrado para os anos selecionados.</p>
        </div>
      </Card>
    {/if}

  </div>
</div>
