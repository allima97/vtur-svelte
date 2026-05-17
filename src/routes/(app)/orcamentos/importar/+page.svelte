<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { AlertMessage, FieldInput, FieldTextarea, FieldSelect } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { toUserMessage } from '$lib/utils/errors';
  import { apiGet, apiPost } from '$lib/services/api';
  import type { PassagemAereaFonte } from '$lib/quote/passagemAereaQuoteImport';
  import type { QuoteDraft, QuoteItemDraft, QuoteSegmentDraft } from '$lib/quote/types';
  import { formatDate as formatDateValue } from '$lib/utils/formatters';
  import {
    ArrowLeft,
    FileText,
    Trash2,
    RefreshCw,
    Save,
    ChevronUp,
    ChevronDown,
    AlertCircle,
    CheckCircle,
    Search,
    Plus,
    Plane
  } from 'lucide-svelte';

  // ── Tipos locais ─────────────────────────────────────────────────────────

  type ClienteOption = {
    id: string;
    nome: string;
    cpf?: string | null;
    whatsapp?: string | null;
    email?: string | null;
  };

  type CidadeOption = {
    id: string;
    nome: string;
    subdivisao_nome?: string | null;
    pais_nome?: string | null;
  };

  type ImportMode = 'produtos' | 'circuitos' | 'circuitos_produtos';
  type ImportKind = 'orcamento' | 'passagem_aerea';
  type ImportarOrcamentoResponse = {
    ok?: boolean;
    quote_id?: string | null;
    status?: string | null;
  };

  const IMPORT_MODE_OPTIONS: { value: ImportMode; label: string }[] = [
    { value: 'produtos', label: 'Produtos' },
    { value: 'circuitos', label: 'Circuitos' },
    { value: 'circuitos_produtos', label: 'Circuitos + Produtos' }
  ];

  const PASSAGEM_FONTE_OPTIONS: { value: PassagemAereaFonte; label: string }[] = [
    { value: 'auto', label: 'Detectar automaticamente' },
    { value: 'rextur', label: 'REXTUR' },
    { value: 'cvc', label: 'Orçamento CVC' }
  ];

  // ── Estado principal ──────────────────────────────────────────────────────

  let textInput = '';
  let importKind: ImportKind = 'orcamento';
  let importMode: ImportMode = 'produtos';
  let passagemFonte: PassagemAereaFonte = 'auto';
  let draft: QuoteDraft | null = null;
  let extracting = false;
  let saving = false;
  let statusMessage = '';
  let errorMessage = '';

  // ── Cliente ───────────────────────────────────────────────────────────────

  let clientes: ClienteOption[] = [];
  let clienteBusca = '';
  let clienteId = '';
  let clienteSelecionado: ClienteOption | null = null;
  let mostrarSugestoesCliente = false;
  let carregandoClientes = false;
  let clienteNomeManual = '';
  let clienteTelefoneManual = '';
  let clienteEmailManual = '';

  /**
   * clienteDisplay: valor que aparece no <input> de busca.
   * Quando um cliente é selecionado, exibe o nome dele.
   * Quando o usuário digita, segue o que foi digitado (clienteBusca).
   * Usamos bind:value no FieldInput para evitar problemas do Flowbite
   * com value= (prop unidirecional) que não reflete corretamente após
   * selecionar uma opção.
   */
  let clienteDisplay = '';

  function handleClienteInput(valor: string) {
    clienteDisplay = valor;
    clienteBusca = valor;
    clienteId = '';
    clienteSelecionado = null;
    mostrarSugestoesCliente = true;
  }

  function selecionarCliente(c: ClienteOption) {
    clienteId = c.id;
    clienteSelecionado = c;
    clienteNomeManual = c.nome;
    clienteTelefoneManual = c.whatsapp || '';
    clienteEmailManual = c.email || '';
    clienteDisplay = c.nome;
    clienteBusca = '';
    mostrarSugestoesCliente = false;
  }

  $: clienteBuscaNormalizada = clienteBusca.toLowerCase();
  $: clienteBuscaNumerica = clienteBuscaNormalizada.replace(/\D/g, '');

  $: clientesFiltrados = clienteBusca.trim().length >= 1
    ? clientes.filter((c) => {
        return (
          c.nome.toLowerCase().includes(clienteBuscaNormalizada) ||
          (c.cpf || '').replace(/\D/g, '').includes(clienteBuscaNumerica)
        );
      }).slice(0, 10)
    : [];

  // ── Cidades ───────────────────────────────────────────────────────────────

  let cidadeId = '';
  let cidadeNome = '';
  let cidadeBusca = '';
  let cidadeResultados: CidadeOption[] = [];
  let buscandoCidade = false;
  let mostrarSugestoesCidade = false;
  let cidadeBuscaTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Datas ─────────────────────────────────────────────────────────────────

  let dataEmbarque = '';
  let dataFinal = '';

  // ── Utilitários ───────────────────────────────────────────────────────────

  function isCircuitItem(item: QuoteItemDraft) {
    return (item.item_type || '').toLowerCase().replace(/[^a-z]/g, '') === 'circuito';
  }

  function filtrarItens(items: QuoteItemDraft[], modo: ImportMode): QuoteItemDraft[] {
    if (modo === 'circuitos') return items.filter(isCircuitItem);
    if (modo === 'produtos') return items.filter((i) => !isCircuitItem(i));
    return items;
  }

  const CURRENCY_FORMATTERS = new Map<string, Intl.NumberFormat>();

  function getCurrencyFormatter(currency: string) {
    const cached = CURRENCY_FORMATTERS.get(currency);
    if (cached) return cached;
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency });
    CURRENCY_FORMATTERS.set(currency, formatter);
    return formatter;
  }

  function formatCurrency(value: number, currency = 'BRL') {
    return getCurrencyFormatter(currency).format(value);
  }

  function formatDate(iso: string | null | undefined) {
    return formatDateValue(iso);
  }

  function itemValido(item: QuoteItemDraft) {
    return Boolean(item.item_type && item.quantity > 0 && item.start_date && item.title && item.total_amount > 0);
  }

  function modoLabel() {
    if (importKind === 'passagem_aerea') return 'Passagem Aérea';
    return IMPORT_MODE_OPTIONS.find((m) => m.value === importMode)?.label ?? '—';
  }

  function getFlightSegments(item: QuoteItemDraft): QuoteSegmentDraft[] {
    return (item.segments || [])
      .filter((seg) => seg.segment_type === 'flight')
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  function flightData(seg: QuoteSegmentDraft) {
    return (seg.data || {}) as Record<string, unknown>;
  }

  function splitTrechoCities(value: unknown) {
    const parts = String(value || '')
      .split(/\s+-\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    return {
      origem: parts[0] || '',
      destino: parts[1] || ''
    };
  }

  function formatFlightAirport(city: string, airport: unknown) {
    const code = String(airport || '').trim();
    if (!city) return code || '-';
    if (!code) return city;
    return /^[A-Z]{3}$/.test(code) ? `${city} (${code})` : code;
  }

  function flightOrigem(data: Record<string, unknown>) {
    const trecho = splitTrechoCities(data.trecho);
    return formatFlightAirport(trecho.origem, data.aeroporto_saida);
  }

  function flightDestino(data: Record<string, unknown>) {
    const trecho = splitTrechoCities(data.trecho);
    return formatFlightAirport(trecho.destino, data.aeroporto_chegada);
  }

  function flightHorarios(data: Record<string, unknown>) {
    return [data.hora_saida, data.hora_chegada]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' / ') || '-';
  }

  function inputValue(event: Event) {
    return (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
  }

  // Itens filtrados com o índice real dentro de draft.items preservado
  $: itensFiltrados = draft
    ? (importKind === 'passagem_aerea' ? draft.items : filtrarItens(draft.items, importMode)).map((item) => ({
        item,
        realIdx: draft!.items.indexOf(item)
      }))
    : [];
  $: itensResumo = itensFiltrados.reduce(
    (acc, entry) => {
      acc.totalGeral += entry.item.total_amount || 0;
      acc.taxasGeral += entry.item.taxes_amount || 0;
      if (!itemValido(entry.item)) acc.itensPendentes += 1;
      return acc;
    },
    { totalGeral: 0, taxasGeral: 0, itensPendentes: 0 }
  );
  $: ({ totalGeral, taxasGeral, itensPendentes } = itensResumo);
  $: totalComTaxas = totalGeral + taxasGeral;
  $: canExtract = textInput.trim().length > 0;
  $: canSave = draft !== null && clienteNomeManual.trim() !== '' && itensFiltrados.length > 0;

  // ── Carregar clientes ─────────────────────────────────────────────────────

  async function carregarClientes() {
    carregandoClientes = true;
    try {
      clientes = await apiGet('/api/v1/orcamentos/clientes');
    } catch {
      toast.error('Não foi possível carregar os clientes.');
    } finally {
      carregandoClientes = false;
    }
  }

  // ── Busca de cidade ───────────────────────────────────────────────────────

  function handleCidadeBuscaChange(valor: string) {
    cidadeBusca = valor;
    cidadeId = '';
    cidadeNome = '';
    mostrarSugestoesCidade = true;
    if (cidadeBuscaTimer) clearTimeout(cidadeBuscaTimer);
    if (!valor.trim()) { cidadeResultados = []; return; }
    cidadeBuscaTimer = setTimeout(() => buscarCidade(valor), 280);
  }

  async function buscarCidade(q: string) {
    buscandoCidade = true;
    try {
      cidadeResultados = await apiGet('/api/v1/orcamentos/cidades-busca', { q, limite: 15 });
    } catch {
      cidadeResultados = [];
    } finally {
      buscandoCidade = false;
    }
  }

  function selecionarCidade(cidade: CidadeOption) {
    cidadeId = cidade.id;
    cidadeNome = cidade.nome;
    const sub = cidade.subdivisao_nome || '';
    cidadeBusca = sub && sub.toLowerCase() !== cidade.nome.toLowerCase()
      ? `${cidade.nome} (${sub})`
      : cidade.nome;
    mostrarSugestoesCidade = false;
    cidadeResultados = [];
  }

  // ── Extração ──────────────────────────────────────────────────────────────

  async function handleExtract() {
    if (!canExtract) return;
    extracting = true;
    errorMessage = '';
    statusMessage = 'Processando texto...';
    draft = null;

    try {
      if (importKind === 'passagem_aerea') {
        const { buildPassagemAereaQuoteDraftFromText } = await import('$lib/quote/passagemAereaQuoteImport');
        const result = buildPassagemAereaQuoteDraftFromText(textInput.trim(), { fonte: passagemFonte });
        draft = result.draft;
        if (!dataEmbarque && result.dataInicio) dataEmbarque = result.dataInicio;
        if (!dataFinal && result.dataFim) dataFinal = result.dataFim;
        if (!cidadeBusca && result.destino) cidadeBusca = result.destino;
        statusMessage = `${result.trechos.length} trecho(s) aéreo(s) extraído(s) como Passagem Aérea.`;
        toast.success(`${result.trechos.length} trecho(s) aéreo(s) identificado(s).`);
        return;
      }

      const { extractCvcQuoteFromText } = await import('$lib/quote/cvcPdfExtractor');
      const result = await extractCvcQuoteFromText(textInput.trim(), {
        onProgress: (msg) => { statusMessage = msg; }
      });

      const items = filtrarItens(result.draft.items, importMode).map((item, idx) => ({
        ...item,
        order_index: idx
      }));

      const subtotal = items.reduce((s, i) => s + (i.total_amount || 0), 0);
      const avgConf = items.length
        ? items.reduce((s, i) => s + (i.confidence || 0), 0) / items.length
        : 0;

      draft = { ...result.draft, items, total: subtotal, average_confidence: avgConf };
      statusMessage = `${items.length} item(s) extraído(s).`;
      toast.success(`${items.length} item(s) identificado(s).`);
    } catch (err: unknown) {
      errorMessage = toUserMessage(err, 'Erro ao extrair itens.');
      toast.error(errorMessage);
      statusMessage = '';
    } finally {
      extracting = false;
    }
  }

  // ── Edição de itens ───────────────────────────────────────────────────────

  function updateItem(index: number, updates: Partial<QuoteItemDraft>) {
    if (!draft) return;
    const items = draft.items.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, ...updates };
      const qty = Math.max(1, Math.round(Number(updated.quantity) || 1));
      const total = Number(updated.total_amount) || 0;
      return { ...updated, quantity: qty, total_amount: total, unit_price: qty > 0 ? total / qty : total };
    });
    const subtotal = items.reduce((s, i) => s + (i.total_amount || 0), 0);
    const avgConf = items.length ? items.reduce((s, i) => s + (i.confidence || 0), 0) / items.length : 0;
    draft = { ...draft, items, total: subtotal, average_confidence: avgConf };
  }

  function moveItem(index: number, dir: 'up' | 'down') {
    if (!draft) return;
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= draft.items.length) return;
    const items = [...draft.items];
    [items[index], items[target]] = [items[target], items[index]];
    draft = { ...draft, items };
  }

  function removeItem(index: number) {
    if (!draft) return;
    const items = draft.items.filter((_, idx) => idx !== index);
    const subtotal = items.reduce((s, i) => s + (i.total_amount || 0), 0);
    const avgConf = items.length ? items.reduce((s, i) => s + (i.confidence || 0), 0) / items.length : 0;
    draft = { ...draft, items, total: subtotal, average_confidence: avgConf };
  }

  // ── Circuito: helpers ─────────────────────────────────────────────────────

  function getCircuitMeta(item: QuoteItemDraft) {
    const raw = (item.raw || {}) as { circuito_meta?: Record<string, unknown> };
    return (raw.circuito_meta || {}) as { codigo?: string; serie?: string; itinerario?: string[]; tags?: string[] };
  }

  function getCircuitDays(item: QuoteItemDraft) {
    return (item.segments || [])
      .filter((seg) => seg.segment_type === 'circuit_day')
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  function updateCircuitMeta(itemIndex: number, updates: Record<string, unknown>) {
    if (!draft) return;
    const items = draft.items.map((item, idx) => {
      if (idx !== itemIndex) return item;
      const raw = (item.raw || {}) as Record<string, unknown>;
      const meta = ((raw.circuito_meta || {}) as Record<string, unknown>);
      return { ...item, raw: { ...raw, circuito_meta: { ...meta, ...updates } } };
    });
    draft = { ...draft, items };
  }

  function updateCircuitSegments(
    itemIndex: number,
    updater: (segs: NonNullable<QuoteItemDraft['segments']>) => NonNullable<QuoteItemDraft['segments']>
  ) {
    if (!draft) return;
    const items = draft.items.map((item, idx) => {
      if (idx !== itemIndex) return item;
      const circuitDays = (item.segments || []).filter((s) => s.segment_type === 'circuit_day');
      const otherSegs = (item.segments || []).filter((s) => s.segment_type !== 'circuit_day');
      const updatedDays = updater(circuitDays).map((s, i) => ({ ...s, order_index: i }));
      return { ...item, segments: [...otherSegs, ...updatedDays] };
    });
    draft = { ...draft, items };
  }

  function addCircuitDay(itemIndex: number) {
    updateCircuitSegments(itemIndex, (segs) => [
      ...segs,
      {
        segment_type: 'circuit_day',
        order_index: segs.length,
        data: { dia: segs.length + 1, titulo: '', descricao: '' }
      }
    ]);
  }

  function removeCircuitDay(itemIndex: number, segIndex: number) {
    updateCircuitSegments(itemIndex, (segs) => segs.filter((_, i) => i !== segIndex));
  }

  function moveCircuitDay(itemIndex: number, segIndex: number, dir: 'up' | 'down') {
    updateCircuitSegments(itemIndex, (segs) => {
      const target = dir === 'up' ? segIndex - 1 : segIndex + 1;
      if (target < 0 || target >= segs.length) return segs;
      const next = [...segs];
      [next[segIndex], next[target]] = [next[target], next[segIndex]];
      return next;
    });
  }

  function updateCircuitDayField(
    itemIndex: number,
    segIndex: number,
    field: 'dia' | 'titulo' | 'descricao',
    value: string | number
  ) {
    updateCircuitSegments(itemIndex, (segs) =>
      segs.map((seg, i) =>
        i === segIndex ? { ...seg, data: { ...(seg.data || {}), [field]: value } } : seg
      )
    );
  }

  function limparTudo() {
    textInput = '';
    draft = null;
    statusMessage = '';
    errorMessage = '';
    passagemFonte = 'auto';
    clienteId = '';
    clienteSelecionado = null;
    clienteBusca = '';
    clienteDisplay = '';
    clienteNomeManual = '';
    clienteTelefoneManual = '';
    clienteEmailManual = '';
  }

  // ── Salvar ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!canSave || !draft) return;
    saving = true;
    errorMessage = '';

    try {
      const draftParaSalvar = {
        ...draft,
        items: itensFiltrados.map((e) => e.item)
      };

      const payload = await apiPost<ImportarOrcamentoResponse>('/api/v1/orcamentos/importar', {
        draft: draftParaSalvar,
        client_id: clienteId || null,
        client_name: clienteNomeManual.trim(),
        client_whatsapp: clienteTelefoneManual.trim() || null,
        client_email: clienteEmailManual.trim() || null,
        destino_cidade_id: cidadeId || null,
        data_embarque: dataEmbarque || null,
        data_final: dataFinal || null
      });

      const quoteId = String(payload?.quote_id || '').trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(quoteId)) {
        throw new Error('Orçamento importado, mas o servidor não retornou o ID para abertura.');
      }

      toast.success('Orçamento importado com sucesso!');
      goto(`/orcamentos/${quoteId}`);
    } catch (err: unknown) {
      errorMessage = toUserMessage(err, 'Erro ao salvar.');
      toast.error(errorMessage);
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    void carregarClientes();
  });
