<script lang="ts">
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { 
    DollarSign, CheckCircle, AlertCircle, Clock, 
    TrendingUp, Wallet, ArrowRight, CreditCard,
    FileSpreadsheet, Settings, TrendingDown
  } from 'lucide-svelte';

  const modulos = [
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
      stats: '15 pendentes'
    },
    {
      titulo: 'Comissões',
      descricao: 'Gerencie comissões de vendedores',
      icone: DollarSign,
      cor: 'financeiro',
      rota: '/financeiro/comissoes',
      stats: 'R$ 12.450,00'
    },
    {
      titulo: 'Formas de Pagamento',
      descricao: 'Cadastre e gerencie formas de pagamento',
      icone: CreditCard,
      cor: 'financeiro',
      rota: '/financeiro/formas-pagamento',
      stats: '8 ativas'
    },
    {
      titulo: 'Regras de Comissão',
      descricao: 'Configure percentuais por produto/vendedor',
      icone: Settings,
      cor: 'financeiro',
      rota: '/financeiro/regras',
      stats: '8 regras'
    }
  ];

  const resumo = {
    totalReceber: 45600,
    totalPagar: 12300,
    comissoesPendentes: 8,
    conciliacoesPendentes: 15
  };
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

<!-- Resumo Financeiro -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <div class="vtur-card p-5 border-l-4 border-l-financeiro-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Total a Receber</p>
        <p class="text-2xl font-bold text-slate-900">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumo.totalReceber)}
        </p>
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
        <p class="text-2xl font-bold text-slate-900">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumo.totalPagar)}
        </p>
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
</div>

<!-- Módulos -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each modulos as modulo}
    <button
      on:click={() => goto(modulo.rota)}
      class="vtur-card p-6 text-left hover:shadow-lg transition-all duration-200 group"
    >
      <div class="flex items-start justify-between mb-4">
        <div 
          class="p-3 rounded-lg"
          style="background-color: var(--color-{modulo.cor}-50);"
        >
          <svelte:component 
            this={modulo.icone} 
            size={28} 
            style="color: var(--color-{modulo.cor}-600);"
          />
        </div>
        <ArrowRight 
          size={20} 
          class="text-slate-400 group-hover:text-financeiro-600 group-hover:translate-x-1 transition-all"
        />
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

<!-- Últimas Movimentações -->
<Card header="Últimas Movimentações" color="financeiro" class="mt-8">
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
        <tr class="hover:bg-slate-50">
          <td class="px-4 py-3 text-slate-700">20/03/2024</td>
          <td class="px-4 py-3">
            <p class="font-medium text-slate-900">Pagamento Venda #V2024-001</p>
            <p class="text-xs text-slate-500">Maria Silva - Rio de Janeiro</p>
          </td>
          <td class="px-4 py-3 text-slate-700">Receita</td>
          <td class="px-4 py-3 text-right font-medium text-green-600">+ R$ 3.500,00</td>
          <td class="px-4 py-3 text-center">
            <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Confirmado</span>
          </td>
        </tr>
        <tr class="hover:bg-slate-50">
          <td class="px-4 py-3 text-slate-700">19/03/2024</td>
          <td class="px-4 py-3">
            <p class="font-medium text-slate-900">Comissão Ana Paula</p>
            <p class="text-xs text-slate-500">Referente a março/2024</p>
          </td>
          <td class="px-4 py-3 text-slate-700">Despesa</td>
          <td class="px-4 py-3 text-right font-medium text-red-600">- R$ 1.250,00</td>
          <td class="px-4 py-3 text-center">
            <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Pago</span>
          </td>
        </tr>
        <tr class="hover:bg-slate-50">
          <td class="px-4 py-3 text-slate-700">18/03/2024</td>
          <td class="px-4 py-3">
            <p class="font-medium text-slate-900">Pagamento Fornecedor - Hotel</p>
            <p class="text-xs text-slate-500">Copacabana Palace</p>
          </td>
          <td class="px-4 py-3 text-slate-700">Despesa</td>
          <td class="px-4 py-3 text-right font-medium text-red-600">- R$ 2.100,00</td>
          <td class="px-4 py-3 text-center">
            <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Pendente</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</Card>
