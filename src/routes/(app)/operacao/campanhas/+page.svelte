<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { FieldInput, FieldSelect, FieldTextarea } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { Plus, Trash2, RefreshCw, Megaphone, ExternalLink } from 'lucide-svelte';

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
      status: 'ativa' as 'ativa' | 'inativa' | 'cancelada'
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
      const response = await fetch('/api/v1/operacao/campanhas');
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

<div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
      <Megaphone size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total</p>
      <p class="text-2xl font-bold text-slate-900">{campanhas.length}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
      <Megaphone size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Ativas</p>
      <p class="text-2xl font-bold text-slate-900">{ativas}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
      <Megaphone size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Vencidas</p>
      <p class="text-2xl font-bold text-slate-900">{vencidas}</p>
    </div>
  </div>
</div>

<DataTable
  {columns}
  data={campanhas}
  color="operacao"
  {loading}
  title="Campanhas"
  searchable={true}
  filterable={true}
  filters={[
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'Todos' },
        { value: 'ativa', label: 'Ativas' },
        { value: 'inativa', label: 'Inativas' },
        { value: 'cancelada', label: 'Canceladas' }
      ]
    }
  ]}
  emptyMessage="Nenhuma campanha encontrada"
  onRowClick={canEdit ? (row) => openEdit(row) : undefined}
>
  <svelte:fragment slot="row-actions" let:row>
    {#if canEdit}
      <Button
        variant="ghost"
        size="xs"
        on:click={() => deleteCampanha(row.id)}
        title="Excluir"
        disabled={deletingId === row.id}
        class_name="text-slate-400 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2 size={15} />
      </Button>
    {/if}
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
    <FieldInput
      id="camp-titulo"
      label="Título"
      bind:value={form.titulo}
      placeholder="Título da campanha"
      required={true}
      class_name="w-full"
    />
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FieldInput
        id="camp-data"
        label="Data da Campanha"
        type="date"
        bind:value={form.data_campanha}
        required={true}
        class_name="w-full"
      />
      <FieldInput
        id="camp-validade"
        label="Válida até"
        type="date"
        bind:value={form.validade_ate}
        class_name="w-full"
      />
      <FieldSelect
        id="camp-status-form"
        label="Status"
        bind:value={form.status}
        options={[
          { value: 'ativa', label: 'Ativa' },
          { value: 'inativa', label: 'Inativa' },
          { value: 'cancelada', label: 'Cancelada' }
        ]}
        placeholder={null}
        class_name="w-full"
      />
      <FieldInput
        id="camp-imagem"
        label="URL da Imagem"
        bind:value={form.imagem_url}
        placeholder="https://..."
        class_name="w-full"
      />
    </div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FieldInput
        id="camp-link"
        label="Link principal"
        bind:value={form.link_url}
        placeholder="https://..."
        class_name="w-full"
      />
      <FieldInput
        id="camp-instagram"
        label="Instagram"
        bind:value={form.link_instagram}
        placeholder="https://instagram.com/..."
        class_name="w-full"
      />
      <FieldInput
        id="camp-facebook"
        label="Facebook"
        bind:value={form.link_facebook}
        placeholder="https://facebook.com/..."
        class_name="w-full"
      />
    </div>
    <FieldTextarea
      id="camp-regras"
      label="Regras / Condições"
      bind:value={form.regras}
      rows={4}
      placeholder="Condições e regras da campanha..."
      class_name="w-full"
    />
  </div>
</Dialog>
