<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { RefreshCw, Search, Pencil } from 'lucide-svelte';

  type AjusteItem = {
    id: string;
    recibo_origem_id: string;
    venda_id: string;
    numero_recibo: string;
    data_venda: string | null;
    valor_total: number;
    valor_taxas: number;
    vendedor_origem_id: string;
    vendedor_origem_nome: string;
    cliente_nome: string;
    produto_nome: string;
    rateio: {
      id: string;
      ativo: boolean;
      vendedor_destino_id: string;
      percentual_origem: number;
      percentual_destino: number;
      observacao: string | null;
      vendedor_destino?: { nome_completo?: string | null } | null;
    } | null;
  };

  type Vendedor = { id: string; nome_completo: string | null };

  let items: AjusteItem[] = [];
  let vendedores: Vendedor[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let selectedItem: AjusteItem | null = null;

  let inicio = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  })();
  let fim = new Date().toISOString().slice(0, 10);
  let filtroVendedor = '';
  let busca = '';

  let form = { vendedor_destino_id: '', percentual_destino: '50', observacao: '' };

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || $permissoes.isMaster || $permissoes.isGestor;

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  const columns = [
    {
      key: 'numero_recibo',
      label: 'Recibo',
      sortable: true,
      width: '130px'
    },
    {
      key: 'cliente_nome',
      label: 'Cliente',
      sortable: true
    },
    {
      key: 'vendedor_origem_nome',
      label: 'Vendedor Origem',
      sortable: true,
      width: '160px'
    },
    {
      key: 'data_venda',
      label: 'Data Venda',
      sortable: true,
      width: '110px',
      formatter: (v: string | null) => v ? new Date(v).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'valor_total',
      label: 'Valor',
      sortable: true,
      align: 'right' as const,
      formatter: (v: number) => formatCurrency(v)
    },
    {
      key: 'rateio',
      label: 'Rateio',
      sortable: false,
      formatter: (_: any, row: AjusteItem) => {
        if (!row.rateio || !row.rateio.ativo) return '<span class="text-slate-400 text-xs">Sem rateio</span>';
        const nome = row.rateio.vendedor_destino?.nome_completo || 'Vendedor';
        return `<span class="text-xs">${nome} · ${row.rateio.percentual_destino}%</span>`;
      }
    }
  ];

  async function load() {
    loading = true;
    try {
      const params = new URLSearchParams({ inicio, fim });
      if (filtroVendedor) params.set('vendedor_id', filtroVendedor);
      if (busca.trim()) params.set('q', busca.trim());

      const response = await fetch(`/api/v1/financeiro/ajustes-vendas?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      items = payload.items || [];
      vendedores = payload.vendedores || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar ajustes.');
    } finally {
      loading = false;
    }
  }

  function openEdit(item: AjusteItem) {
    selectedItem = item;
    form = {
      vendedor_destino_id: item.rateio?.vendedor_destino_id || '',
      percentual_destino: String(item.rateio?.percentual_destino ?? 50),
      observacao: item.rateio?.observacao || ''
    };
    modalOpen = true;
  }

  async function save() {
    if (!selectedItem) return;
    if (!form.vendedor_destino_id) { toast.error('Selecione o vendedor destino.'); return; }

    saving = true;
    try {
      const response = await fetch('/api/v1/financeiro/ajustes-vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ajuste_id: selectedItem.id,
          vendedor_destino_id: form.vendedor_destino_id,
          percentual_destino: Number(form.percentual_destino),
          observacao: form.observacao
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Rateio salvo com sucesso.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar rateio.');
    } finally {
      saving = false;
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Ajustes de Vendas | VTUR</title>
</svelte:head>

<PageHeader
  title="Ajustes de Vendas"
  subtitle="Configure o rateio de comissões entre vendedores para recibos específicos."
  color="financeiro"
  breadcrumbs={[
    { label: 'Financeiro', href: '/financeiro' },
    { label: 'Ajustes de Vendas' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<Card color="financeiro" class="mb-6">
  <div class="flex flex-wrap gap-4 items-end">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="aj-inicio">Data início</label>
      <input id="aj-inicio" type="date" bind:value={inicio} class="vtur-input" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="aj-fim">Data fim</label>
      <input id="aj-fim" type="date" bind:value={fim} class="vtur-input" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="aj-vendedor">Vendedor</label>
      <select id="aj-vendedor" bind:value={filtroVendedor} class="vtur-input">
        <option value="">Todos</option>
        {#each vendedores as v}
          <option value={v.id}>{v.nome_completo || 'Vendedor'}</option>
        {/each}
      </select>
    </div>
    <div class="relative">
      <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input bind:value={busca} class="vtur-input pl-9" placeholder="Buscar..." />
    </div>
    <Button variant="primary" color="financeiro" on:click={load}>Filtrar</Button>
  </div>
</Card>

<DataTable
  {columns}
  data={items}
  color="financeiro"
  {loading}
  title="Recibos disponíveis para rateio"
  searchable={false}
  emptyMessage="Nenhum recibo encontrado para o período"
>
  <svelte:fragment slot="row-actions" let:row>
    {#if canEdit}
      <button
        on:click|stopPropagation={() => openEdit(row)}
        class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        title="Configurar rateio"
      >
        <Pencil size={15} />
      </button>
    {/if}
  </svelte:fragment>
</DataTable>

<Dialog
  bind:open={modalOpen}
  title="Configurar Rateio"
  color="financeiro"
  size="md"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText="Salvar Rateio"
  loading={saving}
  onConfirm={save}
  onCancel={() => (modalOpen = false)}
>
  {#if selectedItem}
    <div class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p class="font-semibold text-slate-900">{selectedItem.cliente_nome}</p>
        <p class="text-slate-600">Recibo: {selectedItem.numero_recibo} · {formatCurrency(selectedItem.valor_total)}</p>
        <p class="text-slate-500">Vendedor origem: {selectedItem.vendedor_origem_nome}</p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="rateio-destino">Vendedor destino *</label>
        <select id="rateio-destino" bind:value={form.vendedor_destino_id} class="vtur-input w-full">
          <option value="">Selecione...</option>
          {#each vendedores.filter((v) => v.id !== selectedItem?.vendedor_origem_id) as v}
            <option value={v.id}>{v.nome_completo || 'Vendedor'}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="rateio-pct">% para o vendedor destino</label>
        <input id="rateio-pct" type="number" min="1" max="99" step="1" bind:value={form.percentual_destino} class="vtur-input w-full" />
        <p class="mt-1 text-xs text-slate-500">
          Origem ficará com {100 - Number(form.percentual_destino || 0)}% e destino com {form.percentual_destino}%.
        </p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="rateio-obs">Observação</label>
        <input id="rateio-obs" bind:value={form.observacao} class="vtur-input w-full" placeholder="Motivo do rateio (opcional)" />
      </div>
    </div>
  {/if}
</Dialog>
