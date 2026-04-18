<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { toast } from '$lib/stores/ui';
  import {
    DollarSign, CheckCircle, AlertCircle, Clock,
    TrendingUp, ArrowRight, CreditCard,
    Settings, TrendingDown, Loader2
  } from 'lucide-svelte';

  interface Pagamento {
    id: string;
    codigo?: string;
    descricao?: string;
    valor?: number;
    status?: 'pendente' | 'conciliado' | 'divergente' | string;
    data_pagamento?: string;
    created_at?: string;
    cliente?: { nome?: string };
    venda?: { codigo?: string };
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
  let pagamentos: Pagamento[] = [];
  let comissoes: ComissaoItem[] = [];

  let resumo = {
    totalReceber: 0,
    totalPagar: 0,
    comissoesPendentes: 0,
    conciliacoesPendentes: 0,
    divergencias: 0,
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
      descricao: 'Concilie pagamentos recebidos com vendas',
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

  $: movimentosRecentes = construirMovimentosRecentes(pagamentos, comissoes);

  onMount(async () => {
    await carregarDashboard();
  });

  async function carregarDashboard() {
    loading = true;
    try {
      const [pagRes, comRes] = await Promise.all([
        fetch('/api/v1/pagamentos'),
        fetch('/api/v1/financeiro/comissoes')
      ]);

      if (!pagRes.ok) throw new Error('Erro ao carregar pagamentos');
      if (!comRes.ok) throw new Error('Erro ao carregar comissões');

      const pagData = await pagRes.json();
      const comData = await comRes.json();

      pagamentos = pagData.items || [];
      comissoes = comData.items || [];

      const pagamentosPendentes = pagamentos.filter((p) => p.status === 'pendente');
      const pagamentosDivergentes = pagamentos.filter((p) => p.status === 'divergente');
      const comissoesPendentesItems = comissoes.filter((c) => c.status === 'pendente');

      resumo = {
        totalReceber: pagamentosPendentes.reduce((acc, item) => acc + Number(item.valor || 0), 0),
        totalPagar: comissoesPendentesItems.reduce((acc, item) => acc + Number(item.valor_comissao || 0), 0),
        comissoesPendentes: comissoesPendentesItems.length,
        conciliacoesPendentes: pagamentosPendentes.length,
        divergencias: pagamentosDivergentes.length,
        backlogFinanceiro: pagamentosPendentes.length + pagamentosDivergentes.length + comissoesPendentesItems.length
      };

      modulos = modulos.map((modulo) => {
        if (modulo.titulo === 'Conciliação') {
          return {
            ...modulo,
            stats: `${resumo.conciliacoesPendentes} pendentes · ${resumo.divergencias} divergências`
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
            stats: `${formatCurrency(resumo.totalReceber)} a receber`
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

  function construirMovimentosRecentes(pagamentosLista: Pagamento[], comissoesLista: ComissaoItem[]): Movimento[] {
    const movimentosPagamentos: Movimento[] = pagamentosLista.slice(0, 5).map((pagamento) => ({
      id: `pag-${pagamento.id}`,
      data: pagamento.data_pagamento || pagamento.created_at || '',
      descricao: pagamento.descricao || `Pagamento ${pagamento.codigo || ''}`,
      detalhe: `${pagamento.cliente?.nome || 'Cliente não informado'}${pagamento.venda?.codigo ? ` - ${pagamento.venda.codigo}` : ''}`,
      tipo: 'Receita',
      valor: Number(pagamento.valor || 0),
      status: pagamento.status === 'conciliado' ? 'Conciliado' : pagamento.status === 'divergente' ? 'Divergente' : 'Pendente'
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

    return [...movimentosPagamentos, ...movimentosComissoes]
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

  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
    <button on:click={() => goto('/financeiro/conciliacao')} class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200">
      <div class="mb-3 flex items-center justify-between">
        <div class="rounded-lg bg-orange-50 p-3 text-orange-600"><AlertCircle size={20} /></div>
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Fechamento</span>
      </div>
      <p class="text-sm text-slate-500">Backlog de conciliação</p>
      <p class="mt-1 text-2xl font-bold text-slate-900">{resumo.conciliacoesPendentes + resumo.divergencias}</p>
      <p class="mt-2 text-sm text-slate-600">{resumo.conciliacoesPendentes} pendentes e {resumo.divergencias} divergências para tratar.</p>
    </button>

    <button on:click={() => goto('/financeiro/comissoes')} class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200">
      <div class="mb-3 flex items-center justify-between">
        <div class="rounded-lg bg-amber-50 p-3 text-amber-600"><Clock size={20} /></div>
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Pagamento interno</span>
      </div>
      <p class="text-sm text-slate-500">Comissões pendentes</p>
      <p class="mt-1 text-2xl font-bold text-slate-900">{resumo.comissoesPendentes}</p>
      <p class="mt-2 text-sm text-slate-600">{formatCurrency(resumo.totalPagar)} ainda aguardando pagamento a vendedores.</p>
    </button>

    <button on:click={() => goto('/financeiro/caixa')} class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200">
      <div class="mb-3 flex items-center justify-between">
        <div class="rounded-lg bg-financeiro-50 p-3 text-financeiro-600"><TrendingUp size={20} /></div>
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Caixa</span>
      </div>
      <p class="text-sm text-slate-500">Valor a receber</p>
      <p class="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(resumo.totalReceber)}</p>
      <p class="mt-2 text-sm text-slate-600">Use o caixa para acompanhar entradas, saídas e impacto no saldo.</p>
    </button>

    <button on:click={() => goto('/financeiro/regras')} class="vtur-card p-5 text-left hover:shadow-lg transition-all duration-200">
      <div class="mb-3 flex items-center justify-between">
        <div class="rounded-lg bg-blue-50 p-3 text-blue-600"><Settings size={20} /></div>
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Administração</span>
      </div>
      <p class="text-sm text-slate-500">Regras e cadastros</p>
      <p class="mt-1 text-2xl font-bold text-slate-900">2</p>
      <p class="mt-2 text-sm text-slate-600">Revise regras de comissão e formas de pagamento com leitura administrativa padronizada.</p>
    </button>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
    <div class="vtur-card p-5 border-l-4 border-l-financeiro-500">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-slate-500">Total a Receber</p>
          <p class="text-2xl font-bold text-slate-900">{formatCurrency(resumo.totalReceber)}</p>
        </div>
        <div class="p-3 bg-financeiro-50 rounded-lg">
          <TrendingUp size={24} class="text-financeiro-600" />
        </div>
      </div>
    </div>

    <div class="vtur-card p-5 border-l-4 border-l-red-500">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-slate-500">Total a Pagar</p>
          <p class="text-2xl font-bold text-slate-900">{formatCurrency(resumo.totalPagar)}</p>
        </div>
        <div class="p-3 bg-red-50 rounded-lg">
          <TrendingDown size={24} class="text-red-600" />
        </div>
      </div>
    </div>

    <div class="vtur-card p-5 border-l-4 border-l-amber-500">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-slate-500">Comissões Pendentes</p>
          <p class="text-2xl font-bold text-slate-900">{resumo.comissoesPendentes}</p>
        </div>
        <div class="p-3 bg-amber-50 rounded-lg">
          <Clock size={24} class="text-amber-600" />
        </div>
      </div>
    </div>

    <div class="vtur-card p-5 border-l-4 border-l-orange-500">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-slate-500">Conciliações Pendentes</p>
          <p class="text-2xl font-bold text-slate-900">{resumo.conciliacoesPendentes}</p>
        </div>
        <div class="p-3 bg-orange-50 rounded-lg">
          <AlertCircle size={24} class="text-orange-600" />
        </div>
      </div>
    </div>

    <div class="vtur-card p-5 border-l-4 border-l-slate-500">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-slate-500">Backlog Financeiro</p>
          <p class="text-2xl font-bold text-slate-900">{resumo.backlogFinanceiro}</p>
        </div>
        <div class="p-3 bg-slate-100 rounded-lg">
          <Clock size={24} class="text-slate-700" />
        </div>
      </div>
    </div>
  </div>

  <div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">
    O financeiro agora consolida prioridades de fechamento: <strong>{resumo.conciliacoesPendentes}</strong> conciliações pendentes, <strong>{resumo.divergencias}</strong> divergências e <strong>{resumo.comissoesPendentes}</strong> comissões pendentes.
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
      <div class="overflow-x-auto">
        <table class="vtur-table w-full">
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
