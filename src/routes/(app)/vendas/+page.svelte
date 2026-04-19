<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import { Plus, FileSpreadsheet, ShoppingCart, DollarSign, Calendar } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';

  interface Venda {
    id: string;
    codigo: string;
    cliente: string;
    cliente_id: string;
    destino: string;
    data_venda: string | null;
    data_embarque: string | null;
    valor_total: number;
    comissao: number;
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
      formatter: (value: number) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value)
    },
    {
      key: 'comissao',
      label: 'Taxas',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value)
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
      const payload = await apiGet('/api/v1/vendas/list', {
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
    {
      key: 'vendedor',
      label: 'Vendedor',
      type: 'select',
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
  ];

  function handleRowClick(row: Venda) {
    goto(`/vendas/${row.id}`);
  }

  function handleExport() {
    toast.info('A exportação sera ligada na proxima etapa. Os dados reais ja estao conectados.');
  }

  function getResumoVendas() {
    const total = vendas.reduce((acc, venda) => acc + venda.valor_total, 0);
    const taxas = vendas.reduce((acc, venda) => acc + venda.comissao, 0);
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

<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">
      <ShoppingCart size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total de Vendas</p>
      <p class="text-2xl font-bold text-slate-900">{vendas.length}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-emerald-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
      <DollarSign size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Valor Total</p>
      <p class="text-2xl font-bold text-slate-900">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumo.total)}
      </p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
      <Calendar size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Confirmadas</p>
      <p class="text-2xl font-bold text-slate-900">{resumo.confirmadas}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
      <Calendar size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Pendentes</p>
      <p class="text-2xl font-bold text-slate-900">{resumo.pendentes}</p>
    </div>
  </div>
</div>

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
