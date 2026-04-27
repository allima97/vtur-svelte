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
    Search
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

  $: itensFiltrados = draft ? filtrarItens(draft.items, importMode) : [];
  $: totalGeral = itensFiltrados.reduce((s, i) => s + (i.total_amount || 0), 0);
  $: itensPendentes = itensFiltrados.filter((i) => !itemValido(i)).length;
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
        items: itensFiltrados
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
        {#each itensFiltrados as item, idx}
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
                  Item {idx + 1} · {item.item_type || 'Sem tipo'} · Confiança: {Math.round((item.confidence || 0) * 100)}%
                </span>
              </div>
              <div class="flex gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  disabled={idx === 0}
                  title="Mover para cima"
                  on:click={() => moveItem(idx, 'up')}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  disabled={idx === itensFiltrados.length - 1}
                  title="Mover para baixo"
                  on:click={() => moveItem(idx, 'down')}
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                  title="Remover item"
                  on:click={() => removeItem(idx)}
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
                  on:change={(e) => updateItem(idx, { title: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Tipo *</label>
                <input
                  type="text"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.item_type || ''}
                  on:change={(e) => updateItem(idx, { item_type: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Cidade</label>
                <input
                  type="text"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.city_name || ''}
                  on:change={(e) => updateItem(idx, { city_name: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Qtd</label>
                <input
                  type="number"
                  min="1"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.quantity || 1}
                  on:change={(e) => updateItem(idx, { quantity: Number(e.currentTarget.value) })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Data início *</label>
                <input
                  type="date"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.start_date || ''}
                  on:change={(e) => updateItem(idx, { start_date: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Data fim</label>
                <input
                  type="date"
                  class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  value={item.end_date || ''}
                  on:change={(e) => updateItem(idx, { end_date: e.currentTarget.value })}
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
                  on:change={(e) => updateItem(idx, { total_amount: Number(e.currentTarget.value) })}
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
