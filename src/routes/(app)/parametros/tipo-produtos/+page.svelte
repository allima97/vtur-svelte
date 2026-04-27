<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { FieldInput, FieldSelect, FieldCheckbox } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { Plus, Trash2, RefreshCw } from 'lucide-svelte';

  type TipoProduto = {
    id: string;
    nome: string | null;
    tipo: string;
    descricao: string | null;
    ativo: boolean;
    soma_na_meta: boolean;
    regra_comissionamento: string;
    usa_meta_produto: boolean | null;
    meta_produto_valor: number | null;
    comissao_produto_meta_pct: number | null;
    descontar_meta_geral: boolean | null;
    exibe_kpi_comissao: boolean | null;
  };

  let tipos: TipoProduto[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;

  let form = createForm();

  function createForm() {
    return {
      nome: '',
      tipo: 'servico',
      descricao: '',
      ativo: true,
      soma_na_meta: true,
      regra_comissionamento: 'geral',
      usa_meta_produto: false,
      meta_produto_valor: '',
      comissao_produto_meta_pct: '',
      descontar_meta_geral: false,
      exibe_kpi_comissao: true
    };
  }

  const TIPOS = [
    { value: 'servico', label: 'Serviço' },
    { value: 'pacote', label: 'Pacote' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'aereo', label: 'Aéreo' },
    { value: 'seguro', label: 'Seguro' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'cruzeiro', label: 'Cruzeiro' },
    { value: 'outro', label: 'Outro' }
  ];

  const REGRAS = [
    { value: 'geral', label: 'Geral' },
    { value: 'diferenciado', label: 'Diferenciado' }
  ];

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('parametros', 'edit');
  $: canDelete = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('parametros', 'admin');

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      width: '120px',
      formatter: (value: string) => {
        const found = TIPOS.find((t) => t.value === value);
        return found ? found.label : value;
      }
    },
    {
      key: 'soma_na_meta',
      label: 'Soma na meta',
      sortable: true,
      width: '120px',
      formatter: (value: boolean) =>
        value
          ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Sim</span>'
          : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Não</span>'
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
    loading = true;
    try {
      const response = await fetch('/api/v1/tipo-produtos?all=1');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      tipos = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar tipos de produto.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = createForm();
    modalOpen = true;
  }

  function openEdit(tipo: TipoProduto) {
    editingId = tipo.id;
    form = {
      nome: tipo.nome || '',
      tipo: tipo.tipo || 'servico',
      descricao: tipo.descricao || '',
      ativo: tipo.ativo,
      soma_na_meta: tipo.soma_na_meta,
      regra_comissionamento: tipo.regra_comissionamento || 'geral',
      usa_meta_produto: Boolean(tipo.usa_meta_produto),
      meta_produto_valor: tipo.meta_produto_valor != null ? String(tipo.meta_produto_valor) : '',
      comissao_produto_meta_pct: tipo.comissao_produto_meta_pct != null ? String(tipo.comissao_produto_meta_pct) : '',
      descontar_meta_geral: Boolean(tipo.descontar_meta_geral),
      exibe_kpi_comissao: tipo.exibe_kpi_comissao !== false
    };
    modalOpen = true;
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }

    saving = true;
    try {
      const toNum = (v: string) => (String(v).trim() === '' ? null : Number(v));
      const response = await fetch('/api/v1/tipo-produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          nome: form.nome.trim(),
          tipo: form.tipo,
          descricao: form.descricao || null,
          ativo: form.ativo,
          soma_na_meta: form.soma_na_meta,
          regra_comissionamento: form.regra_comissionamento,
          usa_meta_produto: form.usa_meta_produto,
          meta_produto_valor: toNum(form.meta_produto_valor),
          comissao_produto_meta_pct: toNum(form.comissao_produto_meta_pct),
          descontar_meta_geral: form.descontar_meta_geral,
          exibe_kpi_comissao: form.exibe_kpi_comissao
        })
      });
      if (!response.ok) {
        const raw = await response.text();
        let message = raw;
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.error) message = String(parsed.error);
        } catch {
          // resposta nao-json
        }
        throw new Error(message || 'Erro ao salvar tipo de produto.');
      }
      toast.success(editingId ? 'Tipo de produto atualizado.' : 'Tipo de produto criado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar tipo de produto.');
    } finally {
      saving = false;
    }
  }

  async function deleteTipo(id: string) {
    if (!confirm('Deseja excluir este tipo de produto? Ele não pode estar vinculado a recibos.')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/tipo-produtos?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Tipo de produto excluído.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir tipo de produto.');
    } finally {
      deletingId = '';
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Tipos de Produto | VTUR</title>
</svelte:head>

<PageHeader
  title="Tipos de Produto"
  subtitle="Gerencie os tipos de produto utilizados nos recibos e no comissionamento."
  color="financeiro"
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'Tipos de Produto' }
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
  title="Tipos de produto"
  searchable={true}
  emptyMessage="Nenhum tipo de produto cadastrado"
  onRowClick={canEdit ? (row) => openEdit(row) : undefined}
>
  <svelte:fragment slot="row-actions" let:row>
    {#if canDelete}
      <Button
        variant="ghost"
        size="sm"
        color="red"
        class_name="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        on:click={() => deleteTipo(row.id)}
        disabled={deletingId === row.id}
      >
        <Trash2 size={15} />
      </Button>
    {/if}
  </svelte:fragment>
</DataTable>

<Dialog
  bind:open={modalOpen}
  title={editingId ? 'Editar Tipo de Produto' : 'Novo Tipo de Produto'}
  color="financeiro"
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
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FieldInput id="tprod-nome" label="Nome" required={true} bind:value={form.nome} placeholder="Ex: Pacote Aéreo + Hotel" class_name="w-full" />
      <FieldSelect id="tprod-tipo" label="Tipo" bind:value={form.tipo} options={TIPOS} placeholder="" class_name="w-full" />
    </div>
    <FieldInput id="tprod-descricao" label="Descrição" bind:value={form.descricao} placeholder="Descrição opcional" class_name="w-full" />
    <FieldSelect id="tprod-regra" label="Regra de comissionamento" bind:value={form.regra_comissionamento} options={REGRAS} placeholder="" class_name="w-full" />
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FieldCheckbox label="Soma na meta" bind:checked={form.soma_na_meta} color="financeiro" class_name="rounded-xl border border-slate-200 bg-white px-3 py-2" />
      <FieldCheckbox label="Exibe KPI de comissão" bind:checked={form.exibe_kpi_comissao} color="financeiro" class_name="rounded-xl border border-slate-200 bg-white px-3 py-2" />
      <FieldCheckbox label="Usa meta de produto" bind:checked={form.usa_meta_produto} color="financeiro" class_name="rounded-xl border border-slate-200 bg-white px-3 py-2" />
      <FieldCheckbox label="Descontar da meta geral" bind:checked={form.descontar_meta_geral} color="financeiro" class_name="rounded-xl border border-slate-200 bg-white px-3 py-2" />
    </div>
    {#if form.usa_meta_produto}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldInput id="tprod-meta-valor" label="Meta do produto (R$)" type="number" step="0.01" bind:value={form.meta_produto_valor} class_name="w-full" />
        <FieldInput id="tprod-comissao-pct" label="% Comissão produto" type="number" step="0.01" bind:value={form.comissao_produto_meta_pct} class_name="w-full" />
      </div>
    {/if}
    <FieldCheckbox label="Tipo ativo" bind:checked={form.ativo} color="financeiro" class_name="rounded-xl border border-slate-200 bg-white px-3 py-2" />
  </div>
</Dialog>
