<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import { Plus, Trash2, RefreshCw } from 'lucide-svelte';

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
  let filtroPais = '';

  let form = { nome: '', pais_id: '', codigo_admin1: '', tipo: '' };

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'pais', label: 'País', sortable: false, formatter: (_: any, row: Subdivisao) => row.pais?.nome || '-' },
    { key: 'codigo_admin1', label: 'Código', sortable: true, width: '100px', formatter: (v: string | null) => v || '-' },
    { key: 'tipo', label: 'Tipo', sortable: true, width: '120px', formatter: (v: string | null) => v || '-' }
  ];

  async function loadPaises() {
    const response = await fetch('/api/v1/paises');
    if (response.ok) {
      const payload = await response.json();
      paises = payload.items || [];
    }
  }

  async function load() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (filtroPais) params.set('pais_id', filtroPais);
      const response = await fetch(`/api/v1/subdivisoes?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
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
      const response = await fetch('/api/v1/subdivisoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId || undefined, nome: form.nome, pais_id: form.pais_id, codigo_admin1: form.codigo_admin1 || null, tipo: form.tipo || null })
      });
      if (!response.ok) throw new Error(await response.text());
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
    if (!confirm('Deseja excluir este estado/província?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/subdivisoes?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Estado excluído.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      deletingId = '';
    }
  }

  onMount(async () => {
    await Promise.all([load(), loadPaises()]);
  });
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
  <div class="flex gap-4 items-end">
    <FieldSelect
      id="est-pais"
      label="País"
      bind:value={filtroPais}
      options={[{ value: '', label: 'Todos' }, ...paises.map((p) => ({ value: p.id, label: p.nome }))]}
      placeholder={null}
    />
    <Button variant="primary" size="sm" on:click={load}>Filtrar</Button>
  </div>
</Card>

<DataTable {columns} data={subdivisoes} {loading} title="Estados/Províncias" searchable={true} emptyMessage="Nenhum estado encontrado"
  onRowClick={(row) => openEdit(row)}>
  <svelte:fragment slot="row-actions" let:row>
    <button on:click|stopPropagation={() => deleteEstado(row.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" disabled={deletingId === row.id}><Trash2 size={15} /></button>
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
