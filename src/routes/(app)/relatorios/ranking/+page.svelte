<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { apiGet } from '$lib/services/api';

  interface VendedorRanking {
    posicao: number;
    vendedor_id: string;
    vendedor_nome: string;
    total_vendas: number;
    total_receita: number;
    total_liquido: number;
    total_seguro: number;
    total_comissao: number;
    total_orcamentos: number;
    ticket_medio: number;
    taxa_conversao: number;
    alcance_meta: number;
    alcance_meta_seguro: number;
    meta: number;
    meta_seguro: number;
    tendencia: 'up' | 'down' | 'stable';
  }

  interface Resumo {
    meta_mes: number;
    meta_seguro: number;
    total_receita: number;
    total_seguro: number;
    total_comissao: number;
    total_orcamentos: number;
    total_vendas: number;
    total_recibos: number;
    meta_total: number;
  }

  interface EmpresaFiltro {
    id: string;
    nome: string;
  }

  interface VendedorFiltro {
    id: string;
    nome: string;
  }

  function getDefaultRange() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: startOfMonth.toISOString().slice(0, 10),
      end: today.toISOString().slice(0, 10)
    };
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  const defaultRange = getDefaultRange();

  let vendedores: VendedorRanking[] = [];
  let empresas: EmpresaFiltro[] = [];
  let vendedoresFiltro: VendedorFiltro[] = [];
  let loading = true;
  let dataInicio = defaultRange.start;
  let dataFim = defaultRange.end;
  let empresaSelecionada = '';
  let vendedorSelecionado = '';
  let filtrosInicializados = false;
  let lastAppliedFilterKey = '';
  let pendingFilterKey = '';
  let applyFiltersTimer: ReturnType<typeof setTimeout> | null = null;
  let resumo: Resumo = {
    meta_mes: 0,
    meta_seguro: 0,
    total_receita: 0,
    total_seguro: 0,
    total_comissao: 0,
    total_orcamentos: 0,
    total_vendas: 0,
    total_recibos: 0,
    meta_total: 0
  };
  let vendedoresSeguro: VendedorRanking[] = [];

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function interpolateRgb(from: [number, number, number], to: [number, number, number], t: number) {
    const ratio = clamp(t, 0, 1);
    const r = Math.round(from[0] + (to[0] - from[0]) * ratio);
    const g = Math.round(from[1] + (to[1] - from[1]) * ratio);
    const b = Math.round(from[2] + (to[2] - from[2]) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function getAtingimentoColor(percentual: number) {
    const pct = clamp(percentual, 0, 100);
    if (pct < 80) return interpolateRgb([239, 68, 68], [249, 115, 22], pct / 80);
    return interpolateRgb([249, 115, 22], [34, 197, 94], (pct - 80) / 20);
  }

  function getDiasRestantesNoMes() {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return Math.max(0, Math.ceil((fimMes.getTime() - inicioHoje.getTime()) / 86400000));
  }

  function getValorDiario(row: VendedorRanking) {
    const meta = Number(row.meta || 0);
    const bruto = Number(row.total_receita || 0);
    const restante = Math.max(0, meta - bruto);
    if (diasRestantesNoMes <= 0) return 0;
    return restante / diasRestantesNoMes;
  }

  function getMetaDiariaSeguro(row: VendedorRanking) {
    const metaSeguro = Number(row.meta_seguro || 0);
    const vendidoSeguro = Number(row.total_seguro || 0);
    const restante = Math.max(0, metaSeguro - vendidoSeguro);
    if (diasRestantesNoMes <= 0) return 0;
    return restante / diasRestantesNoMes;
  }

  function getRowClassMetaVendas(row: VendedorRanking) {
    return Number(row.alcance_meta || 0) >= 100 ? '!bg-emerald-50/60 hover:!bg-emerald-100/60' : '';
  }

  function getRowClassMetaSeguro(row: VendedorRanking) {
    return Number(row.alcance_meta_seguro || 0) >= 100 ? '!bg-emerald-50/60 hover:!bg-emerald-100/60' : '';
  }

  const columnsVendas = [
    { key: 'posicao', label: '#', sortable: true, width: '60px' },
    { key: 'vendedor_nome', label: 'Vendedor', sortable: true },
    {
      key: 'total_vendas',
      label: 'Vendas',
      sortable: true,
      align: 'right' as const,
      width: '90px'
    },
    {
      key: 'total_receita',
      label: 'Valor Bruto',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'total_liquido',
      label: 'Valor Líquido',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'valor_diario',
      label: 'Meta diária',
      sortable: false,
      align: 'right' as const,
      headerClass: 'normal-case !tracking-normal',
      formatter: (_value: number, row: VendedorRanking) => formatCurrency(getValorDiario(row))
    },
    {
      key: 'alcance_meta',
      label: '%',
      sortable: true,
      align: 'right' as const,
      width: '100px',
      formatter: (value: number) => `${value.toFixed(1)}%`
    }
  ];

  const columnsSeguro = [
    { key: 'posicao', label: '#', sortable: true, width: '60px' },
    { key: 'vendedor_nome', label: 'Vendedor', sortable: true },
    {
      key: 'meta_seguro',
      label: 'Meta seguro',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(Number(value || 0))
    },
    {
      key: 'total_seguro',
      label: 'Seguro Viagem',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'meta_diaria_seguro',
      label: 'Meta diária',
      sortable: false,
      align: 'right' as const,
      headerClass: 'normal-case !tracking-normal',
      formatter: (_value: number, row: VendedorRanking) => formatCurrency(getMetaDiariaSeguro(row))
    },
    {
      key: 'alcance_meta_seguro',
      label: '%',
      sortable: true,
      align: 'right' as const,
      width: '120px',
      formatter: (value: number) => `${Number(value || 0).toFixed(1)}%`
    }
  ];

  async function loadBase() {
    try {
      const data = await apiGet<{ empresas: EmpresaFiltro[]; vendedores: VendedorFiltro[] }>('/api/v1/relatorios/base');
      empresas = data.empresas || [];
      vendedoresFiltro = data.vendedores || [];
    } catch {
      empresas = [];
      vendedoresFiltro = [];
      toast.error('Erro ao carregar filtros do ranking');
    }
  }

  async function loadRanking(showSuccess = false) {
    loading = true;
    try {
      const data = await apiGet<{ items: VendedorRanking[]; resumo: Resumo }>('/api/v1/relatorios/ranking', {
        data_inicio: dataInicio,
        data_fim: dataFim,
        empresa_id: empresaSelecionada || undefined,
        vendedor_ids: vendedorSelecionado || undefined
      });

      vendedores = data.items || [];
      resumo = data.resumo || resumo;

      if (showSuccess) toast.success('Ranking atualizado');
    } catch {
      vendedores = [];
      toast.error('Erro ao carregar ranking de vendas');
    } finally {
      loading = false;
    }
  }

  function syncUrl() {
    const params = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim });
    if (empresaSelecionada) params.set('empresa_id', empresaSelecionada);
    if (vendedorSelecionado) params.set('vendedor_ids', vendedorSelecionado);
    void goto(`/relatorios/ranking?${params.toString()}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  }

  function scheduleAutoApply() {
    if (applyFiltersTimer) clearTimeout(applyFiltersTimer);

    pendingFilterKey = currentFilterKey;
    applyFiltersTimer = setTimeout(() => {
      lastAppliedFilterKey = pendingFilterKey;
      syncUrl();
      void loadRanking();
      applyFiltersTimer = null;
    }, 250);
  }

  function handleExportVendas() {
    if (vendedores.length === 0) { toast.info('Não há dados para exportar'); return; }
    const headers = ['#', 'Vendedor', 'Vendas', 'Valor Bruto', 'Valor Líquido', 'Meta diária', '%'];
    const rows = vendedores.map((v) => [
      v.posicao,
      v.vendedor_nome,
      v.total_vendas,
      v.total_receita.toFixed(2).replace('.', ','),
      v.total_liquido.toFixed(2).replace('.', ','),
      getValorDiario(v).toFixed(2).replace('.', ','),
      v.alcance_meta.toFixed(1) + '%'
    ]);
    const csv = ['\uFEFF' + headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ranking_vendas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Ranking de vendas exportado');
  }

  function handleExportSeguro() {
    if (vendedores.length === 0) { toast.info('Não há dados para exportar'); return; }
    const headers = ['#', 'Vendedor', 'Meta seguro', 'Seguro Viagem', 'Meta diária', '%'];
    const rows = vendedores.map((v) => [
      v.posicao,
      v.vendedor_nome,
      Number(v.meta_seguro || 0).toFixed(2).replace('.', ','),
      v.total_seguro.toFixed(2).replace('.', ','),
      getMetaDiariaSeguro(v).toFixed(2).replace('.', ','),
      Number(v.alcance_meta_seguro || 0).toFixed(1) + '%'
    ]);
    const csv = ['\uFEFF' + headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ranking_seguro_viagem_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Ranking de seguro exportado');
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    dataInicio = params.get('data_inicio') || defaultRange.start;
    dataFim = params.get('data_fim') || defaultRange.end;
    empresaSelecionada = params.get('empresa_id') || '';
    vendedorSelecionado = params.get('vendedor_ids') || params.get('vendedor_id') || '';
    await loadBase();
    await loadRanking();
    lastAppliedFilterKey = currentFilterKey;
    filtrosInicializados = true;
  });

  onDestroy(() => {
    if (applyFiltersTimer) clearTimeout(applyFiltersTimer);
  });

  $: top3 = vendedores.slice(0, 3);
  $: vendedoresSeguro = [...vendedores]
    .sort((a, b) => Number(b?.total_seguro || 0) - Number(a?.total_seguro || 0))
    .map((item, index) => ({
      ...item,
      posicao: index + 1
    }));

  // Regra de escopo: vendedor/uso individual não escolhe empresa ou vendedor global.
  $: showEmpresaFiltro = !$permissoes.ready || $permissoes.isSystemAdmin || $permissoes.isMaster;
  $: showVendedorFiltro = !$permissoes.ready || (!$permissoes.isVendedor && !$permissoes.usoIndividual);
  $: showRankingPodio = !$permissoes.ready || $permissoes.isSystemAdmin || $permissoes.isMaster || $permissoes.isGestor;
  $: showBuscaRanking = !$permissoes.ready || !$permissoes.isVendedor;
  $: showExportRanking = !$permissoes.ready || !$permissoes.isVendedor;
  $: diasRestantesNoMes = getDiasRestantesNoMes();
  $: currentFilterKey = [dataInicio, dataFim, empresaSelecionada, vendedorSelecionado].join('|');
  $: isFiltroVendedorAtivo = vendedorSelecionado.trim().length > 0;
  $: showPodioTop3 = showRankingPodio && !isFiltroVendedorAtivo;

  $: if ($permissoes.ready && !showEmpresaFiltro && empresaSelecionada) empresaSelecionada = '';
  $: if ($permissoes.ready && !showVendedorFiltro && vendedorSelecionado) vendedorSelecionado = '';
  $: if (filtrosInicializados && currentFilterKey !== lastAppliedFilterKey) {
    scheduleAutoApply();
  }

  $: atingimentoVendasPct = resumo.meta_mes > 0 ? (resumo.total_receita / resumo.meta_mes) * 100 : 0;
  $: atingimentoVendasPctClamped = clamp(atingimentoVendasPct, 0, 100);
  $: atingimentoVendasColor = getAtingimentoColor(atingimentoVendasPct);

  $: atingimentoSeguroPct = resumo.meta_seguro > 0 ? (resumo.total_seguro / resumo.meta_seguro) * 100 : 0;
  $: atingimentoSeguroPctClamped = clamp(atingimentoSeguroPct, 0, 100);
  $: atingimentoSeguroColor = getAtingimentoColor(atingimentoSeguroPct);
</script>

<svelte:head>
  <title>Ranking de Vendas | VTUR</title>
</svelte:head>

<PageHeader
  title="Ranking de Vendas"
  subtitle="Comparativo por responsável com meta, conversão, comissão e tendência."
  color="financeiro"
  breadcrumbs={[
    { label: 'Relatórios', href: '/relatorios' },
    { label: 'Ranking de Vendas' }
  ]}
/>

<!-- Filtros -->
<Card color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <FieldInput id="rank-inicio" type="date" label="Data início" bind:value={dataInicio} />
    <FieldInput id="rank-fim" type="date" label="Data fim" bind:value={dataFim} />
    {#if showEmpresaFiltro}
      <FieldSelect
        id="rank-empresa"
        label="Empresa"
        bind:value={empresaSelecionada}
        options={[{ value: '', label: 'Todas' }, ...empresas.map((e) => ({ value: e.id, label: e.nome }))]}
      />
    {/if}
    {#if showVendedorFiltro}
      <FieldSelect
        id="rank-vendedor"
        label="Vendedor"
        bind:value={vendedorSelecionado}
        options={[{ value: '', label: 'Todos' }, ...vendedoresFiltro.map((v) => ({ value: v.id, label: v.nome }))]}
      />
    {/if}
  </div>
</Card>

<!-- KPIs -->
<KPIGrid className="mb-6" columns={5}>
  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Trophy size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Meta do mês</p>
      <p class="text-2xl font-bold text-slate-900">{formatCurrency(resumo.meta_mes)}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><TrendingUp size={20} /></div>
    <div class="w-full">
      <p class="text-sm font-medium text-slate-500">Valor total de vendas</p>
      <p class="text-2xl font-bold text-slate-900">{formatCurrency(resumo.total_receita)}</p>
      {#if resumo.meta_mes > 0}
        <div class="mt-2 w-full">
          <div class="h-1.5 w-full rounded-full bg-slate-200">
            <div
              class="h-1.5 rounded-full transition-all"
              style={`width:${atingimentoVendasPctClamped.toFixed(1)}%;background:${atingimentoVendasColor};`}
            ></div>
          </div>
          <p class="mt-0.5 text-xs text-slate-400">{atingimentoVendasPct.toFixed(1)}% da meta</p>
        </div>
      {:else}
        <p class="mt-0.5 text-xs text-slate-400">Sem meta cadastrada</p>
      {/if}
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><TrendingUp size={20} /></div>
    <div class="w-full">
      <p class="text-sm font-medium text-slate-500">Total de seguro</p>
      <p class="text-2xl font-bold text-slate-900">{formatCurrency(resumo.total_seguro)}</p>
      {#if resumo.meta_seguro > 0}
        <div class="mt-2 w-full">
          <div class="h-1.5 w-full rounded-full bg-slate-200">
            <div
              class="h-1.5 rounded-full transition-all"
              style={`width:${atingimentoSeguroPctClamped.toFixed(1)}%;background:${atingimentoSeguroColor};`}
            ></div>
          </div>
          <p class="mt-0.5 text-xs text-slate-400">{atingimentoSeguroPct.toFixed(1)}% da meta de seguro</p>
        </div>
      {:else}
        <p class="mt-0.5 text-xs text-slate-400">Sem meta de seguro cadastrada</p>
      {/if}
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><TrendingDown size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total de vendas</p>
      <p class="text-2xl font-bold text-slate-900">{resumo.total_vendas}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-slate-300">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Minus size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total de recibos</p>
      <p class="text-2xl font-bold text-slate-900">{resumo.total_recibos}</p>
    </div>
  </div>
</KPIGrid>

<!-- Pódio top 3 -->
{#if showPodioTop3 && !loading && top3.length > 0}
  <div class="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
    {#each top3 as v, i}
      <div class="vtur-card p-5 text-center border-t-4
        {i === 0 ? 'border-t-amber-400 bg-amber-50/40' : i === 1 ? 'border-t-slate-400 bg-slate-50/40' : 'border-t-orange-400 bg-orange-50/40'}">
        <div class="mb-2 flex items-center justify-center gap-2">
          <Trophy size={20} class="{i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-500' : 'text-orange-500'}" />
          <span class="text-2xl font-black {i === 0 ? 'text-amber-600' : i === 1 ? 'text-slate-600' : 'text-orange-600'}">
            {v.posicao}º
          </span>
        </div>
        <p class="font-semibold text-slate-900 truncate">{v.vendedor_nome}</p>
        <p class="mt-1 text-lg font-bold text-financeiro-700">{formatCurrency(v.total_receita)}</p>
        <div class="mt-2 flex justify-center gap-3 text-xs text-slate-500">
          <span>{v.total_vendas} venda(s)</span>
          <span>·</span>
          <span>{v.taxa_conversao.toFixed(0)}% conv.</span>
        </div>
        {#if v.meta > 0}
          <div class="mt-3">
            <div class="h-1.5 w-full rounded-full bg-slate-200">
              <div
                class="h-1.5 rounded-full bg-financeiro-500 transition-all"
                style="width: {Math.min(v.alcance_meta, 100).toFixed(1)}%"
              ></div>
            </div>
            <p class="mt-1 text-xs text-slate-500">{v.alcance_meta.toFixed(1)}% da meta</p>
          </div>
        {/if}
        <div class="mt-2 flex justify-center">
          {#if v.tendencia === 'up'}
            <span class="flex items-center gap-1 text-xs font-medium text-green-600">
              <TrendingUp size={12} /> Alta
            </span>
          {:else if v.tendencia === 'down'}
            <span class="flex items-center gap-1 text-xs font-medium text-red-600">
              <TrendingDown size={12} /> Queda
            </span>
          {:else}
            <span class="flex items-center gap-1 text-xs font-medium text-slate-500">
              <Minus size={12} /> Estável
            </span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Tabela completa de vendas -->
<Card header="Ranking completo de vendas" color="financeiro" padding="none" class="mb-3" />

<DataTable
  columns={columnsVendas}
  data={vendedores}
  color="financeiro"
  {loading}
  rowClass={getRowClassMetaVendas}
  searchable={showBuscaRanking}
  exportable={showExportRanking}
  onExport={handleExportVendas}
/>

<!-- Tabela de meta de seguro -->
<Card header="Ranking de meta de seguro viagem" color="financeiro" padding="none" class="mt-6 mb-3" />

<DataTable
  columns={columnsSeguro}
  data={vendedoresSeguro}
  color="financeiro"
  {loading}
  rowClass={getRowClassMetaSeguro}
  searchable={showBuscaRanking}
  exportable={showExportRanking}
  onExport={handleExportSeguro}
/>
