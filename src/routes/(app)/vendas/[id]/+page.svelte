<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { FieldInput, FieldSelect, LoadingState } from '$lib/components/ui';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import {
    ArrowLeft, Edit, Trash2, ShoppingCart, User, Mail, Phone,
    Calendar, MapPin, Receipt, CreditCard, FileText, TrendingUp, Package, XCircle,
    AlertCircle, Clock, CheckCircle, Shield, BarChart2, AlertTriangle, Info
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { Merge } from 'lucide-svelte';
  import { formatDate as formatDateValue } from '$lib/utils/formatters';
  import { ApiError, apiDelete, apiFetch, apiGet, apiPatch, apiPost } from '$lib/services/api';
  import { ensureServerSessionCookie } from '$lib/services/session';

  import { confirmAction } from '$lib/stores/confirm';
  const vendaId = $page.params.id;
  const vendaIdSafe = vendaId ?? '';
  const INITIAL_LOAD_RETRY_STATUSES = new Set([0, 404, 503, 504]);
  const BRL_CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  const PT_BR_COLLATOR = new Intl.Collator('pt-BR');

  let venda: any = null;
  let loading = true;
  let loadingHint = 'Carregando os dados da venda...';
  let showLoadingRecovery = false;
  let loadingRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
  let refreshing = false;
  let error: string | null = null;
  let processando = false;
  let showMesclar = false;
  let MesclarVendasModal: any = null;
  let loadingMesclarModal = false;
  let produtosCache: Record<string, { id: string; nome: string }> = {};
  let produtosBase: Array<{ id: string; nome: string; cidade_id?: string | null }> = [];
  let cidadesBase: Array<{ id: string; label?: string | null; nome?: string | null }> = [];
  let tiposPacoteBase: Array<{ id: string; nome: string }> = [];

  // Ranking e Conciliação por recibo
  let rankingRecibos: any[] = [];
  let rankingTotais: any = null;
  let rankingLoading = false;

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
      const data: any = await apiGet('/api/v1/vendas/cadastro-base');
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
      await apiPatch('/api/v1/vendas/recibo-edit', {
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
      });
      saved = true;
      // Fecha e reseta o modal imediatamente no sucesso.
      showEditReciboDialog = false;
      isEditingReciboDetails = false;
      editingReciboId = null;
      await carregarVenda({ preserveData: true });
      toast.success('Recibo atualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar recibo');
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

  async function carregarRankingRecibos() {
    if (!vendaId) return;
    rankingLoading = true;
    try {
      const data: any = await apiGet(`/api/v1/vendas/${vendaId}/ranking-recibos`);
      rankingRecibos = data.recibos || [];
      rankingTotais = data.totais || null;
    } catch (err) {
      // Não bloqueia a tela principal, mas loga para facilitar diagnóstico
      console.warn('[ranking-recibos] erro ao carregar snapshot:', err);
      rankingRecibos = [];
      rankingTotais = null;
    } finally {
      rankingLoading = false;
    }
  }

  async function openMesclarModal() {
    try {
      if (!MesclarVendasModal) {
        loadingMesclarModal = true;
        MesclarVendasModal = (await import('$lib/components/modais/MesclarVendasModal.svelte')).default;
      }
      showMesclar = true;
    } catch {
      toast.error('Erro ao carregar modal de mesclagem.');
    } finally {
      loadingMesclarModal = false;
    }
  }

  onMount(async () => {
    await ensureServerSessionCookie();
    await Promise.all([loadReciboBaseData(), carregarVenda()]);
    if (venda) void carregarRankingRecibos();
  });

  onDestroy(() => {
    stopLoadingRecoveryGuard();
  });

  async function ensureProduto(produtoId: string) {
    const id = String(produtoId || '').trim();
    if (!id || produtosCache[id]) return;
    const produtoBase = produtosBase.find((item) => item.id === id);
    if (produtoBase) {
      produtosCache[id] = { id, nome: produtoBase.nome || 'Produto' };
      produtosCache = { ...produtosCache };
      return;
    }
    produtosCache[id] = { id, nome: 'Produto não encontrado' };
    produtosCache = { ...produtosCache };
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function startLoadingRecoveryGuard(delayMs = 6000) {
    if (loadingRecoveryTimer) clearTimeout(loadingRecoveryTimer);
    showLoadingRecovery = false;
    loadingRecoveryTimer = setTimeout(() => {
      showLoadingRecovery = true;
    }, delayMs);
  }

  function stopLoadingRecoveryGuard() {
    if (loadingRecoveryTimer) {
      clearTimeout(loadingRecoveryTimer);
      loadingRecoveryTimer = null;
    }
    showLoadingRecovery = false;
  }

  function shouldRetryInitialLoad(err: unknown) {
    return err instanceof ApiError && INITIAL_LOAD_RETRY_STATUSES.has(err.status);
  }

  async function applyVendaData(data: any, opts: { loadProdutos?: boolean } = {}) {
    venda = data;

    // Normaliza status legado 'aberto' e deriva status baseado em datas (igual à lógica da listagem)
    if (venda && (!venda.status || venda.status === 'aberto') && !venda.cancelada) {
      const hoje = new Date().toISOString().slice(0, 10);
      if (venda.data_final && venda.data_final < hoje) {
        venda.status = 'concluida';
      } else if (venda.data_embarque && venda.data_embarque >= hoje) {
        venda.status = 'confirmada';
      } else {
        venda.status = 'pendente';
      }
    }

    if (opts.loadProdutos !== false && Array.isArray(venda?.recibos)) {
      const ids = new Set<string>();
      venda.recibos.forEach((r: any) => {
        if (r?.produto_resolvido_id) ids.add(String(r.produto_resolvido_id));
        if (r?.produto_id) ids.add(String(r.produto_id));
      });
      await Promise.all(Array.from(ids).map((id) => ensureProduto(id)));
    }
  }

  async function carregarVenda(opts: { preserveData?: boolean } = {}) {
    const preserveData = opts.preserveData ?? false;
    const fromImport = $page.url.searchParams.get('imported') === '1';
    const fromSave = $page.url.searchParams.get('saved') === '1';
    const fromRecentWrite = fromImport || fromSave;
    const isInitialLoad = !preserveData && !venda;
    const maxAttempts = isInitialLoad && fromRecentWrite ? 6 : 2;
    let lastError: unknown = null;

    refreshing = preserveData && Boolean(venda);
    if (!preserveData || !venda) loading = true;
    loadingHint = fromImport
      ? 'Finalizando a abertura da venda importada...'
      : 'Carregando os dados da venda...';
    error = null;

    if (isInitialLoad) {
      startLoadingRecoveryGuard(fromRecentWrite ? 3500 : 7000);
    }

    if (isInitialLoad && fromRecentWrite) {
      try {
        loadingHint = fromImport ? 'Abrindo a venda importada...' : 'Abrindo a venda...';
        const liteData: any = await apiFetch(`/api/v1/vendas/${vendaId}`, {
          redirectOnForbidden: false,
          redirectOnUnauthorized: false,
          timeoutMs: 6_000,
          query: { lite: 1, t: Date.now() }
        });
        await applyVendaData(liteData, { loadProdutos: false });
        loading = false;
        refreshing = true;
        stopLoadingRecoveryGuard();
        void carregarVenda({ preserveData: true });
        return;
      } catch (err) {
        lastError = err;
        loading = true;
        loadingHint = fromImport
          ? 'A venda foi importada. Estamos tentando abrir a ficha completa...'
          : 'Atualizando os dados da venda...';
        startLoadingRecoveryGuard(3500);
      }
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const data: any = await apiFetch(`/api/v1/vendas/${vendaId}`, {
          redirectOnForbidden: false,
          redirectOnUnauthorized: false,
          timeoutMs: 15_000,
          query: { t: Date.now() }
        });
        await applyVendaData(data);
        loading = false;
        refreshing = false;
        stopLoadingRecoveryGuard();
        return;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxAttempts - 1 && shouldRetryInitialLoad(err)) {
          loadingHint = fromImport
            ? 'A venda foi importada. Estamos sincronizando os dados para abrir a ficha...'
            : fromSave
            ? 'Atualizando os dados da venda...'
            : 'Ainda estamos carregando a venda. Tentando novamente...';
          await sleep(450 * (attempt + 1));
          continue;
        }
        break;
      }
    }

    const err = lastError as any;
    if (preserveData && venda) {
      toast.error('Não foi possível atualizar todos os detalhes agora. A venda permanece aberta.');
      loading = false;
      refreshing = false;
      stopLoadingRecoveryGuard();
      return;
    }

    if (err instanceof ApiError && err.status === 401) {
      toast.error('Sessão expirada. Faça login novamente para continuar.');
      const next = `${$page.url.pathname}${$page.url.search}`;
      await goto(`/auth/login?session_expired=1&next=${encodeURIComponent(next)}`);
    } else if (err instanceof ApiError && err.status === 403) {
      error = 'Você não tem permissão para acessar esta venda';
      await goto('/vendas');
    } else if (err instanceof ApiError && err.status === 404) {
      error = fromImport
        ? 'Venda importada, mas ainda não foi possível abrir a ficha. Volte para Vendas e atualize a lista.'
        : fromSave
        ? 'Não foi possível carregar a venda após salvar. Volte para a lista e abra novamente.'
        : 'Venda não encontrada';
    } else {
      error = `Erro ao carregar dados da venda: ${err?.message || 'falha inesperada'}`;
      toast.error('Erro ao carregar venda');
    }

    loading = false;
    refreshing = false;
    stopLoadingRecoveryGuard();
  }

  async function handleCancelar() {
    if (!(await confirmAction('Tem certeza que deseja cancelar esta venda?'))) return;

    processando = true;
    try {
      await apiPost('/api/v1/vendas/cancel', { venda_id: vendaId });
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
    if (!(await confirmAction('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.'))) return;

    try {
      await apiDelete(`/api/v1/vendas/${vendaId}`);
      toast.success('Venda excluída');
      goto('/vendas');
    } catch (err) {
      toast.error('Erro ao excluir venda');
    }
  }

  function formatCurrency(value: number): string {
    return BRL_CURRENCY_FORMATTER.format(value || 0);
  }

  function formatDate(dateString: string | null): string {
    return formatDateValue(dateString);
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
      .sort((left, right) => PT_BR_COLLATOR.compare(String(left.nome || ''), String(right.nome || '')))
      .map((produto) => ({ value: produto.id, label: produto.nome }))
  ];
  $: cidadeSelectOptions = [
    { value: '', label: 'Selecione uma cidade' },
    ...cidadesBase
      .slice()
      .sort((left, right) => PT_BR_COLLATOR.compare(String(left.label || left.nome || ''), String(right.label || right.nome || '')))
      .map((cidade) => ({ value: cidade.id, label: cidade.label || cidade.nome || cidade.id }))
  ];
  $: tipoPacoteOptions = [
    { value: '', label: 'Selecione um tipo de pacote' },
    ...tiposPacoteBase
      .slice()
      .sort((left, right) => PT_BR_COLLATOR.compare(String(left.nome || ''), String(right.nome || '')))
      .map((tipo) => ({ value: tipo.nome, label: tipo.nome }))
  ];
</script>

<svelte:head>
  <title>{venda ? `Venda ${venda.codigo || vendaIdSafe.slice(0, 8).toUpperCase()}` : 'Venda'} | VTUR</title>
</svelte:head>

{#if loading && !venda}
  <div class="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
    <div class="flex items-start gap-4">
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vendas-50 text-vendas-600">
        <Clock size={20} />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-slate-900">Carregando venda</p>
        <p class="mt-1 text-sm text-slate-500">{loadingHint}</p>
        <div class="mt-4">
          <LoadingState compact={true} />
        </div>
        {#if showLoadingRecovery}
          <div class="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p class="font-semibold">A abertura está demorando mais que o esperado.</p>
            <p class="mt-1">A venda pode já estar salva. Você pode tentar novamente ou voltar para a lista de vendas sem perder a importação.</p>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              color="vendas"
              on:click={() => carregarVenda()}
            >
              Tentar novamente
            </Button>
            <Button
              variant="secondary"
              on:click={() => goto('/vendas')}
            >
              <ArrowLeft size={16} class="mr-2" />
              Voltar para Vendas
            </Button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{:else if error}
  <div class="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-white px-6 py-5 text-center shadow-sm">
    <p class="mb-2 text-base font-semibold text-red-700">Não foi possível abrir a venda agora.</p>
    <p class="mb-5 text-sm text-slate-600">{error}</p>
    <div class="flex flex-wrap justify-center gap-2">
      <Button variant="primary" color="vendas" on:click={() => carregarVenda()}>
        Tentar novamente
      </Button>
      <Button variant="secondary" on:click={() => goto('/vendas')}>
        <ArrowLeft size={16} class="mr-2" />
        Voltar para Vendas
      </Button>
    </div>
  </div>
{:else if !venda}
  <div class="text-center py-12">
    <p class="text-slate-500 mb-4">Venda não encontrada ou sem permissão de acesso.</p>
    <Button variant="secondary" on:click={() => goto('/vendas')}>
      <ArrowLeft size={16} class="mr-2" />
      Voltar para Vendas
    </Button>
  </div>
{:else if venda}
  <PageHeader
    title="Venda {venda.codigo || vendaIdSafe.slice(0, 8).toUpperCase()}"
    subtitle="Criada em {formatDate(venda.created_at || venda.data_lancamento)} • Vendedor: {venda.vendedor?.nome_completo || 'Não informado'}"
    color="vendas"
    breadcrumbs={[
      { label: 'Vendas', href: '/vendas' },
      { label: venda.codigo || 'Detalhes' }
    ]}
    actions={[
      ...(canEdit ? [{
        label: 'Editar',
        href: `/vendas/${vendaId}/editar`,
        variant: 'primary' as const,
        icon: Edit
      }, {
        label: loadingMesclarModal ? 'Carregando...' : 'Mesclar',
        onClick: openMesclarModal,
        variant: 'secondary' as const,
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

  {#if refreshing}
    <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
      <span class="h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
      Atualizando detalhes da venda
    </div>
  {/if}

  <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Painel executivo</p>
      <p class="text-sm text-slate-500">Resumo da venda com foco em status operacional, conciliação, fechamento financeiro e estabilidade do caso.</p>
    </div>
  </div>

  <div class="vtur-kpi-grid mb-6">
    <Button
      variant="unstyled"
      class_name="vtur-kpi-card w-full text-left"
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
      class_name="vtur-kpi-card w-full text-left"
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
      class_name="vtur-kpi-card w-full text-left"
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
      class_name="vtur-kpi-card w-full text-left"
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
            <Button variant="primary" on:click={() => goto(`/vendas/${vendaId}/editar`)} class_name="w-full justify-center">
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
          <Button variant="danger" class_name="w-full justify-center" on:click={handleExcluir}>
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

      <!-- Card: Ranking e Conciliação por Recibo -->
      <Card header="Ranking e Conciliação" color="vendas">

        {#if rankingTotais?.algum_provisorio}
          <div class="mb-3 flex items-center gap-1">
            <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <Clock size={11} /> Provisório — conciliação pendente
            </span>
          </div>
        {/if}

        {#if rankingLoading}
          <LoadingState compact={true} />
        {:else if rankingRecibos.length === 0}
          <p class="text-sm text-slate-400 py-4 text-center">Nenhum recibo encontrado.</p>
        {:else}
          <!-- Alerta de divergência geral -->
          {#if rankingTotais?.algum_diverge}
            <div class="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertTriangle size={15} class="mt-0.5 shrink-0 text-amber-600" />
              <p class="text-xs text-amber-800">
                Um ou mais recibos possuem divergência entre os valores da venda e os valores conciliados.
                O ranking usa o valor conciliado apenas quando a conciliação está confirmada.
              </p>
            </div>
          {/if}

          <!-- Lista de recibos -->
          <div class="space-y-3">
            {#each rankingRecibos as rec (rec.recibo_id)}
              <div class="rounded-lg border {rec.diverge ? 'border-amber-200 bg-amber-50/40' : rec.provisorio ? 'border-slate-200 bg-slate-50/40' : 'border-green-100 bg-green-50/20'} p-3">
                <!-- Cabeçalho do recibo -->
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <Receipt size={13} class="text-slate-400 shrink-0" />
                    <span class="text-sm font-semibold text-slate-800">{rec.numero_recibo || '-'}</span>
                    {#if rec.provisorio}
                      <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        <Clock size={10} /> Prov.
                      </span>
                    {:else if rec.conciliacao_status === 'confirmada'}
                      <span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        <CheckCircle size={10} /> Conciliado
                      </span>
                    {:else if rec.tem_conciliacao}
                      <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        <Clock size={10} /> {rec.conciliacao_status || 'Pendente'}
                      </span>
                    {:else}
                      <span class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        <Info size={10} /> {rec.conciliacao_status || 'Em aberto'}
                      </span>
                    {/if}
                  </div>
                  <span class="text-sm font-bold {rec.provisorio ? 'text-slate-600' : 'text-slate-900'}">
                    {formatCurrency(rec.valor_ranking_efetivo)}
                  </span>
                </div>

                <!-- Linha: valor da venda vs conciliação -->
                <div class="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>
                    <span class="block text-slate-400 mb-0.5">Venda (entrada)</span>
                    <span class="font-medium text-slate-700">{formatCurrency(rec.venda_valor_total)}</span>
                  </div>
                  {#if rec.tem_conciliacao}
                    <div>
                      <span class="block text-slate-400 mb-0.5">Conciliação</span>
                      <span class="font-medium {rec.diverge ? 'text-amber-700' : 'text-green-700'}">
                        {formatCurrency(rec.conc_valor_ranking ?? 0)}
                      </span>
                    </div>
                  {/if}
                </div>

                {#if rec.is_seguro_viagem || rec.ranking_produto_nome}
                  <div class="mt-2 inline-flex items-center gap-1 rounded bg-cyan-50 px-2 py-1 text-xs text-cyan-700 border border-cyan-100">
                    <Package size={11} />
                    Produto de ranking: {rec.ranking_produto_nome || (rec.is_seguro_viagem ? 'Seguro viagem' : 'Diferenciado')}
                  </div>
                {/if}

                <!-- Divergência -->
                {#if rec.diverge && rec.divergencia_valor !== null}
                  <div class="mt-2 flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle size={11} />
                    Diferença: {formatCurrency(Math.abs(rec.divergencia_valor))}
                    {rec.divergencia_valor > 0 ? '(conciliação maior)' : '(conciliação menor)'}
                  </div>
                {/if}
                {#if rec.diverge_taxas && rec.divergencia_taxas !== null}
                  <div class="mt-2 flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle size={11} />
                    Diferença nas taxas: {formatCurrency(Math.abs(rec.divergencia_taxas))}
                    {rec.divergencia_taxas > 0 ? '(conciliação maior)' : '(conciliação menor)'}
                  </div>
                {/if}

                <!-- Rateio -->
                {#if rec.rateio}
                  <div class="mt-2 flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700 border border-indigo-100">
                    <TrendingUp size={11} />
                    Rateio: {rec.rateio.percentual_origem}% origem / {rec.rateio.percentual_destino}% para {rec.rateio.vendedor_destino?.nome_completo || rec.rateio.vendedor_destino_id}
                  </div>
                {/if}

                <!-- Detalhes conciliação (lançamentos, descontos, abatimentos) -->
                {#if rec.conc_meta && (rec.conc_meta.valor_lancamentos > 0 || rec.conc_meta.valor_descontos > 0 || rec.conc_meta.valor_abatimentos > 0)}
                  <div class="mt-2 grid grid-cols-3 gap-1 text-xs text-slate-400">
                    <div>
                      <span class="block">Lançamentos</span>
                      <span class="font-medium text-slate-600">{formatCurrency(rec.conc_meta.valor_lancamentos)}</span>
                    </div>
                    <div>
                      <span class="block">Descontos</span>
                      <span class="font-medium text-slate-600">{formatCurrency(rec.conc_meta.valor_descontos)}</span>
                    </div>
                    <div>
                      <span class="block">Abatimentos</span>
                      <span class="font-medium text-slate-600">{formatCurrency(rec.conc_meta.valor_abatimentos)}</span>
                    </div>
                  </div>
                  {#if rec.conc_meta.valor_nao_comissionavel > 0}
                    <div class="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <span>Não comissionável:</span>
                      <span class="font-medium text-slate-600">{formatCurrency(rec.conc_meta.valor_nao_comissionavel)}</span>
                      <span class="text-slate-300">— deduzido do valor de ranking</span>
                    </div>
                  {/if}
                {/if}
              </div>
            {/each}
          </div>

          <!-- Total -->
          {#if rankingTotais}
            <div class="mt-4 pt-3 border-t border-slate-200">
              <div class="flex justify-between items-center">
                <span class="text-sm font-semibold text-slate-700">Total Ranking</span>
                <span class="text-base font-bold text-slate-900">{formatCurrency(rankingTotais.valor_ranking_efetivo)}</span>
              </div>
              {#if Math.abs(rankingTotais.divergencia_total) > 0.5}
                <div class="mt-1 flex justify-between items-center text-xs text-amber-600">
                  <span>Divergência total venda vs conciliação</span>
                  <span class="font-semibold">{formatCurrency(Math.abs(rankingTotais.divergencia_total))}</span>
                </div>
              {/if}
              {#if Math.abs(rankingTotais.divergencia_taxas_total || 0) > 0.5}
                <div class="mt-1 flex justify-between items-center text-xs text-amber-600">
                  <span>Divergência total de taxas</span>
                  <span class="font-semibold">{formatCurrency(Math.abs(rankingTotais.divergencia_taxas_total || 0))}</span>
                </div>
              {/if}
              <p class="mt-2 text-xs text-slate-400">
                {rankingTotais.algum_provisorio
                  ? 'Valores provisórios até a conciliação ser concluída. O ranking efetivo permanece nos dados da venda enquanto não houver conciliação confirmada.'
                  : 'Valores conciliados. O ranking usa os dados da conciliação.'}
              </p>
            </div>
          {/if}
        {/if}
      </Card>
    </div>
  </div>
{/if}

{#if MesclarVendasModal && showMesclar}
  <svelte:component
    this={MesclarVendasModal}
    bind:open={showMesclar}
    {vendaId}
    vendaCodigo={venda?.codigo || ''}
    onClose={() => (showMesclar = false)}
    onMerged={() => { showMesclar = false; carregarVenda({ preserveData: true }); }}
  />
{/if}
