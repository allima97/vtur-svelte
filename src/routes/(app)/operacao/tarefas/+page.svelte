<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { toast } from '$lib/stores/ui';
  import {
    Archive,
    FolderKanban,
    Layers3,
    List,
    Loader2,
    Plus,
    Search,
    SquareCheckBig,
    Tag
  } from 'lucide-svelte';

  type TodoStatus = 'novo' | 'agendado' | 'em_andamento' | 'concluido';
  type VisibleTodoStatus = 'novo' | 'agendado' | 'em_andamento';
  type TodoPrioridade = 'alta' | 'media' | 'baixa';
  type ViewMode = 'kanban' | 'lista';

  type TodoCategoria = {
    id: string;
    nome: string;
    cor: string | null;
  };

  type TodoItem = {
    id: string;
    titulo: string;
    descricao: string | null;
    done: boolean;
    categoria_id: string | null;
    prioridade: TodoPrioridade;
    status: TodoStatus;
    arquivo: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  type TodoItemEnriched = TodoItem & {
    visibleStatus: VisibleTodoStatus;
    categoriaNome: string;
    categoriaCor: string;
    prioridadeLabel: string;
    prioridadeBadge: 'red' | 'yellow' | 'green';
    statusLabel: string;
    createdAtLabel: string;
    updatedAtLabel: string;
    searchBlob: string;
  };

  const STATUS_COLUMNS: Array<{
    value: VisibleTodoStatus;
    label: string;
    colorClass: string;
    bodyClass: string;
  }> = [
    { value: 'novo', label: 'A Fazer', colorClass: 'bg-blue-600 text-white', bodyClass: 'bg-blue-50/70' },
    { value: 'agendado', label: 'Fazendo', colorClass: 'bg-amber-500 text-white', bodyClass: 'bg-amber-50/80' },
    { value: 'em_andamento', label: 'Feito', colorClass: 'bg-emerald-600 text-white', bodyClass: 'bg-emerald-50/80' }
  ];

  const PRIORITY_OPTIONS: Array<{ value: TodoPrioridade; label: string }> = [
    { value: 'alta', label: 'Alta' },
    { value: 'media', label: 'Media' },
    { value: 'baixa', label: 'Baixa' }
  ];

  const CATEGORY_PALETTE = [
    '#d1007a',
    '#7a008f',
    '#d97706',
    '#d02a1e',
    '#facc15',
    '#2e7d32',
    '#2d9cdb',
    '#1e3a8a'
  ];

  const listColumns = [
    { key: 'titulo', label: 'Assunto', sortable: true },
    { key: 'categoriaNome', label: 'Categoria', sortable: true },
    { key: 'prioridadeLabel', label: 'Prioridade', sortable: true },
    { key: 'statusLabel', label: 'Situacao', sortable: true },
    { key: 'updatedAtLabel', label: 'Atualizacao', sortable: true }
  ];

  const archivedColumns = [
    { key: 'titulo', label: 'Assunto', sortable: true },
    { key: 'categoriaNome', label: 'Categoria', sortable: true },
    { key: 'prioridadeLabel', label: 'Prioridade', sortable: true },
    { key: 'updatedAtLabel', label: 'Arquivada/Atualizada', sortable: true }
  ];

  const defaultTaskForm = () => ({
    titulo: '',
    descricao: '',
    categoria_id: '',
    prioridade: 'media' as TodoPrioridade,
    status: 'novo' as TodoStatus
  });

  const defaultCategoryForm = () => ({
    nome: '',
    cor: CATEGORY_PALETTE[0]
  });

  let loading = true;
  let errorMessage: string | null = null;
  let categorias: TodoCategoria[] = [];
  let itens: TodoItem[] = [];
  let viewMode: ViewMode = 'kanban';
  let searchQuery = '';
  let filtroStatus = 'todas';
  let filtroPrioridade = 'todas';
  let filtroCategoria = 'todas';
  let archivedExpanded = false;

  let taskModalOpen = false;
  let taskLoading = false;
  let taskSaving = false;
  let selectedTaskId: string | null = null;
  let taskForm = defaultTaskForm();
  let taskMeta = {
    arquivo: null as string | null,
    created_at: null as string | null,
    updated_at: null as string | null
  };

  let categoryModalOpen = false;
  let categorySaving = false;
  let selectedCategoryId: string | null = null;
  let categoryForm = defaultCategoryForm();
  let selectedCategoryLinkedCount = 0;

  function normalizeVisibleStatus(status: TodoStatus): VisibleTodoStatus {
    if (status === 'agendado') return 'agendado';
    if (status === 'em_andamento' || status === 'concluido') return 'em_andamento';
    return 'novo';
  }

  function formatDateTime(value?: string | null) {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getPriorityLabel(value: TodoPrioridade) {
    return PRIORITY_OPTIONS.find((item) => item.value === value)?.label || 'Media';
  }

  function getPriorityBadge(value: TodoPrioridade) {
    if (value === 'alta') return 'red';
    if (value === 'baixa') return 'green';
    return 'yellow';
  }

  function getStatusLabel(value: VisibleTodoStatus) {
    return STATUS_COLUMNS.find((item) => item.value === value)?.label || 'A Fazer';
  }

  function getCategoryColor(categoriaId: string | null) {
    return categorias.find((item) => item.id === categoriaId)?.cor || '#cbd5e1';
  }

  function getCategoryName(categoriaId: string | null) {
    return categorias.find((item) => item.id === categoriaId)?.nome || 'Sem categoria';
  }

  function textColorFor(background: string) {
    const hex = String(background || '').replace('#', '');
    const normalized = hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex;
    const numeric = Number.parseInt(normalized, 16);
    const r = (numeric >> 16) & 255;
    const g = (numeric >> 8) & 255;
    const b = numeric & 255;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? '#0f172a' : '#f8fafc';
  }

  async function loadBoard() {
    loading = true;
    errorMessage = null;

    try {
      const response = await fetch('/api/v1/todo/board', { credentials: 'same-origin' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao carregar tarefas.');
      }

      categorias = Array.isArray(payload?.categorias) ? payload.categorias : [];
      itens = Array.isArray(payload?.itens) ? payload.itens : [];
    } catch (error) {
      console.error(error);
      errorMessage = error instanceof Error ? error.message : 'Erro ao carregar tarefas.';
      categorias = [];
      itens = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadBoard();
  });

  $: enrichedItems = itens
    .map((item) => {
      const visibleStatus = normalizeVisibleStatus(item.status);
      const categoriaNome = getCategoryName(item.categoria_id);
      const categoriaCor = getCategoryColor(item.categoria_id);
      const prioridadeLabel = getPriorityLabel(item.prioridade);
      const statusLabel = getStatusLabel(visibleStatus);
      const createdAtLabel = formatDateTime(item.created_at);
      const updatedAtLabel = formatDateTime(item.updated_at || item.created_at);

      const enriched: TodoItemEnriched = {
        ...item,
        visibleStatus,
        categoriaNome,
        categoriaCor,
        prioridadeLabel,
        prioridadeBadge: getPriorityBadge(item.prioridade),
        statusLabel,
        createdAtLabel,
        updatedAtLabel,
        searchBlob: [
          item.titulo,
          item.descricao || '',
          categoriaNome,
          prioridadeLabel,
          statusLabel
        ]
          .join(' ')
          .toLowerCase()
      };

      return enriched;
    })
    .sort((left, right) => {
      const statusOrder = STATUS_COLUMNS.findIndex((item) => item.value === left.visibleStatus) -
        STATUS_COLUMNS.findIndex((item) => item.value === right.visibleStatus);
      if (statusOrder !== 0) return statusOrder;

      const priorityOrder = (value: TodoPrioridade) => {
        if (value === 'alta') return 0;
        if (value === 'media') return 1;
        return 2;
      };

      const diff = priorityOrder(left.prioridade) - priorityOrder(right.prioridade);
      if (diff !== 0) return diff;

      return String(right.created_at || '').localeCompare(String(left.created_at || ''));
    });

  function matchesFilters(item: TodoItemEnriched) {
    const query = searchQuery.trim().toLowerCase();
    if (query && !item.searchBlob.includes(query)) return false;
    if (filtroStatus !== 'todas' && item.visibleStatus !== filtroStatus) return false;
    if (filtroPrioridade !== 'todas' && item.prioridade !== filtroPrioridade) return false;
    if (filtroCategoria !== 'todas' && (item.categoria_id || 'sem_categoria') !== filtroCategoria) return false;
    return true;
  }

  $: activeItems = enrichedItems.filter((item) => !item.arquivo && matchesFilters(item));
  $: archivedItems = enrichedItems.filter((item) => Boolean(item.arquivo) && matchesFilters(item));
  $: statusGroups = STATUS_COLUMNS.map((column) => ({
    ...column,
    items: activeItems.filter((item) => item.visibleStatus === column.value)
  }));

  $: resumo = {
    ativos: enrichedItems.filter((item) => !item.arquivo).length,
    aFazer: enrichedItems.filter((item) => !item.arquivo && item.visibleStatus === 'novo').length,
    fazendo: enrichedItems.filter((item) => !item.arquivo && item.visibleStatus === 'agendado').length,
    feitos: enrichedItems.filter((item) => !item.arquivo && item.visibleStatus === 'em_andamento').length,
    arquivadas: enrichedItems.filter((item) => Boolean(item.arquivo)).length
  };

  function resetTaskModal() {
    selectedTaskId = null;
    taskForm = defaultTaskForm();
    taskMeta = { arquivo: null, created_at: null, updated_at: null };
    taskLoading = false;
  }

  function resetCategoryModal() {
    selectedCategoryId = null;
    categoryForm = defaultCategoryForm();
    selectedCategoryLinkedCount = 0;
  }

  function openNewTask() {
    resetTaskModal();
    taskModalOpen = true;
  }

  async function openTask(taskId: string) {
    taskModalOpen = true;
    taskLoading = true;
    selectedTaskId = taskId;

    try {
      const response = await fetch(`/api/v1/todo/item/${taskId}`, { credentials: 'same-origin' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao carregar tarefa.');
      }

      const item = payload?.item as TodoItem | undefined;
      if (!item) {
        throw new Error('Tarefa nao encontrada.');
      }

      taskForm = {
        titulo: item.titulo || '',
        descricao: item.descricao || '',
        categoria_id: item.categoria_id || '',
        prioridade: item.prioridade || 'media',
        status: item.status || 'novo'
      };
      taskMeta = {
        arquivo: item.arquivo || null,
        created_at: item.created_at || null,
        updated_at: item.updated_at || null
      };
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar tarefa.');
      taskModalOpen = false;
      resetTaskModal();
    } finally {
      taskLoading = false;
    }
  }

  async function saveTask() {
    if (!taskForm.titulo.trim()) {
      toast.error('Informe o titulo da tarefa.');
      return;
    }

    taskSaving = true;
    try {
      const response = await fetch('/api/v1/todo/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: selectedTaskId || undefined,
          titulo: taskForm.titulo,
          descricao: taskForm.descricao || null,
          categoria_id: taskForm.categoria_id || null,
          prioridade: taskForm.prioridade,
          status: taskForm.status
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao salvar tarefa.');
      }

      toast.success(selectedTaskId ? 'Tarefa atualizada.' : 'Tarefa criada.');
      taskModalOpen = false;
      resetTaskModal();
      await loadBoard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar tarefa.');
    } finally {
      taskSaving = false;
    }
  }

  async function archiveCurrentTask() {
    if (!selectedTaskId) return;
    const action = taskMeta.arquivo ? 'restore' : 'archive';
    const label = taskMeta.arquivo ? 'restaurar' : 'arquivar';

    if (!window.confirm(`Deseja ${label} esta tarefa?`)) return;

    try {
      const response = await fetch('/api/v1/todo/item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: selectedTaskId,
          action
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Erro ao ${label} tarefa.`);
      }

      toast.success(taskMeta.arquivo ? 'Tarefa restaurada.' : 'Tarefa arquivada.');
      taskModalOpen = false;
      resetTaskModal();
      await loadBoard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar tarefa.');
    }
  }

  async function deleteCurrentTask() {
    if (!selectedTaskId) return;
    if (!window.confirm('Deseja excluir esta tarefa?')) return;

    try {
      const response = await fetch(`/api/v1/todo/item?id=${selectedTaskId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao excluir tarefa.');
      }

      toast.success('Tarefa excluida.');
      taskModalOpen = false;
      resetTaskModal();
      await loadBoard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir tarefa.');
    }
  }

  function openNewCategory() {
    resetCategoryModal();
    categoryModalOpen = true;
  }

  function openCategory(category: TodoCategoria) {
    selectedCategoryId = category.id;
    categoryForm = {
      nome: category.nome,
      cor: category.cor || CATEGORY_PALETTE[0]
    };
    selectedCategoryLinkedCount = itens.filter((item) => item.categoria_id === category.id).length;
    categoryModalOpen = true;
  }

  async function saveCategory() {
    if (!categoryForm.nome.trim()) {
      toast.error('Informe o nome da categoria.');
      return;
    }

    categorySaving = true;
    try {
      const response = await fetch('/api/v1/todo/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: selectedCategoryId || undefined,
          nome: categoryForm.nome,
          cor: categoryForm.cor
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao salvar categoria.');
      }

      toast.success(selectedCategoryId ? 'Categoria atualizada.' : 'Categoria criada.');
      categoryModalOpen = false;
      resetCategoryModal();
      await loadBoard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar categoria.');
    } finally {
      categorySaving = false;
    }
  }

  async function deleteCurrentCategory() {
    if (!selectedCategoryId) return;
    if (selectedCategoryLinkedCount > 0) {
      toast.error('Remova as tarefas vinculadas antes de excluir a categoria.');
      return;
    }
    if (!window.confirm('Deseja excluir esta categoria?')) return;

    try {
      const response = await fetch(`/api/v1/todo/category?id=${selectedCategoryId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao excluir categoria.');
      }

      toast.success('Categoria excluida.');
      categoryModalOpen = false;
      resetCategoryModal();
      await loadBoard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir categoria.');
    }
  }

  function clearFilters() {
    searchQuery = '';
    filtroStatus = 'todas';
    filtroPrioridade = 'todas';
    filtroCategoria = 'todas';
  }
</script>

<svelte:head>
  <title>Tarefas | VTUR</title>
</svelte:head>

<PageHeader
  title="Tarefas"
  subtitle="Crie, categorize e acompanhe suas tarefas no board operacional do legado."
  color="operacao"
  breadcrumbs={[
    { label: 'Operacao', href: '/operacao' },
    { label: 'Tarefas' }
  ]}
  actions={[
    { label: 'Nova categoria', onClick: openNewCategory, variant: 'secondary', icon: Tag },
    { label: 'Nova tarefa', onClick: openNewTask, variant: 'primary', icon: Plus }
  ]}
/>

<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
  <KPICard title="Ativas" value={resumo.ativos} color="operacao" icon={SquareCheckBig} />
  <KPICard title="A Fazer" value={resumo.aFazer} color="operacao" icon={List} />
  <KPICard title="Fazendo" value={resumo.fazendo} color="operacao" icon={FolderKanban} />
  <KPICard title="Feitas" value={resumo.feitos} color="operacao" icon={Layers3} />
  <KPICard title="Arquivadas" value={resumo.arquivadas} color="operacao" icon={Archive} />
</div>

<Card color="operacao" class="mb-6">
  <div class="grid grid-cols-1 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))] gap-4">
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1" for="todo-search">Busca</label>
      <div class="relative">
        <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="todo-search"
          bind:value={searchQuery}
          class="vtur-input w-full pl-9"
          placeholder="Titulo, descricao, categoria ou prioridade"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1" for="todo-status">Coluna</label>
      <select id="todo-status" bind:value={filtroStatus} class="vtur-input w-full">
        <option value="todas">Todas</option>
        {#each STATUS_COLUMNS as column}
          <option value={column.value}>{column.label}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1" for="todo-priority">Prioridade</label>
      <select id="todo-priority" bind:value={filtroPrioridade} class="vtur-input w-full">
        <option value="todas">Todas</option>
        {#each PRIORITY_OPTIONS as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1" for="todo-category">Categoria</label>
      <select id="todo-category" bind:value={filtroCategoria} class="vtur-input w-full">
        <option value="todas">Todas</option>
        <option value="sem_categoria">Sem categoria</option>
        {#each categorias as categoria}
          <option value={categoria.id}>{categoria.nome}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1" for="todo-view">Visualizacao</label>
      <div class="flex gap-2">
        <button
          id="todo-view"
          type="button"
          class="flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors {viewMode === 'kanban' ? 'border-operacao-300 bg-operacao-50 text-operacao-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}"
          on:click={() => (viewMode = 'kanban')}
        >
          Kanban
        </button>
        <button
          type="button"
          class="flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors {viewMode === 'lista' ? 'border-operacao-300 bg-operacao-50 text-operacao-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}"
          on:click={() => (viewMode = 'lista')}
        >
          Lista
        </button>
      </div>
    </div>
  </div>

  <div class="mt-4 flex flex-wrap gap-2">
    <Button variant="ghost" size="sm" on:click={clearFilters}>Limpar filtros</Button>
    <Button variant="secondary" size="sm" on:click={loadBoard}>Atualizar board</Button>
  </div>
</Card>

<Card color="operacao" class="mb-6">
  <div class="flex items-center justify-between gap-3 mb-4">
    <div>
      <h3 class="text-lg font-semibold text-slate-900">Categorias</h3>
      <p class="text-sm text-slate-500">Mesmo fluxo do legado: categorias por usuario para organizar o board.</p>
    </div>
    <Button variant="secondary" size="sm" on:click={openNewCategory}>
      <Plus size={14} class="mr-1.5" />
      Nova categoria
    </Button>
  </div>

  {#if categorias.length === 0}
    <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
      Nenhuma categoria cadastrada. Crie categorias para agrupar tarefas como no board do `vtur-app`.
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {#each categorias as categoria}
        <button
          type="button"
          class="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-operacao-200 hover:shadow-md"
          on:click={() => openCategory(categoria)}
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="inline-block h-4 w-4 rounded-full border border-white/30"
                style="background:{categoria.cor || '#cbd5e1'}"
              ></span>
              <div class="min-w-0">
                <h4 class="font-semibold text-slate-900 truncate">{categoria.nome}</h4>
                <p class="text-xs text-slate-500">Clique para editar cor e nome</p>
              </div>
            </div>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {itens.filter((item) => item.categoria_id === categoria.id).length}
            </span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</Card>

<Card color="operacao" class="mb-6" padding="none">
  <div class="border-b border-slate-100 px-5 py-4">
    <h3 class="text-lg font-semibold text-slate-900">Board de tarefas</h3>
    <p class="text-sm text-slate-500">
      {#if viewMode === 'kanban'}
        Clique no card para abrir o registro e editar status, prioridade, categoria e arquivo.
      {:else}
        Clique na linha para abrir a tarefa, sem botoes por linha.
      {/if}
    </p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 size={20} class="animate-spin" />
      Carregando board...
    </div>
  {:else if errorMessage}
    <div class="px-5 py-8 text-sm text-red-600">{errorMessage}</div>
  {:else if activeItems.length === 0}
    <div class="px-5 py-12 text-center text-slate-500">
      Nenhuma tarefa ativa encontrada com os filtros atuais.
    </div>
  {:else if viewMode === 'lista'}
    <div class="p-5">
      <DataTable
        columns={listColumns}
        data={activeItems}
        color="operacao"
        loading={false}
        searchable={false}
        filterable={false}
        exportable={false}
        onRowClick={(row) => openTask(row.id)}
        emptyMessage="Nenhuma tarefa encontrada"
      />
    </div>
  {:else}
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 p-5">
      {#each statusGroups as group}
        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 {group.colorClass}">
            <div>
              <h4 class="font-semibold">{group.label}</h4>
              <p class="text-xs text-white/80">{group.items.length} tarefa(s)</p>
            </div>
          </div>

          <div class="p-3 space-y-3 min-h-[14rem] {group.bodyClass}">
            {#if group.items.length === 0}
              <div class="rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                Nenhum item nesta coluna.
              </div>
            {:else}
              {#each group.items as item}
                <button
                  type="button"
                  class="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-operacao-200 hover:shadow-md"
                  on:click={() => openTask(item.id)}
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h5 class="font-semibold text-slate-900 truncate">{item.titulo}</h5>
                      <div class="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                          style="background:{item.categoriaCor}; color:{textColorFor(item.categoriaCor)}"
                        >
                          {item.categoriaNome}
                        </span>
                        <Badge color={item.prioridadeBadge} size="sm">{item.prioridadeLabel}</Badge>
                      </div>
                    </div>
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {item.updatedAtLabel}
                    </span>
                  </div>

                  {#if item.descricao}
                    <p class="mt-3 line-clamp-2 text-sm text-slate-600">{item.descricao}</p>
                  {/if}
                </button>
              {/each}
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</Card>

<Card color="operacao">
  <button
    type="button"
    class="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
    on:click={() => (archivedExpanded = !archivedExpanded)}
  >
    <div>
      <h3 class="font-semibold text-slate-900">Arquivadas</h3>
      <p class="text-sm text-slate-500">Mesmo comportamento do board legado para restaurar historico de tarefas.</p>
    </div>
    <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
      {archivedItems.length}
    </span>
  </button>

  {#if archivedExpanded}
    <div class="mt-4">
      <DataTable
        columns={archivedColumns}
        data={archivedItems}
        color="operacao"
        loading={false}
        searchable={false}
        filterable={false}
        exportable={false}
        onRowClick={(row) => openTask(row.id)}
        emptyMessage="Nenhuma tarefa arquivada encontrada"
      />
    </div>
  {/if}
</Card>

<Dialog
  bind:open={taskModalOpen}
  title={selectedTaskId ? 'Detalhe da tarefa' : 'Nova tarefa'}
  color="operacao"
  size="lg"
  showCancel={true}
  cancelText="Fechar"
  showConfirm={!taskLoading}
  confirmText={selectedTaskId ? 'Salvar alteracoes' : 'Criar tarefa'}
  loading={taskSaving}
  onCancel={() => {
    taskModalOpen = false;
    resetTaskModal();
  }}
  onConfirm={saveTask}
>
  {#if taskLoading}
    <div class="flex items-center justify-center gap-3 py-10 text-slate-500">
      <Loader2 size={18} class="animate-spin" />
      Carregando tarefa...
    </div>
  {:else}
    <div class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1" for="task-title">Titulo</label>
          <input id="task-title" bind:value={taskForm.titulo} class="vtur-input w-full" placeholder="Descreva a tarefa" />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1" for="task-description">Descricao</label>
          <textarea
            id="task-description"
            bind:value={taskForm.descricao}
            class="vtur-input w-full"
            rows="4"
            placeholder="Observacoes da tarefa"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1" for="task-category">Categoria</label>
          <select id="task-category" bind:value={taskForm.categoria_id} class="vtur-input w-full">
            <option value="">Sem categoria</option>
            {#each categorias as categoria}
              <option value={categoria.id}>{categoria.nome}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1" for="task-priority">Prioridade</label>
          <select id="task-priority" bind:value={taskForm.prioridade} class="vtur-input w-full">
            {#each PRIORITY_OPTIONS as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1" for="task-status">Status</label>
          <select id="task-status" bind:value={taskForm.status} class="vtur-input w-full">
            <option value="novo">A Fazer</option>
            <option value="agendado">Fazendo</option>
            <option value="em_andamento">Feito</option>
            <option value="concluido">Concluido</option>
          </select>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p class="text-sm font-medium text-slate-700">Fluxo atual</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <Badge color={getPriorityBadge(taskForm.prioridade)} size="sm">{getPriorityLabel(taskForm.prioridade)}</Badge>
            <Badge color="operacao" size="sm">{getStatusLabel(normalizeVisibleStatus(taskForm.status))}</Badge>
            {#if taskMeta.arquivo}
              <Badge color="gray" size="sm">Arquivada</Badge>
            {/if}
          </div>
        </div>
      </div>

      {#if selectedTaskId}
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <h4 class="text-sm font-semibold text-slate-900 mb-2">Historico do registro</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
            <div>
              <span class="block text-xs uppercase tracking-wide text-slate-400">Criada em</span>
              <strong class="text-slate-900">{formatDateTime(taskMeta.created_at)}</strong>
            </div>
            <div>
              <span class="block text-xs uppercase tracking-wide text-slate-400">Ultima atualizacao</span>
              <strong class="text-slate-900">{formatDateTime(taskMeta.updated_at || taskMeta.created_at)}</strong>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <svelte:fragment slot="actions">
    {#if selectedTaskId && !taskLoading}
      <Button variant="ghost" on:click={archiveCurrentTask}>
        {#if taskMeta.arquivo}
          Restaurar
        {:else}
          Arquivar
        {/if}
      </Button>
      <Button variant="danger" on:click={deleteCurrentTask}>Excluir</Button>
    {/if}
  </svelte:fragment>
</Dialog>

<Dialog
  bind:open={categoryModalOpen}
  title={selectedCategoryId ? 'Editar categoria' : 'Nova categoria'}
  color="operacao"
  showCancel={true}
  cancelText="Fechar"
  showConfirm={false}
  loading={categorySaving}
  onCancel={() => {
    categoryModalOpen = false;
    resetCategoryModal();
  }}
>
  <div class="space-y-5">
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1" for="category-name">Nome</label>
      <input id="category-name" bind:value={categoryForm.nome} class="vtur-input w-full" placeholder="Nome da categoria" />
    </div>

    <div>
      <p class="block text-sm font-medium text-slate-700 mb-2">Cor</p>
      <div class="grid grid-cols-4 gap-2">
        {#each CATEGORY_PALETTE as color}
          <button
            type="button"
            class="h-10 rounded-xl border transition {categoryForm.cor === color ? 'border-slate-900 ring-2 ring-slate-200' : 'border-slate-200'}"
            style="background:{color}"
            on:click={() => (categoryForm.cor = color)}
            aria-label={`Selecionar cor ${color}`}
          ></button>
        {/each}
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p class="text-sm font-medium text-slate-700">Vinculos atuais</p>
      <p class="mt-1 text-sm text-slate-600">
        {selectedCategoryLinkedCount} tarefa(s) vinculada(s) a esta categoria.
      </p>
    </div>
  </div>

  <svelte:fragment slot="actions">
    <Button variant="primary" loading={categorySaving} on:click={saveCategory}>
      {#if selectedCategoryId}
        Salvar categoria
      {:else}
        Criar categoria
      {/if}
    </Button>
    {#if selectedCategoryId}
      <Button variant="danger" on:click={deleteCurrentCategory}>Excluir</Button>
    {/if}
  </svelte:fragment>
</Dialog>
