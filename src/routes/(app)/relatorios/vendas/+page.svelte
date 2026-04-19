<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import { Filter, X, TrendingUp, DollarSign, Users, ShoppingCart } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface Recibo {
    id: string | null;
    numero_recibo: string | null;
    numero_recibo_normalizado: string | null;
    data_venda: string | null;
    tipo_produto: string;
    produto_nome: string;
    cidade_nome: string | null;
    valor_total: number;
    valor_taxas: number;
    valor_du: number;
    valor_rav: number;
    percentual_comissao_loja: number;
    faixa_comissao: string | null;
    valor_comissao_loja: number;
  }

  interface VendaRelatorio {
    id: string;
    numero_venda: string | null;
    codigo: string;
    data_venda: string | null;
    data_embarque: string | null;
    data_final: string | null;
    cliente_id: string | null;
    cliente_nome: string;
    cliente_cpf: string | null;
    vendedor_id: string | null;
    vendedor_nome: string;
    destino_id: string | null;
    destino_nome: string;
    destino_cidade_id: string | null;
    destino_cidade_nome: string | null;
    valor_total: number;
    valor_taxas: number;
    cancelada: boolean;
    status: 'confirmada' | 'pendente' | 'concluida' | 'cancelada';
    forma_pagamento: string;
    recibos: Recibo[];
    comissao: number;
  }

  interface Resumo {
    total_vendas: number;
    vendas_confirmadas: number;
    vendas_canceladas: number;
    total_valor: number;
    total_comissao: number;
    ticket_medio: number;
  }

  interface VendedorFiltro {
    id: string;
    nome: string;
  }

  interface EmpresaFiltro {
    id: string;
    nome: string;
  }

  interface BasePayload {
    empresas: EmpresaFiltro[];
    vendedores: Array<VendedorFiltro & { company_id?: string; company_name?: string }>;
  }

  function getDefaultRange() {
    const today = new Date();
    return {
      start: `${today.getFullYear()}-01-01`,
      end: today.toISOString().slice(0, 10)
    };
  }

  function formatMonthLabel(monthKey: string) {
    const [year, month] = monthKey.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(
      new Date(year, month - 1, 1)
    );
  }

  const defaultRange = getDefaultRange();

  let vendas: VendaRelatorio[] = [];
  let vendedores: VendedorFiltro[] = [];
  let empresas: EmpresaFiltro[] = [];
  let resumo: Resumo = {
    total_vendas: 0,
    vendas_confirmadas: 0,
    vendas_canceladas: 0,
    total_valor: 0,
    total_comissao: 0,
    ticket_medio: 0
  };
  let loading = true;
  let dataInicio = defaultRange.start;
  let dataFim = defaultRange.end;
  let vendedorSelecionado = '';
  let empresaSelecionada = '';
  let statusSelecionado = '';
  let clienteIdFiltro = '';
  let destinoFiltro = '';
  let produtoFiltro = '';
  let tipoProdutoFiltro = '';

  const columns = [
    { key: 'codigo', label: 'Código', sortable: true, width: '120px' },
    {
      key: 'data_venda',
      label: 'Data',
      sortable: true,
      width: '100px',
      formatter: (value: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '-')
    },
    { key: 'cliente_nome', label: 'Cliente', sortable: true },
    { key: 'vendedor_nome', label: 'Vendedor', sortable: true, width: '160px' },
    { key: 'destino_nome', label: 'Destino', sortable: true },
    { key: 'destino_cidade_nome', label: 'Cidade', sortable: true },
    {
      key: 'valor_total',
      label: 'Valor',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'valor_taxas',
      label: 'Taxas',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'comissao',
      label: 'Comissão',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '120px',
      formatter: (value: string) => getStatusBadge(value)
    },
    { key: 'forma_pagamento', label: 'Pagamento', sortable: true, width: '140px' }
  ];

  async function loadBase() {
    try {
      const response = await fetch('/api/v1/relatorios/base');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[relatorios/base] Erro:', response.status, errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
      const data = (await response.json()) as BasePayload;
      empresas = data.empresas || [];
      vendedores = data.vendedores || [];
    } catch (err) {
      empresas = [];
      vendedores = [];
      const msg = err instanceof Error ? err.message : 'Erro ao carregar filtros analíticos';
      console.error('[loadBase] Erro:', msg);
      toast.error(msg);
    }
  }

  function syncUrl() {
    const params = new URLSearchParams({
      data_inicio: dataInicio,
      data_fim: dataFim
    });

    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
    if (vendedorSelecionado) params.set('vendedor_id', vendedorSelecionado);
    if (statusSelecionado) params.set('status', statusSelecionado);
    if (clienteIdFiltro) params.set('cliente_id', clienteIdFiltro);
    if (destinoFiltro) params.set('destino', destinoFiltro);
    if (produtoFiltro) params.set('produto', produtoFiltro);
    if (tipoProdutoFiltro) params.set('tipo_produto', tipoProdutoFiltro);

    void goto(`/relatorios/vendas?${params.toString()}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  }

  async function loadRelatorio(showSuccess = false) {
    loading = true;

    try {
      const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim
      });

      if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
      if (vendedorSelecionado) params.set('vendedor_id', vendedorSelecionado);
      if (statusSelecionado) params.set('status', statusSelecionado);
      if (clienteIdFiltro) params.set('cliente_id', clienteIdFiltro);
      if (destinoFiltro) params.set('destino', destinoFiltro);
      if (produtoFiltro) params.set('produto', produtoFiltro);
      if (tipoProdutoFiltro) params.set('tipo_produto', tipoProdutoFiltro);

      const response = await fetch(`/api/v1/relatorios/vendas?${params.toString()}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[relatorios/vendas] Erro:', response.status, errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      vendas = data.items || [];
      resumo = data.resumo || resumo;
      syncUrl();

      if (showSuccess) {
        toast.success('Relatório atualizado');
      }
    } catch (err) {
      vendas = [];
      const msg = err instanceof Error ? err.message : 'Erro ao carregar relatório de vendas';
      console.error('[loadRelatorio] Erro:', msg);
      toast.error(msg);
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    dataInicio = params.get('data_inicio') || defaultRange.start;
    dataFim = params.get('data_fim') || defaultRange.end;
    vendedorSelecionado = params.get('vendedor_id') || '';
    empresaSelecionada = params.get('empresa_id') || '';
    statusSelecionado = params.get('status') || '';
    clienteIdFiltro = params.get('cliente_id') || '';
    destinoFiltro = params.get('destino') || '';
    produtoFiltro = params.get('produto') || '';
    tipoProdutoFiltro = params.get('tipo_produto') || '';

    await loadBase();
    await loadRelatorio();
  });

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function getStatusBadge(status: string): string {
    const styles: Record<string, string> = {
      confirmada: 'bg-green-100 text-green-700',
      pendente: 'bg-amber-100 text-amber-700',
      concluida: 'bg-blue-100 text-blue-700',
      cancelada: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      confirmada: 'Confirmada',
      pendente: 'Pendente',
      concluida: 'Concluída',
      cancelada: 'Cancelada'
    };

    return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-slate-100 text-slate-600'}">${labels[status] || status}</span>`;
  }

  function handleExport() {
    if (vendas.length === 0) {
      toast.info('Não há vendas para exportar');
      return;
    }

    const headers = ['Código', 'Data', 'Cliente', 'CPF', 'Vendedor', 'Destino', 'Cidade', 'Valor', 'Taxas', 'Comissão', 'Status', 'Pagamento'];
    const rows = vendas.map((venda) => [
      venda.codigo,
      venda.data_venda ? new Date(venda.data_venda).toLocaleDateString('pt-BR') : '',
      venda.cliente_nome,
      venda.cliente_cpf || '',
      venda.vendedor_nome,
      venda.destino_nome,
      venda.destino_cidade_nome || '',
      venda.valor_total.toFixed(2).replace('.', ','),
      venda.valor_taxas.toFixed(2).replace('.', ','),
      venda.comissao.toFixed(2).replace('.', ','),
      venda.status,
      venda.forma_pagamento
    ]);

    const csv = ['\uFEFF' + headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_vendas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Relatório exportado com sucesso');
  }

  async function gerarRelatorio() {
    await loadRelatorio(true);
  }

  function clearContextFilters() {
    clienteIdFiltro = '';
    destinoFiltro = '';
    produtoFiltro = '';
    tipoProdutoFiltro = '';
    void loadRelatorio(true);
  }

  function handleRowClick(row: VendaRelatorio) {
    void goto(`/vendas/${row.id}`);
  }

  $: vendasFiltradas = vendas;
  $: totalVendas = vendasFiltradas.reduce((acc, venda) => acc + (venda.valor_total || 0), 0);
  $: totalComissoes = vendasFiltradas.reduce((acc, venda) => acc + (venda.comissao || 0), 0);
  $: ticketMedio = vendasFiltradas.length > 0 ? totalVendas / vendasFiltradas.length : 0;

  $: vendasPorMesData = (() => {
    const monthMap = new Map<string, number>();

    vendasFiltradas.forEach((venda) => {
      if (!venda.data_venda) return;
      const key = venda.data_venda.slice(0, 7);
      monthMap.set(key, (monthMap.get(key) || 0) + (venda.valor_total || 0));
    });

    const ordered = Array.from(monthMap.entries()).sort((left, right) => left[0].localeCompare(right[0]));

    return {
      labels: ordered.map(([key]) => formatMonthLabel(key)),
      datasets: [
        {
          label: 'Receita',
          data: ordered.map(([, value]) => value),
          backgroundColor: '#f97316'
        }
      ]
    } satisfies ChartData;
  })();
</script>

<svelte:head>
  <title>Relatório de Vendas | VTUR</title>
</svelte:head>

<PageHeader
  title="Relatório de Vendas"
  subtitle="Leitura detalhada das vendas com drill-down operacional por cliente, destino, produto e responsável."
  color="financeiro"
  breadcrumbs={[
    { label: 'Relatórios', href: '/relatorios' },
    { label: 'Vendas' }
  ]}
/>

<Card color="financeiro" class="mb-6">
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <div>
        <label for="rel-vendas-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">Data início</label>
        <input id="rel-vendas-data-inicio" type="date" bind:value={dataInicio} class="vtur-input w-full" />
      </div>
      <div>
        <label for="rel-vendas-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data fim</label>
        <input id="rel-vendas-data-fim" type="date" bind:value={dataFim} class="vtur-input w-full" />
      </div>
      <div>
        <label for="rel-vendas-empresa" class="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
        <select id="rel-vendas-empresa" bind:value={empresaSelecionada} class="vtur-input w-full">
          <option value="">Todas</option>
          {#each empresas as empresa}
            <option value={empresa.id}>{empresa.nome}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="rel-vendas-vendedor" class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label>
        <select id="rel-vendas-vendedor" bind:value={vendedorSelecionado} class="vtur-input w-full">
          <option value="">Todos</option>
          {#each vendedores as vendedor}
            <option value={vendedor.id}>{vendedor.nome}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="rel-vendas-status" class="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select id="rel-vendas-status" bind:value={statusSelecionado} class="vtur-input w-full">
          <option value="">Todos</option>
          <option value="confirmada">Confirmada</option>
          <option value="pendente">Pendente</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
      <div class="flex items-end">
        <Button variant="primary" color="financeiro" class_name="w-full" on:click={gerarRelatorio}>
          <Filter size={16} class="mr-2" />
          Aplicar
        </Button>
      </div>
    </div>

    {#if clienteIdFiltro || destinoFiltro || produtoFiltro || tipoProdutoFiltro}
      <div class="flex flex-wrap items-center gap-2 rounded-2xl border border-financeiro-100 bg-financeiro-50/60 px-3 py-3 text-sm text-slate-600">
        <span class="font-medium text-slate-900">Drill-down ativo:</span>
        {#if clienteIdFiltro}
          <span class="rounded-full bg-white px-3 py-1">Cliente específico</span>
        {/if}
        {#if destinoFiltro}
          <span class="rounded-full bg-white px-3 py-1">Destino: {destinoFiltro}</span>
        {/if}
        {#if produtoFiltro}
          <span class="rounded-full bg-white px-3 py-1">Produto: {produtoFiltro}</span>
        {/if}
        {#if tipoProdutoFiltro}
          <span class="rounded-full bg-white px-3 py-1">Tipo: {tipoProdutoFiltro}</span>
        {/if}
        <button class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50" on:click={clearContextFilters}>
          <X size={14} />
          Limpar contexto
        </button>
      </div>
    {/if}
  </div>
</Card>

<KPIGrid className="mb-6" columns={5}>
  <KPICard 
    title="Total vendas" 
    value={resumo.total_vendas} 
    color="financeiro" 
    icon={ShoppingCart} 
  />
  <KPICard 
    title="Receita total" 
    value={formatCurrency(resumo.total_valor)} 
    color="financeiro" 
    icon={DollarSign} 
  />
  <KPICard 
    title="Comissões" 
    value={formatCurrency(resumo.total_comissao)} 
    color="financeiro" 
    icon={TrendingUp} 
  />
  <KPICard 
    title="Ticket médio" 
    value={formatCurrency(resumo.ticket_medio)} 
    color="financeiro" 
    icon={TrendingUp} 
  />
  <KPICard 
    title="Canceladas" 
    value={resumo.vendas_canceladas} 
    color="financeiro" 
    icon={Users} 
  />
</KPIGrid>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <Card header="Receita por mês" color="financeiro">
    <ChartJS type="bar" data={vendasPorMesData} height={280} />
  </Card>
  <Card header="Leitura operacional" color="financeiro">
    <div class="space-y-4 text-sm text-slate-600">
      <p>
        O detalhamento abaixo usa o fluxo real de vendas do período, com vínculo para o registro de origem e filtros reaproveitados pelos relatórios de cliente, destino, produto e ranking.
      </p>
      <p>
        Clique em qualquer linha para abrir a venda. Quando você chega aqui por drill-down, o contexto é preservado na URL e no payload do backend.
      </p>
    </div>
  </Card>
</div>

<DataTable
  {columns}
  data={vendasFiltradas}
  color="financeiro"
  {loading}
  title="Detalhamento de vendas"
  searchable={true}
  exportable={true}
  onExport={handleExport}
  onRowClick={handleRowClick}
/>
