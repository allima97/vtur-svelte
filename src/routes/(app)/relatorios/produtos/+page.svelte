<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { Filter } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface ProdutoRelatorio {
    produto: string;
    tipo: string;
    quantidade: number;
    receita: number;
    custo_medio: number;
    lucro: number;
    margem: number;
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

  const defaultRange = getDefaultRange();

  let produtos: ProdutoRelatorio[] = [];
  let empresas: EmpresaFiltro[] = [];
  let vendedores: VendedorFiltro[] = [];
  let loading = true;
  let dataInicio = defaultRange.start;
  let dataFim = defaultRange.end;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';
  let tipoSelecionado = '';
  let ordenacao = 'receita';

  async function loadBase() {
    try {
      const response = await fetch('/api/v1/relatorios/base');
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      empresas = data.empresas || [];
      vendedores = data.vendedores || [];
    } catch (err) {
      empresas = [];
      vendedores = [];
      toast.error('Erro ao carregar filtros do relatório');
    }
  }

  const columns = [
    { key: 'produto', label: 'Produto', sortable: true },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      width: '140px',
      formatter: (value: string) =>
        `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-financeiro-50 text-financeiro-700">${value}</span>`
    },
    { key: 'quantidade', label: 'Qtd', sortable: true, align: 'center' as const, width: '80px' },
    {
      key: 'receita',
      label: 'Receita',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'lucro',
      label: 'Lucro',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'margem',
      label: 'Margem',
      sortable: true,
      align: 'center' as const,
      width: '100px',
      formatter: (value: number) =>
        `<span class="font-medium ${value >= 30 ? 'text-green-600' : value >= 20 ? 'text-financeiro-600' : 'text-amber-600'}">${value.toFixed(1)}%</span>`
    }
  ];

  async function loadRelatorio(showSuccess = false) {
    loading = true;

    try {
      const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim
      });

      if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
      if (vendedorSelecionado) params.set('vendedor_id', vendedorSelecionado);

      const response = await fetch(`/api/v1/relatorios/produtos?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar relatorio');
      }

      const data = await response.json();
      produtos = data.items || [];

      if (showSuccess) {
        toast.success('Relatorio atualizado!');
      }
    } catch (err) {
      produtos = [];
      toast.error('Erro ao carregar relatorio de produtos');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void (async () => {
      await loadBase();
      await loadRelatorio();
    })();
  });

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function handleExport() {
    if (produtosFiltrados.length === 0) {
      toast.info('Não há dados para exportar');
      return;
    }

    const headers = ['Produto', 'Tipo', 'Quantidade', 'Receita', 'Lucro', 'Margem'];
    const rows = produtosFiltrados.map((produto) => [
      produto.produto,
      produto.tipo,
      produto.quantidade,
      produto.receita.toFixed(2).replace('.', ','),
      produto.lucro.toFixed(2).replace('.', ','),
      produto.margem.toFixed(2).replace('.', ',')
    ]);

    const csv = ['\uFEFF' + headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_produtos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Relatório exportado com sucesso');
  }

  async function gerarRelatorio() {
    await loadRelatorio(true);
  }

  function handleRowClick(row: ProdutoRelatorio) {
    const params = new URLSearchParams({
      data_inicio: dataInicio,
      data_fim: dataFim,
      produto: row.produto,
      tipo_produto: row.tipo
    });

    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
    if (vendedorSelecionado) params.set('vendedor_id', vendedorSelecionado);

    void goto(`/relatorios/vendas?${params.toString()}`);
  }

  $: tiposDisponiveis = Array.from(new Set(produtos.map((produto) => produto.tipo))).sort((left, right) =>
    left.localeCompare(right, 'pt-BR')
  );

  $: produtosFiltrados = produtos
    .filter((produto) => !tipoSelecionado || produto.tipo === tipoSelecionado)
    .sort((left, right) => {
      if (ordenacao === 'lucro') {
        return right.lucro - left.lucro;
      }

      if (ordenacao === 'margem') {
        return right.margem - left.margem;
      }

      if (ordenacao === 'quantidade') {
        return right.quantidade - left.quantidade;
      }

      return right.receita - left.receita;
    });

  $: totalReceita = produtosFiltrados.reduce((acc, produto) => acc + produto.receita, 0);
  $: totalLucro = produtosFiltrados.reduce((acc, produto) => acc + produto.lucro, 0);
  $: margemMedia = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;
  $: produtoTop = produtosFiltrados.length > 0 ? produtosFiltrados[0] : null;

  $: receitaPorProdutoData = {
    labels: produtosFiltrados.slice(0, 8).map((produto) => produto.produto),
    datasets: [
      {
        label: 'Receita',
        data: produtosFiltrados.slice(0, 8).map((produto) => produto.receita),
        backgroundColor: '#f97316'
      },
      {
        label: 'Lucro',
        data: produtosFiltrados.slice(0, 8).map((produto) => produto.lucro),
        backgroundColor: '#22c55e'
      }
    ]
  } satisfies ChartData;

  $: margemPorProdutoData = {
    labels: produtosFiltrados.slice(0, 8).map((produto) => produto.produto),
    datasets: [
      {
        label: 'Margem %',
        data: produtosFiltrados.slice(0, 8).map((produto) => produto.margem),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        type: 'line' as const,
        yAxisID: 'y'
      },
      {
        label: 'Quantidade',
        data: produtosFiltrados.slice(0, 8).map((produto) => produto.quantidade),
        backgroundColor: '#fdba74',
        type: 'bar' as const,
        yAxisID: 'y1'
      }
    ]
  } satisfies ChartData;
</script>

<svelte:head>
  <title>Vendas por Produto | VTUR</title>
</svelte:head>

<PageHeader
  title="Vendas por Produto"
  subtitle="Performance por tipo de produto"
  color="financeiro"
  breadcrumbs={[
    { label: 'Relatorios', href: '/relatorios' },
    { label: 'Produtos' }
  ]}
/>

<Card color="financeiro" class="mb-6">
  <div class="flex flex-col lg:flex-row gap-4 items-end">
    <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
      <div>
        <label for="rel-produtos-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data Inicio</label>
        <input id="rel-produtos-data-inicio" type="date" bind:value={dataInicio} class="vtur-input w-full" />
      </div>
      <div>
        <label for="rel-produtos-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
        <input id="rel-produtos-data-fim" type="date" bind:value={dataFim} class="vtur-input w-full" />
      </div>
      <div>
        <label for="rel-produtos-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
        <select id="rel-produtos-empresa" bind:value={empresaSelecionada} class="vtur-input w-full">
          <option value="">Todas</option>
          {#each empresas as empresa}
            <option value={empresa.id}>{empresa.nome}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="rel-produtos-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label>
        <select id="rel-produtos-vendedor" bind:value={vendedorSelecionado} class="vtur-input w-full">
          <option value="">Todos</option>
          {#each vendedores as vendedor}
            <option value={vendedor.id}>{vendedor.nome}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="rel-produtos-tipo" class="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
        <select id="rel-produtos-tipo" bind:value={tipoSelecionado} class="vtur-input w-full">
          <option value="">Todos</option>
          {#each tiposDisponiveis as tipo}
            <option value={tipo}>{tipo}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="rel-produtos-ordenacao" class="block text-sm font-medium text-slate-700 mb-1">Ordenar Por</label>
        <select id="rel-produtos-ordenacao" bind:value={ordenacao} class="vtur-input w-full">
          <option value="receita">Receita</option>
          <option value="lucro">Lucro</option>
          <option value="margem">Margem</option>
          <option value="quantidade">Quantidade</option>
        </select>
      </div>
    </div>
    <Button variant="primary" color="financeiro" on:click={gerarRelatorio}>
      <Filter size={16} class="mr-2" />
      Gerar
    </Button>
  </div>
</Card>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-sm text-slate-500">Receita Total</p>
    <p class="text-2xl font-bold text-slate-900">{formatCurrency(totalReceita)}</p>
  </div>
  <div class="vtur-card p-4 border-l-4 border-l-green-500">
    <p class="text-sm text-slate-500">Lucro Total</p>
    <p class="text-2xl font-bold text-green-600">{formatCurrency(totalLucro)}</p>
  </div>
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <p class="text-sm text-slate-500">Margem Media</p>
    <p class="text-2xl font-bold text-slate-900">{margemMedia.toFixed(1)}%</p>
  </div>
  {#if produtoTop}
    <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
      <p class="text-sm text-slate-500">Produto Top</p>
      <p class="text-lg font-bold text-slate-900 truncate">{produtoTop.produto}</p>
    </div>
  {/if}
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <Card header="Receita vs Lucro por Produto" color="financeiro">
    <ChartJS type="bar" data={receitaPorProdutoData} height={280} />
  </Card>
  <Card header="Margem e Quantidade" color="financeiro">
    <ChartJS type="bar" data={margemPorProdutoData} height={280} />
  </Card>
</div>

<DataTable
  {columns}
  data={produtosFiltrados}
  color="financeiro"
  {loading}
  title="Performance por Produto"
  searchable={true}
  exportable={true}
  onExport={handleExport}
  onRowClick={handleRowClick}
/>
