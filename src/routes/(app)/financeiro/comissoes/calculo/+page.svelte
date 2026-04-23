<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { PageHeader, Card, Button, Dialog, DataTable, FieldInput, FieldSelect } from '$lib/components/ui';
  import { 
    Calculator, RefreshCw, CheckCircle, AlertCircle,
    DollarSign, TrendingUp
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface VendaCalculada {
    venda_id: string;
    numero_venda: string;
    cliente: string;
    valor_venda: number;
    valor_comissionavel: number;
    percentual: number;
    valor_comissao: number;
    regra: string;
    status: 'calculada' | 'ignorada' | 'erro' | 'paga' | 'pendente' | 'cancelada';
    motivo?: string;
  }

  let loading = false;
  let calculando = false;
  let showConfirmDialog = false;
  let showResultDialog = false;
  let resultadoCalculo: {
    processadas: number;
    erro: number;
    total_vendas: number;
    detalhes: VendaCalculada[];
  } | null = null;
  
  let comissoesPendentes: any[] = [];
  let resumoComissoes = { total_pendente: 0, total_pago: 0, total_geral: 0 };
  let persistenciaDisponivel = true;

  // Filtros
  let filtroDataInicio = '';
  let filtroDataFim = '';
  let filtroMes = String(new Date().getMonth() + 1);
  let filtroAno = new Date().getFullYear();
  let filtroVendedor = '';
  let filtroStatus = 'todas';
  let vendedores: any[] = [];

  onMount(() => {
    // Define período padrão (mês atual)
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    filtroDataInicio = primeiroDia.toISOString().split('T')[0];
    filtroDataFim = ultimoDia.toISOString().split('T')[0];
    
    loadComissoes();
    loadVendedores();
  });

  async function loadComissoes() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (filtroStatus !== 'todas') {
        params.set('status', filtroStatus);
      }
      params.set('mes', String(filtroMes));
      params.set('ano', String(filtroAno));
      if (filtroVendedor) params.set('vendedor_id', filtroVendedor);

      const response = await fetch(`/api/v1/financeiro/comissoes/calcular?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar comissões');
      
      const data = await response.json();
      comissoesPendentes = data.items || [];
      resumoComissoes = data.resumo || { total_pendente: 0, total_pago: 0, total_geral: 0 };
      persistenciaDisponivel = data.persistencia_disponivel !== false;
    } catch (err) {
      toast.error('Erro ao carregar comissões pendentes');
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

  async function handleCalcular() {
    calculando = true;
    try {
      const response = await fetch('/api/v1/financeiro/comissoes/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_inicio: filtroDataInicio,
          data_fim: filtroDataFim,
          mes_referencia: Number(filtroMes),
          ano_referencia: filtroAno,
          vendedor_ids: filtroVendedor ? [filtroVendedor] : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      resultadoCalculo = data;
      showResultDialog = true;
      
      // Recarrega comissões pendentes
      await loadComissoes();
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao calcular comissões');
    } finally {
      calculando = false;
    }
  }

  function openConfirmDialog() {
    showConfirmDialog = true;
  }

  function getStatusBadge(status: string) {
    switch (String(status || '').toLowerCase()) {
      case 'calculada':
        return '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Calculada</span>';
      case 'ignorada':
        return '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Ignorada</span>';
      case 'erro':
        return '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Erro</span>';
      case 'paga':
        return '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Paga</span>';
      case 'pendente':
        return '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Pendente</span>';
      case 'cancelada':
        return '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Cancelada</span>';
      default:
        return status;
    }
  }

  const columnsResultado = [
    { key: 'numero_venda', label: 'Venda', sortable: true, width: '120px' },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { 
      key: 'valor_venda', 
      label: 'Valor Venda', 
      sortable: true, 
      align: 'right' as const,
      formatter: (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    },
    { 
      key: 'percentual', 
      label: '%', 
      sortable: true, 
      width: '80px',
      align: 'center' as const,
      formatter: (value: number) => `${value}%`
    },
    { 
      key: 'valor_comissao', 
      label: 'Comissão', 
      sortable: true, 
      align: 'right' as const,
      formatter: (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    },
    { key: 'regra', label: 'Regra', sortable: true, width: '150px' },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true, 
      width: '100px',
      formatter: (value: string) => getStatusBadge(value)
    }
  ];

  const columnsPendentes = [
    { key: 'numero_venda', label: 'Venda', sortable: true, width: '120px' },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'vendedor', label: 'Vendedor', sortable: true, width: '150px' },
    { 
      key: 'data_venda', 
      label: 'Data', 
      sortable: true, 
      width: '100px',
      formatter: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'valor_venda', 
      label: 'Valor Venda', 
      sortable: true, 
      align: 'right' as const,
      formatter: (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
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
      formatter: (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    },
    {
      key: 'valor_pago',
      label: 'Pago',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
    },
    {
      key: 'data_pagamento',
      label: 'Data Pgto',
      sortable: true,
      width: '110px',
      formatter: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '110px',
      formatter: (value: string) => getStatusBadge(value)
    }
  ];

  $: totalVendasPeriodo = comissoesPendentes.reduce((acc, c) => acc + c.valor_venda, 0);
  $: totalPagoPeriodo = Number(resumoComissoes.total_pago || 0);
  $: totalPendentePeriodo = Number(resumoComissoes.total_pendente || 0);
  $: quantidadePagas = comissoesPendentes.filter((item) => String(item.status || '').toLowerCase() === 'paga').length;
  $: quantidadePendentes = comissoesPendentes.filter((item) => String(item.status || '').toLowerCase() === 'pendente').length;
  $: statusOptions = [
    { value: 'todas', label: 'Todas' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'paga', label: 'Pagas' },
    { value: 'cancelada', label: 'Canceladas' }
  ];
</script>

<svelte:head>
  <title>Cálculo de Comissões | VTUR</title>
</svelte:head>

<PageHeader 
  title="Cálculo de Comissões"
  subtitle="Acompanhe o cálculo e o estado persistido das comissões por período"
  color="financeiro"
  breadcrumbs={[
    { label: 'Financeiro', href: '/financeiro' },
    { label: 'Comissões', href: '/financeiro/comissoes' },
    { label: 'Cálculo' }
  ]}
/>

<!-- Filtros -->
<Card header="Filtros de Cálculo" color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
    <FieldInput
      label="Data Início"
      type="date"
      bind:value={filtroDataInicio}
      class_name="w-full"
    />

    <FieldInput
      label="Data Fim"
      type="date"
      bind:value={filtroDataFim}
      class_name="w-full"
    />

    <FieldSelect
      label="Mês Referência"
      bind:value={filtroMes}
      options={Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' })
      }))}
      class_name="w-full"
    />

    <FieldInput
      label="Ano"
      type="number"
      bind:value={filtroAno}
      class_name="w-full"
    />

    <FieldSelect
      label="Status"
      bind:value={filtroStatus}
      options={statusOptions}
      class_name="w-full"
    />

    <FieldSelect
      label="Vendedor (opcional)"
      bind:value={filtroVendedor}
      options={[
        { value: '', label: 'Todos os vendedores' },
        ...vendedores.map((v) => ({ value: v.id, label: String(v.nome_completo || v.email || 'Vendedor') }))
      ]}
      class_name="w-full"
    />
  </div>

  <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
    <Button
      variant="secondary"
      on:click={loadComissoes}
      disabled={loading}
    >
      <RefreshCw size={16} class="mr-2" />
      Atualizar
    </Button>
    <Button
      variant="primary"
      color="financeiro"
      on:click={openConfirmDialog}
      disabled={calculando}
    >
      {#if calculando}
        <RefreshCw size={16} class="mr-2 animate-spin" />
        Calculando...
      {:else}
        <Calculator size={16} class="mr-2" />
        Calcular Comissões
      {/if}
    </Button>
  </div>
</Card>

<!-- Resumo -->
<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Calculator size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Pendentes no período</p>
      <p class="text-2xl font-bold text-slate-900">{quantidadePendentes}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><TrendingUp size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total em Vendas</p>
      <p class="text-2xl font-bold text-slate-900">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalVendasPeriodo)}
      </p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><DollarSign size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total pendente</p>
      <p class="text-2xl font-bold text-slate-900">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPendentePeriodo)}
      </p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><CheckCircle size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total pago</p>
      <p class="text-2xl font-bold text-slate-900">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPagoPeriodo)}
      </p>
    </div>
  </div>
</div>

<!-- Lista de Comissões Pendentes -->
<Card header={`Comissões do período - ${comissoesPendentes.length} registros`} color="financeiro">
  <div class="mb-4 rounded-[18px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
    O painel agora mistura cálculo e persistência: ele mostra <strong>{quantidadePendentes}</strong> pendentes, <strong>{quantidadePagas}</strong> pagas e respeita o status salvo no módulo principal de comissões.
  </div>
  {#if !persistenciaDisponivel}
    <div class="mb-4 flex items-start gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
      <AlertCircle size={18} class="mt-0.5 shrink-0" />
      <div>
        <p class="font-medium">Persistência indisponível neste ambiente.</p>
        <p class="mt-1 text-amber-800">
          O cálculo continua funcionando, mas os status persistidos de pagamento e cancelamento só ficarão completos quando a tabela <code>comissoes</code> estiver disponível.
        </p>
      </div>
    </div>
  {/if}
  <DataTable
    columns={columnsPendentes}
    data={comissoesPendentes}
    color="financeiro"
    {loading}
    pageSize={25}
    searchable={true}
    exportable={true}
    emptyMessage="Nenhuma comissão encontrada para o período e status selecionados"
  />
</Card>

<!-- Dialog de Confirmação -->
<Dialog
  bind:open={showConfirmDialog}
  title="Confirmar Cálculo"
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText="Calcular"
  onConfirm={handleCalcular}
>
  <div class="space-y-4">
    <div class="p-4 bg-amber-50 rounded-lg border border-amber-200">
      <div class="flex items-start gap-3">
        <AlertCircle class="text-amber-600 mt-0.5" size={20} />
        <div>
          <p class="font-medium text-amber-800">Atenção</p>
          <p class="text-sm text-amber-700">
            O cálculo de comissões irá processar todas as vendas do período selecionado 
            que ainda não possuem comissão calculada ou que precisam ser recalculadas.
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      <div>
        <p class="text-slate-500">Período</p>
        <p class="font-medium">
          {new Date(filtroDataInicio).toLocaleDateString('pt-BR')} até {new Date(filtroDataFim).toLocaleDateString('pt-BR')}
        </p>
      </div>
      <div>
        <p class="text-slate-500">Referência</p>
        <p class="font-medium">
          {new Date(filtroAno, Number(filtroMes) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div>
        <p class="text-slate-500">Vendedor</p>
        <p class="font-medium">
          {filtroVendedor 
            ? (vendedores.find(v => v.id === filtroVendedor)?.nome_completo || 'Selecionado')
            : 'Todos'}
        </p>
      </div>
      <div>
        <p class="text-slate-500">Status Atual</p>
        <p class="font-medium">{quantidadePendentes} pendentes · {quantidadePagas} pagas</p>
      </div>
    </div>
  </div>
</Dialog>

<!-- Dialog de Resultado -->
<Dialog
  bind:open={showResultDialog}
  title="Resultado do Cálculo"
  color="financeiro"
  showCancel={true}
  cancelText="Fechar"
  showConfirm={false}
  maxWidth="4xl"
>
  {#if resultadoCalculo}
    <div class="space-y-4">
      <!-- Resumo -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-4 bg-green-50 rounded-lg text-center">
          <p class="text-sm text-green-600">Processadas</p>
          <p class="text-2xl font-bold text-green-700">{resultadoCalculo.processadas}</p>
        </div>
        <div class="p-4 bg-red-50 rounded-lg text-center">
          <p class="text-sm text-red-600">Erros</p>
          <p class="text-2xl font-bold text-red-700">{resultadoCalculo.erro}</p>
        </div>
        <div class="p-4 bg-blue-50 rounded-lg text-center">
          <p class="text-sm text-blue-600">Total Vendas</p>
          <p class="text-2xl font-bold text-blue-700">{resultadoCalculo.total_vendas}</p>
        </div>
      </div>

      <!-- Detalhes -->
      {#if resultadoCalculo.detalhes.length > 0}
        <div class="max-h-96 overflow-auto">
          <DataTable
            columns={columnsResultado}
            data={resultadoCalculo.detalhes}
            color="financeiro"
            pageSize={10}
            searchable={true}
            emptyMessage="Nenhum resultado"
          />
        </div>
      {/if}

      <!-- Ações -->
      <div class="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="secondary"
          on:click={() => goto('/financeiro/comissoes')}
        >
          <DollarSign size={16} class="mr-2" />
          Ir para Pagamentos
        </Button>
      </div>
    </div>
  {/if}
</Dialog>
