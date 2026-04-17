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
  import { Plus, Pencil, Trash2, RefreshCw, AlertCircle, CheckCircle, Clock, Search } from 'lucide-svelte';

  type SacRegistro = {
    id: string;
    recibo: string | null;
    tour: string | null;
    data_solicitacao: string | null;
    motivo: string | null;
    contratante_pax: string | null;
    ok_quando: string | null;
    status: string | null;
    responsavel: string | null;
    prazo: string | null;
    created_at: string;
  };

  const STATUS_OPCOES = [
    { value: 'aberto', label: 'Aberto' },
    { value: 'em_andamento', label: 'Em andamento' },
    { value: 'concluido', label: 'Concluído' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  let registros: SacRegistro[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;
  let statusFiltro = 'all';
  let busca = '';

  let form = createForm();

  function createForm() {
    return {
      recibo: '',
      tour: '',
      data_solicitacao: new Date().toISOString().slice(0, 10),
      motivo: '',
      contratante_pax: '',
      ok_quando: '',
      status: 'aberto',
      responsavel: '',
      prazo: ''
    };
  }

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('controle_sac', 'edit') || permissoes.can('operacao', 'edit');
  $: canDelete = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('controle_sac', 'delete') || permissoes.can('operacao', 'delete');

  function getStatusBadge(status: string | null) {
    const styles: Record<string, string> = {
      aberto: 'bg-red-100 text-red-700',
      em_andamento: 'bg-amber-100 text-amber-700',
      concluido: 'bg-green-100 text-green-700',
      cancelado: 'bg-slate-100 text-slate-600'
    };
    const labels: Record<string, string> = {
      aberto: 'Aberto',
      em_andamento: 'Em andamento',
      concluido: 'Concluído',
      cancelado: 'Cancelado'
    };
    const s = status || 'aberto';
    return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[s] || 'bg-slate-100 text-slate-600'}">${labels[s] || s}</span>`;
  }

  const columns = [
    {
      key: 'recibo',
      label: 'Recibo',
      sortable: true,
      width: '130px',
      formatter: (v: string | null) => v || '-'
    },
    {
      key: 'tour',
      label: 'Tour',
      sortable: true,
      formatter: (v: string | null) => v || '-'
    },
    {
      key: 'contratante_pax',
      label: 'Contratante/Pax',
      sortable: true,
      formatter: (v: string | null) => v || '-'
    },
    {
      key: 'motivo',
      label: 'Motivo',
      sortable: true,
      formatter: (v: string | null) => v ? `<span title="${v}">${v.length > 40 ? v.slice(0, 40) + '...' : v}</span>` : '-'
    },
    {
      key: 'data_solicitacao',
      label: 'Solicitação',
      sortable: true,
      width: '120px',
      formatter: (v: string | null) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'prazo',
      label: 'Prazo',
      sortable: true,
      width: '110px',
      formatter: (v: string | null) => {
        if (!v) return '-';
        const d = new Date(v + 'T00:00:00');
        const hoje = new Date();
        const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const label = d.toLocaleDateString('pt-BR');
        if (diff < 0) return `<span class="text-red-600 font-medium">${label}</span>`;
        if (diff <= 3) return `<span class="text-amber-600 font-medium">${label}</span>`;
        return label;
      }
    },
    {
      key: 'responsavel',
      label: 'Responsável',
      sortable: true,
      formatter: (v: string | null) => v || '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '130px',
      formatter: (v: string | null) => getStatusBadge(v)
    }
  ];

  async function load() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (statusFiltro !== 'all') params.set('status', statusFiltro);
      if (busca.trim()) params.set('q', busca.trim());

      const response = await fetch(`/api/v1/operacao/sac?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      registros = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar registros SAC.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = createForm();
    modalOpen = true;
  }

  function openEdit(registro: SacRegistro) {
    editingId = registro.id;
    form = {
      recibo: registro.recibo || '',
      tour: registro.tour || '',
      data_solicitacao: registro.data_solicitacao || new Date().toISOString().slice(0, 10),
      motivo: registro.motivo || '',
      contratante_pax: registro.contratante_pax || '',
      ok_quando: registro.ok_quando || '',
      status: registro.status || 'aberto',
      responsavel: registro.responsavel || '',
      prazo: registro.prazo || ''
    };
    modalOpen = true;
  }

  async function save() {
    saving = true;
    try {
      const response = await fetch('/api/v1/operacao/sac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId || undefined, ...form })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'Registro atualizado.' : 'Registro criado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  async function deleteRegistro(id: string) {
    if (!confirm('Deseja excluir este registro SAC?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/operacao/sac?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Registro excluído.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      deletingId = '';
    }
  }

  onMount(load);

  $: abertos = registros.filter((r) => r.status === 'aberto').length;
  $: emAndamento = registros.filter((r) => r.status === 'em_andamento').length;
  $: concluidos = registros.filter((r) => r.status === 'concluido').length;
</script>

<svelte:head>
  <title>Controle SAC | VTUR</title>
</svelte:head>

<PageHeader
  title="Controle SAC"
  subtitle="Gerencie solicitações de atendimento ao cliente e acompanhe o status de cada caso."
  color="operacao"
  breadcrumbs={[
    { label: 'Operação', href: '/operacao' },
    { label: 'Controle SAC' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    ...(canEdit ? [{ label: 'Novo Registro', onClick: openNew, variant: 'primary' as const, icon: Plus }] : [])
  ]}
/>

<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
  <KPICard title="Abertos" value={abertos} color="operacao" icon={AlertCircle} />
  <KPICard title="Em andamento" value={emAndamento} color="operacao" icon={Clock} />
  <KPICard title="Concluídos" value={concluidos} color="operacao" icon={CheckCircle} />
</div>

<Card color="operacao" class="mb-6">
  <div class="flex flex-wrap gap-4 items-end">
    <div class="relative flex-1 min-w-[200px]">
      <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input bind:value={busca} class="vtur-input w-full pl-9" placeholder="Buscar por recibo, tour, motivo..." />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="sac-status">Status</label>
      <select id="sac-status" bind:value={statusFiltro} class="vtur-input">
        <option value="all">Todos</option>
        {#each STATUS_OPCOES as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <Button variant="primary" size="sm" on:click={load}>Filtrar</Button>
  </div>
</Card>

<DataTable
  {columns}
  data={registros}
  color="operacao"
  {loading}
  title="Registros SAC"
  searchable={false}
  emptyMessage="Nenhum registro SAC encontrado"
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
          on:click|stopPropagation={() => deleteRegistro(row.id)}
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
  title={editingId ? 'Editar Registro SAC' : 'Novo Registro SAC'}
  color="operacao"
  size="lg"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText={editingId ? 'Salvar' : 'Criar'}
  loading={saving}
  onConfirm={save}
  onCancel={() => (modalOpen = false)}
>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="sac-recibo">Recibo</label>
      <input id="sac-recibo" bind:value={form.recibo} class="vtur-input w-full" placeholder="Número do recibo" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="sac-tour">Tour</label>
      <input id="sac-tour" bind:value={form.tour} class="vtur-input w-full" placeholder="Nome do tour" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="sac-contratante">Contratante/Pax</label>
      <input id="sac-contratante" bind:value={form.contratante_pax} class="vtur-input w-full" placeholder="Nome do contratante ou passageiro" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="sac-data">Data da Solicitação</label>
      <input id="sac-data" type="date" bind:value={form.data_solicitacao} class="vtur-input w-full" />
    </div>
    <div class="md:col-span-2">
      <label class="mb-1 block text-sm font-medium text-slate-700" for="sac-motivo">Motivo</label>
      <textarea id="sac-motivo" bind:value={form.motivo} rows="3" class="vtur-input w-full" placeholder="Descreva o motivo da solicitação"></textarea>
    </div>
    <div class="md:col-span-2">
      <label class="mb-1 block text-sm font-medium text-slate-700" for="sac-ok-quando">OK quando</label>
      <input id="sac-ok-quando" bind:value={form.ok_quando} class="vtur-input w-full" placeholder="Condição para encerramento" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="sac-responsavel">Responsável</label>
      <input id="sac-responsavel" bind:value={form.responsavel} class="vtur-input w-full" placeholder="Nome do responsável" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="sac-prazo">Prazo</label>
      <input id="sac-prazo" type="date" bind:value={form.prazo} class="vtur-input w-full" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="sac-status-form">Status</label>
      <select id="sac-status-form" bind:value={form.status} class="vtur-input w-full">
        {#each STATUS_OPCOES as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
  </div>
</Dialog>