</script>

<svelte:head>
  <title>Importar Orçamento | VTUR</title>
</svelte:head>

<PageHeader
  title="Importar Orçamento"
  subtitle="Cole o texto do orçamento CVC ou de passagem aérea, revise os itens extraídos e confirme antes de salvar."
  color="orcamentos"
  breadcrumbs={[
    { label: 'Orçamentos', href: '/orcamentos' },
    { label: 'Importar' }
  ]}
  actions={[
    { label: 'Voltar', href: '/orcamentos', variant: 'secondary', icon: ArrowLeft }
  ]}
/>

<div class="space-y-6">

  <!-- ── Barra de ações e resumo ── -->
  <Card>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Cliente</p>
          <p class="font-medium text-slate-800">{clienteNomeManual || '—'}</p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Modo</p>
          <p class="font-medium text-slate-800">{modoLabel()}</p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Itens</p>
          <p class="font-medium text-slate-800">{itensFiltrados.length}</p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Pendentes</p>
          <p class="font-medium {itensPendentes > 0 ? 'text-amber-600' : 'text-slate-800'}">{itensPendentes}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" on:click={limparTudo} disabled={extracting || saving}>
          <Trash2 size={15} class="mr-1.5" /> Limpar
        </Button>
        <Button
          variant="primary"
          size="sm"
          on:click={handleExtract}
          loading={extracting}
          disabled={!canExtract || extracting}
        >
          <RefreshCw size={15} class="mr-1.5" /> {extracting ? 'Extraindo...' : 'Extrair itens'}
        </Button>
      </div>
    </div>
  </Card>

  <!-- ── Mensagens de status / erro ── -->
  {#if errorMessage}
    <AlertMessage variant="error" message={errorMessage} />
  {/if}
  {#if statusMessage && !errorMessage}
    <AlertMessage variant="info" message={statusMessage} />
  {/if}

  <!-- ── Texto + configurações ── -->
  <Card title="Fonte da importação">
    <div class="space-y-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant={importKind === 'orcamento' ? 'selected' : 'secondary'}
          class_name="justify-start"
          on:click={() => {
            importKind = 'orcamento';
            draft = null;
            statusMessage = '';
            errorMessage = '';
          }}
        >
          <FileText size={16} class="mr-2" />
          Orçamento completo
        </Button>
        <Button
          type="button"
          variant={importKind === 'passagem_aerea' ? 'selected' : 'secondary'}
          class_name="justify-start"
          on:click={() => {
            importKind = 'passagem_aerea';
            draft = null;
            statusMessage = '';
            errorMessage = '';
          }}
        >
          <Plane size={16} class="mr-2" />
          Passagem Aérea
        </Button>
      </div>

      <FieldTextarea
        label={importKind === 'passagem_aerea' ? 'Texto da passagem aérea *' : 'Texto do orçamento *'}
        placeholder={importKind === 'passagem_aerea'
          ? 'Cole aqui o texto copiado da REXTUR ou do orçamento CVC de aéreo...'
          : 'Cole aqui o texto copiado do orçamento CVC...'}
        bind:value={textInput}
        rows={10}
        helper={importKind === 'passagem_aerea'
          ? 'Aceita o formato tabulado da REXTUR e os formatos de Orçamento CVC com trechos, horários, companhias, taxas e total.'
          : 'Cole o texto completo do orçamento. O sistema identificará automaticamente hotéis, pacotes, aéreos e serviços.'}
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {#if importKind === 'passagem_aerea'}
          <FieldSelect
            label="Fonte da passagem"
            bind:value={passagemFonte}
            options={PASSAGEM_FONTE_OPTIONS.map(m => ({ value: m.value, label: m.label }))}
          />
        {:else}
          <FieldSelect
            label="Tipo de importação"
            bind:value={importMode}
            options={IMPORT_MODE_OPTIONS.map(m => ({ value: m.value, label: m.label }))}
          />
        {/if}
      </div>
    </div>
  </Card>

  <!-- ── Dados do orçamento ── -->
  <Card title="Dados do orçamento">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

      <FieldInput
        label="Nome do cliente *"
        bind:value={clienteNomeManual}
        placeholder="Digite o nome do cliente"
      />

      <FieldInput
        label="Telefone/WhatsApp"
        bind:value={clienteTelefoneManual}
        placeholder="(00) 00000-0000"
      />

      <FieldInput
        label="E-mail"
        type="email"
        bind:value={clienteEmailManual}
        placeholder="cliente@email.com"
      />

      <!-- Cliente cadastrado opcional -->
      <div class="relative">
        <FieldInput
          label="Vincular cliente cadastrado (opcional)"
          icon={Search}
          bind:value={clienteDisplay}
          placeholder={carregandoClientes ? 'Carregando clientes...' : 'Buscar para vincular por nome ou CPF...'}
          disabled={carregandoClientes}
          on:input={(e) => handleClienteInput(inputValue(e))}
          on:focus={() => { mostrarSugestoesCliente = true; }}
          on:blur={() => setTimeout(() => { mostrarSugestoesCliente = false; }, 150)}
        />
        {#if mostrarSugestoesCliente && clienteBusca.trim().length >= 1}
          <div class="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
            {#if clientesFiltrados.length === 0}
              <div class="px-4 py-3 text-sm text-slate-500">Nenhum cliente encontrado.</div>
            {:else}
              {#each clientesFiltrados as c}
                <Button
                  type="button"
                  variant="ghost"
                  class_name="w-full justify-start rounded-none px-4 py-2.5 text-left text-sm hover:!bg-slate-50 {clienteId === c.id ? 'bg-blue-50 font-medium text-blue-700 hover:!bg-blue-50' : 'text-slate-800'}"
                  on:mousedown={(e) => {
                    e.preventDefault();
                    selecionarCliente(c);
                  }}
                >
                  <div class="font-medium">{c.nome}</div>
                  {#if c.cpf}<div class="text-xs text-slate-400">CPF {c.cpf}</div>{/if}
                </Button>
              {/each}
            {/if}
          </div>
        {/if}
        {#if clienteSelecionado}
          <p class="mt-1 text-xs text-green-600">✓ {clienteSelecionado.nome}</p>
        {/if}
      </div>

      <!-- Cidade de destino -->
      <div class="relative">
        <FieldInput
          label="Cidade de destino"
          icon={Search}
          value={cidadeBusca}
          placeholder="Buscar cidade..."
          on:input={(e) => handleCidadeBuscaChange(inputValue(e))}
          on:focus={() => { mostrarSugestoesCidade = true; }}
          on:blur={() => setTimeout(() => { mostrarSugestoesCidade = false; }, 150)}
        />
        {#if mostrarSugestoesCidade && cidadeResultados.length > 0}
          <div class="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
            {#each cidadeResultados as cidade}
              <Button
                type="button"
                variant="ghost"
                class_name="w-full justify-start rounded-none px-4 py-2.5 text-left text-sm hover:!bg-slate-50 {cidadeId === cidade.id ? 'bg-blue-50 font-medium text-blue-700 hover:!bg-blue-50' : 'text-slate-800'}"
                on:mousedown={(e) => { e.preventDefault(); selecionarCidade(cidade); }}
              >
                <div class="font-medium">{cidade.nome}</div>
                {#if cidade.subdivisao_nome}
                  <div class="text-xs text-slate-400">{cidade.subdivisao_nome}</div>
                {/if}
              </Button>
            {/each}
          </div>
        {/if}
        {#if buscandoCidade}
          <p class="mt-1 text-xs text-slate-400">Buscando...</p>
        {/if}
      </div>

      <!-- Datas -->
      <FieldInput label="Data de embarque" type="date" bind:value={dataEmbarque} />
      <FieldInput label="Data de retorno" type="date" bind:value={dataFinal} />
    </div>
  </Card>

  <!-- ── Itens extraídos ── -->
  {#if draft && itensFiltrados.length > 0}
    <Card title="Itens extraídos — {itensFiltrados.length} item(s) · Total: {formatCurrency(totalComTaxas, draft.currency || 'BRL')}">
      <div class="space-y-3">
        {#each itensFiltrados as { item, realIdx }, displayIdx}
          {@const valido = itemValido(item)}
          <div class="rounded-xl border {valido ? 'border-slate-200' : 'border-amber-300 bg-amber-50'} bg-white p-4">
            <div class="mb-3 flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                {#if valido}
                  <CheckCircle size={16} class="text-green-500 shrink-0 mt-0.5" />
                {:else}
                  <AlertCircle size={16} class="text-amber-500 shrink-0 mt-0.5" />
                {/if}
                <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Item {displayIdx + 1} · {item.item_type || 'Sem tipo'} · Confiança: {Math.round((item.confidence || 0) * 100)}%
                </span>
              </div>
              <div class="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  class_name="!p-1 text-slate-400 hover:!bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  disabled={displayIdx === 0}
                  title="Mover para cima"
                  on:click={() => moveItem(realIdx, 'up')}
                >
                  <ChevronUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  class_name="!p-1 text-slate-400 hover:!bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  disabled={displayIdx === itensFiltrados.length - 1}
                  title="Mover para baixo"
                  on:click={() => moveItem(realIdx, 'down')}
                >
                  <ChevronDown size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  class_name="!p-1 text-red-400 hover:!bg-red-50 hover:text-red-600"
                  title="Remover item"
                  on:click={() => removeItem(realIdx)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <FieldInput
                label="Título *"
                value={item.title || ''}
                on:change={(e) => updateItem(realIdx, { title: inputValue(e) })}
              />
              <FieldInput
                label="Tipo *"
                value={item.item_type || ''}
                on:change={(e) => updateItem(realIdx, { item_type: inputValue(e) })}
              />
              <FieldInput
                label="Cidade"
                value={item.city_name || ''}
                on:change={(e) => updateItem(realIdx, { city_name: inputValue(e) })}
              />
              <FieldInput
                label="Qtd"
                type="number"
                min="1"
                value={item.quantity || 1}
                on:change={(e) => updateItem(realIdx, { quantity: Number(inputValue(e)) })}
              />
              <FieldInput
                label="Data início *"
                type="date"
                value={item.start_date || ''}
                on:change={(e) => updateItem(realIdx, { start_date: inputValue(e) })}
              />
              <FieldInput
                label="Data fim"
                type="date"
                value={item.end_date || ''}
                on:change={(e) => updateItem(realIdx, { end_date: inputValue(e) })}
              />
              <FieldInput
                label="Valor sem taxas (R$) *"
                type="number"
                min="0"
                step="0.01"
                value={item.total_amount || 0}
                on:change={(e) => updateItem(realIdx, { total_amount: Number(inputValue(e)) })}
              />
              <FieldInput
                label="Taxas (R$)"
                type="number"
                min="0"
                step="0.01"
                value={item.taxes_amount || 0}
                on:change={(e) => updateItem(realIdx, { taxes_amount: Number(inputValue(e)) })}
              />
              <div class="flex items-end">
                <span class="text-sm font-semibold text-slate-700">{formatCurrency((item.total_amount || 0) + (item.taxes_amount || 0), item.currency || draft.currency || 'BRL')}</span>
              </div>
            </div>

            {#if getFlightSegments(item).length > 0}
              <div class="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table class="min-w-full divide-y divide-slate-200 text-sm table-mobile-cards">
                  <thead class="bg-blue-50 text-xs font-semibold uppercase tracking-wide text-blue-900">
                    <tr>
                      <th class="px-3 py-2 text-left">Cia</th>
                      <th class="px-3 py-2 text-left">Origem</th>
                      <th class="px-3 py-2 text-left">Saída</th>
                      <th class="px-3 py-2 text-left">Destino</th>
                      <th class="px-3 py-2 text-left">Chegada</th>
                      <th class="px-3 py-2 text-left">Horários</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-slate-700">
                    {#each getFlightSegments(item) as seg}
                      {@const data = flightData(seg)}
                      <tr>
                        <td class="px-3 py-2 font-medium">{String(data.cia_aerea || 'AÉREO')}</td>
                        <td class="px-3 py-2">{flightOrigem(data)}</td>
                        <td class="px-3 py-2">{formatDate(String(data.data_voo || data.data_inicio || ''))}</td>
                        <td class="px-3 py-2">{flightDestino(data)}</td>
                        <td class="px-3 py-2">{formatDate(String(data.data_fim || data.data_voo || data.data_inicio || ''))}</td>
                        <td class="px-3 py-2">{flightHorarios(data)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}

            {#if item.start_date && item.end_date && item.end_date !== item.start_date}
              <p class="mt-2 text-xs text-slate-400">
                {formatDate(item.start_date)} → {formatDate(item.end_date)}
              </p>
            {:else if item.start_date}
              <p class="mt-2 text-xs text-slate-400">{formatDate(item.start_date)}</p>
            {/if}

            <!-- ── Painel de circuito ── -->
            {#if isCircuitItem(item)}
              {@const meta = getCircuitMeta(item)}
              {@const circuitDays = getCircuitDays(item)}
              <div class="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">Detalhes do Circuito</p>

                <!-- Meta: Codigo / Serie / Tags -->
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <FieldInput
                    label="Código"
                    value={meta.codigo || ''}
                    on:change={(e) => updateCircuitMeta(realIdx, { codigo: inputValue(e) })}
                  />
                  <FieldInput
                    label="Série"
                    value={meta.serie || ''}
                    on:change={(e) => updateCircuitMeta(realIdx, { serie: inputValue(e) })}
                  />
                  <FieldTextarea
                    label="Tags"
                    rows={2}
                    value={(meta.tags || []).join('\n')}
                    helper="Uma por linha"
                    on:change={(e) => updateCircuitMeta(realIdx, { tags: inputValue(e).split(/\r?\n/).map(v => v.trim()).filter(Boolean) })}
                  />
                </div>

                <!-- Itinerário -->
                <FieldTextarea
                  class_name="mt-3"
                  label="Itinerário"
                  rows={3}
                  value={(meta.itinerario || []).join('\n')}
                  helper="Uma cidade por linha"
                  on:change={(e) => updateCircuitMeta(realIdx, { itinerario: inputValue(e).split(/\r?\n/).map(v => v.trim()).filter(Boolean) })}
                />

                <!-- Dia a dia -->
                <div class="mt-4">
                  <div class="mb-2 flex items-center justify-between">
                    <div>
                      <p class="text-sm font-semibold text-slate-700">Dia a dia</p>
                      <p class="text-xs text-slate-400">Título e descrição de cada etapa do circuito.</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      class_name="gap-1 border-indigo-300 text-indigo-700 hover:!bg-indigo-100"
                      on:click={() => addCircuitDay(realIdx)}
                    >
                      <Plus size={13} /> Adicionar dia
                    </Button>
                  </div>

                  {#if circuitDays.length === 0}
                    <p class="rounded-lg border border-dashed border-slate-300 py-4 text-center text-xs text-slate-400">
                      Nenhum dia encontrado no texto. Use "Adicionar dia" para criar manualmente.
                    </p>
                  {:else}
                    <div class="space-y-2">
                      {#each circuitDays as seg, segIdx}
                        {@const dayData = (seg.data || {}) as { dia?: number; titulo?: string; descricao?: string }}
                        <div class="rounded-lg border border-slate-200 bg-white p-3">
                          <div class="grid grid-cols-3 gap-2 sm:grid-cols-[auto_1fr_auto]">
                            <div class="w-20">
                              <FieldInput
                                label="Dia"
                                type="number"
                                min="1"
                                value={dayData.dia ?? segIdx + 1}
                                on:change={(e) => updateCircuitDayField(realIdx, segIdx, 'dia', Number(inputValue(e)) || segIdx + 1)}
                              />
                            </div>
                            <div>
                              <FieldInput
                                label="Cidade / Título"
                                value={dayData.titulo || ''}
                                on:change={(e) => updateCircuitDayField(realIdx, segIdx, 'titulo', inputValue(e))}
                              />
                            </div>
                            <div class="flex items-end gap-1 pb-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                class_name="!p-1 text-slate-400 hover:!bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                                disabled={segIdx === 0}
                                title="Subir dia"
                                on:click={() => moveCircuitDay(realIdx, segIdx, 'up')}
                              ><ChevronUp size={14} /></Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                class_name="!p-1 text-slate-400 hover:!bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                                disabled={segIdx === circuitDays.length - 1}
                                title="Descer dia"
                                on:click={() => moveCircuitDay(realIdx, segIdx, 'down')}
                              ><ChevronDown size={14} /></Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                class_name="!p-1 text-red-400 hover:!bg-red-50 hover:text-red-600"
                                title="Remover dia"
                                on:click={() => removeCircuitDay(realIdx, segIdx)}
                              ><Trash2 size={14} /></Button>
                            </div>
                          </div>
                          <FieldTextarea
                            class_name="mt-2"
                            label="Descrição"
                            rows={2}
                            value={dayData.descricao || ''}
                            on:change={(e) => updateCircuitDayField(realIdx, segIdx, 'descricao', inputValue(e))}
                          />
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Total e ação de salvar -->
      <div class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <div>
          <p class="text-sm text-slate-500">Total geral</p>
          <p class="text-2xl font-bold text-slate-900">{formatCurrency(totalComTaxas, draft.currency || 'BRL')}</p>
          {#if taxasGeral > 0}
            <p class="mt-1 text-xs text-slate-500">
              Valor {formatCurrency(totalGeral, draft.currency || 'BRL')} + taxas {formatCurrency(taxasGeral, draft.currency || 'BRL')}
            </p>
          {/if}
          {#if itensPendentes > 0}
            <p class="mt-1 text-xs text-amber-600">
              ⚠ {itensPendentes} item(s) com campos obrigatórios em branco — revise antes de salvar.
            </p>
          {/if}
        </div>
        <Button
          variant="primary"
          loading={saving}
          disabled={!canSave || saving}
          on:click={handleSave}
        >
          <Save size={16} class="mr-2" />
          {saving ? 'Salvando...' : 'Salvar orçamento'}
        </Button>
      </div>
    </Card>
  {:else if draft && itensFiltrados.length === 0}
    <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm text-amber-700">
      <FileText size={32} class="mx-auto mb-2 opacity-50" />
      Nenhum item compatível com o modo "<strong>{modoLabel()}</strong>" foi encontrado.
      Tente mudar o tipo de importação ou revise o texto colado.
    </div>
  {/if}

</div>
