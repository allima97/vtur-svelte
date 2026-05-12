<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import FieldInput from '$lib/components/ui/form/FieldInput.svelte';
  import FieldSelect from '$lib/components/ui/form/FieldSelect.svelte';
  import { Plus, FileSpreadsheet, ShoppingCart, DollarSign, Calendar, SlidersHorizontal } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';
  import { permissoes } from '$lib/stores/permissoes';
  import { monthRangeFromKey, todayISODateLocal } from '$lib/date';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';

  interface Venda {
    id: string;
    codigo: string;
    cliente: string;
    cliente_id: string;
    destino: string;
    data_venda: string | null;
    data_embarque: string | null;
    valor_total: number;
    valor_taxas: number | null;
    comissao: number | null;
    status: 'confirmada' | 'pendente' | 'cancelada' | 'concluida';
    vendedor: string;
    tipo: 'pacote' | 'hotel' | 'passagem' | 'servico';
    recibos: string[];
  }

  interface VendasKpis {
    totalVendas: number;
    totalTaxas: number;
    totalLiquido: number;
    totalSeguro: number;
    countVendas: number;
    countAtivas: number;
  }

  type PeriodoModo = 'mes' | 'periodo';

  const today = todayISODateLocal();
  const currentMonth = today.slice(0, 7);
  const currentMonthRange = monthRangeFromKey(currentMonth) || {
    inicio: `${currentMonth}-01`,
    fim: today
  };

  let vendas: Venda[] = [];
  let loading = true;
  let loadingKpis = true;
  let errorMessage: string | null = null;
  let mounted = false;
  let listPage = 1;
  let listPageSize = 25;
  let totalVendas = 0;
  let searchTerm = '';
  let filterValues: Record<string, string> = {};
  let filtroPeriodoModo: PeriodoModo = 'mes';
  let mesSelecionado = currentMonth;
  let periodoInicio = currentMonthRange.inicio;
  let periodoFim = currentMonthRange.fim;
  let showFilterSheet = false;
  let vendedoresOptions: Array<{ id: string; nome_completo: string }> = [];
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let requestSeq = 0;
  let kpisMesCorrente: VendasKpis = {
    totalVendas: 0,
    totalTaxas: 0,
    totalLiquido: 0,
    totalSeguro: 0,
    countVendas: 0,
    countAtivas: 0
  };
  let filters: Array<{
    key: string;
    label: string;
    type: 'select';
    options: Array<{ value: string; label: string }>;
  }> = [];

  const columnsBase = [
    {
      key: 'codigo',
      label: 'Código',
      sortable: true,
      width: '130px'
    },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: true
    },
    {
      key: 'data_venda',
      label: 'Data da venda',
      sortable: true,
      width: '130px',
      formatter: (value: string | null) => formatDate(value)
    },
    {
      key: 'destino',
      label: 'Destino',
      sortable: true
    },
    {
      key: 'data_embarque',
      label: 'Embarque',
      sortable: true,
      width: '120px',
      formatter: (value: string | null) => formatDate(value)
    },
    {
      key: 'valor_total',
      label: 'Valor Total',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number | null | undefined) =>
        formatCurrency(Number(value) || 0)
    },
    {
      key: 'valor_taxas',
      label: 'Taxas',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number | null | undefined) =>
        formatCurrency(Number(value) || 0)
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '130px',
      formatter: (value: string) => {
        const styles = {
          confirmada: 'bg-green-100 text-green-700',
          pendente: 'bg-amber-100 text-amber-700',
          cancelada: 'bg-red-100 text-red-700',
          concluida: 'bg-blue-100 text-blue-700'
        };
        const labels = {
          confirmada: 'Confirmada',
          pendente: 'Pendente',
          cancelada: 'Cancelada',
          concluida: 'Concluída'
        };

        return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value as keyof typeof styles]}">${labels[value as keyof typeof labels]}</span>`;
      }
    },
    {
      key: 'vendedor',
      label: 'Vendedor',
      sortable: true,
      width: '160px'
    }
  ];

  let columns = columnsBase;

  async function loadVendas() {
    const seq = ++requestSeq;
    loading = true;
    errorMessage = null;

    try {
      const payload: any = await apiGet('/api/v1/vendas/list', {
        page: listPage,
        pageSize: listPageSize,
        q: searchTerm,
        inicio: periodoInicio || undefined,
        fim: periodoFim || undefined,
        vendedor_ids: filterValues.vendedor_id || undefined,
        include_vendedores: vendedoresOptions.length === 0 ? 1 : undefined
      });

      if (seq !== requestSeq) return;

      vendas = (Array.isArray(payload?.items) ? payload.items : []).map((v: Venda) => {
        const recibos: string[] = Array.isArray(v.recibos) ? v.recibos : [];
        const variants = recibos.flatMap((r) => {
          const noDash = r.replace(/-/g, '');
          const parts = r.split('-');
          const numPart = parts.length > 1 ? parts[parts.length - 1] : '';
          return [r, noDash, numPart].filter(Boolean);
        });
        return { ...v, _recibos_busca: variants.join(' ') };
      });
      totalVendas = Number(payload?.total || vendas.length || 0);
      if (Array.isArray(payload?.vendedores)) {
        vendedoresOptions = payload.vendedores;
      }
    } catch (err) {
      if (seq !== requestSeq) return;
      errorMessage = err instanceof Error ? err.message : 'Erro ao carregar vendas.';
      vendas = [];
      totalVendas = 0;
      toast.error(errorMessage);
    } finally {
      if (seq === requestSeq) loading = false;
    }
  }

  function getCurrentMonthRange() {
    return {
      inicio: currentMonthRange.inicio,
      fim: currentMonthRange.fim
    };
  }

  async function loadKpisMesCorrente() {
    loadingKpis = true;
    try {
      const range = getCurrentMonthRange();
      const payload: any = await apiGet('/api/v1/vendas/kpis', {
        inicio: range.inicio,
        fim: range.fim
      });
      kpisMesCorrente = {
        totalVendas: Number(payload?.kpis?.totalVendas || 0),
        totalTaxas: Number(payload?.kpis?.totalTaxas || 0),
        totalLiquido: Number(payload?.kpis?.totalLiquido || 0),
        totalSeguro: Number(payload?.kpis?.totalSeguro || 0),
        countVendas: Number(payload?.kpis?.countVendas || 0),
        countAtivas: Number(payload?.kpis?.countAtivas || 0)
      };
    } catch (err) {
      kpisMesCorrente = {
        totalVendas: 0,
        totalTaxas: 0,
        totalLiquido: 0,
        totalSeguro: 0,
        countVendas: 0,
        countAtivas: 0
      };
      const msg = err instanceof Error ? err.message : 'Erro ao carregar KPIs do mês corrente.';
      toast.error(msg);
    } finally {
      loadingKpis = false;
    }
  }

  onMount(() => {
    mounted = true;
    void loadVendas();
    void loadKpisMesCorrente();
  });

  $: showVendedorFilter = !$permissoes.ready || (!$permissoes.isVendedor && !$permissoes.usoIndividual);

  $: columns = showVendedorFilter
    ? columnsBase
    : columnsBase.filter((column) => column.key !== 'vendedor');

  $: filters = [
    ...(showVendedorFilter
      ? [
          {
            key: 'vendedor_id',
            label: 'Vendedor',
            type: 'select' as const,
            options: vendedoresOptions
              .filter((vendedor) => String(vendedor.id || '').trim())
              .map((vendedor) => ({
                value: String(vendedor.id),
                label: String(vendedor.nome_completo || 'Usuário sem nome')
              }))
              .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'))
          }
        ]
      : [])
  ];

  function syncPeriodoFromControls() {
    if (filtroPeriodoModo === 'mes') {
      const range = monthRangeFromKey(mesSelecionado) || currentMonthRange;
      periodoInicio = range.inicio;
      periodoFim = range.fim;
    }
  }

  function handlePeriodoChange() {
    syncPeriodoFromControls();
    scheduleLoadVendas(true);
  }

  function scheduleLoadVendas(resetPage = false) {
    if (!mounted) return;
    if (resetPage) listPage = 1;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      void loadVendas();
    }, 250);
  }

  function handleSearch(query: string) {
    if (searchTerm === query) return;
    searchTerm = query;
    scheduleLoadVendas(true);
  }

  function handleFilterChange(key: string, value: string) {
    filterValues = { ...filterValues, [key]: value };
    scheduleLoadVendas(true);
  }

  function handlePageChange(page: number) {
    if (listPage === page) return;
    listPage = page;
    void loadVendas();
  }

  function handlePageSizeChange(pageSize: number) {
    if (listPageSize === pageSize) return;
    listPageSize = pageSize;
    listPage = 1;
    void loadVendas();
  }

  function handleRowClick(row: Venda) {
    goto(`/vendas/${row.id}`);
  }

  function handleExport() {
    toast.info('A exportação sera ligada na proxima etapa. Os dados reais ja estao conectados.');
  }

