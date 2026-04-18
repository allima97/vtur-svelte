<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { DataTable, PageHeader, Card, Button } from '$lib/components/ui';
  import { Plus, FileSpreadsheet, ShoppingCart, DollarSign, Shield, Wallet, Filter, RotateCcw, Clock, CheckCircle, AlertCircle } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';

  interface Venda {
    id: string;
    codigo: string;
    cliente: string;
    cliente_id: string;
    vendedor_id: string;
    destino: string;
    destino_cidade: string;
    data_venda: string | null;
    data_embarque: string | null;
    data_final: string | null;
    valor_total: number;
    valor_total_bruto: number;
    valor_taxas: number;
    status: 'confirmada' | 'pendente' | 'cancelada' | 'concluida';
    vendedor: string;
    tipo: 'pacote' | 'hotel' | 'passagem' | 'servico';
    recibos: string[];
    produtos: string[];
    conciliado: boolean | null;
  }

  type PeriodoPreset = 'todos' | 'mes_atual' | 'mes_anterior' | 'mes' | 'dia';
  type CampoBusca = 'todos' | 'cliente' | 'vendedor' | 'destino' | 'produto' | 'recibo';

  let vendas: Venda[] = [];
  let loading = true;
  let errorMessage: string | null = null;
  let vendedoresEquipe: Array<{ id: string; nome_completo: string | null }> = [];
  let empresasMaster: Array<{ id: string; nome_fantasia: string | null }> = [];
  let equipeGestor: Array<{ id: string; nome_completo: string | null }> = [];
  let filtroCompanyId = '';
  let currentPage = 1;
  let pageSize = 20;
  let totalItems = 0;
  let somentePendentes = false;
  let somenteConciliacaoPendente = false;
  let somenteBacklogOperacional = false;

  let currentAbortController: AbortController | null = null;

  $: canCreate = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('vendas', 'create') || permissoes.can('vendas_consulta', 'create');
  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('vendas', 'edit') || permissoes.can('vendas_consulta', 'edit');
  $: canDelete = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('vendas', 'delete') || permissoes.can('vendas_consulta', 'delete');
  $: canAdmin = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('vendas', 'admin') || permissoes.can('vendas_consulta', 'admin');
  $: isMaster = $permissoes.isMaster;
  $: isGestor = $permissoes.isGestor;
  $: isAdmin = $permissoes.isSystemAdmin;

  let filtroPeriodo: PeriodoPreset = 'mes_atual';
  let campoBusca: CampoBusca = 'todos';
  let busca = '';
  let filtroMes = monthValueLocal(new Date());
  let filtroDiaInicio = dateToISODateLocal(new Date());
  let filtroDiaFim = dateToISODateLocal(new Date());
  let filtroVendedorId = '';
  let filtroStatus = '';
  let filtroTipo = '';

  let kpis = {
    totalVendas: 0,
    totalTaxas: 0,
    totalLiquido: 0,
    totalSeguro: 0
  };
  let periodoCarregadoTexto = 'Resultados de todas as vendas';

  const monthOptions = buildMonthOptions();

  function getPlaceholderBusca() {
    switch (campoBusca) {
      case 'cliente': return 'Nome do cliente...';
      case 'vendedor': return 'Nome do vendedor...';
      case 'destino': return 'Destino ou cidade...';
      case 'produto': return 'Produto do recibo...';
      case 'recibo': return 'Numero do recibo...';
      default: return 'Nome, destino, produto ou recibo...';
    }
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return '-';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return new Date(value).toLocaleDateString('pt-BR');
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  function pad2(value: number) {
    return String(value).padStart(2, '0');
  }

  function dateToISODateLocal(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function monthValueLocal(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
  }

  function buildMonthOptions() {
    const items: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 36; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = monthValueLocal(d);
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      items.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return items;
  }

  function getPeriodoRange() {
    const hoje = new Date();
    const hojeIso = dateToISODateLocal(hoje);

    if (filtroPeriodo === 'todos') return null;

    if (filtroPeriodo === 'mes_anterior') {
      const base = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const inicio = dateToISODateLocal(base);
      const fim = dateToISODateLocal(new Date(base.getFullYear(), base.getMonth() + 1, 0));
      return { inicio, fim };
    }

    if (filtroPeriodo === 'mes') {
      const match = String(filtroMes || '').match(/^(\d{4})-(\d{2})$/);
      if (!match) return null;
      const year = Number(match[1]);
      const monthIdx = Number(match[2]) - 1;
      const inicio = dateToISODateLocal(new Date(year, monthIdx, 1));
      const fim = dateToISODateLocal(new Date(year, monthIdx + 1, 0));
      return { inicio, fim };
    }

    if (filtroPeriodo === 'dia') {
      const inicio = filtroDiaInicio || hojeIso;
      const fimRaw = filtroDiaFim || inicio;
      const fim = fimRaw < inicio ? inicio : fimRaw;
      return { inicio, fim };
    }

    const inicio = dateToISODateLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    return { inicio, fim: hojeIso };
  }

  const columns = [
    {
      key: 'data_venda',
      label: 'Data venda',
      sortable: true,
      width: '120px',
      formatter: (value: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '-')
    },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'vendedor', label: 'Vendedor', sortable: true, width: '180px' },
    { key: 'destino_cidade', label: 'Destino', sortable: true, width: '190px' },
    {
      key: 'produtos',
      label: 'Produto',
      sortable: true,
      formatter: (_value: string[], row: Venda) => row.produtos?.join(' | ') || '-'
    },
    {
      key: 'data_embarque',
      label: 'Embarque',
      sortable: true,
      width: '120px',
      formatter: (value: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '-')
    },
    {
      key: 'valor_total',
      label: 'Valor',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
    },
    {
      key: 'valor_taxas',
      label: 'Taxas',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : '-'
    },
    {
      key: 'conciliado',
      label: 'Conciliado',
      sortable: true,
      width: '120px',
      formatter: (value: boolean | null) => {
        if (value == null) return '<span class="text-slate-400">-</span>';
        if (value) return '<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Sim</span>';
        return '<span class="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Não</span>';
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '130px',
      formatter: (value: string) => {
        const styles: Record<string, string> = {
          confirmada: 'bg-green-100 text-green-700',
          pendente: 'bg-amber-100 text-amber-700',
          cancelada: 'bg-red-100 text-red-700',
          concluida: 'bg-blue-100 text-blue-700'
        };
        const labels: Record<string, string> = {
          confirmada: 'Confirmada',
          pendente: 'Pendente',
          cancelada: 'Cancelada',
          concluida: 'Concluída'
        };
        return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] ?? ''}">${labels[value] ?? value}</span>`;
      }
    }
  ];

  async function loadMasterEmpresas() {
    try {
      const response = await fetch('/api/v1/admin/empresas');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      empresasMaster = Array.isArray(payload?.items) ? payload.items : [];
    } catch {
      empresasMaster = [];
    }
  }

  async function loadGestorEquipe() {
    try {
      const response = await fetch('/api/v1/vendas/gestor-equipe');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      equipeGestor = Array.isArray(payload?.items) ? payload.items : [];
    } catch {
      equipeGestor = [];
    }
  }

  async function loadVendas() {
    if (currentAbortController) {
      currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    loading = true;
    errorMessage = null;

    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('pageSize', String(pageSize));
      params.set('include_kpis', '1');

      if (isMaster) params.set('include_vendedores', '1');

      const periodo = getPeriodoRange();
      if (periodo) {
        params.set('inicio', periodo.inicio);
        params.set('fim', periodo.fim);
        periodoCarregadoTexto = periodo.inicio === periodo.fim ? `Resultados do dia ${formatDate(periodo.inicio)}` : `Resultados de ${formatDate(periodo.inicio)} até ${formatDate(periodo.fim)}`;
      } else {
        periodoCarregadoTexto = 'Resultados de todas as vendas';
      }

      if (filtroCompanyId) params.set('company_id', filtroCompanyId);
      if (filtroVendedorId) params.set('vendedor_id', filtroVendedorId);
      if (filtroStatus) params.set('status', filtroStatus);
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (busca.trim()) {
        params.set('q', busca.trim());
        params.set('campo', campoBusca);
      }

      const response = await fetch(`/api/v1/vendas/list?${params.toString()}`, { signal });
      if (!response.ok) throw new Error(await response.text());

      const payload = await response.json();
      vendas = Array.isArray(payload?.items) ? payload.items : [];
      totalItems = Number(payload?.total || 0);

      if (isMaster && Array.isArray(payload?.vendedores) && payload.vendedores.length > 0) {
        vendedoresEquipe = payload.vendedores;
      } else {
        vendedoresEquipe = Array.from(
          new Map(
            vendas
              .map((item) => ({ id: String(item.vendedor_id || '').trim(), nome_completo: String(item.vendedor || '').trim() }))
              .filter((item) => item.id)
              .map((item) => [item.id, item])
          ).values()
        );
      }

      kpis = {
        totalVendas: Number(payload?.kpis?.totalVendas || 0),
        totalTaxas: Number(payload?.kpis?.totalTaxas || 0),
        totalLiquido: Number(payload?.kpis?.totalLiquido || 0),
        totalSeguro: Number(payload?.kpis?.totalSeguro || 0)
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      errorMessage = err instanceof Error ? err.message : 'Erro ao carregar vendas.';
      vendas = [];
      totalItems = 0;
      kpis = { totalVendas: 0, totalTaxas: 0, totalLiquido: 0, totalSeguro: 0 };
      toast.error(errorMessage);
    } finally {
      loading = false;
    }
  }

  function canFilterSeller() {
    return vendedoresEquipe.length > 1;
  }

  function getTextoPeriodoKpi() {
    return periodoCarregadoTexto;
  }

  function triggerLoad(resetPage = true) {
    if (resetPage) currentPage = 1;
    void loadVendas();
  }

  function handleBuscaInput() {
    if (filtroBuscaTimer) clearTimeout(filtroBuscaTimer);
    filtroBuscaTimer = setTimeout(() => {
      triggerLoad(true);
    }, 350);
  }

  function resetFiltros() {
    filtroPeriodo = 'mes_atual';
    campoBusca = 'todos';
    busca = '';
    filtroMes = monthValueLocal(new Date());
    filtroDiaInicio = dateToISODateLocal(new Date());
    filtroDiaFim = dateToISODateLocal(new Date());
    filtroVendedorId = '';
    filtroStatus = '';
    filtroTipo = '';
    filtroCompanyId = '';
    somentePendentes = false;
    somenteConciliacaoPendente = false;
    somenteBacklogOperacional = false;
    triggerLoad(true);
  }

  onMount(async () => {
    if ($permissoes.isMaster) await loadMasterEmpresas();
    if ($permissoes.isGestor) await loadGestorEquipe();
    await loadVendas();
  });

  $: if (!canFilterSeller() && campoBusca === 'vendedor') {
    campoBusca = 'todos';
  }

  let filtroBuscaTimer: ReturnType<typeof setTimeout> | null = null;

  $: visibleColumns = canFilterSeller() ? columns : columns.filter((column) => column.key !== 'vendedor');
  $: qtdConfirmadas = vendas.filter((item) => item.status === 'confirmada').length;
  $: qtdPendentes = vendas.filter((item) => item.status === 'pendente').length;
  $: qtdConcluidas = vendas.filter((item) => item.status === 'concluida').length;
  $: qtdCanceladas = vendas.filter((item) => item.status === 'cancelada').length;
  $: qtdConciliacaoPendente = vendas.filter((item) => item.conciliado === false).length;
  $: qtdBacklogOperacional = vendas.filter((item) => item.status === 'pendente' || item.conciliado === false).length;
  $: vendasVisiveis = vendas.filter((item) => {
    if (somenteBacklogOperacional && !(item.status === 'pendente' || item.conciliado === false)) return false;
    if (somentePendentes && item.status !== 'pendente') return false;
    if (somenteConciliacaoPendente && item.conciliado !== false) return false;
    return true;
  });

  function handleRowClick(row: Venda) {
    goto(`/vendas/${row.id}`);
  }

  const fmt = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
</script>

<svelte:head>
  <title>Vendas | VTUR</title>
</svelte:head>

<PageHeader
  title="Vendas"
  subtitle="Gerencie suas vendas com visão de CRM."
  breadcrumbs={[{ label: 'Vendas' }]}
  actions={[
    ...(canCreate ? [{ label: 'Nova Venda', href: '/vendas/nova', variant: 'primary' as const, icon: Plus }] : []),
    ...(canCreate ? [{ label: 'Importar', href: '/vendas/importar', variant: 'secondary' as const, icon: FileSpreadsheet }] : [])
  ]}
/>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
  <div>
    <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p>
    <p class="text-sm text-slate-500">Resumo comercial com foco em backlog operacional, conciliação e fechamento da venda.</p>
  </div>
</div>

{#if errorMessage}
  <div class="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {errorMessage}
  </div>
{/if}

<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
  <button
    on:click={() => {
      somenteBacklogOperacional = true;
      somentePendentes = false;
      somenteConciliacaoPendente = false;
    }}
    class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200"
  >
    <div class="mb-3 flex items-center justify-between">
      <div class="rounded-lg bg-slate-100 p-3 text-slate-700"><AlertCircle size={20} /></div>
      <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Operação</span>
    </div>
    <p class="text-sm text-slate-500">Backlog operacional</p>
    <p class="mt-1 text-2xl font-bold text-slate-900">{qtdBacklogOperacional}</p>
    <p class="mt-2 text-sm text-slate-600">Fila consolidada de vendas pendentes e conciliações em aberto.</p>
  </button>

  <button
    on:click={() => {
      somentePendentes = true;
      somenteConciliacaoPendente = false;
      somenteBacklogOperacional = false;
    }}
    class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200"
  >
    <div class="mb-3 flex items-center justify-between">
      <div class="rounded-lg bg-amber-50 p-3 text-amber-600"><Clock size={20} /></div>
      <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Pipeline</span>
    </div>
    <p class="text-sm text-slate-500">Pendentes</p>
    <p class="mt-1 text-2xl font-bold text-slate-900">{qtdPendentes}</p>
    <p class="mt-2 text-sm text-slate-600">Vendas ainda em andamento e sem fechamento operacional definitivo.</p>
  </button>

  <button
    on:click={() => {
      somenteConciliacaoPendente = true;
      somentePendentes = false;
      somenteBacklogOperacional = false;
    }}
    class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200"
  >
    <div class="mb-3 flex items-center justify-between">
      <div class="rounded-lg bg-red-50 p-3 text-red-600"><Shield size={20} /></div>
      <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Financeiro</span>
    </div>
    <p class="text-sm text-slate-500">Conciliação pendente</p>
    <p class="mt-1 text-2xl font-bold text-slate-900">{qtdConciliacaoPendente}</p>
    <p class="mt-2 text-sm text-slate-600">Casos que ainda exigem validação financeira e acompanhamento do fechamento.</p>
  </button>

  <button
    on:click={() => {
      somentePendentes = false;
      somenteConciliacaoPendente = false;
      somenteBacklogOperacional = false;
    }}
    class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200"
  >
    <div class="mb-3 flex items-center justify-between">
      <div class="rounded-lg bg-green-50 p-3 text-green-600"><CheckCircle size={20} /></div>
      <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Resultado</span>
    </div>
    <p class="text-sm text-slate-500">Confirmadas</p>
    <p class="mt-1 text-2xl font-bold text-slate-900">{qtdConfirmadas}</p>
    <p class="mt-2 text-sm text-slate-600">Vendas já consolidadas, fora do backlog operacional prioritário.</p>
  </button>
</div>

<Card title="Filtros da Consulta" color="vendas">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
    <div>
      <label for="vendas-campo-busca" class="mb-1 block text-sm font-medium text-slate-700">Campo de busca</label>
      <select id="vendas-campo-busca" bind:value={campoBusca} class="vtur-input w-full" on:change={() => triggerLoad(true)}>
        <option value="todos">Todos</option>
        <option value="cliente">Cliente</option>
        {#if canFilterSeller()}
          <option value="vendedor">Vendedor</option>
        {/if}
        <option value="destino">Destino</option>
        <option value="produto">Produto</option>
        <option value="recibo">Recibo</option>
      </select>
    </div>

    <div>
      <label for="vendas-busca" class="mb-1 block text-sm font-medium text-slate-700">Buscar venda</label>
      <input
        id="vendas-busca"
        type="text"
        bind:value={busca}
        class="vtur-input w-full"
        placeholder={getPlaceholderBusca()}
        on:input={handleBuscaInput}
        on:keydown={(event) => { if (event.key === 'Enter') triggerLoad(true); }}
      />
    </div>

    <div>
      <label for="vendas-periodo" class="mb-1 block text-sm font-medium text-slate-700">Período (data da venda)</label>
      <select id="vendas-periodo" bind:value={filtroPeriodo} class="vtur-input w-full" on:change={() => triggerLoad(true)}>
        <option value="todos">Todos</option>
        <option value="mes_atual">Mês atual</option>
        <option value="mes_anterior">Mês anterior</option>
        <option value="mes">Escolher mês</option>
        <option value="dia">Data específica</option>
      </select>
    </div>

    {#if filtroPeriodo === 'mes'}
      <div>
        <label for="vendas-mes" class="mb-1 block text-sm font-medium text-slate-700">Mês</label>
        <select id="vendas-mes" bind:value={filtroMes} class="vtur-input w-full" on:change={() => triggerLoad(true)}>
          {#each monthOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    {/if}

    {#if filtroPeriodo === 'dia'}
      <div>
        <label for="vendas-data-inicio" class="mb-1 block text-sm font-medium text-slate-700">Data início</label>
        <input id="vendas-data-inicio" type="date" bind:value={filtroDiaInicio} class="vtur-input w-full" on:change={() => triggerLoad(true)} />
      </div>
      <div>
        <label for="vendas-data-fim" class="mb-1 block text-sm font-medium text-slate-700">Data final</label>
        <input id="vendas-data-fim" type="date" bind:value={filtroDiaFim} min={filtroDiaInicio} class="vtur-input w-full" on:change={() => triggerLoad(true)} />
      </div>
    {/if}

    {#if isMaster && empresasMaster.length > 0}
      <div>
        <label for="vendas-empresa" class="mb-1 block text-sm font-medium text-slate-700">Empresa</label>
        <select id="vendas-empresa" bind:value={filtroCompanyId} class="vtur-input w-full" on:change={() => triggerLoad(true)}>
          <option value="">Todas</option>
          {#each empresasMaster as empresa}
            <option value={empresa.id}>{empresa.nome_fantasia || empresa.id}</option>
          {/each}
        </select>
      </div>
    {/if}

    {#if isGestor && equipeGestor.length > 0}
      <div>
        <label for="vendas-vendedor" class="mb-1 block text-sm font-medium text-slate-700">Vendedor</label>
        <select id="vendas-vendedor" bind:value={filtroVendedorId} class="vtur-input w-full" on:change={() => triggerLoad(true)}>
          <option value="">Todos</option>
          {#each equipeGestor as vendedor}
            <option value={vendedor.id}>{vendedor.nome_completo}</option>
          {/each}
        </select>
      </div>
    {:else if canFilterSeller()}
      <div>
        <label for="vendas-vendedor" class="mb-1 block text-sm font-medium text-slate-700">Vendedor</label>
        <select id="vendas-vendedor" bind:value={filtroVendedorId} class="vtur-input w-full" on:change={() => triggerLoad(true)}>
          <option value="">Todos</option>
          {#each vendedoresEquipe as vendedor}
            <option value={vendedor.id}>{vendedor.nome_completo}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div>
      <label for="vendas-status" class="mb-1 block text-sm font-medium text-slate-700">Status</label>
      <select id="vendas-status" bind:value={filtroStatus} class="vtur-input w-full" on:change={() => triggerLoad(true)}>
        <option value="">Todos</option>
        <option value="confirmada">Confirmada</option>
        <option value="pendente">Pendente</option>
        <option value="cancelada">Cancelada</option>
        <option value="concluida">Concluída</option>
      </select>
    </div>

    <div>
      <label for="vendas-tipo" class="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
      <select id="vendas-tipo" bind:value={filtroTipo} class="vtur-input w-full" on:change={() => triggerLoad(true)}>
        <option value="">Todos</option>
        <option value="pacote">Pacote</option>
        <option value="hotel">Hotel</option>
        <option value="passagem">Passagem</option>
        <option value="servico">Seguro/Serviço</option>
      </select>
    </div>
  </div>

  <div class="mt-4 flex flex-wrap items-center gap-2">
    <button
      type="button"
      class={`rounded-full border px-4 py-2 text-sm font-medium ${somenteBacklogOperacional ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-700'}`}
      on:click={() => {
        somenteBacklogOperacional = !somenteBacklogOperacional;
        if (somenteBacklogOperacional) {
          somentePendentes = false;
          somenteConciliacaoPendente = false;
        }
      }}
    >
      {#if somenteBacklogOperacional}
        Mostrando backlog operacional ({qtdBacklogOperacional})
      {:else}
        Ver backlog operacional ({qtdBacklogOperacional})
      {/if}
    </button>

    <button
      type="button"
      class={`rounded-full border px-4 py-2 text-sm font-medium ${somentePendentes ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-700'}`}
      on:click={() => {
        somentePendentes = !somentePendentes;
        if (somentePendentes) {
          somenteConciliacaoPendente = false;
          somenteBacklogOperacional = false;
        }
      }}
    >
      {#if somentePendentes}
        Mostrando pendentes ({qtdPendentes})
      {:else}
        Ver pendentes ({qtdPendentes})
      {/if}
    </button>

    <button
      type="button"
      class={`rounded-full border px-4 py-2 text-sm font-medium ${somenteConciliacaoPendente ? 'border-red-300 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-700'}`}
      on:click={() => {
        somenteConciliacaoPendente = !somenteConciliacaoPendente;
        if (somenteConciliacaoPendente) {
          somentePendentes = false;
          somenteBacklogOperacional = false;
        }
      }}
    >
      {#if somenteConciliacaoPendente}
        Mostrando conciliação pendente ({qtdConciliacaoPendente})
      {:else}
        Ver conciliação pendente ({qtdConciliacaoPendente})
      {/if}
    </button>

    {#if somentePendentes || somenteConciliacaoPendente || somenteBacklogOperacional}
      <button
        type="button"
        class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
        on:click={() => {
          somentePendentes = false;
          somenteConciliacaoPendente = false;
          somenteBacklogOperacional = false;
        }}
      >
        Limpar filtro rápido
      </button>
    {/if}
  </div>

  <div class="mt-4 flex flex-wrap justify-end gap-2">
    <Button type="button" variant="secondary" on:click={resetFiltros}>
      <RotateCcw size={16} class="mr-2" />Limpar filtros
    </Button>
    <Button type="button" variant="primary" color="vendas" on:click={() => triggerLoad(true)}>
      <Filter size={16} class="mr-2" />Aplicar filtros
    </Button>
  </div>
</Card>

<div class="mb-4 text-center text-sm font-semibold text-slate-600">
  {getTextoPeriodoKpi()}
</div>

<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <div class="vtur-card p-4 shadow-md transition-shadow hover:shadow-lg">
    <div class="flex items-center gap-3">
      <div class="rounded-lg bg-green-50 p-2 text-green-600">
        <ShoppingCart size={20} />
      </div>
      <div>
        <p class="text-sm text-slate-500">Total de Vendas</p>
        <p class="text-xl font-bold tabular-nums text-slate-900">{fmt(kpis.totalVendas)}</p>
      </div>
    </div>
  </div>

  <div class="vtur-card p-4 shadow-md transition-shadow hover:shadow-lg">
    <div class="flex items-center gap-3">
      <div class="rounded-lg bg-indigo-50 p-2 text-indigo-600">
        <Shield size={20} />
      </div>
      <div>
        <p class="text-sm text-slate-500">Seguro Viagem</p>
        <p class="text-xl font-bold tabular-nums text-slate-900">{fmt(kpis.totalSeguro)}</p>
      </div>
    </div>
  </div>

  <div class="vtur-card p-4 shadow-md transition-shadow hover:shadow-lg">
    <div class="flex items-center gap-3">
      <div class="rounded-lg bg-amber-50 p-2 text-amber-600">
        <DollarSign size={20} />
      </div>
      <div>
        <p class="text-sm text-slate-500">Taxas</p>
        <p class="text-xl font-bold tabular-nums text-slate-900">{fmt(kpis.totalTaxas)}</p>
      </div>
    </div>
  </div>

  <div class="vtur-card p-4 shadow-md transition-shadow hover:shadow-lg">
    <div class="flex items-center gap-3">
      <div class="rounded-lg bg-blue-50 p-2 text-blue-600">
        <Wallet size={20} />
      </div>
      <div>
        <p class="text-sm text-slate-500">Total Líquido</p>
        <p class="text-xl font-bold tabular-nums text-slate-900">{fmt(kpis.totalLiquido)}</p>
      </div>
    </div>
  </div>
</div>

<DataTable
  columns={visibleColumns}
  data={vendasVisiveis}
  color="vendas"
  {loading}
  title="Base de vendas"
  searchable={false}
  filterable={false}
  exportable={false}
  onRowClick={handleRowClick}
  emptyMessage={busca.trim() ? 'Tente ajustar os filtros ou a busca para localizar vendas.' : 'Nenhuma venda encontrada para o escopo atual'}
/>

{#if totalItems > pageSize}
  <div class="mt-4 flex items-center justify-between">
    <div class="text-sm text-slate-600">
      Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} de {totalItems}
    </div>
    <div class="flex gap-2">
      <Button
        type="button"
        variant="secondary"
        on:click={() => { currentPage = Math.max(1, currentPage - 1); void loadVendas(); }}
        disabled={currentPage <= 1 || loading}
      >
        Anterior
      </Button>
      <Button
        type="button"
        variant="secondary"
        on:click={() => { currentPage += 1; void loadVendas(); }}
        disabled={currentPage * pageSize >= totalItems || loading}
      >
        Próxima
      </Button>
    </div>
  </div>
{/if}
