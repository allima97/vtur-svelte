<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { Plus, Pencil, Trash2, RefreshCw, DollarSign } from 'lucide-svelte';

  type Plano = {
    id: string;
    nome: string;
    descricao: string | null;
    valor_mensal: number;
    moeda: string;
    ativo: boolean;
  };

  let planos: Plano[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;

  let form = { nome: '', descricao: '', valor_mensal: '', moeda: 'BRL', ativo: true };

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'descricao', label: 'Descrição', sortable: false, formatter: (v: string | null) => v || '-' },
    {
      key: 'valor_mensal',
      label: 'Mensalidade',
      sortable: true,
      align: 'right' as const,
      formatter: (v: number, row: Plano) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: row.moeda || 'BRL' }).format(v || 0)
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      width: '90px',
      formatter: (v: boolean) =>
        v ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Ativo</span>'
          : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inativo</span>'
    }
  ];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/admin/planos');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      planos = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar planos.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = { nome: '', descricao: '', valor_mensal: '', moeda: 'BRL', ativo: true };
    modalOpen = true;
  }

  function openEdit(p: Plano) {
    editingId = p.id;
    form = { nome: p.nome, descricao: p.descricao || '', valor_mensal: String(p.valor_mensal || ''), moeda: p.moeda || 'BRL', ativo: p.ativo };
    modalOpen = true;
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }
    saving = true;
    try {
      const response = await fetch('/api/v1/admin/planos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          nome: form.nome,
          descricao: form.descricao || null,
          valor_mensal: Number(form.valor_mensal || 0),
          moeda: form.moeda,
          ativo: form.ativo
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'Plano atualizado.' : 'Plano criado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  async function deletePlano(id: string) {
    if (!confirm('Deseja excluir este plano?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/admin/planos?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Plano excluído.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      deletingId = '';
    }
  }

  onMount(load);

  $: totalMrr = planos.filter((p) => p.ativo).reduce((acc, p) => acc + p.valor_mensal, 0);
</script>

<svelte:head>
  <title>Planos | VTUR</title>
</svelte:head>

<PageHeader
  title="Planos de Assinatura"
  subtitle="Gerencie os planos disponíveis para as empresas clientes."
  breadcrumbs={[
    { label: 'Admin', href: '/admin' },
    { label: 'Planos' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    { label: 'Novo Plano', onClick: openNew, variant: 'primary', icon: Plus }
  ]}
/>

<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
      <DollarSign size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total de planos</p>
      <p class="text-2xl font-bold text-slate-900">{planos.length}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">
      <DollarSign size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Planos ativos</p>
      <p class="text-2xl font-bold text-slate-900">{planos.filter((p) => p.ativo).length}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
      <DollarSign size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">MRR potencial</p>
      <p class="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMrr)}</p>
    </div>
  </div>
</div>

<DataTable
  {columns}
  data={planos}
  color="financeiro"
  {loading}
  title="Planos cadastrados"
  searchable={true}
  emptyMessage="Nenhum plano cadastrado"
>
  <svelte:fragment slot="row-actions" let:row>
    <div class="flex items-center gap-1">
      <button on:click|stopPropagation={() => openEdit(row)} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Editar">
        <Pencil size={15} />
      </button>
      <button on:click|stopPropagation={() => deletePlano(row.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir" disabled={deletingId === row.id}>
        <Trash2 size={15} />
      </button>
    </div>
  </svelte:fragment>
</DataTable>

<Dialog
  bind:open={modalOpen}
  title={editingId ? 'Editar Plano' : 'Novo Plano'}
  color="financeiro"
  size="md"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText={editingId ? 'Salvar' : 'Criar'}
  loading={saving}
  onConfirm={save}
  onCancel={() => (modalOpen = false)}
>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="plano-nome">Nome *</label>
      <input id="plano-nome" bind:value={form.nome} class="vtur-input w-full" placeholder="Ex: Starter, Pro, Enterprise" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="plano-desc">Descrição</label>
      <textarea id="plano-desc" bind:value={form.descricao} rows="2" class="vtur-input w-full" placeholder="Descrição do plano..."></textarea>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="plano-valor">Mensalidade</label>
        <input id="plano-valor" type="number" step="0.01" min="0" bind:value={form.valor_mensal} class="vtur-input w-full" placeholder="0,00" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="plano-moeda">Moeda</label>
        <select id="plano-moeda" bind:value={form.moeda} class="vtur-input w-full">
          <option value="BRL">BRL (R$)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
        </select>
      </div>
    </div>
    <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input type="checkbox" bind:checked={form.ativo} class="rounded border-slate-300" />
      Plano ativo
    </label>
  </div>
</Dialog>
