<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { Filter, MapPin } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface DestinoRelatorio {
    destino: string;
    quantidade: number;
    receita: number;
    ticket_medio: number;
    percentual: number;
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

  let destinos: DestinoRelatorio[] = [];
  let empresas: EmpresaFiltro[] = [];
  let vendedores: VendedorFiltro[] = [];
  let loading = true;
  let dataInicio = defaultRange.start;
  let dataFim = defaultRange.end;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';
  let ordenacao = 'receita';
  let recorte = 'todos';

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
    { key: 'destino', label: 'Destino', sortable: true },
    { key: 'quantidade', label: 'Vendas', sortable: true, align: 'center' as const, width: '100px' },
    {
      key: 'receita',
      label: 'Receita',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'ticket_medio',
      label: 'Ticket Medio',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'percentual',
      label: 'Participacao',
      sortable: true,
      align: 'center' as const,
      width: '140px',
      formatter: (value: number) =>
        `<div class="flex items-center gap-2"><div class="flex-1 h-2 bg-slate-200 rounded-full"><div class="h-2 bg-financeiro-500 rounded-full" style="width: ${Math.min(value, 100)}%"></div></div><span class="text-sm text-slate-600">${value.toFixed(1)}%</span></div>`
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

      const response = await fetch(`/api/v1/relatorios/destinos?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar relatorio');
      }

      const data = await response.json();
      destinos = data.items || [];

      if (showSuccess) {
        toast.success('Relatorio atualizado!');
      }
    } catch (err) {
      destinos = [];
      toast.error('Erro ao carregar relatorio de destinos');
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
    if (destinosFiltrados.length === 0) {
      toast.info('Não há dados para exportar');
      return;
    }

    const headers = ['Destino', 'Vendas', 'Receita', 'Ticket Médio', 'Participação'];
    const rows = destinosFiltrados.map((destino) => [
      destino.destino,
      destino.quantidade,
      destino.receita.toFixed(2).replace('.', ','),
      destino.ticket_medio.toFixed(2).replace('.', ','),
      destino.percentual.toFixed(2).replace('.', ',')
    ]);

    const csv = ['\uFEFF' + headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_destinos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Relatório exportado com sucesso');
  }

  async function gerarRelatorio() {
    await loadRelatorio(true);
  }

  function handleRowClick(row: DestinoRelatorio) {
    const params = new URLSearchParams({
      data_inicio: dataInicio,
      data_fim: dataFim,
      destino: row.destino
    });

    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
    if (vendedorSelecionado) params.set('vendedor_id', vendedorSelecionado);

    void goto(`/relatorios/vendas?${params.toString()}`);
  }

  $: destinosOrdenados = [...destinos].sort((left, right) => {
    if (ordenacao === 'quantidade') {
      return right.quantidade - left.quantidade;
    }

    if (ordenacao === 'ticket_medio') {
      return right.ticket_medio - left.ticket_medio;
    }

    return right.receita - left.receita;
  });

  $: destinosFiltrados = (() => {
    if (recorte === 'top5') {
      return destinosOrdenados.slice(0, 5);
    }

    if (recorte === 'top10') {
      return destinosOrdenados.slice(0, 10);
    }

    return destinosOrdenados;
  })();

  $: totalReceita = destinosFiltrados.reduce((acc, destino) => acc + destino.receita, 0);
  $: totalVendas = destinosFiltrados.reduce((acc, destino) => acc + destino.quantidade, 0);
  $: destinoTop = destinosFiltrados.length > 0 ? destinosFiltrados[0] : null;

  $: vendasPorDestinoData = {
    labels: destinosFiltrados.slice(0, 10).map((destino) => destino.destino.split(' - ')[0]),
    datasets: [
      {
        label: 'Receita',
        data: destinosFiltrados.slice(0, 10).map((destino) => destino.receita),
        backgroundColor: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#cbd5e1']
      }
    ]
  } satisfies ChartData;

  $: vendasPorQuantidadeData = {
    labels: destinosFiltrados.slice(0, 5).map((destino) => destino.destino.split(' - ')[0]),
    datasets: [
      {
        label: 'Quantidade de Vendas',
        data: destinosFiltrados.slice(0, 5).map((destino) => destino.quantidade),
        backgroundColor: '#f97316'
      }
    ]
  } satisfies ChartData;
</script>

<svelte:head>
  <title>Vendas por Destino | VTUR</title>
</svelte:head>

<PageHeader
  title="Vendas por Destino"
  subtitle="Analise de vendas por destino turistico"
  color="financeiro"
  breadcrumbs={[
    { label: 'Relatorios', href: '/relatorios' },
    { label: 'Destinos' }
  ]}
/>

<Card color="financeiro" class="mb-6">
  <div class="flex flex-col lg:flex-row gap-4 items-end">
    <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
      <div>
        <label for="rel-destinos-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data Inicio</label>
        <input id="rel-destinos-data-inicio" type="date" bind:value={dataInicio} class="vtur-input w-full" />
      </div>
      <div>
        <label for="rel-destinos-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
        <input id="rel-destinos-data-fim" type="date" bind:value={dataFim} class="vtur-input w-full" />
      </div>
      <div>
        <label for="rel-destinos-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
        <select id="rel-destinos-empresa" bind:value={empresaSelecionada} class="vtur-input w-full">
          <option value="">Todas</option>
          {#each empresas as empresa}
            <option value={empresa.id}>{empresa.nome}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="rel-destinos-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label>
        <select id="rel-destinos-vendedor" bind:value={vendedorSelecionado} class="vtur-input w-full">
          <option value="">Todos</option>
          {#each vendedores as vendedor}
            <option value={vendedor.id}>{vendedor.nome}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="rel-destinos-ordenacao" class="block text-sm font-medium text-slate-700 mb-1">Ordenar Por</label>
        <select id="rel-destinos-ordenacao" bind:value={ordenacao} class="vtur-input w-full">
          <option value="receita">Receita</option>
          <option value="quantidade">Quantidade</option>
          <option value="ticket_medio">Ticket Medio</option>
        </select>
      </div>
      <div>
        <label for="rel-destinos-recorte" class="block text-sm font-medium text-slate-700 mb-1">Recorte</label>
        <select id="rel-destinos-recorte" bind:value={recorte} class="vtur-input w-full">
          <option value="todos">Todos</option>
          <option value="top5">Top 5</option>
          <option value="top10">Top 10</option>
        </select>
      </div>
    </div>
    <Button variant="primary" color="financeiro" on:click={gerarRelatorio}>
      <Filter size={16} class="mr-2" />
      Gerar
    </Button>
  </div>
</Card>

{#if destinoTop}
  <Card color="financeiro" class="mb-6">
    <div class="flex items-center gap-4">
      <div class="p-4 bg-financeiro-100 rounded-full">
        <MapPin size={32} class="text-financeiro-600" />
      </div>
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-slate-900">Destino em Destaque</h3>
        <p class="text-2xl font-bold text-financeiro-600">{destinoTop.destino}</p>
        <div class="flex gap-6 mt-2 text-sm">
          <span class="text-slate-500">{destinoTop.quantidade} vendas</span>
          <span class="text-slate-500">{formatCurrency(destinoTop.receita)} em receita</span>
          <span class="text-slate-500">{destinoTop.percentual.toFixed(1)}% do total</span>
        </div>
      </div>
    </div>
  </Card>
{/if}

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <Card header="Receita por Destino" color="financeiro">
    <ChartJS type="doughnut" data={vendasPorDestinoData} height={280} />
  </Card>
  <Card header="Top Destinos (Quantidade)" color="financeiro">
    <ChartJS type="bar" data={vendasPorQuantidadeData} height={280} />
  </Card>
</div>

<DataTable
  {columns}
  data={destinosFiltrados}
  color="financeiro"
  {loading}
  title="Detalhamento por Destino"
  searchable={true}
  exportable={true}
  onExport={handleExport}
  onRowClick={handleRowClick}
/>
