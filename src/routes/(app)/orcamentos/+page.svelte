<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import { Plus, FileText, Send, ShoppingCart, AlertCircle } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface Orcamento {
    id: string;
    codigo: string;
    cliente: string;
    cliente_id: string;
    destino: string;
    data_criacao: string | null;
    data_validade: string | null;
    valor_total: number;
    status: 'pendente' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado' | 'novo' | 'fechado';
    status_negociacao: string | null;
    vendedor: string;
    vendedor_id: string;
    origem: 'manual' | 'site' | 'indicacao';
    quantidade_itens: number;
    last_interaction_at?: string | null;
    last_interaction_notes?: string | null;
  }

  let orcamentosFiltrados: Orcamento[] = [];
  let loading = true;
  let errorMessage: string | null = null;

  let filtroStatus = '';
  let filtroPeriodo = '';
  let filtroBusca = '';
  let somenteCriticos = false;
  let somenteProntosVenda = false;

  let abortController: AbortController | null = null;
  let buscaDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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

  function isExpirando(item: Orcamento) {
    if (!item.data_validade) return false;
    if (['fechado', 'rejeitado', 'expirado'].includes(item.status)) return false;
    const dias = getDiasParaValidade(item.data_validade);
    return dias >= 0 && dias <= 3;
  }

  function isCritico(item: Orcamento) {
    if (['fechado', 'rejeitado', 'expirado'].includes(item.status)) return false;
    if (!item.last_interaction_at) return true;
    if (getDiasSemInteracao(item.last_interaction_at) >= 7) return true;
    return isExpirando(item);
  }

  function isProntoParaVenda(item: Orcamento) {
    return item.status === 'aprovado';
  }

  function getPrioridadeFollowUp(item: Orcamento) {
    if (item.status === 'fechado') return 99;
    if (!item.last_interaction_at) return 0;
    const dias = getDiasSemInteracao(item.last_interaction_at);
    if (dias >= 7) return 1;
    if (dias >= 3) return 2;
    return 3;
  }

  function sortOrcamentosPorPrioridade(items: Orcamento[]) {
    return [...items].sort((left, right) => {
      const prioridade = getPrioridadeFollowUp(left) - getPrioridadeFollowUp(right);
      if (prioridade !== 0) return prioridade;

      const expiraDiff = getDiasParaValidade(left.data_validade) - getDiasParaValidade(right.data_validade);
      if (Number.isFinite(expiraDiff) && expiraDiff !== 0) return expiraDiff;

      const diasDiff = getDiasSemInteracao(right.last_interaction_at) - getDiasSemInteracao(left.last_interaction_at);
      if (diasDiff !== 0) return diasDiff;

      const dataCriacaoLeft = left.data_criacao ? new Date(left.data_criacao).getTime() : 0;
      const dataCriacaoRight = right.data_criacao ? new Date(right.data_criacao).getTime() : 0;
      return dataCriacaoRight - dataCriacaoLeft;
    });
  }

  $: criticosCount = orcamentosFiltrados.filter((o) => isCritico(o)).length;
  $: prontosVendaCount = orcamentosFiltrados.filter((o) => isProntoParaVenda(o)).length;
  $: orcamentosVisiveis = orcamentosFiltrados.filter((o) => {
    if (somenteCriticos && !isCritico(o)) return false;
    if (somenteProntosVenda && !isProntoParaVenda(o)) return false;
    return true;
  });

  $: resumo = {
    total:         orcamentosFiltrados.length,
    novos:         orcamentosFiltrados.filter(o => o.status === 'novo').length,
    pendentes:     orcamentosFiltrados.filter(o => o.status === 'pendente').length,
    enviados:      orcamentosFiltrados.filter(o => o.status === 'enviado').length,
    aprovados:     orcamentosFiltrados.filter(o => o.status === 'aprovado').length,
    convertidos:   orcamentosFiltrados.filter(o => o.status === 'fechado').length,
    semInteracao:  orcamentosFiltrados.filter(o => !o.last_interaction_at && o.status !== 'fechado').length,
    followupAtrasado: orcamentosFiltrados.filter(o => o.last_interaction_at && getDiasSemInteracao(o.last_interaction_at) >= 7 && o.status !== 'fechado').length,
    expirando:     orcamentosFiltrados.filter(o => isExpirando(o)).length,
    valorTotal:    orcamentosFiltrados.reduce((s, o) => s + o.valor_total, 0),
    valorAprovado: orcamentosFiltrados
                     .filter(o => o.status === 'aprovado')
                     .reduce((s, o) => s + o.valor_total, 0),
    valorConvertido: orcamentosFiltrados
                     .filter(o => o.status === 'fechado')
                     .reduce((s, o) => s + o.valor_total, 0),
    get taxaConversao() {
      return this.total > 0
        ? (((this.aprovados + this.convertidos) / this.total) * 100).toFixed(1)
        : '0';
    }
  };

  async function loadOrcamentos() {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    loading = true;
    errorMessage = null;

    try {
      const params = new URLSearchParams();
      if (filtroStatus)  params.set('status',  filtroStatus);
      if (filtroPeriodo) params.set('periodo', filtroPeriodo);
      if (filtroBusca.trim()) params.set('q', filtroBusca.trim());

      const response = await fetch(
        `/api/v1/orcamentos/list?${params.toString()}`,
        { signal: abortController.signal }
      );

      if (!response.ok) throw new Error(await response.text());

      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : [];
      orcamentosFiltrados = sortOrcamentosPorPrioridade(items);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Erro ao carregar orçamentos.';
      errorMessage = msg;
      orcamentosFiltrados = [];
      toast.error(msg);
    } finally {
      loading = false;
    }
  }

  function handleFiltroChange(key: string, value: string) {
    if (key === 'status')  filtroStatus  = value;
    if (key === 'periodo') filtroPeriodo = value;
    void loadOrcamentos();
  }

  function handleBuscaChange(valor: string) {
    filtroBusca = valor;
    if (buscaDebounceTimer) clearTimeout(buscaDebounceTimer);
    buscaDebounceTimer = setTimeout(() => void loadOrcamentos(), 300);
  }

  onMount(() => void loadOrcamentos());

  onDestroy(() => {
    abortController?.abort();
    if (buscaDebounceTimer) clearTimeout(buscaDebounceTimer);
  });

  function handleRowClick(row: Orcamento) {
    goto(`/orcamentos/${row.id}`);
  }

  function handleExport() {
    if (orcamentosVisiveis.length === 0) {
      toast.info('Não há orçamentos para exportar');
      return;
    }

    const headers = ['Código', 'Cliente', 'Destino', 'Criação', 'Validade', 'Valor', 'Status', 'Última interação', 'Responsável'];
    const rows = orcamentosVisiveis.map(o => [
      o.codigo,
      o.cliente,
      o.destino,
      o.data_criacao ? new Date(o.data_criacao).toLocaleDateString('pt-BR') : '',
      o.data_validade ? new Date(o.data_validade).toLocaleDateString('pt-BR') : '',
      o.valor_total.toFixed(2).replace('.', ','),
      o.status,
      o.last_interaction_at ? new Date(o.last_interaction_at).toLocaleDateString('pt-BR') : '',
      o.vendedor
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orcamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Orçamentos exportados com sucesso!');
  }

  const columns = [
    { key: 'codigo', label: 'Código', sortable: true, width: '120px' },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: true,
      formatter: (value: string, row: Orcamento) =>
        `<div class="flex flex-col">
          <span class="font-medium text-slate-900">${value}</span>
          <span class="text-xs text-slate-500">${row.destino || 'Sem destino'}</span>
        </div>`
    },
    {
      key: 'data_criacao',
      label: 'Criação',
      sortable: true,
      width: '110px',
      formatter: (value: string | null) =>
        value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'last_interaction_at',
      label: 'Última interação',
      sortable: true,
      width: '180px',
      formatter: (value: string | null, row: Orcamento) => {
        if (!value) return '<span class="text-red-600 font-medium">Sem interação</span>';
        const data = new Date(value);
        const diff = getDiasSemInteracao(value);
        const classe = diff >= 7 ? 'text-amber-700 font-medium' : 'text-slate-700';
        const nota = row.last_interaction_notes ? `<div class="text-xs text-slate-500">${row.last_interaction_notes}</div>` : '';
        const atraso = diff >= 7 ? `<div class="text-xs text-amber-700">${diff} dias sem contato</div>` : '';
        return `<div><div class="${classe}">${data.toLocaleDateString('pt-BR')}</div>${atraso}${nota}</div>`;
      }
    },
    {
      key: 'data_validade',
      label: 'Validade',
      sortable: true,
      width: '130px',
      formatter: (value: string | null) => {
        if (!value) return '-';
        const data = new Date(value);
        const diff = getDiasParaValidade(value);
        const classe =
          diff < 0  ? 'text-red-600 font-medium' :
          diff <= 3 ? 'text-amber-600 font-medium' : '';
        const alerta = diff < 0
          ? '<div class="text-xs text-red-600">Expirado</div>'
          : diff <= 3
            ? `<div class="text-xs text-amber-600">Vence em ${diff}d</div>`
            : '';
        return `<div><div class="${classe}">${data.toLocaleDateString('pt-BR')}</div>${alerta}</div>`;
      }
    },
    {
      key: 'valor_total',
      label: 'Valor',
      sortable: true,
      align: 'right' as const,
      width: '130px',
      formatter: (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '160px',
      formatter: (value: string) => {
        const styles: Record<string, string> = {
          pendente: 'bg-amber-100 text-amber-700',
          enviado:  'bg-blue-100 text-blue-700',
          aprovado: 'bg-green-100 text-green-700',
          rejeitado:'bg-red-100 text-red-700',
          expirado: 'bg-slate-100 text-slate-600',
          novo:     'bg-slate-100 text-slate-700',
          fechado:  'bg-emerald-100 text-emerald-700'
        };
        const labels: Record<string, string> = {
          pendente: 'Pendente', enviado: 'Enviado', aprovado: 'Aprovado',
          rejeitado: 'Rejeitado', expirado: 'Expirado', novo: 'Novo',
          fechado: 'Convertido em Venda'
        };
        const cl = styles[value] || 'bg-slate-100 text-slate-700';
        const lb = labels[value] || value;
        return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cl}">${lb}</span>`;
      }
    },
    { key: 'vendedor', label: 'Responsável', sortable: true, width: '150px' }
  ];

  const filters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: '', label: 'Todos' },
        { value: 'novo',      label: 'Novo' },
        { value: 'pendente',  label: 'Pendente' },
        { value: 'enviado',   label: 'Enviado' },
        { value: 'aprovado',  label: 'Aprovado' },
        { value: 'fechado',   label: 'Convertido em Venda' },
        { value: 'rejeitado', label: 'Rejeitado' },
        { value: 'expirado',  label: 'Expirado' }
      ]
    },
    {
      key: 'periodo',
      label: 'Período',
      type: 'select' as const,
      options: [
        { value: '',            label: 'Todos' },
        { value: 'hoje',        label: 'Hoje' },
        { value: 'semana',      label: 'Esta semana' },
        { value: 'mes',         label: 'Este mês' },
        { value: 'mes_passado', label: 'Mês passado' }
      ]
    }
  ];
