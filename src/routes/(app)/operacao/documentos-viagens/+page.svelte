<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { RefreshCw, Trash2, Search, FileText, ExternalLink } from 'lucide-svelte';

  type Documento = {
    id: string;
    file_name: string;
    display_name: string | null;
    title: string | null;
    storage_bucket: string;
    storage_path: string;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string | null;
    uploader?: { nome_completo?: string | null; email?: string | null } | null;
  };

  let documentos: Documento[] = [];
  let loading = true;
  let deletingId = '';
  let busca = '';

  $: canDelete = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('documentos_viagens', 'delete') || permissoes.can('operacao', 'delete');

  function formatBytes(bytes?: number | null) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let idx = 0;
    let val = n;
    while (val >= 1024 && idx < units.length - 1) { val /= 1024; idx++; }
    return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  }

  const columns = [
    {
      key: 'display_name',
      label: 'Nome',
      sortable: true,
      formatter: (v: string | null, row: Documento) => {
        const nome = v || row.file_name;
        const titulo = row.title ? `<div class="text-xs text-slate-500">${row.title}</div>` : '';
        return `<div><div class="font-medium text-slate-900">${nome}</div>${titulo}</div>`;
      }
    },
    {
      key: 'mime_type',
      label: 'Tipo',
      sortable: true,
      width: '120px',
      formatter: (v: string | null) => {
        if (!v) return '-';
        if (v.includes('pdf')) return '<span class="text-red-600 text-xs font-medium">PDF</span>';
        if (v.includes('word') || v.includes('document')) return '<span class="text-blue-600 text-xs font-medium">Word</span>';
        if (v.includes('text')) return '<span class="text-slate-600 text-xs font-medium">Texto</span>';
        return `<span class="text-xs text-slate-500">${v.split('/')[1] || v}</span>`;
      }
    },
    {
      key: 'size_bytes',
      label: 'Tamanho',
      sortable: true,
      width: '100px',
      formatter: (v: number | null) => formatBytes(v)
    },
    {
      key: 'created_at',
      label: 'Enviado em',
      sortable: true,
      width: '130px',
      formatter: (v: string | null) => v ? new Date(v).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'uploader',
      label: 'Por',
      sortable: false,
      formatter: (_: any, row: Documento) => row.uploader?.nome_completo || row.uploader?.email || '-'
    }
  ];

  async function load() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.set('q', busca.trim());
      const response = await fetch(`/api/v1/operacao/documentos-viagens?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      documentos = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar documentos.');
    } finally {
      loading = false;
    }
  }

  async function deleteDoc(id: string) {
    if (!confirm('Deseja excluir este documento?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/operacao/documentos-viagens?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Documento excluído.');
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
  <title>Documentos de Viagens | VTUR</title>
</svelte:head>

<PageHeader
  title="Documentos de Viagens"
  subtitle="Biblioteca de documentos e templates para uso nas viagens dos clientes."
  color="operacao"
  breadcrumbs={[
    { label: 'Operação', href: '/operacao' },
    { label: 'Documentos de Viagens' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<Card color="operacao" class="mb-6">
  <div class="flex gap-4 items-end">
    <div class="relative flex-1 max-w-sm">
      <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input bind:value={busca} class="vtur-input w-full pl-9" placeholder="Buscar documentos..." />
    </div>
    <Button variant="primary" size="sm" on:click={load}>Buscar</Button>
  </div>
</Card>

<DataTable
  {columns}
  data={documentos}
  color="operacao"
  {loading}
  title="Documentos disponíveis"
  searchable={false}
  emptyMessage="Nenhum documento encontrado"
>
  <svelte:fragment slot="row-actions" let:row>
    <div class="flex items-center gap-1">
      {#if canDelete}
        <button
          on:click|stopPropagation={() => deleteDoc(row.id)}
          class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          title="Excluir"
          disabled={deletingId === row.id}
        >
          <Trash2 size={15} />
        </button>
      {/if}
    </div>
  </svelte:fragment>
</DataTable>

{#if documentos.length === 0 && !loading}
  <Card color="operacao" class="mt-6">
    <div class="flex flex-col items-center justify-center py-12 text-slate-500">
      <FileText size={48} class="mb-4 opacity-30" />
      <p class="font-medium">Nenhum documento cadastrado.</p>
      <p class="mt-1 text-sm">Os documentos são enviados via API ou pelo sistema legado.</p>
    </div>
  </Card>
{/if}
