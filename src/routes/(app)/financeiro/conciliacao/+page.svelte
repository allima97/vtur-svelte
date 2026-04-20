<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import Tabs from '$lib/components/ui/Tabs.svelte';
  import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { toast } from '$lib/stores/ui';
  import { buildConciliacaoMetrics } from '$lib/conciliacao/business';
  import { parseConciliacaoImportText } from '$lib/conciliacao/importParser';
  import {
    AlertCircle,
    Bot,
    Calendar,
    CheckCircle,
    Clock3,
    Database,
    Download,
    FileClock,
    FileSpreadsheet,
    GitBranch,
    Loader2,
    RefreshCcw,
    Save,
    ShieldAlert,
    Upload,
    Users
  } from 'lucide-svelte';

  type ConciliacaoItem = {
    id: string;
    documento: string;
    movimento_data: string | null;
    status: string;
    descricao: string | null;
    valor_lancamentos: number | null;
    valor_taxas: number | null;
    valor_descontos: number | null;
    valor_abatimentos: number | null;
    valor_nao_comissionavel: number | null;
    valor_calculada_loja: number | null;
    valor_visao_master: number | null;
    valor_opfax: number | null;
    valor_saldo: number | null;
    valor_venda_real: number | null;
    valor_comissao_loja: number | null;
    percentual_comissao_loja: number | null;
    faixa_comissao: string | null;
    is_seguro_viagem: boolean;
    origem: string | null;
    conciliado: boolean;
    match_total: boolean | null;
    match_taxas: boolean | null;
    sistema_valor_total: number | null;
    sistema_valor_taxas: number | null;
    diff_total: number | null;
    diff_taxas: number | null;
    venda_id: string | null;
    venda_recibo_id: string | null;
    ranking_vendedor_id: string | null;
    ranking_produto_id: string | null;
    ranking_assigned_at: string | null;
    ranking_vendedor?: { id: string; nome_completo: string | null } | null;
    ranking_produto?: { id: string; nome: string | null } | null;
    is_baixa_rac?: boolean | null;
    is_nao_comissionavel?: boolean | null;
    last_checked_at: string | null;
    conciliado_em?: string | null;
    status_display?: string;
    status_label?: string;
  };

  type ConciliacaoSummary = {
    total: number;
    efetivados: number;
    pendentes: number;
    semRanking: number;
    baixaRac: number;
    totalValor: number;
    timeline: Array<{ date: string; value: number }>;
  };

  type ConciliacaoChange = {
    id: string;
    numero_recibo: string | null;
    field: string;
    old_value: number | null;
    new_value: number | null;
    changed_at: string;
    reverted_at: string | null;
    actor: string;
    changed_by_user?: { nome_completo?: string | null; email?: string | null } | null;
  };

  type ConciliacaoExecution = {
    id: string;
    actor: string;
    checked: number;
    reconciled: number;
    updated_taxes: number;
    still_pending: number;
    status: string;
    error_message: string | null;
    created_at: string;
    actor_user?: { nome_completo?: string | null; email?: string | null } | null;
  };

  type VendedorOption = { id: string; nome_completo: string };
  type ProdutoOption = { id: string; nome: string };
  type ImportPreviewRow = {
    documento: string;
    movimento_data: string | null;
    status: string | null | undefined;
    descricao: string | null | undefined;
    valor_lancamentos: number | null | undefined;
    valor_taxas: number | null | undefined;
    valor_saldo: number | null | undefined;
    percentual_comissao_loja: number | null | undefined;
    faixa_comissao: string | null | undefined;
  };

  let activeTab = 'registros';
  let loading = true;
  let running = false;
  let saving = false;
  let importing = false;
  let reverting = false;

  let summary: ConciliacaoSummary = {
    total: 0,
    efetivados: 0,
    pendentes: 0,
    semRanking: 0,
    baixaRac: 0,
    totalValor: 0,
    timeline: []
  };
  let registros: ConciliacaoItem[] = [];
  let changes: ConciliacaoChange[] = [];
  let executions: ConciliacaoExecution[] = [];
  let vendedores: VendedorOption[] = [];
  let produtosMeta: ProdutoOption[] = [];

  let monthFilter = currentMonth();
  let dayFilter = '';
  let searchQuery = '';
  let showPendingOnly = false;
  let rankingStatus: 'all' | 'pending' | 'assigned' | 'system' = 'all';
  let showBaixaRac = false;

  let selectedRow: ConciliacaoItem | null = null;
  let showDetailsDialog = false;
  let rankingVendedorId = '';
  let rankingProdutoId = '';
  let isBaixaRac = false;
  let marcadoConciliado = false;

  let importText = '';
  let importFallbackDate = new Date().toISOString().slice(0, 10);
  let importFileName = '';
  let importIgnored = 0;
  let importPreview: ImportPreviewRow[] = [];

  const tabs = [
    { key: 'registros', label: 'Registros', icon: Database, badge: registros.length },
    { key: 'importacao', label: 'Importação', icon: Upload, badge: importPreview.length || null },
    { key: 'alteracoes', label: 'Alterações', icon: GitBranch, badge: changes.filter((item) => !item.reverted_at).length || null },
    { key: 'execucoes', label: 'Execuções', icon: Bot, badge: executions.length || null }
  ];

  const recordColumns = [
    { key: 'documento', label: 'Documento', sortable: true, width: '140px' },
    {
      key: 'movimento_data',
      label: 'Data',
      sortable: true,
      width: '110px',
      formatter: (value: string) => formatDate(value)
    },
    {
      key: 'descricao',
      label: 'Descrição / Status',
      formatter: (_: unknown, row: ConciliacaoItem) =>
        `<div class="flex flex-col gap-1"><span class="font-medium text-slate-900">${escapeHtml(row.descricao || 'Sem descrição')}</span><span class="text-xs text-slate-500">${escapeHtml(row.status_label || row.status || '-')}</span></div>`
    },
    {
      key: 'valor_calculada_loja',
      label: 'Valor Loja',
      sortable: true,
      align: 'right' as const,
      width: '130px',
      formatter: (value: number) => formatCurrency(value)
    },
    {
      key: 'percentual_comissao_loja',
      label: '% Loja',
      sortable: true,
      width: '90px',
      formatter: (value: number | null) => formatPercent(value)
    },
    {
      key: 'faixa_comissao',
      label: 'Faixa',
      width: '130px',
      formatter: (value: string | null) => `<span class="text-xs font-semibold text-slate-700">${escapeHtml(value || 'SEM_COMISSAO')}</span>`
    },
    {
      key: 'conciliado',
      label: 'Situação',
      width: '150px',
      formatter: (_: unknown, row: ConciliacaoItem) => buildSituacaoCell(row)
    }
  ];

  const changeColumns = [
    { key: 'numero_recibo', label: 'Recibo', sortable: true, width: '140px' },
    { key: 'field', label: 'Campo', sortable: true, width: '140px' },
    { key: 'old_value', label: 'Antes', align: 'right' as const, formatter: (value: number | null) => formatCurrency(value) },
    { key: 'new_value', label: 'Depois', align: 'right' as const, formatter: (value: number | null) => formatCurrency(value) },
    { key: 'changed_at', label: 'Alterado em', sortable: true, width: '160px', formatter: (value: string) => formatDateTime(value) },
    {
      key: 'reverted_at',
      label: 'Status',
      width: '120px',
      formatter: (value: string | null) =>
        value
          ? '<span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Revertido</span>'
          : '<span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Pendente</span>'
    }
  ];

  const executionColumns = [
    { key: 'created_at', label: 'Data', sortable: true, width: '160px', formatter: (value: string) => formatDateTime(value) },
    { key: 'actor', label: 'Origem', width: '100px' },
    { key: 'checked', label: 'Lidos', sortable: true, width: '90px' },
    { key: 'reconciled', label: 'Conciliados', sortable: true, width: '110px' },
    { key: 'still_pending', label: 'Pendentes', sortable: true, width: '100px' },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      formatter: (value: string) =>
        value === 'success'
          ? '<span class="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Sucesso</span>'
          : '<span class="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Erro</span>'
    }
  ];

  $: filteredRecords = registros.filter((row) => {
    if (showPendingOnly && row.conciliado) return false;
    if (showBaixaRac && !row.is_baixa_rac) return false;
    if (searchQuery) {
      const haystack = [row.documento, row.descricao, row.status, row.ranking_vendedor?.nome_completo, row.ranking_produto?.nome]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  $: importPreview = buildImportPreview(importText, importFallbackDate);

  onMount(async () => {
    await loadAll();
  });

  async function loadAll() {
    loading = true;
    try {
      await Promise.all([loadSummary(), loadRegistros(), loadOptions(), loadChanges(), loadExecutions()]);
    } finally {
      loading = false;
    }
  }

  async function loadSummary() {
    const params = new URLSearchParams();
    if (monthFilter) params.set('mes', monthFilter);
    const response = await fetch(`/api/v1/conciliacao/summary?${params.toString()}`);
    const data = await parseJson(response, 'Erro ao carregar resumo da conciliação.');
    summary = {
      total: Number(data.total || 0),
      efetivados: Number(data.efetivados || 0),
      pendentes: Number(data.pendentes || 0),
      semRanking: Number(data.semRanking || 0),
      baixaRac: Number(data.baixaRac || 0),
      totalValor: Number(data.totalValor || 0),
      timeline: Array.isArray(data.timeline) ? data.timeline : []
    };
  }

  async function loadRegistros() {
    const params = new URLSearchParams();
    if (monthFilter) params.set('month', monthFilter);
    if (dayFilter) params.set('day', dayFilter);
    if (showPendingOnly) params.set('pending', '1');
    if (showBaixaRac) params.set('baixa_rac', '1');
    if (rankingStatus !== 'all') params.set('ranking_status', rankingStatus);

    const response = await fetch(`/api/v1/conciliacao/list?${params.toString()}`);
    const data = await parseJson(response, 'Erro ao carregar registros de conciliação.');
    registros = Array.isArray(data) ? data : [];
  }

  async function loadOptions() {
    const response = await fetch('/api/v1/conciliacao/options');
    const data = await parseJson(response, 'Erro ao carregar opções da conciliação.');
    vendedores = Array.isArray(data.vendedores) ? data.vendedores : [];
    produtosMeta = Array.isArray(data.produtosMeta) ? data.produtosMeta : [];
  }

  async function loadChanges() {
    const params = new URLSearchParams();
    if (monthFilter) params.set('month', monthFilter);
    const response = await fetch(`/api/v1/conciliacao/changes?${params.toString()}`);
    const data = await parseJson(response, 'Erro ao carregar alterações da conciliação.');
    changes = Array.isArray(data) ? data : [];
  }

  async function loadExecutions() {
    const response = await fetch('/api/v1/conciliacao/executions?limit=20');
    const data = await parseJson(response, 'Erro ao carregar execuções da conciliação.');
    executions = Array.isArray(data) ? data : [];
  }

  function openDetails(row: ConciliacaoItem) {
    selectedRow = row;
    rankingVendedorId = row.ranking_vendedor_id || '';
    rankingProdutoId = row.ranking_produto_id || '';
    isBaixaRac = Boolean(row.is_baixa_rac);
    marcadoConciliado = Boolean(row.conciliado);
    showDetailsDialog = true;
  }

  async function saveAssignment() {
    if (!selectedRow) return;
    saving = true;
    try {
      const response = await fetch('/api/v1/conciliacao/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conciliacaoId: selectedRow.id,
          rankingVendedorId: rankingVendedorId || null,
          rankingProdutoId: rankingProdutoId || null,
          vendaId: selectedRow.venda_id || null,
          vendaReciboId: selectedRow.venda_recibo_id || null,
          isBaixaRac,
          conciliado: marcadoConciliado
        })
      });
      await parseJson(response, 'Erro ao salvar atribuição de conciliação.');
      toast.success('Atribuição salva com sucesso.');
      showDetailsDialog = false;
      await Promise.all([loadRegistros(), loadSummary(), loadChanges()]);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar atribuição.');
    } finally {
      saving = false;
    }
  }

  async function runAutoConciliacao(reciboId?: string) {
    running = true;
    try {
      const response = await fetch('/api/v1/conciliacao/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: reciboId ? 1 : 200,
          conciliacaoReciboId: reciboId || null
        })
      });
      const data = await parseJson(response, 'Erro ao executar a conciliação automática.');
      toast.success(`Conciliação executada: ${Number(data.reconciliados || 0)} registros conciliados.`);
      await Promise.all([loadRegistros(), loadSummary(), loadExecutions()]);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao executar conciliação.');
    } finally {
      running = false;
    }
  }

  async function revertPendingChanges() {
    reverting = true;
    try {
      const response = await fetch('/api/v1/conciliacao/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revertAll: true, limit: 500 })
      });
      const data = await parseJson(response, 'Erro ao reverter alterações.');
      toast.success(`Alterações revertidas: ${Number(data.reverted || 0)} recibos atualizados.`);
      await Promise.all([loadRegistros(), loadChanges()]);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reverter alterações.');
    } finally {
      reverting = false;
    }
  }

  async function importPreviewRows() {
    if (importPreview.length === 0) {
      toast.error('Nenhuma linha válida para importar.');
      return;
    }

    importing = true;
    try {
      const response = await fetch('/api/v1/conciliacao/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linhas: importPreview.map((row) => ({
            ...row,
            origem: importFileName ? `arquivo:${importFileName}` : 'arquivo'
          }))
        })
      });
      const data = await parseJson(response, 'Erro ao importar arquivo de conciliação.');
      toast.success(
        `Importação concluída: ${Number(data.importados || 0)} importados, ${Number(data.duplicados || 0)} duplicados.`
      );
      importText = '';
      importFileName = '';
      importIgnored = 0;
      await Promise.all([loadRegistros(), loadSummary()]);
      activeTab = 'registros';
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar conciliação.');
    } finally {
      importing = false;
    }
  }

  async function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    importFileName = file.name;
    importText = await file.text();
    importIgnored = parseConciliacaoImportText(importText, importFallbackDate).ignored;
  }

  function buildImportPreview(text: string, fallbackDate: string): ImportPreviewRow[] {
    const parsed = parseConciliacaoImportText(text, fallbackDate);
    importIgnored = parsed.ignored;
    return parsed.linhas.slice(0, 200).map((row) => {
      const metrics = buildConciliacaoMetrics({
        descricao: row.descricao,
        valorLancamentos: row.valor_lancamentos,
        valorTaxas: row.valor_taxas,
        valorDescontos: row.valor_descontos,
        valorAbatimentos: row.valor_abatimentos,
        valorNaoComissionavel: row.valor_nao_comissionavel,
        valorSaldo: row.valor_saldo,
        valorOpfax: row.valor_opfax,
        valorCalculadaLoja: row.valor_calculada_loja,
        valorVisaoMaster: row.valor_visao_master,
        valorComissaoLoja: row.valor_comissao_loja,
        percentualComissaoLoja: row.percentual_comissao_loja
      });
      return {
        documento: row.documento,
        movimento_data: row.movimento_data || fallbackDate,
        status: row.status || null,
        descricao: row.descricao || null,
        valor_lancamentos: row.valor_lancamentos ?? null,
        valor_taxas: row.valor_taxas ?? null,
        valor_saldo: row.valor_saldo ?? null,
        percentual_comissao_loja: metrics.percentualComissaoLoja,
        faixa_comissao: metrics.faixaComissao
      };
    });
  }

  function exportRows() {
    if (filteredRecords.length === 0) {
      toast.error('Nenhum registro para exportar.');
      return;
    }
    const headers = ['Documento', 'Data', 'Status', 'Descricao', 'Valor Loja', 'Taxas', '% Loja', 'Faixa', 'Conciliado'];
    const rows = filteredRecords.map((row) => [
      row.documento,
      row.movimento_data || '',
      row.status_label || row.status || '',
      (row.descricao || '').replace(/;/g, ','),
      String(Number(row.valor_calculada_loja || 0).toFixed(2)).replace('.', ','),
      String(Number(row.valor_taxas || 0).toFixed(2)).replace('.', ','),
      String(Number(row.percentual_comissao_loja || 0).toFixed(2)).replace('.', ','),
      row.faixa_comissao || '',
      row.conciliado ? 'Sim' : 'Nao'
    ]);
    const csv = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `conciliacao_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function formatCurrency(value: number | null | undefined) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  }

  function formatPercent(value: number | null | undefined) {
    const num = Number(value || 0);
    if (!num) return '-';
    return `${num.toFixed(2)}%`;
  }

  function formatDate(value?: string | null) {
    if (!value) return '-';
    return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
  }

  function formatDateTime(value?: string | null) {
    if (!value) return '-';
    return new Date(value).toLocaleString('pt-BR');
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function buildSituacaoCell(row: ConciliacaoItem) {
    const chips = [];
    chips.push(
      row.conciliado
        ? '<span class="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Conciliado</span>'
        : '<span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Pendente</span>'
    );
    if (row.ranking_vendedor?.nome_completo) {
      chips.push(`<span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">${escapeHtml(row.ranking_vendedor.nome_completo)}</span>`);
    } else if (!row.venda_id) {
      chips.push('<span class="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Sem ranking</span>');
    }
    if (row.is_baixa_rac) {
      chips.push('<span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Baixa RAC</span>');
    }
    return `<div class="flex flex-wrap gap-1">${chips.join('')}</div>`;
  }

  async function parseJson(response: Response, fallbackMessage: string) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || fallbackMessage);
    }
    return data;
  }
