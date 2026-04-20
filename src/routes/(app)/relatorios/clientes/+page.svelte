<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { Filter, Users, Wallet, TrendingUp, Star } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';

  interface ClienteRelatorio {
    cliente_id?: string;
    cliente: string;
    cpf: string | null;
    email: string | null;
    total_compras: number;
    total_gasto: number;
    ticket_medio: number;
    ultima_compra: string | null;
    frequencia: number;
    categoria: 'VIP' | 'Regular' | 'Ocasional';
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

  let clientes: ClienteRelatorio[] = [];
  let empresas: EmpresaFiltro[] = [];
  let vendedores: VendedorFiltro[] = [];
  let loading = true;
  let dataInicio = defaultRange.start;
  let dataFim = defaultRange.end;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';
  let categoriaSelecionada = '';
  let ordenacao = 'total_gasto';

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
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'cpf', label: 'CPF', sortable: false, width: '130px' },
    {
      key: 'categoria',
      label: 'Categoria',
      sortable: true,
      width: '110px',
      formatter: (value: string) => getCategoriaBadge(value)
    },
    { key: 'total_compras', label: 'Compras', sortable: true, align: 'center' as const, width: '90px' },
    {
      key: 'total_gasto',
      label: 'Total Gasto',
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
      key: 'frequencia',
      label: 'Freq./Mes',
      sortable: true,
      align: 'center' as const,
      width: '100px',
      formatter: (value: number) => value.toFixed(1)
    },
    {
      key: 'ultima_compra',
      label: 'Ultima Compra',
      sortable: true,
      width: '130px',
      formatter: (value: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '-')
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

      const response = await fetch(`/api/v1/relatorios/clientes?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar relatorio');
      }

      const data = await response.json();
      clientes = data.items || [];

      if (showSuccess) {
        toast.success('Relatorio atualizado!');
      }
    } catch (err) {
      clientes = [];
      toast.error('Erro ao carregar relatorio de clientes');
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

  function getCategoriaBadge(categoria: string): string {
    const styles: Record<string, string> = {
      VIP: 'bg-financeiro-500 text-white',
      Regular: 'bg-financeiro-100 text-financeiro-700',
      Ocasional: 'bg-slate-100 text-slate-700'
    };

    return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[categoria] || 'bg-slate-100 text-slate-700'}">${categoria}</span>`;
  }

  function handleExport() {
    if (clientesFiltrados.length === 0) {
      toast.info('Não há dados para exportar');
      return;
    }

    const headers = ['Cliente', 'Categoria', 'Compras', 'Total Gasto', 'Ticket Médio', 'Frequência', 'Última Compra'];
    const rows = clientesFiltrados.map((cliente) => [
      cliente.cliente,
      cliente.categoria,
      cliente.total_compras,
      cliente.total_gasto.toFixed(2).replace('.', ','),
      cliente.ticket_medio.toFixed(2).replace('.', ','),
      cliente.frequencia.toFixed(2).replace('.', ','),
      cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleDateString('pt-BR') : ''
    ]);

    const csv = ['\uFEFF' + headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Relatório exportado com sucesso');
  }

  async function gerarRelatorio() {
    await loadRelatorio(true);
  }

  function handleRowClick(row: ClienteRelatorio) {
    if (row.cliente_id) {
      void goto(`/clientes/${row.cliente_id}`);
    }
  }

  $: clientesFiltrados = clientes
    .filter((cliente) => !categoriaSelecionada || cliente.categoria === categoriaSelecionada)
    .sort((left, right) => {
      if (ordenacao === 'total_compras') {
        return right.total_compras - left.total_compras;
      }

      if (ordenacao === 'ticket_medio') {
        return right.ticket_medio - left.ticket_medio;
      }

      if (ordenacao === 'ultima_compra') {
        return String(right.ultima_compra || '').localeCompare(String(left.ultima_compra || ''));
      }

      return right.total_gasto - left.total_gasto;
    });

  $: totalClientes = clientesFiltrados.length;
  $: totalGasto = clientesFiltrados.reduce((acc, cliente) => acc + cliente.total_gasto, 0);
  $: ticketMedioGeral = totalClientes > 0 ? totalGasto / totalClientes : 0;
  $: clientesVIP = clientesFiltrados.filter((cliente) => cliente.categoria === 'VIP').length;

  $: categoriasData = {
    labels: ['VIP', 'Regular', 'Ocasional'],
    datasets: [
      {
        label: 'Clientes',
        data: [
          clientesFiltrados.filter((cliente) => cliente.categoria === 'VIP').length,
          clientesFiltrados.filter((cliente) => cliente.categoria === 'Regular').length,
          clientesFiltrados.filter((cliente) => cliente.categoria === 'Ocasional').length
        ],
        backgroundColor: ['#f97316', '#fb923c', '#cbd5e1']
      }
    ]
  } satisfies ChartData;

  $: gastoPorClienteData = {
    labels: clientesFiltrados.slice(0, 5).map((cliente) => cliente.cliente.split(' ')[0]),
    datasets: [
      {
        label: 'Total Gasto',
        data: clientesFiltrados.slice(0, 5).map((cliente) => cliente.total_gasto),
        backgroundColor: '#f97316'
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
  <title>Vendas por Cliente | VTUR</title>
</svelte:head>

<PageHeader
  title="Vendas por Cliente"
  subtitle="Analise de clientes e historico de compras"
  color="financeiro"
  breadcrumbs={[
    { label: 'Relatorios', href: '/relatorios' },
    { label: 'Clientes' }
  ]}
/>

<FilterPanel color="financeiro">
  <div>
    <label for="rel-clientes-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data Inicio</label>
    <input id="rel-clientes-data-inicio" type="date" bind:value={dataInicio} class="vtur-input w-full" />
  </div>
  <div>
    <label for="rel-clientes-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
    <input id="rel-clientes-data-fim" type="date" bind:value={dataFim} class="vtur-input w-full" />
  </div>
  {#if showEmpresaFiltro}
  <div>
    <label for="rel-clientes-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
    <select id="rel-clientes-empresa" bind:value={empresaSelecionada} class="vtur-input w-full">
      <option value="">Todas</option>
      {#each empresas as empresa}
        <option value={empresa.id}>{empresa.nome}</option>
      {/each}
    </select>
  </div>
  {/if}
  {#if showVendedorFiltro}
  <div>
    <label for="rel-clientes-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label>
    <select id="rel-clientes-vendedor" bind:value={vendedorSelecionado} class="vtur-input w-full">
      <option value="">Todos</option>
      {#each vendedores as vendedor}
        <option value={vendedor.id}>{vendedor.nome}</option>
      {/each}
    </select>
  </div>
  {/if}
  <div>
    <label for="rel-clientes-categoria" class="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
    <select id="rel-clientes-categoria" bind:value={categoriaSelecionada} class="vtur-input w-full">
      <option value="">Todas</option>
      <option value="VIP">VIP</option>
      <option value="Regular">Regular</option>
      <option value="Ocasional">Ocasional</option>
    </select>
  </div>
  <div>
    <label for="rel-clientes-ordenacao" class="block text-sm font-medium text-slate-700 mb-1">Ordenar Por</label>
    <select id="rel-clientes-ordenacao" bind:value={ordenacao} class="vtur-input w-full">
      <option value="total_gasto">Total Gasto</option>
      <option value="total_compras">Quantidade</option>
      <option value="ticket_medio">Ticket Medio</option>
      <option value="ultima_compra">Ultima Compra</option>
    </select>
  </div>
  <svelte:fragment slot="actions">
    <Button variant="primary" color="financeiro" on:click={gerarRelatorio}>
      <Filter size={16} class="mr-2" />
      Gerar
    </Button>
  </svelte:fragment>
</FilterPanel>

<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Users size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Total de Clientes</p><p class="text-2xl font-bold text-slate-900">{totalClientes}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><Wallet size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Receita Total</p><p class="text-2xl font-bold text-slate-900">{formatCurrency(totalGasto)}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><TrendingUp size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Ticket Médio</p><p class="text-2xl font-bold text-slate-900">{formatCurrency(ticketMedioGeral)}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-violet-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500"><Star size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Clientes VIP</p><p class="text-2xl font-bold text-slate-900">{clientesVIP}</p></div>
  </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <Card header="Clientes por Categoria" color="financeiro">
    <ChartJS type="doughnut" data={categoriasData} height={250} />
  </Card>
  <Card header="Top 5 Clientes (Gasto)" color="financeiro">
    <ChartJS type="bar" data={gastoPorClienteData} height={250} />
  </Card>
</div>

<DataTable
  {columns}
  data={clientesFiltrados}
  color="financeiro"
  {loading}
  title="Detalhamento por Cliente"
  searchable={true}
  exportable={true}
  onExport={handleExport}
  onRowClick={handleRowClick}
/>
