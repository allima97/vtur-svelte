<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { Filter, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface EmpresaFiltro {
    id: string;
    nome: string;
  }

  interface VendedorFiltro {
    id: string;
    nome: string;
  }

  interface VendedorRanking {
    posicao: number;
    vendedor_id: string;
    vendedor_nome: string;
    total_vendas: number;
    total_receita: number;
    total_comissao: number;
    ticket_medio: number;
    total_orcamentos: number;
    taxa_conversao: number;
    meta: number;
    alcance_meta: number;
    tendencia: 'up' | 'down' | 'stable';
  }

  interface RankingPayload {
    items: VendedorRanking[];
    vendedores: VendedorFiltro[];
    resumo: {
      total_receita: number;
      total_comissao: number;
      total_orcamentos: number;
      total_vendas: number;
      meta_total: number;
    };
  }

  interface BasePayload {
    empresas: EmpresaFiltro[];
    vendedores: VendedorFiltro[];
  }

  function getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      inicio: start.toISOString().slice(0, 10),
      fim: now.toISOString().slice(0, 10)
    };
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  const currentMonth = getCurrentMonthRange();

  let vendedores: VendedorRanking[] = [];
  let vendedoresFiltro: VendedorFiltro[] = [];
  let empresas: EmpresaFiltro[] = [];
  let loading = true;
  let dataInicio = currentMonth.inicio;
  let dataFim = currentMonth.fim;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';
  let resumo = {
    total_receita: 0,
    total_comissao: 0,
    total_orcamentos: 0,
    total_vendas: 0,
    meta_total: 0
  };

  const columns = [
    {
      key: 'posicao',
      label: '#',
      sortable: true,
      align: 'center' as const,
      width: '70px',
      formatter: (value: number) => getPosicaoBadge(value)
    },
    { key: 'vendedor_nome', label: 'Vendedor', sortable: true },
    { key: 'total_vendas', label: 'Vendas', sortable: true, align: 'center' as const, width: '90px' },
    {
      key: 'total_receita',
      label: 'Receita',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'total_comissao',
      label: 'Comissão',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'ticket_medio',
      label: 'Ticket médio',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'taxa_conversao',
      label: 'Conversão',
      sortable: true,
      align: 'center' as const,
      width: '110px',
      formatter: (value: number) => `${value.toFixed(1)}%`
    },
    {
      key: 'alcance_meta',
      label: 'Meta',
      sortable: true,
      align: 'center' as const,
      width: '110px',
      formatter: (value: number) => getMetaBadge(value)
    },
    {
      key: 'tendencia',
      label: 'Tendência',
      sortable: true,
      align: 'center' as const,
      width: '110px',
      formatter: (value: string) => getTendenciaIcon(value)
    }
  ];

  async function loadBase() {
    try {
      const response = await fetch('/api/v1/relatorios/base');
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as BasePayload;
      empresas = data.empresas || [];
      vendedoresFiltro = data.vendedores || [];
    } catch (err) {
      empresas = [];
      vendedoresFiltro = [];
      toast.error('Erro ao carregar filtros do ranking');
    }
  }

  function syncUrl() {
    const params = new URLSearchParams({
      data_inicio: dataInicio,
      data_fim: dataFim
    });

    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
    if (vendedorSelecionado) params.set('vendedor_ids', vendedorSelecionado);

    void goto(`/relatorios/ranking?${params.toString()}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  }

  async function loadRanking(showSuccess = false) {
    loading = true;
    try {
      const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim
      });

      if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
      if (vendedorSelecionado) params.set('vendedor_ids', vendedorSelecionado);

      const response = await fetch(`/api/v1/relatorios/ranking?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());

      const data = (await response.json()) as RankingPayload;
      vendedores = data.items || [];
      resumo = data.resumo || resumo;
      syncUrl();

      if (showSuccess) {
        toast.success('Ranking atualizado');
      }
    } catch (err) {
      vendedores = [];
      resumo = {
        total_receita: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        total_vendas: 0,
        meta_total: 0
      };
      toast.error('Erro ao carregar ranking');
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    dataInicio = params.get('data_inicio') || currentMonth.inicio;
    dataFim = params.get('data_fim') || currentMonth.fim;
    empresaSelecionada = params.get('empresa_id') || '';
    vendedorSelecionado = params.get('vendedor_ids') || params.get('vendedor_id') || '';

    await loadBase();
    await loadRanking();
  });

  function getPosicaoBadge(posicao: number): string {
    if (posicao === 1) return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 font-bold">1</span>';
    if (posicao === 2) return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300 text-slate-700 font-bold">2</span>';
    if (posicao === 3) return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 text-white font-bold">3</span>';
    return `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-medium">${posicao}</span>`;
  }

  function getMetaBadge(alcance: number): string {
    if (alcance >= 100) return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">${alcance.toFixed(1)}%</span>`;
    if (alcance >= 80) return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-financeiro-100 text-financeiro-700">${alcance.toFixed(1)}%</span>`;
    return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">${alcance.toFixed(1)}%</span>`;
  }

  function getTendenciaIcon(tendencia: string): string {
    if (tendencia === 'up') return '<span class="inline-flex items-center gap-1 font-medium text-green-600">Alta</span>';
    if (tendencia === 'down') return '<span class="inline-flex items-center gap-1 font-medium text-red-600">Queda</span>';
    return '<span class="inline-flex items-center gap-1 font-medium text-slate-500">Estável</span>';
  }

  function handleExport() {
    if (vendedores.length === 0) {
      toast.info('Não há dados para exportar');
      return;
    }

    const headers = ['Posição', 'Vendedor', 'Vendas', 'Receita', 'Comissão', 'Ticket Médio', 'Orçamentos', 'Conversão', 'Meta', 'Atingimento', 'Tendência'];
    const rows = vendedores.map((item) => [
      item.posicao,
      item.vendedor_nome,
      item.total_vendas,
      item.total_receita.toFixed(2).replace('.', ','),
      item.total_comissao.toFixed(2).replace('.', ','),
      item.ticket_medio.toFixed(2).replace('.', ','),
      item.total_orcamentos,
      item.taxa_conversao.toFixed(2).replace('.', ','),
      item.meta.toFixed(2).replace('.', ','),
      item.alcance_meta.toFixed(2).replace('.', ','),
      item.tendencia
    ]);

    const csv = ['\uFEFF' + headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ranking_vendas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Ranking exportado com sucesso');
  }

  function gerarRelatorio() {
    void loadRanking(true);
  }

  function handleRowClick(row: VendedorRanking) {
    const params = new URLSearchParams({
      data_inicio: dataInicio,
      data_fim: dataFim,
      vendedor_id: row.vendedor_id
    });

    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);

    void goto(`/relatorios/vendas?${params.toString()}`);
  }

  $: topVendedor = vendedores[0] || null;
  $: mediaConversao =
    vendedores.length > 0
      ? vendedores.reduce((acc, vendedor) => acc + vendedor.taxa_conversao, 0) / vendedores.length
      : 0;
  $: atingimentoMedio =
    vendedores.length > 0
      ? vendedores.reduce((acc, vendedor) => acc + vendedor.alcance_meta, 0) / vendedores.length
      : 0;

  $: receitaPorVendedorData = {
    labels: vendedores.map((vendedor) => vendedor.vendedor_nome),
    datasets: [
      {
        label: 'Receita',
        data: vendedores.map((vendedor) => vendedor.total_receita),
        backgroundColor: '#f97316'
      },
      {
        label: 'Meta',
        data: vendedores.map((vendedor) => vendedor.meta),
        backgroundColor: '#fdba74'
      }
    ]
  } satisfies ChartData;

  $: performanceVendedoresData = {
    labels: vendedores.map((vendedor) => vendedor.vendedor_nome),
    datasets: [
      {
        type: 'line' as const,
        label: 'Ticket médio',
        data: vendedores.map((vendedor) => vendedor.ticket_medio),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
        yAxisID: 'y'
      },
      {
        type: 'bar' as const,
        label: 'Conversão',
        data: vendedores.map((vendedor) => vendedor.taxa_conversao),
        backgroundColor: '#f97316',
        yAxisID: 'y1'
      }
    ]
  } satisfies ChartData;
