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
  import { Plus, Pencil, Trash2, RefreshCw, Megaphone, ExternalLink } from 'lucide-svelte';

  type Campanha = {
    id: string;
    titulo: string;
    imagem_url: string | null;
    link_url: string | null;
    link_instagram: string | null;
    link_facebook: string | null;
    data_campanha: string;
    validade_ate: string | null;
    regras: string | null;
    status: 'ativa' | 'inativa' | 'cancelada';
    created_at: string;
  };

  let campanhas: Campanha[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;
  let filtroStatus = '';

  let form = createForm();

  function createForm() {
    return {
      titulo: '',
      imagem_url: '',
      link_url: '',
      link_instagram: '',
      link_facebook: '',
      data_campanha: new Date().toISOString().slice(0, 10),
      validade_ate: '',
      regras: '',
      status: 'ativa' as const
    };
  }

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || $permissoes.isMaster || $permissoes.isGestor;

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      ativa: 'bg-green-100 text-green-700',
      inativa: 'bg-slate-100 text-slate-600',
      cancelada: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = { ativa: 'Ativa', inativa: 'Inativa', cancelada: 'Cancelada' };
    return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-600'}">${labels[status] || status}</span>`;
  }

  const columns = [
    { key: 'titulo', label: 'Título', sortable: true },
    {
      key: 'data_campanha',
      label: 'Data',
      sortable: true,
      width: '110px',
      formatter: (v: string) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'validade_ate',
      label: 'Válida até',
      sortable: true,
      width: '110px',
      formatter: (v: string | null) => {
        if (!v) return '-';
        const d = new Date(v + 'T00:00:00');
        const hoje = new Date();
        const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const label = d.toLocaleDateString('pt-BR');
        if (diff < 0) return `<span class="text-red-600">${label}</span>`;
        if (diff <= 3) return `<span class="text-amber-600">${label}</span>`;
        return label;
      }
    },
    {
      key: 'link_url',
      label: 'Link',
      sortable: false,
      width: '80px',
      formatter: (v: string | null) =>
        v ? `<a href="${v}" target="_blank" class="text-financeiro-600 hover:underline text-xs">Abrir</a>` : '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '100px',
      formatter: (v: string) => getStatusBadge(v)
    }
  ];

  async function load() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set('status', filtroStatus);
      const response = await fetch(`/api/v1/operacao/campanhas?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      campanhas = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar campanhas.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = createForm();
    modalOpen = true;
  }

  function openEdit(c: Campanha) {
    editingId = c.id;
    form = {
      titulo: c.titulo,
      imagem_url: c.imagem_url || '',
      link_url: c.link_url || '',
      link_instagram: c.link_instagram || '',
      link_facebook: c.link_facebook || '',
      data_campanha: c.data_campanha,
      validade_ate: c.validade_ate || '',
      regras: c.regras || '',
      status: c.status
    };
    modalOpen = true;
  }

  async function save() {
    if (!form.titulo.trim()) { toast.error('Título obrigatório.'); return; }
    if (!form.data_campanha) { toast.error('Data obrigatória.'); return; }

    saving = true;
    try {
      const response = await fetch('/api/v1/operacao/campanhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId || undefined, ...form })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'Campanha atualizada.' : 'Campanha criada.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  async function deleteCampanha(id: string) {
    if (!confirm('Deseja excluir esta campanha?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/operacao/campanhas?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Campanha excluída.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      deletingId = '';
    }
  }

  onMount(load);

  $: ativas = campanhas.filter((c) => c.status === 'ativa').length;
  $: vencidas = campanhas.filter((c) => c.validade_ate && new Date(c.validade_ate + 'T00:00:00') < new Date()).length;
</script>

<svelte:head>
  <title>Campanhas | VTUR</title>
</svelte:head>

<PageHeader
  title="Campanhas"
  subtitle="Gerencie campanhas promocionais com imagens, links e regras de validade."
  color="operacao"
  breadcrumbs={[
    { label: 'Operação', href: '/operacao' },
    { label: 'Campanhas' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    ...(canEdit ? [{ label: 'Nova Campanha', onClick: openNew, variant: 'primary' as const, icon: Plus }] : [])
  ]}
/>

<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
  <KPICard title="Total" value={campanhas.length} color="operacao" icon={Megaphone} />
  <KPICard title="Ativas" value={ativas} color="operacao" icon={Megaphone} />
  <KPICard title="Vencidas" value={vencidas} color="operacao" icon={Megaphone} />
</div>

<Card color="operacao" class="mb-6">
  <div class="flex gap-4 items-end">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="camp-status">Status</label>
      <select id="camp-status" bind:value={filtroStatus} class="vtur-input">
        <option value="">Todos</option>
        <option value="ativa">Ativas</option>
        <option value="inativa">Inativas</option>
        <option value="cancelada">Canceladas</option>
      </select>
    </div>
    <Button variant="primary" size="sm" on:click={load}>Filtrar</Button>
  </div>
</Card>

<DataTable
  {columns}
  data={campanhas}
  color="operacao"
  {loading}
  title="Campanhas"
  searchable={true}
  emptyMessage="Nenhuma campanha encontrada"
>
  <svelte:fragment slot="row-actions" let:row>
    <div class="flex items-center gap-1">
      {#if canEdit}
        <button on:click|stopPropagation={() => openEdit(row)} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Editar">
          <Pencil size={15} />
        </button>
        <button on:click|stopPropagation={() => deleteCampanha(row.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir" disabled={deletingId === row.id}>
          <Trash2 size={15} />
        </button>
      {/if}
    </div>
  </svelte:fragment>
</DataTable>

<Dialog
  bind:open={modalOpen}
  title={editingId ? 'Editar Campanha' : 'Nova Campanha'}
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
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="camp-titulo">Título *</label>
      <input id="camp-titulo" bind:value={form.titulo} class="vtur-input w-full" placeholder="Título da campanha" />
    </div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="camp-data">Data da Campanha *</label>
        <input id="camp-data" type="date" bind:value={form.data_campanha} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="camp-validade">Válida até</label>
        <input id="camp-validade" type="date" bind:value={form.validade_ate} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="camp-status-form">Status</label>
        <select id="camp-status-form" bind:value={form.status} class="vtur-input w-full">
          <option value="ativa">Ativa</option>
          <option value="inativa">Inativa</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="camp-imagem">URL da Imagem</label>
        <input id="camp-imagem" bind:value={form.imagem_url} class="vtur-input w-full" placeholder="https://..." />
      </div>
    </div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="camp-link">Link principal</label>
        <input id="camp-link" bind:value={form.link_url} class="vtur-input w-full" placeholder="https://..." />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="camp-instagram">Instagram</label>
        <input id="camp-instagram" bind:value={form.link_instagram} class="vtur-input w-full" placeholder="https://instagram.com/..." />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="camp-facebook">Facebook</label>
        <input id="camp-facebook" bind:value={form.link_facebook} class="vtur-input w-full" placeholder="https://facebook.com/..." />
      </div>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="camp-regras">Regras / Condições</label>
      <textarea id="camp-regras" bind:value={form.regras} rows="4" class="vtur-input w-full" placeholder="Condições e regras da campanha..."></textarea>
    </div>
  </div>
</Dialog>
