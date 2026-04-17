<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { Plus, Pencil, Trash2, RefreshCw, MessageSquare } from 'lucide-svelte';

  type MessageTemplate = {
    id: string;
    nome: string;
    categoria: string | null;
    titulo: string;
    corpo: string;
    scope: string;
    ativo: boolean;
  };

  const SCOPE_OPTIONS = [
    { value: 'system', label: 'Sistema (todos)' },
    { value: 'master', label: 'Master' },
    { value: 'gestor', label: 'Gestor' },
    { value: 'user', label: 'Usuário' }
  ];

  const OCASIOES = [
    'Aniversário', 'Natal', 'Ano Novo', 'Páscoa', 'Dia das Mães', 'Dia dos Pais',
    'Dia dos Namorados', 'Dia do Cliente', 'Cliente Premium', 'Promoção Exclusiva',
    'Sugestão de Destino', 'Upgrade VIP', 'Boas-vindas', 'Pós-viagem', 'Outro'
  ];

  let templates: MessageTemplate[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;

  let form = createForm();

  function createForm() {
    return { nome: '', categoria: '', titulo: '', corpo: '', scope: 'user', ativo: true };
  }

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('parametros', 'edit');

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'categoria', label: 'Ocasião', sortable: true, formatter: (v: string | null) => v || '-' },
    {
      key: 'scope',
      label: 'Escopo',
      sortable: true,
      width: '110px',
      formatter: (v: string) => {
        const found = SCOPE_OPTIONS.find((s) => s.value === v);
        return found ? `<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">${found.label}</span>` : v;
      }
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      width: '90px',
      formatter: (v: boolean) =>
        v
          ? '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Ativo</span>'
          : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inativo</span>'
    }
  ];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/admin/crm');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      templates = payload.templates || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar templates.');
    } finally {
      loading = false;
    }
  }

  function openNew() {
    editingId = null;
    form = createForm();
    modalOpen = true;
  }

  function openEdit(t: MessageTemplate) {
    editingId = t.id;
    form = { nome: t.nome, categoria: t.categoria || '', titulo: t.titulo, corpo: t.corpo, scope: t.scope, ativo: t.ativo };
    modalOpen = true;
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }
    if (!form.titulo.trim()) { toast.error('Título obrigatório.'); return; }
    if (!form.corpo.trim()) { toast.error('Corpo obrigatório.'); return; }

    saving = true;
    try {
      const response = await fetch('/api/v1/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'template',
          action: 'upsert',
          id: editingId || undefined,
          data: { nome: form.nome, categoria: form.categoria || null, titulo: form.titulo, corpo: form.corpo, scope: form.scope, ativo: form.ativo }
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(editingId ? 'Template atualizado.' : 'Template criado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Deseja excluir este template?')) return;
    deletingId = id;
    try {
      const response = await fetch('/api/v1/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'template', action: 'delete', id })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Template excluído.');
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
  <title>Avisos / CRM | VTUR</title>
</svelte:head>

<PageHeader
  title="Avisos e Templates CRM"
  subtitle="Gerencie os templates de mensagens para envio aos clientes por ocasião."
  color="financeiro"
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'Avisos / CRM' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    ...(canEdit ? [{ label: 'Novo Template', onClick: openNew, variant: 'primary' as const, icon: Plus }] : [])
  ]}
/>

<DataTable
  {columns}
  data={templates}
  color="financeiro"
  {loading}
  title="Templates de mensagem"
  searchable={true}
  emptyMessage="Nenhum template cadastrado"
>
  <svelte:fragment slot="row-actions" let:row>
    <div class="flex items-center gap-1">
      {#if canEdit}
        <button on:click|stopPropagation={() => openEdit(row)} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Editar">
          <Pencil size={15} />
        </button>
        <button on:click|stopPropagation={() => deleteTemplate(row.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir" disabled={deletingId === row.id}>
          <Trash2 size={15} />
        </button>
      {/if}
    </div>
  </svelte:fragment>
</DataTable>

<Dialog
  bind:open={modalOpen}
  title={editingId ? 'Editar Template' : 'Novo Template'}
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
        <label class="mb-1 block text-sm font-medium text-slate-700" for="tpl-nome">Nome *</label>
        <input id="tpl-nome" bind:value={form.nome} class="vtur-input w-full" placeholder="Nome do template" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="tpl-ocasiao">Ocasião</label>
        <select id="tpl-ocasiao" bind:value={form.categoria} class="vtur-input w-full">
          <option value="">Selecione...</option>
          {#each OCASIOES as oc}
            <option value={oc}>{oc}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="tpl-scope">Escopo</label>
        <select id="tpl-scope" bind:value={form.scope} class="vtur-input w-full">
          {#each SCOPE_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      <div class="flex items-end">
        <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" bind:checked={form.ativo} class="rounded border-slate-300" />
          Template ativo
        </label>
      </div>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="tpl-titulo">Título *</label>
      <input id="tpl-titulo" bind:value={form.titulo} class="vtur-input w-full" placeholder="Título da mensagem" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="tpl-corpo">Corpo *</label>
      <textarea id="tpl-corpo" bind:value={form.corpo} rows="6" class="vtur-input w-full" placeholder="Texto da mensagem. Use {{nome_cliente}} para variáveis."></textarea>
      <p class="mt-1 text-xs text-slate-500">Variáveis disponíveis: {'{{nome_cliente}}'}, {'{{primeiro_nome}}'}, {'{{consultor}}'}</p>
    </div>
  </div>
</Dialog>
