<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { Plus, Route, MapPin, Calendar, DollarSign, Loader2, Search, Trash2 } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface Circuito {
    id: string;
    codigo: string;
    nome: string;
    tipo: 'nacional' | 'internacional';
    dias: number;
    noites: number;
    destinos: string[];
    destinos_str: string;
    preco_base: number;
    vagas?: number;
    guia?: boolean;
    ativo: boolean;
    saidas?: string;
    descricao?: string;
    created_at: string;
  }

  let circuitos: Circuito[] = [];
  let loading = true;
  let showDeleteDialog = false;
  let circuitoToDelete: Circuito | null = null;
  let filtroTipo = '';
  let filtroDias = '';
  let filtroStatus = '';
  let searchQuery = '';

  const columns = [
    { key: 'codigo', label: 'Código', sortable: true, width: '90px' },
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'tipo', label: 'Tipo', sortable: true, width: '110px', formatter: (v: string) => getTipoBadge(v) },
    { key: 'dias', label: 'Duração', sortable: true, width: '100px', formatter: (v: number, row: Circuito) => `${v}d/${row.noites}n` },
    { key: 'destinos_str', label: 'Destinos', sortable: false },
    { key: 'preco_base', label: 'Preço', sortable: true, align: 'right' as const, width: '110px', formatter: (v: number) => formatCurrency(v) },
    { key: 'ativo', label: 'Status', sortable: true, width: '90px', formatter: (v: boolean) => getStatusBadge(v) }
  ];

  onMount(async () => {
    await carregarCircuitos();
  });

  async function carregarCircuitos() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (filtroTipo) params.append('tipo', filtroTipo);
      if (filtroStatus) params.append('ativo', filtroStatus === 'ativo' ? 'true' : 'false');

      const response = await fetch(`/api/v1/circuitos?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        circuitos = (data.items || []).map((c: any) => ({
          ...c,
          destinos: c.destinos || [],
          destinos_str: Array.isArray(c.destinos) ? c.destinos.join(', ') : c.destinos || ''
        }));
      } else {
        toast.error('Erro ao carregar circuitos');
      }
    } catch (err) {
      console.error('Erro ao carregar circuitos:', err);
      toast.error('Erro ao carregar circuitos');
    } finally {
      loading = false;
    }
  }

  function getTipoBadge(tipo: string): string {
    if (tipo === 'nacional') {
      return `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"><span class="w-2 h-2 rounded-full bg-green-500"></span>Nacional</span>`;
    }
    return `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"><span class="w-2 h-2 rounded-full bg-blue-500"></span>Internacional</span>`;
  }

  function getStatusBadge(ativo: boolean): string {
    if (ativo) {
      return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Ativo</span>`;
    }
    return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-200 text-slate-600">Inativo</span>`;
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);
  }

  async function confirmDelete() {
    if (!circuitoToDelete) return;
    
    try {
      const response = await fetch(`/api/v1/circuitos/${circuitoToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast.success('Circuito excluído com sucesso!');
      await carregarCircuitos();
    } catch (err) {
      toast.error('Erro ao excluir circuito');
    } finally {
      showDeleteDialog = false;
      circuitoToDelete = null;
    }
  }

  $: filteredCircuitos = circuitos.filter(c => {
    if (filtroDias === 'curto' && c.dias > 5) return false;
    if (filtroDias === 'medio' && (c.dias <= 5 || c.dias > 10)) return false;
    if (filtroDias === 'longo' && c.dias <= 10) return false;
    if (searchQuery && !c.nome.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !c.codigo.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  $: stats = {
    total: circuitos.length,
    ativos: circuitos.filter(c => c.ativo).length,
    nacionais: circuitos.filter(c => c.tipo === 'nacional').length,
    internacionais: circuitos.filter(c => c.tipo === 'internacional').length,
    precoMedio: circuitos.length > 0 ? circuitos.reduce((acc, c) => acc + (c.preco_base || 0), 0) / circuitos.length : 0
  };
</script>

<svelte:head>
  <title>Circuitos | VTUR</title>
</svelte:head>

<PageHeader 
  title="Circuitos"
  subtitle="Gerenciamento de roteiros e pacotes combinados"
  color="financeiro"
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: 'Circuitos' }
  ]}
  actions={[
    { label: 'Novo Circuito', onClick: () => goto('/cadastros/circuitos/novo'), variant: 'primary', icon: Plus }
  ]}
/>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <Loader2 size={48} class="animate-spin text-financeiro-600" />
    <span class="ml-3 text-slate-600">Carregando circuitos...</span>
  </div>
{:else}
  <!-- Stats -->
  <div class="vtur-kpi-grid-5 mb-6">
    <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
        <Route size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Total</p>
        <p class="text-2xl font-bold text-slate-900">{stats.total}</p>
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">
        <Calendar size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Ativos</p>
        <p class="text-2xl font-bold text-slate-900">{stats.ativos}</p>
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
        <MapPin size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Nacionais</p>
        <p class="text-2xl font-bold text-slate-900">{stats.nacionais}</p>
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
        <MapPin size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Internacionais</p>
        <p class="text-2xl font-bold text-slate-900">{stats.internacionais}</p>
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
        <DollarSign size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Preço Médio</p>
        <p class="text-2xl font-bold text-slate-900">{formatCurrency(stats.precoMedio)}</p>
      </div>
    </div>
  </div>

  <!-- Filtros -->
  <Card color="financeiro" class="mb-6">
    <div class="flex flex-col lg:flex-row gap-4 items-end">
      <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="relative">
          <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Nome ou código..." 
            bind:value={searchQuery}
            class="vtur-input pl-10 w-full" 
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
          <select bind:value={filtroTipo} on:change={carregarCircuitos} class="vtur-input w-full">
            <option value="">Todos</option>
            <option value="nacional">Nacional</option>
            <option value="internacional">Internacional</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Duração</label>
          <select bind:value={filtroDias} class="vtur-input w-full">
            <option value="">Todas</option>
            <option value="curto">Curto (até 5 dias)</option>
            <option value="medio">Médio (6-10 dias)</option>
            <option value="longo">Longo (11+ dias)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select bind:value={filtroStatus} on:change={carregarCircuitos} class="vtur-input w-full">
            <option value="">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>
    </div>
  </Card>

  <!-- Tabela -->
  <DataTable
    {columns}
    data={filteredCircuitos}
    color="financeiro"
    {loading}
    title="Lista de Circuitos"
    searchable={true}
    onRowClick={(row) => goto(`/cadastros/circuitos/${row.id}/editar`)}
    emptyMessage="Nenhum circuito encontrado"
  >
    <svelte:fragment slot="row-actions" let:row>
      <button on:click|stopPropagation={() => { circuitoToDelete = row; showDeleteDialog = true; }} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
    </svelte:fragment>
  </DataTable>
{/if}

<!-- Dialog de confirmação -->
<Dialog 
  bind:open={showDeleteDialog} 
  title="Confirmar Exclusão"
  size="sm"
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText="Excluir"
  onConfirm={confirmDelete}
  onCancel={() => showDeleteDialog = false}
>
  <p class="text-slate-600">
    Tem certeza que deseja excluir o circuito <strong>{circuitoToDelete?.nome}</strong>?
    Esta ação não pode ser desfeita.
  </p>
</Dialog>
