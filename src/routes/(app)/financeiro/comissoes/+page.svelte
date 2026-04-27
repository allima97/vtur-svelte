<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect, FieldTextarea } from '$lib/components/ui';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import { DollarSign, Users, CheckCircle, Clock, Download, Settings, FileText, Loader2, AlertCircle, Wallet } from 'lucide-svelte';
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
    valor_comissionavel: number;
    percentual_aplicado: number;
    regra_nome?: string;
    tipo_pacote?: string | null;
    valor_comissao: number;
    valor_pago: number;
    valor_taxas?: number;
    status: string;
    data_pagamento?: string | null;
    observacoes_pagamento?: string | null;
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
  let somentePendentes = false;
  let comissaoSelecionada: Comissao | null = null;
  let comissoesSelecionadas: string[] = [];
  let showPagamentoDialog = false;
  let showPagamentoMultiploDialog = false;
  let showDetalhesDialog = false;
  let processando = false;
  let persistenciaDisponivel = true;
  let dataPagamento = new Date().toISOString().split('T')[0];
  let observacoesPagamento = '';
  let detalhesDataPagamento = '';
  let detalhesObservacoes = '';
  let salvandoDetalhes = false;

  $: statusOptions = [
    { value: 'todas', label: 'Todas' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'pago', label: 'Pagas' }
  ];

  $: vendedorOptions = [
    ...vendedores.map((vendedor) => ({
      value: vendedor.id,
      label: vendedor.nome_completo || vendedor.email || vendedor.id
    }))
  ];

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
      persistenciaDisponivel = data.persistencia_disponivel !== false;
      comissoes = (data.items || []).map((item: any) => ({
        ...item,
        valor_venda: Number(item.valor_venda || 0),
        valor_comissionavel: Number(item.valor_comissionavel || 0),
        percentual_aplicado: Number(item.percentual_aplicado || 0),
        valor_comissao: Number(item.valor_comissao || 0),
        valor_pago: Number(item.valor_pago || 0),
        valor_taxas: Number(item.valor_taxas || 0),
        status: String(item.status || 'pendente').toLowerCase(),
        data_pagamento: item.data_pagamento || null,
        observacoes_pagamento: item.observacoes_pagamento || null
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
    const cls =
      key === 'pago'
        ? 'bg-green-100 text-green-700'
        : key === 'cancelada'
          ? 'bg-red-100 text-red-700'
          : key === 'processando'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-amber-100 text-amber-700';
    const label =
      key === 'pago'
        ? 'Pago'
        : key === 'cancelada'
          ? 'Cancelada'
          : key === 'processando'
            ? 'Processando'
            : 'Pendente';
    return `<span class=\"inline-flex px-2 py-1 text-xs font-medium rounded-full ${cls}\">${label}</span>`;
  }

  const columns = [
    { key: 'numero_venda', label: 'Venda', sortable: true, width: '120px' },
    { key: 'vendedor', label: 'Vendedor', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'data_venda', label: 'Data Venda', sortable: true, width: '110px', formatter: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-' },
    { key: 'valor_venda', label: 'Valor Venda', sortable: true, align: 'right' as const, formatter: (value: number) => formatCurrency(value) },
    { key: 'percentual_aplicado', label: '%', sortable: true, width: '80px', align: 'center' as const, formatter: (value: number) => `${Number(value || 0).toFixed(2)}%` },
    { key: 'valor_comissao', label: 'Comissão', sortable: true, align: 'right' as const, formatter: (value: number) => formatCurrency(value) },
    { key: 'valor_pago', label: 'Pago', sortable: true, align: 'right' as const, formatter: (value: number) => formatCurrency(value) },
    { key: 'status', label: 'Status', sortable: true, width: '110px', formatter: (value: string) => getStatusBadge(value) }
  ];

  function abrirPagamento(comissao: Comissao) {
    if (!persistenciaDisponivel) {
      toast.warning('Persistência de comissão indisponível neste ambiente. Nenhuma baixa pode ser salva agora.');
      return;
    }
    if (comissao.status !== 'pendente') return;
    comissaoSelecionada = comissao;
    dataPagamento = new Date().toISOString().split('T')[0];
    observacoesPagamento = '';
    showPagamentoDialog = true;
  }

  function abrirDetalhes(comissao: Comissao) {
    comissaoSelecionada = comissao;
    detalhesDataPagamento = comissao.data_pagamento || new Date().toISOString().split('T')[0];
    detalhesObservacoes = comissao.observacoes_pagamento || '';
    showDetalhesDialog = true;
  }

  async function handleAtualizarDetalhesPagamento() {
    if (!comissaoSelecionada || comissaoSelecionada.status !== 'pago') return;
    if (!persistenciaDisponivel) {
      toast.warning('Persistência de comissão indisponível neste ambiente. Nenhuma alteração pode ser salva agora.');
      return;
    }

    salvandoDetalhes = true;
    try {
      const response = await fetch('/api/v1/financeiro/comissoes/pagamento', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comissao_ids: [comissaoSelecionada.id],
          data_pagamento: detalhesDataPagamento,
          observacoes: detalhesObservacoes
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || data?.message || 'Erro ao atualizar pagamento');
      if (data?.fallback) {
        persistenciaDisponivel = false;
        toast.warning(data.message || 'Persistência de comissão indisponível neste ambiente.');
        return;
      }

      toast.success('Dados do pagamento atualizados com sucesso');
      showDetalhesDialog = false;
      comissaoSelecionada = null;
      await loadComissoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar pagamento');
    } finally {
      salvandoDetalhes = false;
    }
  }

  async function handleCancelarComissao() {
    if (!comissaoSelecionada) return;
    if (!persistenciaDisponivel) {
      toast.warning('Persistência de comissão indisponível neste ambiente. Nenhuma alteração pode ser salva agora.');
      return;
    }

    salvandoDetalhes = true;
    try {
      const response = await fetch('/api/v1/financeiro/comissoes/pagamento', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comissao_ids: [comissaoSelecionada.id],
          observacoes: detalhesObservacoes
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || data?.message || 'Erro ao cancelar comissão');
      if (data?.fallback) {
        persistenciaDisponivel = false;
        toast.warning(data.message || 'Persistência de comissão indisponível neste ambiente.');
        return;
      }

      toast.success('Comissão cancelada com sucesso');
      showDetalhesDialog = false;
      comissaoSelecionada = null;
      await loadComissoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar comissão');
    } finally {
      salvandoDetalhes = false;
    }
  }

  async function handleConfirmarPagamento() {
    if (!comissaoSelecionada) return;
    if (!persistenciaDisponivel) {
      toast.warning('Persistência de comissão indisponível neste ambiente. Nenhuma baixa pode ser salva agora.');
      return;
    }
    try {
      const response = await fetch('/api/v1/financeiro/comissoes/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comissao_ids: [comissaoSelecionada.id], data_pagamento: dataPagamento, observacoes: observacoesPagamento })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.message || 'Erro ao registrar pagamento');
      if (data?.fallback) {
        persistenciaDisponivel = false;
        toast.warning(data.message || 'Persistência de comissão indisponível neste ambiente.');
        return;
      }
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
    if (!persistenciaDisponivel) {
      toast.warning('Persistência de comissão indisponível neste ambiente. Nenhuma baixa pode ser salva agora.');
      return;
    }
    try {
      const response = await fetch('/api/v1/financeiro/comissoes/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comissao_ids: comissoesSelecionadas, data_pagamento: dataPagamento, observacoes: observacoesPagamento })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.message || 'Erro ao registrar pagamentos');
      if (data?.fallback) {
        persistenciaDisponivel = false;
        toast.warning(data.message || 'Persistência de comissão indisponível neste ambiente.');
        return;
      }
      toast.success(`${data.pagas} comissões marcadas como pagas`);
      showPagamentoMultiploDialog = false;
      comissoesSelecionadas = [];
      await loadComissoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamentos');
    } finally {
      processando = false;
    }
  }

  function handleExport() {
    const base = comissoesVisiveis;
    const headers = ['Venda', 'Vendedor', 'Cliente', 'Data Venda', 'Valor Venda', 'Percentual', 'Comissão', 'Pago', 'Status'];
    const rows = base.map((c) => [c.numero_venda, c.vendedor, c.cliente, c.data_venda ? new Date(c.data_venda).toLocaleDateString('pt-BR') : '', String(c.valor_venda || 0).replace('.', ','), String(c.percentual_aplicado || 0).replace('.', ','), String(c.valor_comissao || 0).replace('.', ','), String(c.valor_pago || 0).replace('.', ','), c.status]);
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
  $: pagas = comissoes.filter((c) => c.status === 'pago');
  $: totalPendente = pendentes.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);
  $: totalPago = pagas.reduce((acc, c) => acc + Number(c.valor_pago || c.valor_comissao || 0), 0);
  $: valorSelecionado = comissoes.filter((c) => comissoesSelecionadas.includes(c.id)).reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);
  $: comissoesVisiveis = somentePendentes ? pendentes : comissoes;
</script>

<svelte:head><title>Comissões | VTUR</title></svelte:head>

<PageHeader title="Comissões" subtitle="Gerencie as comissões dos vendedores" color="financeiro" breadcrumbs={[{ label: 'Financeiro', href: '/financeiro' }, { label: 'Comissões' }]} actions={[{ label: 'Regras', href: '/financeiro/regras', variant: 'secondary', icon: Settings }]} />

{#if loading}
  <div class="flex items-center justify-center py-12"><Loader2 size={40} class="animate-spin text-financeiro-600" /><span class="ml-3 text-slate-600">Carregando comissões...</span></div>
{:else}
  <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p>
      <p class="text-sm text-slate-500">Resumo da fila de pagamento interno com foco em backlog, liquidação e priorização por vendedor.</p>
    </div>
  </div>

  <KPIGrid className="mb-6" columns={4}>
    <Button
      type="button"
      variant="unstyled"
      class_name="vtur-kpi-card !flex !w-full !border-t-[3px] !border-t-amber-400 !p-0 hover:shadow-lg transition-all duration-200"
      on:click={() => (somentePendentes = true)}
    >
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><Clock size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Comissões pendentes</p>
        <p class="text-2xl font-bold text-slate-900">{pendentes.length}</p>
      </div>
    </Button>

    <Button
      type="button"
      variant="unstyled"
      class_name="vtur-kpi-card !flex !w-full !border-t-[3px] !border-t-green-400 !p-0 hover:shadow-lg transition-all duration-200"
      on:click={() => (somentePendentes = false)}
    >
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><CheckCircle size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Total pago</p>
        <p class="text-2xl font-bold text-slate-900">{formatCurrency(totalPago)}</p>
      </div>
    </Button>

    <Button
      type="button"
      variant="unstyled"
      class_name="vtur-kpi-card !flex !w-full !border-t-[3px] !border-t-orange-400 !p-0 hover:shadow-lg transition-all duration-200"
      on:click={() => (somentePendentes = true)}
    >
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Wallet size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Valor pendente</p>
        <p class="text-2xl font-bold text-slate-900">{formatCurrency(totalPendente)}</p>
      </div>
    </Button>

    <Button
      type="button"
      variant="unstyled"
      class_name="vtur-kpi-card !flex !w-full !border-t-[3px] !border-t-blue-400 !p-0 hover:shadow-lg transition-all duration-200"
      on:click={() => goto('/financeiro/regras')}
    >
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Users size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Vendedores na base</p>
        <p class="text-2xl font-bold text-slate-900">{resumoVendedores.length}</p>
      </div>
    </Button>
  </KPIGrid>

  <Card header="Filtros" color="financeiro" class="mb-6">
    <div class="flex flex-wrap gap-4 items-end">
      <FieldSelect id="comissoes-status" label="Status" bind:value={filtroStatus} options={statusOptions} class_name="min-w-[180px]" on:change={loadComissoes} />
      <FieldSelect
        id="comissoes-vendedor"
        label="Vendedor"
        bind:value={filtroVendedor}
        options={vendedorOptions}
        placeholder="Selecione uma opção"
        class_name="min-w-[240px]"
        on:change={loadComissoes}
      />
      <Button variant="secondary" on:click={loadComissoes}><Clock size={16} class="mr-2" />Atualizar</Button>
      <Button variant="secondary" on:click={handleExport}><Download size={16} class="mr-2" />Exportar</Button>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        class_name={somentePendentes ? 'rounded-full border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400' : 'rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'}
        on:click={() => (somentePendentes = !somentePendentes)}
      >
        {#if somentePendentes}
          Mostrando backlog de comissões ({pendentes.length})
        {:else}
          Ver backlog de comissões ({pendentes.length})
        {/if}
      </Button>
      {#if somentePendentes}
        <Button variant="secondary" size="sm" class_name="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300" on:click={() => (somentePendentes = false)}>
          Limpar filtro rápido
        </Button>
      {/if}
    </div>
  </Card>

  <KPIGrid className="mb-6" columns={5}>
    <KPICard title="Pendentes" value={pendentes.length} color="financeiro" icon={Clock} />
    <KPICard title="Total pago" value={formatCurrency(totalPago)} color="operacao" icon={CheckCircle} />
    <KPICard title="Total em comissões" value={comissoes.length} color="financeiro" icon={DollarSign} />
    <KPICard title="Vendedores" value={resumoVendedores.length} color="clientes" icon={Users} />
    <KPICard title="Backlog" value={pendentes.length} color="slate" icon={AlertCircle} />
  </KPIGrid>

  <div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">
    A tela de comissões agora funciona também como fila operacional: <strong>{pendentes.length}</strong> pendências de pagamento somando <strong>{formatCurrency(totalPendente)}</strong>.
  </div>

  {#if !persistenciaDisponivel}
    <Card header="Persistência indisponível" color="orange" class="mb-6">
      <div class="flex items-start gap-3 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertCircle size={18} class="mt-0.5 shrink-0" />
        <div>
          <p class="font-medium">Este ambiente está sem o ledger de comissões persistido.</p>
          <p class="mt-1 text-amber-800">
            A listagem e o cálculo continuam funcionando, mas ações como pagar, editar pagamento e cancelar comissão não serão salvas até a tabela <code>comissoes</code> estar disponível.
          </p>
        </div>
      </div>
    </Card>
  {/if}

  {#if resumoVendedores.length > 0}
    <Card header="Resumo por Vendedor" color="financeiro" class="mb-6"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{#each resumoVendedores as dados}<div class="p-4 bg-slate-50 rounded-lg"><p class="font-medium text-slate-900 truncate" title={dados.vendedor_nome}>{dados.vendedor_nome}</p><div class="mt-2 space-y-1 text-sm"><div class="flex justify-between"><span class="text-slate-500">Vendas:</span><span class="font-medium">{dados.total_vendas}</span></div><div class="flex justify-between"><span class="text-slate-500">Comissão:</span><span class="font-medium">{formatCurrency(dados.total_comissao)}</span></div><div class="flex justify-between"><span class="text-slate-500">Pago:</span><span class="font-medium text-green-600">{formatCurrency(dados.total_pago)}</span></div><div class="flex justify-between"><span class="text-slate-500">Pendente:</span><span class="font-medium text-amber-600">{formatCurrency(dados.total_pendente)}</span></div></div></div>{/each}</div></Card>
  {/if}

  {#if persistenciaDisponivel && comissoesSelecionadas.length > 0}
    <Card header="Pagamento em Lote" color="financeiro" class="mb-6"><div class="flex items-center justify-between"><div><p class="text-sm text-slate-600"><strong>{comissoesSelecionadas.length}</strong> comissões selecionadas</p><p class="text-lg font-semibold text-financeiro-600">{formatCurrency(valorSelecionado)}</p></div><Button variant="primary" color="financeiro" on:click={() => { dataPagamento = new Date().toISOString().split('T')[0]; observacoesPagamento = ''; showPagamentoMultiploDialog = true; }}><CheckCircle size={16} class="mr-2" />Pagar Selecionadas</Button></div></Card>
  {/if}

  <DataTable {columns} data={comissoesVisiveis} color="financeiro" {loading} title="Comissões" searchable={true} filterable={false} exportable={false} selectable={persistenciaDisponivel && filtroStatus !== 'pago'} onSelectionChange={onSelectionChange} emptyMessage="Nenhuma comissão encontrada">
    <svelte:fragment slot="actions" let:row>
      <div class="flex items-center gap-1"><Button variant="secondary" size="sm" on:click={() => abrirDetalhes(row)}><FileText size={16} /></Button>{#if row.status === 'pendente'}<Button variant="primary" color="financeiro" size="sm" on:click={() => abrirPagamento(row)} disabled={!persistenciaDisponivel}>Pagar</Button>{/if}</div>
    </svelte:fragment>
  </DataTable>
{/if}

<Dialog bind:open={showPagamentoDialog} title="Confirmar Pagamento" color="financeiro" showCancel={true} cancelText="Cancelar" showConfirm={true} confirmText="Confirmar Pagamento" onConfirm={handleConfirmarPagamento}>
  {#if comissaoSelecionada}
    <div class="space-y-4"><div class="p-4 bg-financeiro-50 rounded-lg"><div class="flex justify-between items-start mb-2"><div><p class="text-sm text-slate-500">Vendedor</p><p class="font-semibold text-slate-900">{comissaoSelecionada.vendedor}</p></div><p class="text-2xl font-bold text-financeiro-600">{formatCurrency(comissaoSelecionada.valor_comissao)}</p></div><div class="grid grid-cols-2 gap-4 mt-3 text-sm"><div><p class="text-slate-500">Venda</p><p class="font-medium">{comissaoSelecionada.numero_venda}</p></div><div><p class="text-slate-500">Cliente</p><p class="font-medium">{comissaoSelecionada.cliente}</p></div><div><p class="text-slate-500">Valor da Venda</p><p class="font-medium">{formatCurrency(comissaoSelecionada.valor_venda)}</p></div><div><p class="text-slate-500">Já Pago</p><p class="font-medium">{formatCurrency(comissaoSelecionada.valor_pago)}</p></div></div></div><FieldInput id="comissao-data-pagamento" label="Data do Pagamento" type="date" bind:value={dataPagamento} class_name="w-full" /><FieldTextarea id="comissao-observacoes" label="Observações" bind:value={observacoesPagamento} rows={2} class_name="w-full" placeholder="Observações opcionais..." /></div>
  {/if}
</Dialog>

<Dialog bind:open={showPagamentoMultiploDialog} title="Pagamento em Lote" color="financeiro" showCancel={true} cancelText="Cancelar" showConfirm={true} confirmText={`Pagar ${comissoesSelecionadas.length} Comissões`} onConfirm={handlePagamentoMultiplo}>
  <div class="space-y-4"><div class="p-4 bg-blue-50 rounded-lg"><p class="font-medium text-blue-900">Resumo do Pagamento</p><div class="mt-2 space-y-1 text-sm"><div class="flex justify-between"><span class="text-blue-700">Comissões selecionadas:</span><span class="font-medium">{comissoesSelecionadas.length}</span></div><div class="flex justify-between"><span class="text-blue-700">Valor total:</span><span class="font-medium text-lg">{formatCurrency(valorSelecionado)}</span></div></div></div><FieldInput id="comissao-data-pagamento-lote" label="Data do Pagamento" type="date" bind:value={dataPagamento} class_name="w-full" /><FieldTextarea id="comissao-observacoes-lote" label="Observações" bind:value={observacoesPagamento} rows={2} class_name="w-full" placeholder="Observações para todos os pagamentos..." /></div>
</Dialog>

<Dialog bind:open={showDetalhesDialog} title="Detalhes da Comissão" color="financeiro" showCancel={true} cancelText="Fechar" showConfirm={false}>
  {#if comissaoSelecionada}
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><p class="text-slate-500">Venda</p><p class="font-medium">{comissaoSelecionada.numero_venda}</p></div>
        <div><p class="text-slate-500">Status</p><p class="font-medium">{@html getStatusBadge(comissaoSelecionada.status)}</p></div>
        <div><p class="text-slate-500">Vendedor</p><p class="font-medium">{comissaoSelecionada.vendedor}</p></div>
        <div><p class="text-slate-500">Cliente</p><p class="font-medium">{comissaoSelecionada.cliente}</p></div>
        <div><p class="text-slate-500">Data da Venda</p><p class="font-medium">{comissaoSelecionada.data_venda ? new Date(comissaoSelecionada.data_venda).toLocaleDateString('pt-BR') : '-'}</p></div>
        <div><p class="text-slate-500">Regra</p><p class="font-medium">{comissaoSelecionada.regra_nome || 'Sem regra'}</p></div>
        <div><p class="text-slate-500">Tipo de pacote</p><p class="font-medium">{comissaoSelecionada.tipo_pacote || '-'}</p></div>
        <div><p class="text-slate-500">Percentual aplicado</p><p class="font-medium">{Number(comissaoSelecionada.percentual_aplicado || 0).toFixed(2)}%</p></div>
      </div>

      <div class="border-t pt-4">
        <h4 class="font-medium text-slate-900 mb-2">Valores</h4>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div><p class="text-slate-500">Valor da Venda</p><p class="font-medium">{formatCurrency(comissaoSelecionada.valor_venda)}</p></div>
          <div><p class="text-slate-500">Valor comissionável</p><p class="font-medium">{formatCurrency(comissaoSelecionada.valor_comissionavel || 0)}</p></div>
          <div><p class="text-slate-500">Valor Comissão</p><p class="font-bold text-financeiro-600">{formatCurrency(comissaoSelecionada.valor_comissao)}</p></div>
          <div><p class="text-slate-500">Valor Pago</p><p class="font-medium">{formatCurrency(comissaoSelecionada.valor_pago || 0)}</p></div>
        </div>
      </div>

      {#if comissaoSelecionada.status === 'pago'}
        <div class="border-t pt-4 space-y-4">
          <FieldInput id="detalhe-comissao-data-pagamento" label="Data do pagamento" type="date" bind:value={detalhesDataPagamento} class_name="w-full" />
          <FieldTextarea id="detalhe-comissao-observacoes" label="Observações do pagamento" bind:value={detalhesObservacoes} rows={3} class_name="w-full" placeholder="Observações internas do pagamento..." />
          <div class="flex flex-wrap gap-3">
            <Button variant="primary" color="financeiro" on:click={handleAtualizarDetalhesPagamento} disabled={salvandoDetalhes}>
              Salvar ajustes
            </Button>
            <Button variant="danger" on:click={handleCancelarComissao} disabled={salvandoDetalhes}>
              Cancelar comissão
            </Button>
          </div>
        </div>
      {:else if comissaoSelecionada.status === 'pendente'}
        <div class="border-t pt-4">
          <p class="text-sm text-slate-500">Esta comissão ainda está pendente de pagamento. Use a ação <strong>Pagar</strong> na listagem para registrar a baixa.</p>
        </div>
      {:else if comissaoSelecionada.status === 'cancelada'}
        <div class="border-t pt-4">
          <p class="text-sm text-slate-500">Esta comissão foi cancelada.</p>
          {#if comissaoSelecionada.observacoes_pagamento}
            <p class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{comissaoSelecionada.observacoes_pagamento}</p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</Dialog>
