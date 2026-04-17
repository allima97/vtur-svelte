<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-svelte';

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
      regra_comissionamento: 'padrao',
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
    { value: 'padrao', label: 'Padrão' },
    { value: 'fixo', label: 'Fixo' },
    { value: 'nao_comissionavel', label: 'Não comissionável' }
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
      regra_comissionamento: tipo.regra_comissionamento || 'padrao',
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
      if (!response.ok) throw new Error(await response.text());
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
>
  <svelte:fragment slot="row-actions" let:row>
    <div class="flex items-center gap-1">
      {#if canEdit}
        <button
          on:click|stopPropagation={() => openEdit(row)}
          class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="Editar"
        >
          <Pencil size={15} />
        </button>
      {/if}
      {#if canDelete}
        <button
          on:click|stopPropagation={() => deleteTipo(row.id)}
          class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Excluir"
          disabled={deletingId === row.id}
        >
          <Trash2 size={15} />
        </button>
      {/if}
    </div>
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
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-nome">Nome *</label>
        <input id="tprod-nome" bind:value={form.nome} class="vtur-input w-full" placeholder="Ex: Pacote Aéreo + Hotel" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-tipo">Tipo</label>
        <select id="tprod-tipo" bind:value={form.tipo} class="vtur-input w-full">
          {#each TIPOS as t}
            <option value={t.value}>{t.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-descricao">Descrição</label>
      <input id="tprod-descricao" bind:value={form.descricao} class="vtur-input w-full" placeholder="Descrição opcional" />
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-regra">Regra de comissionamento</label>
      <select id="tprod-regra" bind:value={form.regra_comissionamento} class="vtur-input w-full">
        {#each REGRAS as r}
          <option value={r.value}>{r.label}</option>
        {/each}
      </select>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" bind:checked={form.soma_na_meta} class="rounded border-slate-300" />
        Soma na meta
      </label>
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" bind:checked={form.exibe_kpi_comissao} class="rounded border-slate-300" />
        Exibe KPI de comissão
      </label>
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" bind:checked={form.usa_meta_produto} class="rounded border-slate-300" />
        Usa meta de produto
      </label>
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" bind:checked={form.descontar_meta_geral} class="rounded border-slate-300" />
        Descontar da meta geral
      </label>
    </div>

    {#if form.usa_meta_produto}
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-meta-valor">Meta do produto (R$)</label>
          <input id="tprod-meta-valor" type="number" step="0.01" bind:value={form.meta_produto_valor} class="vtur-input w-full" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="tprod-comissao-pct">% Comissão produto</label>
          <input id="tprod-comissao-pct" type="number" step="0.01" bind:value={form.comissao_produto_meta_pct} class="vtur-input w-full" />
        </div>
      </div>
    {/if}

    <div>
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" bind:checked={form.ativo} class="rounded border-slate-300" />
        Tipo ativo
      </label>
    </div>
  </div>
</Dialog>