</script>

<svelte:head>
  <title>Conciliação | VTUR</title>
</svelte:head>

<PageHeader
  title="Conciliação de Vendas"
  subtitle="Importe extratos, execute o vínculo com recibos e audite ranking, taxas e histórico."
  color="financeiro"
  breadcrumbs={[{ label: 'Financeiro', href: '/financeiro' }, { label: 'Conciliação' }]}
/>

<div class="vtur-kpi-grid vtur-kpi-grid-5 mb-6">
  <button type="button" class="contents text-left" on:click={() => { activeTab = 'registros'; showPendingOnly = true; showBaixaRac = false; loadRegistros(); }}>
    <KPICard title="Pendentes" value={summary.pendentes} subtitle="Aguardando vínculo" color="financeiro" icon={Clock3} />
  </button>
  <button type="button" class="contents text-left" on:click={() => { activeTab = 'registros'; rankingStatus = 'pending'; showPendingOnly = false; loadRegistros(); }}>
    <KPICard title="Sem ranking" value={summary.semRanking} subtitle="Baixas sem responsável" color="clientes" icon={Users} />
  </button>
  <button type="button" class="contents text-left" on:click={() => { activeTab = 'registros'; showBaixaRac = true; showPendingOnly = false; loadRegistros(); }}>
    <KPICard title="Baixa RAC" value={summary.baixaRac} subtitle="Tratamento manual" color="operacao" icon={ShieldAlert} />
  </button>
  <KPICard title="Efetivados" value={summary.efetivados} subtitle={formatCurrency(summary.totalValor)} color="vendas" icon={CheckCircle} />
  <KPICard title="Importados" value={summary.total} subtitle="No período selecionado" color="clientes" icon={Database} />
