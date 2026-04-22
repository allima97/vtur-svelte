<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/db/supabase';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { 
    ArrowLeft, Edit, Send, CheckCircle, XCircle, FileText, Printer, 
    Trash2, ShoppingCart, Loader2, User, Mail, Phone, MessageCircle, 
    Calendar, Clock, History, TrendingUp, Package, AlertCircle
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import ModalInteracaoQuote from '$lib/components/modais/ModalInteracaoQuote.svelte';
  
  const orcamentoId = $page.params.id;
  
  let orcamento: any = null;
  let interacoes: any[] = [];
  let loading = true;
  let error: string | null = null;
  let processando = false;
  let showInteracaoModal = false;
  let loadingInteracoes = false;
  
  async function ensureServerSessionCookie() {
    if (!browser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
      });
    } catch {
      // Falha silenciosa: a tela tratará 401 explicitamente no carregamento.
    }
  }

  onMount(async () => {
    await ensureServerSessionCookie();
    await carregarOrcamento();
    await carregarInteracoes();
  });
  
  async function carregarOrcamento() {
    try {
      loading = true;
      error = null;
      
      const response = await fetch(`/api/v1/orcamentos/${orcamentoId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          toast.error('Sessão expirada. Faça login novamente para continuar.');
          const next = `${$page.url.pathname}${$page.url.search}`;
          await goto(`/auth/login?next=${encodeURIComponent(next)}`);
          return;
        }
        if (response.status === 403) {
          error = 'Você não tem permissão para acessar este orçamento';
          await goto('/orcamentos');
          return;
        }
        if (response.status === 404) {
          error = 'Orçamento não encontrado';
          return;
        }
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      orcamento = data;
    } catch (err: any) {
      error = `Erro ao carregar dados do orçamento: ${err.message}`;
      toast.error('Erro ao carregar orçamento');
    } finally {
      loading = false;
    }
  }
  
  async function carregarInteracoes() {
    loadingInteracoes = true;
    try {
      const response = await fetch(`/api/v1/orcamentos/interacao?quote_id=${orcamentoId}`);
      if (response.status === 401) {
        return;
      }
      if (response.ok) {
        const data = await response.json();
        interacoes = data.interacoes || [];
      }
    } catch (err) {
      console.error('Erro ao carregar interações:', err);
    } finally {
      loadingInteracoes = false;
    }
  }
  
  async function atualizarStatus(novoStatus: string, redirectToVenda = false) {
    processando = true;
    try {
      const response = await fetch(`/api/v1/orcamentos/${orcamentoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, status_negociacao: novoStatus })
      });
      
      if (!response.ok) throw new Error('Erro ao atualizar status');
      
      orcamento.status = novoStatus;
      orcamento.status_negociacao = novoStatus;
      toast.success(`Orçamento ${getStatusLabel(novoStatus).toLowerCase()} com sucesso!`);
      
      await carregarInteracoes();

      if (redirectToVenda) {
        goto(`/vendas/nova?orcamento=${orcamentoId}`);
      }
    } catch (err) {
      toast.error('Erro ao atualizar status');
    } finally {
      processando = false;
    }
  }
  
  function handleAprovar() {
    if (!confirm('Confirmar aprovação deste orçamento?')) return;
    const redirectToVenda = confirm('Deseja seguir agora para criar a venda a partir deste orçamento?');
    atualizarStatus('aprovado', redirectToVenda);
  }
  
  function handleRejeitar() {
    if (confirm('Confirmar rejeição deste orçamento?')) {
      atualizarStatus('rejeitado');
    }
  }
  
  function handleEnviar() {
    atualizarStatus('enviado');
  }
  
  function handleImprimir() {
    toast.success('Preparando impressão...');
    window.print();
  }
  
  async function handleExcluir() {
    if (!confirm('Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.')) return;
    
    try {
      const response = await fetch(`/api/v1/orcamentos/${orcamentoId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Erro ao excluir');
      
      toast.success('Orçamento excluído');
      goto('/orcamentos');
    } catch (err) {
      toast.error('Erro ao excluir orçamento');
    }
  }
  
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: orcamento?.currency || 'BRL'
    }).format(value || 0);
  }
  
  function formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  }
  
  function formatDateTime(dateString: string | null): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  }

  function getDiasSemInteracao(dateString: string | null) {
    if (!dateString) return null;
    const data = new Date(dateString);
    return Math.ceil((Date.now() - data.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  function getStatusColor(status: string): string {
    switch (String(status || '').toLowerCase()) {
      case 'aprovado': return 'bg-green-100 text-green-700 border-green-200';
      case 'pendente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'enviado': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rejeitado': return 'bg-red-100 text-red-700 border-red-200';
      case 'expirado': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'novo': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'fechado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
  
  function getStatusLabel(status: string): string {
    const key = String(status || '').toLowerCase();
    const labels: Record<string, string> = {
      aprovado: 'Aprovado',
      pendente: 'Pendente',
      enviado: 'Enviado',
      rejeitado: 'Rejeitado',
      expirado: 'Expirado',
      novo: 'Novo',
      fechado: 'Convertido em Venda'
    };
    return labels[key] || status;
  }
  
  function getTipoInteracaoIcon(tipo: string) {
    switch (tipo) {
      case 'ligacao': return Phone;
      case 'email': return Mail;
      case 'whatsapp': return MessageCircle;
      case 'reuniao': return Calendar;
      default: return MessageCircle;
    }
  }
  
  function getTipoInteracaoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'ligacao': 'Ligação',
      'email': 'Email',
      'whatsapp': 'WhatsApp',
      'reuniao': 'Reunião',
      'status': 'Mudança de Status',
      'outro': 'Outro'
    };
    return labels[tipo] || tipo;
  }
  
  $: valorTotal = orcamento?.itens?.reduce((acc: number, item: any) => acc + (item.total_amount || 0), 0) || 0;
  $: quantidadeItens = orcamento?.itens?.length || 0;
  $: statusAtual = String(orcamento?.status || '').toLowerCase();
  $: podeCriarVenda = statusAtual === 'aprovado';
  $: orcamentoConvertido = statusAtual === 'fechado';
  $: isExpirado = orcamento?.valid_until 
    ? new Date(orcamento.valid_until) < new Date() 
    : false;
  $: ultimaInteracao = interacoes.length > 0 ? interacoes[0] : null;
  $: diasSemInteracao = getDiasSemInteracao(ultimaInteracao?.created_at || null);
  $: cardProximoPassoClasse = orcamentoConvertido
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : podeCriarVenda
      ? 'border-green-200 bg-green-50 text-green-700'
      : !ultimaInteracao
        ? 'border-red-200 bg-red-50 text-red-700'
        : (diasSemInteracao || 0) >= 7
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-blue-200 bg-blue-50 text-blue-700';
</script>

<svelte:head>
  <title>{orcamento ? `Orçamento ${orcamento.codigo}` : 'Orçamento'} | VTUR</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center h-64">
    <Loader2 size={32} class="animate-spin text-clientes-600" />
    <span class="ml-2 text-slate-600">Carregando...</span>
  </div>
{:else if error}
  <div class="text-center py-12">
    <p class="text-red-600 mb-4">{error}</p>
    <Button variant="secondary" on:click={() => goto('/orcamentos')}>
      <ArrowLeft size={16} class="mr-2" />
      Voltar para Orçamentos
    </Button>
  </div>
{:else if orcamento}
  <PageHeader 
    title="Orçamento {orcamento.codigo}"
    subtitle="Criado em {formatDate(orcamento.created_at)} • Válido até {formatDate(orcamento.valid_until || orcamento.data_validade)}"
    color="clientes"
    breadcrumbs={[
      { label: 'Orçamentos', href: '/orcamentos' },
      { label: orcamento.codigo }
    ]}
    actions={[
      {
        label: 'Editar',
        href: `/orcamentos/${orcamentoId}/editar`,
        variant: 'secondary',
        icon: Edit
      },
      {
        label: 'Voltar',
        href: '/orcamentos',
        variant: 'ghost'
      }
    ]}
  />

  <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p>
      <p class="text-sm text-slate-500">Resumo do orçamento com foco em status comercial, follow-up, validade e conversão em venda.</p>
    </div>
  </div>

  <div class="vtur-kpi-grid mb-6">
    <Button
      variant="unstyled"
      class_name="vtur-kpi-card border-t-[3px] border-t-blue-400 text-left hover:shadow-lg transition-all duration-200"
      on:click={() => goto('/orcamentos')}
    >
      <div class={`flex h-10 w-10 items-center justify-center rounded-xl ${statusAtual === 'aprovado' ? 'bg-green-50 text-green-500' : statusAtual === 'rejeitado' ? 'bg-red-50 text-red-500' : statusAtual === 'enviado' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}><FileText size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Status comercial</p>
        <p class="text-2xl font-bold text-slate-900">{getStatusLabel(orcamento.status)}</p>
      </div>
    </Button>

    <Button
      variant="unstyled"
      class_name="vtur-kpi-card border-t-[3px] border-t-blue-400 text-left hover:shadow-lg transition-all duration-200"
      on:click={() => (showInteracaoModal = true)}
    >
      <div class={`flex h-10 w-10 items-center justify-center rounded-xl ${!ultimaInteracao ? 'bg-red-50 text-red-500' : (diasSemInteracao || 0) >= 7 ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}><Clock size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Última interação</p>
        <p class="text-2xl font-bold text-slate-900">{!ultimaInteracao ? 'Sem registro' : `${diasSemInteracao || 0}d`}</p>
      </div>
    </Button>

    <Button
      variant="unstyled"
      class_name="vtur-kpi-card border-t-[3px] border-t-amber-400 text-left hover:shadow-lg transition-all duration-200"
      on:click={() => goto('/orcamentos')}
    >
      <div class={`flex h-10 w-10 items-center justify-center rounded-xl ${isExpirado ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}><AlertCircle size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Vencimento</p>
        <p class="text-2xl font-bold text-slate-900">{formatDate(orcamento.valid_until || orcamento.data_validade)}</p>
      </div>
    </Button>

    <Button
      variant="unstyled"
      class_name="vtur-kpi-card border-t-[3px] border-t-green-400 text-left hover:shadow-lg transition-all duration-200"
      on:click={() => (podeCriarVenda ? goto(`/vendas/nova?orcamento=${orcamentoId}`) : goto('/orcamentos'))}
    >
      <div class={`flex h-10 w-10 items-center justify-center rounded-xl ${orcamentoConvertido ? 'bg-green-50 text-green-500' : podeCriarVenda ? 'bg-green-50 text-green-500' : 'bg-slate-100 text-slate-500'}`}><ShoppingCart size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Próximo passo</p>
        <p class="text-2xl font-bold text-slate-900">{orcamentoConvertido ? 'Convertido' : podeCriarVenda ? 'Criar venda' : 'Acompanhar'}</p>
      </div>
    </Button>
  </div>

  <div class="mb-6 p-4 rounded-lg border {getStatusColor(orcamento.status)}">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-lg font-semibold">
          Status: {getStatusLabel(orcamento.status)}
        </span>
        {#if isExpirado && !['aprovado', 'rejeitado', 'fechado'].includes(statusAtual)}
          <span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            EXPIRADO
          </span>
        {/if}
        {#if orcamentoConvertido}
          <span class="px-2 py-1 bg-emerald-200 text-emerald-800 text-xs font-medium rounded-full">
            CONVERTIDO
          </span>
        {/if}
      </div>
      <div class="text-sm opacity-75">
        Última atualização: {formatDateTime(orcamento.updated_at || orcamento.created_at)}
      </div>
    </div>
  </div>

  <div class="mb-6 rounded-lg border px-4 py-3 {cardProximoPassoClasse}">
    {#if orcamentoConvertido}
      <p class="text-sm font-semibold">Próximo passo: acompanhar a venda</p>
      <p class="mt-1 text-sm">Este orçamento já foi convertido. Use esta tela como histórico comercial.</p>
    {:else if podeCriarVenda}
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p class="text-sm font-semibold">Próximo passo: criar a venda</p>
          <p class="mt-1 text-sm">O orçamento já está aprovado e pronto para conversão operacional.</p>
        </div>
        <Button variant="secondary" on:click={() => goto(`/vendas/nova?orcamento=${orcamentoId}`)} class_name="shrink-0 justify-center">
          Criar venda agora
        </Button>
      </div>
    {:else if !ultimaInteracao}
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p class="text-sm font-semibold">Próximo passo: registrar o primeiro contato</p>
          <p class="mt-1 text-sm">Este orçamento ainda não tem interação registrada e entrou na fila crítica de follow-up.</p>
        </div>
        <Button variant="secondary" on:click={() => (showInteracaoModal = true)} class_name="shrink-0 justify-center">
          Registrar interação
        </Button>
      </div>
    {:else if (diasSemInteracao || 0) >= 7}
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p class="text-sm font-semibold">Próximo passo: retomar follow-up</p>
          <p class="mt-1 text-sm">Faz {diasSemInteracao} dias desde a última interação. Vale reabrir contato agora.</p>
        </div>
        <Button variant="secondary" on:click={() => (showInteracaoModal = true)} class_name="shrink-0 justify-center">
          Registrar novo follow-up
        </Button>
      </div>
    {:else}
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p class="text-sm font-semibold">Acompanhamento em dia</p>
          <p class="mt-1 text-sm">O orçamento está com interação recente. Mantenha o acompanhamento até a definição comercial.</p>
        </div>
        <Button variant="secondary" on:click={() => (showInteracaoModal = true)} class_name="shrink-0 justify-center">
          Registrar interação
        </Button>
      </div>
    {/if}
  </div>

  <div class="vtur-kpi-grid mb-6">
    <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
        <TrendingUp size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Valor Total</p>
        <p class="text-2xl font-bold text-slate-900">{formatCurrency(orcamento.total || valorTotal)}</p>
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
        <Package size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Itens</p>
        <p class="text-2xl font-bold text-slate-900">{quantidadeItens}</p>
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] {isExpirado ? 'border-t-amber-400' : 'border-t-blue-400'}">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl {isExpirado ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}">
        <Calendar size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Validade</p>
        <p class="text-2xl font-bold text-slate-900">{formatDate(orcamento.valid_until || orcamento.data_validade)}</p>
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
        <FileText size={20} />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Moeda</p>
        <p class="text-2xl font-bold text-slate-900">{orcamento.currency === 'USD' ? 'US$' : orcamento.currency === 'EUR' ? '€' : 'R$'}</p>
      </div>
    </div>
  </div>

  <div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">
    Este orçamento reúne <strong>{quantidadeItens}</strong> item(ns), total de <strong>{formatCurrency(orcamento.total || valorTotal)}</strong> e {#if ultimaInteracao}<strong>última interação em {formatDateTime(ultimaInteracao.created_at)}</strong>{:else}<strong>nenhuma interação registrada</strong>{/if}, facilitando a leitura rápida de prioridade comercial.
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-6">
      <Card header="Dados do Cliente" color="clientes">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-clientes-100 flex items-center justify-center">
              <User size={20} class="text-clientes-600" />
            </div>
            <div>
              <p class="text-sm text-slate-500">Cliente</p>
              <p class="font-medium text-slate-900">{orcamento.cliente?.nome || orcamento.cliente || 'Não informado'}</p>
            </div>
          </div>
          {#if orcamento.cliente?.email || orcamento.cliente_email}
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-clientes-100 flex items-center justify-center">
                <Mail size={20} class="text-clientes-600" />
              </div>
              <div>
                <p class="text-sm text-slate-500">Email</p>
                <a href="mailto:{orcamento.cliente?.email || orcamento.cliente_email}" class="font-medium text-clientes-600 hover:underline">
                  {orcamento.cliente?.email || orcamento.cliente_email}
                </a>
              </div>
            </div>
          {/if}
          {#if orcamento.cliente?.telefone}
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-clientes-100 flex items-center justify-center">
                <Phone size={20} class="text-clientes-600" />
              </div>
              <div>
                <p class="text-sm text-slate-500">Telefone</p>
                <p class="font-medium text-slate-900">{orcamento.cliente.telefone}</p>
              </div>
            </div>
          {/if}
        </div>
      </Card>
      
      <Card header="Itens do Orçamento" color="clientes">
        {#if orcamento.itens && orcamento.itens.length > 0}
          <div class="overflow-x-visible md:overflow-x-auto">
            <table class="w-full table-mobile-cards">
              <thead>
                <tr class="border-b border-slate-200">
                  <th class="text-left py-3 px-3 text-sm font-semibold text-slate-600">Descrição</th>
                  <th class="text-center py-3 px-3 text-sm font-semibold text-slate-600">Tipo</th>
                  <th class="text-center py-3 px-3 text-sm font-semibold text-slate-600">Qtd</th>
                  <th class="text-right py-3 px-3 text-sm font-semibold text-slate-600">Valor Unit.</th>
                  <th class="text-right py-3 px-3 text-sm font-semibold text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each orcamento.itens as item}
                  <tr class="hover:bg-slate-50">
                    <td class="py-3 px-3 text-slate-900">
                      <p class="font-medium">{item.title || item.descricao || 'Item'}</p>
                      {#if item.city_name || item.cidade}
                        <p class="text-sm text-slate-500">{item.city_name || item.cidade}</p>
                      {/if}
                    </td>
                    <td class="py-3 px-3 text-center">
                      <span class="px-2 py-1 text-xs bg-slate-100 rounded-full capitalize">
                        {item.item_type || 'servico'}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-center text-slate-700">{item.quantity || item.quantidade || 1}</td>
                    <td class="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(item.unit_price || item.valor_unitario || 0)}
                    </td>
                    <td class="py-3 px-3 text-right font-medium text-slate-900">
                      {formatCurrency(item.total_amount || item.valor_total || 0)}
                    </td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-slate-200">
                  <td colspan="4" class="py-4 px-3 text-right font-semibold text-slate-900">Total do Orçamento:</td>
                  <td class="py-4 px-3 text-right text-xl font-bold text-clientes-600">
                    {formatCurrency(orcamento.total || valorTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        {:else}
          <div class="text-center py-8 text-slate-500">
            <FileText size={48} class="mx-auto mb-3 opacity-30" />
            <p>Nenhum item no orçamento</p>
          </div>
        {/if}
      </Card>
      
      {#if orcamento.notes || orcamento.observacoes}
        <Card header="Observações e Condições" color="clientes">
          <div class="prose prose-slate max-w-none">
            <p class="text-slate-700 whitespace-pre-wrap">{orcamento.notes || orcamento.observacoes}</p>
          </div>
        </Card>
      {/if}
    </div>

    <div class="space-y-6">
      <Card header="Ações" color="clientes">
        <div class="space-y-3">
          {#if statusAtual === 'pendente' || statusAtual === 'novo'}
            <Button
              variant="primary"
              color="clientes"
              on:click={handleEnviar}
              loading={processando}
              class_name="w-full justify-center"
            >
              <Send size={16} class="mr-2" />
              Enviar ao Cliente
            </Button>
          {/if}
          
          {#if ['pendente', 'enviado', 'novo'].includes(statusAtual)}
            <div class="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                color="vendas"
                on:click={handleAprovar}
                loading={processando}
                class_name="w-full justify-center"
              >
                <CheckCircle size={16} class="mr-2" />
                Aprovar
              </Button>
              
              <Button
                variant="danger"
                on:click={handleRejeitar}
                loading={processando}
                class_name="w-full justify-center"
              >
                <XCircle size={16} class="mr-2" />
                Rejeitar
              </Button>
            </div>
          {/if}
          
          {#if podeCriarVenda}
            <Button
              variant="primary"
              color="vendas"
              on:click={() => goto(`/vendas/nova?orcamento=${orcamentoId}`)}
              class_name="w-full justify-center"
            >
              <ShoppingCart size={16} class="mr-2" />
              Criar Venda
            </Button>
          {/if}

          {#if orcamentoConvertido}
            <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Este orçamento já foi convertido em venda.
            </div>
          {/if}
          
          <Button
            variant="secondary"
            color="clientes"
            on:click={() => showInteracaoModal = true}
            class_name="w-full justify-center"
          >
            <MessageCircle size={16} class="mr-2" />
            Registrar Interação
          </Button>
          
          <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
            <Button
              variant="secondary"
              on:click={() => goto(`/orcamentos/${orcamentoId}/editar`)}
              class_name="w-full justify-center"
            >
              <Edit size={16} class="mr-2" />
              Editar
            </Button>
            
            <Button
              variant="secondary"
              on:click={handleImprimir}
              class_name="w-full justify-center"
            >
              <Printer size={16} class="mr-2" />
              Imprimir
            </Button>
          </div>
          
          <Button
            variant="ghost"
            class_name="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
            on:click={handleExcluir}
          >
            <Trash2 size={16} class="mr-2" />
            Excluir Orçamento
          </Button>
        </div>
      </Card>

      <Card header="Histórico de Interações" color="clientes">
        {#if loadingInteracoes}
          <div class="flex items-center justify-center py-8">
            <Loader2 size={24} class="animate-spin text-clientes-600" />
          </div>
        {:else if interacoes.length === 0}
          <div class="text-center py-6 text-slate-500">
            <History size={32} class="mx-auto mb-2 opacity-30" />
            <p class="text-sm">Nenhuma interação registrada</p>
            <Button
              variant="unstyled"
              on:click={() => showInteracaoModal = true}
              class_name="mt-2 text-sm text-clientes-600 hover:underline"
            >
              Registrar primeira interação
            </Button>
          </div>
        {:else}
          <div class="space-y-3 max-h-96 overflow-y-auto">
            {#each interacoes as interacao}
              <div class="p-3 bg-slate-50 rounded-lg">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <svelte:component 
                      this={getTipoInteracaoIcon(interacao.tipo)} 
                      size={14} 
                      class="text-clientes-600"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-medium text-slate-900 text-sm">
                        {getTipoInteracaoLabel(interacao.tipo)}
                      </span>
                      <span class="text-xs text-slate-500">
                        {formatDateTime(interacao.created_at)}
                      </span>
                    </div>
                    <p class="text-sm text-slate-700 mt-1">{interacao.observacoes}</p>
                    {#if interacao.status}
                      <span class="inline-block mt-2 px-2 py-0.5 text-xs rounded-full {getStatusColor(interacao.status)}">
                        Status: {getStatusLabel(interacao.status)}
                      </span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </Card>
    </div>
  </div>
  
  <ModalInteracaoQuote
    bind:open={showInteracaoModal}
    orcamentoId={orcamentoId}
    clienteNome={orcamento?.cliente?.nome || orcamento?.cliente || 'Cliente'}
    onClose={() => showInteracaoModal = false}
    onSave={carregarInteracoes}
  />
{/if}
