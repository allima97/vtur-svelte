<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { 
    ArrowLeft, Edit, Send, CheckCircle, XCircle, FileText, Printer, 
    Trash2, ShoppingCart, Loader2, User, Mail, Phone, MessageCircle, 
    Calendar, Clock, History, TrendingUp, Package
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import ModalInteracaoQuote from '$lib/components/modais/ModalInteracaoQuote.svelte';
  
  const orcamentoId = $page.params.id;
  
  // Estado
  let orcamento: any = null;
  let interacoes: any[] = [];
  let loading = true;
  let error: string | null = null;
  let processando = false;
  let showInteracaoModal = false;
  let loadingInteracoes = false;
  
  onMount(async () => {
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
  
  async function atualizarStatus(novoStatus: string) {
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
      
      // Recarregar interações (a mudança de status gera uma interação)
      await carregarInteracoes();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    } finally {
      processando = false;
    }
  }
  
  function handleAprovar() {
    if (confirm('Confirmar aprovação deste orçamento?')) {
      atualizarStatus('aprovado');
    }
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
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-700 border-green-200';
      case 'pendente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'enviado': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rejeitado': return 'bg-red-100 text-red-700 border-red-200';
      case 'expirado': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'novo': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
  
  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'aprovado': 'Aprovado',
      'pendente': 'Pendente',
      'enviado': 'Enviado',
      'rejeitado': 'Rejeitado',
      'expirado': 'Expirado',
      'novo': 'Novo'
    };
    return labels[status] || status;
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
  
  // Verificar se orçamento está expirado
  $: isExpirado = orcamento?.valid_until 
    ? new Date(orcamento.valid_until) < new Date() 
    : false;
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

  <!-- Status Banner -->
  <div class="mb-6 p-4 rounded-lg border {getStatusColor(orcamento.status)}">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-3">
        <span class="text-lg font-semibold">
          Status: {getStatusLabel(orcamento.status)}
        </span>
        {#if isExpirado && orcamento.status !== 'aprovado' && orcamento.status !== 'rejeitado'}
          <span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            EXPIRADO
          </span>
        {/if}
      </div>
      <div class="text-sm opacity-75">
        Última atualização: {formatDateTime(orcamento.updated_at || orcamento.created_at)}
      </div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
    <KPICard 
      title="Valor Total" 
      value={formatCurrency(orcamento.total || valorTotal)}
      color="clientes"
      icon={TrendingUp}
    />
    <KPICard 
      title="Itens" 
      value={quantidadeItens}
      color="clientes"
      icon={Package}
    />
    <KPICard 
      title="Validade" 
      value={formatDate(orcamento.valid_until || orcamento.data_validade)}
      color={isExpirado ? 'danger' : 'clientes'}
      icon={Calendar}
    />
    <KPICard 
      title="Moeda" 
      value={orcamento.currency === 'USD' ? 'US$' : orcamento.currency === 'EUR' ? '€' : 'R$'}
      color="clientes"
      icon={FileText}
    />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Coluna Principal -->
    <div class="lg:col-span-2 space-y-6">
      <!-- Dados do Cliente -->
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
      
      <!-- Itens do Orçamento -->
      <Card header="Itens do Orçamento" color="clientes">
        {#if orcamento.itens && orcamento.itens.length > 0}
          <div class="overflow-x-auto">
            <table class="w-full">
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
      
      <!-- Observações -->
      {#if orcamento.notes || orcamento.observacoes}
        <Card header="Observações e Condições" color="clientes">
          <div class="prose prose-slate max-w-none">
            <p class="text-slate-700 whitespace-pre-wrap">{orcamento.notes || orcamento.observacoes}</p>
          </div>
        </Card>
      {/if}
    </div>

    <!-- Coluna Lateral -->
    <div class="space-y-6">
      <!-- Ações -->
      <Card header="Ações" color="clientes">
        <div class="space-y-3">
          {#if orcamento.status === 'pendente' || orcamento.status === 'novo'}
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
          
          {#if orcamento.status === 'pendente' || orcamento.status === 'enviado' || orcamento.status === 'novo'}
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
          
          {#if orcamento.status === 'aprovado'}
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

      <!-- Histórico de Interações -->
      <Card header="Histórico de Interações" color="clientes">
        {#if loadingInteracoes}
          <div class="flex items-center justify-center py-8">
            <Loader2 size={24} class="animate-spin text-clientes-600" />
          </div>
        {:else if interacoes.length === 0}
          <div class="text-center py-6 text-slate-500">
            <History size={32} class="mx-auto mb-2 opacity-30" />
            <p class="text-sm">Nenhuma interação registrada</p>
            <button 
              on:click={() => showInteracaoModal = true}
              class="mt-2 text-sm text-clientes-600 hover:underline"
            >
              Registrar primeira interação
            </button>
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
  
  <!-- Modal de Interação -->
  <ModalInteracaoQuote
    bind:open={showInteracaoModal}
    orcamentoId={orcamentoId}
    clienteNome={orcamento?.cliente?.nome || orcamento?.cliente || 'Cliente'}
    onClose={() => showInteracaoModal = false}
    onSave={carregarInteracoes}
  />
{/if}
