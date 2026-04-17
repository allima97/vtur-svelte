<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { 
    DollarSign, TrendingUp, Users, Calendar, 
    CheckCircle, Clock, Download, Calculator, 
    Settings, FileText, ArrowRight 
  } from 'lucide-svelte';
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
    valor_comissao: number;
    status: 'PENDENTE' | 'PROCESSANDO' | 'PAGA' | 'CANCELADA';
    data_pagamento?: string;
    observacoes_pagamento?: string;
    mes_referencia: number;
    ano_referencia: number;
    created_at: string;
  }

  let comissoes: Comissao[] = [];
  let loading = true;
  let showPagamentoDialog = false;
  let showPagamentoMultiploDialog = false;
  let showDetalhesDialog = false;
  let comissaoSelecionada: Comissao | null = null;
  let comissoesSelecionadas: string[] = [];
  let resumoVendedores: Record<string, { total: number; pendentes: number; pagas: number }> = {};
  
  // Filtros
  let filtroStatus = 'PENDENTE';
  let filtroVendedor = '';
  let filtroMes = new Date().getMonth() + 1;
  let filtroAno = new Date().getFullYear();
  let vendedores: any[] = [];

  // Form de pagamento
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
      if (filtroStatus !== 'TODAS') params.set('status', filtroStatus);
      params.set('mes', String(filtroMes));
      params.set('ano', String(filtroAno));
      if (filtroVendedor) params.set('vendedor_id', filtroVendedor);

      const response = await fetch(`/api/v1/financeiro/comissoes/calcular?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar comissões');
      
      const data = await response.json();
      comissoes = data.items || [];
      
      // Calcula resumo por vendedor
      calcularResumoVendedores();
    } catch (err) {
      toast.error('Erro ao carregar comissões');
      console.error(err);
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
      console.error('Erro ao carregar vendedores:', err);
    }
  }

  function calcularResumoVendedores() {
    resumoVendedores = comissoes.reduce((acc, c) => {
      if (!acc[c.vendedor]) {
        acc[c.vendedor] = { total: 0, pendentes: 0, pagas: 0 };
      }
      acc[c.vendedor].total += c.valor_comissao;
      if (c.status === 'PENDENTE') acc[c.vendedor].pendentes += c.valor_comissao;
      if (c.status === 'PAGA') acc[c.vendedor].pagas += c.valor_comissao;
      return acc;
    }, {} as Record<string, { total: number; pendentes: number; pagas: number }>);
  }

  const columns = [
    { 
      key: 'numero_venda', 
      label: 'Venda', 
      sortable: true,
      width: '110px'
    },
    { 
      key: 'vendedor', 
      label: 'Vendedor', 
      sortable: true
    },
    { 
      key: 'cliente', 
      label: 'Cliente', 
      sortable: true
    },
    { 
      key: 'data_venda', 
      label: 'Data Venda', 
      sortable: true,
      width: '110px',
      formatter: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'valor_venda', 
      label: 'Valor Venda', 
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    },
    { 
      key: 'percentual_aplicado', 
      label: '%', 
      sortable: true,
      width: '60px',
      align: 'center' as const,
      formatter: (value: number) => `${value}%`
    },
    { 
      key: 'valor_comissao', 
      label: 'Comissão', 
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true,
      width: '110px',
      formatter: (value: string) => {
        const styles = {
          PENDENTE: 'bg-amber-100 text-amber-700',
          PROCESSANDO: 'bg-blue-100 text-blue-700',
          PAGA: 'bg-green-100 text-green-700',
          CANCELADA: 'bg-red-100 text-red-700'
        };
        const labels = {
          PENDENTE: 'Pendente',
          PROCESSANDO: 'Processando',
          PAGA: 'Paga',
          CANCELADA: 'Cancelada'
        };
        return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[value as keyof typeof styles]}">${labels[value as keyof typeof labels]}</span>`;
      }
    }
  ];

  const filters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'PENDENTE', label: 'Pendente' },
        { value: 'PAGA', label: 'Paga' },
        { value: 'CANCELADA', label: 'Cancelada' }
      ]
    },
    {
      key: 'mes_referencia',
      label: 'Mês',
      type: 'select' as const,
      options: Array(12).fill(0).map((_, i) => ({
        value: String(i + 1),
        label: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' })
      }))
    }
  ];

  function abrirPagamento(comissao: Comissao) {
    if (comissao.status !== 'PENDENTE') {
      toast.error('Apenas comissões pendentes podem ser pagas');
      return;
    }
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
        body: JSON.stringify({
          comissao_ids: [comissaoSelecionada.id],
          data_pagamento: dataPagamento,
          observacoes: observacoesPagamento
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      toast.success('Pagamento registrado com sucesso!');
      showPagamentoDialog = false;
      comissaoSelecionada = null;
      await loadComissoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamento');
    }
  }

  async function handlePagamentoMultiplo() {
    if (comissoesSelecionadas.length === 0) {
      toast.error('Selecione pelo menos uma comissão');
      return;
    }

    try {
      const response = await fetch('/api/v1/financeiro/comissoes/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comissao_ids: comissoesSelecionadas,
          data_pagamento: dataPagamento,
          observacoes: observacoesPagamento
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      toast.success(`${data.pagas} comissões marcadas como pagas!`);
      showPagamentoMultiploDialog = false;
      comissoesSelecionadas = [];
      await loadComissoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamentos');
    }
  }

  function handleExport() {
    // Exporta para CSV
    const headers = ['Venda', 'Vendedor', 'Cliente', 'Data Venda', 'Valor Venda', '%', 'Comissão', 'Status'];
    const rows = comissoes.map(c => [
      c.numero_venda,
      c.vendedor,
      c.cliente,
      c.data_venda ? new Date(c.data_venda).toLocaleDateString('pt-BR') : '',
      c.valor_venda.toFixed(2),
      c.percentual_aplicado,
      c.valor_comissao.toFixed(2),
      c.status
    ]);
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comissoes_${filtroMes}_${filtroAno}.csv`;
    link.click();
    
    toast.success('Relatório exportado com sucesso!');
  }

  function onSelectionChange(selected: string[]) {
    // Filtra apenas comissões pendentes
    const pendentesSelecionadas = selected.filter(id => {
      const c = comissoes.find(x => x.id === id);
      return c && c.status === 'PENDENTE';
    });
    comissoesSelecionadas = pendentesSelecionadas;
  }

  $: pendentes = comissoes.filter(c => c.status === 'PENDENTE');
  $: totalPendente = pendentes.reduce((acc, c) => acc + c.valor_comissao, 0);
  $: totalPago = comissoes
    .filter(c => c.status === 'PAGA')
    .reduce((acc, c) => acc + c.valor_comissao, 0);
  $: valorSelecionado = comissoes
    .filter(c => comissoesSelecionadas.includes(c.id))
    .reduce((acc, c) => acc + c.valor_comissao, 0);
</script>

<svelte:head>
  <title>Comissões | VTUR</title>
</svelte:head>

<PageHeader 
  title="Comissões"
  subtitle="Gerencie as comissões dos vendedores"
  color="financeiro"
  breadcrumbs={[
    { label: 'Financeiro', href: '/financeiro' },
    { label: 'Comissões' }
  ]}
  actions={[
    {
      label: 'Regras',
      href: '/financeiro/comissoes/regras',
      variant: 'secondary',
      icon: Settings
    },
    {
      label: 'Calcular',
      href: '/financeiro/comissoes/calculo',
      variant: 'primary',
      icon: Calculator
    }
  ]}
/>

<!-- Filtros -->
<Card header="Filtros" color="financeiro" class="mb-6">
  <div class="flex flex-wrap gap-4 items-end">
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
      <select 
        bind:value={filtroStatus} 
        on:change={loadComissoes}
        class="vtur-input"
      >
        <option value="TODAS">Todas</option>
        <option value="PENDENTE">Pendentes</option>
        <option value="PAGA">Pagas</option>
        <option value="CANCELADA">Canceladas</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Mês</label>
      <select 
        bind:value={filtroMes} 
        on:change={loadComissoes}
        class="vtur-input"
      >
        {#each Array(12) as _, i}
          <option value={i + 1}>
            {new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
          </option>
        {/each}
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Ano</label>
      <input
        type="number"
        bind:value={filtroAno}
        on:change={loadComissoes}
        min="2020"
        max="2100"
        class="vtur-input w-24"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Vendedor</label>
      <select 
        bind:value={filtroVendedor} 
        on:change={loadComissoes}
        class="vtur-input"
      >
        <option value="">Todos</option>
        {#each vendedores as v}
          <option value={v.id}>{v.nome_completo || v.email}</option>
        {/each}
      </select>
    </div>
    <Button variant="secondary" on:click={loadComissoes}>
      <Clock size={16} class="mr-2" />
      Atualizar
    </Button>
  </div>
</Card>

<!-- Resumo -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <div class="vtur-card p-4 border-l-4 border-l-amber-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Pendentes</p>
        <p class="text-2xl font-bold text-slate-900">{pendentes.length}</p>
      </div>
      <div class="p-3 bg-amber-50 rounded-lg">
        <Clock size={24} class="text-amber-600" />
      </div>
    </div>
    <p class="mt-2 text-lg font-semibold text-amber-600">
      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendente)}
    </p>
  </div>

  <div class="vtur-card p-4 border-l-4 border-l-green-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Total Pago</p>
        <p class="text-2xl font-bold text-slate-900">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPago)}
        </p>
      </div>
      <div class="p-3 bg-green-50 rounded-lg">
        <CheckCircle size={24} class="text-green-600" />
      </div>
    </div>
  </div>

  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Total em Comissões</p>
        <p class="text-2xl font-bold text-slate-900">{comissoes.length}</p>
      </div>
      <div class="p-3 bg-financeiro-50 rounded-lg">
        <DollarSign size={24} class="text-financeiro-600" />
      </div>
    </div>
  </div>

  <div class="vtur-card p-4 border-l-4 border-l-blue-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Vendedores</p>
        <p class="text-2xl font-bold text-slate-900">{Object.keys(resumoVendedores).length}</p>
      </div>
      <div class="p-3 bg-blue-50 rounded-lg">
        <Users size={24} class="text-blue-600" />
      </div>
    </div>
  </div>
</div>

<!-- Resumo por Vendedor -->
{#if Object.keys(resumoVendedores).length > 0}
<Card header="Resumo por Vendedor" color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {#each Object.entries(resumoVendedores) as [vendedor, dados]}
      <div class="p-4 bg-slate-50 rounded-lg">
        <p class="font-medium text-slate-900 truncate" title={vendedor}>{vendedor}</p>
        <div class="mt-2 space-y-1">
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">Total:</span>
            <span class="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.total)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">Pendente:</span>
            <span class="font-medium text-amber-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.pendentes)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">Pago:</span>
            <span class="font-medium text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.pagas)}</span>
          </div>
        </div>
      </div>
    {/each}
  </div>
</Card>
{/if}

<!-- Pagamento Múltiplo -->
{#if comissoesSelecionadas.length > 0}
<Card header="Pagamento em Lote" color="financeiro" class="mb-6">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm text-slate-600">
        <strong>{comissoesSelecionadas.length}</strong> comissões selecionadas
      </p>
      <p class="text-lg font-semibold text-financeiro-600">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorSelecionado)}
      </p>
    </div>
    <Button
      variant="primary"
      color="financeiro"
      on:click={() => {
        dataPagamento = new Date().toISOString().split('T')[0];
        observacoesPagamento = '';
        showPagamentoMultiploDialog = true;
      }}
    >
      <CheckCircle size={16} class="mr-2" />
      Pagar Selecionadas
    </Button>
  </div>
</Card>
{/if}

<!-- Lista de Comissões -->
<DataTable
  {columns}
  data={comissoes}
  color="financeiro"
  {loading}
  title="Comissões"
  {filters}
  searchable={true}
  filterable={true}
  exportable={true}
  selectable={filtroStatus === 'PENDENTE'}
  onSelectionChange={onSelectionChange}
  onExport={handleExport}
  emptyMessage="Nenhuma comissão encontrada"
>
  <svelte:fragment slot="actions" let:row>
    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        on:click={() => abrirDetalhes(row)}
        title="Ver detalhes"
      >
        <FileText size={16} />
      </Button>
      {#if row.status === 'PENDENTE'}
        <Button
          variant="primary"
          color="financeiro"
          size="sm"
          on:click={() => abrirPagamento(row)}
        >
          Pagar
        </Button>
      {/if}
    </div>
  </svelte:fragment>
</DataTable>

<!-- Dialog de Pagamento Individual -->
<Dialog
  bind:open={showPagamentoDialog}
  title="Confirmar Pagamento"
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText="Confirmar Pagamento"
  onConfirm={handleConfirmarPagamento}
>
  {#if comissaoSelecionada}
    <div class="space-y-4">
      <div class="p-4 bg-financeiro-50 rounded-lg">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="text-sm text-slate-500">Vendedor</p>
            <p class="font-semibold text-slate-900">{comissaoSelecionada.vendedor}</p>
          </div>
          <p class="text-2xl font-bold text-financeiro-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoSelecionada.valor_comissao)}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-3 text-sm">
          <div>
            <p class="text-slate-500">Venda</p>
            <p class="font-medium">{comissaoSelecionada.numero_venda}</p>
          </div>
          <div>
            <p class="text-slate-500">Cliente</p>
            <p class="font-medium">{comissaoSelecionada.cliente}</p>
          </div>
          <div>
            <p class="text-slate-500">Valor da Venda</p>
            <p class="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoSelecionada.valor_venda)}</p>
          </div>
          <div>
            <p class="text-slate-500">Percentual</p>
            <p class="font-medium">{comissaoSelecionada.percentual_aplicado}%</p>
          </div>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Data do Pagamento</label>
        <input
          type="date"
          bind:value={dataPagamento}
          class="vtur-input w-full"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Observações</label>
        <textarea
          bind:value={observacoesPagamento}
          rows="2"
          class="vtur-input w-full"
          placeholder="Observações opcionais..."
        />
      </div>
    </div>
  {/if}
</Dialog>

<!-- Dialog de Pagamento Múltiplo -->
<Dialog
  bind:open={showPagamentoMultiploDialog}
  title="Pagamento em Lote"
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText={`Pagar ${comissoesSelecionadas.length} Comissões`}
  onConfirm={handlePagamentoMultiplo}
>
  <div class="space-y-4">
    <div class="p-4 bg-blue-50 rounded-lg">
      <p class="font-medium text-blue-900">Resumo do Pagamento</p>
      <div class="mt-2 space-y-1 text-sm">
        <div class="flex justify-between">
          <span class="text-blue-700">Comissões selecionadas:</span>
          <span class="font-medium">{comissoesSelecionadas.length}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-blue-700">Valor total:</span>
          <span class="font-medium text-lg">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorSelecionado)}
          </span>
        </div>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Data do Pagamento</label>
      <input
        type="date"
        bind:value={dataPagamento}
        class="vtur-input w-full"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Observações</label>
      <textarea
        bind:value={observacoesPagamento}
        rows="2"
        class="vtur-input w-full"
        placeholder="Observações para todos os pagamentos..."
      />
    </div>
  </div>
</Dialog>

<!-- Dialog de Detalhes -->
<Dialog
  bind:open={showDetalhesDialog}
  title="Detalhes da Comissão"
  color="financeiro"
  showCancel={true}
  cancelText="Fechar"
  showConfirm={false}
>
  {#if comissaoSelecionada}
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p class="text-slate-500">Venda</p>
          <p class="font-medium">{comissaoSelecionada.numero_venda}</p>
        </div>
        <div>
          <p class="text-slate-500">Status</p>
          <p class="font-medium">
            {#if comissaoSelecionada.status === 'PENDENTE'}
              <span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">Pendente</span>
            {:else if comissaoSelecionada.status === 'PAGA'}
              <span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Paga</span>
            {:else if comissaoSelecionada.status === 'CANCELADA'}
              <span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Cancelada</span>
            {:else}
              <span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{comissaoSelecionada.status}</span>
            {/if}
          </p>
        </div>
        <div>
          <p class="text-slate-500">Vendedor</p>
          <p class="font-medium">{comissaoSelecionada.vendedor}</p>
        </div>
        <div>
          <p class="text-slate-500">Cliente</p>
          <p class="font-medium">{comissaoSelecionada.cliente}</p>
        </div>
        <div>
          <p class="text-slate-500">Data da Venda</p>
          <p class="font-medium">
            {comissaoSelecionada.data_venda 
              ? new Date(comissaoSelecionada.data_venda).toLocaleDateString('pt-BR')
              : '-'}
          </p>
        </div>
        <div>
          <p class="text-slate-500">Referência</p>
          <p class="font-medium">
            {comissaoSelecionada.mes_referencia}/{comissaoSelecionada.ano_referencia}
          </p>
        </div>
      </div>

      <div class="border-t pt-4">
        <h4 class="font-medium text-slate-900 mb-2">Valores</h4>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-slate-500">Valor da Venda</p>
            <p class="font-medium">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoSelecionada.valor_venda)}
            </p>
          </div>
          <div>
            <p class="text-slate-500">Valor Comissionável</p>
            <p class="font-medium">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoSelecionada.valor_comissionavel)}
            </p>
          </div>
          <div>
            <p class="text-slate-500">Percentual Aplicado</p>
            <p class="font-medium">{comissaoSelecionada.percentual_aplicado}%</p>
          </div>
          <div>
            <p class="text-slate-500">Valor Comissão</p>
            <p class="font-bold text-financeiro-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoSelecionada.valor_comissao)}
            </p>
          </div>
        </div>
      </div>

      {#if comissaoSelecionada.status === 'PAGA'}
        <div class="border-t pt-4">
          <h4 class="font-medium text-slate-900 mb-2">Pagamento</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-slate-500">Data do Pagamento</p>
              <p class="font-medium">
                {comissaoSelecionada.data_pagamento 
                  ? new Date(comissaoSelecionada.data_pagamento).toLocaleDateString('pt-BR')
                  : '-'}
              </p>
            </div>
            {#if comissaoSelecionada.observacoes_pagamento}
              <div class="col-span-2">
                <p class="text-slate-500">Observações</p>
                <p class="font-medium">{comissaoSelecionada.observacoes_pagamento}</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</Dialog>
