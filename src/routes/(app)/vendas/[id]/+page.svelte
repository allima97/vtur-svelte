<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/db/supabase';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import {
    ArrowLeft, Edit, Trash2, ShoppingCart, Loader2, User, Mail, Phone,
    Calendar, MapPin, Receipt, CreditCard, FileText, TrendingUp, Package, XCircle,
    AlertCircle, Clock, CheckCircle, Shield
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import MesclarVendasModal from '$lib/components/modais/MesclarVendasModal.svelte';
  import { Merge } from 'lucide-svelte';

  const vendaId = $page.params.id;
  const vendaIdSafe = vendaId ?? '';

  let venda: any = null;
  let loading = true;
  let error: string | null = null;
  let processando = false;
  let showMesclar = false;
  let produtosCache: Record<string, { id: string; nome: string }> = {};
  let ensuringProdutos = new Set<string>();
  let produtosBase: Array<{ id: string; nome: string; cidade_id?: string | null }> = [];
  let cidadesBase: Array<{ id: string; label?: string | null; nome?: string | null }> = [];
  let tiposPacoteBase: Array<{ id: string; nome: string }> = [];

  // Edição por modal de recibo
  let showEditReciboDialog = false;
  let editingReciboId: string | null = null;
  let isEditingReciboDetails = false;
  let savingRecibo = false;
  let reciboForm = {
    numero_recibo: '',
    produto_id: '',
    destino_cidade_id: '',
    numero_reserva: '',
    data_inicio: '',
    data_fim: '',
    valor_total: '',
    tipo_pacote: ''
  };

  async function loadReciboBaseData() {
    try {
      const response = await fetch('/api/v1/vendas/cadastro-base');
      if (!response.ok) return;
      const data = await response.json();
      produtosBase = (data.produtos || []).map((item: any) => ({
        id: String(item.id),
        nome: item.nome || 'Produto',
        cidade_id: item.cidade_id || null
      }));
      cidadesBase = (data.cidades || []).map((item: any) => ({
        id: String(item.id),
        label: item.label || item.nome || 'Cidade',
        nome: item.nome || 'Cidade'
      }));
      tiposPacoteBase = (data.tiposPacote || [])
        .map((item: any) => ({ id: String(item.id || item.nome || ''), nome: item.nome || '' }))
        .filter((item: any) => item.nome);
    } catch {
      // Nao bloqueia a tela principal.
    }
  }

  function ensureReciboFormOptions(recibo: any) {
    const produtoId = String(recibo?.produto_resolvido_id || recibo?.produto_id || '').trim();
    const produtoNome =
      produtosCache[produtoId]?.nome || recibo?.produto_resolvido?.nome || recibo?.produto?.nome || 'Produto';
    if (produtoId && !produtosBase.some((item) => item.id === produtoId)) {
      produtosBase = [...produtosBase, { id: produtoId, nome: produtoNome }];
    }

    const cidadeId = String(recibo?.destino_cidade_id || '').trim();
    const cidadeNome = String(recibo?.destino_cidade?.nome || '').trim();
    if (cidadeId && !cidadesBase.some((item) => item.id === cidadeId)) {
      cidadesBase = [...cidadesBase, { id: cidadeId, label: cidadeNome || cidadeId, nome: cidadeNome || cidadeId }];
    }

    const tipoPacote = String(recibo?.tipo_pacote || '').trim();
    if (tipoPacote && !tiposPacoteBase.some((item) => item.nome === tipoPacote)) {
      tiposPacoteBase = [...tiposPacoteBase, { id: tipoPacote, nome: tipoPacote }];
    }
  }

  function startEditRecibo(recibo: any) {
    ensureReciboFormOptions(recibo);
    editingReciboId = recibo.id;
    isEditingReciboDetails = false;
    reciboForm = {
      numero_recibo: String(recibo?.numero_recibo || ''),
      produto_id: String(recibo?.produto_resolvido_id || recibo?.produto_id || ''),
      destino_cidade_id: String(recibo?.destino_cidade_id || ''),
      numero_reserva: String(recibo?.numero_reserva || ''),
      data_inicio: String(recibo?.data_inicio || '').slice(0, 10),
      data_fim: String(recibo?.data_fim || '').slice(0, 10),
      valor_total: String(recibo?.valor_total || ''),
      tipo_pacote: String(recibo?.tipo_pacote || '')
    };
    showEditReciboDialog = true;
  }

  function cancelEditRecibo() {
    showEditReciboDialog = false;
    editingReciboId = null;
    isEditingReciboDetails = false;
    reciboForm = {
      numero_recibo: '',
      produto_id: '',
      destino_cidade_id: '',
      numero_reserva: '',
      data_inicio: '',
      data_fim: '',
      valor_total: '',
      tipo_pacote: ''
    };
  }

  async function saveRecibo() {
    const reciboId = editingReciboId;
    const numero = reciboForm.numero_recibo.trim();
    const produtoId = reciboForm.produto_id.trim();
    if (!reciboId) return;
    if (!numero) {
      toast.error('Recibo e obrigatorio.');
      return;
    }
    if (!produtoId) {
      toast.error('Produto e obrigatorio.');
      return;
    }
    savingRecibo = true;
    let saved = false;
    try {
      const res = await fetch('/api/v1/vendas/recibo-edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venda_id: vendaId,
          recibo_id: reciboId,
          numero_recibo: numero,
          produto_id: produtoId,
          destino_cidade_id: reciboForm.destino_cidade_id || null,
          numero_reserva: reciboForm.numero_reserva || null,
          data_inicio: reciboForm.data_inicio || null,
          data_fim: reciboForm.data_fim || null,
          valor_total: reciboForm.valor_total || null,
          tipo_pacote: reciboForm.tipo_pacote || null
        })
      });
      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || 'Erro ao salvar recibo');
        return;
      }
      saved = true;
      // Fecha e reseta o modal imediatamente no sucesso.
      showEditReciboDialog = false;
      isEditingReciboDetails = false;
      editingReciboId = null;
      await carregarVenda();
      toast.success('Recibo atualizado');
    } catch {
      toast.error('Erro ao salvar recibo');
    } finally {
      savingRecibo = false;
      if (saved) {
        reciboForm = {
          numero_recibo: '',
          produto_id: '',
          destino_cidade_id: '',
          numero_reserva: '',
          data_inicio: '',
          data_fim: '',
          valor_total: '',
          tipo_pacote: ''
        };
      }
    }
  }

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
    await carregarVenda();
    await loadReciboBaseData();
  });

  async function ensureProduto(produtoId: string) {
    const id = String(produtoId || '').trim();
    if (!id || produtosCache[id] || ensuringProdutos.has(id)) return;
    ensuringProdutos.add(id);
    try {
      const response = await fetch(`/api/v1/produtos/${encodeURIComponent(id)}`);
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.id) {
        produtosCache[id] = { id: String(payload.id), nome: payload.nome || 'Produto' };
        produtosCache = { ...produtosCache };
      }
    } catch {
      // ignorar
    } finally {
      ensuringProdutos.delete(id);
    }
  }

  async function carregarVenda() {
    try {
      loading = true;
      error = null;

      const response = await fetch(`/api/v1/vendas/${vendaId}`);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          toast.error('Sessão expirada. Faça login novamente para continuar.');
          const next = `${$page.url.pathname}${$page.url.search}`;
          await goto(`/auth/login?next=${encodeURIComponent(next)}`);
          return;
        }
        if (response.status === 403) {
          error = 'Você não tem permissão para acessar esta venda';
          await goto('/vendas');
          return;
        }
        if (response.status === 404) {
          error = 'Venda não encontrada';
          return;
        }
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      venda = data;

      if (venda?.status === 'aberto') {
        venda.status = 'pendente';
      }

      if (Array.isArray(venda?.recibos)) {
        const ids = new Set<string>();
        venda.recibos.forEach((r: any) => {
          if (r?.produto_resolvido_id) ids.add(String(r.produto_resolvido_id));
          if (r?.produto_id) ids.add(String(r.produto_id));
        });
        await Promise.all(Array.from(ids).map((id) => ensureProduto(id)));
      }
    } catch (err: any) {
      error = `Erro ao carregar dados da venda: ${err.message}`;
      toast.error('Erro ao carregar venda');
    } finally {
      loading = false;
    }
  }

  async function handleCancelar() {
    if (!confirm('Tem certeza que deseja cancelar esta venda?')) return;

    processando = true;
    try {
      const response = await fetch(`/api/v1/vendas/${vendaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelada', cancelada: true })
      });

      if (!response.ok) throw new Error('Erro ao cancelar');

      venda.status = 'cancelada';
      venda.cancelada = true;
      toast.success('Venda cancelada com sucesso!');
    } catch (err) {
      toast.error('Erro ao cancelar venda');
    } finally {
      processando = false;
    }
  }

  async function handleExcluir() {
    if (!confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) return;

    try {
      const response = await fetch(`/api/v1/vendas/${vendaId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast.success('Venda excluída');
      goto('/vendas');
    } catch (err) {
      toast.error('Erro ao excluir venda');
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    const raw = String(dateString).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    }
    return new Date(raw).toLocaleDateString('pt-BR');
  }

  function getReciboCidade(recibo: any): string {
    return String(recibo?.destino_cidade?.nome || venda?.destino_cidade?.nome || '').trim() || 'Não informada';
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'confirmada': return 'bg-green-100 text-green-700 border-green-200';
      case 'pendente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelada': return 'bg-red-100 text-red-700 border-red-200';
      case 'concluida': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      confirmada: 'Confirmada',
      pendente: 'Pendente',
      cancelada: 'Cancelada',
      concluida: 'Concluída'
    };
    return labels[status] || status;
  }

  $: valorTotal = Number(venda?.valor_total || 0);
  $: valorTaxas = Number(venda?.valor_taxas || 0);
  $: valorLiquido = valorTotal - valorTaxas;
  $: quantidadeRecibos = venda?.recibos?.length || 0;
  $: totalRecibosValor = Array.isArray(venda?.recibos)
    ? venda.recibos.reduce((acc: number, item: any) => acc + Number(item.valor_total || 0), 0)
    : 0;
  $: totalPagamentosValor = Array.isArray(venda?.pagamentos)
    ? venda.pagamentos.reduce((acc: number, item: any) => acc + Number(item.valor_total || 0), 0)
    : totalRecibosValor > 0
      ? totalRecibosValor
      : Number(venda?.valor_total_pago || 0);
  $: destinosVenda = Array.isArray(venda?.recibos)
    ? Array.from(
        new Set(
          venda.recibos
            .map((recibo: any) => String(recibo?.destino_cidade?.nome || '').trim())
            .filter(Boolean)
        )
      )
    : [];
  $: destinoResumo = destinosVenda.join(', ') || venda?.destino_cidade?.nome || venda?.destino?.nome || venda?.destino || 'Não informado';
  $: diferencaFinanceira = Number((totalPagamentosValor - totalRecibosValor).toFixed(2));
  $: fechamentoFinanceiroOk = Math.abs(diferencaFinanceira) < 0.01;
  $: conciliacaoPendente = venda?.conciliado === false;
  $: vendaPendente = venda?.status === 'pendente';
  $: isDonoVenda = !!venda?.vendedor_id && venda.vendedor_id === $permissoes.userId;
  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || $permissoes.isMaster || $permissoes.isGestor || isDonoVenda || permissoes.can('vendas', 'edit');
  $: canDelete = !$permissoes.ready || $permissoes.isSystemAdmin || $permissoes.isMaster || $permissoes.isGestor || isDonoVenda || permissoes.can('vendas', 'delete');
  $: canCancel = !$permissoes.ready || $permissoes.isSystemAdmin || $permissoes.isMaster || $permissoes.isGestor || permissoes.can('vendas', 'edit') || permissoes.can('vendas', 'delete');
  $: alertaOperacionalClasse = vendaPendente
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : conciliacaoPendente || !fechamentoFinanceiroOk
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-green-200 bg-green-50 text-green-700';
  $: produtoSelectOptions = [
    { value: '', label: 'Selecione um produto' },
    ...produtosBase
      .slice()
      .sort((left, right) => String(left.nome || '').localeCompare(String(right.nome || ''), 'pt-BR'))
      .map((produto) => ({ value: produto.id, label: produto.nome }))
  ];
  $: cidadeSelectOptions = [
    { value: '', label: 'Selecione uma cidade' },
    ...cidadesBase
      .slice()
      .sort((left, right) => String(left.label || left.nome || '').localeCompare(String(right.label || right.nome || ''), 'pt-BR'))
      .map((cidade) => ({ value: cidade.id, label: cidade.label || cidade.nome || cidade.id }))
  ];
  $: tipoPacoteOptions = [
    { value: '', label: 'Selecione um tipo de pacote' },
    ...tiposPacoteBase
      .slice()
      .sort((left, right) => String(left.nome || '').localeCompare(String(right.nome || ''), 'pt-BR'))
      .map((tipo) => ({ value: tipo.nome, label: tipo.nome }))
  ];
</script>

<svelte:head>
  <title>{venda ? `Venda ${venda.codigo || vendaIdSafe.slice(0, 8).toUpperCase()}` : 'Venda'} | VTUR</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center h-64">
    <Loader2 size={32} class="animate-spin text-vendas-600" />
    <span class="ml-2 text-slate-600">Carregando...</span>
  </div>
{:else if error}
  <div class="text-center py-12">
    <p class="text-red-600 mb-4">{error}</p>
    <Button variant="secondary" on:click={() => goto('/vendas')}>
      <ArrowLeft size={16} class="mr-2" />
      Voltar para Vendas
    </Button>
  </div>
{:else if venda}
  <PageHeader
    title="Venda {venda.codigo || vendaIdSafe.slice(0, 8).toUpperCase()}"
    subtitle="Criada em {formatDate(venda.created_at || venda.data_lancamento)} • Vendedor: {venda.vendedor?.nome || venda.vendedor || 'Não informado'}"
    color="vendas"
    breadcrumbs={[
      { label: 'Vendas', href: '/vendas' },
      { label: venda.codigo || 'Detalhes' }
    ]}
    actions={[
      ...(canEdit ? [{
        label: 'Editar',
        href: `/vendas/${vendaId}/editar`,
        variant: 'secondary' as const,
        icon: Edit
      }, {
        label: 'Mesclar',
        onClick: () => (showMesclar = true),
        variant: 'outline' as const,
        icon: Merge
      }] : []),
      {
        label: 'Voltar',
        href: '/vendas',
        variant: 'secondary' as const,
        icon: ArrowLeft
      }
    ]}
  />

  <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p>
      <p class="text-sm text-slate-500">Resumo da venda com foco em status operacional, conciliação, fechamento financeiro e estabilidade do caso.</p>
    </div>
  </div>

  <div class="vtur-kpi-grid mb-6">
    <Button
      variant="unstyled"
      class_name={`vtur-kpi-card w-full border-t-[3px] text-left ${vendaPendente ? 'border-t-amber-400' : venda?.status === 'cancelada' ? 'border-t-red-400' : venda?.status === 'concluida' ? 'border-t-blue-400' : 'border-t-green-400'}`}
      on:click={() => goto('/vendas')}
    >
      <div class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${vendaPendente ? 'bg-amber-50 text-amber-500' : venda?.status === 'cancelada' ? 'bg-red-50 text-red-500' : venda?.status === 'concluida' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}><FileText size={18} /></div>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-slate-500 sm:text-sm">Status operacional</p>
        <p class="truncate text-lg font-bold text-slate-900 sm:text-2xl">{getStatusLabel(venda.status)}</p>
      </div>
    </Button>

    <Button
      variant="unstyled"
      class_name={`vtur-kpi-card w-full border-t-[3px] text-left ${conciliacaoPendente ? 'border-t-red-400' : 'border-t-green-400'}`}
      on:click={() => goto('/financeiro/conciliacao')}
    >
      <div class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${conciliacaoPendente ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}><Shield size={18} /></div>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-slate-500 sm:text-sm">Conciliacao</p>
        <p class="text-lg font-bold text-slate-900 sm:text-2xl">{conciliacaoPendente ? 'Pendente' : 'OK'}</p>
      </div>
    </Button>

    <Button
      variant="unstyled"
      class_name={`vtur-kpi-card w-full border-t-[3px] text-left ${fechamentoFinanceiroOk ? 'border-t-green-400' : 'border-t-amber-400'}`}
      on:click={() => goto('/financeiro/caixa')}
    >
      <div class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${fechamentoFinanceiroOk ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500'}`}><AlertCircle size={18} /></div>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-slate-500 sm:text-sm">Diferenca financeira</p>
        <p class="truncate text-lg font-bold text-slate-900 sm:text-2xl">{formatCurrency(diferencaFinanceira)}</p>
      </div>
    </Button>

    <Button
      variant="unstyled"
      class_name={`vtur-kpi-card w-full border-t-[3px] text-left ${!vendaPendente && !conciliacaoPendente && fechamentoFinanceiroOk ? 'border-t-green-400' : 'border-t-slate-400'}`}
      on:click={() => goto('/vendas')}
    >
      <div class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${!vendaPendente && !conciliacaoPendente && fechamentoFinanceiroOk ? 'bg-green-50 text-green-500' : 'bg-slate-100 text-slate-500'}`}><CheckCircle size={18} /></div>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-slate-500 sm:text-sm">Situacao geral</p>
        <p class="text-lg font-bold text-slate-900 sm:text-2xl">{!vendaPendente && !conciliacaoPendente && fechamentoFinanceiroOk ? 'Estavel' : 'Atencao'}</p>
      </div>
    </Button>
  </div>

  <div class="mb-6 p-4 rounded-lg border {getStatusColor(venda.status)} {venda.cancelada ? 'opacity-75' : ''}">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-3">
        <span class="text-lg font-semibold">Status: {getStatusLabel(venda.status)}</span>
        {#if venda.cancelada}
          <span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">CANCELADA</span>
        {/if}
      </div>
      <div class="text-sm opacity-75">Última atualização: {formatDate(venda.updated_at || venda.data_venda)}</div>
    </div>
  </div>

  <div class="mb-6 rounded-lg border px-4 py-3 {alertaOperacionalClasse}">
    {#if vendaPendente}
      <p class="text-sm font-semibold">Venda com pendência operacional</p>
      <p class="mt-1 text-sm">Esta venda ainda está pendente e precisa de acompanhamento até confirmação final.</p>
    {:else if conciliacaoPendente && !fechamentoFinanceiroOk}
      <p class="text-sm font-semibold">Conciliação e financeiro em aberto</p>
      <p class="mt-1 text-sm">A venda não está conciliada e há diferença entre recibos e pagamentos de {formatCurrency(diferencaFinanceira)}.</p>
    {:else if conciliacaoPendente}
      <p class="text-sm font-semibold">Conciliação pendente</p>
      <p class="mt-1 text-sm">Os valores batem, mas a venda ainda não foi marcada como conciliada.</p>
    {:else if !fechamentoFinanceiroOk}
      <p class="text-sm font-semibold">Diferença financeira identificada</p>
      <p class="mt-1 text-sm">Há diferença entre recibos e pagamentos de {formatCurrency(diferencaFinanceira)} e vale revisar a composição financeira.</p>
    {:else}
      <p class="text-sm font-semibold">Venda operacionalmente estável</p>
      <p class="mt-1 text-sm">Status, conciliação e fechamento financeiro estão alinhados nesta venda.</p>
    {/if}
  </div>

  <div class="mb-6 rounded-lg border px-4 py-3 {fechamentoFinanceiroOk ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}">
    {#if fechamentoFinanceiroOk}
      <p class="text-sm font-medium">Recibos e pagamentos estão conciliados nesta venda.</p>
    {:else}
      <p class="text-sm font-medium">Há diferença entre recibos e pagamentos: {formatCurrency(diferencaFinanceira)}</p>
    {/if}
  </div>

  <div class="vtur-kpi-grid mb-6">
    <KPICard title="Valor Total" value={formatCurrency(valorTotal)} color="vendas" icon={TrendingUp} />
    <KPICard title="Taxas" value={formatCurrency(valorTaxas)} color="vendas" icon={FileText} />
    <KPICard title="Liquido" value={formatCurrency(valorLiquido)} color="vendas" icon={ShoppingCart} />
    <KPICard title="Recibos" value={quantidadeRecibos} color="vendas" icon={Package} />
  </div>

  <div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">
    Esta venda reúne <strong>{quantidadeRecibos}</strong> recibo(s), total pago de <strong>{formatCurrency(totalPagamentosValor)}</strong> e total em recibos de <strong>{formatCurrency(totalRecibosValor)}</strong>, facilitando a leitura rápida da estabilidade operacional e financeira.
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-6">
      <Card header="Dados do Cliente" color="vendas">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-vendas-100 flex items-center justify-center">
              <User size={20} class="text-vendas-600" />
            </div>
            <div>
              <p class="text-sm text-slate-500">Cliente</p>
              <p class="font-medium text-slate-900">{venda.cliente?.nome || venda.cliente || 'Não informado'}</p>
            </div>
          </div>
          {#if venda.cliente?.email || venda.cliente_email}
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-vendas-100 flex items-center justify-center">
                <Mail size={20} class="text-vendas-600" />
              </div>
              <div>
                <p class="text-sm text-slate-500">Email</p>
                <a href="mailto:{venda.cliente?.email || venda.cliente_email}" class="font-medium text-vendas-600 hover:underline">
                  {venda.cliente?.email || venda.cliente_email}
                </a>
              </div>
            </div>
          {/if}
          {#if venda.cliente?.telefone || venda.cliente_telefone}
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-vendas-100 flex items-center justify-center">
                <Phone size={20} class="text-vendas-600" />
              </div>
              <div>
                <p class="text-sm text-slate-500">Telefone</p>
                <p class="font-medium text-slate-900">{venda.cliente?.telefone || venda.cliente_telefone}</p>
              </div>
            </div>
          {/if}
        </div>
      </Card>

      <Card header="Dados da Venda" color="vendas">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-vendas-100 flex items-center justify-center">
              <Calendar size={20} class="text-vendas-600" />
            </div>
            <div>
              <p class="text-sm text-slate-500">Data da Venda</p>
              <p class="font-medium text-slate-900">{formatDate(venda.data_venda)}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-vendas-100 flex items-center justify-center">
              <MapPin size={20} class="text-vendas-600" />
            </div>
            <div>
              <p class="text-sm text-slate-500">Destino</p>
              <p class="font-medium text-slate-900">{destinoResumo}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-vendas-100 flex items-center justify-center">
              <Calendar size={20} class="text-vendas-600" />
            </div>
            <div>
              <p class="text-sm text-slate-500">Embarque</p>
              <p class="font-medium text-slate-900">{formatDate(venda.data_embarque)}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-vendas-100 flex items-center justify-center">
              <Calendar size={20} class="text-vendas-600" />
            </div>
            <div>
              <p class="text-sm text-slate-500">Data Final</p>
              <p class="font-medium text-slate-900">{formatDate(venda.data_final)}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card header="Recibos" color="vendas">
        {#if venda.recibos && venda.recibos.length > 0}
          <div class="overflow-x-visible md:overflow-x-auto">
            <table class="w-full table-mobile-cards">
              <thead>
                <tr class="border-b border-slate-200">
                  <th class="text-left py-3 px-3 text-sm font-semibold text-slate-600">Recibo</th>
                  <th class="text-left py-3 px-3 text-sm font-semibold text-slate-600">Produto</th>
                  <th class="text-left py-3 px-3 text-sm font-semibold text-slate-600">Cidade</th>
                  <th class="text-center py-3 px-3 text-sm font-semibold text-slate-600">Reserva</th>
                  <th class="text-center py-3 px-3 text-sm font-semibold text-slate-600">Período</th>
                  <th class="text-right py-3 px-3 text-sm font-semibold text-slate-600">Valor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each venda.recibos as recibo}
                  <tr
                    class="cursor-pointer hover:bg-slate-50"
                    on:click={() => startEditRecibo(recibo)}
                    on:keydown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        startEditRecibo(recibo);
                      }
                    }}
                    tabindex="0"
                    role="button"
                    aria-label={`Abrir detalhes do recibo ${recibo.numero_recibo || ''}`.trim()}
                  >
                    <td class="py-3 px-3 text-slate-900" data-label="Recibo">
                      <p class="font-medium">{recibo.numero_recibo || 'N/A'}</p>
                    </td>
                    <td class="py-3 px-3 text-slate-700" data-label="Produto">
                      {produtosCache[recibo.produto_resolvido_id || recibo.produto_id]?.nome || recibo.produto_resolvido?.nome || 'N/A'}
                    </td>
                    <td class="py-3 px-3 text-slate-700" data-label="Cidade">{getReciboCidade(recibo)}</td>
                    <td class="py-3 px-3 text-center text-slate-700" data-label="Reserva">{recibo.numero_reserva || '-'}</td>
                    <td class="py-3 px-3 text-center text-slate-700" data-label="Período">{formatDate(recibo.data_inicio)} - {formatDate(recibo.data_fim)}</td>
                    <td class="py-3 px-3 text-right font-medium text-slate-900" data-label="Valor">{formatCurrency(recibo.valor_total)}</td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-slate-200">
                  <td colspan="5" class="py-4 px-3 text-right font-semibold text-slate-900">Total dos Recibos:</td>
                  <td class="py-4 px-3 text-right text-xl font-bold text-vendas-600">{formatCurrency(totalRecibosValor)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        {:else}
          <div class="text-center py-8 text-slate-500">
            <Receipt size={48} class="mx-auto mb-3 opacity-30" />
            <p>Nenhum recibo cadastrado</p>
          </div>
        {/if}
      </Card>

      <Dialog
        bind:open={showEditReciboDialog}
        title="Detalhes do recibo"
        description={canEdit ? 'Revise os dados do recibo. Para alterar, clique em Editar.' : 'Visualizacao dos dados do recibo.'}
        color="vendas"
        size="lg"
        showConfirm={false}
        loading={savingRecibo}
        onCancel={cancelEditRecibo}
        onclose={cancelEditRecibo}
      >
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldInput id="recibo-numero" label="Recibo" bind:value={reciboForm.numero_recibo} required disabled={!canEdit || !isEditingReciboDetails || savingRecibo} />
          <FieldSelect id="recibo-produto" label="Produto" bind:value={reciboForm.produto_id} options={produtoSelectOptions} disabled={!canEdit || !isEditingReciboDetails || savingRecibo} />
          <FieldSelect id="recibo-cidade" label="Cidade" bind:value={reciboForm.destino_cidade_id} options={cidadeSelectOptions} disabled={!canEdit || !isEditingReciboDetails || savingRecibo} />
          <FieldInput id="recibo-reserva" label="Reserva" bind:value={reciboForm.numero_reserva} disabled={!canEdit || !isEditingReciboDetails || savingRecibo} />
          <FieldInput id="recibo-data-inicio" label="Periodo inicial" type="date" bind:value={reciboForm.data_inicio} disabled={!canEdit || !isEditingReciboDetails || savingRecibo} />
          <FieldInput id="recibo-data-fim" label="Periodo final" type="date" bind:value={reciboForm.data_fim} min={reciboForm.data_inicio || null} disabled={!canEdit || !isEditingReciboDetails || savingRecibo} />
          <FieldInput id="recibo-valor" label="Valor" type="number" step="0.01" bind:value={reciboForm.valor_total} disabled={!canEdit || !isEditingReciboDetails || savingRecibo} />
          <FieldSelect id="recibo-tipo-pacote" label="Tipo de Pacote" bind:value={reciboForm.tipo_pacote} options={tipoPacoteOptions} disabled={!canEdit || !isEditingReciboDetails || savingRecibo} />
        </div>
        <svelte:fragment slot="actions">
          {#if canEdit}
            {#if isEditingReciboDetails}
              <Button
                variant="primary"
                color="vendas"
                on:click={saveRecibo}
                loading={savingRecibo}
                disabled={savingRecibo}
              >
                Salvar
              </Button>
            {:else}
              <Button variant="primary" color="vendas" on:click={() => (isEditingReciboDetails = true)}>
                Editar
              </Button>
            {/if}
          {/if}
        </svelte:fragment>
      </Dialog>

      <Card header="Pagamentos" color="vendas">
        {#if venda.pagamentos && venda.pagamentos.length > 0}
          <div class="overflow-x-visible md:overflow-x-auto">
            <table class="w-full table-mobile-cards">
              <thead>
                <tr class="border-b border-slate-200">
                  <th class="text-left py-3 px-3 text-sm font-semibold text-slate-600">Forma</th>
                  <th class="text-center py-3 px-3 text-sm font-semibold text-slate-600">Parcelas</th>
                  <th class="text-center py-3 px-3 text-sm font-semibold text-slate-600">Comissão</th>
                  <th class="text-right py-3 px-3 text-sm font-semibold text-slate-600">Valor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each venda.pagamentos as pagamento}
                  <tr class="hover:bg-slate-50">
                    <td class="py-3 px-3 text-slate-900" data-label="Forma">
                      <p class="font-medium">{pagamento.forma_nome || pagamento.forma_pagamento?.nome || 'N/A'}</p>
                      {#if pagamento.operacao}
                        <p class="text-sm text-slate-500">{pagamento.operacao}</p>
                      {/if}
                    </td>
                    <td class="py-3 px-3 text-center text-slate-700" data-label="Parcelas">{pagamento.parcelas_qtd || pagamento.parcelas?.length || 1}x</td>
                    <td class="py-3 px-3 text-center" data-label="Comissão">
                      <span class="px-2 py-1 text-xs rounded-full {pagamento.paga_comissao !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}">
                        {pagamento.paga_comissao !== false ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right font-medium text-slate-900" data-label="Valor">{formatCurrency(pagamento.valor_total)}</td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-slate-200">
                  <td colspan="3" class="py-4 px-3 text-right font-semibold text-slate-900">Total Pago:</td>
                  <td class="py-4 px-3 text-right text-xl font-bold text-vendas-600">{formatCurrency(totalPagamentosValor)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        {:else}
          <div class="text-center py-8 text-slate-500">
            <CreditCard size={48} class="mx-auto mb-3 opacity-30" />
            <p>Nenhum pagamento cadastrado</p>
          </div>
        {/if}
      </Card>

      {#if venda.notas || venda.observacoes}
        <Card header="Observações" color="vendas">
          <div class="prose prose-slate max-w-none">
            <p class="text-slate-700 whitespace-pre-wrap">{venda.notas || venda.observacoes}</p>
          </div>
        </Card>
      {/if}
    </div>

    <div class="space-y-6">
      <Card header="Ações" color="vendas">
        <div class="space-y-3">
          {#if venda.status !== 'cancelada' && canCancel}
            <Button variant="danger" on:click={handleCancelar} loading={processando} class_name="w-full justify-center">
              <XCircle size={16} class="mr-2" />
              Cancelar Venda
            </Button>
          {/if}

          <div class="grid grid-cols-2 gap-3 pt-3 {venda.status !== 'cancelada' ? 'border-t border-slate-200' : ''}">
            {#if canEdit}
            <Button variant="secondary" on:click={() => goto(`/vendas/${vendaId}/editar`)} class_name="w-full justify-center">
              <Edit size={16} class="mr-2" />
              Editar
            </Button>
            {/if}

            <Button variant="secondary" on:click={() => goto('/vendas')} class_name="w-full justify-center">
              <ArrowLeft size={16} class="mr-2" />
              Voltar
            </Button>
          </div>

          {#if canDelete}
          <Button variant="ghost" class_name="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50" on:click={handleExcluir}>
            <Trash2 size={16} class="mr-2" />
            Excluir Venda
          </Button>
          {/if}
        </div>
      </Card>

      <Card header="Resumo Financeiro" color="vendas">
        <div class="space-y-4">
          <div class="flex justify-between items-center py-2 border-b border-slate-100">
            <span class="text-sm text-slate-500">Valor Total</span>
            <span class="font-semibold text-slate-900">{formatCurrency(venda.valor_total)}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-100">
            <span class="text-sm text-slate-500">Valor Bruto</span>
            <span class="font-semibold text-slate-900">{formatCurrency(venda.valor_total_bruto)}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-100">
            <span class="text-sm text-slate-500">Taxas</span>
            <span class="font-semibold text-slate-900">{formatCurrency(venda.valor_taxas)}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-100">
            <span class="text-sm text-slate-500">Total Pago</span>
            <span class="font-semibold text-slate-900">{formatCurrency(totalPagamentosValor)}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-100">
            <span class="text-sm text-slate-500">Total Recibos</span>
            <span class="font-semibold text-slate-900">{formatCurrency(totalRecibosValor)}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-100">
            <span class="text-sm text-slate-500">Diferença</span>
            <span class="font-semibold {fechamentoFinanceiroOk ? 'text-green-700' : 'text-amber-700'}">{formatCurrency(diferencaFinanceira)}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-100">
            <span class="text-sm text-slate-500">Conciliação</span>
            <span class="font-semibold {conciliacaoPendente ? 'text-red-700' : 'text-green-700'}">{conciliacaoPendente ? 'Pendente' : 'OK'}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-sm text-slate-500">Não Comissionado</span>
            <span class="font-semibold text-slate-900">{formatCurrency(venda.valor_nao_comissionado)}</span>
          </div>
        </div>
      </Card>
    </div>
  </div>
{/if}

<MesclarVendasModal
  bind:open={showMesclar}
  {vendaId}
  vendaCodigo={venda?.codigo || ''}
  onClose={() => (showMesclar = false)}
  onMerged={() => { showMesclar = false; carregarVenda(); }}
/>
