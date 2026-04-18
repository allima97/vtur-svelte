<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import {
    Filter, RefreshCw, TrendingUp, ShoppingCart,
    Target, Calendar, FileText, Award
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';

  // --- Props ---
  export let title: string = 'Dashboard';
  export let subtitle: string = '';

  // --- Types ---
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

  // --- State ---
  let loading = true;
  let errorMessage: string | null = null;

  // Período — padrão: mês corrente
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

  // Dados da API
  let vendasAgg: VendasAgg = {
    totalVendas: 0, totalTaxas: 0, totalLiquido: 0, totalSeguro: 0,
    qtdVendas: 0, ticketMedio: 0, timeline: [], topDestinos: [], porProduto: []
  };
  let metas: Meta[] = [];
  let orcamentos: Orcamento[] = [];
  let userCtx: { nome: string | null; papel: string; vendedorIds: string[] } | null = null;
  let podeVerOperacao = false;
  let podeVerConsultoria = false;

  // Dados operacionais
  let aniversariantes: Aniversariante[] = [];
  let viagens: Viagem[] = [];
  let followUps: FollowUp[] = [];
  let consultorias: Consultoria[] = [];

  // Filtros
  let empresas: { id: string; nome: string }[] = [];
  let vendedoresFiltro: { id: string; nome: string }[] = [];

  // --- Formatters ---
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

  // --- KPI derived ---
  $: metaTotal = metas.reduce((sum, m) => sum + Number(m.meta_geral || 0), 0);
  $: atingimentoPct = metaTotal > 0 ? (vendasAgg.totalVendas / metaTotal) * 100 : 0;
  $: qtdOrcamentos = orcamentos.length;
  $: conversaoPct = qtdOrcamentos > 0 ? (vendasAgg.qtdVendas / qtdOrcamentos) * 100 : 0;

  // Dias restantes no mês
  $: diasRestantes = (() => {
    const fim = new Date(periodoFim);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  })();

  // Meta diária necessária
  $: metaDiaria = (() => {
    const restante = metaTotal - vendasAgg.totalVendas;
    if (diasRestantes <= 0 || restante <= 0) return 0;
    return restante / diasRestantes;
  })();

  // --- Chart data ---
  $: timelineChartData = {
    labels: vendasAgg.timeline.map((t) => formatDate(t.date)),
    datasets: [{
      label: 'Receita',
      data: vendasAgg.timeline.map((t) => t.value),
      borderColor: '#f97316',
      backgroundColor: 'rgba(249,115,22,0.12)',
      fill: true,
      tension: 0.3
    }]
  } satisfies ChartData;

  $: destinoChartData = {
    labels: vendasAgg.topDestinos.map((d) => d.name),
    datasets: [{
      label: 'Receita',
      data: vendasAgg.topDestinos.map((d) => d.value),
      backgroundColor: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5']
    }]
  } satisfies ChartData;

  $: produtoChartData = {
    labels: vendasAgg.porProduto.map((p) => p.name),
    datasets: [{
      label: 'Receita',
      data: vendasAgg.porProduto.map((p) => p.value),
      backgroundColor: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#e2e8f0']
    }]
  } satisfies ChartData;

  // --- API calls ---
  async function loadBase() {
    try {
      const data = await apiGet<{ empresas: { id: string; nome: string }[]; vendedores: { id: string; nome: string }[] }>('/api/v1/relatorios/base');
      empresas = data.empresas || [];
      vendedoresFiltro = data.vendedores || [];
    } catch {
      // silencioso — filtros não são críticos
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
        } catch { aniversariantes = []; }
      })(),
      (async () => {
        if (!podeVerOperacao) return;
        try {
          const d = await apiGet<{ items: Viagem[] }>('/api/v1/dashboard/viagens', params);
          viagens = d.items || [];
        } catch { viagens = []; }
      })(),
      (async () => {
        try {
          const d = await apiGet<{ items: FollowUp[] }>('/api/v1/dashboard/follow-ups', params);
          followUps = d.items || [];
        } catch { followUps = []; }
      })(),
      (async () => {
        if (!podeVerConsultoria) return;
        try {
          const d = await apiGet<{ items: Consultoria[] }>('/api/v1/dashboard/consultorias', params);
          consultorias = d.items || [];
        } catch { consultorias = []; }
      })()
    ]);
  }

  async function atualizar() {
    await loadDashboard();
    await loadOperacional();
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    periodoInicio = params.get('inicio') || defaultPeriod.inicio;
    periodoFim = params.get('fim') || defaultPeriod.fim;
    empresaSelecionada = params.get('empresa_id') || '';
    vendedorSelecionado = params.get('vendedor_id') || '';

    await loadBase();
    // loadDashboard primeiro para obter podeVerOperacao e podeVerConsultoria
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
/>

<!-- Filtros -->
<Card color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
    <div>
      <label for="dash-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data início</label>
      <input id="dash-inicio" type="date" bind:value={periodoInicio} class="vtur-input w-full" />
    </div>
    <div>
      <label for="dash-fim" class="block text-sm font-medium text-slate-700 mb-1">Data fim</label>
      <input id="dash-fim" type="date" bind:value={periodoFim} class="vtur-input w-full" />
    </div>
    {#if empresas.length > 0}
      <div>
        <label for="dash-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
        <select id="dash-empresa" bind:value={empresaSelecionada} class="vtur-input w-full">
          <option value="">Todas</option>
          {#each empresas as e}
            <option value={e.id}>{e.nome}</option>
          {/each}
        </select>
      </div>
    {/if}
    {#if vendedoresFiltro.length > 0}
      <div>
        <label for="dash-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label>
        <select id="dash-vendedor" bind:value={vendedorSelecionado} class="vtur-input w-full">
          <option value="">Todos</option>
          {#each vendedoresFiltro as v}
            <option value={v.id}>{v.nome}</option>
          {/each}
        </select>
      </div>
    {/if}
    <div class="flex items-end gap-2 xl:col-span-2">
      <Button variant="primary" color="financeiro" class_name="flex-1" on:click={atualizar}>
        <Filter size={16} class="mr-2" />
        Aplicar
      </Button>
      <Button variant="outline" color="financeiro" on:click={atualizar} title="Atualizar">
        <RefreshCw size={16} class={loading ? 'animate-spin' : ''} />
      </Button>
    </div>
  </div>
</Card>

{#if errorMessage}
  <div class="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
    {errorMessage}
  </div>
{/if}

<!-- KPIs principais -->
<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
  <!-- Vendas no período -->
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs text-slate-500 mb-1">Vendas no período</p>
        {#if loading}
          <div class="h-7 w-28 bg-slate-200 rounded animate-pulse"></div>
        {:else}
          <p class="text-xl font-bold text-slate-900">{formatCurrency(vendasAgg.totalVendas)}</p>
        {/if}
      </div>
      <TrendingUp size={20} class="text-financeiro-500 mt-1 shrink-0" />
    </div>
    <p class="mt-1 text-xs text-slate-400">Lucro: {formatCurrency(vendasAgg.totalLiquido)}</p>
  </div>

  <!-- Qtd. vendas -->
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs text-slate-500 mb-1">Qtd. vendas</p>
        {#if loading}
          <div class="h-7 w-16 bg-slate-200 rounded animate-pulse"></div>
        {:else}
          <p class="text-xl font-bold text-slate-900">{vendasAgg.qtdVendas}</p>
        {/if}
      </div>
      <ShoppingCart size={20} class="text-financeiro-500 mt-1 shrink-0" />
    </div>
    <p class="mt-1 text-xs text-slate-400">Ticket: {formatCurrency(vendasAgg.ticketMedio)}</p>
  </div>

  <!-- Orçamentos e conversão -->
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs text-slate-500 mb-1">Orçamentos</p>
        {#if loading}
          <div class="h-7 w-16 bg-slate-200 rounded animate-pulse"></div>
        {:else}
          <p class="text-xl font-bold text-slate-900">{qtdOrcamentos}</p>
        {/if}
      </div>
      <FileText size={20} class="text-financeiro-500 mt-1 shrink-0" />
    </div>
    <p class="mt-1 text-xs text-slate-400">Conv.: {conversaoPct.toFixed(1)}%</p>
  </div>

  <!-- Meta do mês -->
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs text-slate-500 mb-1">Meta do mês</p>
        {#if loading}
          <div class="h-7 w-28 bg-slate-200 rounded animate-pulse"></div>
        {:else}
          <p class="text-xl font-bold text-slate-900">{formatCurrency(metaTotal)}</p>
        {/if}
      </div>
      <Target size={20} class="text-financeiro-500 mt-1 shrink-0" />
    </div>
    {#if metaTotal > 0}
      <div class="mt-2">
        <div class="h-1.5 w-full rounded-full bg-slate-200">
          <div
            class="h-1.5 rounded-full bg-financeiro-500 transition-all"
            style="width: {Math.min(atingimentoPct, 100).toFixed(1)}%"
          ></div>
        </div>
        <p class="mt-0.5 text-xs text-slate-400">{atingimentoPct.toFixed(1)}% atingido</p>
      </div>
    {:else}
      <p class="mt-1 text-xs text-slate-400">Sem meta cadastrada</p>
    {/if}
  </div>

  <!-- Dias restantes / meta diária -->
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs text-slate-500 mb-1">Dias restantes</p>
        {#if loading}
          <div class="h-7 w-16 bg-slate-200 rounded animate-pulse"></div>
        {:else}
          <p class="text-xl font-bold text-slate-900">{diasRestantes}d</p>
        {/if}
      </div>
      <Calendar size={20} class="text-financeiro-500 mt-1 shrink-0" />
    </div>
    {#if metaDiaria > 0}
      <p class="mt-1 text-xs text-slate-400">Meta/dia: {formatCurrency(metaDiaria)}</p>
    {:else}
      <p class="mt-1 text-xs text-slate-400">Meta atingida ✓</p>
    {/if}
  </div>
</div>

<!-- Gráficos: Timeline + Destinos + Produtos -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <Card header="Evolução das vendas" color="financeiro">
    {#if loading}
      <div class="h-48 bg-slate-100 animate-pulse rounded-xl"></div>
    {:else if vendasAgg.timeline.length === 0}
      <p class="text-sm text-slate-400 py-8 text-center">Nenhuma venda no período.</p>
    {:else}
      <ChartJS type="line" data={timelineChartData} height={200} />
    {/if}
  </Card>

  <Card header="Top destinos" color="financeiro">
    {#if loading}
      <div class="h-48 bg-slate-100 animate-pulse rounded-xl"></div>
    {:else if vendasAgg.topDestinos.length === 0}
      <p class="text-sm text-slate-400 py-8 text-center">Nenhum destino no período.</p>
    {:else}
      <ChartJS type="pie" data={destinoChartData} height={200} />
    {/if}
  </Card>
</div>

<!-- Vendas por produto -->
{#if vendasAgg.porProduto.length > 0 || loading}
  <Card header="Vendas por produto" color="financeiro" class="mb-6">
    {#if loading}
      <div class="h-48 bg-slate-100 animate-pulse rounded-xl"></div>
    {:else}
      <ChartJS type="bar" data={produtoChartData} height={220} />
    {/if}
  </Card>
{/if}

<!-- Linha 2: Orçamentos recentes + Aniversariantes -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

  <!-- Orçamentos recentes -->
  <Card header="Orçamentos recentes" color="financeiro">
    {#if loading}
      <div class="space-y-2">
        {#each [1,2,3] as _}
          <div class="h-10 bg-slate-100 animate-pulse rounded"></div>
        {/each}
      </div>
    {:else if orcamentos.length === 0}
      <p class="text-sm text-slate-400 py-6 text-center">Nenhum orçamento no período.</p>
    {:else}
      <div class="divide-y divide-slate-100">
        {#each orcamentos.slice(0, 8) as orc}
          <button
            class="w-full flex items-center justify-between py-2.5 px-1 text-left hover:bg-slate-50 rounded transition-colors"
            on:click={() => handleOrcamentoClick(orc)}
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-900 truncate">{orc.cliente?.nome || 'Cliente'}</p>
              <p class="text-xs text-slate-400">{formatDate(orc.created_at)} · {orc.status || '-'}</p>
            </div>
            <span class="ml-3 text-sm font-semibold text-financeiro-700 whitespace-nowrap">{formatCurrency(orc.total || 0)}</span>
          </button>
        {/each}
      </div>
      {#if orcamentos.length > 8}
        <p class="text-xs text-slate-400 mt-2 text-center">+{orcamentos.length - 8} orçamento(s)</p>
      {/if}
    {/if}
  </Card>

  <!-- Aniversariantes -->
  <Card header="Aniversariantes do mês" color="financeiro">
    {#if loading}
      <div class="space-y-2">
        {#each [1,2,3] as _}
          <div class="h-10 bg-slate-100 animate-pulse rounded"></div>
        {/each}
      </div>
    {:else if aniversariantes.length === 0}
      <p class="text-sm text-slate-400 py-6 text-center">Nenhum aniversariante este mês.</p>
    {:else}
      <div class="divide-y divide-slate-100">
        {#each aniversariantes.slice(0, 8) as aniv}
          <div class="flex items-center justify-between py-2.5 px-1">
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-900 truncate">{aniv.nome}</p>
              <p class="text-xs text-slate-400">{formatDate(aniv.nascimento?.replace(/^(\d+)-(\d+)-(\d{4})$/, '$3-$2-$1') || aniv.nascimento)}</p>
            </div>
            {#if aniv.whatsapp || aniv.telefone}
              <a
                href="https://wa.me/55{(aniv.whatsapp || aniv.telefone || '').replace(/\D/g, '')}?text={encodeURIComponent(`Feliz aniversário, ${aniv.nome}! 🎉`)}"
                target="_blank"
                rel="noopener noreferrer"
                class="ml-2 text-xs text-green-600 hover:underline whitespace-nowrap"
              >WhatsApp</a>
            {/if}
          </div>
        {/each}
      </div>
      {#if aniversariantes.length > 8}
        <p class="text-xs text-slate-400 mt-2 text-center">+{aniversariantes.length - 8} aniversariante(s)</p>
      {/if}
    {/if}
  </Card>
</div>

<!-- Linha 3: Viagens + Follow-Up (só se tiver permissão) -->
<div class="grid grid-cols-1 {podeVerConsultoria ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 mb-6">

  <!-- Próximas viagens -->
  {#if podeVerOperacao || loading}
    <Card header="Próximas viagens" color="financeiro">
      {#if loading}
        <div class="space-y-2">
          {#each [1,2,3] as _}
            <div class="h-10 bg-slate-100 animate-pulse rounded"></div>
          {/each}
        </div>
      {:else if viagens.length === 0}
        <p class="text-sm text-slate-400 py-6 text-center">Nenhuma viagem próxima.</p>
      {:else}
        <div class="divide-y divide-slate-100">
          {#each viagens.slice(0, 6) as v}
            <div class="py-2.5 px-1">
              <p class="text-sm font-medium text-slate-900 truncate">{v.clientes?.nome || '-'}</p>
              <p class="text-xs text-slate-400">
                {formatDate(v.data_inicio)} → {formatDate(v.data_fim)}
                {#if v.destino} · {v.destino}{/if}
              </p>
            </div>
          {/each}
        </div>
        {#if viagens.length > 6}
          <p class="text-xs text-slate-400 mt-2 text-center">+{viagens.length - 6} viagem(ns)</p>
        {/if}
      {/if}
    </Card>
  {/if}

  <!-- Follow-Up -->
  <Card header="Follow-Up pendente" color="financeiro">
    {#if loading}
      <div class="space-y-2">
        {#each [1,2,3] as _}
          <div class="h-10 bg-slate-100 animate-pulse rounded"></div>
        {/each}
      </div>
    {:else if followUps.length === 0}
      <p class="text-sm text-slate-400 py-6 text-center">Nenhum follow-up pendente.</p>
    {:else}
      <div class="divide-y divide-slate-100">
        {#each followUps.slice(0, 6) as fu}
          <div class="py-2.5 px-1">
            <p class="text-sm font-medium text-slate-900 truncate">{fu.venda?.clientes?.nome || '-'}</p>
            <p class="text-xs text-slate-400">
              Embarque: {formatDate(fu.venda?.data_embarque)}
              {#if fu.venda?.destino_cidade?.nome} · {fu.venda.destino_cidade.nome}{/if}
            </p>
          </div>
        {/each}
      </div>
      {#if followUps.length > 6}
        <p class="text-xs text-slate-400 mt-2 text-center">+{followUps.length - 6} follow-up(s)</p>
      {/if}
    {/if}
  </Card>

  <!-- Consultorias online -->
  {#if podeVerConsultoria}
    <Card header="Consultorias agendadas" color="financeiro">
      {#if loading}
        <div class="space-y-2">
          {#each [1,2,3] as _}
            <div class="h-10 bg-slate-100 animate-pulse rounded"></div>
          {/each}
        </div>
      {:else if consultorias.length === 0}
        <p class="text-sm text-slate-400 py-6 text-center">Nenhuma consultoria agendada.</p>
      {:else}
        <div class="divide-y divide-slate-100">
          {#each consultorias.slice(0, 6) as c}
            <div class="py-2.5 px-1">
              <p class="text-sm font-medium text-slate-900 truncate">{c.cliente_nome}</p>
              <p class="text-xs text-slate-400">
                {formatDateTime(c.data_hora)}
                {#if c.destino} · {c.destino}{/if}
              </p>
            </div>
          {/each}
        </div>
        {#if consultorias.length > 6}
          <p class="text-xs text-slate-400 mt-2 text-center">+{consultorias.length - 6} consultorias</p>
        {/if}
      {/if}
    </Card>
  {/if}
</div>

<!-- Seguro viagem KPI (se tiver) -->
{#if !loading && vendasAgg.totalSeguro > 0}
  <div class="mb-6">
    <div class="vtur-card p-4 border-l-4 border-l-amber-400 flex items-center gap-4">
      <Award size={24} class="text-amber-500 shrink-0" />
      <div>
        <p class="text-xs text-slate-500">Seguro viagem no período</p>
        <p class="text-xl font-bold text-slate-900">{formatCurrency(vendasAgg.totalSeguro)}</p>
      </div>
    </div>
  </div>
{/if}
