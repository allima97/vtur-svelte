<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { RefreshCw, Image, MessageSquare, Tag, Send, Eye, ChevronLeft, ChevronRight, Search } from 'lucide-svelte';

  // ── Types ────────────────────────────────────────────────────────────────────

  type Category = {
    id: string;
    nome: string;
    icone: string;
    sort_order: number;
  };

  type Theme = {
    id: string;
    user_id?: string | null;
    nome: string;
    categoria: string | null;
    categoria_id: string | null;
    asset_url: string;
    logo_url?: string | null;
    logo_path?: string | null;
    greeting_text: string | null;
    mensagem_max_linhas: number | null;
    mensagem_max_palavras: number | null;
    assinatura_max_linhas: number | null;
    assinatura_max_palavras: number | null;
    scope: string | null;
    ativo?: boolean | null;
  };

  type MessageTemplate = {
    id: string;
    user_id?: string | null;
    nome: string;
    titulo: string;
    corpo: string;
    categoria: string | null;
    scope?: string | null;
    ativo?: boolean | null;
  };

  type Cliente = {
    id: string;
    nome: string;
  };

  type AssinaturaForm = {
    linha1: string;
    linha1_font_size: number;
    linha1_italic: boolean;
    linha2: string;
    linha2_font_size: number;
    linha2_italic: boolean;
    linha3: string;
    linha3_font_size: number;
    linha3_italic: boolean;
  };

  type LibraryData = {
    userId: string;
    userRole: string | null;
    isAdmin: boolean;
    currentCompanyId: string | null;
    categories: Category[];
    themes: Theme[];
    messages: MessageTemplate[];
    signature: AssinaturaForm | null;
    settings: { logo_url?: string | null; logo_path?: string | null; consultor_nome?: string | null } | null;
    themeLogoColumnsAvailable: boolean;
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function normalizeText(value?: string | null) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function getPrimeiroNome(nome: string) {
    return (nome || '').trim().split(/\s+/)[0] || '';
  }

  function countWords(text: string) {
    return (text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  function countLines(text: string) {
    return (text || '').split('\n').length;
  }

  /**
   * Detecta saudação automática baseada no nome/categoria do tema.
   * Portabilizado fielmente de CrmIsland.tsx (resolveGreetingByTheme).
   */
  function resolveGreetingByTheme(theme?: Pick<Theme, 'nome' | 'categoria' | 'greeting_text'> | null): string {
    const explicit = String(theme?.greeting_text || '').trim();
    if (explicit) return explicit;
    const source = `${theme?.nome || ''} ${theme?.categoria || ''}`;
    const normalized = normalizeText(source);
    if (normalized.includes('anivers') || normalized.includes('birthday')) return 'Feliz Aniversário!';
    if (normalized.includes('pascoa') || normalized.includes('easter')) return 'Feliz Páscoa!';
    if (normalized.includes('natal') || normalized.includes('christmas')) return 'Feliz Natal!';
    if (
      normalized.includes('ano novo') ||
      normalized.includes('ano-novo') ||
      normalized.includes('anonovo') ||
      normalized.includes('new year')
    ) {
      return 'Feliz Ano Novo!';
    }
    if (normalized.includes('dia das maes') || normalized.includes('mother')) return 'Feliz Dia das Mães!';
    if (normalized.includes('dia dos pais') || normalized.includes('father')) return 'Feliz Dia dos Pais!';
    if (normalized.includes('dia da mulher') || normalized.includes('women')) return 'Feliz Dia da Mulher!';
    if (normalized.includes('viajant') || normalized.includes('travel')) return 'Boas viagens e muitas conquistas!';
    return '';
  }

  /**
   * Remove saudação legada da primeira linha do template.
   * Portabilizado fielmente de CrmIsland.tsx (stripLegacyGreeting).
   */
  function stripLegacyGreeting(message: string): string {
    const raw = String(message || '').replace(/\r/g, '');
    if (!raw.trim()) return '';
    const lines = raw.split('\n');
    const first = normalizeText(lines[0] || '');
    const looksLikeLegacy =
      first.startsWith('prezado') ||
      first.startsWith('prezada') ||
      first.includes('[nome do cliente]') ||
      first.includes('{nome}');
    if (!looksLikeLegacy) return raw;
    return lines.slice(1).join('\n').trimStart();
  }

  /**
   * Substitui variáveis {{nome_cliente}}, {{primeiro_nome}}, {{consultor}} no template.
   */
  function interpolateTemplate(template: string, vars: { nome: string; primeiroNome: string; consultor: string }): string {
    return template
      .replace(/\{\{nome_cliente\}\}/g, vars.nome)
      .replace(/\{\{primeiro_nome\}\}/g, vars.primeiroNome)
      .replace(/\{\{consultor\}\}/g, vars.consultor);
  }

  /**
   * Constrói a URL do preview SVG.
   * Portabilizado fielmente de CrmIsland.tsx (buildPreviewParams).
   */
  function buildPreviewUrl(params: {
    themeId: string;
    themeAssetUrl?: string | null;
    greeting: string;
    primeiroNome: string;
    nomeCompleto: string;
    mensagem: string;
    assinatura: AssinaturaForm;
    logoUrl: string | null;
    textColor?: string;
  }): string {
    const q = new URLSearchParams();
    q.set('theme_id', params.themeId);
    if (params.themeAssetUrl) q.set('theme_asset_url', params.themeAssetUrl);
    if (params.greeting) q.set('titulo', params.greeting);
    const safeNome = String(params.nomeCompleto || params.primeiroNome || 'Cliente').trim();
    q.set('nome', safeNome || 'Cliente');
    const clientName = String(params.primeiroNome || params.nomeCompleto || '').trim();
    if (clientName) q.set('cliente_nome_literal', clientName.endsWith(',') ? clientName : `${clientName},`);
    if (params.mensagem) q.set('corpo', params.mensagem);
    q.set('footer_lead', params.assinatura.linha1 || '');
    if (params.assinatura.linha2) q.set('assinatura', params.assinatura.linha2);
    q.set('cargo_consultor', params.assinatura.linha3 || '');
    q.set('footer_lead_font_size', String(params.assinatura.linha1_font_size || 40));
    q.set('consultant_font_size', String(params.assinatura.linha2_font_size || 40));
    q.set('consultant_role_font_size', String(params.assinatura.linha3_font_size || 24));
    q.set('footer_lead_italic', params.assinatura.linha1_italic ? '1' : '0');
    q.set('consultant_italic', params.assinatura.linha2_italic ? '1' : '0');
    q.set('consultant_role_italic', params.assinatura.linha3_italic ? '1' : '0');
    q.set('signature_font_size', String(params.assinatura.linha2_font_size || 40));
    if (params.logoUrl) q.set('logo_url', params.logoUrl);
    if (params.textColor) q.set('text_color', params.textColor);
    return `/api/v1/cards/render.svg?${q.toString()}`;
  }

  // ── State ────────────────────────────────────────────────────────────────────

  let loading = true;
  let categories: Category[] = [];
  let themes: Theme[] = [];
  let messages: MessageTemplate[] = [];
  let companyLogoUrl: string | null = null;
  let savedSignature: AssinaturaForm | null = null;
  let userRole = '';
  let isAdmin = false;

  // Wizard step: 0=tema, 1=mensagem, 2=preview/envio
  let wizardStep = 0;

  let selectedTheme: Theme | null = null;
  let selectedMessageTemplateId = '';

  // Form fields
  let greeting = '';
  let clienteNome = '';
  let clienteNomeCustom = '';
  let mensagem = '';
  let assinatura: AssinaturaForm = {
    linha1: '',
    linha1_font_size: 40,
    linha1_italic: false,
    linha2: '',
    linha2_font_size: 40,
    linha2_italic: false,
    linha3: '',
    linha3_font_size: 24,
    linha3_italic: false,
  };
  let textColor = '';
  let previewUrl: string | null = null;
  let previewLoading = false;

  // Client search
  let clienteBusca = '';
  let clienteResults: Cliente[] = [];
  let searchingClientes = false;
  let showClienteDropdown = false;

  // Theme filter
  let temaFilter = 'all';

  // Preview modal
  let previewModalOpen = false;

  // Signature save
  let savingSig = false;

  // Debounce for preview
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Derived ──────────────────────────────────────────────────────────────────

  $: primeiroNome = (clienteNomeCustom.trim() || getPrimeiroNome(clienteNome));
  $: maxPalavras = selectedTheme?.mensagem_max_palavras ?? 50;
  $: maxLinhas = selectedTheme?.mensagem_max_linhas ?? 6;
  $: palavrasExcedido = countWords(mensagem) > maxPalavras;
  $: linhasExcedido = countLines(mensagem) > maxLinhas;

  $: activeThemes = themes.filter((t) => t?.ativo !== false);
  $: activeMessages = messages.filter((m) => m?.ativo !== false);

  $: filteredThemes = temaFilter === 'all'
    ? activeThemes
    : activeThemes.filter((t) => {
        const src = normalizeText(`${t.nome} ${t.categoria || ''}`);
        if (temaFilter === 'aniversario') return src.includes('anivers') || src.includes('birthday');
        if (temaFilter === 'natal') return src.includes('natal') || src.includes('christmas');
        if (temaFilter === 'pascoa') return src.includes('pascoa') || src.includes('easter');
        if (temaFilter === 'ano_novo') return src.includes('ano novo') || src.includes('reveillon') || src.includes('new year');
        if (temaFilter === 'dia_das_maes') return src.includes('dia das maes') || src.includes('mother');
        if (temaFilter === 'dia_dos_pais') return src.includes('dia dos pais') || src.includes('father');
        if (temaFilter === 'dia_da_mulher') return src.includes('dia da mulher') || src.includes('women');
        if (temaFilter === 'dia_do_viajante') return src.includes('viajant') || src.includes('travel');
        if (temaFilter === 'geral') return src.includes('geral') || src.includes('general');
        if (temaFilter.startsWith('cat:')) {
          const catId = temaFilter.slice(4);
          return catId && catId === String(t.categoria_id || '');
        }
        return false;
      });

  $: messagesForTheme = selectedTheme
    ? activeMessages.filter((m) => {
        if (!m.categoria) return true;
        const themeNormalized = normalizeText(`${selectedTheme!.nome} ${selectedTheme!.categoria || ''}`);
        const msgCat = normalizeText(m.categoria);
        return themeNormalized.includes(msgCat) || msgCat.includes('geral') || !m.categoria;
      })
    : activeMessages;

  // ── Load ─────────────────────────────────────────────────────────────────────

  async function load() {
    loading = true;
    try {
      const resp = await fetch('/api/v1/crm/library');
      if (!resp.ok) throw new Error(await resp.text());
      const data: LibraryData = await resp.json();
      categories = data.categories || [];
      themes = data.themes || [];
      messages = data.messages || [];
      userRole = data.userRole || '';
      isAdmin = Boolean(data.isAdmin);
      companyLogoUrl = data.settings?.logo_url || null;
      savedSignature = data.signature;

      // Pré-preenche assinatura com dados salvos
      if (savedSignature) {
        assinatura = {
          linha1: (savedSignature as any).linha1 || '',
          linha1_font_size: (savedSignature as any).linha1_font_size || 40,
          linha1_italic: Boolean((savedSignature as any).linha1_italic),
          linha2: (savedSignature as any).linha2 || (data.settings?.consultor_nome || ''),
          linha2_font_size: (savedSignature as any).linha2_font_size || 40,
          linha2_italic: Boolean((savedSignature as any).linha2_italic),
          linha3: (savedSignature as any).linha3 || '',
          linha3_font_size: (savedSignature as any).linha3_font_size || 24,
          linha3_italic: Boolean((savedSignature as any).linha3_italic),
        };
      } else if (data.settings?.consultor_nome) {
        assinatura = { ...assinatura, linha2: data.settings.consultor_nome };
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar CRM.');
    } finally {
      loading = false;
    }
  }

  // ── Client search ─────────────────────────────────────────────────────────────

  let clienteSearchTimer: ReturnType<typeof setTimeout> | null = null;

  async function searchClientes(busca: string) {
    if (!busca.trim()) {
      clienteResults = [];
      showClienteDropdown = false;
      return;
    }
    searchingClientes = true;
    try {
      const resp = await fetch(`/api/v1/clientes/search?q=${encodeURIComponent(busca)}&limit=10`);
      if (!resp.ok) return;
      const data = await resp.json();
      clienteResults = (data.clientes || data.items || data || []).slice(0, 10);
      showClienteDropdown = clienteResults.length > 0;
    } catch {
      clienteResults = [];
    } finally {
      searchingClientes = false;
    }
  }

  function onClienteBuscaInput() {
    if (clienteSearchTimer) clearTimeout(clienteSearchTimer);
    clienteSearchTimer = setTimeout(() => searchClientes(clienteBusca), 300);
  }

  function selectCliente(c: Cliente) {
    clienteNome = c.nome;
    clienteNomeCustom = getPrimeiroNome(c.nome);
    clienteBusca = c.nome;
    showClienteDropdown = false;
    clienteResults = [];
  }

  // ── Theme selection ──────────────────────────────────────────────────────────

  function selectTheme(theme: Theme) {
    selectedTheme = theme;
    greeting = resolveGreetingByTheme(theme);
    selectedMessageTemplateId = '';
    mensagem = '';
  }

  // ── Template selection ───────────────────────────────────────────────────────

  function selectMessageTemplate(template: MessageTemplate) {
    selectedMessageTemplateId = template.id;
    const stripped = stripLegacyGreeting(template.corpo);
    mensagem = interpolateTemplate(stripped, {
      nome: clienteNome || 'Cliente',
      primeiroNome: primeiroNome || 'Cliente',
      consultor: assinatura.linha2 || '',
    });
  }

  // ── Preview ──────────────────────────────────────────────────────────────────

  function schedulePreview() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!selectedTheme) {
        previewUrl = null;
        return;
      }
      previewUrl = buildPreviewUrl({
        themeId: selectedTheme.id,
        themeAssetUrl: selectedTheme.asset_url,
        greeting,
        primeiroNome,
        nomeCompleto: clienteNome || primeiroNome,
        mensagem,
        assinatura,
        logoUrl: companyLogoUrl,
        textColor,
      });
    }, 600);
  }

  $: if (selectedTheme || greeting || clienteNome || clienteNomeCustom || mensagem || assinatura || textColor) {
    schedulePreview();
  }

  // ── Save signature ────────────────────────────────────────────────────────────

  async function saveSignature() {
    savingSig = true;
    try {
      const resp = await fetch('/api/v1/crm/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assinatura }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      toast.success('Assinatura salva com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar assinatura.');
    } finally {
      savingSig = false;
    }
  }

  // ── Wizard navigation ────────────────────────────────────────────────────────

  function nextStep() {
    if (wizardStep < 2) wizardStep++;
  }

  function prevStep() {
    if (wizardStep > 0) wizardStep--;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  onMount(load);

  // ── Temas filter options ─────────────────────────────────────────────────────

  const FILTER_BASE = [
    { label: 'Todos', value: 'all' },
    { label: 'Aniversário', value: 'aniversario' },
    { label: 'Natal', value: 'natal' },
    { label: 'Páscoa', value: 'pascoa' },
    { label: 'Ano Novo', value: 'ano_novo' },
    { label: 'Dia das Mães', value: 'dia_das_maes' },
    { label: 'Dia dos Pais', value: 'dia_dos_pais' },
    { label: 'Dia da Mulher', value: 'dia_da_mulher' },
    { label: 'Dia do Viajante', value: 'dia_do_viajante' },
    { label: 'Geral', value: 'geral' },
  ];

  $: filterOptions = [
    ...FILTER_BASE,
    ...categories
      .filter((c) => {
        const normalized = normalizeText(c.nome);
        const knownBuckets = ['anivers', 'natal', 'pascoa', 'ano novo', 'dia das maes', 'dia dos pais', 'dia da mulher', 'viajant', 'geral'];
        return !knownBuckets.some((b) => normalized.includes(b));
      })
      .map((c) => ({ label: c.nome, value: `cat:${c.id}` })),
  ];
</script>

<svelte:head>
  <title>CRM — Cartões de Relacionamento | VTUR</title>
</svelte:head>

<PageHeader
  title="CRM — Cartões de Relacionamento"
  subtitle="Crie e personalize mensagens e cartões para seus clientes."
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'CRM' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">
    <div class="flex items-center gap-3">
      <div class="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
      Carregando biblioteca CRM...
    </div>
  </div>
{:else}
  <!-- Wizard steps indicator -->
  <div class="mb-6 flex items-center gap-2">
    {#each ['1. Arte', '2. Mensagem', '3. Prévia'] as step, i}
      <button
        class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
          {wizardStep === i ? 'bg-blue-600 text-white' : wizardStep > i ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}"
        on:click={() => (wizardStep = i)}
      >
        {step}
      </button>
      {#if i < 2}
        <div class="h-px w-4 bg-slate-200"></div>
      {/if}
    {/each}
  </div>

  <!-- STEP 0: Selecionar tema de arte -->
  {#if wizardStep === 0}
    <Card color="crm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 class="font-semibold text-slate-800">Escolha a arte</h3>
        <!-- Filter chips -->
        <div class="flex flex-wrap gap-1.5">
          {#each filterOptions as opt}
            <button
              class="rounded-full px-3 py-1 text-xs font-medium transition-colors
                {temaFilter === opt.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
              on:click={() => (temaFilter = opt.value)}
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </div>

      {#if filteredThemes.length === 0}
        <div class="py-12 text-center text-slate-500">
          Nenhuma arte disponível para este filtro.
        </div>
      {:else}
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {#each filteredThemes as theme}
            <button
              class="group relative overflow-hidden rounded-xl border-2 transition-all
                {selectedTheme?.id === theme.id ? 'border-blue-500 shadow-md' : 'border-transparent hover:border-slate-300'}"
              on:click={() => selectTheme(theme)}
            >
              {#if theme.asset_url}
                <img
                  src={theme.asset_url}
                  alt={theme.nome}
                  class="h-32 w-full object-cover"
                  loading="lazy"
                />
              {:else}
                <div class="flex h-32 w-full items-center justify-center bg-slate-100">
                  <Image size={24} class="text-slate-400" />
                </div>
              {/if}
              <div class="p-2 text-left">
                <p class="truncate text-xs font-medium text-slate-700">{theme.nome}</p>
                {#if theme.categoria}
                  <p class="truncate text-xs text-slate-400">{theme.categoria}</p>
                {/if}
              </div>
              {#if selectedTheme?.id === theme.id}
                <div class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              {/if}
            </button>
          {/each}
        </div>
      {/if}

      <div class="mt-4 flex justify-end">
        <Button
          variant="primary"
          color="crm"
          disabled={!selectedTheme}
          on:click={nextStep}
        >
          Continuar
          <ChevronRight size={16} class="ml-1" />
        </Button>
      </div>
    </Card>

  <!-- STEP 1: Compor mensagem -->
  {:else if wizardStep === 1}
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Coluna esquerda: formulário -->
      <Card color="crm">
        <h3 class="mb-4 font-semibold text-slate-800">Compor mensagem</h3>

        <!-- Arte selecionada (mini preview) -->
        {#if selectedTheme}
          <div class="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
            {#if selectedTheme.asset_url}
              <img src={selectedTheme.asset_url} alt={selectedTheme.nome} class="h-12 w-12 rounded-lg object-cover" />
            {:else}
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200">
                <Image size={18} class="text-slate-400" />
              </div>
            {/if}
            <div class="flex-1">
              <p class="text-sm font-medium text-slate-700">{selectedTheme.nome}</p>
            </div>
            <button class="text-xs text-blue-600 hover:underline" on:click={prevStep}>Trocar</button>
          </div>
        {/if}

        <!-- Busca de cliente -->
        <div class="mb-3 relative">
          <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-cliente">
            Cliente
          </label>
          <div class="relative">
            <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="crm-cliente"
              bind:value={clienteBusca}
              on:input={onClienteBuscaInput}
              on:focus={() => { if (clienteResults.length) showClienteDropdown = true; }}
              on:blur={() => setTimeout(() => { showClienteDropdown = false; }, 200)}
              class="vtur-input w-full pl-8"
              placeholder="Buscar cliente..."
              autocomplete="off"
            />
          </div>
          {#if showClienteDropdown && clienteResults.length}
            <div class="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              {#each clienteResults as c}
                <button
                  class="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  on:click={() => selectCliente(c)}
                >
                  {c.nome}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Nome no cartão (editável) -->
        {#if clienteNome}
          <div class="mb-3">
            <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-primeiro-nome">
              Nome no cartão
            </label>
            <input
              id="crm-primeiro-nome"
              bind:value={clienteNomeCustom}
              class="vtur-input w-full"
              placeholder={getPrimeiroNome(clienteNome)}
            />
            <p class="mt-1 text-xs text-slate-400">Exibido no cartão. Padrão: primeiro nome.</p>
          </div>
        {/if}

        <!-- Saudação -->
        <div class="mb-3">
          <label class="mb-1 block text-sm font-medium text-slate-700" for="crm-saudacao">
            Saudação
          </label>
          <input
            id="crm-saudacao"
            bind:value={greeting}
            class="vtur-input w-full"
            placeholder="Ex: Feliz Aniversário!"
          />
        </div>

        <!-- Templates de texto rápidos -->
        {#if activeMessages.length > 0}
          <div class="mb-3">
            <p class="mb-1.5 text-sm font-medium text-slate-700">Texto rápido</p>
            <div class="flex flex-wrap gap-1.5">
              {#each activeMessages.slice(0, 8) as tpl}
                <button
                  class="rounded-full border px-2.5 py-1 text-xs transition-colors
                    {selectedMessageTemplateId === tpl.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}"
                  on:click={() => selectMessageTemplate(tpl)}
                >
                  {tpl.nome}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Textarea da mensagem -->
        <div class="mb-3">
          <label class="mb-1 flex items-center justify-between text-sm font-medium text-slate-700" for="crm-mensagem">
            Mensagem
            <span class="text-xs font-normal {palavrasExcedido || linhasExcedido ? 'text-red-500' : 'text-slate-400'}">
              {countWords(mensagem)}/{maxPalavras} palavras · {countLines(mensagem)}/{maxLinhas} linhas
            </span>
          </label>
          <textarea
            id="crm-mensagem"
            bind:value={mensagem}
            rows="5"
            class="vtur-input w-full resize-none {palavrasExcedido || linhasExcedido ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}"
            placeholder="Escreva sua mensagem... Use {{primeiro_nome}}, {{nome_cliente}}, {{consultor}}"
          ></textarea>
          {#if palavrasExcedido}
            <p class="mt-1 text-xs text-red-500">⚠️ Mensagem excede o limite de {maxPalavras} palavras.</p>
          {/if}
          {#if linhasExcedido}
            <p class="mt-1 text-xs text-red-500">⚠️ Mensagem excede o limite de {maxLinhas} linhas.</p>
          {/if}
        </div>

        <!-- Assinatura -->
        <div class="mb-4">
          <div class="mb-1.5 flex items-center justify-between">
            <p class="text-sm font-medium text-slate-700">Assinatura</p>
            <button
              class="text-xs text-blue-600 hover:underline"
              disabled={savingSig}
              on:click={saveSignature}
            >
              {savingSig ? 'Salvando...' : 'Salvar padrão'}
            </button>
          </div>
          <div class="space-y-2">
            {#each [
              { key: 'linha1' as const, sizeKey: 'linha1_font_size' as const, italicKey: 'linha1_italic' as const, placeholder: 'Linha opcional (ex: Com carinho,)' },
              { key: 'linha2' as const, sizeKey: 'linha2_font_size' as const, italicKey: 'linha2_italic' as const, placeholder: 'Seu nome (obrigatório)' },
              { key: 'linha3' as const, sizeKey: 'linha3_font_size' as const, italicKey: 'linha3_italic' as const, placeholder: 'Seu cargo (opcional)' },
            ] as line, i}
              <div class="flex items-center gap-2">
                <span class="w-4 flex-shrink-0 text-center text-xs text-slate-400">{i + 1}</span>
                <input
                  bind:value={assinatura[line.key]}
                  class="vtur-input flex-1 text-sm"
                  placeholder={line.placeholder}
                  style="font-style: {assinatura[line.italicKey] ? 'italic' : 'normal'}"
                />
                <select
                  bind:value={assinatura[line.sizeKey]}
                  class="vtur-input w-20 text-xs"
                >
                  {#each [12,14,16,18,20,22,24,28,32,36,40,44,48,52,56,60,64] as s}
                    <option value={s}>{s}px</option>
                  {/each}
                </select>
                <button
                  class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-sm font-medium transition-colors
                    {assinatura[line.italicKey] ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}"
                  on:click={() => (assinatura[line.italicKey] = !assinatura[line.italicKey])}
                  title="Itálico"
                  type="button"
                >
                  <em>I</em>
                </button>
              </div>
            {/each}
          </div>
          <p class="mt-1 text-xs text-slate-400">Máx. 3 linhas · 20 palavras no total</p>
        </div>

        <div class="flex justify-between">
          <Button variant="secondary" on:click={prevStep}>
            <ChevronLeft size={16} class="mr-1" />
            Voltar
          </Button>
          <Button variant="primary" color="crm" on:click={nextStep}>
            Prévia
            <ChevronRight size={16} class="ml-1" />
          </Button>
        </div>
      </Card>

      <!-- Coluna direita: mini preview ao vivo -->
      <div class="hidden lg:block">
        <Card color="crm">
          <h3 class="mb-3 font-semibold text-slate-800">Prévia ao vivo</h3>
          {#if selectedTheme && previewUrl}
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img
                src={previewUrl}
                alt="Prévia do cartão"
                class="w-full"
                on:error={() => { previewUrl = selectedTheme?.asset_url || null; }}
              />
            </div>
          {:else if selectedTheme}
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img src={selectedTheme.asset_url} alt={selectedTheme.nome} class="w-full" />
            </div>
          {:else}
            <div class="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
              Nenhuma arte selecionada
            </div>
          {/if}
        </Card>
      </div>
    </div>

  <!-- STEP 2: Prévia final e envio -->
  {:else}
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Preview card -->
      <Card color="crm">
        <h3 class="mb-3 font-semibold text-slate-800">Cartão final</h3>
        {#if selectedTheme && previewUrl}
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={previewUrl}
              alt="Prévia do cartão"
              class="w-full"
              on:error={() => { previewUrl = selectedTheme?.asset_url || null; }}
            />
          </div>
        {:else if selectedTheme}
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img src={selectedTheme.asset_url} alt={selectedTheme.nome} class="w-full" />
          </div>
        {:else}
          <div class="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
            Nenhuma arte selecionada
          </div>
        {/if}

        <!-- Download link -->
        {#if selectedTheme && previewUrl}
          <div class="mt-3 flex gap-2">
            <a
              href={previewUrl.replace('/render.svg', '/render.png')}
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Baixar PNG
            </a>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Baixar SVG
            </a>
          </div>
        {/if}
      </Card>

      <!-- Resumo e ações -->
      <Card color="crm">
        <h3 class="mb-4 font-semibold text-slate-800">Resumo</h3>

        <dl class="space-y-2 text-sm">
          <div class="flex gap-2">
            <dt class="w-24 flex-shrink-0 text-slate-500">Arte:</dt>
            <dd class="font-medium text-slate-800">{selectedTheme?.nome ?? '—'}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-24 flex-shrink-0 text-slate-500">Cliente:</dt>
            <dd class="font-medium text-slate-800">{clienteNome || '(nenhum)'}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-24 flex-shrink-0 text-slate-500">Saudação:</dt>
            <dd class="font-medium text-slate-800">{greeting || '—'}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-24 flex-shrink-0 text-slate-500">Mensagem:</dt>
            <dd class="whitespace-pre-line font-medium text-slate-800 text-xs">{mensagem || '—'}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-24 flex-shrink-0 text-slate-500">Assinatura:</dt>
            <dd class="font-medium text-slate-800">{[assinatura.linha1, assinatura.linha2, assinatura.linha3].filter(Boolean).join(' · ') || '—'}</dd>
          </div>
        </dl>

        {#if palavrasExcedido || linhasExcedido}
          <div class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            ⚠️ A mensagem excede os limites do tema. Edite antes de continuar.
          </div>
        {/if}

        <div class="mt-4 flex justify-between">
          <Button variant="secondary" on:click={prevStep}>
            <ChevronLeft size={16} class="mr-1" />
            Editar
          </Button>
          <Button
            variant="primary"
            color="crm"
            disabled={palavrasExcedido || linhasExcedido || !selectedTheme}
            on:click={() => {
              if (previewUrl) window.open(previewUrl, '_blank');
            }}
          >
            <Eye size={16} class="mr-2" />
            Abrir cartão
          </Button>
        </div>
      </Card>
    </div>
  {/if}
{/if}
