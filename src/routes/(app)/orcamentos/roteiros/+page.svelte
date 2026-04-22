<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { FieldInput } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { Plus, Trash2, RefreshCw, Map as MapIcon, Calendar } from 'lucide-svelte';

  type Roteiro = {
    id: string;
    nome: string;
    duracao: number | null;
    inicio_cidade: string | null;
    fim_cidade: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  let roteiros: Roteiro[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;

  let form = { nome: '', duracao: '', inicio_cidade: '', fim_cidade: '' };

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    {
      key: 'duracao',
      label: 'Duração',
      sortable: true,
      width: '100px',
      formatter: (v: number | null) => v ? `${v} dias` : '-'
    },
    {
      key: 'inicio_cidade',
      label: 'Origem',
      sortable: true,
      formatter: (v: string | null) => v || '-'
    },
    {
      key: 'fim_cidade',
      label: 'Destino',
      sortable: true,
      formatter: (v: string | null) => v || '-'
    },
    {
      key: 'updated_at',
      label: 'Atualizado',
      sortable: true,
      width: '130px',
      formatter: (v: string | null) => v ? new Date(v).toLocaleDateString('pt-BR') : '-'
    }
  ];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/roteiros');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      roteiros = payload.roteiros || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar roteiros.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = { nome: '', duracao: '', inicio_cidade: '', fim_cidade: '' };
    modalOpen = true;
  }

  function openEdit(r: Roteiro) {
    editingId = r.id;
    form = {
      nome: r.nome,
      duracao: r.duracao != null ? String(r.duracao) : '',
      inicio_cidade: r.inicio_cidade || '',
      fim_cidade: r.fim_cidade || ''
    };
    modalOpen = true;
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }
    saving = true;
    try {
      const response = await fetch('/api/v1/roteiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          nome: form.nome,
          duracao: form.duracao ? Number(form.duracao) : null,
          inicio_cidade: form.inicio_cidade || null,
          fim_cidade: form.fim_cidade || null
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'Roteiro atualizado.' : 'Roteiro criado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  async function deleteRoteiro(id: string) {
    if (!confirm('Deseja excluir este roteiro?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/roteiros?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Roteiro excluído.');
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
  <title>Roteiros | VTUR</title>
</svelte:head>

<PageHeader
  title="Roteiros Personalizados"
  subtitle="Crie e gerencie roteiros de viagem para usar nos orçamentos."
  color="clientes"
  breadcrumbs={[
    { label: 'Orçamentos', href: '/orcamentos' },
    { label: 'Roteiros' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    { label: 'Novo Roteiro', onClick: openNew, variant: 'primary', icon: Plus }
  ]}
/>

<DataTable
  {columns}
  data={roteiros}
  color="clientes"
  {loading}
  title="Roteiros cadastrados"
  searchable={true}
  emptyMessage="Nenhum roteiro cadastrado"
  onRowClick={(row) => goto(`/orcamentos/roteiros/${row.id}`)}
>
  <svelte:fragment slot="row-actions" let:row>
    <Button
      type="button"
      variant="ghost"
      size="xs"
      ariaLabel="Excluir roteiro"
      title="Excluir"
      disabled={deletingId === row.id}
      class_name="h-8 w-8 !p-0 text-slate-400 hover:!bg-red-50 hover:!text-red-600"
      on:click={(event) => {
        event.stopPropagation();
        deleteRoteiro(row.id);
      }}
    >
      <Trash2 size={15} />
    </Button>
  </svelte:fragment>
</DataTable>

<Dialog
  bind:open={modalOpen}
  title={editingId ? 'Editar Roteiro' : 'Novo Roteiro'}
  color="clientes"
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
    <FieldInput
      id="rot-nome"
      label="Nome"
      bind:value={form.nome}
      class_name="w-full"
      placeholder="Ex: Europa Clássica 10 dias"
      required={true}
    />
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <FieldInput
        id="rot-duracao"
        label="Duração (dias)"
        type="number"
        min="1"
        bind:value={form.duracao}
        class_name="w-full"
        placeholder="10"
      />
      <FieldInput
        id="rot-origem"
        label="Cidade de origem"
        bind:value={form.inicio_cidade}
        class_name="w-full"
        placeholder="Lisboa"
      />
      <FieldInput
        id="rot-destino"
        label="Cidade de destino"
        bind:value={form.fim_cidade}
        class_name="w-full"
        placeholder="Paris"
      />
    </div>
  </div>
</Dialog>