</div>

<FilterPanel title="Filtros da Conciliação" color="financeiro" fieldsClass="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
  <div>
    <label for="conciliacao-mes" class="mb-1 block text-sm font-medium text-slate-700">Mês</label>
    <input id="conciliacao-mes" type="month" bind:value={monthFilter} class="vtur-input w-full" />
  </div>
  <div>
    <label for="conciliacao-dia" class="mb-1 block text-sm font-medium text-slate-700">Dia específico</label>
    <input id="conciliacao-dia" type="date" bind:value={dayFilter} class="vtur-input w-full" />
  </div>
  <div>
    <label for="conciliacao-busca" class="mb-1 block text-sm font-medium text-slate-700">Busca</label>
    <input id="conciliacao-busca" type="text" bind:value={searchQuery} placeholder="Documento, descrição, vendedor..." class="vtur-input w-full" />
  </div>
  <div>
    <label for="conciliacao-ranking-status" class="mb-1 block text-sm font-medium text-slate-700">Ranking</label>
    <select id="conciliacao-ranking-status" bind:value={rankingStatus} class="vtur-input w-full">
      <option value="all">Todos</option>
      <option value="pending">Pendentes</option>
      <option value="assigned">Atribuídos</option>
      <option value="system">Vinculados ao sistema</option>
    </select>
  </div>
  <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
    <input type="checkbox" bind:checked={showPendingOnly} class="rounded border-slate-300" />
    Somente pendentes
  </label>
  <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
    <input type="checkbox" bind:checked={showBaixaRac} class="rounded border-slate-300" />
    Somente Baixa RAC
  </label>

  <svelte:fragment slot="actions">
    <div class="flex flex-wrap gap-2">
      <Button variant="secondary" on:click={loadAll}>
        <RefreshCcw size={16} class="mr-2" />
        Atualizar
      </Button>
      <Button variant="secondary" on:click={exportRows}>
        <Download size={16} class="mr-2" />
        Exportar
      </Button>
      <Button color="financeiro" on:click={() => runAutoConciliacao()} disabled={running} loading={running}>
        <Bot size={16} class="mr-2" />
        Conciliar automático
      </Button>
    </div>
  </svelte:fragment>
