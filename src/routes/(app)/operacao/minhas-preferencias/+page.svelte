<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { FieldInput, FieldSelect, FieldTextarea } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { Plus, Trash2, RefreshCw, Star, Search } from 'lucide-svelte';

  type Preferencia = {
    id: string;
    tipo_produto_id: string | null;
    cidade_id: string | null;
    nome: string;
    localizacao: string | null;
    classificacao: string | null;
    observacao: string | null;
    created_at: string | null;
    cidade?: { id: string; nome: string } | null;
    tipo_produto?: { id: string; nome: string } | null;
  };

  type TipoProduto = { id: string; nome: string; tipo?: string | null };

  let preferencias: Preferencia[] = [];
  let tipos: TipoProduto[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;
  let cidadeBusca = '';
  let cidadeResultados: any[] = [];
  let buscandoCidade = false;
  let cidadeTimer: ReturnType<typeof setTimeout> | null = null;

  let form = createForm();

  function createForm() {
    return {
      tipo_produto_id: '',
      cidade_id: '',
      cidade_nome: '',
      nome: '',
      localizacao: '',
      classificacao: '',
      observacao: ''
    };
  }

  const CLASSIFICACOES = ['A', 'B', 'C', 'D', 'E'];

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    {
      key: 'tipo_produto',
      label: 'Tipo',
      sortable: false,
      formatter: (_: any, row: Preferencia) => row.tipo_produto?.nome || '-'
    },
    {
      key: 'cidade',
      label: 'Cidade',
      sortable: false,
      formatter: (_: any, row: Preferencia) => row.cidade?.nome || '-'
    },
    {
      key: 'localizacao',
      label: 'Localização',
      sortable: true,
      formatter: (v: string | null) => v || '-'
    },
    {
      key: 'classificacao',
      label: 'Classif.',
      sortable: true,
      width: '90px',
      formatter: (v: string | null) =>
        v ? `<span class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">${v}</span>` : '-'
    }
  ];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/operacao/preferencias');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      preferencias = payload.items || [];
      tipos = payload.tipos || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar preferências.');
    } finally {
      loading = false;
    }
  }

  async function buscarCidade(q: string) {
    if (q.length < 2) { cidadeResultados = []; return; }
    buscandoCidade = true;
    try {
      const response = await fetch(`/api/v1/vendas/cidades-busca?q=${encodeURIComponent(q)}&limite=10`);
      if (response.ok) {
        const payload = await response.json();
        cidadeResultados = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
      }
    } catch {} finally {
      buscandoCidade = false;
    }
  }

  function onCidadeInput() {
    if (cidadeTimer) clearTimeout(cidadeTimer);
    cidadeTimer = setTimeout(() => buscarCidade(cidadeBusca), 300);
  }

  function selecionarCidade(cidade: any) {
    form.cidade_id = cidade.id;
    form.cidade_nome = cidade.subdivisao_nome ? `${cidade.nome} (${cidade.subdivisao_nome})` : cidade.nome;
    cidadeBusca = form.cidade_nome;
    cidadeResultados = [];
  }

  function openNew() {
    editingId = null;
    form = createForm();
    cidadeBusca = '';
    cidadeResultados = [];
    modalOpen = true;
  }

  function openEdit(p: Preferencia) {
    editingId = p.id;
    form = {
      tipo_produto_id: p.tipo_produto_id || '',
      cidade_id: p.cidade_id || '',
      cidade_nome: p.cidade?.nome || '',
      nome: p.nome,
      localizacao: p.localizacao || '',
      classificacao: p.classificacao || '',
      observacao: p.observacao || ''
    };
    cidadeBusca = p.cidade?.nome || '';
    cidadeResultados = [];
    modalOpen = true;
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }
    saving = true;
    try {
      const response = await fetch('/api/v1/operacao/preferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          tipo_produto_id: form.tipo_produto_id || null,
          cidade_id: form.cidade_id || null,
          nome: form.nome,
          localizacao: form.localizacao || null,
          classificacao: form.classificacao || null,
          observacao: form.observacao || null
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'Preferência atualizada.' : 'Preferência criada.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  async function deletePref(id: string) {
    if (!confirm('Deseja excluir esta preferência?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/operacao/preferencias?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Preferência excluída.');
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
  <title>Minhas Preferências | VTUR</title>
</svelte:head>

<PageHeader
  title="Minhas Preferências"
  subtitle="Cadastre seus destinos e produtos favoritos para agilizar a criação de orçamentos."
  color="operacao"
  breadcrumbs={[
    { label: 'Operação', href: '/operacao' },
    { label: 'Minhas Preferências' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    { label: 'Nova Preferência', onClick: openNew, variant: 'primary', icon: Plus }
  ]}
/>

<DataTable
  {columns}
  data={preferencias}
  color="operacao"
  {loading}
  title="Preferências cadastradas"
  searchable={true}
  emptyMessage="Nenhuma preferência cadastrada"
  onRowClick={(row) => openEdit(row)}
>
  <svelte:fragment slot="row-actions" let:row>
    <button on:click|stopPropagation={() => deletePref(row.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir" disabled={deletingId === row.id}>
      <Trash2 size={15} />
    </button>
  </svelte:fragment>
</DataTable>

<Dialog
  bind:open={modalOpen}
  title={editingId ? 'Editar Preferência' : 'Nova Preferência'}
  color="operacao"
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
      id="pref-nome"
      label="Nome"
      bind:value={form.nome}
      placeholder="Ex: Hotel Copacabana Palace"
      required={true}
      class_name="w-full"
    />
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FieldSelect
        id="pref-tipo"
        label="Tipo de Produto"
        bind:value={form.tipo_produto_id}
        options={tipos.map((t) => ({ value: t.id, label: t.nome }))}
        placeholder="Selecione uma opção"
        class_name="w-full"
      />
      <FieldSelect
        id="pref-classificacao"
        label="Classificação"
        bind:value={form.classificacao}
        options={CLASSIFICACOES.map((c) => ({ value: c, label: c }))}
        placeholder="Selecione uma opção"
        class_name="w-full"
      />
    </div>
    <div class="relative">
      <label class="mb-1 block text-sm font-medium text-slate-700" for="pref-cidade">Cidade</label>
      <div class="relative">
        <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="pref-cidade"
          bind:value={cidadeBusca}
          on:input={onCidadeInput}
          class="vtur-input w-full pl-9"
          placeholder="Buscar cidade..."
        />
      </div>
      {#if cidadeResultados.length > 0}
        <div class="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          {#each cidadeResultados as cidade}
            <button
              type="button"
              class="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              on:click={() => selecionarCidade(cidade)}
            >
              {cidade.nome}{#if cidade.subdivisao_nome}, {cidade.subdivisao_nome}{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <FieldInput
      id="pref-localizacao"
      label="Localização"
      bind:value={form.localizacao}
      placeholder="Endereço, bairro, referência..."
      class_name="w-full"
    />
    <FieldTextarea
      id="pref-obs"
      label="Observação"
      bind:value={form.observacao}
      rows={3}
      placeholder="Notas sobre este destino/produto..."
      class_name="w-full"
    />
  </div>
</Dialog>
