<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { FieldCheckbox, FieldInput, FieldSelect } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { apiDelete, apiGet, apiPost, isCanceledApiError } from '$lib/services/api';
  import { createLoadGuard } from '$lib/utils/loadGuard';
  import { Plus, Trash2, RefreshCw } from 'lucide-svelte';
  import { toUserMessage } from '$lib/utils/errors';

  import { confirmAction } from '$lib/stores/confirm';
  type RegraOption = {
    id: string;
    nome: string;
    ativo?: boolean;
  };

  type TipoPacote = {
    id: string;
    nome: string;
    ativo: boolean;
    rule_id?: string | null;
    fix_meta_nao_atingida?: number | null;
    fix_meta_atingida?: number | null;
    fix_super_meta?: number | null;
  };

  let tipos: TipoPacote[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;
  const loadGuard = createLoadGuard();

  let form = createForm();
  let regras: RegraOption[] = [];

  function createForm() {
    return {
      nome: '',
      ativo: true,
      rule_id: '',
      fix_meta_nao_atingida: '' as string | number,
      fix_meta_atingida: '' as string | number,
      fix_super_meta: '' as string | number
    };
  }

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('parametros', 'edit');
  $: canDelete = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('parametros', 'admin');

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    {
      key: 'rule_id',
      label: 'Regra',
      sortable: true,
      width: '140px',
      formatter: (_value: string | null, row: TipoPacote) => {
        if (row.rule_id) return '<span class="inline-flex rounded-full bg-financeiro-100 px-2.5 py-1 text-xs font-semibold text-financeiro-700">Regra vinculada</span>';
        if (row.fix_meta_nao_atingida != null || row.fix_meta_atingida != null || row.fix_super_meta != null) {
          return '<span class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Fixos</span>';
        }
        return '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">—</span>';
      }
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      width: '100px',
      formatter: (value: boolean) =>
        value
          ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Ativo</span>'
          : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inativo</span>'
    }
  ];

  async function load() {
    const request = loadGuard.next();
    loading = true;
    try {
      const [payload, regrasPayload] = await Promise.all([
        apiGet<{ items?: TipoPacote[] }>('/api/v1/parametros/tipo-pacotes', undefined, request.signal),
        apiGet<{ items?: RegraOption[] }>('/api/v1/parametros/commission-rules', undefined, request.signal)
      ]);
      if (!loadGuard.isCurrent(request.seq)) return;
      tipos = payload.items || [];
      regras = (regrasPayload.items || []).filter((r: RegraOption) => r.ativo !== false);
    } catch (err) {
      if (isCanceledApiError(err)) return;
      toast.error(toUserMessage(err, 'Erro ao carregar tipos de pacote.'));
    } finally {
      if (loadGuard.isCurrent(request.seq)) loading = false;
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
      fix_meta_nao_atingida: tipo.fix_meta_nao_atingida ?? '',
      fix_meta_atingida: tipo.fix_meta_atingida ?? '',
      fix_super_meta: tipo.fix_super_meta ?? ''
    };
    modalOpen = true;
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }

    saving = true;
    try {
      await apiPost('/api/v1/parametros/tipo-pacotes', {
        id: editingId || undefined,
        nome: form.nome.trim(),
        ativo: form.ativo,
        rule_id: form.rule_id || null,
        fix_meta_nao_atingida: form.fix_meta_nao_atingida === '' ? null : Number(form.fix_meta_nao_atingida),
        fix_meta_atingida: form.fix_meta_atingida === '' ? null : Number(form.fix_meta_atingida),
        fix_super_meta: form.fix_super_meta === '' ? null : Number(form.fix_super_meta)
      });
      toast.success(editingId ? 'Tipo de pacote atualizado.' : 'Tipo de pacote criado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(toUserMessage(err, 'Erro ao salvar tipo de pacote.'));
    } finally {
      saving = false;
    }
  }

  async function deleteTipo(id: string) {
    if (!(await confirmAction('Deseja excluir este tipo de pacote? Ele não pode estar vinculado a vendas.'))) return;
    deletingId = id;
    try {
      await apiDelete('/api/v1/parametros/tipo-pacotes', { id });
      toast.success('Tipo de pacote excluído.');
      await load();
    } catch (err) {
      toast.error(toUserMessage(err, 'Erro ao excluir tipo de pacote.'));
    } finally {
      deletingId = '';
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Tipos de Pacote | VTUR</title>
</svelte:head>

<PageHeader
  title="Tipos de Pacote"
  subtitle="Gerencie a lista global de tipos de pacote utilizados nos recibos."
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

    <div class="rounded-xl border border-financeiro-200 bg-financeiro-50/40 p-4 space-y-4">
      <p class="text-sm font-semibold text-financeiro-700">Configuração de comissão</p>
      <FieldSelect
        id="tp-rule"
        label="Regra de comissão"
        bind:value={form.rule_id}
        options={[{ value: '', label: 'Nenhuma (usar fixos ou regra geral)' }, ...regras.map((r) => ({ value: r.id, label: r.nome }))]}
        placeholder=""
        class_name="w-full"
      />
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FieldInput id="tp-fix-nao" label="% meta não atingida" type="number" bind:value={form.fix_meta_nao_atingida} placeholder="0" class_name="w-full" suffix="%" />
        <FieldInput id="tp-fix-atingida" label="% meta atingida" type="number" bind:value={form.fix_meta_atingida} placeholder="0" class_name="w-full" suffix="%" />
        <FieldInput id="tp-fix-super" label="% super meta" type="number" bind:value={form.fix_super_meta} placeholder="0" class_name="w-full" suffix="%" />
      </div>
    </div>

    <FieldCheckbox
      label="Tipo ativo"
      bind:checked={form.ativo}
      color="financeiro"
    />
  </div>
</Dialog>
