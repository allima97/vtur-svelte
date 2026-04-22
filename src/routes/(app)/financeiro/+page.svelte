<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import KPIGrid from '$lib/components/kpis/KPIGrid.svelte';
  import { toast } from '$lib/stores/ui';
  import {
    DollarSign, CheckCircle, AlertCircle, Clock,
    TrendingUp, ArrowRight, CreditCard,
    Settings, TrendingDown, Loader2
  } from 'lucide-svelte';

  interface ConciliacaoSummary {
    total: number;
    efetivados: number;
    pendentes: number;
    semRanking: number;
    baixaRac: number;
    totalValor: number;
    timeline: Array<{ date: string; value: number }>;
  }

  interface ConciliacaoItem {
    id: string;
    documento?: string;
    descricao?: string;
    movimento_data?: string;
    status?: string;
    status_display?: string;
    valor_lancamentos?: number;
    valor_calculada_loja?: number;
    conciliado?: boolean;
  }

  interface ComissaoItem {
    id: string;
    cliente?: string;
    vendedor?: string;
    valor_comissao?: number;
    status?: 'pago' | 'pendente' | string;
    data_venda?: string;
    numero_venda?: string;
  }

  interface Movimento {
    id: string;
    data: string;
    descricao: string;
    detalhe: string;
    tipo: 'Receita' | 'Despesa';
    valor: number;
    status: string;
  }

  let loading = true;
  let summary: ConciliacaoSummary = {
    total: 0,
    efetivados: 0,
    pendentes: 0,
    semRanking: 0,
    baixaRac: 0,
    totalValor: 0,
    timeline: []
  };
  let conciliacoesRecentes: ConciliacaoItem[] = [];
  let comissoes: ComissaoItem[] = [];

  let resumo = {
    totalReceber: 0,
    totalPagar: 0,
    comissoesPendentes: 0,
    conciliacoesPendentes: 0,
    semRanking: 0,
    baixaRac: 0,
    backlogFinanceiro: 0
  };

  let modulos = [
    {
      titulo: 'Caixa',
      descricao: 'Dashboard de fluxo de caixa e movimentações',
      icone: TrendingUp,
      cor: 'financeiro',
      rota: '/financeiro/caixa',
      stats: 'Ver resumo'
    },
    {
      titulo: 'Conciliação',
      descricao: 'Concilie baixas recebidas com vendas',
      icone: CheckCircle,
      cor: 'financeiro',
      rota: '/financeiro/conciliacao',
      stats: '0 pendentes'
    },
    {
      titulo: 'Comissões',
      descricao: 'Gerencie comissões de vendedores',
      icone: DollarSign,
      cor: 'financeiro',
      rota: '/financeiro/comissoes',
      stats: 'R$ 0,00'
    },
    {
      titulo: 'Formas de Pagamento',
      descricao: 'Cadastre e gerencie formas de pagamento',
      icone: CreditCard,
      cor: 'financeiro',
      rota: '/financeiro/formas-pagamento',
      stats: 'Gestão'
    },
    {
      titulo: 'Regras de Comissão',
      descricao: 'Configure percentuais por produto/vendedor',
      icone: Settings,
      cor: 'financeiro',
      rota: '/financeiro/regras',
      stats: 'Configurar'
    }
  ];

  $: movimentosRecentes = construirMovimentosRecentes(conciliacoesRecentes, comissoes);

  onMount(async () => {
    await carregarDashboard();
  });

  async function carregarDashboard() {
    loading = true;
    try {
      const [sumRes, concRes, comRes] = await Promise.all([
        fetch('/api/v1/conciliacao/summary'),
        fetch('/api/v1/conciliacao?limit=6'),
        fetch('/api/v1/financeiro/comissoes')
      ]);

      if (!sumRes.ok) throw new Error('Erro ao carregar resumo da conciliação');
      if (!concRes.ok) throw new Error('Erro ao carregar conciliações recentes');
      if (!comRes.ok) throw new Error('Erro ao carregar comissões');

      const sumData = await sumRes.json();
      const concData = await concRes.json();
      const comData = await comRes.json();

      summary = {
        total: Number(sumData.total || 0),
        efetivados: Number(sumData.efetivados || 0),
        pendentes: Number(sumData.pendentes || 0),
        semRanking: Number(sumData.semRanking || 0),
        baixaRac: Number(sumData.baixaRac || 0),
        totalValor: Number(sumData.totalValor || 0),
        timeline: Array.isArray(sumData.timeline) ? sumData.timeline : []
      };

      conciliacoesRecentes = concData.items || [];
      comissoes = comData.items || [];

      const comissoesPendentesItems = comissoes.filter((c) => c.status === 'pendente');

      resumo = {
        totalReceber: summary.totalValor,
        totalPagar: comissoesPendentesItems.reduce((acc, item) => acc + Number(item.valor_comissao || 0), 0),
        comissoesPendentes: comissoesPendentesItems.length,
        conciliacoesPendentes: summary.pendentes,
        semRanking: summary.semRanking,
        baixaRac: summary.baixaRac,
        backlogFinanceiro: summary.pendentes + summary.semRanking + summary.baixaRac + comissoesPendentesItems.length
      };

      modulos = modulos.map((modulo) => {
        if (modulo.titulo === 'Conciliação') {
          return {
            ...modulo,
            stats: `${resumo.conciliacoesPendentes} pendentes · ${resumo.semRanking} sem ranking`
          };
        }

        if (modulo.titulo === 'Comissões') {
          return {
            ...modulo,
            stats: `${formatCurrency(resumo.totalPagar)} · ${resumo.comissoesPendentes} pendentes`
          };
        }

        if (modulo.titulo === 'Caixa') {
          return {
            ...modulo,
            stats: `${formatCurrency(resumo.totalReceber)} efetivados`
          };
        }

        return modulo;
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dashboard financeiro');
    } finally {
      loading = false;
    }
  }

  function construirMovimentosRecentes(
    conciliacoesLista: ConciliacaoItem[],
    comissoesLista: ComissaoItem[]
  ): Movimento[] {
    const movimentosConciliacao: Movimento[] = conciliacoesLista.slice(0, 5).map((item) => ({
      id: `conc-${item.id}`,
      data: item.movimento_data || '',
      descricao: item.descricao || `Recibo ${item.documento || ''}`,
      detalhe: `Status: ${item.status_display || item.status || '-'}`,
      tipo: 'Receita',
      valor: Number(item.valor_calculada_loja || item.valor_lancamentos || 0),
      status: item.conciliado ? 'Conciliado' : 'Pendente'
    }));

    const movimentosComissoes: Movimento[] = comissoesLista.slice(0, 5).map((comissao) => ({
      id: `com-${comissao.id}`,
      data: comissao.data_venda || '',
      descricao: `Comissão ${comissao.vendedor || ''}`.trim(),
      detalhe: `${comissao.cliente || 'Cliente não informado'}${comissao.numero_venda ? ` - ${comissao.numero_venda}` : ''}`,
      tipo: 'Despesa',
      valor: Number(comissao.valor_comissao || 0),
      status: comissao.status === 'pago' ? 'Pago' : 'Pendente'
    }));

    return [...movimentosConciliacao, ...movimentosComissoes]
      .filter((item) => item.data)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 6);
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  function getStatusClass(status: string): string {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'conciliado' || normalized === 'confirmado' || normalized === 'pago') {
      return 'bg-green-100 text-green-700';
    }
    if (normalized === 'divergente') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-amber-100 text-amber-700';
  }
</script>

<svelte:head>
  <title>Financeiro | VTUR</title>
</svelte:head>

<PageHeader
  title="Financeiro"
  subtitle="Gestão financeira do sistema"
  color="financeiro"
  breadcrumbs={[{ label: 'Financeiro' }]}
/>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <Loader2 size={40} class="animate-spin text-financeiro-600" />
    <span class="ml-3 text-slate-600">Carregando dashboard financeiro...</span>
  </div>
{:else}
  <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p>
      <p class="text-sm text-slate-500">Resumo financeiro com foco em fechamento, pendências e ação rápida.</p>
    </div>
  </div>

  <KPIGrid className="mb-6" columns={4}>
    <button on:click={() => goto('/financeiro/conciliacao')} class="vtur-kpi-card border-t-[3px] border-t-orange-400 text-left">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
        <AlertCircle size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Backlog de conciliação</p>
        <p class="text-2xl font-bold text-slate-900">{resumo.conciliacoesPendentes + resumo.divergencias}</p>
      </div>
    </button>

    <button on:click={() => goto('/financeiro/comissoes')} class="vtur-kpi-card border-t-[3px] border-t-amber-400 text-left">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
        <Clock size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Comissões pendentes</p>
        <p class="text-2xl font-bold text-slate-900">{resumo.comissoesPendentes}</p>
      </div>
    </button>

    <button on:click={() => goto('/financeiro/caixa')} class="vtur-kpi-card border-t-[3px] border-t-teal-400 text-left">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
        <TrendingUp size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Valor a receber</p>
        <p class="text-2xl font-bold text-slate-900">{formatCurrency(resumo.totalReceber)}</p>
      </div>
    </button>

    <button on:click={() => goto('/financeiro/regras')} class="vtur-kpi-card border-t-[3px] border-t-blue-400 text-left">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
        <Settings size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Regras e cadastros</p>
        <p class="text-2xl font-bold text-slate-900">2</p>
      </div>
    </button>
  </KPIGrid>

  <KPIGrid className="mb-8" columns={5}>
    <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
        <TrendingUp size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Total a Receber</p>
        <p class="text-2xl font-bold text-slate-900">{formatCurrency(resumo.totalReceber)}</p>
      </div>
    </div>

    <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
        <TrendingDown size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Total a Pagar</p>
        <p class="text-2xl font-bold text-slate-900">{formatCurrency(resumo.totalPagar)}</p>
      </div>
    </div>

    <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
        <Clock size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Comissões Pendentes</p>
        <p class="text-2xl font-bold text-slate-900">{resumo.comissoesPendentes}</p>
      </div>
    </div>

    <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
        <AlertCircle size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Conciliações Pendentes</p>
        <p class="text-2xl font-bold text-slate-900">{resumo.conciliacoesPendentes}</p>
      </div>
    </div>

    <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
        <Clock size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Backlog Financeiro</p>
        <p class="text-2xl font-bold text-slate-900">{resumo.backlogFinanceiro}</p>
      </div>
    </div>
  </KPIGrid>

  <div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">
    O financeiro consolida prioridades de fechamento: <strong>{resumo.conciliacoesPendentes}</strong> conciliações pendentes, <strong>{resumo.semRanking}</strong> sem ranking atribuído, <strong>{resumo.baixaRac}</strong> Baixa RAC e <strong>{resumo.comissoesPendentes}</strong> comissões pendentes.
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each modulos as modulo}
      <button
        on:click={() => goto(modulo.rota)}
        class="vtur-card p-6 text-left hover:shadow-lg transition-all duration-200 group"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 rounded-lg" style="background-color: var(--color-{modulo.cor}-50);">
            <svelte:component this={modulo.icone} size={28} style="color: var(--color-{modulo.cor}-600);" />
          </div>
          <ArrowRight size={20} class="text-slate-400 group-hover:text-financeiro-600 group-hover:translate-x-1 transition-all" />
        </div>

        <h3 class="text-lg font-semibold text-slate-900 mb-1">{modulo.titulo}</h3>
        <p class="text-sm text-slate-500 mb-3">{modulo.descricao}</p>

        <div class="flex items-center gap-2">
          <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-financeiro-50 text-financeiro-700">
            {modulo.stats}
          </span>
        </div>
      </button>
    {/each}
  </div>

  <Card header="Últimas Movimentações" color="financeiro" class="mt-8">
    {#if movimentosRecentes.length === 0}
      <div class="p-8 text-center text-slate-500">
        <p>Nenhuma movimentação encontrada.</p>
      </div>
    {:else}
      <div class="overflow-x-visible md:overflow-x-auto">
        <table class="vtur-table w-full table-mobile-cards">
          <thead>
            <tr class="bg-slate-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Data</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Descrição</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tipo</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Valor</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {#each movimentosRecentes as movimento}
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 text-slate-700">{new Date(movimento.data).toLocaleDateString('pt-BR')}</td>
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-900">{movimento.descricao}</p>
                  <p class="text-xs text-slate-500">{movimento.detalhe}</p>
                </td>
                <td class="px-4 py-3 text-slate-700">{movimento.tipo}</td>
                <td class="px-4 py-3 text-right font-medium {movimento.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}">
                  {movimento.tipo === 'Receita' ? '+' : '-'} {formatCurrency(movimento.valor)}
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full {getStatusClass(movimento.status)}">
                    {movimento.status}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
{/if}
