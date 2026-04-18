<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { Plus, FileText, Clock, CheckCircle, Send, TrendingUp, ShoppingCart } from 'lucide-svelte';
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
    if (orcamentosFiltrados.length === 0) {
      toast.info('Não há orçamentos para exportar');
      return;
    }

    const headers = ['Código', 'Cliente', 'Destino', 'Criação', 'Validade', 'Valor', 'Status', 'Última interação', 'Responsável'];
    const rows = orcamentosFiltrados.map(o => [
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

{#if errorMessage}
  <div class="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {errorMessage}
  </div>
{/if}

<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-9">
  <KPICard title="Total" value={resumo.total} color="orcamentos" icon={FileText} />
  <KPICard title="Novos" value={resumo.novos} color="orcamentos" icon={FileText} subtitle="Aguardando ação" />
  <KPICard title="Pendentes" value={resumo.pendentes} color="orcamentos" icon={Clock} subtitle="Em negociação" />
  <KPICard title="Enviados" value={resumo.enviados} color="orcamentos" icon={Send} subtitle="Aguardando cliente" />
  <KPICard title="Aprovados" value={resumo.aprovados} color="orcamentos" icon={CheckCircle} subtitle="Prontos para virar venda" />
  <KPICard title="Convertidos" value={resumo.convertidos} color="orcamentos" icon={ShoppingCart} subtitle={`${resumo.taxaConversao}% conversão`} />
  <KPICard title="Sem interação" value={resumo.semInteracao} color="orcamentos" icon={Clock} subtitle="Prioridade máxima" />
  <KPICard title="Atrasados" value={resumo.followupAtrasado} color="orcamentos" icon={Clock} subtitle="7+ dias sem contato" />
  <KPICard title="Expirando" value={resumo.expirando} color="orcamentos" icon={Clock} subtitle="Vencem em até 3 dias" />
</div>

<div class="mb-6 rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">
  A lista prioriza automaticamente orçamentos <strong>sem interação</strong>, depois follow-ups mais antigos, aproxima vencimentos no topo da fila e deixa os <strong>convertidos</strong> no fim da operação.
</div>

<DataTable
  {columns}
  data={orcamentosFiltrados}
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
