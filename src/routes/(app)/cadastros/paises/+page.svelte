<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-svelte';

  type Pais = {
    id: string;
    nome: string;
    codigo_iso: string | null;
    continente: string | null;
    created_at: string | null;
  };

  const CONTINENTES = ['África', 'América do Norte', 'América do Sul', 'América Central', 'Ásia', 'Europa', 'Oceania', 'Antártida'];

  let paises: Pais[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;

  let form = { nome: '', codigo_iso: '', continente: '' };

  const columns = [
    { key: 'nome', label: 'País', sortable: true },
    { key: 'codigo_iso', label: 'ISO', sortable: true, width: '80px', formatter: (v: string | null) => v || '-' },
    { key: 'continente', label: 'Continente', sortable: true, formatter: (v: string | null) => v || '-' }
  ];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/paises');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      paises = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar países.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = { nome: '', codigo_iso: '', continente: '' };
    modalOpen = true;
  }

  function openEdit(p: Pais) {
    editingId = p.id;
    form = { nome: p.nome, codigo_iso: p.codigo_iso || '', continente: p.continente || '' };
    modalOpen = true;
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }
    saving = true;
    try {
      const response = await fetch('/api/v1/paises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId || undefined, nome: form.nome, codigo_iso: form.codigo_iso || null, continente: form.continente || null })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'País atualizado.' : 'País criado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  async function deletePais(id: string) {
    if (!confirm('Deseja excluir este país?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/paises?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('País excluído.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      deletingId = '';
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Países | VTUR</title>
</svelte:head>

<PageHeader
  title="Países"
  subtitle="Cadastro de países utilizados nos destinos e clientes."
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: 'Países' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    { label: 'Novo País', onClick: openNew, variant: 'primary', icon: Plus }
  ]}
/>

<DataTable {columns} data={paises} {loading} title="Países cadastrados" searchable={true} emptyMessage="Nenhum país encontrado">
  <svelte:fragment slot="row-actions" let:row>
    <div class="flex gap-1">
      <button on:click|stopPropagation={() => openEdit(row)} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil size={15} /></button>
      <button on:click|stopPropagation={() => deletePais(row.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" disabled={deletingId === row.id}><Trash2 size={15} /></button>
    </div>
  </svelte:fragment>
</DataTable>

<Dialog bind:open={modalOpen} title={editingId ? 'Editar País' : 'Novo País'} size="sm" showCancel={true} cancelText="Cancelar" showConfirm={true} confirmText={editingId ? 'Salvar' : 'Criar'} loading={saving} onConfirm={save} onCancel={() => (modalOpen = false)}>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="pais-nome">Nome *</label>
      <input id="pais-nome" bind:value={form.nome} class="vtur-input w-full" placeholder="Nome do país" />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="pais-iso">Código ISO</label>
        <input id="pais-iso" bind:value={form.codigo_iso} class="vtur-input w-full" placeholder="Ex: BR, US" maxlength="3" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="pais-continente">Continente</label>
        <select id="pais-continente" bind:value={form.continente} class="vtur-input w-full">
          <option value="">Selecione...</option>
          {#each CONTINENTES as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>
</Dialog>
