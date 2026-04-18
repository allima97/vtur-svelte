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
  import { apiGet } from '$lib/services/api';

  interface VendedorRanking {
    posicao: number;
    vendedor_id: string;
    vendedor_nome: string;
    total_vendas: number;
    total_receita: number;
    total_comissao: number;
    total_orcamentos: number;
    ticket_medio: number;
    taxa_conversao: number;
    alcance_meta: number;
    meta: number;
    tendencia: 'up' | 'down' | 'stable';
  }

  interface Resumo {
    total_receita: number;
    total_comissao: number;
    total_orcamentos: number;
    total_vendas: number;
    meta_total: number;
  }

  interface EmpresaFiltro {
    id: string;
    nome: string;
  }

  interface VendedorFiltro {
    id: string;
    nome: string;
  }

  function getDefaultRange() {
    const today = new Date();
    return {
      start: `${today.getFullYear()}-01-01`,
      end: today.toISOString().slice(0, 10)
    };
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  const defaultRange = getDefaultRange();

  let vendedores: VendedorRanking[] = [];
  let empresas: EmpresaFiltro[] = [];
  let vendedoresFiltro: VendedorFiltro[] = [];
  let loading = true;
  let dataInicio = defaultRange.start;
  let dataFim = defaultRange.end;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';
  let resumo: Resumo = {
    total_receita: 0,
    total_comissao: 0,
    total_orcamentos: 0,
    total_vendas: 0,
    meta_total: 0
  };

  const columns = [
    { key: 'posicao', label: '#', sortable: true, width: '60px' },
    { key: 'vendedor_nome', label: 'Vendedor', sortable: true },
    {
      key: 'total_vendas',
      label: 'Vendas',
      sortable: true,
      align: 'right' as const,
      width: '90px'
    },
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
      align: 'right' as const,
      width: '110px',
      formatter: (value: number) => `${value.toFixed(1)}%`
    },
    {
      key: 'alcance_meta',
      label: 'Meta',
      sortable: true,
      align: 'right' as const,
      width: '100px',
      formatter: (value: number) => `${value.toFixed(1)}%`
    },
    {
      key: 'tendencia',
      label: 'Tendência',
      sortable: false,
      width: '100px',
      formatter: (value: string) => {
        if (value === 'up') return '<span class="text-green-600 font-semibold">↑ Alta</span>';
        if (value === 'down') return '<span class="text-red-600 font-semibold">↓ Queda</span>';
        return '<span class="text-slate-500">→ Estável</span>';
      }
    }
  ];

  async function loadBase() {
    try {
      const data = await apiGet<{ empresas: EmpresaFiltro[]; vendedores: VendedorFiltro[] }>('/api/v1/relatorios/base');
      empresas = data.empresas || [];
      vendedoresFiltro = data.vendedores || [];
    } catch {
      empresas = [];
      vendedoresFiltro = [];
      toast.error('Erro ao carregar filtros do ranking');
    }
  }

  async function loadRanking(showSuccess = false) {
    loading = true;
    try {
      const data = await apiGet<{ items: VendedorRanking[]; resumo: Resumo }>('/api/v1/relatorios/ranking', {
        data_inicio: dataInicio,
        data_fim: dataFim,
        empresa_id: empresaSelecionada || undefined,
        vendedor_ids: vendedorSelecionado || undefined
      });

      vendedores = data.items || [];
      resumo = data.resumo || resumo;

      if (showSuccess) toast.success('Ranking atualizado');
    } catch {
      vendedores = [];
      toast.error('Erro ao carregar ranking de vendas');
    } finally {
      loading = false;
    }
  }

  function syncUrl() {
    const params = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim });
    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
    if (vendedorSelecionado) params.set('vendedor_id', vendedorSelecionado);
    void goto(`/relatorios/ranking?${params.toString()}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  }

  async function gerarRanking() {
    await loadRanking(true);
    syncUrl();
  }

  function handleExport() {
    if (vendedores.length === 0) { toast.info('Não há dados para exportar'); return; }
    const headers = ['#', 'Vendedor', 'Vendas', 'Receita', 'Comissão', 'Ticket Médio', 'Conversão %', 'Meta %', 'Tendência'];
    const rows = vendedores.map((v) => [
      v.posicao,
      v.vendedor_nome,
      v.total_vendas,
      v.total_receita.toFixed(2).replace('.', ','),
      v.total_comissao.toFixed(2).replace('.', ','),
      v.ticket_medio.toFixed(2).replace('.', ','),
      v.taxa_conversao.toFixed(1) + '%',
      v.alcance_meta.toFixed(1) + '%',
      v.tendencia === 'up' ? 'Alta' : v.tendencia === 'down' ? 'Queda' : 'Estável'
    ]);
    const csv = ['\uFEFF' + headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ranking_vendas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Ranking exportado');
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    dataInicio = params.get('data_inicio') || defaultRange.start;
    dataFim = params.get('data_fim') || defaultRange.end;
    empresaSelecionada = params.get('empresa_id') || '';
    vendedorSelecionado = params.get('vendedor_id') || '';
    await loadBase();
    await loadRanking();
  });

  $: top3 = vendedores.slice(0, 3);

  $: receitaChartData = {
    labels: vendedores.slice(0, 10).map((v) => v.vendedor_nome),
    datasets: [
      {
        label: 'Receita',
        data: vendedores.slice(0, 10).map((v) => v.total_receita),
        backgroundColor: '#f97316'
      },
      {
        label: 'Meta',
        data: vendedores.slice(0, 10).map((v) => v.meta),
        backgroundColor: '#e2e8f0'
      }
    ]
  } satisfies ChartData;

  $: conversaoChartData = {
    labels: vendedores.slice(0, 10).map((v) => v.vendedor_nome),
    datasets: [
      {
        label: 'Taxa de Conversão (%)',
        data: vendedores.slice(0, 10).map((v) => v.taxa_conversao),
        backgroundColor: '#fb923c'
      }
    ]
  } satisfies ChartData;
</script>

<svelte:head>
  <title>Ranking de Vendas | VTUR</title>
</svelte:head>

<PageHeader
  title="Ranking de Vendas"
  subtitle="Comparativo por responsável com meta, conversão, comissão e tendência."
  color="financeiro"
  breadcrumbs={[
    { label: 'Relatórios', href: '/relatorios' },
    { label: 'Ranking de Vendas' }
  ]}
/>

<!-- Filtros -->
<Card color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <div>
      <label for="rank-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data início</label>
      <input id="rank-inicio" type="date" bind:value={dataInicio} class="vtur-input w-full" />
    </div>
    <div>
      <label for="rank-fim" class="block text-sm font-medium text-slate-700 mb-1">Data fim</label>
      <input id="rank-fim" type="date" bind:value={dataFim} class="vtur-input w-full" />
    </div>
    <div>
      <label for="rank-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
      <select id="rank-empresa" bind:value={empresaSelecionada} class="vtur-input w-full">
        <option value="">Todas</option>
        {#each empresas as empresa}
          <option value={empresa.id}>{empresa.nome}</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="rank-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label>
      <select id="rank-vendedor" bind:value={vendedorSelecionado} class="vtur-input w-full">
        <option value="">Todos</option>
        {#each vendedoresFiltro as vendedor}
          <option value={vendedor.id}>{vendedor.nome}</option>
        {/each}
      </select>
    </div>
    <div class="flex items-end">
      <Button variant="primary" color="financeiro" class_name="w-full" on:click={gerarRanking}>
        <Filter size={16} class="mr-2" />
        Aplicar
      </Button>
    </div>
  </div>
</Card>

<!-- KPIs -->
<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-xs text-slate-500">Total receita</p>
    <p class="text-xl font-bold text-slate-900">{formatCurrency(resumo.total_receita)}</p>
  </div>
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-xs text-slate-500">Total comissões</p>
    <p class="text-xl font-bold text-slate-900">{formatCurrency(resumo.total_comissao)}</p>
  </div>
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-xs text-slate-500">Total vendas</p>
    <p class="text-xl font-bold text-slate-900">{resumo.total_vendas}</p>
  </div>
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-xs text-slate-500">Orçamentos</p>
    <p class="text-xl font-bold text-slate-900">{resumo.total_orcamentos}</p>
  </div>
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-xs text-slate-500">Meta total</p>
    <p class="text-xl font-bold text-slate-900">{formatCurrency(resumo.meta_total)}</p>
  </div>
</div>

<!-- Pódio top 3 -->
{#if !loading && top3.length > 0}
  <div class="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
    {#each top3 as v, i}
      <div class="vtur-card p-5 text-center border-t-4
        {i === 0 ? 'border-t-amber-400 bg-amber-50/40' : i === 1 ? 'border-t-slate-400 bg-slate-50/40' : 'border-t-orange-400 bg-orange-50/40'}">
        <div class="mb-2 flex items-center justify-center gap-2">
          <Trophy size={20} class="{i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-500' : 'text-orange-500'}" />
          <span class="text-2xl font-black {i === 0 ? 'text-amber-600' : i === 1 ? 'text-slate-600' : 'text-orange-600'}">
            {v.posicao}º
          </span>
        </div>
        <p class="font-semibold text-slate-900 truncate">{v.vendedor_nome}</p>
        <p class="mt-1 text-lg font-bold text-financeiro-700">{formatCurrency(v.total_receita)}</p>
        <div class="mt-2 flex justify-center gap-3 text-xs text-slate-500">
          <span>{v.total_vendas} venda(s)</span>
          <span>·</span>
          <span>{v.taxa_conversao.toFixed(0)}% conv.</span>
        </div>
        {#if v.meta > 0}
          <div class="mt-3">
            <div class="h-1.5 w-full rounded-full bg-slate-200">
              <div
                class="h-1.5 rounded-full bg-financeiro-500 transition-all"
                style="width: {Math.min(v.alcance_meta, 100).toFixed(1)}%"
              ></div>
            </div>
            <p class="mt-1 text-xs text-slate-500">{v.alcance_meta.toFixed(1)}% da meta</p>
          </div>
        {/if}
        <div class="mt-2 flex justify-center">
          {#if v.tendencia === 'up'}
            <span class="flex items-center gap-1 text-xs font-medium text-green-600">
              <TrendingUp size={12} /> Alta
            </span>
          {:else if v.tendencia === 'down'}
            <span class="flex items-center gap-1 text-xs font-medium text-red-600">
              <TrendingDown size={12} /> Queda
            </span>
          {:else}
            <span class="flex items-center gap-1 text-xs font-medium text-slate-500">
              <Minus size={12} /> Estável
            </span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Gráficos -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <Card header="Receita vs Meta (Top 10)" color="financeiro">
    <ChartJS type="bar" data={receitaChartData} height={280} />
  </Card>
  <Card header="Taxa de Conversão (Top 10)" color="financeiro">
    <ChartJS type="bar" data={conversaoChartData} height={280} />
  </Card>
</div>

<!-- Tabela completa -->
<DataTable
  {columns}
  data={vendedores}
  color="financeiro"
  {loading}
  title="Ranking completo de vendas"
  searchable={true}
  exportable={true}
  onExport={handleExport}
/>
