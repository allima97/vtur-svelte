<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import { ArrowLeft, Filter, X, TrendingUp, DollarSign, Users, ShoppingCart } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';

  interface Recibo {
    id: string | null;
    numero_recibo: string | null;
    numero_recibo_normalizado: string | null;
    data_venda: string | null;
    produto_id?: string | null;
    tipo_produto: string;
    produto_nome: string;
    cidade_nome: string | null;
    valor_total: number;
    valor_taxas: number;
    valor_du: number;
    valor_rav: number;
    percentual_comissao_loja: number;
    faixa_comissao: string | null;
    valor_comissao_loja: number;
    valor_bruto_override?: number | null;
    valor_liquido_override?: number | null;
    valor_meta_override?: number | null;
    valor_comissionavel?: number | null;
    valor_comissao_calculada?: number | null;
    percentual_comissao_calculado?: number | null;
  }

  interface VendaRelatorio {
    id: string;
    numero_venda: string | null;
    codigo: string;
    data_venda: string | null;
    data_embarque: string | null;
    data_final: string | null;
    cliente_id: string | null;
    cliente_nome: string;
    cliente_cpf: string | null;
    vendedor_id: string | null;
    vendedor_nome: string;
    destino_id: string | null;
    destino_nome: string;
    destino_cidade_id: string | null;
    destino_cidade_nome: string | null;
    valor_total: number;
    valor_taxas: number;
    cancelada: boolean;
    status: 'confirmada' | 'pendente' | 'concluida' | 'cancelada';
    forma_pagamento: string;
    recibos: Recibo[];
    comissao: number;
  }

  interface Resumo {
    total_vendas: number;
    vendas_confirmadas: number;
    vendas_canceladas: number;
    total_valor: number;
    total_comissao: number;
    ticket_medio: number;
  }

  interface VendedorFiltro {
    id: string;
    nome: string;
  }

  interface EmpresaFiltro {
    id: string;
    nome: string;
  }

  interface BasePayload {
    empresas: EmpresaFiltro[];
    vendedores: Array<VendedorFiltro & { company_id?: string; company_name?: string }>;
  }

  interface RelatorioPayload {
    items: VendaRelatorio[];
    resumo: Resumo;
    series?: {
      mensal?: Array<{ key: string; total_valor: number }>;
      diaria?: Array<{ date: string; value: number }>;
    };
  }

  interface ReciboLinha {
    id: string;
    venda_id: string;
    codigo: string;
    numero_recibo: string | null;
    data_venda: string | null;
    produto_id: string | null;
    cliente_nome: string;
    cliente_cpf: string | null;
    vendedor_nome: string;
    destino_nome: string;
    cidade_nome: string | null;
    produto_nome: string;
    tipo_produto: string;
    valor_total: number;
    valor_taxas: number;
    comissao: number;
    percentual_comissao: number;
    status: VendaRelatorio['status'];
    forma_pagamento: string;
  }

  function getDefaultRange() {
    const today = new Date();
    return {
      start: `${today.getFullYear()}-01-01`,
      end: today.toISOString().slice(0, 10)
    };
  }

  function getCurrentMonthRange() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: start.toISOString().slice(0, 10),
      end: today.toISOString().slice(0, 10)
    };
  }

  function formatMonthLabel(monthKey: string) {
    const [year, month] = monthKey.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(
      new Date(year, month - 1, 1)
    );
  }

  function hasConciliacaoOverride(recibo?: Recibo | null) {
    return Boolean(
      recibo &&
        (recibo.valor_bruto_override != null ||
          recibo.valor_liquido_override != null ||
          recibo.valor_meta_override != null ||
          recibo.faixa_comissao ||
          recibo.percentual_comissao_loja != null)
    );
  }

  function getReciboBaseBruta(recibo: Recibo) {
    if (hasConciliacaoOverride(recibo) && recibo.valor_bruto_override != null) {
      return Math.max(0, Number(recibo.valor_bruto_override || 0));
    }
    return Math.max(0, Number(recibo.valor_total || 0));
  }

  function getFatorComissionavelRecibo(recibo: Recibo) {
    const bruto = getReciboBaseBruta(recibo);
    if (bruto <= 0) return 0;
    const brutoComissionavel =
      recibo.valor_comissionavel != null ? Number(recibo.valor_comissionavel || 0) : bruto;
    if (!Number.isFinite(brutoComissionavel)) return 1;
    return Math.max(0, Math.min(1, brutoComissionavel / bruto));
  }

  function getReciboBrutoExibicao(recibo: Recibo) {
    return getReciboBaseBruta(recibo) * getFatorComissionavelRecibo(recibo);
  }

  function getReciboTaxasExibicao(recibo: Recibo) {
    return Math.max(0, Number(recibo.valor_taxas || 0)) * getFatorComissionavelRecibo(recibo);
  }

  function normalizarDataIso(value?: string | null) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const iso = raw.includes('T') ? raw.slice(0, 10) : raw;
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
  }

  function buildReciboBusinessKey(
    recibo: Pick<ReciboLinha, 'numero_recibo' | 'produto_id' | 'produto_nome' | 'data_venda'>
  ) {
    const numeroRecibo = String(recibo.numero_recibo || '').trim().toLowerCase();
    const produtoId = String(recibo.produto_id || recibo.produto_nome || '').trim().toLowerCase();
    const dataVenda = normalizarDataIso(recibo.data_venda);
    if (!numeroRecibo || !produtoId || !dataVenda) return '';
    return `${numeroRecibo}::${produtoId}::${dataVenda}`;
  }

  function normalizarRecibosPeriodo(recibos: ReciboLinha[], inicio?: string | null, fim?: string | null) {
    const ini = normalizarDataIso(inicio);
    const end = normalizarDataIso(fim);
    const idsSeen = new Set<string>();
    const businessSeen = new Set<string>();

    return recibos.filter((recibo) => {
      const data = normalizarDataIso(recibo.data_venda);
      if (ini && (!data || data < ini)) return false;
      if (end && (!data || data > end)) return false;

      const reciboId = String(recibo.id || '').trim();
      if (reciboId) {
        if (idsSeen.has(reciboId)) return false;
        idsSeen.add(reciboId);
      }

      const businessKey = buildReciboBusinessKey(recibo);
      if (businessKey) {
        if (businessSeen.has(businessKey)) return false;
        businessSeen.add(businessKey);
      }

      return true;
    });
  }

  function getLastSixMonthsRange(referenceIso?: string | null) {
    const reference = referenceIso ? new Date(`${referenceIso}T12:00:00`) : new Date();
    const start = new Date(reference.getFullYear(), reference.getMonth() - 5, 1);
    return {
      start: start.toISOString().slice(0, 10),
      end: reference.toISOString().slice(0, 10)
    };
  }


  const defaultRange = getDefaultRange();

  let vendas: VendaRelatorio[] = [];
  let vendedores: VendedorFiltro[] = [];
  let empresas: EmpresaFiltro[] = [];
  let resumo: Resumo = {
    total_vendas: 0,
    vendas_confirmadas: 0,
    vendas_canceladas: 0,
    total_valor: 0,
    total_comissao: 0,
    ticket_medio: 0
  };
  let loading = true;
  let dataInicio = defaultRange.start;
  let dataFim = defaultRange.end;
  let vendedorSelecionado = '';
  let empresaSelecionada = '';
  let statusSelecionado = '';
  let clienteIdFiltro = '';
  let destinoFiltro = '';
  let produtoFiltro = '';
  let tipoProdutoFiltro = '';
  let chartSeries: NonNullable<RelatorioPayload['series']> = {
    mensal: [],
    diaria: []
  };

  const columns = [
    { key: 'codigo', label: 'Código', sortable: true, width: '120px' },
    { key: 'numero_recibo', label: 'Recibo', sortable: true, width: '140px' },
    {
      key: 'data_venda',
      label: 'Data',
      sortable: true,
      width: '100px',
      formatter: (value: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '-')
    },
    { key: 'cliente_nome', label: 'Cliente', sortable: true },
    { key: 'cliente_cpf', label: 'CPF', sortable: true, width: '140px' },
    { key: 'vendedor_nome', label: 'Vendedor', sortable: true, width: '160px' },
    { key: 'destino_nome', label: 'Destino', sortable: true },
    { key: 'cidade_nome', label: 'Cidade', sortable: true },
    { key: 'produto_nome', label: 'Produto', sortable: true },
    {
      key: 'valor_total',
      label: 'Valor',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'valor_taxas',
      label: 'Taxas',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'comissao',
      label: 'Comissão',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'percentual_comissao',
      label: '% Comissão',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => `${value.toFixed(2).replace('.', ',')}%`
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '120px',
      formatter: (value: string) => getStatusBadge(value)
    },
    { key: 'forma_pagamento', label: 'Pagamento', sortable: true, width: '140px' }
  ];

  async function loadBase() {
    try {
      const response = await fetch('/api/v1/relatorios/base');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[relatorios/base] Erro:', response.status, errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
      const data = (await response.json()) as BasePayload;
      empresas = data.empresas || [];
      vendedores = data.vendedores || [];
    } catch (err) {
      empresas = [];
      vendedores = [];
      const msg = err instanceof Error ? err.message : 'Erro ao carregar filtros analíticos';
      console.error('[loadBase] Erro:', msg);
      toast.error(msg);
    }
  }

  function syncUrl() {
    const params = new URLSearchParams({
      data_inicio: dataInicio,
      data_fim: dataFim
    });

    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
    if (vendedorSelecionado) params.set('vendedor_id', vendedorSelecionado);
    if (statusSelecionado) params.set('status', statusSelecionado);
    if (clienteIdFiltro) params.set('cliente_id', clienteIdFiltro);
    if (destinoFiltro) params.set('destino', destinoFiltro);
    if (produtoFiltro) params.set('produto', produtoFiltro);
    if (tipoProdutoFiltro) params.set('tipo_produto', tipoProdutoFiltro);

    void goto(`/relatorios/vendas?${params.toString()}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  }

  function buildRelatorioParams(start: string, end: string) {
    const params = new URLSearchParams({
      data_inicio: start,
      data_fim: end
    });

    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
    if (vendedorSelecionado) params.set('vendedor_id', vendedorSelecionado);
    if (statusSelecionado) params.set('status', statusSelecionado);
    if (clienteIdFiltro) params.set('cliente_id', clienteIdFiltro);
    if (destinoFiltro) params.set('destino', destinoFiltro);
    if (produtoFiltro) params.set('produto', produtoFiltro);
    if (tipoProdutoFiltro) params.set('tipo_produto', tipoProdutoFiltro);

    return params;
  }

  async function fetchRelatorioRange(start: string, end: string): Promise<RelatorioPayload> {
    const params = buildRelatorioParams(start, end);
    const response = await fetch(`/api/v1/relatorios/vendas?${params.toString()}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[relatorios/vendas] Erro:', response.status, errorText);
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }
    return (await response.json()) as RelatorioPayload;
  }

  async function loadRelatorio(showSuccess = false) {
    loading = true;

    try {
      const principal = await fetchRelatorioRange(dataInicio, dataFim);
      vendas = principal.items || [];
      resumo = principal.resumo || resumo;
      chartSeries = {
        mensal: principal.series?.mensal || [],
        diaria: principal.series?.diaria || []
      };

      syncUrl();

      if (showSuccess) {
        toast.success('Relatório atualizado');
      }
    } catch (err) {
      if (vendas.length === 0) {
        vendas = [];
      }
      chartSeries = { mensal: [], diaria: [] };
      const msg = err instanceof Error ? err.message : 'Erro ao carregar relatório de vendas';
      console.error('[loadRelatorio] Erro:', msg);
      toast.error(msg);
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const hasDataInicio = Boolean(params.get('data_inicio'));
    const hasDataFim = Boolean(params.get('data_fim'));
    const monthRange = getCurrentMonthRange();
    const vendedorDefaultRange =
      $permissoes.ready && ($permissoes.isVendedor || $permissoes.usoIndividual);

    dataInicio = hasDataInicio
      ? String(params.get('data_inicio'))
      : vendedorDefaultRange
        ? monthRange.start
        : defaultRange.start;
    dataFim = hasDataFim
      ? String(params.get('data_fim'))
      : vendedorDefaultRange
        ? monthRange.end
        : defaultRange.end;
    vendedorSelecionado = params.get('vendedor_id') || '';
    empresaSelecionada = params.get('empresa_id') || '';
    statusSelecionado = params.get('status') || '';
    clienteIdFiltro = params.get('cliente_id') || '';
    destinoFiltro = params.get('destino') || '';
    produtoFiltro = params.get('produto') || '';
    tipoProdutoFiltro = params.get('tipo_produto') || '';

    await loadBase();
    await loadRelatorio();
  });

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function getStatusBadge(status: string): string {
    const styles: Record<string, string> = {
      confirmada: 'bg-green-100 text-green-700',
      pendente: 'bg-amber-100 text-amber-700',
      concluida: 'bg-blue-100 text-blue-700',
      cancelada: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      confirmada: 'Confirmada',
      pendente: 'Pendente',
      concluida: 'Concluída',
      cancelada: 'Cancelada'
    };

    return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-slate-100 text-slate-600'}">${labels[status] || status}</span>`;
  }

  function handleExport() {
    if (recibosFiltrados.length === 0) {
      toast.info('Não há recibos para exportar');
      return;
    }

    const headers = ['Código', 'Recibo', 'Data', 'Cliente', 'CPF', 'Vendedor', 'Destino', 'Cidade', 'Produto', 'Valor', 'Taxas', 'Comissão', '% Comissão', 'Status', 'Pagamento'];
    const rows = recibosFiltrados.map((recibo) => [
      recibo.codigo,
      recibo.numero_recibo || '',
      recibo.data_venda ? new Date(recibo.data_venda).toLocaleDateString('pt-BR') : '',
      recibo.cliente_nome,
      recibo.cliente_cpf || '',
      recibo.vendedor_nome,
      recibo.destino_nome,
      recibo.cidade_nome || '',
      recibo.produto_nome,
      recibo.valor_total.toFixed(2).replace('.', ','),
      recibo.valor_taxas.toFixed(2).replace('.', ','),
      recibo.comissao.toFixed(2).replace('.', ','),
      recibo.percentual_comissao.toFixed(2).replace('.', ','),
      recibo.status,
      recibo.forma_pagamento
    ]);

    const csv = ['\uFEFF' + headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_vendas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Relatório exportado com sucesso');
  }

  async function gerarRelatorio() {
    await loadRelatorio(true);
  }

  function clearContextFilters() {
    clienteIdFiltro = '';
    destinoFiltro = '';
    produtoFiltro = '';
    tipoProdutoFiltro = '';
    void loadRelatorio(true);
  }

  function handleRowClick(row: ReciboLinha) {
    void goto(`/vendas/${row.venda_id}`);
  }

  // Regra fiel de escopo: vendedor/uso individual não deve escolher empresa ou vendedor global.
  $: showEmpresaFiltro = !$permissoes.ready || $permissoes.isSystemAdmin || $permissoes.isMaster;
  $: showVendedorFiltro = !$permissoes.ready || (!$permissoes.isVendedor && !$permissoes.usoIndividual);

  $: if ($permissoes.ready && !showEmpresaFiltro && empresaSelecionada) {
    empresaSelecionada = '';
  }

  $: if ($permissoes.ready && !showVendedorFiltro && vendedorSelecionado) {
    vendedorSelecionado = '';
  }

  function buildReciboLinhas(
    rows: VendaRelatorio[],
    periodo: { inicio?: string | null; fim?: string | null } = { inicio: dataInicio, fim: dataFim }
  ): ReciboLinha[] {
    const linhas = rows.flatMap((venda) =>
      (Array.isArray(venda.recibos) ? venda.recibos : []).map((recibo, index) => ({
        id: recibo.id || `${venda.id}:${index}`,
        venda_id: venda.id,
        codigo: venda.codigo,
        numero_recibo: recibo.numero_recibo,
        data_venda: recibo.data_venda || venda.data_venda,
        produto_id: recibo.produto_id || null,
        cliente_nome: venda.cliente_nome,
        cliente_cpf: venda.cliente_cpf,
        vendedor_nome: venda.vendedor_nome,
        destino_nome: venda.destino_nome,
        cidade_nome: recibo.cidade_nome || venda.destino_cidade_nome,
        produto_nome: recibo.produto_nome,
        tipo_produto: recibo.tipo_produto,
        valor_total: getReciboBrutoExibicao(recibo),
        valor_taxas: getReciboTaxasExibicao(recibo),
        comissao: Number(recibo.valor_comissao_calculada || 0),
        percentual_comissao: Number(recibo.percentual_comissao_calculado || 0),
        status: venda.status,
        forma_pagamento: venda.forma_pagamento
      }))
    );

    return normalizarRecibosPeriodo(linhas, periodo.inicio, periodo.fim);
  }

  $: recibosFiltrados = buildReciboLinhas(vendas, { inicio: dataInicio, fim: dataFim });
  $: totalVendas = Number(resumo.total_valor || 0);
  $: totalComissoes = Number(resumo.total_comissao || 0);
  $: totalRecibos = recibosFiltrados.length;
  $: ticketMedio = Number(resumo.ticket_medio || 0);
  $: monthKeys = (() => {
    const reference = dataFim ? new Date(`${dataFim}T12:00:00`) : new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const d = new Date(reference.getFullYear(), reference.getMonth() - (5 - index), 1);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${d.getFullYear()}-${month}`;
    });
  })();

  $: currentMonthKey = (() => {
    const reference = dataFim ? new Date(`${dataFim}T12:00:00`) : new Date();
    const month = String(reference.getMonth() + 1).padStart(2, '0');
    return `${reference.getFullYear()}-${month}`;
  })();

  $: vendasPorMesData = (() => {
    const monthMap = new Map<string, number>();

    (chartSeries.mensal || []).forEach((item) => {
      monthMap.set(item.key, Number(item.total_valor || 0));
    });

    return {
      labels: monthKeys.map((key) => formatMonthLabel(key)),
      datasets: [
        {
          label: 'Vendas',
          data: monthKeys.map((key) => monthMap.get(key) || 0),
          backgroundColor: '#f97316'
        }
      ]
    } satisfies ChartData;
  })();

  $: vendasPorDiaMesData = (() => {
    const reference = dataFim ? new Date(`${dataFim}T12:00:00`) : new Date();
    const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
    const dayMap = new Map<number, number>();

    (chartSeries.diaria || []).forEach((point) => {
        const date = String(point?.date || '').slice(0, 10);
        if (!date) return;
        const day = Number(date.slice(8, 10));
        if (!Number.isFinite(day) || day <= 0) return;
        dayMap.set(day, (dayMap.get(day) || 0) + Number(point.value || 0));
      });

    const labels = Array.from({ length: daysInMonth }, (_, idx) => String(idx + 1).padStart(2, '0'));
    const data = Array.from({ length: daysInMonth }, (_, idx) => dayMap.get(idx + 1) || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Entrada diária',
          data,
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14,165,233,0.18)',
          fill: true,
          tension: 0.25
        }
      ]
    } satisfies ChartData;
  })();
</script>

<svelte:head>
  <title>Relatório de Vendas | VTUR</title>
</svelte:head>

<PageHeader
  title="Relatório de Vendas"
  subtitle="Leitura detalhada das vendas com drill-down operacional por cliente, destino, produto e responsável."
  color="financeiro"
  actions={[{ label: 'Voltar', href: '/relatorios', variant: 'outline', icon: ArrowLeft }]}
  breadcrumbs={[
    { label: 'Relatórios', href: '/relatorios' },
    { label: 'Vendas' }
  ]}
/>

<Card color="financeiro" class="mb-6">
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <FieldInput id="rel-vendas-data-inicio" label="Data início" type="date" bind:value={dataInicio} class_name="w-full" />
      <FieldInput id="rel-vendas-data-fim" label="Data fim" type="date" bind:value={dataFim} min={dataInicio || null} class_name="w-full" />
      {#if showEmpresaFiltro}
        <FieldSelect
          id="rel-vendas-empresa"
          label="Empresa"
          bind:value={empresaSelecionada}
          options={[{ value: '', label: 'Todas' }, ...empresas.map((empresa) => ({ value: empresa.id, label: empresa.nome }))]}
          placeholder={null}
          class_name="w-full"
        />
      {/if}
      {#if showVendedorFiltro}
        <FieldSelect
          id="rel-vendas-vendedor"
          label="Vendedor"
          bind:value={vendedorSelecionado}
          options={[{ value: '', label: 'Todos' }, ...vendedores.map((vendedor) => ({ value: vendedor.id, label: vendedor.nome }))]}
          placeholder={null}
          class_name="w-full"
        />
      {/if}
      <FieldSelect
        id="rel-vendas-status"
        label="Status"
        bind:value={statusSelecionado}
        options={[
          { value: '', label: 'Todos' },
          { value: 'confirmada', label: 'Confirmada' },
          { value: 'pendente', label: 'Pendente' },
          { value: 'concluida', label: 'Concluída' },
          { value: 'cancelada', label: 'Cancelada' }
        ]}
        placeholder={null}
        class_name="w-full"
      />
      <div class="flex items-end">
        <Button variant="primary" color="financeiro" class_name="w-full" on:click={gerarRelatorio}>
          <Filter size={16} class="mr-2" />
          Aplicar
        </Button>
      </div>
    </div>

    {#if clienteIdFiltro || destinoFiltro || produtoFiltro || tipoProdutoFiltro}
      <div class="flex flex-wrap items-center gap-2 rounded-2xl border border-financeiro-100 bg-financeiro-50/60 px-3 py-3 text-sm text-slate-600">
        <span class="font-medium text-slate-900">Drill-down ativo:</span>
        {#if clienteIdFiltro}
          <span class="rounded-full bg-white px-3 py-1">Cliente específico</span>
        {/if}
        {#if destinoFiltro}
          <span class="rounded-full bg-white px-3 py-1">Destino: {destinoFiltro}</span>
        {/if}
        {#if produtoFiltro}
          <span class="rounded-full bg-white px-3 py-1">Produto: {produtoFiltro}</span>
        {/if}
        {#if tipoProdutoFiltro}
          <span class="rounded-full bg-white px-3 py-1">Tipo: {tipoProdutoFiltro}</span>
        {/if}
        <Button variant="secondary" size="sm" class_name="rounded-full" on:click={clearContextFilters}>
          <X size={14} />
          Limpar contexto
        </Button>
      </div>
    {/if}
  </div>
</Card>

<KPIGrid className="mb-6" columns={5}>
  <KPICard 
    title="Total vendido" 
    value={formatCurrency(totalVendas)} 
    color="financeiro" 
    icon={DollarSign} 
  />
  <KPICard 
    title="Total de vendas" 
    value={resumo.total_vendas} 
    color="financeiro" 
    icon={ShoppingCart} 
  />
  <KPICard 
    title="Total de recibos" 
    value={totalRecibos} 
    color="financeiro" 
    icon={Users} 
  />
  <KPICard 
    title="Comissões" 
    value={formatCurrency(totalComissoes)} 
    color="financeiro" 
    icon={TrendingUp} 
  />
  <KPICard 
    title="Ticket médio" 
    value={formatCurrency(ticketMedio)} 
    color="financeiro" 
    icon={TrendingUp} 
  />
</KPIGrid>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <Card header="Vendas por mês (últimos 6 meses)" color="financeiro">
    <ChartJS type="bar" data={vendasPorMesData} height={280} />
  </Card>
  <Card header="Venda por dia do mês selecionado" color="financeiro">
    <ChartJS type="line" data={vendasPorDiaMesData} height={280} />
  </Card>
</div>

<DataTable
  {columns}
  data={recibosFiltrados}
  color="financeiro"
  {loading}
  title="Detalhamento de vendas"
  searchable={true}
  exportable={true}
  onExport={handleExport}
  onRowClick={handleRowClick}
/>
