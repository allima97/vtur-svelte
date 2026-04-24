<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import FileInput from '$lib/components/ui/FileInput.svelte';
  import FileDropzone from '$lib/components/ui/FileDropzone.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import FieldCheckbox from '$lib/components/ui/form/FieldCheckbox.svelte';
  import { FieldInput, FieldSelect, FieldTextarea } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { buildConciliacaoMetrics } from '$lib/conciliacao/business';
  import { parseConciliacaoImportFile, parseConciliacaoImportText } from '$lib/conciliacao/importParser';
  import type { ConciliacaoLinhaInput } from '../../../api/v1/conciliacao/_types';
  import {
    AlertCircle,
    Bot,
    Calendar,
    CheckCircle,
    Clock3,
    FileText,
    Database,
    Download,
    FileClock,
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
    company_id?: string;
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
    vendedor_ranking: string;
    meta_dif: string;
    valor_lancamentos: number | null | undefined;
    valor_taxas: number | null | undefined;
    valor_descontos: number | null | undefined;
    valor_abatimentos: number | null | undefined;
    valor_nao_comissionavel: number | null | undefined;
    valor_venda_real: number | null | undefined;
    valor_comissao_loja: number | null | undefined;
    valor_saldo: number | null | undefined;
    percentual_comissao_loja: number | null | undefined;
    faixa_comissao: string | null | undefined;
    ranking_vendedor_id?: string | null;
    ranking_produto_id?: string | null;
    venda_id?: string | null;
    venda_recibo_id?: string | null;
  };

  type ImportLookupMatch = {
    vendedor_id: string;
    venda_id: string;
    venda_recibo_id: string;
  };

  let activeTab = 'visao_geral';
  let activeKpiView: 'visao_geral' | 'conciliados' | 'pendentes' | 'pendentes_ranking' | 'baixa_rac' | 'execucoes' = 'visao_geral';
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
  let showOnlyConciliated = false;
  let rankingStatus: 'all' | 'pending' | 'assigned' | 'system' = 'all';
  let showBaixaRac = false;

  let vgFiltroDocumento = '';
  let vgFiltroVendedor = 'all';
  let vgFiltroStatus = 'all';
  let vgFiltroMes = 'all';
  let vgFiltroDia = 'all';
  let vgFiltroReciboEncontrado = 'all';
  let vgFiltroRanking = 'all';
  let vgFiltroConciliado = 'all';

  let selectedRow: ConciliacaoItem | null = null;
  let showDetailsDialog = false;
  let rankingVendedorId = '';
  let rankingProdutoId = '';
  let isBaixaRac = false;
  let marcadoConciliado = false;

  let importText = '';
  let importFallbackDate = new Date().toISOString().slice(0, 10);
  let importFileName = '';
  let importFiles: FileList | undefined = undefined;
  let importIgnored = 0;
  let importRowsTotal = 0;
  let importAutoLinked = 0;
  let importLookupMatches: Record<string, ImportLookupMatch | null> = {};
  let importPreparedRows: ImportPreviewRow[] = [];
  let importPreview: ImportPreviewRow[] = [];
  let importLookupSignature = '';
  let importLookupLoading = false;

  $: rankingStatusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'assigned', label: 'Atribuídos' },
    { value: 'system', label: 'Vinculados ao sistema' }
  ];

  $: vendedorOptions = vendedores.map((vendedor) => ({
    value: vendedor.id,
    label: vendedor.nome_completo
  }));

  $: produtoOptions = produtosMeta.map((produto) => ({
    value: produto.id,
    label: produto.nome
  }));

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
    if (showOnlyConciliated && !row.conciliado) return false;
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

  $: registrosPendentes = filteredRecords.filter((row) => !row.conciliado);
  $: registrosConciliados = filteredRecords.filter((row) => row.conciliado);
  $: registrosBaixaRac = filteredRecords.filter(
    (row) => Boolean(row.is_baixa_rac) || String(row.ranking_vendedor_id || '') === 'BAIXA_RAC'
  );
  $: registrosPendentesRanking = filteredRecords.filter((row) => {
    const status = String(row.status || '').toUpperCase();
    const exigeRanking = status === 'BAIXA' || status === 'OPFAX';
    return exigeRanking && !String(row.ranking_vendedor_id || '').trim();
  });
  $: alteracoesPendentes = changes.filter((item) => !item.reverted_at);

  $: visaoGeralRows = registros.map((row) => {
    const vendedorNome =
      row.ranking_vendedor?.nome_completo ||
      vendedores.find((item) => item.id === row.ranking_vendedor_id)?.nome_completo ||
      null;
    const statusLabel = statusImportLabel(row.status);
    const exige = exigeRanking(row.status);
    return {
      ...row,
      _vendedor_nome: vendedorNome,
      _status_label: statusLabel,
      _recibo_encontrado: Boolean(row.venda_recibo_id),
      _ranking_ok: exige ? Boolean(String(row.ranking_vendedor_id || '').trim()) : null,
      _mes: String(row.movimento_data || '').slice(0, 7)
    };
  });

  $: vgStatusOptions = Array.from(
    new Set(visaoGeralRows.map((row) => row._status_label).filter((value): value is string => Boolean(value)))
  ).sort();
  $: vgVendedorOptions = Array.from(
    new Set(visaoGeralRows.map((row) => row._vendedor_nome).filter((value): value is string => Boolean(value)))
  ).sort();
  $: vgMesOptions = Array.from(new Set(visaoGeralRows.map((row) => row._mes).filter(Boolean))).sort().reverse();
  $: vgDiaOptions = Array.from(
    new Set(
      visaoGeralRows
        .filter((row) => vgFiltroMes === 'all' || row._mes === vgFiltroMes)
        .map((row) => String(row.movimento_data || ''))
        .filter(Boolean)
    )
  )
    .sort()
    .reverse();

  $: vgStatusSelectOptions = [
    { value: 'all', label: 'Todos' },
    ...vgStatusOptions.map((item) => ({ value: String(item || ''), label: String(item || '') })).filter((item) => item.value)
  ];
  $: vgVendedorSelectOptions = [
    { value: 'all', label: 'Todos' },
    ...vgVendedorOptions
      .map((item) => ({ value: String(item || ''), label: String(item || '') }))
      .filter((item) => item.value)
  ];
  $: vgMesSelectOptions = [
    { value: 'all', label: 'Todos' },
    ...vgMesOptions.map((item) => ({ value: String(item || ''), label: String(item || '') })).filter((item) => item.value)
  ];
  $: vgDiaSelectOptions = [
    { value: 'all', label: 'Todos do mês' },
    ...vgDiaOptions.map((item) => ({ value: String(item || ''), label: formatDate(item) })).filter((item) => item.value)
  ];

  $: visaoGeralFiltrados = visaoGeralRows.filter((row) => {
    const docSearch = vgFiltroDocumento.trim().toLowerCase();
    if (docSearch && !String(row.documento || '').toLowerCase().includes(docSearch)) return false;
    if (vgFiltroVendedor !== 'all' && row._vendedor_nome !== vgFiltroVendedor) return false;
    if (vgFiltroStatus !== 'all' && row._status_label !== vgFiltroStatus) return false;
    if (vgFiltroMes !== 'all' && row._mes !== vgFiltroMes) return false;
    if (vgFiltroDia !== 'all' && String(row.movimento_data || '') !== vgFiltroDia) return false;

    if (vgFiltroReciboEncontrado !== 'all') {
      if (vgFiltroReciboEncontrado === 'sim' && !row._recibo_encontrado) return false;
      if (vgFiltroReciboEncontrado === 'nao' && row._recibo_encontrado) return false;
    }

    if (vgFiltroRanking !== 'all') {
      if (vgFiltroRanking === 'sim' && row._ranking_ok !== true) return false;
      if (vgFiltroRanking === 'nao' && row._ranking_ok !== false) return false;
    }

    if (vgFiltroConciliado !== 'all') {
      if (vgFiltroConciliado === 'sim' && !row.conciliado) return false;
      if (vgFiltroConciliado === 'nao' && row.conciliado) return false;
    }

    return true;
  });

  function statusImportLabel(status?: string | null) {
    const value = String(status || '').toUpperCase();
    if (value === 'BAIXA') return 'Efetivado';
    if (value === 'OPFAX') return 'Pendente em OPFAX';
    if (value === 'ESTORNO') return 'Estorno';
    return value || 'OUTRO';
  }

  function exigeRanking(status?: string | null) {
    const value = String(status || '').toUpperCase();
    return value === 'BAIXA' || value === 'OPFAX';
  }

  function formatMoney(value: number | null | undefined) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return '-';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  $: {
    // Keep this dependency explicit so the preview recomputes when lookup matches arrive.
    const _lookupMatches = importLookupMatches;

    const parsed = parseConciliacaoImportText(importText, importFallbackDate);
    importIgnored = parsed.ignored;

    const signature = parsed.linhas
      .map((row) => `${String(row.documento || '').trim()}::${Number(row.valor_lancamentos || 0)}::${Number(row.valor_taxas || 0)}`)
      .join('|');

    if (signature && signature !== importLookupSignature) {
      importLookupSignature = signature;
      void loadImportLookup(parsed.linhas);
    }

    importPreparedRows = buildImportPreviewRows(parsed.linhas, importFallbackDate);
    importRowsTotal = importPreparedRows.length;
    importAutoLinked = importPreparedRows.filter((row) => Boolean(row.ranking_vendedor_id)).length;
    importPreview = importPreparedRows;
  }

  onMount(async () => {
    await loadAll();
  });

  async function loadAll() {
    loading = true;
    try {
      await Promise.all([loadSummary(), loadRegistros(), loadOptions(), loadChanges(), loadExecutions()]);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar dados da conciliação.');
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

  async function abrirImportacao() {
    activeTab = 'importacao';
  }

  async function aplicarKpiView(mode: 'visao_geral' | 'conciliados' | 'pendentes' | 'pendentes_ranking' | 'baixa_rac' | 'execucoes') {
    activeKpiView = mode;

    if (mode === 'execucoes') {
      activeTab = 'execucoes';
      await loadExecutions();
      return;
    }

    if (mode === 'visao_geral') {
      activeTab = 'visao_geral';
      showOnlyConciliated = false;
      showPendingOnly = false;
      showBaixaRac = false;
      rankingStatus = 'all';
      await loadRegistros();
      return;
    }

    activeTab = 'registros';
    showOnlyConciliated = mode === 'conciliados';
    showPendingOnly = mode === 'pendentes';
    showBaixaRac = mode === 'baixa_rac';
    rankingStatus = mode === 'pendentes_ranking' ? 'pending' : 'all';
    await loadRegistros();
  }

  function onTabClick(key: string) {
    if (key === 'visao_geral') {
      activeTab = 'visao_geral';
      showPendingOnly = false;
      showBaixaRac = false;
      rankingStatus = 'all';
      return;
    }

    if (key === 'pendentes') {
      activeTab = 'registros';
      showPendingOnly = true;
      showBaixaRac = false;
      return;
    }

    if (key === 'baixa_rac') {
      activeTab = 'registros';
      showBaixaRac = true;
      showPendingOnly = false;
      return;
    }

    activeTab = key;
    if (key === 'registros') {
      showPendingOnly = false;
      showBaixaRac = false;
    }
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
    if (importPreparedRows.length === 0) {
      toast.error('Nenhuma linha válida para importar.');
      return;
    }

    importing = true;
    try {
      const response = await fetch('/api/v1/conciliacao/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linhas: importPreparedRows.map((row) => ({
            documento: row.documento,
            movimento_data: row.movimento_data,
            status: row.status,
            descricao: row.descricao,
            valor_lancamentos: row.valor_lancamentos,
            valor_taxas: row.valor_taxas,
            valor_descontos: row.valor_descontos,
            valor_abatimentos: row.valor_abatimentos,
            valor_nao_comissionavel: row.valor_nao_comissionavel,
            valor_saldo: row.valor_saldo,
            valor_comissao_loja: row.valor_comissao_loja,
            percentual_comissao_loja: row.percentual_comissao_loja,
            faixa_comissao: row.faixa_comissao,
            ranking_vendedor_id: row.ranking_vendedor_id,
            ranking_produto_id: row.ranking_produto_id,
            venda_id: row.venda_id,
            venda_recibo_id: row.venda_recibo_id,
            origem: importFileName ? `arquivo:${importFileName}` : 'arquivo'
          }))
        })
      });
      const data = await parseJson(response, 'Erro ao importar arquivo de conciliação.');
      toast.success(
        `Importação concluída: ${Number(data.importados || 0)} importados, ${Number(data.duplicados || 0)} duplicados.`
      );
      importFiles = undefined;
      importText = '';
      importFileName = '';
      importIgnored = 0;
      importRowsTotal = 0;
      importAutoLinked = 0;
      importLookupMatches = {};
      importLookupSignature = '';
      await Promise.all([loadRegistros(), loadSummary()]);
      activeTab = 'registros';
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar conciliação.');
    } finally {
      importing = false;
    }
  }

  async function handleFileChange() {
    const file = importFiles?.[0];
    if (!file) return;
    importFileName = file.name;
    try {
      const parsed = await parseConciliacaoImportFile(file, importFallbackDate);
      importText = parsed.text;
      if (parsed.movimentoData) {
        importFallbackDate = parsed.movimentoData;
      }
      if (!parsed.linhas.length) {
        toast.error('Arquivo lido, mas nenhuma linha operacional foi identificada.');
      }
    } catch (error: any) {
      importText = '';
      importIgnored = 0;
      importRowsTotal = 0;
      importAutoLinked = 0;
      importLookupMatches = {};
      importLookupSignature = '';
      toast.error(error?.message || 'Não foi possível ler o arquivo selecionado.');
    }
  }

  function onInlineFileChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement | null;
    importFiles = target?.files ?? undefined;
    void handleFileChange();
  }

  async function loadImportLookup(rows: ConciliacaoLinhaInput[]) {
    const docs = rows
      .map((row) => ({
        documento: String(row.documento || '').trim(),
        valor_lancamentos: row.valor_lancamentos ?? null,
        valor_taxas: row.valor_taxas ?? null
      }))
      .filter((row) => row.documento);

    if (docs.length === 0) {
      importLookupMatches = {};
      return;
    }

    importLookupLoading = true;
    try {
      const companyId = String((registros[0] as any)?.company_id || '').trim() || null;
      const response = await fetch('/api/v1/conciliacao/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, documentos: docs })
      });
      const data = await parseJson(response, 'Erro ao buscar vendedores no sistema.');
      importLookupMatches = data?.matches && typeof data.matches === 'object' ? data.matches : {};
    } catch {
      importLookupMatches = {};
    } finally {
      importLookupLoading = false;
    }
  }

  function buildImportPreviewRows(rows: ConciliacaoLinhaInput[], fallbackDate: string): ImportPreviewRow[] {
    return rows.map((row) => {
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

      const documento = String(row.documento || '').trim();
      const lookup = documento ? importLookupMatches[documento] : null;
      const rankingVendedorId = String(row.ranking_vendedor_id || lookup?.vendedor_id || '').trim() || null;
      const vendaId = String((row as any).venda_id || lookup?.venda_id || '').trim() || null;
      const vendaReciboId = String((row as any).venda_recibo_id || lookup?.venda_recibo_id || '').trim() || null;

      return {
        documento,
        movimento_data: row.movimento_data || fallbackDate,
        status: row.status || null,
        descricao: row.descricao || null,
        vendedor_ranking: resolveImportVendedorLabel(rankingVendedorId, row.status),
        meta_dif: row.ranking_produto_id ? 'Sim' : 'Não',
        valor_lancamentos: row.valor_lancamentos ?? null,
        valor_taxas: row.valor_taxas ?? null,
        valor_descontos: row.valor_descontos ?? null,
        valor_abatimentos: row.valor_abatimentos ?? null,
        valor_nao_comissionavel: row.valor_nao_comissionavel ?? null,
        valor_venda_real: metrics.valorVendaReal,
        valor_comissao_loja: metrics.valorComissaoLoja,
        valor_saldo: row.valor_saldo ?? null,
        percentual_comissao_loja: metrics.percentualComissaoLoja,
        faixa_comissao: metrics.faixaComissao,
        ranking_vendedor_id: rankingVendedorId,
        ranking_produto_id: String(row.ranking_produto_id || '').trim() || null,
        venda_id: vendaId,
        venda_recibo_id: vendaReciboId
      };
    });
  }

  function resolveImportVendedorLabel(rankingVendedorId: string | null, status?: string | null) {
    if (rankingVendedorId) {
      const found = vendedores.find((vendedor) => vendedor.id === rankingVendedorId);
      return found?.nome_completo || 'Vendedor atribuído';
    }

    const statusUpper = String(status || '').toUpperCase();
    if (statusUpper === 'ESTORNO' || statusUpper === 'OPFAX') return 'Ignorado';
    return 'Pendente';
  }

  function linhaExigeAtribuicao(row: ImportPreviewRow) {
    return String(row.status || '').toUpperCase() === 'BAIXA';
  }

  function parsePtBrNumberInput(value: string) {
    const raw = String(value || '').trim();
    if (!raw) return 0;
    const cleaned = raw
      .replace(/R\$/gi, '')
      .replace(/\s+/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function updateImportRow(index: number, patch: Partial<ImportPreviewRow>) {
    importPreparedRows = importPreparedRows.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, ...patch };
      const metrics = buildConciliacaoMetrics({
        descricao: next.descricao,
        valorLancamentos: next.valor_lancamentos,
        valorTaxas: next.valor_taxas,
        valorDescontos: next.valor_descontos,
        valorAbatimentos: next.valor_abatimentos,
        valorNaoComissionavel: next.valor_nao_comissionavel,
        valorSaldo: next.valor_saldo,
        valorComissaoLoja: next.valor_comissao_loja,
        percentualComissaoLoja: next.percentual_comissao_loja
      });
      return {
        ...next,
        valor_venda_real: metrics.valorVendaReal,
        valor_comissao_loja: metrics.valorComissaoLoja,
        percentual_comissao_loja: metrics.percentualComissaoLoja,
        faixa_comissao: metrics.faixaComissao,
        vendedor_ranking: resolveImportVendedorLabel(next.ranking_vendedor_id || null, next.status)
      };
    });
  }

  function setImportMoneyField(index: number, field: keyof ImportPreviewRow, value: string) {
    updateImportRow(index, { [field]: parsePtBrNumberInput(value) } as Partial<ImportPreviewRow>);
  }

  function handleImportVendedorChange(index: number, event: Event) {
    const target = event.currentTarget as HTMLSelectElement | null;
    updateImportRow(index, { ranking_vendedor_id: String(target?.value || '') || null });
  }

  function handleImportProdutoChange(index: number, event: Event) {
    const target = event.currentTarget as HTMLSelectElement | null;
    const value = String(target?.value || '').trim();
    updateImportRow(index, { ranking_produto_id: value || null, meta_dif: value ? 'Sim' : 'Não' });
  }

  function handleImportMoneyChange(index: number, field: keyof ImportPreviewRow, event: Event) {
    const target = event.currentTarget as HTMLInputElement | null;
    setImportMoneyField(index, field, String(target?.value || '0'));
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
  title="Conciliação financeira"
  subtitle="Importe arquivo, concilie e audite recibos, ranking e alterações."
  color="financeiro"
  breadcrumbs={[{ label: 'Financeiro', href: '/financeiro' }, { label: 'Conciliação' }]}
/>

<Card color="financeiro" class="mb-4">
  <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
    <button type="button" class="rounded-xl border p-3 text-center transition {activeKpiView === 'visao_geral' ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' : 'border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50/50'}" on:click={() => aplicarKpiView('visao_geral')}>
      <p class="text-xs {activeKpiView === 'visao_geral' ? 'font-semibold text-orange-600' : 'text-slate-500'}">Visão geral</p>
      <p class="text-lg font-semibold {activeKpiView === 'visao_geral' ? 'text-orange-700' : 'text-slate-900'}">{registros.length}</p>
    </button>
    <button type="button" class="rounded-xl border p-3 text-center transition {activeKpiView === 'conciliados' ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' : 'border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50/50'}" on:click={() => aplicarKpiView('conciliados')}>
      <p class="text-xs {activeKpiView === 'conciliados' ? 'font-semibold text-orange-600' : 'text-slate-500'}">Conciliados</p>
      <p class="text-lg font-semibold {activeKpiView === 'conciliados' ? 'text-orange-700' : 'text-slate-900'}">{summary.efetivados}</p>
    </button>
    <button type="button" class="rounded-xl border p-3 text-center transition {activeKpiView === 'pendentes' ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' : 'border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50/50'}" on:click={() => aplicarKpiView('pendentes')}>
      <p class="text-xs {activeKpiView === 'pendentes' ? 'font-semibold text-orange-600' : 'text-slate-500'}">Pendentes conciliação</p>
      <p class="text-lg font-semibold {activeKpiView === 'pendentes' ? 'text-orange-700' : 'text-slate-900'}">{summary.pendentes}</p>
    </button>
    <button type="button" class="rounded-xl border p-3 text-center transition {activeKpiView === 'pendentes_ranking' ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' : 'border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50/50'}" on:click={() => aplicarKpiView('pendentes_ranking')}>
      <p class="text-xs {activeKpiView === 'pendentes_ranking' ? 'font-semibold text-orange-600' : 'text-slate-500'}">Pendentes ranking</p>
      <p class="text-lg font-semibold {activeKpiView === 'pendentes_ranking' ? 'text-orange-700' : 'text-slate-900'}">{summary.semRanking}</p>
    </button>
    <button type="button" class="rounded-xl border p-3 text-center transition {activeKpiView === 'baixa_rac' ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' : 'border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50/50'}" on:click={() => aplicarKpiView('baixa_rac')}>
      <p class="text-xs {activeKpiView === 'baixa_rac' ? 'font-semibold text-orange-600' : 'text-slate-500'}">Baixa RAC</p>
      <p class="text-lg font-semibold {activeKpiView === 'baixa_rac' ? 'text-orange-700' : 'text-slate-900'}">{summary.baixaRac}</p>
    </button>
    <button type="button" class="rounded-xl border p-3 text-center transition {activeKpiView === 'execucoes' ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' : 'border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50/50'}" on:click={() => aplicarKpiView('execucoes')}>
      <p class="text-xs {activeKpiView === 'execucoes' ? 'font-semibold text-orange-600' : 'text-slate-500'}">Execuções</p>
      <p class="text-lg font-semibold {activeKpiView === 'execucoes' ? 'text-orange-700' : 'text-slate-900'}">{executions.length}</p>
    </button>
  </div>
  <div class="mt-3 flex flex-wrap gap-2">
    <Button variant="secondary" on:click={abrirImportacao}>
      <Upload size={16} class="mr-2" />
      Importar
    </Button>
    <Button variant="secondary" on:click={exportRows}>
      <Download size={16} class="mr-2" />
      Exportar
    </Button>
    <Button color="financeiro" on:click={() => runAutoConciliacao()} disabled={running} loading={running}>
      <Bot size={16} class="mr-2" />Conciliar pendentes
    </Button>
    <Button variant="secondary" on:click={loadAll} disabled={loading} loading={loading}>
      <RefreshCcw size={16} class="mr-2" />
      Atualizar
    </Button>
  </div>
</Card>


{#if activeTab === 'importacao'}
  <Card title="Importar arquivo da conciliação" color="financeiro" class="mb-6">
    <div class="space-y-3">
      <FileDropzone
        accept=".txt,.xls,.xlsx"
        icon={FileText}
        title="Clique para escolher o arquivo"
        bind:files={importFiles}
        on:change={() => void handleFileChange()}
      />
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs text-slate-500">Linhas reconhecidas</p><p class="text-base font-semibold">{importRowsTotal}</p></div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs text-slate-500">Importáveis</p><p class="text-base font-semibold">{importPreparedRows.length}</p></div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs text-slate-500">Ignoradas</p><p class="text-base font-semibold">{importIgnored}</p></div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs text-slate-500">Atribuídas auto</p><p class="text-base font-semibold">{importAutoLinked}</p></div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs text-slate-500">Arquivo</p><p class="text-sm font-semibold">{importFileName || '-'}</p></div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs text-slate-500">Data movimento</p><p class="text-sm font-semibold">{formatDate(importFallbackDate)}</p></div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs text-slate-500">Pendentes atribuição</p><p class="text-base font-semibold">{importPreparedRows.filter((row) => exigeRanking(row.status) && !row.ranking_vendedor_id).length}</p></div>
      </div>

      {#if importLookupLoading}
        <div class="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Buscando vendedores automaticamente nas vendas registradas...
        </div>
      {/if}

      <FieldTextarea id="conciliacao-paste" label="Conteúdo do extrato (opcional)" bind:value={importText} rows={5} class_name="w-full" />

      {#if importPreparedRows.length === 0}
        <div class="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
          Selecione um arquivo para carregar o preview de importação.
        </div>
      {:else}
        <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table class="table-mobile-cards min-w-[2100px] w-full text-sm">
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th class="px-3 py-2 text-center">Data</th>
                <th class="px-3 py-2 text-center">Documento</th>
                <th class="px-3 py-2 text-center">Status</th>
                <th class="px-3 py-2 text-center">Descrição</th>
                <th class="px-3 py-2 text-center">Vendedor ranking</th>
                <th class="px-3 py-2 text-center">Meta dif.</th>
                <th class="px-3 py-2 text-right">Lançamentos</th>
                <th class="px-3 py-2 text-right">Taxas</th>
                <th class="px-3 py-2 text-right">Descontos</th>
                <th class="px-3 py-2 text-right">Abatimentos</th>
                <th class="px-3 py-2 text-right">Não comissionável</th>
                <th class="px-3 py-2 text-right">Venda real</th>
                <th class="px-3 py-2 text-right">Comissão loja</th>
                <th class="px-3 py-2 text-right">% loja</th>
              </tr>
            </thead>
            <tbody>
              {#each importPreparedRows as row, index}
                <tr class="border-t border-slate-100">
                  <td class="px-3 py-2">{formatDate(row.movimento_data)}</td>
                  <td class="px-3 py-2">{row.documento}</td>
                  <td class="px-3 py-2">{statusImportLabel(row.status)}</td>
                  <td class="px-3 py-2">{row.descricao || '-'}</td>
                  <td class="px-3 py-2">
                    {#if exigeRanking(row.status)}
                      <select class="vtur-input w-[210px] text-sm" value={row.ranking_vendedor_id || ''} on:change={(event) => handleImportVendedorChange(index, event)}>
                        <option value="">Selecione...</option>
                        {#each vendedores as vendedor}
                          <option value={vendedor.id}>{vendedor.nome_completo}</option>
                        {/each}
                      </select>
                    {:else}
                      <span class="text-slate-500">Ignorado</span>
                    {/if}
                  </td>
                  <td class="px-3 py-2">
                    {#if exigeRanking(row.status) && produtosMeta.length > 0}
                      <select class="vtur-input w-[170px] text-sm" value={row.ranking_produto_id || ''} on:change={(event) => handleImportProdutoChange(index, event)}>
                        <option value="">Não</option>
                        {#each produtosMeta as produto}
                          <option value={produto.id}>{produto.nome}</option>
                        {/each}
                      </select>
                    {:else}
                      <span>{row.meta_dif || '-'}</span>
                    {/if}
                  </td>
                  <td class="px-3 py-2"><input class="vtur-input w-[130px] text-right text-sm" value={String(row.valor_lancamentos ?? 0).replace('.', ',')} on:change={(event) => handleImportMoneyChange(index, 'valor_lancamentos', event)} /></td>
                  <td class="px-3 py-2"><input class="vtur-input w-[130px] text-right text-sm" value={String(row.valor_taxas ?? 0).replace('.', ',')} on:change={(event) => handleImportMoneyChange(index, 'valor_taxas', event)} /></td>
                  <td class="px-3 py-2"><input class="vtur-input w-[130px] text-right text-sm" value={String(row.valor_descontos ?? 0).replace('.', ',')} on:change={(event) => handleImportMoneyChange(index, 'valor_descontos', event)} /></td>
                  <td class="px-3 py-2"><input class="vtur-input w-[130px] text-right text-sm" value={String(row.valor_abatimentos ?? 0).replace('.', ',')} on:change={(event) => handleImportMoneyChange(index, 'valor_abatimentos', event)} /></td>
                  <td class="px-3 py-2"><input class="vtur-input w-[150px] text-right text-sm" value={String(row.valor_nao_comissionavel ?? 0).replace('.', ',')} on:change={(event) => handleImportMoneyChange(index, 'valor_nao_comissionavel', event)} /></td>
                  <td class="px-3 py-2 text-right">{formatMoney(row.valor_venda_real)}</td>
                  <td class="px-3 py-2"><input class="vtur-input w-[130px] text-right text-sm" value={String(row.valor_comissao_loja ?? 0).replace('.', ',')} on:change={(event) => handleImportMoneyChange(index, 'valor_comissao_loja', event)} /></td>
                  <td class="px-3 py-2 text-right">{formatPercent(row.percentual_comissao_loja)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <div class="flex flex-wrap gap-2">
        <Button color="financeiro" on:click={importPreviewRows} disabled={importPreparedRows.length === 0} loading={importing}><Upload size={16} class="mr-2" />Importar</Button>
        <Button variant="secondary" on:click={() => { importFiles = undefined; importText = ''; importFileName = ''; importIgnored = 0; importRowsTotal = 0; importAutoLinked = 0; importLookupMatches = {}; importLookupSignature = ''; }}>Limpar</Button>
      </div>
    </div>
  </Card>
{:else if activeTab === 'visao_geral'}
  <Card title="Visão geral" color="financeiro" class="mb-6">
    <div class="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-8">
      <FieldInput id="vg-documento" label="Recibo" type="text" bind:value={vgFiltroDocumento} placeholder="Buscar..." class_name="w-full" />
      <FieldSelect id="vg-status" label="Status" bind:value={vgFiltroStatus} options={vgStatusSelectOptions} class_name="w-full" />
      <FieldSelect id="vg-vendedor" label="Vendedor ranking" bind:value={vgFiltroVendedor} options={vgVendedorSelectOptions} class_name="w-full" />
      <FieldSelect id="vg-mes" label="Mês" bind:value={vgFiltroMes} options={vgMesSelectOptions} class_name="w-full" />
      <FieldSelect id="vg-dia" label="Dia" bind:value={vgFiltroDia} options={vgDiaSelectOptions} class_name="w-full" />
      <FieldSelect id="vg-recibo-encontrado" label="Recibo encontrado" bind:value={vgFiltroReciboEncontrado} options={[{ value: 'all', label: 'Todos' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} class_name="w-full" />
      <FieldSelect id="vg-ranking" label="Ranking" bind:value={vgFiltroRanking} options={[{ value: 'all', label: 'Todos' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} class_name="w-full" />
      <FieldSelect id="vg-conciliado" label="Conciliado" bind:value={vgFiltroConciliado} options={[{ value: 'all', label: 'Todos' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} class_name="w-full" />
    </div>

    <div class="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <span><strong>{visaoGeralFiltrados.length}</strong> de <strong>{visaoGeralRows.length}</strong> registro(s)</span>
      <Button
        variant="secondary"
        size="xs"
        on:click={() => {
          vgFiltroDocumento = '';
          vgFiltroVendedor = 'all';
          vgFiltroStatus = 'all';
          vgFiltroMes = 'all';
          vgFiltroDia = 'all';
          vgFiltroReciboEncontrado = 'all';
          vgFiltroRanking = 'all';
          vgFiltroConciliado = 'all';
        }}
      >
        Limpar
      </Button>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table class="table-mobile-cards min-w-[2050px] w-full text-sm">
        <thead class="bg-slate-50 text-slate-700">
          <tr>
            <th class="px-3 py-2 text-center">Data</th>
            <th class="px-3 py-2 text-center">Documento</th>
            <th class="px-3 py-2 text-center">Status</th>
            <th class="px-3 py-2 text-center">Recibo encontrado</th>
            <th class="px-3 py-2 text-center">Vendedor ranking</th>
            <th class="px-3 py-2 text-center">Ranking</th>
            <th class="px-3 py-2 text-center">Meta dif.</th>
            <th class="px-3 py-2 text-right">Lançamentos</th>
            <th class="px-3 py-2 text-right">Taxas (arq)</th>
            <th class="px-3 py-2 text-right">Descontos</th>
            <th class="px-3 py-2 text-right">Abatimentos</th>
            <th class="px-3 py-2 text-right">Não comissionável</th>
            <th class="px-3 py-2 text-right">Venda real</th>
            <th class="px-3 py-2 text-right">Comissão loja</th>
            <th class="px-3 py-2 text-right">% loja</th>
            <th class="px-3 py-2 text-right">Total (sist)</th>
            <th class="px-3 py-2 text-right">Taxas (sist)</th>
            <th class="px-3 py-2 text-right">Diff total</th>
            <th class="px-3 py-2 text-right">Diff taxas</th>
            <th class="px-3 py-2 text-center">Conciliado</th>
          </tr>
        </thead>
        <tbody>
          {#each visaoGeralFiltrados as row}
            <tr class="cursor-pointer border-t border-slate-100 hover:bg-slate-50" on:click={() => openDetails(row)}>
              <td class="px-3 py-2">{formatDate(row.movimento_data)}</td>
              <td class="px-3 py-2">{row.documento}</td>
              <td class="px-3 py-2">{statusImportLabel(row.status)}</td>
              <td class="px-3 py-2">{row.venda_recibo_id ? 'Sim' : 'Não'}</td>
              <td class="px-3 py-2">{row.ranking_vendedor?.nome_completo || 'Não atribuído'}</td>
              <td class="px-3 py-2">{exigeRanking(row.status) ? (row.ranking_vendedor_id ? 'OK' : 'Pendente') : '-'}</td>
              <td class="px-3 py-2">{row.ranking_produto?.nome || '-'}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_lancamentos)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_taxas)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_descontos)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_abatimentos)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_nao_comissionavel)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_venda_real)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_comissao_loja)}</td>
              <td class="px-3 py-2 text-right">{formatPercent(row.percentual_comissao_loja)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.sistema_valor_total)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.sistema_valor_taxas)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.diff_total)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.diff_taxas)}</td>
              <td class="px-3 py-2">{row.conciliado ? 'Sim' : 'Não'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
{:else if activeTab === 'registros'}
  <Card title="Registros" color="financeiro" class="mb-6">
    <div class="mb-3 text-sm text-slate-600">{filteredRecords.length} registro(s) no recorte atual.</div>
    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table class="table-mobile-cards min-w-[2050px] w-full text-sm">
        <thead class="bg-slate-50 text-slate-700">
          <tr>
            <th class="px-3 py-2 text-center">Data</th>
            <th class="px-3 py-2 text-center">Documento</th>
            <th class="px-3 py-2 text-center">Status</th>
            <th class="px-3 py-2 text-center">Recibo encontrado</th>
            <th class="px-3 py-2 text-center">Vendedor ranking</th>
            <th class="px-3 py-2 text-center">Ranking</th>
            <th class="px-3 py-2 text-center">Meta dif.</th>
            <th class="px-3 py-2 text-right">Lançamentos</th>
            <th class="px-3 py-2 text-right">Taxas (arq)</th>
            <th class="px-3 py-2 text-right">Descontos</th>
            <th class="px-3 py-2 text-right">Abatimentos</th>
            <th class="px-3 py-2 text-right">Não comissionável</th>
            <th class="px-3 py-2 text-right">Venda real</th>
            <th class="px-3 py-2 text-right">Comissão loja</th>
            <th class="px-3 py-2 text-right">% loja</th>
            <th class="px-3 py-2 text-right">Total (sist)</th>
            <th class="px-3 py-2 text-right">Taxas (sist)</th>
            <th class="px-3 py-2 text-right">Diff total</th>
            <th class="px-3 py-2 text-right">Diff taxas</th>
            <th class="px-3 py-2 text-center">Conciliado</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredRecords as row}
            <tr class="cursor-pointer border-t border-slate-100 hover:bg-slate-50" on:click={() => openDetails(row)}>
              <td class="px-3 py-2">{formatDate(row.movimento_data)}</td>
              <td class="px-3 py-2">{row.documento}</td>
              <td class="px-3 py-2">{statusImportLabel(row.status)}</td>
              <td class="px-3 py-2">{row.venda_recibo_id ? 'Sim' : 'Não'}</td>
              <td class="px-3 py-2">{row.ranking_vendedor?.nome_completo || 'Não atribuído'}</td>
              <td class="px-3 py-2">{exigeRanking(row.status) ? (row.ranking_vendedor_id ? 'OK' : 'Pendente') : '-'}</td>
              <td class="px-3 py-2">{row.ranking_produto?.nome || '-'}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_lancamentos)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_taxas)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_descontos)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_abatimentos)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_nao_comissionavel)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_venda_real)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.valor_comissao_loja)}</td>
              <td class="px-3 py-2 text-right">{formatPercent(row.percentual_comissao_loja)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.sistema_valor_total)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.sistema_valor_taxas)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.diff_total)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(row.diff_taxas)}</td>
              <td class="px-3 py-2">{row.conciliado ? 'Sim' : 'Não'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
{:else if activeTab === 'alteracoes'}
  <Card title="Histórico de alterações" color="financeiro" class="mb-6">
    <div class="mb-3 flex flex-wrap gap-2">
      <Button variant="secondary" on:click={loadChanges}><RefreshCcw size={16} class="mr-2" />Atualizar lista</Button>
      <Button variant="secondary" on:click={revertPendingChanges} disabled={alteracoesPendentes.length === 0} loading={reverting}>
        <RefreshCcw size={16} class="mr-2" />Reverter pendentes
      </Button>
    </div>
    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table class="table-mobile-cards min-w-[980px] w-full text-sm">
        <thead class="bg-slate-50 text-slate-700">
          <tr>
            <th class="px-3 py-2 text-center">Quando</th>
            <th class="px-3 py-2 text-center">Recibo</th>
            <th class="px-3 py-2 text-center">Campo</th>
            <th class="px-3 py-2 text-right">Taxa (antes)</th>
            <th class="px-3 py-2 text-right">Taxa (novo)</th>
            <th class="px-3 py-2 text-center">Origem</th>
            <th class="px-3 py-2 text-center">Por</th>
            <th class="px-3 py-2 text-center">Revertido</th>
          </tr>
        </thead>
        <tbody>
          {#each changes as item}
            <tr class="border-t border-slate-100">
              <td class="px-3 py-2">{formatDateTime(item.changed_at)}</td>
              <td class="px-3 py-2">{item.numero_recibo || '-'}</td>
              <td class="px-3 py-2">{item.field}</td>
              <td class="px-3 py-2 text-right">{formatMoney(item.old_value)}</td>
              <td class="px-3 py-2 text-right">{formatMoney(item.new_value)}</td>
              <td class="px-3 py-2">{item.actor === 'user' ? 'manual' : 'cron'}</td>
              <td class="px-3 py-2">{item.changed_by_user?.nome_completo || item.changed_by_user?.email || '-'}</td>
              <td class="px-3 py-2">{item.reverted_at ? formatDateTime(item.reverted_at) : 'Pendente'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
{:else if activeTab === 'execucoes'}
  <Card title="Execuções" color="financeiro" class="mb-6">
    <div class="mb-3 flex flex-wrap gap-2">
      <Button variant="secondary" on:click={loadExecutions}>
        <RefreshCcw size={16} class="mr-2" />
        Atualizar execuções
      </Button>
    </div>
    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table class="table-mobile-cards min-w-[980px] w-full text-sm">
        <thead class="bg-slate-50 text-slate-700">
          <tr>
            <th class="px-3 py-2 text-center">Quando</th>
            <th class="px-3 py-2 text-center">Origem</th>
            <th class="px-3 py-2 text-right">Checados</th>
            <th class="px-3 py-2 text-right">Conciliados</th>
            <th class="px-3 py-2 text-right">Taxas atualizadas</th>
            <th class="px-3 py-2 text-right">Pendentes após execução</th>
            <th class="px-3 py-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each executions as item}
            <tr class="border-t border-slate-100">
              <td class="px-3 py-2">{formatDateTime(item.created_at)}</td>
              <td class="px-3 py-2">{item.actor === 'user' ? 'manual' : 'cron'}</td>
              <td class="px-3 py-2 text-right">{item.checked}</td>
              <td class="px-3 py-2 text-right">{item.reconciled}</td>
              <td class="px-3 py-2 text-right">{item.updated_taxes}</td>
              <td class="px-3 py-2 text-right">{item.still_pending}</td>
              <td class="px-3 py-2">{item.status}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
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
        <FieldSelect
          id="conciliacao-vendedor"
          label="Vendedor de ranking"
          bind:value={rankingVendedorId}
          options={vendedorOptions}
          class_name="w-full"
        />
        <FieldSelect
          id="conciliacao-produto"
          label="Produto para meta"
          bind:value={rankingProdutoId}
          options={produtoOptions}
          class_name="w-full"
        />
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <FieldCheckbox label="Marcar como conciliado" bind:checked={marcadoConciliado} color="financeiro" class_name="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3" />
        <FieldCheckbox label="Marcar como Baixa RAC" bind:checked={isBaixaRac} color="financeiro" class_name="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3" />
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
