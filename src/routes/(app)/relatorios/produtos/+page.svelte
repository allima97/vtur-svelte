<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { ArrowLeft, Filter, Wallet, TrendingUp, BarChart2, Trophy } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';

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

  // Regra de escopo: vendedor/uso individual não escolhe empresa ou vendedor global.
  $: showEmpresaFiltro = !$permissoes.ready || $permissoes.isSystemAdmin || $permissoes.isMaster;
  $: showVendedorFiltro = !$permissoes.ready || (!$permissoes.isVendedor && !$permissoes.usoIndividual);

  $: if ($permissoes.ready && !showEmpresaFiltro && empresaSelecionada) empresaSelecionada = '';
  $: if ($permissoes.ready && !showVendedorFiltro && vendedorSelecionado) vendedorSelecionado = '';
</script>

<svelte:head>
  <title>Vendas por Produto | VTUR</title>
</svelte:head>

<PageHeader
  title="Vendas por Produto"
  subtitle="Performance por tipo de produto"
  color="financeiro"
  actions={[{ label: 'Voltar', href: '/relatorios', variant: 'secondary', icon: ArrowLeft }]}
  breadcrumbs={[
    { label: 'Relatorios', href: '/relatorios' },
    { label: 'Produtos' }
  ]}
/>

<FilterPanel color="financeiro">
  <FieldInput
    id="rel-produtos-data-inicio"
    label="Data Inicio"
    type="date"
    bind:value={dataInicio}
    class_name="w-full"
  />
  <FieldInput
    id="rel-produtos-data-fim"
    label="Data Fim"
    type="date"
    bind:value={dataFim}
    min={dataInicio || null}
    class_name="w-full"
  />
  {#if showEmpresaFiltro}
    <FieldSelect
      id="rel-produtos-empresa"
      label="Empresa"
      bind:value={empresaSelecionada}
      options={[{ value: '', label: 'Todas' }, ...empresas.map((e) => ({ value: e.id, label: e.nome }))]}
      placeholder={null}
      class_name="w-full"
    />
  {/if}
  {#if showVendedorFiltro}
    <FieldSelect
      id="rel-produtos-vendedor"
      label="Vendedor"
      bind:value={vendedorSelecionado}
      options={[{ value: '', label: 'Todos' }, ...vendedores.map((v) => ({ value: v.id, label: v.nome }))]}
      placeholder={null}
      class_name="w-full"
    />
  {/if}
  <FieldSelect
    id="rel-produtos-tipo"
    label="Tipo"
    bind:value={tipoSelecionado}
    options={[{ value: '', label: 'Todos' }, ...tiposDisponiveis.map((t) => ({ value: t, label: t }))]}
    placeholder={null}
    class_name="w-full"
  />
  <FieldSelect
    id="rel-produtos-ordenacao"
    label="Ordenar Por"
    bind:value={ordenacao}
    options={[
      { value: 'receita', label: 'Receita' },
      { value: 'lucro', label: 'Lucro' },
      { value: 'margem', label: 'Margem' },
      { value: 'quantidade', label: 'Quantidade' }
    ]}
    placeholder={null}
    class_name="w-full"
  />
  <svelte:fragment slot="actions">
    <Button variant="primary" color="financeiro" on:click={gerarRelatorio}>
      <Filter size={16} class="mr-2" />
      Gerar
    </Button>
  </svelte:fragment>
</FilterPanel>

<div class="vtur-kpi-grid {produtoTop ? '' : 'vtur-kpi-grid-3'} mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500"><Wallet size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Receita Total</p><p class="text-2xl font-bold text-slate-900">{formatCurrency(totalReceita)}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><TrendingUp size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Lucro Total</p><p class="text-2xl font-bold text-slate-900">{formatCurrency(totalLucro)}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><BarChart2 size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Margem Média</p><p class="text-2xl font-bold text-slate-900">{margemMedia.toFixed(1)}%</p></div>
  </div>
  {#if produtoTop}
    <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><Trophy size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Produto Top</p>
        <p class="text-lg font-bold text-slate-900 truncate">{produtoTop.produto}</p>
      </div>
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