</FilterPanel>

<Card color="financeiro" class="mb-6">
  <div class="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
    <div>
      <h3 class="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Linha do tempo</h3>
      {#if summary.timeline.length > 0}
        <div class="space-y-2">
          {#each summary.timeline.slice(-7).reverse() as item}
            <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span class="text-sm font-medium text-slate-700">{formatDate(item.date)}</span>
              <span class="text-sm font-semibold text-slate-900">{formatCurrency(item.value)}</span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
          Nenhum movimento de conciliação no período selecionado.
        </div>
      {/if}
    </div>

    <div class="grid gap-3">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Operação recomendada</p>
        <p class="mt-2 text-sm text-slate-700">
          Importe o extrato, execute a conciliação automática e revise primeiro as linhas sem ranking ou marcadas como Baixa RAC.
        </p>
      </div>
      <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Pendências abertas</p>
        <p class="mt-2 text-sm font-semibold text-amber-900">{summary.pendentes} linhas aguardando vínculo operacional.</p>
      </div>
    </div>
  </div>
</Card>

<Tabs bind:activeKey={activeTab} items={tabs} className="mb-6" />

{#if activeTab === 'registros'}
  <Card header="Registros conciliados/importados" color="financeiro">
    <DataTable
      data={filteredRecords}
      columns={recordColumns}
      color="financeiro"
      {loading}
      title="Conciliação"
      searchable={false}
      filterable={false}
      exportable={false}
      emptyMessage="Nenhum registro de conciliação encontrado."
      onRowClick={openDetails}
    />
  </Card>
{:else if activeTab === 'importacao'}
  <div class="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
    <Card header="Importar extrato" color="financeiro">
      <div class="space-y-4">
        <div>
          <label for="conciliacao-arquivo" class="mb-1 block text-sm font-medium text-slate-700">Arquivo do extrato</label>
          <input id="conciliacao-arquivo" type="file" accept=".csv,.txt,.tsv" class="vtur-input w-full" on:change={handleFileChange} />
          <p class="mt-1 text-xs text-slate-500">Aceita CSV, TXT e TSV. O parser usa o cabeçalho para localizar as colunas.</p>
        </div>

        <div>
          <label for="conciliacao-fallback-date" class="mb-1 block text-sm font-medium text-slate-700">Data padrão para linhas sem data</label>
          <input id="conciliacao-fallback-date" type="date" bind:value={importFallbackDate} class="vtur-input w-full" />
        </div>

        <div>
          <label for="conciliacao-paste" class="mb-1 block text-sm font-medium text-slate-700">Ou cole o conteúdo do extrato</label>
          <textarea
            id="conciliacao-paste"
            bind:value={importText}
            rows="12"
            class="vtur-input w-full"
            placeholder="Cole aqui as linhas do extrato com cabeçalho: documento;movimento_data;status;descricao;valor_lancamentos..."
          ></textarea>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          <p><strong>{importPreview.length}</strong> linhas prontas para importar.</p>
          <p><strong>{importIgnored}</strong> linhas ignoradas por falta de documento.</p>
          {#if importFileName}
            <p class="mt-1 text-xs text-slate-500">Arquivo carregado: {importFileName}</p>
          {/if}
        </div>

        <div class="flex flex-wrap gap-2">
          <Button color="financeiro" on:click={importPreviewRows} disabled={importPreview.length === 0} loading={importing}>
            <Upload size={16} class="mr-2" />
            Importar para conciliação
          </Button>
          <Button variant="secondary" on:click={() => { importText = ''; importFileName = ''; importIgnored = 0; }}>
            Limpar
          </Button>
        </div>
      </div>
    </Card>

    <Card header="Prévia da importação" color="financeiro">
      {#if importPreview.length === 0}
        <div class="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
          Carregue um arquivo ou cole o extrato para visualizar a prévia antes de importar.
        </div>
      {:else}
        <div class="space-y-3">
          {#each importPreview.slice(0, 12) as row}
            <div class="rounded-xl border border-slate-200 px-4 py-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-900">{row.documento}</p>
                  <p class="text-sm text-slate-500">{row.descricao || 'Sem descrição'}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold text-slate-900">{formatCurrency(row.valor_lancamentos)}</p>
                  <p class="text-xs text-slate-500">{formatDate(row.movimento_data)}</p>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{row.status || 'OUTRO'}</span>
                <span class="rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-700">{row.faixa_comissao || 'SEM_COMISSAO'}</span>
                <span class="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">{formatPercent(row.percentual_comissao_loja)}</span>
              </div>
            </div>
          {/each}
          {#if importPreview.length > 12}
            <p class="text-xs text-slate-500">Mostrando 12 de {importPreview.length} linhas preparadas para importação.</p>
          {/if}
        </div>
      {/if}
    </Card>
  </div>
{:else if activeTab === 'alteracoes'}
  <Card color="financeiro" header="Histórico de alterações da conciliação">
    <div class="mb-4 flex justify-end">
      <Button variant="secondary" on:click={revertPendingChanges} disabled={changes.filter((item) => !item.reverted_at).length === 0} loading={reverting}>
        <RefreshCcw size={16} class="mr-2" />
        Reverter pendentes
      </Button>
    </div>

    <DataTable
      data={changes}
      columns={changeColumns}
      color="financeiro"
      {loading}
      title="Alterações"
      searchable={false}
      filterable={false}
      exportable={false}
      emptyMessage="Nenhuma alteração registrada."
    />
  </Card>
{:else if activeTab === 'execucoes'}
  <Card color="financeiro" header="Execuções automáticas e manuais">
    <DataTable
      data={executions}
      columns={executionColumns}
      color="financeiro"
      {loading}
      title="Execuções"
      searchable={false}
      filterable={false}
      exportable={false}
      emptyMessage="Nenhuma execução registrada."
    />
  </Card>
{/if}

<Dialog
  bind:open={showDetailsDialog}
  title="Detalhes da conciliação"
  color="financeiro"
  showConfirm={true}
  confirmText="Salvar atribuição"
  onConfirm={saveAssignment}
  loading={saving}
  maxWidth="840px"
>
  {#if selectedRow}
    <div class="space-y-5">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Extrato</p>
          <p class="mt-2 text-lg font-semibold text-slate-900">{selectedRow.documento}</p>
          <p class="text-sm text-slate-500">{selectedRow.descricao || 'Sem descrição'}</p>
          <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-slate-500">Data</p>
              <p class="font-medium text-slate-900">{formatDate(selectedRow.movimento_data)}</p>
            </div>
            <div>
              <p class="text-slate-500">Status</p>
              <p class="font-medium text-slate-900">{selectedRow.status_label || selectedRow.status}</p>
            </div>
            <div>
              <p class="text-slate-500">Valor loja</p>
              <p class="font-medium text-slate-900">{formatCurrency(selectedRow.valor_calculada_loja)}</p>
            </div>
            <div>
              <p class="text-slate-500">% loja</p>
              <p class="font-medium text-slate-900">{formatPercent(selectedRow.percentual_comissao_loja)}</p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Auditoria do sistema</p>
          <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-slate-500">Venda vinculada</p>
              <p class="font-medium text-slate-900">{selectedRow.venda_id || '-'}</p>
            </div>
            <div>
              <p class="text-slate-500">Recibo vinculado</p>
              <p class="font-medium text-slate-900">{selectedRow.venda_recibo_id || '-'}</p>
            </div>
            <div>
              <p class="text-slate-500">Match total</p>
              <p class="font-medium text-slate-900">{selectedRow.match_total == null ? '-' : selectedRow.match_total ? 'Sim' : 'Não'}</p>
            </div>
            <div>
              <p class="text-slate-500">Match taxas</p>
              <p class="font-medium text-slate-900">{selectedRow.match_taxas == null ? '-' : selectedRow.match_taxas ? 'Sim' : 'Não'}</p>
            </div>
            <div>
              <p class="text-slate-500">Dif. total</p>
              <p class="font-medium text-slate-900">{formatCurrency(selectedRow.diff_total)}</p>
            </div>
            <div>
              <p class="text-slate-500">Dif. taxas</p>
              <p class="font-medium text-slate-900">{formatCurrency(selectedRow.diff_taxas)}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label for="conciliacao-vendedor" class="mb-1 block text-sm font-medium text-slate-700">Vendedor de ranking</label>
          <select id="conciliacao-vendedor" bind:value={rankingVendedorId} class="vtur-input w-full">
            <option value="">Selecione...</option>
            {#each vendedores as vendedor}
              <option value={vendedor.id}>{vendedor.nome_completo}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="conciliacao-produto" class="mb-1 block text-sm font-medium text-slate-700">Produto para meta</label>
          <select id="conciliacao-produto" bind:value={rankingProdutoId} class="vtur-input w-full">
            <option value="">Selecione...</option>
            {#each produtosMeta as produto}
              <option value={produto.id}>{produto.nome}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <input type="checkbox" bind:checked={marcadoConciliado} class="rounded border-slate-300" />
          Marcar como conciliado
        </label>
        <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <input type="checkbox" bind:checked={isBaixaRac} class="rounded border-slate-300" />
          Marcar como Baixa RAC
        </label>
      </div>

      <div class="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <Button variant="secondary" on:click={() => selectedRow && runAutoConciliacao(selectedRow.id)} disabled={running} loading={running}>
          <Bot size={16} class="mr-2" />
          Tentar vínculo automático
        </Button>
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Última checagem: {formatDateTime(selectedRow.last_checked_at)}
        </div>
      </div>
    </div>
  {/if}

  <svelte:fragment slot="actions">
    <Button color="financeiro" on:click={saveAssignment} loading={saving}>
      <Save size={16} class="mr-2" />
      Salvar atribuição
    </Button>
  </svelte:fragment>
</Dialog>
