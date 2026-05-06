<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import ModalAvisoCliente from '$lib/components/modais/ModalAvisoCliente.svelte';
  import { apiGet } from '$lib/services/api';
  import { toast } from '$lib/stores/ui';
  import { monthRangeFromKey, todayISODateLocal } from '$lib/date';
  import { formatDate } from '$lib/utils/formatters';
  import { MessageCircle, RefreshCw } from 'lucide-svelte';

  type Compra = {
    id: string;
    cliente_id: string | null;
    cliente_nome: string;
    cliente_email: string | null;
    cliente_telefone: string | null;
    cliente_whatsapp: string | null;
    cliente_nascimento: string | null;
    vendedor_nome: string;
    data_compra: string | null;
    data_saida: string | null;
    destino: string;
    valor: number;
  };

  type BaseOption = { id: string; nome: string };

  const currentMonth = todayISODateLocal().slice(0, 7);
  let loading = true;
  let compras: Compra[] = [];
  let total = 0;
  let periodoModo: 'mes' | 'periodo' = 'mes';
  let mes = currentMonth;
  let inicio = monthRangeFromKey(currentMonth)?.inicio || `${currentMonth}-01`;
  let fim = monthRangeFromKey(currentMonth)?.fim || todayISODateLocal();
  let empresaId = '';
  let vendedorId = '';
  let empresas: BaseOption[] = [];
  let vendedores: BaseOption[] = [];
  let avisoOpen = false;
  let selectedCompra: Compra | null = null;

  $: if (periodoModo === 'mes') {
    const range = monthRangeFromKey(mes);
    if (range) {
      inicio = range.inicio;
      fim = range.fim;
    }
  }

  const columns = [
    { key: 'cliente_nome', label: 'Cliente', sortable: true },
    { key: 'data_compra', label: 'Compra', sortable: true, formatter: (value: string | null) => formatDate(value) },
    { key: 'data_saida', label: 'Saída', sortable: true, formatter: (value: string | null) => formatDate(value) },
    { key: 'destino', label: 'Destino', sortable: true },
    { key: 'vendedor_nome', label: 'Vendedor', sortable: true },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    }
  ];

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  async function loadBase() {
    try {
      const data = await apiGet<{ empresas?: BaseOption[]; vendedores?: BaseOption[] }>('/api/v1/dashboard/base', {
        empresa_id: empresaId || undefined
      });
      empresas = data.empresas || [];
      vendedores = data.vendedores || [];
      if (vendedorId && !vendedores.some((item) => item.id === vendedorId)) vendedorId = '';
    } catch {
      empresas = [];
      vendedores = [];
    }
  }

  async function loadCompras() {
    loading = true;
    try {
      const payload = await apiGet<{ ultimasCompras?: Compra[]; total?: number }>('/api/v1/dashboard/ultimas-compras', {
        inicio,
        fim,
        company_id: empresaId || undefined,
        vendedor_ids: vendedorId || undefined,
        limit: 100
      });
      compras = payload.ultimasCompras || [];
      total = Number(payload.total || compras.length || 0);
    } catch (err) {
      compras = [];
      total = 0;
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar últimas compras.');
    } finally {
      loading = false;
    }
  }

  async function handleEmpresaChange() {
    vendedorId = '';
    await loadBase();
    await loadCompras();
  }

  function abrirAviso(compra: Compra) {
    if (!compra.cliente_id) {
      toast.error('Compra sem cliente vinculado.');
      return;
    }
    selectedCompra = compra;
    avisoOpen = true;
  }

  onMount(async () => {
    await loadBase();
    await loadCompras();
  });
</script>

<svelte:head>
  <title>Últimas Compras | VTUR</title>
</svelte:head>

<PageHeader
  title="Últimas Compras"
  subtitle="Acompanhe compras recentes e acione o cliente para agradecer a compra."
  color="operacao"
  breadcrumbs={[{ label: 'Operação' }, { label: 'Últimas Compras' }]}
  actions={[{ label: 'Atualizar', onClick: loadCompras, variant: 'secondary', icon: RefreshCw }]}
/>

<Card color="operacao" class="mb-6">
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <FieldSelect
      id="ultimas-compras-periodo"
      label="Período"
      bind:value={periodoModo}
      options={[{ value: 'mes', label: 'Mês completo' }, { value: 'periodo', label: 'Data específica' }]}
      class_name="w-full"
    />
    {#if periodoModo === 'mes'}
      <FieldInput id="ultimas-compras-mes" label="Mês" type="month" bind:value={mes} class_name="w-full" on:change={loadCompras} />
    {:else}
      <FieldInput id="ultimas-compras-inicio" label="Data início" type="date" bind:value={inicio} class_name="w-full" on:change={loadCompras} />
      <FieldInput id="ultimas-compras-fim" label="Data fim" type="date" bind:value={fim} class_name="w-full" on:change={loadCompras} />
    {/if}
    {#if empresas.length > 1}
      <FieldSelect
        id="ultimas-compras-empresa"
        label="Empresa"
        bind:value={empresaId}
        options={[{ value: '', label: 'Todas' }, ...empresas.map((item) => ({ value: item.id, label: item.nome }))]}
        class_name="w-full"
        on:change={handleEmpresaChange}
      />
    {/if}
    {#if vendedores.length > 0}
      <FieldSelect
        id="ultimas-compras-vendedor"
        label="Vendedor"
        bind:value={vendedorId}
        options={[{ value: '', label: 'Todos' }, ...vendedores.map((item) => ({ value: item.id, label: item.nome }))]}
        class_name="w-full"
        on:change={loadCompras}
      />
    {/if}
  </div>
</Card>

<DataTable
  {columns}
  data={compras}
  color="operacao"
  {loading}
  title={`Últimas compras - ${total} registro(s)`}
  searchable={true}
  filterable={false}
  exportable={false}
  emptyMessage="Nenhuma compra encontrada para o período."
>
  <svelte:fragment slot="actions" let:row>
    <Button variant="secondary" size="sm" color="clientes" on:click={() => abrirAviso(row)}>
      <MessageCircle size={16} class="mr-1" />
      Agradecer
    </Button>
  </svelte:fragment>
</DataTable>

{#if selectedCompra}
  <ModalAvisoCliente
    bind:open={avisoOpen}
    clienteId={selectedCompra.cliente_id || ''}
    clienteNome={selectedCompra.cliente_nome}
    clienteTelefone={selectedCompra.cliente_whatsapp || selectedCompra.cliente_telefone || ''}
    clienteEmail={selectedCompra.cliente_email || ''}
    clienteNascimento={selectedCompra.cliente_nascimento}
    initialTema="ultimas_compras"
    onClose={() => {
      avisoOpen = false;
      selectedCompra = null;
    }}
  />
{/if}
