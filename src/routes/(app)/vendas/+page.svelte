<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import { Plus, FileSpreadsheet, ShoppingCart, DollarSign, Calendar } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';
  import { permissoes } from '$lib/stores/permissoes';

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

  let vendas: Venda[] = [];
  let loading = true;
  let errorMessage: string | null = null;
  let filters: Array<{
    key: string;
    label: string;
    type: 'select';
    options: Array<{ value: string; label: string }>;
  }> = [];

  const columns = [
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
      key: 'destino',
      label: 'Destino',
      sortable: true
    },
    {
      key: 'data_embarque',
      label: 'Embarque',
      sortable: true,
      width: '120px',
      formatter: (value: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '-')
    },
    {
      key: 'valor_total',
      label: 'Valor Total',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number | null | undefined) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(Number(value) || 0)
    },
    {
      key: 'valor_taxas',
      label: 'Taxas',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number | null | undefined) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(Number(value) || 0)
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

  async function loadVendas() {
    loading = true;
    errorMessage = null;

    try {
      const payload: any = await apiGet('/api/v1/vendas/list', {
        all: 1,
        include_kpis: 1
      });

      vendas = Array.isArray(payload?.items) ? payload.items : [];
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao carregar vendas.';
      vendas = [];
      toast.error(errorMessage);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadVendas();
  });

  $: showVendedorFilter = !$permissoes.ready || (!$permissoes.isVendedor && !$permissoes.usoIndividual);

  $: filters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'confirmada', label: 'Confirmada' },
        { value: 'pendente', label: 'Pendente' },
        { value: 'cancelada', label: 'Cancelada' },
        { value: 'concluida', label: 'Concluída' }
      ]
    },
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { value: 'pacote', label: 'Pacote' },
        { value: 'hotel', label: 'Hotel' },
        { value: 'passagem', label: 'Passagem' },
        { value: 'servico', label: 'Serviço' }
      ]
    },
    ...(showVendedorFilter
      ? [
          {
            key: 'vendedor',
            label: 'Vendedor',
            type: 'select' as const,
            options: Array.from(
              new Set(
                vendas
                  .map((venda) => String(venda.vendedor || '').trim())
                  .filter(Boolean)
              )
            )
              .sort((left, right) => left.localeCompare(right, 'pt-BR'))
              .map((vendedor) => ({ value: vendedor, label: vendedor }))
          }
        ]
      : [])
  ];

  function handleRowClick(row: Venda) {
    goto(`/vendas/${row.id}`);
  }

  function handleExport() {
    toast.info('A exportação sera ligada na proxima etapa. Os dados reais ja estao conectados.');
  }

  function getResumoVendas() {
    const total = vendas.reduce((acc, venda) => acc + Number(venda.valor_total || 0), 0);
    const taxas = vendas.reduce((acc, venda) => acc + Number(venda.valor_taxas || 0), 0);
    const confirmadas = vendas.filter((venda) => venda.status === 'confirmada').length;
    const pendentes = vendas.filter((venda) => venda.status === 'pendente').length;

    return { total, taxas, confirmadas, pendentes };
  }

  $: resumo = getResumoVendas();
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
      label: 'Nova Venda',
      href: '/vendas/nova',
      variant: 'primary',
      icon: Plus
    },
    {
      label: 'Importar',
      href: '/vendas/importar',
      variant: 'secondary',
      icon: FileSpreadsheet
    }
  ]}
/>

{#if errorMessage}
  <div class="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {errorMessage}
  </div>
{/if}

<KPIGrid className="mb-6" columns={4}>
  <KPICard title="Total de vendas" value={vendas.length} color="vendas" icon={ShoppingCart} />
  <KPICard title="Valor total" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumo.total)} color="vendas" icon={DollarSign} />
  <KPICard title="Confirmadas" value={resumo.confirmadas} color="clientes" icon={Calendar} />
  <KPICard title="Pendentes" value={resumo.pendentes} color="financeiro" icon={Calendar} />
</KPIGrid>

<DataTable
  {columns}
  data={vendas}
  color="vendas"
  {loading}
  title="Lista de Vendas"
  {filters}
  searchable={true}
  filterable={true}
  exportable={true}
  onRowClick={handleRowClick}
  onExport={handleExport}
  emptyMessage="Nenhuma venda encontrada para o escopo atual"
/>