</script>

<svelte:head>
  <title>Orçamentos | VTUR</title>
</svelte:head>

<PageHeader
  title="Orçamentos"
  subtitle="Acompanhe o pipeline de propostas com uma leitura mais limpa, profissional e orientada à decisão."
  color="orcamentos"
  breadcrumbs={[{ label: 'Orçamentos' }]}
  actions={[{
    label: 'Novo Orçamento',
    href: '/orcamentos/novo',
    variant: 'primary',
    icon: Plus
  }]}
/>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
  <div>
    <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p>
    <p class="text-sm text-slate-500">Resumo do pipeline com foco em follow-up, vencimento e conversão em venda.</p>
  </div>
</div>

{#if errorMessage}
  <div class="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {errorMessage}
  </div>
{/if}

<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><FileText size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total</p>
      <p class="text-2xl font-bold text-slate-900">{resumo.total}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-sky-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500"><Send size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Enviados</p>
      <p class="text-2xl font-bold text-slate-900">{resumo.enviados}</p>
      <p class="mt-0.5 text-xs text-slate-400">Aguardando cliente</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><AlertCircle size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Sem interação</p>
      <p class="text-2xl font-bold text-slate-900">{resumo.semInteracao}</p>
      <p class="mt-0.5 text-xs text-slate-400">Prioridade máxima</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><ShoppingCart size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Convertidos</p>
      <p class="text-2xl font-bold text-slate-900">{resumo.convertidos}</p>
      <p class="mt-0.5 text-xs text-slate-400">{resumo.taxaConversao}% conversão</p>
    </div>
  </div>
</div>

<div class="mb-4 flex flex-wrap items-center gap-3">
  <button
    type="button"
    class={`rounded-full border px-4 py-2 text-sm font-medium ${somenteCriticos ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-700'}`}
    on:click={() => {
      somenteCriticos = !somenteCriticos;
      if (somenteCriticos) somenteProntosVenda = false;
    }}
  >
    {#if somenteCriticos}
      Mostrando críticos ({criticosCount})
    {:else}
      Ver apenas críticos ({criticosCount})
    {/if}
  </button>

  <button
    type="button"
    class={`rounded-full border px-4 py-2 text-sm font-medium ${somenteProntosVenda ? 'border-green-300 bg-green-50 text-green-800' : 'border-slate-200 bg-white text-slate-700'}`}
    on:click={() => {
      somenteProntosVenda = !somenteProntosVenda;
      if (somenteProntosVenda) somenteCriticos = false;
    }}
  >
    {#if somenteProntosVenda}
      Mostrando prontos para venda ({prontosVendaCount})
    {:else}
      Ver prontos para venda ({prontosVendaCount})
    {/if}
  </button>

  {#if somenteCriticos || somenteProntosVenda}
    <button
      type="button"
      class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
      on:click={() => {
        somenteCriticos = false;
        somenteProntosVenda = false;
      }}
    >
      Limpar filtro rápido
    </button>
  {/if}
</div>

<div class="mb-6 rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">
  A lista prioriza automaticamente orçamentos <strong>sem interação</strong>, depois follow-ups mais antigos, aproxima vencimentos no topo da fila e deixa os <strong>convertidos</strong> no fim da operação.
</div>

<DataTable
  {columns}
  data={orcamentosVisiveis}
  color="orcamentos"
  {loading}
  title="Lista de Orçamentos"
  {filters}
  searchable={true}
  filterable={true}
  exportable={true}
  onRowClick={handleRowClick}
  onExport={handleExport}
  onSearch={handleBuscaChange}
  onFilterChange={handleFiltroChange}
  emptyMessage="Nenhum orçamento encontrado para o escopo atual"
/>
