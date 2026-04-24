<script lang="ts">
  import { onMount } from 'svelte';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { RefreshCw, Target, TrendingUp, Users, Wallet } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';

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

  type Orcamento = {
    id: string;
    created_at: string;
    status: string | null;
    total: number | null;
    cliente?: { id?: string | null; nome?: string | null } | null;
  };

  type Viagem = {
    id: string;
    data_inicio: string | null;
    data_fim: string | null;
    destino: string | null;
    clientes?: { nome: string | null } | null;
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
    podeVerOperacao?: boolean;
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
    orcamentos?: Orcamento[];
  };

  let loading = true;
  let errorMessage: string | null = null;
  let userCtx: SummaryPayload['userCtx'] = null;
  let podeVerOperacao = false;

  let periodoInicio = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  })();
  let periodoFim = new Date().toISOString().slice(0, 10);
  let empresaSelecionada = '';
  let vendedorSelecionado = '';

  let empresas: { id: string; nome: string }[] = [];
  let vendedoresFiltro: { id: string; nome: string }[] = [];
  let filtrosInicializados = false;
  let lastAppliedFilterKey = '';

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
  let orcamentos: Orcamento[] = [];
  let viagens: Viagem[] = [];
  let followUps: FollowUp[] = [];

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
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
  $: salesLabel = isFiltroVendedorAtivo ? `Vendas de ${vendedorSelecionadoNome}` : 'Vendas da equipe';
  $: countLabel = isFiltroVendedorAtivo ? `Qtd. vendas de ${vendedorSelecionadoNome}` : 'Qtd. vendas';
  $: metaLabel = isFiltroVendedorAtivo ? `Meta de ${vendedorSelecionadoNome}` : 'Meta da equipe';
  $: scopeLabel = isFiltroVendedorAtivo ? 'Vendedor no escopo' : 'Equipe no escopo';
  $: scopeHelperLabel = isFiltroVendedorAtivo
    ? `Filtro: ${vendedorSelecionadoNome}`
    : `Papel: ${userCtx?.papel || '-'}`;
  $: evolucaoHeader = isFiltroVendedorAtivo
    ? `Evolução das vendas de ${vendedorSelecionadoNome}`
    : 'Evolução das vendas';
  $: destinosHeader = isFiltroVendedorAtivo
    ? `Top destinos de ${vendedorSelecionadoNome}`
    : 'Top destinos da equipe';
  $: orcamentosHeader = isFiltroVendedorAtivo
    ? `Orçamentos de ${vendedorSelecionadoNome}`
    : 'Orçamentos recentes';
  $: orcamentosEmptyLabel = isFiltroVendedorAtivo
    ? `Nenhum orçamento de ${vendedorSelecionadoNome} no período.`
    : 'Nenhum orçamento no período.';
  $: followUpHeader = isFiltroVendedorAtivo
    ? `Follow-up de ${vendedorSelecionadoNome}`
    : 'Follow-up';
  $: followUpEmptyLabel = isFiltroVendedorAtivo
    ? `Nenhum follow-up pendente de ${vendedorSelecionadoNome}.`
    : 'Nenhum follow-up pendente.';
  $: viagensHeader = isFiltroVendedorAtivo
    ? `Próximas viagens de ${vendedorSelecionadoNome}`
    : 'Próximas viagens';
  $: viagensEmptyLabel = isFiltroVendedorAtivo
    ? `Nenhuma viagem próxima de ${vendedorSelecionadoNome}.`
    : 'Nenhuma viagem próxima.';
  $: currentFilterKey = [periodoInicio, periodoFim, empresaSelecionada, vendedorSelecionado].join('|');

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
      const data = await apiGet<{ empresas: { id: string; nome: string }[]; vendedores: { id: string; nome: string }[] }>('/api/v1/relatorios/base');
      empresas = data.empresas || [];
      vendedoresFiltro = data.vendedores || [];
    } catch {
      empresas = [];
      vendedoresFiltro = [];
    }
  }

  async function loadDashboard() {
    loading = true;
    errorMessage = null;

    try {
      const payload = await apiGet<SummaryPayload>('/api/v1/dashboard/summary', {
        inicio: periodoInicio,
        fim: periodoFim,
        include_orcamentos: 1,
        company_id: empresaSelecionada || undefined,
        vendedor_ids: vendedorSelecionado || undefined
      });

      userCtx = payload.userCtx || null;
      vendasAgg = payload.vendasAgg || vendasAgg;
      metas = payload.metas || [];
      orcamentos = payload.orcamentos || [];
      podeVerOperacao = Boolean(payload.podeVerOperacao);
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

    await Promise.allSettled([
      (async () => {
        if (!podeVerOperacao) {
          viagens = [];
          return;
        }
        try {
          const data = await apiGet<{ items: Viagem[] }>('/api/v1/dashboard/viagens', params);
          viagens = data.items || [];
        } catch {
          viagens = [];
        }
      })(),
      (async () => {
        try {
          const data = await apiGet<{ items: FollowUp[] }>('/api/v1/dashboard/follow-ups', params);
          followUps = data.items || [];
        } catch {
          followUps = [];
        }
      })()
    ]);
  }

  async function atualizar() {
    await loadDashboard();
    await loadOperational();
  }

  $: if (filtrosInicializados && currentFilterKey !== lastAppliedFilterKey) {
    lastAppliedFilterKey = currentFilterKey;
    void atualizar();
  }

  onMount(async () => {
    await loadBase();
    await loadDashboard();
    await loadOperational();
    lastAppliedFilterKey = currentFilterKey;
    filtrosInicializados = true;
  });
</script>

<svelte:head>
  <title>{title} | VTUR</title>
</svelte:head>

<PageHeader
  {title}
  {subtitle}
  color="financeiro"
  breadcrumbs={[{ label: 'Dashboard' }]}
  actions={[{ label: 'Atualizar', onClick: atualizar, variant: 'secondary', icon: RefreshCw }]}
/>

<Card color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
    <FieldInput id="gestor-inicio" label="Data início" type="date" bind:value={periodoInicio} class_name="w-full" />
    <FieldInput id="gestor-fim" label="Data fim" type="date" bind:value={periodoFim} class_name="w-full" />
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

<KPIGrid className="mb-6" columns={5}>
  <div class="vtur-kpi-card border-t-[3px] border-t-cyan-500">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><TrendingUp size={20} /></div>
    <div class="w-full">
      <p class="text-sm font-medium text-slate-500">{salesLabel}</p>
      <p class="text-2xl font-bold text-slate-900">{loading ? '...' : formatCurrency(vendasAgg.totalVendas)}</p>
      <p class="mt-0.5 text-xs text-slate-400">Líquido: {formatCurrency(vendasAgg.totalLiquido)}</p>
      {#if metaTotal > 0}
        <div class="mt-2 w-full">
          <div class="h-1.5 w-full rounded-full bg-slate-200">
            <div
              class="h-1.5 rounded-full transition-all"
              style={`width:${atingimentoVendasClamped.toFixed(1)}%;background:${atingimentoVendasColor};`}
            ></div>
          </div>
          <p class="mt-0.5 text-xs text-slate-400">{atingimento.toFixed(1)}% da meta</p>
        </div>
      {:else}
        <p class="mt-0.5 text-xs text-slate-400">Sem meta cadastrada</p>
      {/if}
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-emerald-500">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Wallet size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">{countLabel}</p>
      <p class="text-2xl font-bold text-slate-900">{loading ? '...' : vendasAgg.qtdVendas}</p>
      <p class="mt-0.5 text-xs text-slate-400">Ticket: {formatCurrency(vendasAgg.ticketMedio)}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-violet-500">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Target size={20} /></div>
    <div class="w-full">
      <p class="text-sm font-medium text-slate-500">{metaLabel}</p>
      <p class="text-2xl font-bold text-slate-900">{loading ? '...' : formatCurrency(metaTotal)}</p>
      {#if metaTotal > 0}
        <div class="mt-2 w-full">
          <div class="h-1.5 w-full rounded-full bg-slate-200">
            <div
              class="h-1.5 rounded-full transition-all"
              style={`width:${atingimentoVendasClamped.toFixed(1)}%;background:${atingimentoMetaColor};`}
            ></div>
          </div>
          <p class="mt-0.5 text-xs text-slate-400">Atingimento: {atingimento.toFixed(1)}%</p>
        </div>
      {:else}
        <p class="mt-0.5 text-xs text-slate-400">Sem meta cadastrada</p>
      {/if}
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-amber-500">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Users size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">{scopeLabel}</p>
      <p class="text-2xl font-bold text-slate-900">{loading ? '...' : isFiltroVendedorAtivo ? 1 : teamSize}</p>
      <p class="mt-0.5 text-xs text-slate-400">{scopeHelperLabel}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-slate-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Wallet size={20} /></div>
    <div class="w-full">
      <p class="text-sm font-medium text-slate-500">Seguro viagem</p>
      <p class="text-2xl font-bold text-slate-900">{loading ? '...' : formatCurrency(vendasAgg.totalSeguro)}</p>
      {#if metaSeguroTotal > 0}
        <div class="mt-2 w-full">
          <div class="h-1.5 w-full rounded-full bg-slate-200">
            <div
              class="h-1.5 rounded-full transition-all"
              style={`width:${atingimentoSeguroClamped.toFixed(1)}%;background:${atingimentoSeguroColor};`}
            ></div>
          </div>
          <p class="mt-0.5 text-xs text-slate-400">{atingimentoSeguro.toFixed(1)}% da meta de seguro</p>
        </div>
      {:else}
        <p class="mt-0.5 text-xs text-slate-400">Sem meta de seguro cadastrada</p>
      {/if}
    </div>
  </div>
</KPIGrid>

<div class="grid gap-6 xl:grid-cols-2">
  <Card header={evolucaoHeader} color="financeiro">
    {#if loading}
      <div class="h-56 animate-pulse rounded-xl bg-slate-100"></div>
    {:else if vendasAgg.timeline.length === 0}
      <p class="py-8 text-center text-sm text-slate-400">Sem vendas no período.</p>
    {:else}
      <ChartJS type="line" data={timelineChartData} height={220} />
    {/if}
  </Card>

  <Card header={destinosHeader} color="financeiro">
    {#if loading}
      <div class="h-56 animate-pulse rounded-xl bg-slate-100"></div>
    {:else if vendasAgg.topDestinos.length === 0}
      <p class="py-8 text-center text-sm text-slate-400">Sem destinos no período.</p>
    {:else}
      <ChartJS type="doughnut" data={destinosChartData} height={220} />
    {/if}
  </Card>

  <Card header={orcamentosHeader} color="financeiro">
    {#if loading}
      <div class="space-y-2">{#each [1, 2, 3] as _}<div class="h-10 animate-pulse rounded bg-slate-100"></div>{/each}</div>
    {:else if orcamentos.length === 0}
      <p class="py-6 text-center text-sm text-slate-400">{orcamentosEmptyLabel}</p>
    {:else}
      <div class="divide-y divide-slate-100">
        {#each orcamentos.slice(0, 6) as item}
          <div class="py-2.5 px-1">
            <p class="truncate text-sm font-medium text-slate-900">{item.cliente?.nome || 'Cliente'}</p>
            <p class="text-xs text-slate-400">{formatDate(item.created_at)} · {item.status || '-'} · {formatCurrency(item.total || 0)}</p>
          </div>
        {/each}
      </div>
    {/if}
  </Card>

  <Card header={followUpHeader} color="financeiro">
    {#if loading}
      <div class="space-y-2">{#each [1, 2, 3] as _}<div class="h-10 animate-pulse rounded bg-slate-100"></div>{/each}</div>
    {:else if followUps.length === 0}
      <p class="py-6 text-center text-sm text-slate-400">{followUpEmptyLabel}</p>
    {:else}
      <div class="divide-y divide-slate-100">
        {#each followUps.slice(0, 6) as item}
          <div class="py-2.5 px-1">
            <p class="truncate text-sm font-medium text-slate-900">{item.venda?.clientes?.nome || '-'}</p>
            <p class="text-xs text-slate-400">Embarque: {formatDate(item.venda?.data_embarque)}{#if item.venda?.destino_cidade?.nome} · {item.venda.destino_cidade.nome}{/if}</p>
          </div>
        {/each}
      </div>
    {/if}
  </Card>

  {#if podeVerOperacao}
    <Card header={viagensHeader} color="financeiro" class="xl:col-span-2">
      {#if loading}
        <div class="space-y-2">{#each [1, 2, 3] as _}<div class="h-10 animate-pulse rounded bg-slate-100"></div>{/each}</div>
      {:else if viagens.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">{viagensEmptyLabel}</p>
      {:else}
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {#each viagens.slice(0, 6) as item}
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p class="truncate text-sm font-semibold text-slate-900">{item.clientes?.nome || '-'}</p>
              <p class="mt-1 text-xs text-slate-500">{formatDate(item.data_inicio)} → {formatDate(item.data_fim)}</p>
              <p class="mt-1 text-xs text-slate-500">{item.destino || '-'}</p>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  {/if}
</div>