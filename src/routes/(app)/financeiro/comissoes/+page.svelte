<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { DollarSign, Users, CheckCircle, Clock, Download, Settings, FileText, Loader2 } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface Comissao {
    id: string;
    venda_id: string;
    numero_venda: string;
    vendedor_id: string;
    vendedor: string;
    cliente: string;
    data_venda: string;
    valor_venda: number;
    valor_comissao: number;
    valor_pago: number;
    valor_taxas?: number;
    status: string;
  }

  interface ResumoVendedor {
    vendedor_id: string;
    vendedor_nome: string;
    total_vendas: number;
    total_comissao: number;
    total_pago: number;
    total_pendente: number;
  }

  let comissoes: Comissao[] = [];
  let resumoVendedores: ResumoVendedor[] = [];
  let vendedores: { id: string; nome_completo?: string; email?: string }[] = [];
  let loading = true;
  let filtroStatus = 'todas';
  let filtroVendedor = '';
  let comissaoSelecionada: Comissao | null = null;
  let comissoesSelecionadas: string[] = [];
  let showPagamentoDialog = false;
  let showPagamentoMultiploDialog = false;
  let showDetalhesDialog = false;
  let dataPagamento = new Date().toISOString().split('T')[0];
  let observacoesPagamento = '';

  onMount(() => {
    loadComissoes();
    loadVendedores();
  });

  async function loadComissoes() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (filtroStatus !== 'todas') params.set('status', filtroStatus);
      if (filtroVendedor) params.set('vendedor_id', filtroVendedor);
      const response = await fetch(`/api/v1/financeiro/comissoes?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar comissões');
      const data = await response.json();
      comissoes = (data.items || []).map((item: any) => ({
        ...item,
        valor_venda: Number(item.valor_venda || 0),
        valor_comissao: Number(item.valor_comissao || 0),
        valor_pago: Number(item.valor_pago || 0),
        valor_taxas: Number(item.valor_taxas || 0),
        status: String(item.status || 'pendente').toLowerCase()
      }));
      resumoVendedores = data.resumo || [];
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar comissões');
    } finally {
      loading = false;
    }
  }

  async function loadVendedores() {
    try {
      const response = await fetch('/api/v1/tarefas/usuarios');
      if (response.ok) {
        const data = await response.json();
        vendedores = data.items || [];
      }
    } catch (err) {
      console.error(err);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  function getStatusBadge(status: string) {
    const key = (status || '').toLowerCase();
    const cls = key === 'pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
    const label = key === 'pago' ? 'Pago' : 'Pendente';
    return `<span class=\"inline-flex px-2 py-1 text-xs font-medium rounded-full ${cls}\">${label}</span>`;
  }

  const columns = [
    { key: 'numero_venda', label: 'Venda', sortable: true, width: '120px' },
    { key: 'vendedor', label: 'Vendedor', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'data_venda', label: 'Data Venda', sortable: true, width: '110px', formatter: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-' },
    { key: 'valor_venda', label: 'Valor Venda', sortable: true, align: 'right' as const, formatter: (value: number) => formatCurrency(value) },
    { key: 'valor_comissao', label: 'Comissão', sortable: true, align: 'right' as const, formatter: (value: number) => formatCurrency(value) },
    { key: 'valor_pago', label: 'Pago', sortable: true, align: 'right' as const, formatter: (value: number) => formatCurrency(value) },
    { key: 'status', label: 'Status', sortable: true, width: '110px', formatter: (value: string) => getStatusBadge(value) }
  ];

  function abrirPagamento(comissao: Comissao) {
    if (comissao.status !== 'pendente') return;
    comissaoSelecionada = comissao;
    dataPagamento = new Date().toISOString().split('T')[0];
    observacoesPagamento = '';
    showPagamentoDialog = true;
  }

  function abrirDetalhes(comissao: Comissao) {
    comissaoSelecionada = comissao;
    showDetalhesDialog = true;
  }

  async function handleConfirmarPagamento() {
    if (!comissaoSelecionada) return;
    try {
      const response = await fetch('/api/v1/financeiro/comissoes/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comissao_ids: [comissaoSelecionada.id], data_pagamento: dataPagamento, observacoes: observacoesPagamento })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Pagamento registrado com sucesso');
      showPagamentoDialog = false;
      comissaoSelecionada = null;
      await loadComissoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamento');
    }
  }

  async function handlePagamentoMultiplo() {
    if (comissoesSelecionadas.length === 0) return;
    try {
      const response = await fetch('/api/v1/financeiro/comissoes/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comissao_ids: comissoesSelecionadas, data_pagamento: dataPagamento, observacoes: observacoesPagamento })
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      toast.success(`${data.pagas} comissões marcadas como pagas`);
      showPagamentoMultiploDialog = false;
      comissoesSelecionadas = [];
      await loadComissoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamentos');
    }
  }

  function handleExport() {
    const headers = ['Venda', 'Vendedor', 'Cliente', 'Data Venda', 'Valor Venda', 'Comissão', 'Pago', 'Status'];
    const rows = comissoes.map((c) => [c.numero_venda, c.vendedor, c.cliente, c.data_venda ? new Date(c.data_venda).toLocaleDateString('pt-BR') : '', String(c.valor_venda || 0).replace('.', ','), String(c.valor_comissao || 0).replace('.', ','), String(c.valor_pago || 0).replace('.', ','), c.status]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'comissoes.csv';
    link.click();
    toast.success('Relatório exportado com sucesso');
  }

  function onSelectionChange(selected: string[]) {
    comissoesSelecionadas = selected.filter((id) => comissoes.find((x) => x.id === id && x.status === 'pendente'));
  }

  $: pendentes = comissoes.filter((c) => c.status === 'pendente');
  $: totalPendente = pendentes.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);
  $: totalPago = comissoes.filter((c) => c.status === 'pago').reduce((acc, c) => acc + Number(c.valor_pago || c.valor_comissao || 0), 0);
  $: valorSelecionado = comissoes.filter((c) => comissoesSelecionadas.includes(c.id)).reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);
</script>

<svelte:head><title>Comissões | VTUR</title></svelte:head>

<PageHeader title="Comissões" subtitle="Gerencie as comissões dos vendedores" color="financeiro" breadcrumbs={[{ label: 'Financeiro', href: '/financeiro' }, { label: 'Comissões' }]} actions={[{ label: 'Regras', href: '/financeiro/regras', variant: 'secondary', icon: Settings }]} />

{#if loading}
  <div class="flex items-center justify-center py-12"><Loader2 size={40} class="animate-spin text-financeiro-600" /><span class="ml-3 text-slate-600">Carregando comissões...</span></div>
{:else}
  <Card header="Filtros" color="financeiro" class="mb-6">
    <div class="flex flex-wrap gap-4 items-end">
      <div><label class="block text-sm font-medium text-slate-700 mb-1">Status</label><select bind:value={filtroStatus} on:change={loadComissoes} class="vtur-input"><option value="todas">Todas</option><option value="pendente">Pendentes</option><option value="pago">Pagas</option></select></div>
      <div><label class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label><select bind:value={filtroVendedor} on:change={loadComissoes} class="vtur-input"><option value="">Todos</option>{#each vendedores as v}<option value={v.id}>{v.nome_completo || v.email}</option>{/each}</select></div>
      <Button variant="secondary" on:click={loadComissoes}><Clock size={16} class="mr-2" />Atualizar</Button>
      <Button variant="secondary" on:click={handleExport}><Download size={16} class="mr-2" />Exportar</Button>
    </div>
  </Card>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div class="vtur-card p-4 border-l-4 border-l-amber-500"><div class="flex items-center justify-between"><div><p class="text-sm text-slate-500">Pendentes</p><p class="text-2xl font-bold text-slate-900">{pendentes.length}</p></div><div class="p-3 bg-amber-50 rounded-lg"><Clock size={24} class="text-amber-600" /></div></div><p class="mt-2 text-lg font-semibold text-amber-600">{formatCurrency(totalPendente)}</p></div>
    <div class="vtur-card p-4 border-l-4 border-l-green-500"><div class="flex items-center justify-between"><div><p class="text-sm text-slate-500">Total Pago</p><p class="text-2xl font-bold text-slate-900">{formatCurrency(totalPago)}</p></div><div class="p-3 bg-green-50 rounded-lg"><CheckCircle size={24} class="text-green-600" /></div></div></div>
    <div class="vtur-card p-4 border-l-4 border-l-financeiro-500"><div class="flex items-center justify-between"><div><p class="text-sm text-slate-500">Total em Comissões</p><p class="text-2xl font-bold text-slate-900">{comissoes.length}</p></div><div class="p-3 bg-financeiro-50 rounded-lg"><DollarSign size={24} class="text-financeiro-600" /></div></div></div>
    <div class="vtur-card p-4 border-l-4 border-l-blue-500"><div class="flex items-center justify-between"><div><p class="text-sm text-slate-500">Vendedores</p><p class="text-2xl font-bold text-slate-900">{resumoVendedores.length}</p></div><div class="p-3 bg-blue-50 rounded-lg"><Users size={24} class="text-blue-600" /></div></div></div>
  </div>

  {#if resumoVendedores.length > 0}
    <Card header="Resumo por Vendedor" color="financeiro" class="mb-6"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{#each resumoVendedores as dados}<div class="p-4 bg-slate-50 rounded-lg"><p class="font-medium text-slate-900 truncate" title={dados.vendedor_nome}>{dados.vendedor_nome}</p><div class="mt-2 space-y-1 text-sm"><div class="flex justify-between"><span class="text-slate-500">Vendas:</span><span class="font-medium">{dados.total_vendas}</span></div><div class="flex justify-between"><span class="text-slate-500">Comissão:</span><span class="font-medium">{formatCurrency(dados.total_comissao)}</span></div><div class="flex justify-between"><span class="text-slate-500">Pago:</span><span class="font-medium text-green-600">{formatCurrency(dados.total_pago)}</span></div><div class="flex justify-between"><span class="text-slate-500">Pendente:</span><span class="font-medium text-amber-600">{formatCurrency(dados.total_pendente)}</span></div></div></div>{/each}</div></Card>
  {/if}

  {#if comissoesSelecionadas.length > 0}
    <Card header="Pagamento em Lote" color="financeiro" class="mb-6"><div class="flex items-center justify-between"><div><p class="text-sm text-slate-600"><strong>{comissoesSelecionadas.length}</strong> comissões selecionadas</p><p class="text-lg font-semibold text-financeiro-600">{formatCurrency(valorSelecionado)}</p></div><Button variant="primary" color="financeiro" on:click={() => { dataPagamento = new Date().toISOString().split('T')[0]; observacoesPagamento = ''; showPagamentoMultiploDialog = true; }}><CheckCircle size={16} class="mr-2" />Pagar Selecionadas</Button></div></Card>
  {/if}

  <DataTable {columns} data={comissoes} color="financeiro" {loading} title="Comissões" searchable={true} filterable={false} exportable={false} selectable={filtroStatus !== 'pago'} onSelectionChange={onSelectionChange} emptyMessage="Nenhuma comissão encontrada">
    <svelte:fragment slot="actions" let:row>
      <div class="flex items-center gap-1"><Button variant="ghost" size="sm" on:click={() => abrirDetalhes(row)} title="Ver detalhes"><FileText size={16} /></Button>{#if row.status === 'pendente'}<Button variant="primary" color="financeiro" size="sm" on:click={() => abrirPagamento(row)}>Pagar</Button>{/if}</div>
    </svelte:fragment>
  </DataTable>
{/if}

<Dialog bind:open={showPagamentoDialog} title="Confirmar Pagamento" color="financeiro" showCancel={true} cancelText="Cancelar" showConfirm={true} confirmText="Confirmar Pagamento" onConfirm={handleConfirmarPagamento}>
  {#if comissaoSelecionada}
    <div class="space-y-4"><div class="p-4 bg-financeiro-50 rounded-lg"><div class="flex justify-between items-start mb-2"><div><p class="text-sm text-slate-500">Vendedor</p><p class="font-semibold text-slate-900">{comissaoSelecionada.vendedor}</p></div><p class="text-2xl font-bold text-financeiro-600">{formatCurrency(comissaoSelecionada.valor_comissao)}</p></div><div class="grid grid-cols-2 gap-4 mt-3 text-sm"><div><p class="text-slate-500">Venda</p><p class="font-medium">{comissaoSelecionada.numero_venda}</p></div><div><p class="text-slate-500">Cliente</p><p class="font-medium">{comissaoSelecionada.cliente}</p></div><div><p class="text-slate-500">Valor da Venda</p><p class="font-medium">{formatCurrency(comissaoSelecionada.valor_venda)}</p></div><div><p class="text-slate-500">Já Pago</p><p class="font-medium">{formatCurrency(comissaoSelecionada.valor_pago)}</p></div></div></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Data do Pagamento</label><input type="date" bind:value={dataPagamento} class="vtur-input w-full" /></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Observações</label><textarea bind:value={observacoesPagamento} rows="2" class="vtur-input w-full" placeholder="Observações opcionais..." /></div></div>
  {/if}
</Dialog>

<Dialog bind:open={showPagamentoMultiploDialog} title="Pagamento em Lote" color="financeiro" showCancel={true} cancelText="Cancelar" showConfirm={true} confirmText={`Pagar ${comissoesSelecionadas.length} Comissões`} onConfirm={handlePagamentoMultiplo}>
  <div class="space-y-4"><div class="p-4 bg-blue-50 rounded-lg"><p class="font-medium text-blue-900">Resumo do Pagamento</p><div class="mt-2 space-y-1 text-sm"><div class="flex justify-between"><span class="text-blue-700">Comissões selecionadas:</span><span class="font-medium">{comissoesSelecionadas.length}</span></div><div class="flex justify-between"><span class="text-blue-700">Valor total:</span><span class="font-medium text-lg">{formatCurrency(valorSelecionado)}</span></div></div></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Data do Pagamento</label><input type="date" bind:value={dataPagamento} class="vtur-input w-full" /></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Observações</label><textarea bind:value={observacoesPagamento} rows="2" class="vtur-input w-full" placeholder="Observações para todos os pagamentos..." /></div></div>
</Dialog>

<Dialog bind:open={showDetalhesDialog} title="Detalhes da Comissão" color="financeiro" showCancel={true} cancelText="Fechar" showConfirm={false}>
  {#if comissaoSelecionada}
    <div class="space-y-4"><div class="grid grid-cols-2 gap-4 text-sm"><div><p class="text-slate-500">Venda</p><p class="font-medium">{comissaoSelecionada.numero_venda}</p></div><div><p class="text-slate-500">Status</p><p class="font-medium">{@html getStatusBadge(comissaoSelecionada.status)}</p></div><div><p class="text-slate-500">Vendedor</p><p class="font-medium">{comissaoSelecionada.vendedor}</p></div><div><p class="text-slate-500">Cliente</p><p class="font-medium">{comissaoSelecionada.cliente}</p></div><div><p class="text-slate-500">Data da Venda</p><p class="font-medium">{comissaoSelecionada.data_venda ? new Date(comissaoSelecionada.data_venda).toLocaleDateString('pt-BR') : '-'}</p></div><div><p class="text-slate-500">Taxas</p><p class="font-medium">{formatCurrency(comissaoSelecionada.valor_taxas || 0)}</p></div></div><div class="border-t pt-4"><h4 class="font-medium text-slate-900 mb-2">Valores</h4><div class="grid grid-cols-2 gap-4 text-sm"><div><p class="text-slate-500">Valor da Venda</p><p class="font-medium">{formatCurrency(comissaoSelecionada.valor_venda)}</p></div><div><p class="text-slate-500">Valor Comissão</p><p class="font-bold text-financeiro-600">{formatCurrency(comissaoSelecionada.valor_comissao)}</p></div><div><p class="text-slate-500">Valor Pago</p><p class="font-medium">{formatCurrency(comissaoSelecionada.valor_pago || 0)}</p></div></div></div></div>
  {/if}
</Dialog>
