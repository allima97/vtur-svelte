<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { 
    CheckCircle, XCircle, AlertCircle, Search, 
    DollarSign, Calendar, FileText, Loader2, 
    Upload, Download, FileCheck, CreditCard,
    TrendingUp, Clock, Filter, ChevronRight
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface Pagamento {
    id: string;
    codigo: string;
    cliente: string;
    cliente_id: string;
    descricao: string;
    valor: number;
    data_pagamento: string; // mapeado de created_at (vendas_pagamentos nao tem data_pagamento)
    forma_pagamento: string;
    forma_pagamento_id: string;
    status: 'pendente' | 'conciliado' | 'divergente' | 'cancelado';
    venda_id?: string;
    venda_codigo?: string;
    comprovante?: string;
    tipo: 'entrada' | 'saida';
    categoria: string;
    created_at: string;
    data_conciliacao?: string;
  }

  interface Venda {
    id: string;
    codigo: string;
    cliente_nome: string;
    valor_total: number;
  }

  interface FormaPagamento {
    id: string;
    codigo: string;
    nome: string;
    cor: string;
    icone: string;
  }

  let pagamentos: Pagamento[] = [];
  let vendas: Venda[] = [];
  let formasPagamento: FormaPagamento[] = [];
  let loading = true;
  let searchQuery = '';
  let filtroStatus = 'todas';
  let filtroFormaPagamento = 'todas';
  let dataInicio = '';
  let dataFim = '';
  
  // Dialogs
  let showConciliarDialog = false;
  let showUploadDialog = false;
  let showDetalheDialog = false;
  let pagamentoSelecionado: Pagamento | null = null;
  let vendaSelecionada = '';
  let processando = false;
  let arquivoSelecionado: File | null = null;

  onMount(async () => {
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    
    dataFim = hoje.toISOString().split('T')[0];
    dataInicio = trintaDiasAtras.toISOString().split('T')[0];
    
    await Promise.all([
      carregarPagamentos(),
      carregarVendas(),
      carregarFormasPagamento()
    ]);
  });

  async function carregarPagamentos() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (filtroStatus !== 'todas') params.append('status', filtroStatus);
      if (filtroFormaPagamento !== 'todas') params.append('forma_pagamento_id', filtroFormaPagamento);
      if (dataInicio) params.append('data_inicio', dataInicio);
      if (dataFim) params.append('data_fim', dataFim);
      if (searchQuery) params.append('q', searchQuery);

      const response = await fetch(`/api/v1/pagamentos?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        pagamentos = (data.items || []).map((p: any) => ({
          id: p.id,
          codigo: p.codigo || `PAG-${p.id.slice(0, 8).toUpperCase()}`,
          cliente: p.cliente?.nome || p.cliente_nome || 'N/A',
          cliente_id: p.cliente_id,
          descricao: p.descricao || `Venda ${p.venda?.numero_venda || ''}`,
          valor: Number(p.valor_total || p.valor) || 0,
          data_pagamento: p.created_at || p.data_pagamento || '',
          forma_pagamento: p.forma_pagamento?.nome || p.forma_nome || p.forma_pagamento || 'N/A',
          forma_pagamento_id: p.forma_pagamento_id,
          status: p.status || 'pendente',
          venda_id: p.venda_id,
          venda_codigo: p.venda?.numero_venda,
          comprovante: p.comprovante,
          tipo: p.tipo || 'entrada',
          categoria: p.categoria || 'venda',
          created_at: p.created_at,
          data_conciliacao: p.data_conciliacao
        }));
      } else {
        toast.error('Erro ao carregar pagamentos');
      }
    } catch (err) {
      console.error('Erro ao carregar pagamentos:', err);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      loading = false;
    }
  }

  async function carregarVendas() {
    try {
      const response = await fetch('/api/v1/vendas/list');
      if (response.ok) {
        const data = await response.json();
        vendas = (data.items || []).map((v: any) => ({
          id: v.id,
          codigo: v.codigo || v.numero_venda || `V${v.id.slice(0, 6).toUpperCase()}`,
          cliente_nome: v.cliente || v.cliente_nome || 'N/A',
          valor_total: Number(v.valor_total) || 0
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
    }
  }

  async function carregarFormasPagamento() {
    try {
      const response = await fetch('/api/v1/financeiro/formas-pagamento?ativas=true');
      if (response.ok) {
        const data = await response.json();
        formasPagamento = data.items || [];
      }
    } catch (err) {
      console.error('Erro ao carregar formas de pagamento:', err);
    }
  }

  // Computed values
  $: pagamentosFiltrados = pagamentos;
  $: pendentes = pagamentos.filter(p => p.status === 'pendente');
  $: conciliados = pagamentos.filter(p => p.status === 'conciliado');
  $: divergentes = pagamentos.filter(p => p.status === 'divergente');
  $: totalPendente = pendentes.reduce((acc, p) => acc + p.valor, 0);
  $: totalConciliado = conciliados.reduce((acc, p) => acc + p.valor, 0);
  $: totalDivergente = divergentes.reduce((acc, p) => acc + p.valor, 0);

  const columns = [
    { 
      key: 'codigo', 
      label: 'Código', 
      sortable: true,
      width: '120px'
    },
    { 
      key: 'cliente', 
      label: 'Cliente / Descrição', 
      sortable: true,
      formatter: (value: string, row: Pagamento) => {
        return `<div class="flex flex-col">
          <span class="font-medium text-slate-900">${value}</span>
          <span class="text-xs text-slate-500">${row.descricao}</span>
        </div>`;
      }
    },
    { 
      key: 'data_pagamento', 
      label: 'Data', 
      sortable: true,
      width: '110px',
      formatter: (value: string) => new Date(value).toLocaleDateString('pt-BR')
    },
    { 
      key: 'forma_pagamento', 
      label: 'Forma', 
      sortable: true,
      width: '140px'
    },
    { 
      key: 'valor', 
      label: 'Valor', 
      sortable: true,
      width: '130px',
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true,
      width: '120px',
      formatter: (value: string) => getStatusHtml(value)
    }
  ];

  function getStatusHtml(status: string): string {
    const styles: Record<string, string> = {
      conciliado: 'bg-green-100 text-green-700',
      pendente: 'bg-amber-100 text-amber-700',
      divergente: 'bg-red-100 text-red-700',
      cancelado: 'bg-slate-100 text-slate-600'
    };
    const labels: Record<string, string> = {
      conciliado: 'Conciliado',
      pendente: 'Pendente',
      divergente: 'Divergente',
      cancelado: 'Cancelado'
    };
    return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pendente}">${labels[status] || status}</span>`;
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  function abrirDetalhe(pagamento: Pagamento) {
    pagamentoSelecionado = pagamento;
    vendaSelecionada = pagamento.venda_id || '';
    showDetalheDialog = true;
  }

  function abrirConciliacao(pagamento: Pagamento) {
    pagamentoSelecionado = pagamento;
    vendaSelecionada = pagamento.venda_id || '';
    showDetalheDialog = false;
    showConciliarDialog = true;
  }

  function abrirUpload(pagamento: Pagamento) {
    pagamentoSelecionado = pagamento;
    arquivoSelecionado = null;
    showUploadDialog = true;
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      arquivoSelecionado = input.files[0];
    }
  }

  async function handleUpload() {
    if (!pagamentoSelecionado || !arquivoSelecionado) return;
    
    processando = true;
    try {
      const formData = new FormData();
      formData.append('file', arquivoSelecionado);
      formData.append('pagamento_id', pagamentoSelecionado.id);

      const response = await fetch('/api/v1/pagamentos/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer upload');
      }

      toast.success('Comprovante anexado com sucesso!');
      await carregarPagamentos();
      showUploadDialog = false;
      pagamentoSelecionado = null;
      arquivoSelecionado = null;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer upload do comprovante');
    } finally {
      processando = false;
    }
  }

  async function handleConciliar() {
    if (!pagamentoSelecionado) return;
    
    processando = true;
    try {
      const response = await fetch(`/api/v1/pagamentos/${pagamentoSelecionado.id}/conciliar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venda_id: vendaSelecionada,
          status: 'conciliado',
          status_anterior: pagamentoSelecionado.status
        })
      });

      if (!response.ok) throw new Error('Erro ao conciliar');

      toast.success('Pagamento conciliado com sucesso!');
      await carregarPagamentos();
      showConciliarDialog = false;
      showDetalheDialog = false;
      pagamentoSelecionado = null;
      vendaSelecionada = '';
    } catch (err) {
      toast.error('Erro ao conciliar pagamento');
    } finally {
      processando = false;
    }
  }

  async function handleMarcarDivergente() {
    if (!pagamentoSelecionado) return;
    
    processando = true;
    try {
      const response = await fetch(`/api/v1/pagamentos/${pagamentoSelecionado.id}/conciliar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'divergente',
          status_anterior: pagamentoSelecionado.status
        })
      });

      if (!response.ok) throw new Error('Erro ao atualizar');

      toast.success('Marcado como divergente');
      await carregarPagamentos();
      showConciliarDialog = false;
      showDetalheDialog = false;
      pagamentoSelecionado = null;
    } catch (err) {
      toast.error('Erro ao atualizar pagamento');
    } finally {
      processando = false;
    }
  }

  async function handleExportar() {
    try {
      const dados = pagamentosFiltrados.map(p => ({
        Codigo: p.codigo,
        Cliente: p.cliente,
        Descricao: p.descricao,
        Valor: p.valor,
        DataPagamento: p.data_pagamento,
        FormaPagamento: p.forma_pagamento,
        Status: p.status,
        Venda: p.venda_codigo || '',
        TemComprovante: p.comprovante ? 'Sim' : 'Não'
      }));

      const headers = Object.keys(dados[0] || {});
      const csv = [
        headers.join(';'),
        ...dados.map(row => headers.map(h => row[h as keyof typeof row]).join(';'))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `conciliacao_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Relatório exportado com sucesso!');
    } catch (err) {
      toast.error('Erro ao exportar relatório');
    }
  }
</script>

<svelte:head>
  <title>Conciliação | VTUR</title>
</svelte:head>

<PageHeader 
  title="Conciliação"
  subtitle="Concilie pagamentos recebidos com vendas"
  color="financeiro"
  breadcrumbs={[
    { label: 'Financeiro', href: '/financeiro' },
    { label: 'Conciliação' }
  ]}
/>

<!-- KPIs -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <KPICard 
    title="Pendentes" 
    value={pendentes.length}
    subtitle={formatCurrency(totalPendente)}
    color="financeiro" 
    icon={Clock}
  />

  <KPICard 
    title="Conciliados" 
    value={conciliados.length}
    subtitle={formatCurrency(totalConciliado)}
    color="financeiro" 
    icon={CheckCircle}
  />

  <KPICard 
    title="Divergentes" 
    value={divergentes.length}
    subtitle={formatCurrency(totalDivergente)}
    color="financeiro" 
    icon={AlertCircle}
  />

  <KPICard 
    title="Total" 
    value={pagamentos.length}
    subtitle={formatCurrency(pagamentos.reduce((acc, p) => acc + p.valor, 0))}
    color="financeiro" 
    icon={TrendingUp}
  />
</div>

<!-- Filtros -->
<Card color="financeiro" class="mb-6">
  <div class="flex flex-col lg:flex-row gap-4 items-end">
    <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="relative">
        <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar pagamentos..."
          bind:value={searchQuery}
          on:change={carregarPagamentos}
          class="vtur-input pl-10 w-full"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select bind:value={filtroStatus} on:change={carregarPagamentos} class="vtur-input w-full">
          <option value="todas">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="conciliado">Conciliados</option>
          <option value="divergente">Divergentes</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label>
        <select bind:value={filtroFormaPagamento} on:change={carregarPagamentos} class="vtur-input w-full">
          <option value="todas">Todas</option>
          {#each formasPagamento as fp}
            <option value={fp.id}>{fp.nome}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
        <input type="date" bind:value={dataInicio} on:change={carregarPagamentos} class="vtur-input w-full" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
        <input type="date" bind:value={dataFim} on:change={carregarPagamentos} class="vtur-input w-full" />
      </div>
    </div>
    <Button variant="secondary" on:click={handleExportar}>
      <Download size={18} class="mr-2" />
      Exportar
    </Button>
  </div>
</Card>

<!-- Tabela de Pagamentos -->
<DataTable
  {columns}
  data={pagamentosFiltrados}
  color="financeiro"
  {loading}
  title="Pagamentos"
  emptyMessage="Nenhum pagamento encontrado"
  onRowClick={abrirDetalhe}
/>

<!-- Dialog de Detalhe do Pagamento -->
<Dialog
  bind:open={showDetalheDialog}
  title="Detalhes do Pagamento"
  color="financeiro"
  showCancel={true}
  cancelText="Fechar"
  showConfirm={false}
>
  {#if pagamentoSelecionado}
    <div class="space-y-4">
      <div class="p-4 bg-slate-50 rounded-lg">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="text-sm text-slate-500">Código</p>
            <p class="font-semibold text-slate-900">{pagamentoSelecionado.codigo}</p>
          </div>
          <p class="text-2xl font-bold text-financeiro-600">
            {formatCurrency(pagamentoSelecionado.valor)}
          </p>
        </div>
        <p class="text-slate-700">{pagamentoSelecionado.cliente}</p>
        <p class="text-sm text-slate-500">{pagamentoSelecionado.descricao}</p>
        <div class="flex items-center gap-4 mt-2 text-sm text-slate-500">
          <span class="flex items-center gap-1">
            <Calendar size={14} />
            {new Date(pagamentoSelecionado.data_pagamento).toLocaleDateString('pt-BR')}
          </span>
          <span class="flex items-center gap-1">
            <CreditCard size={14} />
            {pagamentoSelecionado.forma_pagamento}
          </span>
        </div>
        <div class="mt-3">
          <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full {getStatusHtml(pagamentoSelecionado.status).split('"')[1]}">
            {pagamentoSelecionado.status === 'conciliado' ? 'Conciliado' : 
             pagamentoSelecionado.status === 'pendente' ? 'Pendente' : 
             pagamentoSelecionado.status === 'divergente' ? 'Divergente' : 'Cancelado'}
          </span>
        </div>
      </div>

      {#if pagamentoSelecionado.venda_codigo}
        <div class="p-4 bg-green-50 rounded-lg border border-green-200">
          <p class="text-sm text-green-700 font-medium mb-1">Venda Vinculada</p>
          <p class="text-green-900">{pagamentoSelecionado.venda_codigo}</p>
        </div>
      {/if}

      {#if pagamentoSelecionado.comprovante}
        <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p class="text-sm text-blue-700 font-medium mb-2">Comprovante Anexado</p>
          <a 
            href={pagamentoSelecionado.comprovante}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <FileCheck size={18} />
            Visualizar Comprovante
          </a>
        </div>
      {/if}

      <div class="flex gap-3 pt-2">
        {#if pagamentoSelecionado.status === 'pendente'}
          <Button
            variant="primary"
            color="financeiro"
            class_name="flex-1 justify-center"
            on:click={() => { showDetalheDialog = false; showConciliarDialog = true; }}
          >
            <CheckCircle size={16} class="mr-2" />
            Conciliar
          </Button>
        {:else if pagamentoSelecionado.status === 'divergente'}
          <Button
            variant="secondary"
            class_name="flex-1 justify-center"
            on:click={() => { showDetalheDialog = false; showConciliarDialog = true; }}
          >
            <AlertCircle size={16} class="mr-2" />
            Revisar
          </Button>
        {/if}
        
        {#if !pagamentoSelecionado.comprovante}
          <Button
            variant="secondary"
            on:click={() => { showDetalheDialog = false; showUploadDialog = true; }}
          >
            <Upload size={16} class="mr-2" />
            Anexar Comprovante
          </Button>
        {/if}
      </div>
    </div>
  {/if}
</Dialog>

<!-- Dialog de Conciliação -->
<Dialog
  bind:open={showConciliarDialog}
  title="Conciliar Pagamento"
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={false}
>
  {#if pagamentoSelecionado}
    <div class="space-y-4">
      <div class="p-4 bg-slate-50 rounded-lg">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="text-sm text-slate-500">Pagamento</p>
            <p class="font-semibold text-slate-900">{pagamentoSelecionado.codigo}</p>
          </div>
          <p class="text-xl font-bold text-financeiro-600">
            {formatCurrency(pagamentoSelecionado.valor)}
          </p>
        </div>
        <p class="text-slate-700">{pagamentoSelecionado.cliente}</p>
        <p class="text-sm text-slate-500">{pagamentoSelecionado.descricao}</p>
      </div>

      <div>
        <p class="text-sm font-medium text-slate-700 mb-2">Vincular à Venda</p>
        <select bind:value={vendaSelecionada} class="vtur-input w-full">
          <option value="">Selecione a venda...</option>
          {#each vendas as venda}
            <option value={venda.id}>{venda.codigo} - {venda.cliente_nome} ({formatCurrency(venda.valor_total)})</option>
          {/each}
        </select>
        <p class="text-xs text-slate-500 mt-1">
          Selecione a venda correspondente a este pagamento
        </p>
      </div>

      <div class="flex gap-3 pt-4">
        <Button
          variant="primary"
          color="financeiro"
          class_name="flex-1 justify-center"
          on:click={handleConciliar}
          disabled={processando}
        >
          {#if processando}
            <Loader2 size={16} class="mr-2 animate-spin" />
          {:else}
            <CheckCircle size={16} class="mr-2" />
          {/if}
          Confirmar Conciliação
        </Button>
        <Button
          variant="secondary"
          on:click={handleMarcarDivergente}
          disabled={processando}
        >
          <AlertCircle size={16} class="mr-2" />
          Divergente
        </Button>
      </div>
    </div>
  {/if}
</Dialog>

<!-- Dialog de Upload -->
<Dialog
  bind:open={showUploadDialog}
  title="Anexar Comprovante"
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText="Enviar"
  confirmVariant="primary"
  loading={processando}
  onConfirm={handleUpload}
  confirmDisabled={!arquivoSelecionado}
>
  {#if pagamentoSelecionado}
    <div class="space-y-4">
      <div class="p-4 bg-slate-50 rounded-lg">
        <p class="text-sm text-slate-500">Pagamento</p>
        <p class="font-semibold text-slate-900">{pagamentoSelecionado.codigo}</p>
        <p class="text-financeiro-600 font-medium">{formatCurrency(pagamentoSelecionado.valor)}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">
          Selecione o arquivo
        </label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          on:change={handleFileSelect}
          class="vtur-input w-full"
        />
        <p class="text-xs text-slate-500 mt-1">
          Formatos aceitos: JPG, PNG, PDF. Tamanho máximo: 5MB
        </p>
      </div>

      {#if arquivoSelecionado}
        <div class="p-3 bg-green-50 rounded-lg flex items-center gap-2">
          <FileCheck size={18} class="text-green-600" />
          <span class="text-sm text-green-700">{arquivoSelecionado.name}</span>
          <span class="text-xs text-green-600">
            ({(arquivoSelecionado.size / 1024).toFixed(1)} KB)
          </span>
        </div>
      {/if}
    </div>
  {/if}
</Dialog>
