<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import VoucherEditorModal from '$lib/components/modais/VoucherEditorModal.svelte';
  import VoucherPreviewModal from '$lib/components/modais/VoucherPreviewModal.svelte';
  import { Plus, Ticket, FileText, ExternalLink, Trash2, Loader2, Search } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import type { VoucherRecord, VoucherAssetRecord, VoucherProvider } from '$lib/vouchers/types';

  let vouchers: VoucherRecord[] = [];
  let assets: VoucherAssetRecord[] = [];
  let loading = true;
  let searchQuery = '';
  let showEditor = false;
  let showPreview = false;
  let previewVoucher: VoucherRecord | null = null;
  let editingVoucher: VoucherRecord | null = null;
  let companyId: string | null = null;
  let deleteConfirmVoucher: VoucherRecord | null = null;
  let showDeleteDialog = false;
  
  $: showDeleteDialog = !!deleteConfirmVoucher;

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    { 
      key: 'provider', 
      label: 'Fornecedor', 
      sortable: true,
      width: '140px',
      formatter: (v: VoucherProvider) => {
        const labels = { special_tours: 'Special Tours', europamundo: 'Europamundo' };
        const colors = { special_tours: 'bg-blue-100 text-blue-700', europamundo: 'bg-orange-100 text-orange-700' };
        return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[v]}">${labels[v] || v}</span>`;
      }
    },
    { key: 'codigo_fornecedor', label: 'Código', sortable: true, width: '120px' },
    { 
      key: 'data_inicio', 
      label: 'Data Início', 
      sortable: true,
      width: '120px',
      formatter: (v: string) => v ? new Date(v).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'data_fim', 
      label: 'Data Fim', 
      sortable: true,
      width: '120px',
      formatter: (v: string) => v ? new Date(v).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'ativo', 
      label: 'Status', 
      sortable: true,
      width: '100px',
      formatter: (v: boolean) => v 
        ? '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Ativo</span>'
        : '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Inativo</span>'
    }
  ];

  onMount(async () => {
    await loadUserContext();
    await loadData();
  });

  async function loadUserContext() {
    try {
      const response = await fetch('/api/v1/user/context');
      if (response.ok) {
        const data = await response.json();
        companyId = data.company_id;
      }
    } catch (err) {
      console.error('Erro ao carregar contexto:', err);
    }
  }

  async function loadData() {
    if (!companyId) return;
    
    loading = true;
    try {
      const [vouchersRes, assetsRes] = await Promise.all([
        fetch(`/api/v1/vouchers?company_id=${companyId}`),
        fetch(`/api/v1/voucher-assets?company_id=${companyId}`)
      ]);

      if (vouchersRes.ok) {
        const data = await vouchersRes.json();
        vouchers = data.items || [];
      }
      
      if (assetsRes.ok) {
        const data = await assetsRes.json();
        assets = data.items || [];
      }
    } catch (err) {
      toast.error('Erro ao carregar vouchers');
    } finally {
      loading = false;
    }
  }

  function handleRowClick(row: VoucherRecord) {
    console.log('[Vouchers] Clique no voucher:', row.nome, row.id);
    previewVoucher = row;
    showPreview = true;
    console.log('[Vouchers] showPreview:', showPreview, 'previewVoucher:', previewVoucher);
  }

  function handleNew() {
    editingVoucher = null;
    showEditor = true;
  }

  function handleEditFromPreview(event: CustomEvent) {
    editingVoucher = event.detail;
    showPreview = false;
    showEditor = true;
  }

  async function handleSave(event: CustomEvent) {
    const formData = event.detail;
    
    try {
      const url = formData.id ? `/api/v1/vouchers/${formData.id}` : '/api/v1/vouchers';
      const method = formData.id ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      toast.success(formData.id ? 'Voucher atualizado!' : 'Voucher criado!');
      showEditor = false;
      await loadData();
    } catch (err) {
      toast.error('Erro ao salvar voucher');
    }
  }

  async function handleDelete() {
    if (!deleteConfirmVoucher) return;
    
    try {
      const response = await fetch(`/api/v1/vouchers/${deleteConfirmVoucher.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast.success('Voucher excluído!');
      deleteConfirmVoucher = null;
      await loadData();
    } catch (err) {
      toast.error('Erro ao excluir voucher');
    }
  }

  // Funções de preview removidas - agora usamos o modal VoucherPreviewModal

  $: filteredVouchers = vouchers.filter(v => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.nome?.toLowerCase().includes(q) ||
      v.codigo_fornecedor?.toLowerCase().includes(q) ||
      v.codigo_systur?.toLowerCase().includes(q)
    );
  });
</script>

<svelte:head>
  <title>Vouchers | VTUR</title>
</svelte:head>

<PageHeader 
  title="Vouchers"
  subtitle="Gerenciamento de vouchers Special Tours e Europamundo"
  color="clientes"
  breadcrumbs={[
    { label: 'Operação', href: '/operacao' },
    { label: 'Vouchers' }
  ]}
  actions={[
    { label: 'Novo Voucher', onClick: handleNew, variant: 'primary', icon: Plus }
  ]}
/>

<!-- Resumo -->
<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
      <Ticket size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total</p>
      <p class="text-2xl font-bold text-slate-900">{vouchers.length}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
      <Ticket size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Special Tours</p>
      <p class="text-2xl font-bold text-slate-900">
        {vouchers.filter(v => v.provider === 'special_tours').length}
      </p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
      <Ticket size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Europamundo</p>
      <p class="text-2xl font-bold text-slate-900">
        {vouchers.filter(v => v.provider === 'europamundo').length}
      </p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">
      <FileText size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Ativos</p>
      <p class="text-2xl font-bold text-slate-900">
        {vouchers.filter(v => v.ativo).length}
      </p>
    </div>
  </div>
</div>

<!-- Filtros -->
<Card color="clientes" class="mb-6">
  <div class="flex gap-4">
    <div class="relative flex-1 max-w-md">
      <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="Buscar vouchers..."
        bind:value={searchQuery}
        class="vtur-input pl-10 w-full"
      />
    </div>
  </div>
</Card>

<!-- Tabela -->
<DataTable
  {columns}
  data={filteredVouchers}
  color="clientes"
  {loading}
  title="Lista de Vouchers"
  searchable={false}
  onRowClick={handleRowClick}
  emptyMessage="Nenhum voucher encontrado"
>
  <svelte:fragment slot="row-actions" let:row>
    <div class="flex items-center gap-1">
      <button
        on:click|stopPropagation={() => deleteConfirmVoucher = row}
        class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Excluir"
      >
        <Trash2 size={16} />
      </button>
    </div>
  </svelte:fragment>
</DataTable>

<!-- Preview Modal -->
<VoucherPreviewModal
  bind:open={showPreview}
  voucher={previewVoucher}
  {assets}
  on:edit={handleEditFromPreview}
/>

<!-- Editor Modal -->
<VoucherEditorModal
  bind:open={showEditor}
  voucher={editingVoucher}
  {companyId}
  {assets}
  on:save={handleSave}
  on:close={() => showEditor = false}
/>

<!-- Delete Confirmation -->
<Dialog
  bind:open={showDeleteDialog}
  title="Confirmar Exclusão"
  color="danger"
  confirmText="Excluir"
  cancelText="Cancelar"
  onConfirm={handleDelete}
  onCancel={() => deleteConfirmVoucher = null}
>
  <p class="text-slate-600">
    Tem certeza que deseja excluir o voucher <strong>{deleteConfirmVoucher?.nome}</strong>?
    Esta ação não pode ser desfeita.
  </p>
</Dialog>
