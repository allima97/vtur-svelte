<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { FieldCheckbox, FieldInput, FieldSelect } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { Plus, Trash2, RefreshCw } from 'lucide-svelte';

  type TipoPacote = {
    id: string;
    nome: string;
    ativo: boolean;
    rule_id: string | null;
    fix_meta_nao_atingida: number | null;
    fix_meta_atingida: number | null;
    fix_super_meta: number | null;
  };

  type Regra = { id: string; nome: string; tipo: string };

  let tipos: TipoPacote[] = [];
  let regras: Regra[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;

  let form = createForm();

  function createForm() {
    return {
      nome: '',
      ativo: true,
      rule_id: '',
      fix_meta_nao_atingida: '',
      fix_meta_atingida: '',
      fix_super_meta: ''
    };
  }

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('parametros', 'edit');
  $: canDelete = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('parametros', 'admin');

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      width: '100px',
      formatter: (value: boolean) =>
        value
          ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Ativo</span>'
          : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inativo</span>'
    },
    {
      key: 'fix_meta_nao_atingida',
      label: '% Meta não batida',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number | null) => (value != null ? `${value}%` : '-')
    },
    {
      key: 'fix_meta_atingida',
      label: '% Meta batida',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number | null) => (value != null ? `${value}%` : '-')
    },
    {
      key: 'fix_super_meta',
      label: '% Super meta',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number | null) => (value != null ? `${value}%` : '-')
    }
  ];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/parametros/tipo-pacotes');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      tipos = payload.items || [];
      regras = payload.regras || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar tipos de pacote.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = createForm();
    modalOpen = true;
  }

  function openEdit(tipo: TipoPacote) {
    editingId = tipo.id;
    form = {
      nome: tipo.nome,
      ativo: tipo.ativo,
      rule_id: tipo.rule_id || '',
      fix_meta_nao_atingida: tipo.fix_meta_nao_atingida != null ? String(tipo.fix_meta_nao_atingida) : '',
      fix_meta_atingida: tipo.fix_meta_atingida != null ? String(tipo.fix_meta_atingida) : '',
      fix_super_meta: tipo.fix_super_meta != null ? String(tipo.fix_super_meta) : ''
    };
    modalOpen = true;
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }

    saving = true;
    try {
      const toNum = (v: string) => (v.trim() === '' ? null : Number(v));
      const response = await fetch('/api/v1/parametros/tipo-pacotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          nome: form.nome.trim(),
          ativo: form.ativo,
          rule_id: form.rule_id || null,
          fix_meta_nao_atingida: toNum(form.fix_meta_nao_atingida),
          fix_meta_atingida: toNum(form.fix_meta_atingida),
          fix_super_meta: toNum(form.fix_super_meta)
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'Tipo de pacote atualizado.' : 'Tipo de pacote criado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar tipo de pacote.');
    } finally {
      saving = false;
    }
  }

  async function deleteTipo(id: string) {
    if (!confirm('Deseja excluir este tipo de pacote? Ele não pode estar vinculado a vendas.')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/parametros/tipo-pacotes?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Tipo de pacote excluído.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir tipo de pacote.');
    } finally {
      deletingId = '';
    }
  }

  onMount(load);
  $: regraOptions = regras.map((r) => ({ value: r.id, label: r.nome }));
</script>

<svelte:head>
  <title>Tipos de Pacote | VTUR</title>
</svelte:head>

<PageHeader
  title="Tipos de Pacote"
  subtitle="Gerencie os tipos de pacote utilizados nos recibos de vendas."
  color="financeiro"
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'Tipos de Pacote' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    ...(canEdit ? [{ label: 'Novo Tipo', onClick: openNew, variant: 'primary' as const, icon: Plus }] : [])
  ]}
/>

<DataTable
  {columns}
  data={tipos}
  color="financeiro"
  {loading}
  title="Tipos de pacote"
  searchable={true}
  emptyMessage="Nenhum tipo de pacote cadastrado"
  onRowClick={canEdit ? (row) => openEdit(row) : undefined}
>
  <svelte:fragment slot="row-actions" let:row>
    {#if canDelete}
      <Button
        variant="ghost"
        size="xs"
        color="financeiro"
        on:click={(event) => {
          event.stopPropagation();
          deleteTipo(row.id);
        }}
        class_name="min-w-0 !p-1.5 !text-slate-400 hover:!bg-red-50 hover:!text-red-600"
        loading={deletingId === row.id}
      >
        <Trash2 size={15} />
      </Button>
    {/if}
  </svelte:fragment>
</DataTable>

<Dialog
  bind:open={modalOpen}
  title={editingId ? 'Editar Tipo de Pacote' : 'Novo Tipo de Pacote'}
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
    <FieldInput
      id="tp-nome"
      label="Nome"
      bind:value={form.nome}
      class_name="w-full"
      placeholder="Ex: Pacote Completo"
      required={true}
    />

    {#if regras.length > 0}
      <FieldSelect
        id="tp-regra"
        label="Regra de comissão"
        bind:value={form.rule_id}
        options={regraOptions}
        class_name="w-full"
        placeholder="Sem regra específica"
      />
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <FieldInput
        id="tp-nao-batida"
        label="% Meta não batida"
        type="number"
        step="0.01"
        bind:value={form.fix_meta_nao_atingida}
        class_name="w-full"
        placeholder="-"
      />
      <FieldInput
        id="tp-batida"
        label="% Meta batida"
        type="number"
        step="0.01"
        bind:value={form.fix_meta_atingida}
        class_name="w-full"
        placeholder="-"
      />
      <FieldInput
        id="tp-super"
        label="% Super meta"
        type="number"
        step="0.01"
        bind:value={form.fix_super_meta}
        class_name="w-full"
        placeholder="-"
      />
    </div>
    <p class="text-xs text-slate-500">Percentuais fixos de comissão para este tipo de pacote. Deixe em branco para usar a regra geral.</p>

    <FieldCheckbox
      label="Tipo ativo"
      bind:checked={form.ativo}
      color="financeiro"
    />
  </div>
</Dialog>
