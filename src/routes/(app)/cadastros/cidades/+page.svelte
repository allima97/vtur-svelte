<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import { Plus, Trash2, RefreshCw, Search } from 'lucide-svelte';

  type Cidade = {
    id: string;
    nome: string;
    subdivisao_id: string | null;
    descricao: string | null;
    created_at: string | null;
    subdivisao?: { id: string; nome: string; pais?: { id: string; nome: string } | null } | null;
  };

  type Subdivisao = { id: string; nome: string; pais_id: string; pais?: { nome: string } | null };

  let cidades: Cidade[] = [];
  let subdivisoes: Subdivisao[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;
  let busca = '';
  let filtroSubdivisao = '';

  let form = { nome: '', subdivisao_id: '', descricao: '' };

  const columns = [
    { key: 'nome', label: 'Cidade', sortable: true },
    {
      key: 'subdivisao',
      label: 'Estado/Província',
      sortable: false,
      formatter: (_: any, row: Cidade) => {
        const sub = row.subdivisao?.nome || '-';
        const pais = row.subdivisao?.pais?.nome || '';
        return pais ? `${sub} · ${pais}` : sub;
      }
    },
    { key: 'descricao', label: 'Descrição', sortable: false, formatter: (v: string | null) => v || '-' }
  ];

  async function loadSubdivisoes() {
    const response = await fetch('/api/v1/subdivisoes');
    if (response.ok) {
      const payload = await response.json();
      subdivisoes = payload.items || [];
    }
  }

  async function load() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.set('q', busca.trim());
      if (filtroSubdivisao) params.set('subdivisao_id', filtroSubdivisao);
      params.set('pageSize', '100');

      const response = await fetch(`/api/v1/cidades?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      cidades = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar cidades.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = { nome: '', subdivisao_id: '', descricao: '' };
    modalOpen = true;
  }

  function openEdit(c: Cidade) {
    editingId = c.id;
    form = { nome: c.nome, subdivisao_id: c.subdivisao_id || '', descricao: c.descricao || '' };
    modalOpen = true;
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }
    saving = true;
    try {
      const response = await fetch('/api/v1/cidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId || undefined, nome: form.nome, subdivisao_id: form.subdivisao_id || null, descricao: form.descricao || null })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'Cidade atualizada.' : 'Cidade criada.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  async function deleteCidade(id: string) {
    if (!confirm('Deseja excluir esta cidade?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/cidades?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Cidade excluída.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      deletingId = '';
    }
  }

  onMount(async () => {
    await Promise.all([load(), loadSubdivisoes()]);
  });
</script>

<svelte:head>
  <title>Cidades | VTUR</title>
</svelte:head>

<PageHeader
  title="Cidades"
  subtitle="Cadastro de cidades utilizadas nos destinos e produtos."
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: 'Cidades' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    { label: 'Nova Cidade', onClick: openNew, variant: 'primary', icon: Plus }
  ]}
/>

<Card class="mb-6">
  <div class="flex flex-wrap gap-4 items-end">
    <FieldInput
      bind:value={busca}
      icon={Search}
      placeholder="Buscar cidade..."
      class_name="flex-1 min-w-[200px]"
    />
    <FieldSelect
      id="cid-sub"
      label="Estado/Província"
      bind:value={filtroSubdivisao}
      options={[{ value: '', label: 'Todos' }, ...subdivisoes.map((s) => ({ value: s.id, label: s.nome }))]}
      placeholder={null}
    />
    <Button variant="primary" size="sm" on:click={load}>Filtrar</Button>
  </div>
</Card>

<DataTable {columns} data={cidades} {loading} title="Cidades cadastradas" searchable={false} emptyMessage="Nenhuma cidade encontrada"
  onRowClick={(row) => openEdit(row)}>
  <svelte:fragment slot="row-actions" let:row>
    <button on:click|stopPropagation={() => deleteCidade(row.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" disabled={deletingId === row.id}><Trash2 size={15} /></button>
  </svelte:fragment>
</DataTable>

<Dialog bind:open={modalOpen} title={editingId ? 'Editar Cidade' : 'Nova Cidade'} size="sm" showCancel={true} cancelText="Cancelar" showConfirm={true} confirmText={editingId ? 'Salvar' : 'Criar'} loading={saving} onConfirm={save} onCancel={() => (modalOpen = false)}>
  <div class="space-y-4">
    <FieldInput
      id="cid-nome"
      label="Nome *"
      bind:value={form.nome}
      placeholder="Nome da cidade"
      class_name="w-full"
    />
    <FieldSelect
      id="cid-sub-form"
      label="Estado/Província"
      bind:value={form.subdivisao_id}
      options={[{ value: '', label: 'Selecione uma opção' }, ...subdivisoes.map((s) => ({ value: s.id, label: s.nome }))]}
      placeholder={null}
      class_name="w-full"
    />
    <FieldInput
      id="cid-desc"
      label="Descrição"
      bind:value={form.descricao}
      placeholder="Opcional"
      class_name="w-full"
    />
  </div>
</Dialog>
