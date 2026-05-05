<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { buildVturInputClasses } from '$lib/components/ui/inputContract';
  import { toast } from '$lib/stores/ui';
  import { BottomSheet, FieldInput, FieldSelect } from '$lib/components/ui';
  import { apiDelete, apiGet, apiPost } from '$lib/services/api';
  import { Plus, Trash2, RefreshCw, Search, SlidersHorizontal } from 'lucide-svelte';
  import { escapeHtml } from '$lib/utils/html';

  import { confirmAction } from '$lib/stores/confirm';
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
  let modalSubdivisoes: Subdivisao[] = [];
  let loading = true;
  let loadingSubdivisoes = true;
  let loadingModalSubdivisoes = false;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;
  let busca = '';
  let buscaSubdivisao = '';
  let filtroSubdivisao = '';
  let totalCidades = 0;
  let autoReloadEnabled = false;
  let lastAutoReloadKey = '';
  let autoReloadTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSubdivisoesKey = '';
  let subdivisoesReloadTimer: ReturnType<typeof setTimeout> | null = null;
  let showFilterSheet = false;

  let form = { nome: '', subdivisao_id: '', descricao: '' };
  const searchInputClasses = buildVturInputClasses('w-full', 'pl-10', 'text-sm', 'focus:ring-blue-200');
  const subdivisaoSearchInputClasses = buildVturInputClasses('w-full', 'text-sm', 'focus:ring-blue-200');
  const modalSubdivisaoSelectLabel = 'Selecione um estado/província';

  const columns = [
    { key: 'nome', label: 'Cidade', sortable: true },
    {
      key: 'subdivisao',
      label: 'Estado/Província',
      sortable: false,
      formatter: (_: any, row: Cidade) => {
        const sub = row.subdivisao?.nome || '-';
        const pais = row.subdivisao?.pais?.nome || '';
        return `<span>${pais ? `${escapeHtml(sub)} · ${escapeHtml(pais)}` : escapeHtml(sub)}</span>`;
      }
    },
    { key: 'descricao', label: 'Descrição', sortable: false, formatter: (v: string | null) => `<span>${escapeHtml(v || '-')}</span>` }
  ];

  async function loadSubdivisoes() {
    const term = buscaSubdivisao.trim();
    if (term.length < 2) {
      subdivisoes = [];
      loadingSubdivisoes = false;
      return;
    }

    loadingSubdivisoes = true;
    try {
      const payload = await apiGet<any>('/api/v1/subdivisoes', { q: term, page: 1, pageSize: 200 });
      subdivisoes = Array.isArray(payload?.items) ? payload.items : [];
    } catch {
      subdivisoes = [];
    } finally {
      loadingSubdivisoes = false;
    }
  }

  async function loadModalSubdivisoes() {
    if (loadingModalSubdivisoes || modalSubdivisoes.length > 0) {
      return;
    }

    loadingModalSubdivisoes = true;
    try {
      const payload = await apiGet<any>('/api/v1/subdivisoes', { page: 1, pageSize: 5000 });
      modalSubdivisoes = Array.isArray(payload?.items) ? payload.items : [];
    } catch {
      modalSubdivisoes = [];
    } finally {
      loadingModalSubdivisoes = false;
    }
  }

  async function load() {
    const term = busca.trim();
    const hasCityTerm = term.length >= 2;
    const hasSubdivisaoFilter = Boolean(filtroSubdivisao);

    if (!hasCityTerm && !hasSubdivisaoFilter) {
      cidades = [];
      totalCidades = 0;
      loading = false;
      return;
    }

    loading = true;
    try {
      const payload = await apiGet<any>('/api/v1/cidades', {
        q: hasCityTerm ? term : undefined,
        subdivisao_id: hasSubdivisaoFilter ? filtroSubdivisao : undefined,
        page: 1,
        pageSize: 200
      });
      cidades = Array.isArray(payload?.items) ? payload.items : [];
      totalCidades = Number(payload?.total || cidades.length);
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
    void loadModalSubdivisoes();
  }

  function openEdit(c: Cidade) {
    editingId = c.id;
    form = { nome: c.nome, subdivisao_id: c.subdivisao_id || '', descricao: c.descricao || '' };
    modalOpen = true;
    void loadModalSubdivisoes();
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }
    saving = true;
    try {
      await apiPost('/api/v1/cidades', {
        id: editingId || undefined,
        nome: form.nome,
        subdivisao_id: form.subdivisao_id || null,
        descricao: form.descricao || null
      });
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
    if (!(await confirmAction('Deseja excluir esta cidade?'))) return;
    deletingId = id;
    try {
      await apiDelete('/api/v1/cidades', { id });
      toast.success('Cidade excluída.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      deletingId = '';
    }
  }

  onMount(() => {
    // Modo sob demanda: evita carregar a tabela inteira sem filtro.
    lastAutoReloadKey = buildAutoReloadKey();
    lastSubdivisoesKey = buildSubdivisoesKey();
    autoReloadEnabled = true;
    void load();
    void loadSubdivisoes();
  });

  onDestroy(() => {
    if (autoReloadTimer) clearTimeout(autoReloadTimer);
    if (subdivisoesReloadTimer) clearTimeout(subdivisoesReloadTimer);
  });

  function buildAutoReloadKey() {
    return [busca.trim(), filtroSubdivisao].join('|');
  }

  function buildSubdivisoesKey() {
    return buscaSubdivisao.trim();
  }

  function scheduleAutoReload() {
    if (autoReloadTimer) clearTimeout(autoReloadTimer);
    autoReloadTimer = setTimeout(() => {
      void load();
    }, 300);
  }

  function scheduleSubdivisoesReload() {
    if (subdivisoesReloadTimer) clearTimeout(subdivisoesReloadTimer);
    subdivisoesReloadTimer = setTimeout(() => {
      void loadSubdivisoes();
    }, 300);
  }

  $: autoReloadKey = buildAutoReloadKey();
  $: if (autoReloadEnabled && autoReloadKey !== lastAutoReloadKey) {
    lastAutoReloadKey = autoReloadKey;
    scheduleAutoReload();
  }

  $: subdivisoesKey = buildSubdivisoesKey();
  $: if (autoReloadEnabled && subdivisoesKey !== lastSubdivisoesKey) {
    lastSubdivisoesKey = subdivisoesKey;
    scheduleSubdivisoesReload();
  }
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

<!-- Mobile: botão de filtros -->
<div class="mb-4 sm:hidden">
  <Button variant="secondary" class_name="w-full" on:click={() => (showFilterSheet = true)}>
    <SlidersHorizontal size={16} class="mr-2" />
    Filtros
    {#if busca.trim() || filtroSubdivisao}
      <span class="ml-2 inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
    {/if}
  </Button>
</div>

<Card class="mb-6 hidden sm:block">
  <div class="flex flex-wrap gap-4 items-end">
    <div class="relative flex-1 min-w-[200px]">
      <Search size={16} class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
      <input
        bind:value={busca}
        class={searchInputClasses}
        placeholder="Buscar cidade..."
        on:input={scheduleAutoReload}
      />
    </div>
    <FieldSelect
      id="cid-sub"
      label="Estado/Província"
      bind:value={filtroSubdivisao}
      options={[
        { value: '', label: 'Todos' },
        ...subdivisoes.map((s) => ({ value: s.id, label: s.nome }))
      ]}
      placeholder={null}
      disabled={loadingSubdivisoes || buscaSubdivisao.trim().length < 2}
    />
    <div class="min-w-[260px]">
      <label for="cid-sub-search" class="mb-1.5 block text-sm font-medium text-slate-700">Buscar Estado/Província</label>
      <input
        id="cid-sub-search"
        bind:value={buscaSubdivisao}
        class={subdivisaoSearchInputClasses}
        placeholder="Digite 2+ letras para carregar estados..."
        on:input={scheduleSubdivisoesReload}
      />
    </div>
  </div>
</Card>

<BottomSheet bind:open={showFilterSheet} title="Filtrar Cidades">
  <div class="space-y-4">
    <div class="relative w-full">
      <Search size={16} class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
      <input
        id="cid-busca-mobile"
        bind:value={busca}
        class={buildVturInputClasses('w-full', 'pl-10', 'text-sm', 'focus:ring-blue-200')}
        placeholder="Buscar cidade..."
        on:input={scheduleAutoReload}
      />
    </div>
    <FieldSelect
      id="cid-sub-mobile"
      label="Estado/Província"
      bind:value={filtroSubdivisao}
      options={[
        { value: '', label: 'Todos' },
        ...subdivisoes.map((s) => ({ value: s.id, label: s.nome }))
      ]}
      placeholder={null}
      class_name="w-full"
      disabled={loadingSubdivisoes || buscaSubdivisao.trim().length < 2}
    />
    <div class="w-full">
      <label for="cid-sub-search-mobile" class="mb-1.5 block text-sm font-medium text-slate-700">Buscar Estado/Província</label>
      <input
        id="cid-sub-search-mobile"
        bind:value={buscaSubdivisao}
        class={buildVturInputClasses('w-full', 'text-sm', 'focus:ring-blue-200')}
        placeholder="Digite 2+ letras para carregar estados..."
        on:input={scheduleSubdivisoesReload}
      />
    </div>
  </div>
  <Button variant="primary" class_name="w-full mt-2" on:click={() => (showFilterSheet = false)}>
    Aplicar filtros
  </Button>
</BottomSheet>

<DataTable {columns} data={cidades} {loading} title="Cidades cadastradas" searchable={false} emptyMessage="Nenhuma cidade encontrada"
  onRowClick={(row) => openEdit(row)}>
  <svelte:fragment slot="row-actions" let:row>
    <Button
      variant="ghost"
      size="sm"
      class_name="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
      disabled={deletingId === row.id}
      title="Excluir cidade"
      ariaLabel="Excluir cidade"
      on:click={(event) => {
        event.stopPropagation();
        deleteCidade(row.id);
      }}
    >
      <Trash2 size={15} />
    </Button>
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
      options={loadingModalSubdivisoes
        ? [{ value: '', label: 'Carregando estados...' }]
        : [{ value: '', label: modalSubdivisaoSelectLabel }, ...modalSubdivisoes.map((s) => ({ value: s.id, label: s.nome }))]}
      placeholder={null}
      class_name="w-full"
      disabled={loadingModalSubdivisoes}
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
