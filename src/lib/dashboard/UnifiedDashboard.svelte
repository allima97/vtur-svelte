<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Button } from 'flowbite-svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { Filter, BarChart3, Settings, AlertCircle, ShoppingCart, Wallet, Clock } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import type { ChartData } from 'chart.js';

  export let title = 'Dashboard comercial';
  export let subtitle = 'Acompanhe vendas, metas e orçamentos com uma leitura clara, objetiva e consistente do desempenho comercial.';
  export let color = 'blue';
  export let breadcrumbs: Array<{ label: string; href?: string }> = [{ label: 'Dashboard' }];
  export let executiveText = 'Visão consolidada do período selecionado.';

  interface EmpresaFiltro {
    id: string;
    nome: string;
  }

  interface VendedorFiltro {
    id: string;
    nome: string;
  }

  interface DashboardPayload {
    inicio: string;
    fim: string;
    userCtx: {
      usuarioId: string;
      nome: string | null;
      papel: string;
      vendedorIds: string[];
    };
    podeVerOperacao: boolean;
    podeVerConsultoria: boolean;
    vendasAgg: {
      totalVendas: number;
      totalTaxas: number;
      totalLiquido: number;
      totalSeguro: number;
      qtdVendas: number;
      ticketMedio: number;
      timeline: Array<{ date: string; value: number }>;
      topDestinos: Array<{ name: string; value: number }>;
      porProduto: Array<{ id: string; name: string; value: number }>;
    };
    metas: Array<{
      id: string;
      vendedor_id: string;
      periodo: string;
      meta_geral: number;
      meta_diferenciada: number | null;
      ativo: boolean;
      scope: string | null;
    }>;
    orcamentos: Array<{
      id: string;
      created_at: string | null;
      status: string | null;
      status_negociacao: string | null;
      total: number | null;
      data_validade?: string | null;
      last_interaction_at?: string | null;
      cliente?: { id?: string | null; nome?: string | null } | null;
      quote_item?: Array<{
        id?: string | null;
        title?: string | null;
        product_name?: string | null;
        item_type?: string | null;
        city_name?: string | null;
      }> | null;
    }>;
  }

  interface VendaOperacional {
    id: string;
    status: string;
    conciliado: boolean | null;
  }

  interface PagamentoOperacional {
    id: string;
    status: string;
    valor?: number;
  }

  interface ComissaoOperacional {
    id: string;
    status: string;
    valor_comissao?: number;
  }

  const emptyDashboard: DashboardPayload = {
    inicio: '',
    fim: '',
    userCtx: {
      usuarioId: '',
      nome: null,
      papel: 'VENDEDOR',
      vendedorIds: []
    },
    podeVerOperacao: false,
    podeVerConsultoria: false,
    vendasAgg: {
      totalVendas: 0,
      totalTaxas: 0,
      totalLiquido: 0,
      totalSeguro: 0,
      qtdVendas: 0,
      ticketMedio: 0,
      timeline: [],
      topDestinos: [],
      porProduto: []
    },
    metas: [],
    orcamentos: []
  };

  function getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      inicio: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
      fim: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    };
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function formatDate(value: string | null) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
  }

  function normalizeStatus(status: string) {
    return status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function getDiasSemInteracao(value: string | null | undefined) {
    if (!value) return Number.POSITIVE_INFINITY;
    const data = new Date(value);
    return Math.ceil((Date.now() - data.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getDiasParaValidade(value: string | null | undefined) {
    if (!value) return Number.POSITIVE_INFINITY;
    const data = new Date(value);
    return Math.ceil((data.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  const currentMonth = getCurrentMonthRange();

  let dashboard: DashboardPayload = emptyDashboard;
  let loading = true;
  let showFilters = false;
  let errorMessage: string | null = null;
  let periodoInicio = currentMonth.inicio;
  let periodoFim = currentMonth.fim;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';
  let empresas: EmpresaFiltro[] = [];
  let vendedores: VendedorFiltro[] = [];
  let vendasOperacionais: VendaOperacional[] = [];
  let pagamentosOperacionais: PagamentoOperacional[] = [];
  let comissoesOperacionais: ComissaoOperacional[] = [];

  async function loadBaseFilters() {
    try {
      const response = await fetch('/api/v1/relatorios/base');
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      empresas = data.empresas || [];
      vendedores = data.vendedores || [];
    } catch {
      empresas = [];
      vendedores = [];
      toast.error('Erro ao carregar filtros do dashboard');
    }
  }

  async function loadDashboard() {
    loading = true;
    errorMessage = null;
    try {
      const params = new URLSearchParams({ inicio: periodoInicio, fim: periodoFim, include_orcamentos: '1' });
      if (empresaSelecionada) params.set('company_id', empresaSelecionada);
      if (vendedorSelecionado) params.set('vendedor_ids', vendedorSelecionado);
      const response = await fetch(`/api/v1/dashboard/summary?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      dashboard = await response.json();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dashboard.';
      dashboard = emptyDashboard;
      toast.error(errorMessage);
    } finally {
      loading = false;
    }
  }

  async function loadOperationalSummary() {
    try {
      const [vendasResponse, pagamentosResponse, comissoesResponse] = await Promise.all([
        fetch('/api/v1/vendas/list?page=1&pageSize=200'),
        fetch('/api/v1/pagamentos'),
        fetch('/api/v1/financeiro/comissoes')
      ]);
      if (vendasResponse.ok) {
        const vendasData = await vendasResponse.json();
        vendasOperacionais = (vendasData.items || []).map((item: any) => ({ id: String(item.id), status: String(item.status || ''), conciliado: typeof item.conciliado === 'boolean' ? item.conciliado : null }));
      }
      if (pagamentosResponse.ok) {
        const pagamentosData = await pagamentosResponse.json();
        pagamentosOperacionais = (pagamentosData.items || []).map((item: any) => ({ id: String(item.id), status: String(item.status || ''), valor: Number(item.valor_total || item.valor || 0) }));
      }
      if (comissoesResponse.ok) {
        const comissoesData = await comissoesResponse.json();
        comissoesOperacionais = (comissoesData.items || []).map((item: any) => ({ id: String(item.id), status: String(item.status || ''), valor_comissao: Number(item.valor_comissao || 0) }));
      }
    } catch {
      vendasOperacionais = [];
      pagamentosOperacionais = [];
      comissoesOperacionais = [];
      toast.error('Erro ao consolidar resumo operacional');
    }
  }

  onMount(() => {
    void Promise.all([loadBaseFilters(), loadDashboard(), loadOperationalSummary()]);
  });

  function applyFilters() {
    void Promise.all([loadDashboard(), loadOperationalSummary()]);
  }

  function handleOrcamentoClick(id: string) {
    void goto(`/orcamentos/${id}`);
  }

  function getRemainingDays() {
    const today = new Date();
    const end = new Date(`${periodoFim}T23:59:59`);
    const diff = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  function getStatusBadgeClass(status: string) {
    const normalized = normalizeStatus(status);
    if (normalized.includes('enviado') || normalized.includes('confirm')) return 'vtur-status-badge vtur-status-badge--success';
    if (normalized.includes('pendente')) return 'vtur-status-badge vtur-status-badge--warning';
    if (normalized.includes('aprov')) return 'vtur-status-badge vtur-status-badge--info';
    if (normalized.includes('rejeit') || normalized.includes('cancel')) return 'vtur-status-badge vtur-status-badge--danger';
    return 'vtur-status-badge';
  }

  function isOrcamentoCritico(orcamento: DashboardPayload['orcamentos'][number]) {
    const status = normalizeStatus(String(orcamento.status || ''));
    if (status.includes('fechado') || status.includes('cancel') || status.includes('rejeit') || status.includes('expir')) return false;
    if (!orcamento.last_interaction_at) return true;
    if (getDiasSemInteracao(orcamento.last_interaction_at) >= 7) return true;
    const diasValidade = getDiasParaValidade(orcamento.data_validade);
    return diasValidade >= 0 && diasValidade <= 3;
  }

  function isOrcamentoProntoVenda(orcamento: DashboardPayload['orcamentos'][number]) {
    const status = normalizeStatus(String(orcamento.status || ''));
    const negociacao = normalizeStatus(String(orcamento.status_negociacao || ''));
    return status.includes('aprov') || negociacao.includes('aprov');
  }

  $: metaTotal = dashboard.metas.reduce((sum, meta) => sum + Number(meta.meta_geral || 0), 0);
  $: diasRestantes = getRemainingDays();
  $: faltanteMeta = Math.max(metaTotal - dashboard.vendasAgg.totalVendas, 0);
  $: metaDiaria = diasRestantes > 0 ? faltanteMeta / diasRestantes : 0;
  $: atingimento = metaTotal > 0 ? (dashboard.vendasAgg.totalVendas / metaTotal) * 100 : 0;
  $: orcamentosCriticos = dashboard.orcamentos.filter((orcamento) => isOrcamentoCritico(orcamento)).length;
  $: orcamentosProntosVenda = dashboard.orcamentos.filter((orcamento) => isOrcamentoProntoVenda(orcamento)).length;
  $: vendasPendentes = vendasOperacionais.filter((item) => normalizeStatus(item.status).includes('pendente')).length;
  $: vendasConciliacaoPendente = vendasOperacionais.filter((item) => item.conciliado === false).length;
  $: backlogVendas = vendasOperacionais.filter((item) => normalizeStatus(item.status).includes('pendente') || item.conciliado === false).length;
  $: pagamentosPendentes = pagamentosOperacionais.filter((item) => normalizeStatus(item.status).includes('pendente')).length;
  $: pagamentosDivergentes = pagamentosOperacionais.filter((item) => normalizeStatus(item.status).includes('diverg')).length;
  $: comissoesPendentes = comissoesOperacionais.filter((item) => normalizeStatus(item.status).includes('pendente')).length;
  $: backlogFinanceiro = pagamentosPendentes + pagamentosDivergentes + comissoesPendentes;

  $: kpis = [
    { title: 'VENDAS NO PERÍODO', value: formatCurrency(dashboard.vendasAgg.totalVendas), subtext: `${dashboard.vendasAgg.qtdVendas} venda(s) no período` },
    { title: 'QTD. VENDAS', value: String(dashboard.vendasAgg.qtdVendas), subtext: 'No período selecionado' },
    { title: 'TICKET MÉDIO', value: formatCurrency(dashboard.vendasAgg.ticketMedio), subtext: 'Média por venda' },
    { title: 'META DO MÊS', value: formatCurrency(metaTotal), subtext: 'Meta ativa no período' },
    { title: 'META DIÁRIA', value: formatCurrency(metaDiaria), subtext: 'Necessário para bater a meta' },
    { title: 'ATINGIMENTO META', value: `${atingimento.toFixed(1)}%`, subtext: 'Percentual alcançado' },
    { title: 'DIAS RESTANTES', value: String(diasRestantes), subtext: 'Até o fim do período' }
  ];

  $: vendasPorDestinoData = {
    labels: dashboard.vendasAgg.topDestinos.map((item) => item.name),
    datasets: [{ data: dashboard.vendasAgg.topDestinos.map((item) => item.value), backgroundColor: ['#0f766e', '#16a34a', '#0ea5e9', '#f97316', '#7c3aed'], borderWidth: 0 }]
  } satisfies ChartData;

  $: vendasPorProdutoData = {
    labels: dashboard.vendasAgg.porProduto.map((item) => item.name),
    datasets: [{ label: 'Receita por produto', data: dashboard.vendasAgg.porProduto.map((item) => item.value), backgroundColor: '#0f766e', borderRadius: 6 }]
  } satisfies ChartData;

  $: evolucaoVendasData = {
    labels: dashboard.vendasAgg.timeline.map((item) => formatDate(item.date)),
    datasets: [{ label: 'Vendas', data: dashboard.vendasAgg.timeline.map((item) => item.value), borderColor: '#0f766e', backgroundColor: 'rgba(15, 118, 110, 0.12)', fill: true, tension: 0.35 }]
  } satisfies ChartData;

  $: orcamentosRecentes = dashboard.orcamentos.map((orcamento) => {
    const firstItem = Array.isArray(orcamento.quote_item) ? orcamento.quote_item[0] : null;
    return {
      id: orcamento.id,
      data: formatDate(orcamento.created_at),
      cliente: String(orcamento.cliente?.nome || 'Cliente sem nome'),
      destino: String(firstItem?.city_name || firstItem?.product_name || firstItem?.title || 'Orcamento sem itens'),
      status: String(orcamento.status_negociacao || orcamento.status || 'Pendente'),
      valor: formatCurrency(Number(orcamento.total || 0))
    };
  });
</script>

<svelte:head>
  <title>{title} | VTUR</title>
</svelte:head>

<PageHeader {title} {subtitle} {color} {breadcrumbs} />

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
  <div>
    <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p>
    <p class="text-sm text-slate-500">{executiveText}</p>
  </div>
  <div class="flex flex-wrap gap-3">
    <Button color="light" size="sm" class="border border-slate-300 bg-white" on:click={() => (showFilters = !showFilters)}>
      <Filter size={16} class="mr-2" />Filtros
    </Button>
    <Button color="blue" size="sm" on:click={() => toast.info('A personalizacao de widgets sera portada na proxima etapa.')}>
      <Settings size={16} class="mr-2" />Personalizar dashboard
    </Button>
    <Button color="light" size="sm" class="border border-slate-300 bg-white" on:click={() => goto('/relatorios/ranking')}>
      <BarChart3 size={16} class="mr-2" />Ranking de vendas
    </Button>
  </div>
</div>

{#if showFilters}
  <Card color="vendas" class="mb-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div><label for="filtro-data-inicio" class="mb-1 block text-sm font-medium text-slate-700">Data Início</label><input id="filtro-data-inicio" type="date" class="vtur-input w-full" bind:value={periodoInicio} /></div>
      <div><label for="filtro-data-fim" class="mb-1 block text-sm font-medium text-slate-700">Data Fim</label><input id="filtro-data-fim" type="date" class="vtur-input w-full" bind:value={periodoFim} /></div>
      <div><label for="filtro-empresa" class="mb-1 block text-sm font-medium text-slate-700">Empresa</label><select id="filtro-empresa" class="vtur-input w-full" bind:value={empresaSelecionada}><option value="">Todas</option>{#each empresas as empresa}<option value={empresa.id}>{empresa.nome}</option>{/each}</select></div>
      <div><label for="filtro-vendedor" class="mb-1 block text-sm font-medium text-slate-700">Vendedor</label><select id="filtro-vendedor" class="vtur-input w-full" bind:value={vendedorSelecionado}><option value="">Todos</option>{#each vendedores as vendedor}<option value={vendedor.id}>{vendedor.nome}</option>{/each}</select></div>
      <div class="flex items-end"><Button color="blue" size="sm" class="w-full" on:click={applyFilters}>Aplicar período</Button></div>
    </div>
  </Card>
{/if}

{#if errorMessage}
  <div class="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
{/if}

{#if loading}
  <Card color="vendas" class="mb-6"><div class="py-10 text-center text-sm text-slate-500">Carregando indicadores do dashboard...</div></Card>
{/if}

<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
  <button on:click={() => goto('/orcamentos')} class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200"><div class="mb-3 flex items-center justify-between"><div class="rounded-lg bg-amber-50 p-3 text-amber-600"><AlertCircle size={20} /></div><span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Comercial</span></div><p class="text-sm text-slate-500">Orçamentos críticos</p><p class="mt-1 text-2xl font-bold text-slate-900">{orcamentosCriticos}</p><p class="mt-2 text-sm text-slate-600">Sem interação, follow-up atrasado ou vencimento próximo.</p></button>
  <button on:click={() => goto('/orcamentos')} class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200"><div class="mb-3 flex items-center justify-between"><div class="rounded-lg bg-green-50 p-3 text-green-600"><ShoppingCart size={20} /></div><span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Conversão</span></div><p class="text-sm text-slate-500">Prontos para venda</p><p class="mt-1 text-2xl font-bold text-slate-900">{orcamentosProntosVenda}</p><p class="mt-2 text-sm text-slate-600">Orçamentos aprovados aguardando conversão em venda.</p></button>
  <button on:click={() => goto('/vendas')} class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200"><div class="mb-3 flex items-center justify-between"><div class="rounded-lg bg-blue-50 p-3 text-blue-600"><Clock size={20} /></div><span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Operação</span></div><p class="text-sm text-slate-500">Backlog de vendas</p><p class="mt-1 text-2xl font-bold text-slate-900">{backlogVendas}</p><p class="mt-2 text-sm text-slate-600">{vendasPendentes} pendentes e {vendasConciliacaoPendente} com conciliação em aberto.</p></button>
  <button on:click={() => goto('/financeiro')} class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200"><div class="mb-3 flex items-center justify-between"><div class="rounded-lg bg-financeiro-50 p-3 text-financeiro-600"><Wallet size={20} /></div><span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Financeiro</span></div><p class="text-sm text-slate-500">Backlog financeiro</p><p class="mt-1 text-2xl font-bold text-slate-900">{backlogFinanceiro}</p><p class="mt-2 text-sm text-slate-600">{pagamentosPendentes} pendentes, {pagamentosDivergentes} divergências e {comissoesPendentes} comissões.</p></button>
</div>

<div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">O painel principal agora consolida prioridades entre comercial e financeiro: <strong>{orcamentosCriticos}</strong> orçamentos críticos, <strong>{orcamentosProntosVenda}</strong> prontos para conversão, <strong>{backlogVendas}</strong> itens no backlog de vendas e <strong>{backlogFinanceiro}</strong> pendências financeiras.</div>

<div class="mb-6 w-full">
  <Card color="vendas" padding="md">
    <div class="mb-5 flex items-center justify-between"><div><h3 class="text-lg font-semibold text-slate-900">Indicadores do período</h3><p class="text-sm text-slate-500">Resumo comercial do intervalo filtrado.</p></div><div class="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 md:block">Atualizado conforme o período ativo</div></div>
    <div class="vtur-kpi-grid">{#each kpis as kpi}<div class="vtur-kpi-card"><p class="vtur-kpi-card__title">{kpi.title}</p><p class="vtur-kpi-card__value" title={kpi.value}>{kpi.value}</p><p class="vtur-kpi-card__subtext">{kpi.subtext}</p></div>{/each}</div>
  </Card>
</div>

<div class="vtur-dashboard-grid">
  <Card color="vendas"><div class="mb-4 flex items-center justify-between"><div><h3 class="text-base font-semibold text-slate-900">Vendas por destino</h3><p class="text-xs text-slate-500">Top destinos por receita no período.</p></div></div>{#if dashboard.vendasAgg.topDestinos.length > 0}<ChartJS type="doughnut" data={vendasPorDestinoData} height={260} />{:else}<div class="py-12 text-center text-sm text-slate-500">Sem dados de destino no período.</div>{/if}</Card>
  <Card color="vendas"><div class="mb-4 flex items-center justify-between"><div><h3 class="text-base font-semibold text-slate-900">Vendas por produto</h3><p class="text-xs text-slate-500">Receita agregada por categoria de produto.</p></div></div>{#if dashboard.vendasAgg.porProduto.length > 0}<ChartJS type="bar" data={vendasPorProdutoData} height={260} />{:else}<div class="py-12 text-center text-sm text-slate-500">Sem dados de produto no período.</div>{/if}</Card>
  <Card color="vendas"><div class="mb-4 flex items-center justify-between"><div><h3 class="text-base font-semibold text-slate-900">Evolução das vendas</h3><p class="text-xs text-slate-500">Linha temporal de receita por dia.</p></div></div>{#if dashboard.vendasAgg.timeline.length > 0}<ChartJS type="line" data={evolucaoVendasData} height={260} />{:else}<div class="py-12 text-center text-sm text-slate-500">Sem evolução registrada no período.</div>{/if}</Card>
</div>

<Card color="vendas" padding="md">
  <div class="mb-4"><h3 class="text-base font-semibold text-slate-900">Orçamentos recentes ({orcamentosRecentes.length})</h3><p class="text-xs text-slate-500">Últimas propostas comerciais registradas no período.</p></div>
  <div class="overflow-x-auto">
    <table class="w-full text-sm"><thead class="vtur-table__head"><tr><th class="px-4 py-3 text-left">Data</th><th class="px-4 py-3 text-left">Cliente</th><th class="px-4 py-3 text-left">Destino</th><th class="px-4 py-3 text-left">Status</th><th class="px-4 py-3 text-right">Valor</th></tr></thead><tbody class="vtur-table__body">{#if orcamentosRecentes.length === 0}<tr><td colspan="5" class="px-4 py-10 text-center text-slate-500">Nenhum orçamento encontrado no período.</td></tr>{:else}{#each orcamentosRecentes as orcamento}<tr class="cursor-pointer transition-colors hover:bg-slate-50/90" on:click={() => handleOrcamentoClick(orcamento.id)}><td class="px-4 py-4 text-slate-600">{orcamento.data}</td><td class="px-4 py-4 font-medium text-slate-900">{orcamento.cliente}</td><td class="max-w-md truncate px-4 py-4 text-slate-600">{orcamento.destino}</td><td class="px-4 py-4"><span class={getStatusBadgeClass(orcamento.status)}>{orcamento.status}</span></td><td class="px-4 py-4 text-right font-semibold text-slate-900">{orcamento.valor}</td></tr>{/each}{/if}</tbody></table>
  </div>
</Card>
