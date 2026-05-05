<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import { apiDelete, apiGet, apiPost } from '$lib/services/api';
  import { Plus, Trash2, RefreshCw } from 'lucide-svelte';

  import { confirmAction } from '$lib/stores/confirm';
  type Subdivisao = {
    id: string;
    nome: string;
    pais_id: string;
    codigo_admin1: string | null;
    tipo: string | null;
    created_at: string | null;
    pais?: { id: string; nome: string } | null;
  };

  type Pais = { id: string; nome: string };

  let subdivisoes: Subdivisao[] = [];
  let paises: Pais[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;
  let busca = '';
  let filtroPais = '';
  let autoReloadEnabled = false;
  let lastAutoReloadKey = '';
  let autoReloadTimer: ReturnType<typeof setTimeout> | null = null;

  let form = { nome: '', pais_id: '', codigo_admin1: '', tipo: '' };

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'pais', label: 'País', sortable: false, formatter: (_: any, row: Subdivisao) => row.pais?.nome || '-' },
    { key: 'codigo_admin1', label: 'Código', sortable: true, width: '100px', formatter: (v: string | null) => v || '-' },
    { key: 'tipo', label: 'Tipo', sortable: true, width: '120px', formatter: (v: string | null) => v || '-' }
  ];

  async function loadPaises() {
    try {
      const payload = await apiGet<any>('/api/v1/paises');
      paises = payload.items || [];
    } catch {
      paises = [];
    }
  }

  async function load() {
    const term = busca.trim();
    const hasSearch = term.length >= 2;
    const hasPaisFilter = Boolean(filtroPais);

    if (!hasSearch && !hasPaisFilter) {
      subdivisoes = [];
      loading = false;
      return;
    }

    loading = true;
    try {
      const payload = await apiGet<any>('/api/v1/subdivisoes', {
        q: hasSearch ? term : undefined,
        pais_id: hasPaisFilter ? filtroPais : undefined,
        page: 1,
        pageSize: 200
      });
      subdivisoes = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar estados.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = { nome: '', pais_id: paises[0]?.id || '', codigo_admin1: '', tipo: '' };
    modalOpen = true;
  }

  function openEdit(s: Subdivisao) {
    editingId = s.id;
    form = { nome: s.nome, pais_id: s.pais_id, codigo_admin1: s.codigo_admin1 || '', tipo: s.tipo || '' };
    modalOpen = true;
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }
    if (!form.pais_id) { toast.error('País obrigatório.'); return; }
    saving = true;
    try {
      await apiPost('/api/v1/subdivisoes', {
        id: editingId || undefined,
        nome: form.nome,
        pais_id: form.pais_id,
        codigo_admin1: form.codigo_admin1 || null,
        tipo: form.tipo || null
      });
      toast.success(editingId ? 'Estado atualizado.' : 'Estado criado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  async function deleteEstado(id: string) {
    if (!(await confirmAction('Deseja excluir este estado/província?'))) return;
    deletingId = id;
    try {
      await apiDelete('/api/v1/subdivisoes', { id });
      toast.success('Estado excluído.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      deletingId = '';
    }
  }

  onMount(async () => {
    await loadPaises();
    lastAutoReloadKey = buildAutoReloadKey();
    autoReloadEnabled = true;
  });

  onDestroy(() => {
    if (autoReloadTimer) clearTimeout(autoReloadTimer);
  });

  function buildAutoReloadKey() {
    return [busca.trim(), filtroPais].join('|');
  }

  function scheduleAutoReload() {
    if (autoReloadTimer) clearTimeout(autoReloadTimer);
    autoReloadTimer = setTimeout(() => {
      void load();
    }, 250);
  }

  $: autoReloadKey = buildAutoReloadKey();
  $: if (autoReloadEnabled && autoReloadKey !== lastAutoReloadKey) {
    lastAutoReloadKey = autoReloadKey;
    scheduleAutoReload();
  }
</script>

<svelte:head>
  <title>Estados/Províncias | VTUR</title>
</svelte:head>

<PageHeader
  title="Estados / Províncias"
  subtitle="Cadastro de estados e províncias vinculados a países."
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: 'Estados' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    { label: 'Novo Estado', onClick: openNew, variant: 'primary', icon: Plus }
  ]}
/>

<Card class="mb-6">
  <div class="flex flex-wrap gap-4 items-end">
    <FieldInput
      id="est-busca"
      label="Buscar Estado/Província"
      bind:value={busca}
      placeholder="Digite 2+ letras..."
      class_name="flex-1 min-w-[220px]"
    />
    <FieldSelect
      id="est-pais"
      label="País"
      bind:value={filtroPais}
      options={[{ value: '', label: 'Todos' }, ...paises.map((p) => ({ value: p.id, label: p.nome }))]}
      placeholder={null}
    />
  </div>
</Card>

<DataTable {columns} data={subdivisoes} {loading} title="Estados/Províncias" searchable={false} emptyMessage="Nenhum estado encontrado"
  onRowClick={(row) => openEdit(row)}>
  <svelte:fragment slot="row-actions" let:row>
    <Button
      variant="ghost"
      size="sm"
      class_name="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
      disabled={deletingId === row.id}
      title="Excluir estado"
      ariaLabel="Excluir estado"
      on:click={(event) => {
        event.stopPropagation();
        deleteEstado(row.id);
      }}
    >
      <Trash2 size={15} />
    </Button>
  </svelte:fragment>
</DataTable>

<Dialog bind:open={modalOpen} title={editingId ? 'Editar Estado' : 'Novo Estado'} size="sm" showCancel={true} cancelText="Cancelar" showConfirm={true} confirmText={editingId ? 'Salvar' : 'Criar'} loading={saving} onConfirm={save} onCancel={() => (modalOpen = false)}>
  <div class="space-y-4">
    <FieldInput
      id="est-nome"
      label="Nome *"
      bind:value={form.nome}
      placeholder="Nome do estado/província"
      class_name="w-full"
    />
    <FieldSelect
      id="est-pais-form"
      label="País *"
      bind:value={form.pais_id}
      options={[{ value: '', label: 'Selecione uma opção' }, ...paises.map((p) => ({ value: p.id, label: p.nome }))]}
      placeholder={null}
      class_name="w-full"
    />
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FieldInput
        id="est-codigo"
        label="Código"
        bind:value={form.codigo_admin1}
        placeholder="Ex: SP, RJ"
        class_name="w-full"
      />
      <FieldInput
        id="est-tipo"
        label="Tipo"
        bind:value={form.tipo}
        placeholder="Ex: Estado, Província"
        class_name="w-full"
      />
    </div>
  </div>
</Dialog>
