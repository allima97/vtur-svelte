<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { Plus, Target, Trash2, Pencil, RefreshCw } from 'lucide-svelte';

  type Meta = {
    id: string;
    vendedor_id: string;
    periodo: string;
    meta_geral: number;
    meta_diferenciada: number;
    ativo: boolean;
    scope: string | null;
    vendedor?: { nome_completo?: string | null } | null;
  };

  type Vendedor = { id: string; nome_completo: string | null };

  let metas: Meta[] = [];
  let vendedores: Vendedor[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;

  let form = createForm();

  function createForm() {
    const now = new Date();
    return {
      vendedor_id: '',
      periodo: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      meta_geral: '',
      meta_diferenciada: '',
      ativo: true
    };
  }

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('metas', 'edit') || permissoes.can('parametros', 'edit');
  $: canDelete = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('metas', 'delete') || permissoes.can('parametros', 'delete');

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  function formatPeriodo(value: string) {
    if (!value) return '-';
    const [year, month] = value.split('-');
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  const columns = [
    {
      key: 'vendedor',
      label: 'Vendedor',
      sortable: true,
      formatter: (_: any, row: Meta) => String(row.vendedor?.nome_completo || 'Vendedor')
    },
    {
      key: 'periodo',
      label: 'Período',
      sortable: true,
      formatter: (value: string) => formatPeriodo(value)
    },
    {
      key: 'meta_geral',
      label: 'Meta Geral',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'meta_diferenciada',
      label: 'Meta Diferenciada',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => value ? formatCurrency(value) : '-'
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      width: '100px',
      formatter: (value: boolean) =>
        value
          ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Ativa</span>'
          : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inativa</span>'
    }
  ];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/parametros/metas');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      metas = payload.items || [];
      vendedores = payload.vendedores || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar metas.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = createForm();
    if (vendedores.length === 1) form.vendedor_id = vendedores[0].id;
    modalOpen = true;
  }

  function openEdit(meta: Meta) {
    editingId = meta.id;
    form = {
      vendedor_id: meta.vendedor_id,
      periodo: meta.periodo.slice(0, 7),
      meta_geral: String(meta.meta_geral || ''),
      meta_diferenciada: String(meta.meta_diferenciada || ''),
      ativo: meta.ativo
    };
    modalOpen = true;
  }

  async function save() {
    if (!form.vendedor_id) { toast.error('Selecione o vendedor.'); return; }
    if (!form.periodo) { toast.error('Informe o período.'); return; }
    if (!form.meta_geral) { toast.error('Informe a meta geral.'); return; }

    saving = true;
    try {
      const response = await fetch('/api/v1/parametros/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          vendedor_id: form.vendedor_id,
          periodo: form.periodo,
          meta_geral: Number(String(form.meta_geral).replace(',', '.')),
          meta_diferenciada: Number(String(form.meta_diferenciada || '0').replace(',', '.')),
          ativo: form.ativo
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'Meta atualizada.' : 'Meta criada.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar meta.');
    } finally {
      saving = false;
    }
  }

  async function deleteMeta(id: string) {
    if (!confirm('Deseja excluir esta meta?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/parametros/metas?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Meta excluída.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir meta.');
    } finally {
      deletingId = '';
    }
  }

  onMount(load);

  $: totalMetas = metas.reduce((acc, m) => acc + Number(m.meta_geral || 0), 0);
  $: metasAtivas = metas.filter((m) => m.ativo).length;

  function buildMonthOptions() {
    const items: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = -12; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      items.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return items;
  }

  const monthOptions = buildMonthOptions();
</script>

<svelte:head>
  <title>Metas | VTUR</title>
</svelte:head>

<PageHeader
  title="Metas de Vendedores"
  subtitle="Defina e acompanhe as metas mensais por vendedor."
  color="financeiro"
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'Metas' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    ...(canEdit ? [{ label: 'Nova Meta', onClick: openNew, variant: 'primary' as const, icon: Plus }] : [])
  ]}
/>

<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
      <Target size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total de metas</p>
      <p class="text-2xl font-bold text-slate-900">{metas.length}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
      <Target size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Metas ativas</p>
      <p class="text-2xl font-bold text-slate-900">{metasAtivas}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
      <Target size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Volume total</p>
      <p class="text-2xl font-bold text-slate-900">{formatCurrency(totalMetas)}</p>
    </div>
  </div>
</div>

<DataTable
  {columns}
  data={metas}
  color="financeiro"
  {loading}
  title="Metas cadastradas"
  searchable={true}
  emptyMessage="Nenhuma meta cadastrada"
>
  <svelte:fragment slot="row-actions" let:row>
    <div class="flex items-center gap-1">
      {#if canEdit}
        <button
          on:click|stopPropagation={() => openEdit(row)}
          class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="Editar"
        >
          <Pencil size={15} />
        </button>
      {/if}
      {#if canDelete}
        <button
          on:click|stopPropagation={() => deleteMeta(row.id)}
          class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Excluir"
          disabled={deletingId === row.id}
        >
          <Trash2 size={15} />
        </button>
      {/if}
    </div>
  </svelte:fragment>
</DataTable>

<Dialog
  bind:open={modalOpen}
  title={editingId ? 'Editar Meta' : 'Nova Meta'}
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
    {#if vendedores.length > 0}
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="meta-vendedor">Vendedor *</label>
        <select id="meta-vendedor" bind:value={form.vendedor_id} class="vtur-input w-full">
          <option value="">Selecione...</option>
          {#each vendedores as v}
            <option value={v.id}>{v.nome_completo || 'Vendedor'}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="meta-periodo">Período *</label>
      <select id="meta-periodo" bind:value={form.periodo} class="vtur-input w-full">
        {#each monthOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="meta-geral">Meta Geral (R$) *</label>
      <input id="meta-geral" type="number" step="0.01" min="0" bind:value={form.meta_geral} class="vtur-input w-full" placeholder="0,00" />
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="meta-diferenciada">Meta Diferenciada (R$)</label>
      <input id="meta-diferenciada" type="number" step="0.01" min="0" bind:value={form.meta_diferenciada} class="vtur-input w-full" placeholder="0,00" />
      <p class="mt-1 text-xs text-slate-500">Opcional. Meta específica por produto diferenciado.</p>
    </div>

    <div>
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" bind:checked={form.ativo} class="rounded border-slate-300" />
        Meta ativa
      </label>
    </div>
  </div>
</Dialog>