</script>

<svelte:head>
  <title>Vendas | VTUR</title>
</svelte:head>

<PageHeader
  title="Vendas"
  subtitle="Gerencie as vendas com leitura real do banco compartilhado do VTUR."
  color="vendas"
  breadcrumbs={[{ label: 'Vendas' }]}
  actions={[
    {
      label: 'Importar',
      href: '/vendas/importar',
      variant: 'secondary',
      icon: FileSpreadsheet
    },
    {
      label: 'Nova Venda',
      href: '/vendas/nova',
      variant: 'primary',
      icon: Plus
    }
  ]}
/>

{#if errorMessage}
  <ErrorState variant="banner" message={errorMessage} />
{/if}

<KPIGrid className="mb-6" columns={4} loading={loadingKpis}>
  {#if !loadingKpis}
    <KPICard title="Valor total (mês corrente)" value={formatCurrency(kpisMesCorrente.totalVendas)} color="vendas" icon={DollarSign} />
    <KPICard title="Total de vendas (mês corrente)" value={kpisMesCorrente.countAtivas} color="vendas" icon={ShoppingCart} />
    <KPICard title="Taxas (mês corrente)" value={formatCurrency(kpisMesCorrente.totalTaxas)} color="clientes" icon={Calendar} />
    <KPICard title="Líquido (mês corrente)" value={formatCurrency(kpisMesCorrente.totalLiquido)} color="financeiro" icon={Calendar} />
  {/if}
</KPIGrid>

<div class="mb-4 sm:hidden">
  <Button variant="secondary" class_name="w-full justify-center" on:click={() => (showFilterSheet = true)}>
    <SlidersHorizontal size={16} class="mr-2" />
    Filtros
  </Button>
</div>

<BottomSheet bind:open={showFilterSheet} title="Filtrar vendas">
  <div class="space-y-4">
    <FieldSelect
      id="vendas-periodo-modo-mobile"
      label="Período"
      bind:value={filtroPeriodoModo}
      options={[
        { value: 'mes', label: 'Mês completo' },
        { value: 'periodo', label: 'Data específica' }
      ]}
      class_name="w-full"
      on:change={handlePeriodoChange}
    />

    {#if filtroPeriodoModo === 'mes'}
      <FieldInput
        id="vendas-mes-mobile"
        label="Mês"
        type="month"
        bind:value={mesSelecionado}
        class_name="w-full"
        on:change={handlePeriodoChange}
      />
    {:else}
      <FieldInput
        id="vendas-inicio-mobile"
        label="Data início"
        type="date"
        bind:value={periodoInicio}
        class_name="w-full"
        on:change={handlePeriodoChange}
      />
      <FieldInput
        id="vendas-fim-mobile"
        label="Data fim"
        type="date"
        bind:value={periodoFim}
        class_name="w-full"
        on:change={handlePeriodoChange}
      />
    {/if}

    <Button variant="primary" class_name="w-full justify-center" on:click={() => (showFilterSheet = false)}>
      Aplicar filtros
    </Button>
  </div>
</BottomSheet>

<div class="vtur-filter-panel mb-4 hidden sm:block">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
    <FieldSelect
      id="vendas-periodo-modo"
      label="Período"
      bind:value={filtroPeriodoModo}
      options={[
        { value: 'mes', label: 'Mês completo' },
        { value: 'periodo', label: 'Data específica' }
      ]}
      class_name="w-full"
      on:change={handlePeriodoChange}
    />

    {#if filtroPeriodoModo === 'mes'}
      <FieldInput
        id="vendas-mes"
        label="Mês"
        type="month"
        bind:value={mesSelecionado}
        class_name="w-full"
        on:change={handlePeriodoChange}
      />
    {:else}
      <FieldInput
        id="vendas-inicio"
        label="Data início"
        type="date"
        bind:value={periodoInicio}
        class_name="w-full"
        on:change={handlePeriodoChange}
      />
      <FieldInput
        id="vendas-fim"
        label="Data fim"
        type="date"
        bind:value={periodoFim}
        class_name="w-full"
        on:change={handlePeriodoChange}
      />
    {/if}
  </div>
</div>

<DataTable
  {columns}
  data={vendas}
  color="vendas"
  {loading}
  title="Lista de Vendas"
  {filters}
  serverSide={true}
  totalItems={totalVendas}
  page={listPage}
  pageSize={listPageSize}
  searchable={true}
  filterable={true}
  exportable={true}
  extraSearchKeys={['_recibos_busca']}
  onSearch={handleSearch}
  onFilterChange={handleFilterChange}
  onPageChange={handlePageChange}
  onPageSizeChange={handlePageSizeChange}
  onRowClick={handleRowClick}
  onExport={handleExport}
  emptyMessage="Nenhuma venda encontrada para o escopo atual"
/>
