<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldTextarea, FieldSelect } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { extractCvcQuoteFromText } from '$lib/quote/cvcPdfExtractor';
  import type { QuoteDraft, QuoteItemDraft } from '$lib/quote/types';
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
    Plus
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

  const IMPORT_MODE_OPTIONS: { value: ImportMode; label: string }[] = [
    { value: 'produtos', label: 'Produtos' },
    { value: 'circuitos', label: 'Circuitos' },
    { value: 'circuitos_produtos', label: 'Circuitos + Produtos' }
  ];

  // ── Estado principal ──────────────────────────────────────────────────────

  let textInput = '';
  let importMode: ImportMode = 'produtos';
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

  $: clientesFiltrados = clienteBusca.trim().length >= 1
    ? clientes.filter((c) => {
        const q = clienteBusca.toLowerCase();
        return (
          c.nome.toLowerCase().includes(q) ||
          (c.cpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
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

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function formatDate(iso: string | null | undefined) {
    if (!iso) return '-';
    const d = new Date(`${iso}T12:00:00`);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR');
  }

  function itemValido(item: QuoteItemDraft) {
    return Boolean(item.item_type && item.quantity > 0 && item.start_date && item.title && item.total_amount > 0);
  }

  // Itens filtrados com o índice real dentro de draft.items preservado
  $: itensFiltrados = draft
    ? filtrarItens(draft.items, importMode).map((item) => ({
        item,
        realIdx: draft!.items.indexOf(item)
      }))
    : [];
  $: totalGeral = itensFiltrados.reduce((s, e) => s + (e.item.total_amount || 0), 0);
  $: itensPendentes = itensFiltrados.filter((e) => !itemValido(e.item)).length;
  $: canExtract = textInput.trim().length > 0;
  $: canSave = draft !== null && clienteId !== '' && itensFiltrados.length > 0;

  // ── Carregar clientes ─────────────────────────────────────────────────────

  async function carregarClientes() {
    carregandoClientes = true;
    try {
      const res = await fetch('/api/v1/orcamentos/clientes');
      if (res.ok) clientes = await res.json();
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
      const res = await fetch(`/api/v1/orcamentos/cidades-busca?q=${encodeURIComponent(q)}&limite=15`);
      if (res.ok) cidadeResultados = await res.json();
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
      errorMessage = err instanceof Error ? err.message : 'Erro ao extrair itens.';
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
    clienteId = '';
    clienteSelecionado = null;
    clienteBusca = '';
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

      const res = await fetch('/api/v1/orcamentos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: draftParaSalvar,
          client_id: clienteId,
          client_name: clienteSelecionado?.nome || null,
          client_whatsapp: clienteSelecionado?.whatsapp || null,
          client_email: clienteSelecionado?.email || null,
          destino_cidade_id: cidadeId || null,
          data_embarque: dataEmbarque || null,
          data_final: dataFinal || null
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Erro ao salvar.');

      toast.success('Orçamento importado com sucesso!');
      goto(`/orcamentos/${payload.quote_id}`);
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao salvar.';
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
  subtitle="Cole o texto do orçamento CVC, revise os itens extraídos e confirme antes de salvar."
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
          <p class="font-medium text-slate-800">{clienteSelecionado ? clienteSelecionado.nome : '—'}</p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Modo</p>
          <p class="font-medium text-slate-800">{IMPORT_MODE_OPTIONS.find(m => m.value === importMode)?.label ?? '—'}</p>
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
    <div class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle size={16} class="mt-0.5 shrink-0" />
      {errorMessage}
    </div>
  {/if}
  {#if statusMessage && !errorMessage}
    <div class="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      <CheckCircle size={16} class="mt-0.5 shrink-0" />
      {statusMessage}
    </div>
  {/if}

  <!-- ── Texto + configurações ── -->
  <Card title="Fonte da importação">
    <div class="space-y-4">
      <FieldTextarea
        label="Texto do orçamento *"
        placeholder="Cole aqui o texto copiado do orçamento CVC..."
        bind:value={textInput}
        rows={10}
        helper="Cole o texto completo do orçamento. O sistema identificará automaticamente hotéis, pacotes, aéreos e serviços."
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldSelect
          label="Tipo de importação"
          bind:value={importMode}
          options={IMPORT_MODE_OPTIONS.map(m => ({ value: m.value, label: m.label }))}
        />
      </div>
    </div>
  </Card>

  <!-- ── Dados do orçamento ── -->
  <Card title="Dados do orçamento">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

      <!-- Cliente -->
      <div class="relative">
        <label class="mb-1 block text-sm font-medium text-slate-700">Cliente *</label>
        <div class="relative">
          <input
            type="text"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder={carregandoClientes ? 'Carregando clientes...' : 'Buscar cliente por nome ou CPF...'}
            value={clienteSelecionado ? clienteSelecionado.nome : clienteBusca}
            disabled={carregandoClientes}
            on:input={(e) => {
              clienteBusca = e.currentTarget.value;
              clienteId = '';
              clienteSelecionado = null;
              mostrarSugestoesCliente = true;
            }}
            on:focus={() => { mostrarSugestoesCliente = true; }}
            on:blur={() => setTimeout(() => { mostrarSugestoesCliente = false; }, 150)}
          />
          <Search size={15} class="pointer-events-none absolute right-3 top-3 text-slate-400" />
        </div>
        {#if mostrarSugestoesCliente && clienteBusca.trim().length >= 1}
          <div class="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
            {#if clientesFiltrados.length === 0}
              <div class="px-4 py-3 text-sm text-slate-500">Nenhum cliente encontrado.</div>
            {:else}
              {#each clientesFiltrados as c}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                  class="cursor-pointer px-4 py-2.5 text-sm hover:bg-slate-50 {clienteId === c.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-800'}"
                  on:mousedown={(e) => {
                    e.preventDefault();
                    clienteId = c.id;
                    clienteSelecionado = c;
                    clienteBusca = '';
                    mostrarSugestoesCliente = false;
                  }}
                >
                  <div class="font-medium">{c.nome}</div>
                  {#if c.cpf}<div class="text-xs text-slate-400">CPF {c.cpf}</div>{/if}
                </div>
              {/each}
            {/if}
          </div>
        {/if}
        {#if clienteSelecionado}
          <p class="mt-1 text-xs text-green-600">✓ Cliente selecionado</p>
        {/if}
      </div>

      <!-- Cidade de destino -->
      <div class="relative">
        <label class="mb-1 block text-sm font-medium text-slate-700">Cidade de destino</label>
        <div class="relative">
          <input
            type="text"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Buscar cidade..."
            value={cidadeBusca}
            on:input={(e) => handleCidadeBuscaChange(e.currentTarget.value)}
            on:focus={() => { mostrarSugestoesCidade = true; }}
            on:blur={() => setTimeout(() => { mostrarSugestoesCidade = false; }, 150)}
          />
          <Search size={15} class="pointer-events-none absolute right-3 top-3 text-slate-400" />
        </div>
        {#if mostrarSugestoesCidade && cidadeResultados.length > 0}
          <div class="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
            {#each cidadeResultados as cidade}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="cursor-pointer px-4 py-2.5 text-sm hover:bg-slate-50 {cidadeId === cidade.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-800'}"
                on:mousedown={(e) => { e.preventDefault(); selecionarCidade(cidade); }}
              >
                <div class="font-medium">{cidade.nome}</div>
                {#if cidade.subdivisao_nome}
                  <div class="text-xs text-slate-400">{cidade.subdivisao_nome}</div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
        {#if buscandoCidade}
          <p class="mt-1 text-xs text-slate-400">Buscando...</p>
        {/if}
      </div>

      <!-- Datas -->
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Data de embarque</label>
        <input
          type="date"
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          bind:value={dataEmbarque}
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Data de retorno</label>
        <input
          type="date"
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          bind:value={dataFinal}
        />
      </div>
    </div>
  </Card>

  <!-- ── Itens extraídos ── -->
  {#if draft && itensFiltrados.length > 0}
    <Card title="Itens extraídos — {itensFiltrados.length} item(s) · Total: {formatCurrency(totalGeral)}">
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
                <button
                  type="button"
                  class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  disabled={displayIdx === 0}
                  title="Mover para cima"
                  on:click={() => moveItem(realIdx, 'up')}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  disabled={displayIdx === itensFiltrados.length - 1}
                  title="Mover para baixo"
                  on:click={() => moveItem(realIdx, 'down')}
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                  title="Remover item"
                  on:click={() => removeItem(realIdx)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Título *</label>
                <input
                  type="text"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.title || ''}
                  on:change={(e) => updateItem(realIdx, { title: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Tipo *</label>
                <input
                  type="text"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.item_type || ''}
                  on:change={(e) => updateItem(realIdx, { item_type: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Cidade</label>
                <input
                  type="text"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.city_name || ''}
                  on:change={(e) => updateItem(realIdx, { city_name: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Qtd</label>
                <input
                  type="number"
                  min="1"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.quantity || 1}
                  on:change={(e) => updateItem(realIdx, { quantity: Number(e.currentTarget.value) })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Data início *</label>
                <input
                  type="date"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.start_date || ''}
                  on:change={(e) => updateItem(realIdx, { start_date: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Data fim</label>
                <input
                  type="date"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.end_date || ''}
                  on:change={(e) => updateItem(realIdx, { end_date: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Total (R$) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.total_amount || 0}
                  on:change={(e) => updateItem(realIdx, { total_amount: Number(e.currentTarget.value) })}
                />
              </div>
              <div class="flex items-end">
                <span class="text-sm font-semibold text-slate-700">{formatCurrency(item.total_amount || 0)}</span>
              </div>
            </div>

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
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-500">Código</label>
                    <input
                      type="text"
                      class="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                      value={meta.codigo || ''}
                      on:change={(e) => updateCircuitMeta(realIdx, { codigo: e.currentTarget.value })}
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-500">Série</label>
                    <input
                      type="text"
                      class="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                      value={meta.serie || ''}
                      on:change={(e) => updateCircuitMeta(realIdx, { serie: e.currentTarget.value })}
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-500">Tags <span class="font-normal text-slate-400">(uma por linha)</span></label>
                    <textarea
                      class="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                      rows={2}
                      value={(meta.tags || []).join('\n')}
                      on:change={(e) => updateCircuitMeta(realIdx, { tags: e.currentTarget.value.split(/\r?\n/).map(v => v.trim()).filter(Boolean) })}
                    ></textarea>
                  </div>
                </div>

                <!-- Itinerário -->
                <div class="mt-3">
                  <label class="mb-1 block text-xs font-medium text-slate-500">Itinerário <span class="font-normal text-slate-400">(uma cidade por linha)</span></label>
                  <textarea
                    class="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                    rows={3}
                    value={(meta.itinerario || []).join('\n')}
                    on:change={(e) => updateCircuitMeta(realIdx, { itinerario: e.currentTarget.value.split(/\r?\n/).map(v => v.trim()).filter(Boolean) })}
                  ></textarea>
                </div>

                <!-- Dia a dia -->
                <div class="mt-4">
                  <div class="mb-2 flex items-center justify-between">
                    <div>
                      <p class="text-sm font-semibold text-slate-700">Dia a dia</p>
                      <p class="text-xs text-slate-400">Título e descrição de cada etapa do circuito.</p>
                    </div>
                    <button
                      type="button"
                      class="flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                      on:click={() => addCircuitDay(realIdx)}
                    >
                      <Plus size={13} /> Adicionar dia
                    </button>
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
                              <label class="mb-1 block text-xs font-medium text-slate-500">Dia</label>
                              <input
                                type="number"
                                min="1"
                                class="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
                                value={dayData.dia ?? segIdx + 1}
                                on:change={(e) => updateCircuitDayField(realIdx, segIdx, 'dia', Number(e.currentTarget.value) || segIdx + 1)}
                              />
                            </div>
                            <div>
                              <label class="mb-1 block text-xs font-medium text-slate-500">Cidade / Título</label>
                              <input
                                type="text"
                                class="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
                                value={dayData.titulo || ''}
                                on:change={(e) => updateCircuitDayField(realIdx, segIdx, 'titulo', e.currentTarget.value)}
                              />
                            </div>
                            <div class="flex items-end gap-1 pb-0.5">
                              <button
                                type="button"
                                class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                                disabled={segIdx === 0}
                                title="Subir dia"
                                on:click={() => moveCircuitDay(realIdx, segIdx, 'up')}
                              ><ChevronUp size={14} /></button>
                              <button
                                type="button"
                                class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                                disabled={segIdx === circuitDays.length - 1}
                                title="Descer dia"
                                on:click={() => moveCircuitDay(realIdx, segIdx, 'down')}
                              ><ChevronDown size={14} /></button>
                              <button
                                type="button"
                                class="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                                title="Remover dia"
                                on:click={() => removeCircuitDay(realIdx, segIdx)}
                              ><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <div class="mt-2">
                            <label class="mb-1 block text-xs font-medium text-slate-500">Descrição</label>
                            <textarea
                              class="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                              rows={2}
                              value={dayData.descricao || ''}
                              on:change={(e) => updateCircuitDayField(realIdx, segIdx, 'descricao', e.currentTarget.value)}
                            ></textarea>
                          </div>
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
          <p class="text-2xl font-bold text-slate-900">{formatCurrency(totalGeral)}</p>
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
      Nenhum item compatível com o modo "<strong>{IMPORT_MODE_OPTIONS.find(m => m.value === importMode)?.label}</strong>" foi encontrado.
      Tente mudar o tipo de importação ou revise o texto colado.
    </div>
  {/if}

</div>
