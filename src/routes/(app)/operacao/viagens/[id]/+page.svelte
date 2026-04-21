<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/stores/ui';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import FieldInput from '$lib/components/ui/form/FieldInput.svelte';
  import FieldTextarea from '$lib/components/ui/form/FieldTextarea.svelte';
  import FieldCheckbox from '$lib/components/ui/form/FieldCheckbox.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { 
    Plane, Calendar, MapPin, Users, FileText, CreditCard, ArrowLeft, Edit2, Trash2, 
    ExternalLink, Ticket, Plus, User, Mail, Phone, MessageCircle, AlertCircle, 
    CheckCircle, Clock, Briefcase, History, TrendingUp, MapPinned, Luggage
  } from 'lucide-svelte';

  interface Cliente {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    whatsapp: string;
  }

  interface Recibo {
    id: string;
    venda_id: string;
    produto_id: string;
    produto_nome: string;
    numero_recibo: string;
    numero_reserva: string;
    tipo_pacote: string;
    valor_total: number;
    valor_taxas: number;
    data_inicio: string;
    data_fim: string;
    contrato_url: string;
  }

  interface Venda {
    id: string;
    valor_total: number;
    valor_total_pago: number;
    status: string;
    data_venda: string;
    recibos: Recibo[];
  }

  interface Voucher {
    id: string;
    codigo: string;
    tipo: string;
    status: string;
    fornecedor_id: string;
    fornecedor_nome: string;
    data_utilizacao: string;
    valor: number;
  }

  interface Passageiro {
    id: string;
    nome: string;
    documento: string;
    tipo_documento: string;
    data_nascimento: string;
    contato: string;
  }

  interface HistoricoItem {
    id: string;
    tipo: string;
    descricao: string;
    data: string;
    usuario: string;
  }

  interface Viagem {
    id: string;
    venda_id: string;
    orcamento_id: string;
    cliente_id: string;
    responsavel_user_id: string;
    origem: string;
    destino: string;
    data_inicio: string;
    data_fim: string;
    status: 'planejada' | 'confirmada' | 'em_viagem' | 'concluida' | 'cancelada';
    observacoes: string;
    follow_up_text: string;
    follow_up_fechado: boolean;
    created_at: string;
    updated_at: string;
    cliente: Cliente | null;
    venda: Venda | null;
    vouchers: Voucher[];
    passageiros: Passageiro[];
    historico: HistoricoItem[];
  }

  const viagemId = $page.params.id;
  let viagem: Viagem | null = null;
  let loading = true;
  let showDeleteDialog = false;
  let showEditModal = false;
  let showStatusModal = false;
  let saving = false;

  // Form de edição
  let editForm = {
    data_inicio: '',
    data_fim: '',
    status: 'planejada',
    observacoes: '',
    follow_up_text: '',
    follow_up_fechado: false
  };

  const statusOptions = [
    { value: 'planejada', label: 'Planejada', color: 'gray', icon: Calendar },
    { value: 'confirmada', label: 'Confirmada', color: 'blue', icon: CheckCircle },
    { value: 'em_viagem', label: 'Em Viagem', color: 'yellow', icon: Plane },
    { value: 'concluida', label: 'Concluída', color: 'green', icon: CheckCircle },
    { value: 'cancelada', label: 'Cancelada', color: 'red', icon: AlertCircle }
  ];

  const tipoVoucherLabels: Record<string, string> = {
    hotel: 'Hotel',
    passagem: 'Passagem',
    passeio: 'Passeio',
    transfer: 'Transfer',
    seguro: 'Seguro',
    outro: 'Outro'
  };

  const statusVoucherLabels: Record<string, { label: string; color: string }> = {
    pendente: { label: 'Pendente', color: 'yellow' },
    emitido: { label: 'Emitido', color: 'blue' },
    utilizado: { label: 'Utilizado', color: 'green' },
    cancelado: { label: 'Cancelado', color: 'red' }
  };

  onMount(() => {
    loadViagem();
  });

  async function loadViagem() {
    loading = true;
    try {
      const response = await fetch(`/api/v1/viagens/${viagemId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Viagem não encontrada');
          goto('/operacao/viagens');
          return;
        }
        throw new Error('Erro ao carregar viagem');
      }

      const data = await response.json();
      viagem = data.viagem;

      // Preenche formulário de edição
      editForm = {
        data_inicio: viagem.data_inicio ? viagem.data_inicio.split('T')[0] : '',
        data_fim: viagem.data_fim ? viagem.data_fim.split('T')[0] : '',
        status: viagem.status || 'planejada',
        observacoes: viagem.observacoes || '',
        follow_up_text: viagem.follow_up_text || '',
        follow_up_fechado: viagem.follow_up_fechado || false
      };
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao carregar viagem');
    } finally {
      loading = false;
    }
  }

  async function saveViagem() {
    saving = true;
    try {
      const response = await fetch(`/api/v1/viagens/${viagemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      toast.success('Viagem atualizada com sucesso');
      showEditModal = false;
      showStatusModal = false;
      await loadViagem();
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao atualizar viagem');
    } finally {
      saving = false;
    }
  }

  async function deleteViagem() {
    try {
      const response = await fetch(`/api/v1/viagens/${viagemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast.success('Viagem excluída com sucesso');
      goto('/operacao/viagens');
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao excluir viagem');
    }
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      planejada: 'gray',
      confirmada: 'blue',
      em_viagem: 'yellow',
      concluida: 'green',
      cancelada: 'red'
    };
    return colors[status] || 'gray';
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      planejada: 'Planejada',
      confirmada: 'Confirmada',
      em_viagem: 'Em Viagem',
      concluida: 'Concluída',
      cancelada: 'Cancelada'
    };
    return labels[status] || status;
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  function formatDateTime(dateString: string | null): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  }

  function formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function getDiasViagem(inicio: string, fim: string): number {
    if (!inicio || !fim) return 0;
    const d1 = new Date(inicio);
    const d2 = new Date(fim);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff + 1;
  }

  function getDataSaida(recibos: Recibo[]): string | null {
    if (!recibos || recibos.length === 0) return null;
    const datas = recibos
      .map(r => r.data_inicio)
      .filter(Boolean)
      .sort();
    return datas[0] || null;
  }

  function getDataRetorno(recibos: Recibo[]): string | null {
    if (!recibos || recibos.length === 0) return null;
    const datas = recibos
      .map(r => r.data_fim)
      .filter(Boolean)
      .sort();
    return datas[datas.length - 1] || null;
  }

  // Mock de histórico (em produção viria da API)
  function gerarHistoricoMock(): HistoricoItem[] {
    if (!viagem) return [];
    return [
      {
        id: '1',
        tipo: 'criacao',
        descricao: 'Viagem criada',
        data: viagem.created_at,
        usuario: 'Sistema'
      },
      {
        id: '2',
        tipo: 'status',
        descricao: `Status alterado para: ${getStatusLabel(viagem.status)}`,
        data: viagem.updated_at,
        usuario: 'Operador'
      }
    ];
  }

  $: diasViagem = viagem ? getDiasViagem(viagem.data_inicio, viagem.data_fim) : 0;
  $: dataSaida = viagem?.venda?.recibos ? getDataSaida(viagem.venda.recibos) : viagem?.data_inicio;
  $: dataRetorno = viagem?.venda?.recibos ? getDataRetorno(viagem.venda.recibos) : viagem?.data_fim;
  $: historico = viagem ? gerarHistoricoMock() : [];
</script>

<svelte:head>
  <title>{viagem ? `Viagem - ${viagem.cliente?.nome || 'Cliente'}` : 'Detalhes da Viagem'} | VTUR</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center h-64">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-operacao-600"></div>
    <span class="ml-3 text-slate-500">Carregando viagem...</span>
  </div>
{:else if viagem}
  <!-- Header -->
  <PageHeader
    title={`Dossiê da Viagem ${viagem.venda_id ? `• ${viagem.venda_id.slice(0, 8).toUpperCase()}` : ''}`}
    subtitle={viagem?.cliente ? `Cliente: ${viagem.cliente.nome}` : 'Carregando...'}
    icon={Plane}
    color="clientes"
    breadcrumbs={[
      { label: 'Operação', href: '/operacao' },
      { label: 'Viagens', href: '/operacao/viagens' },
      { label: 'Detalhe' }
    ]}
    actions={[
      {
        label: 'Voltar',
        href: '/operacao/viagens',
        variant: 'ghost',
        icon: ArrowLeft
      },
      {
        label: 'Editar',
        onClick: () => showEditModal = true,
        variant: 'secondary',
        icon: Edit2
      },
      {
        label: 'Mudar Status',
        onClick: () => showStatusModal = true,
        variant: 'secondary',
        icon: CheckCircle
      }
    ]}
  />

  <!-- Status Banner -->
  <div class="mb-6 p-4 rounded-lg border bg-{getStatusColor(viagem.status)}-50 border-{getStatusColor(viagem.status)}-200">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-3">
        <Badge color={getStatusColor(viagem.status)} size="lg">
          {getStatusLabel(viagem.status)}
        </Badge>
        <span class="text-sm text-slate-600">
          Última atualização: {formatDateTime(viagem.updated_at)}
        </span>
      </div>
      <div class="flex gap-2">
        {#if viagem.venda_id}
          <Button 
            variant="outline" 
            size="sm"
            on:click={() => goto(`/vendas/${viagem.venda_id}`)}
          >
            <CreditCard size={16} class="mr-2" />
            Ver Venda
          </Button>
        {/if}
      </div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="vtur-kpi-grid mb-6">
    <KPICard 
      title="Data de Saída" 
      value={formatDate(dataSaida)}
      color="clientes" 
      icon={Calendar}
    />
    <KPICard 
      title="Data de Retorno" 
      value={formatDate(dataRetorno)}
      color="clientes" 
      icon={Calendar}
    />
    <KPICard 
      title="Duração" 
      value={`${diasViagem} dias`}
      color="clientes" 
      icon={Clock}
    />
    <KPICard 
      title="Viajantes" 
      value={viagem.passageiros?.length || 1}
      color="clientes" 
      icon={Users}
    />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Coluna Principal -->
    <div class="lg:col-span-2 space-y-6">
      <!-- Dados do Cliente -->
      <Card title="Dados do Cliente" icon={User} color="clientes">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 rounded-full bg-clientes-100 flex items-center justify-center">
            <User size={28} class="text-clientes-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-slate-900">{viagem.cliente?.nome || 'Cliente não informado'}</h3>
            <button 
              on:click={() => goto(`/clientes/${viagem.cliente?.id}`)}
              class="text-sm text-clientes-600 hover:underline"
            >
              Ver ficha completa →
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#if viagem.cliente?.email}
            <div class="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Mail size={18} class="text-slate-400" />
              <a href="mailto:{viagem.cliente.email}" class="text-slate-700 hover:text-clientes-600">
                {viagem.cliente.email}
              </a>
            </div>
          {/if}
          
          {#if viagem.cliente?.telefone}
            <div class="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Phone size={18} class="text-slate-400" />
              <a href="tel:{viagem.cliente.telefone}" class="text-slate-700 hover:text-clientes-600">
                {viagem.cliente.telefone}
              </a>
            </div>
          {/if}
          
          {#if viagem.cliente?.whatsapp}
            <div class="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <MessageCircle size={18} class="text-slate-400" />
              <a href="https://wa.me/{viagem.cliente.whatsapp.replace(/\D/g, '')}" target="_blank" class="text-slate-700 hover:text-clientes-600">
                {viagem.cliente.whatsapp}
              </a>
            </div>
          {/if}
        </div>
      </Card>

      <!-- Informações da Viagem -->
      <Card title="Informações da Viagem" icon={MapPinned} color="clientes">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 bg-slate-50 rounded-lg text-center">
            <MapPin size={24} class="mx-auto mb-2 text-clientes-500" />
            <p class="text-sm text-slate-500">Origem</p>
            <p class="font-medium text-slate-900">{viagem.origem || 'Não informada'}</p>
          </div>
          
          <div class="p-4 bg-slate-50 rounded-lg text-center">
            <MapPin size={24} class="mx-auto mb-2 text-clientes-500" />
            <p class="text-sm text-slate-500">Destino</p>
            <p class="font-medium text-slate-900">{viagem.destino || 'Não informado'}</p>
          </div>
          
          <div class="p-4 bg-slate-50 rounded-lg text-center">
            <Calendar size={24} class="mx-auto mb-2 text-clientes-500" />
            <p class="text-sm text-slate-500">Saída</p>
            <p class="font-medium text-slate-900">{formatDate(dataSaida)}</p>
          </div>
          
          <div class="p-4 bg-slate-50 rounded-lg text-center">
            <Calendar size={24} class="mx-auto mb-2 text-clientes-500" />
            <p class="text-sm text-slate-500">Retorno</p>
            <p class="font-medium text-slate-900">{formatDate(dataRetorno)}</p>
          </div>
        </div>
      </Card>
      
      <!-- Recibos da Viagem -->
      {#if viagem.venda?.recibos && viagem.venda.recibos.length > 0}
        <Card title={`Recibos da Viagem (${viagem.venda.recibos.length})`} icon={FileText} color="clientes">
          <div class="space-y-4">
            {#each viagem.venda.recibos as recibo}
              <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="flex-1 min-w-[300px]">
                    <div class="flex items-center gap-2 mb-2">
                      <Briefcase size={18} class="text-clientes-600" />
                      <span class="font-semibold text-slate-900">{recibo.produto_nome || 'Produto'}</span>
                      {#if recibo.tipo_pacote}
                        <Badge color="gray" size="sm">{recibo.tipo_pacote}</Badge>
                      {/if}
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p class="text-slate-500">Recibo</p>
                        <p class="font-medium">{recibo.numero_recibo || '-'}</p>
                      </div>
                      
                      {#if recibo.numero_reserva}
                        <div>
                          <p class="text-slate-500">Reserva</p>
                          <p class="font-medium">{recibo.numero_reserva}</p>
                        </div>
                      {/if}
                      
                      <div>
                        <p class="text-slate-500">Início</p>
                        <p class="font-medium">{formatDate(recibo.data_inicio)}</p>
                      </div>
                      
                      <div>
                        <p class="text-slate-500">Fim</p>
                        <p class="font-medium">{formatDate(recibo.data_fim)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div class="text-right">
                    <p class="text-2xl font-bold text-clientes-600">
                      {formatCurrency(recibo.valor_total)}
                    </p>
                    {#if recibo.valor_taxas > 0}
                      <p class="text-sm text-slate-500">
                        Taxas: {formatCurrency(recibo.valor_taxas)}
                      </p>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
            
            <!-- Total -->
            <div class="flex justify-end pt-4 border-t border-slate-200">
              <div class="text-right">
                <p class="text-sm text-slate-500">Valor Total da Viagem</p>
                <p class="text-3xl font-bold text-clientes-600">
                  {formatCurrency(viagem.venda?.valor_total)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      {/if}

      <!-- Vouchers -->
      <Card title={`Vouchers (${viagem.vouchers?.length || 0})`} icon={Ticket} color="clientes">
        {#if viagem.vouchers && viagem.vouchers.length > 0}
          <div class="space-y-3">
            {#each viagem.vouchers as voucher}
              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-clientes-100 flex items-center justify-center">
                    <Ticket size={20} class="text-clientes-600" />
                  </div>
                  <div>
                    <p class="font-medium text-slate-900">
                      {tipoVoucherLabels[voucher.tipo] || voucher.tipo}
                    </p>
                    <p class="text-sm text-slate-500">
                      {voucher.fornecedor_nome}
                      {#if voucher.data_utilizacao}
                        • {formatDate(voucher.data_utilizacao)}
                      {/if}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <Badge color={statusVoucherLabels[voucher.status]?.color || 'gray'}>
                    {statusVoucherLabels[voucher.status]?.label || voucher.status}
                  </Badge>
                  {#if voucher.valor}
                    <span class="font-medium text-slate-900">
                      {formatCurrency(voucher.valor)}
                    </span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-6 text-slate-500">
            <Ticket size={32} class="mx-auto mb-2 opacity-40" />
            <p>Nenhum voucher vinculado</p>
          </div>
        {/if}

        <div class="mt-4 pt-4 border-t border-slate-100">
          <Button 
            variant="secondary" 
            size="sm"
            on:click={() => goto(`/operacao/vouchers/novo?viagem_id=${viagem.id}`)}
          >
            <Plus size={16} class="mr-2" />
            Adicionar Voucher
          </Button>
        </div>
      </Card>

      <!-- Passageiros -->
      <Card title={`Passageiros (${viagem.passageiros?.length || 0})`} icon={Users} color="clientes">
        {#if viagem.passageiros && viagem.passageiros.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each viagem.passageiros as passageiro}
              <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div class="w-10 h-10 rounded-full bg-clientes-100 flex items-center justify-center">
                  <User size={20} class="text-clientes-600" />
                </div>
                <div>
                  <p class="font-medium text-slate-900">{passageiro.nome}</p>
                  {#if passageiro.documento}
                    <p class="text-sm text-slate-500">
                      {passageiro.tipo_documento?.toUpperCase() || 'Documento'}: {passageiro.documento}
                    </p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-6 text-slate-500">
            <Users size={32} class="mx-auto mb-2 opacity-40" />
            <p>Nenhum passageiro cadastrado</p>
          </div>
        {/if}
      </Card>

      <!-- Observações -->
      {#if viagem.observacoes}
        <Card title="Observações" icon={AlertCircle} color="clientes">
          <p class="text-slate-700 whitespace-pre-wrap">{viagem.observacoes}</p>
        </Card>
      {/if}

      <!-- Follow Up -->
      {#if viagem.follow_up_text}
        <Card title="Follow Up" icon={AlertCircle} color="clientes">
          <p class="text-slate-700 whitespace-pre-wrap">{viagem.follow_up_text}</p>
          <div class="mt-3">
            {#if viagem.follow_up_fechado}
              <Badge color="green">Fechado</Badge>
            {:else}
              <Badge color="yellow">Em Aberto</Badge>
            {/if}
          </div>
        </Card>
      {/if}
    </div>

    <!-- Coluna Lateral -->
    <div class="space-y-6">
      <!-- Resumo Financeiro -->
      {#if viagem.venda}
        <Card title="Resumo Financeiro" icon={TrendingUp} color="clientes">
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-slate-600">Valor Total</span>
              <span class="text-xl font-bold text-clientes-600">
                {formatCurrency(viagem.venda.valor_total)}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-600">Pago</span>
              <span class="font-medium text-green-600">
                {formatCurrency(viagem.venda.valor_total_pago)}
              </span>
            </div>
            {#if viagem.venda.valor_total > (viagem.venda.valor_total_pago || 0)}
              <div class="flex justify-between items-center pt-2 border-t border-slate-200">
                <span class="text-slate-600">Saldo Devedor</span>
                <span class="font-medium text-amber-600">
                  {formatCurrency(viagem.venda.valor_total - (viagem.venda.valor_total_pago || 0))}
                </span>
              </div>
            {/if}
          </div>
        </Card>
      {/if}

      <!-- Histórico -->
      <Card title="Histórico" icon={History} color="clientes">
        <div class="space-y-3 max-h-80 overflow-y-auto">
          {#each historico as item}
            <div class="flex gap-3 p-3 bg-slate-50 rounded-lg">
              <div class="w-8 h-8 rounded-full bg-clientes-100 flex items-center justify-center flex-shrink-0">
                <History size={14} class="text-clientes-600" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-900">{item.descricao}</p>
                <p class="text-xs text-slate-500 mt-1">
                  {formatDateTime(item.data)} • {item.usuario}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </Card>

      <!-- Ações -->
      <Card title="Ações" icon={Luggage} color="clientes">
        <div class="space-y-3">
          <Button 
            variant="primary" 
            color="clientes"
            class_name="w-full justify-center"
            on:click={() => showStatusModal = true}
          >
            <CheckCircle size={18} class="mr-2" />
            Mudar Status
          </Button>
          
          <Button 
            variant="secondary" 
            class_name="w-full justify-center"
            on:click={() => goto(`/operacao/vouchers/novo?viagem_id=${viagem.id}`)}
          >
            <Plus size={18} class="mr-2" />
            Novo Voucher
          </Button>
          
          <Button 
            variant="ghost" 
            class_name="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
            on:click={() => showDeleteDialog = true}
          >
            <Trash2 size={18} class="mr-2" />
            Excluir Viagem
          </Button>
        </div>
      </Card>
    </div>
  </div>

  <!-- Dialog de Confirmação de Exclusão -->
  <Dialog
    bind:open={showDeleteDialog}
    title="Confirmar Exclusão"
    description="Tem certeza que deseja excluir esta viagem? Esta ação não pode ser desfeita."
    confirmText="Excluir"
    cancelText="Cancelar"
    confirmVariant="danger"
    on:confirm={deleteViagem}
    on:cancel={() => showDeleteDialog = false}
  >
    <div class="flex items-start gap-3 text-amber-600 bg-amber-50 p-3 rounded-lg">
      <AlertCircle size={20} class="mt-0.5" />
      <p class="text-sm">
        Todos os vouchers e dados relacionados à viagem também serão removidos.
      </p>
    </div>
  </Dialog>

  <!-- Modal de Edição -->
  {#if showEditModal}
    <div class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 class="text-lg font-semibold text-slate-900">Editar Viagem</h3>
          <button
            on:click={() => showEditModal = false}
            type="button"
            aria-label="Fechar edição da viagem"
            class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form -->
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldInput
              label="Data de Saída"
              type="date"
              bind:value={editForm.data_inicio}
              id="viagem-edit-data-inicio"
            />
            <FieldInput
              label="Data de Retorno"
              type="date"
              bind:value={editForm.data_fim}
              id="viagem-edit-data-fim"
            />
            <FieldTextarea
              label="Observações"
              bind:value={editForm.observacoes}
              rows={3}
              id="viagem-edit-observacoes"
              class_name="md:col-span-2"
            />
            <FieldTextarea
              label="Follow Up"
              bind:value={editForm.follow_up_text}
              rows={2}
              id="viagem-edit-follow-up"
              class_name="md:col-span-2"
            />
            <FieldCheckbox
              label="Marcar como fechado"
              bind:checked={editForm.follow_up_fechado}
              class_name="md:col-span-2"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 p-4 border-t border-slate-100">
          <Button variant="ghost" on:click={() => showEditModal = false}>Cancelar</Button>
          <Button variant="primary" on:click={saveViagem} loading={saving}>Salvar Alterações</Button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Modal de Mudança de Status -->
  {#if showStatusModal}
    <div class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 class="text-lg font-semibold text-slate-900">Mudar Status da Viagem</h3>
          <button type="button" aria-label="Fechar mudança de status" on:click={() => showStatusModal = false} class="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <div class="grid grid-cols-1 gap-3">
            {#each statusOptions as option}
              <button
                type="button"
                on:click={() => editForm.status = option.value}
                class="flex items-center gap-3 p-3 rounded-lg border transition-colors text-left {editForm.status === option.value ? 'bg-clientes-50 border-clientes-300' : 'bg-white border-slate-200 hover:bg-slate-50'}"
              >
                <svelte:component this={option.icon} size={20} class={editForm.status === option.value ? 'text-clientes-600' : 'text-slate-400'} />
                <span class={editForm.status === option.value ? 'font-medium text-clientes-900' : 'text-slate-700'}>{option.label}</span>
                {#if editForm.status === option.value}
                  <CheckCircle size={18} class="ml-auto text-clientes-600" />
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <div class="flex justify-end gap-3 p-4 border-t border-slate-100">
          <Button variant="ghost" on:click={() => showStatusModal = false}>Cancelar</Button>
          <Button variant="primary" on:click={saveViagem} loading={saving}>Confirmar</Button>
        </div>
      </div>
    </div>
  {/if}
{/if}