</script>

<svelte:head>
  <title>Ranking de Vendas | VTUR</title>
</svelte:head>

<PageHeader
  title="Ranking de Vendas"
  subtitle="Comparativo comercial por responsável, com meta, conversão, comissão e tendência no período."
  color="financeiro"
  breadcrumbs={[
    { label: 'Relatórios', href: '/relatorios' },
    { label: 'Ranking' }
  ]}
/>

<Card color="financeiro" class="mb-6">
  <div class="flex flex-col lg:flex-row gap-4 items-end">
    <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <div>
        <label for="ranking-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data início</label>
        <input id="ranking-data-inicio" type="date" bind:value={dataInicio} class="vtur-input w-full" />
      </div>
      <div>
        <label for="ranking-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data fim</label>
        <input id="ranking-data-fim" type="date" bind:value={dataFim} class="vtur-input w-full" />
      </div>
      <div>
        <label for="ranking-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
        <select id="ranking-empresa" bind:value={empresaSelecionada} class="vtur-input w-full">
          <option value="">Todas</option>
          {#each empresas as empresa}
            <option value={empresa.id}>{empresa.nome}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="ranking-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label>
        <select id="ranking-vendedor" bind:value={vendedorSelecionado} class="vtur-input w-full">
          <option value="">Todos</option>
          {#each vendedoresFiltro as vendedor}
            <option value={vendedor.id}>{vendedor.nome}</option>
          {/each}
        </select>
      </div>
      <div class="flex items-end">
        <Button variant="primary" color="financeiro" class_name="w-full" on:click={gerarRelatorio}>
          <Filter size={16} class="mr-2" />
          Aplicar
        </Button>
      </div>
    </div>
  </div>
</Card>

{#if topVendedor}
  <Card color="financeiro" class="mb-6 border-2 border-yellow-400">
    <div class="flex items-center gap-4">
      <div class="p-4 bg-yellow-100 rounded-full">
        <Trophy size={32} class="text-yellow-600" />
      </div>
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-slate-900">Líder do período</h3>
        <p class="text-2xl font-bold text-financeiro-600">{topVendedor.vendedor_nome}</p>
        <div class="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
          <span>{topVendedor.total_vendas} vendas</span>
          <span>{formatCurrency(topVendedor.total_receita)} em receita</span>
          <span>{topVendedor.taxa_conversao.toFixed(1)}% de conversão</span>
          <span>{topVendedor.alcance_meta.toFixed(1)}% da meta</span>
        </div>
      </div>
    </div>
  </Card>
{/if}

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-sm text-slate-500">Receita total</p>
    <p class="text-2xl font-bold text-slate-900">{formatCurrency(resumo.total_receita)}</p>
  </div>
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-sm text-slate-500">Comissões</p>
    <p class="text-2xl font-bold text-slate-900">{formatCurrency(resumo.total_comissao)}</p>
  </div>
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-sm text-slate-500">Conversão média</p>
    <p class="text-2xl font-bold text-slate-900">{mediaConversao.toFixed(1)}%</p>
  </div>
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-sm text-slate-500">Atingimento médio</p>
    <p class="text-2xl font-bold text-slate-900">{atingimentoMedio.toFixed(1)}%</p>
  </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <Card header="Receita x Meta" color="financeiro">
    <ChartJS type="bar" data={receitaPorVendedorData} height={280} />
  </Card>
  <Card header="Conversão e Ticket Médio" color="financeiro">
    <ChartJS type="bar" data={performanceVendedoresData} height={280} />
  </Card>
</div>

<Card color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p class="text-slate-500">Alta</p>
      <p class="mt-2 flex items-center gap-2 text-lg font-semibold text-green-600">
        <TrendingUp size={18} />
        {vendedores.filter((item) => item.tendencia === 'up').length}
      </p>
    </div>
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p class="text-slate-500">Estáveis</p>
      <p class="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-700">
        <Minus size={18} />
        {vendedores.filter((item) => item.tendencia === 'stable').length}
      </p>
    </div>
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p class="text-slate-500">Queda</p>
      <p class="mt-2 flex items-center gap-2 text-lg font-semibold text-red-600">
        <TrendingDown size={18} />
        {vendedores.filter((item) => item.tendencia === 'down').length}
      </p>
    </div>
  </div>
</Card>

<DataTable
  {columns}
  data={vendedores}
  color="financeiro"
  {loading}
  title="Ranking completo"
  searchable={true}
  exportable={true}
  onExport={handleExport}
  onRowClick={handleRowClick}
/>
