<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import { apiDelete, apiGet, apiPost } from '$lib/services/api';
  import { Plus, Trash2, RefreshCw, Search } from 'lucide-svelte';
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
  let loading = true;
  let loadingSubdivisoes = true;
  let modalOpen = false;
  let saving = false;
  let deletingId = '';
  let editingId: string | null = null;
  let busca = '';
  let filtroSubdivisao = '';
  let totalCidades = 0;
  let autoReloadEnabled = false;
  let lastAutoReloadKey = '';
  let autoReloadTimer: ReturnType<typeof setTimeout> | null = null;

  let form = { nome: '', subdivisao_id: '', descricao: '' };

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

  async function fetchAllPages<T>(path: string, baseQuery: Record<string, any>, pageSize = 5000): Promise<T[]> {
    const all: T[] = [];
    let page = 1;
    let total = 0;

    while (true) {
      const payload = await apiGet<any>(path, { ...baseQuery, page, pageSize });
      const items = Array.isArray(payload?.items) ? (payload.items as T[]) : [];
      total = Number(payload?.total || 0);
      all.push(...items);

      if (items.length === 0) break;
      if (all.length >= total && total > 0) break;
      page += 1;
      if (page > 1000) break;
    }

    return all;
  }

  async function loadSubdivisoes() {
    loadingSubdivisoes = true;
    try {
      subdivisoes = await fetchAllPages<Subdivisao>('/api/v1/subdivisoes', {});
    } catch {
      subdivisoes = [];
    } finally {
      loadingSubdivisoes = false;
    }
  }

  async function load() {
    loading = true;
    try {
      const baseQuery = {
        q: busca.trim() || undefined,
        subdivisao_id: filtroSubdivisao || undefined
      };
      cidades = await fetchAllPages<Cidade>('/api/v1/cidades', baseQuery);
      totalCidades = cidades.length;
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
  }

  function openEdit(c: Cidade) {
    editingId = c.id;
    form = { nome: c.nome, subdivisao_id: c.subdivisao_id || '', descricao: c.descricao || '' };
    modalOpen = true;
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
    // Carrega as duas listas em paralelo mas sem bloquear uma pela outra
    void loadSubdivisoes();
    void load().then(() => {
      lastAutoReloadKey = buildAutoReloadKey();
      autoReloadEnabled = true;
    });
  });

  onDestroy(() => {
    if (autoReloadTimer) clearTimeout(autoReloadTimer);
  });

  function buildAutoReloadKey() {
    return [busca.trim(), filtroSubdivisao].join('|');
  }

  function scheduleAutoReload() {
    if (autoReloadTimer) clearTimeout(autoReloadTimer);
    autoReloadTimer = setTimeout(() => {
      void load();
    }, 300);
  }

  $: autoReloadKey = buildAutoReloadKey();
  $: if (autoReloadEnabled && autoReloadKey !== lastAutoReloadKey) {
    lastAutoReloadKey = autoReloadKey;
    scheduleAutoReload();
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

<Card class="mb-6">
  <div class="flex flex-wrap gap-4 items-end">
    <FieldInput
      bind:value={busca}
      icon={Search}
      placeholder="Buscar cidade..."
      class_name="flex-1 min-w-[200px]"
    />
    <FieldSelect
      id="cid-sub"
      label="Estado/Província"
      bind:value={filtroSubdivisao}
      options={loadingSubdivisoes
        ? [{ value: '', label: 'Carregando...' }]
        : [{ value: '', label: 'Todos' }, ...subdivisoes.map((s) => ({ value: s.id, label: s.nome }))]}
      placeholder={null}
      disabled={loadingSubdivisoes}
    />
  </div>
</Card>

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
      options={loadingSubdivisoes
        ? [{ value: '', label: 'Carregando estados...' }]
        : [{ value: '', label: 'Selecione um estado/província' }, ...subdivisoes.map((s) => ({ value: s.id, label: s.nome }))]}
      placeholder={null}
      class_name="w-full"
      disabled={loadingSubdivisoes}
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
