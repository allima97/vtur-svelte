<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { Plus, Pencil, Trash2, RefreshCw, Image, MessageSquare, Tag } from 'lucide-svelte';

  type Categoria = { id: string; nome: string; icone: string; sort_order: number; ativo: boolean };
  type Tema = { id: string; nome: string; categoria_id: string | null; asset_url: string; scope: string; ativo: boolean };
  type Template = { id: string; nome: string; categoria: string | null; titulo: string; corpo: string; scope: string; ativo: boolean };

  const SCOPE_OPTIONS = [
    { value: 'system', label: 'Sistema' },
    { value: 'master', label: 'Master' },
    { value: 'gestor', label: 'Gestor' },
    { value: 'user', label: 'Usuário' }
  ];

  let categorias: Categoria[] = [];
  let temas: Tema[] = [];
  let templates: Template[] = [];
  let loading = true;
  let activeTab: 'categorias' | 'temas' | 'templates' = 'templates';
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;
  let editingEntity: 'categoria' | 'tema' | 'template' = 'template';

  let formCategoria = { nome: '', icone: 'pi pi-tag', sort_order: 0, ativo: true };
  let formTema = { nome: '', categoria_id: '', asset_url: '', scope: 'system', ativo: true };
  let formTemplate = { nome: '', categoria: '', titulo: '', corpo: '', scope: 'user', ativo: true };

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/admin/crm');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      categorias = payload.categorias || [];
      temas = payload.temas || [];
      templates = payload.templates || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar CRM.');
    } finally {
      loading = false;
    }
  }

  async function saveEntity() {
    saving = true;
    try {
      const data = editingEntity === 'categoria' ? formCategoria
        : editingEntity === 'tema' ? { ...formTema, categoria_id: formTema.categoria_id || null }
        : { ...formTemplate, categoria: formTemplate.categoria || null };

      const response = await fetch('/api/v1/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: editingEntity, action: 'upsert', id: editingId || undefined, data })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'Atualizado.' : 'Criado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  async function deleteEntity(entity: string, id: string) {
    if (!confirm('Deseja excluir este item?')) return;
    deletingId = id;
    try {
      const response = await fetch('/api/v1/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, action: 'delete', id })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Excluído.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      deletingId = '';
    }
  }

  function openNew(entity: 'categoria' | 'tema' | 'template') {
    editingEntity = entity;
    editingId = null;
    if (entity === 'categoria') formCategoria = { nome: '', icone: 'pi pi-tag', sort_order: categorias.length, ativo: true };
    else if (entity === 'tema') formTema = { nome: '', categoria_id: '', asset_url: '', scope: 'system', ativo: true };
    else formTemplate = { nome: '', categoria: '', titulo: '', corpo: '', scope: 'user', ativo: true };
    modalOpen = true;
  }

  function openEdit(entity: 'categoria' | 'tema' | 'template', item: any) {
    editingEntity = entity;
    editingId = item.id;
    if (entity === 'categoria') formCategoria = { nome: item.nome, icone: item.icone || 'pi pi-tag', sort_order: item.sort_order || 0, ativo: item.ativo };
    else if (entity === 'tema') formTema = { nome: item.nome, categoria_id: item.categoria_id || '', asset_url: item.asset_url || '', scope: item.scope || 'system', ativo: item.ativo };
    else formTemplate = { nome: item.nome, categoria: item.categoria || '', titulo: item.titulo, corpo: item.corpo, scope: item.scope || 'user', ativo: item.ativo };
    modalOpen = true;
  }

  const colsTemplate = [
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'categoria', label: 'Ocasião', sortable: true, formatter: (v: string | null) => v || '-' },
    { key: 'scope', label: 'Escopo', sortable: true, width: '100px', formatter: (v: string) => SCOPE_OPTIONS.find((s) => s.value === v)?.label || v },
    { key: 'ativo', label: 'Status', sortable: true, width: '90px', formatter: (v: boolean) => v ? '<span class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Ativo</span>' : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Inativo</span>' }
  ];

  const colsTema = [
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'scope', label: 'Escopo', sortable: true, width: '100px', formatter: (v: string) => SCOPE_OPTIONS.find((s) => s.value === v)?.label || v },
    { key: 'ativo', label: 'Status', sortable: true, width: '90px', formatter: (v: boolean) => v ? '<span class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Ativo</span>' : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Inativo</span>' }
  ];

  onMount(load);
</script>

<svelte:head>
  <title>CRM Admin | VTUR</title>
</svelte:head>

<PageHeader
  title="CRM Admin"
  subtitle="Gerencie categorias, temas de arte e templates de mensagem do CRM."
  breadcrumbs={[
    { label: 'Admin', href: '/admin' },
    { label: 'CRM' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<!-- Tabs -->
<div class="mb-6 flex gap-2 border-b border-slate-200">
  {#each [{ key: 'templates', label: 'Templates', icon: MessageSquare }, { key: 'temas', label: 'Temas de Arte', icon: Image }, { key: 'categorias', label: 'Categorias', icon: Tag }] as tab}
    <button
      type="button"
      class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === tab.key ? 'border-financeiro-500 text-financeiro-700' : 'border-transparent text-slate-500 hover:text-slate-700'}"
      on:click={() => (activeTab = tab.key as any)}
    >
      <svelte:component this={tab.icon} size={16} />
      {tab.label}
    </button>
  {/each}
</div>

{#if activeTab === 'templates'}
  <div class="mb-4 flex justify-end">
    <Button variant="primary" color="financeiro" on:click={() => openNew('template')}>
      <Plus size={16} class="mr-2" />
      Novo Template
    </Button>
  </div>
  <DataTable columns={colsTemplate} data={templates} color="financeiro" {loading} title="Templates de mensagem" searchable={true} emptyMessage="Nenhum template">
    <svelte:fragment slot="row-actions" let:row>
      <div class="flex gap-1">
        <button on:click|stopPropagation={() => openEdit('template', row)} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil size={15} /></button>
        <button on:click|stopPropagation={() => deleteEntity('template', row.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" disabled={deletingId === row.id}><Trash2 size={15} /></button>
      </div>
    </svelte:fragment>
  </DataTable>

{:else if activeTab === 'temas'}
  <div class="mb-4 flex justify-end">
    <Button variant="primary" color="financeiro" on:click={() => openNew('tema')}>
      <Plus size={16} class="mr-2" />
      Novo Tema
    </Button>
  </div>
  <DataTable columns={colsTema} data={temas} color="financeiro" {loading} title="Temas de arte" searchable={true} emptyMessage="Nenhum tema">
    <svelte:fragment slot="row-actions" let:row>
      <div class="flex gap-1">
        <button on:click|stopPropagation={() => openEdit('tema', row)} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil size={15} /></button>
        <button on:click|stopPropagation={() => deleteEntity('tema', row.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" disabled={deletingId === row.id}><Trash2 size={15} /></button>
      </div>
    </svelte:fragment>
  </DataTable>

{:else}
  <div class="mb-4 flex justify-end">
    <Button variant="primary" color="financeiro" on:click={() => openNew('categoria')}>
      <Plus size={16} class="mr-2" />
      Nova Categoria
    </Button>
  </div>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each categorias as cat}
      <Card color="financeiro">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">{cat.icone?.startsWith('pi') ? '🏷️' : cat.icone || '🏷️'}</span>
            <div>
              <p class="font-semibold text-slate-900">{cat.nome}</p>
              <p class="text-xs text-slate-500">Ordem: {cat.sort_order}</p>
            </div>
          </div>
          <div class="flex gap-1">
            <button on:click={() => openEdit('categoria', cat)} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil size={15} /></button>
            <button on:click={() => deleteEntity('categoria', cat.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" disabled={deletingId === cat.id}><Trash2 size={15} /></button>
          </div>
        </div>
      </Card>
    {/each}
    {#if categorias.length === 0 && !loading}
      <div class="col-span-3 py-12 text-center text-slate-500">Nenhuma categoria cadastrada.</div>
    {/if}
  </div>
{/if}

<Dialog
  bind:open={modalOpen}
  title={editingId ? 'Editar' : 'Novo'}
  color="financeiro"
  size="lg"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText={editingId ? 'Salvar' : 'Criar'}
  loading={saving}
  onConfirm={saveEntity}
  onCancel={() => (modalOpen = false)}
>
  {#if editingEntity === 'categoria'}
    <div class="space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-cat-nome">Nome *</label>
        <input id="crm-cat-nome" bind:value={formCategoria.nome} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-cat-icone">Ícone</label>
        <input id="crm-cat-icone" bind:value={formCategoria.icone} class="vtur-input w-full" placeholder="pi pi-tag" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-cat-ordem">Ordem</label>
        <input id="crm-cat-ordem" type="number" bind:value={formCategoria.sort_order} class="vtur-input w-full" />
      </div>
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" bind:checked={formCategoria.ativo} class="rounded border-slate-300" />
        Ativo
      </label>
    </div>
  {:else if editingEntity === 'tema'}
    <div class="space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tema-nome">Nome *</label>
        <input id="crm-tema-nome" bind:value={formTema.nome} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tema-url">URL da Arte</label>
        <input id="crm-tema-url" bind:value={formTema.asset_url} class="vtur-input w-full" placeholder="https://..." />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tema-cat">Categoria</label>
          <select id="crm-tema-cat" bind:value={formTema.categoria_id} class="vtur-input w-full">
            <option value="">Sem categoria</option>
            {#each categorias as cat}
              <option value={cat.id}>{cat.nome}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tema-scope">Escopo</label>
          <select id="crm-tema-scope" bind:value={formTema.scope} class="vtur-input w-full">
            {#each SCOPE_OPTIONS as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" bind:checked={formTema.ativo} class="rounded border-slate-300" />
        Ativo
      </label>
    </div>
  {:else}
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tpl-nome">Nome *</label>
          <input id="crm-tpl-nome" bind:value={formTemplate.nome} class="vtur-input w-full" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tpl-cat">Ocasião</label>
          <input id="crm-tpl-cat" bind:value={formTemplate.categoria} class="vtur-input w-full" placeholder="Ex: Aniversário" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tpl-scope">Escopo</label>
          <select id="crm-tpl-scope" bind:value={formTemplate.scope} class="vtur-input w-full">
            {#each SCOPE_OPTIONS as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        <div class="flex items-end">
          <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" bind:checked={formTemplate.ativo} class="rounded border-slate-300" />
            Ativo
          </label>
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tpl-titulo">Título *</label>
        <input id="crm-tpl-titulo" bind:value={formTemplate.titulo} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-tpl-corpo">Corpo *</label>
        <textarea id="crm-tpl-corpo" bind:value={formTemplate.corpo} rows="6" class="vtur-input w-full" placeholder="Use {{nome_cliente}}, {{primeiro_nome}}, {{consultor}}"></textarea>
      </div>
    </div>
  {/if}
</Dialog>
