<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/db/supabase';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect, FieldTextarea } from '$lib/components/ui';
  import { ArrowLeft, Save, Send, Plus, X, FileText, Search, User, Loader2 } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  const orcamentoId = $page.params.id;

  // ─── Tipos ───────────────────────────────────────────────────────────────────
  interface ItemOrcamento {
    id: string;
    title: string;
    product_name: string;
    item_type: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    city_name: string;
    order_index: number;
  }

  interface ClienteOption {
    id: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    cpf?: string | null;
  }

  // ─── Estado do formulário ───────────────────────────────────────────────────
  let formData = {
    client_id: '',
    cliente_nome: '',
    cliente_email: '',
    status: 'pendente',
    status_negociacao: 'novo',
    currency: 'BRL',
    valid_until: '',
    notes: '',
    itens: [makeItem(0)] as ItemOrcamento[]
  };

  let loading = true;
  let saving = false;
  let errors: Record<string, string> = {};
  let orcamentoOriginal: Record<string, unknown> | null = null;

  // ─── Busca de cliente (lazy) ─────────────────────────────────────────────────
  let searchClienteQuery = '';
  let showClienteSearch = false;
  let loadingClientes = false;
  let clientesFiltrados: ClienteOption[] = [];
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── Helpers de itens ───────────────────────────────────────────────────────
  function makeItem(index: number): ItemOrcamento {
    return {
      id: '',
      title: '',
      product_name: '',
      item_type: 'servico',
      quantity: 1,
      unit_price: 0,
      total_amount: 0,
      city_name: '',
      order_index: index
    };
  }

  /** Recalcula total_amount de um item sem re-criar o array inteiro */
  function recalcularItem(index: number) {
    const item = formData.itens[index];
    formData.itens[index] = {
      ...item,
      total_amount: (item.quantity || 0) * (item.unit_price || 0)
    };
    formData.itens = formData.itens;
  }

  $: valorTotal = formData.itens.reduce((acc, item) => acc + (item.total_amount || 0), 0);

  function addItem() {
    formData.itens = [...formData.itens, makeItem(formData.itens.length)];
  }

  function removeItem(index: number) {
    if (formData.itens.length > 1) {
      formData.itens = formData.itens
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, order_index: i }));
    }
  }

  // ─── Carregar orçamento existente ───────────────────────────────────────────────
  async function carregarOrcamento() {
    try {
      loading = true;
      const response = await fetch(`/api/v1/orcamentos/${orcamentoId}`);
      if (!response.ok) {
        const message = (await response.text()) || 'Erro ao carregar orçamento';
        if (response.status === 401) {
          toast.error('Sessão expirada. Faça login novamente para continuar.');
          const next = `${$page.url.pathname}${$page.url.search}`;
          await goto(`/auth/login?next=${encodeURIComponent(next)}`);
          return;
        }
        if (response.status === 403) {
          toast.error(message || 'Você não tem permissão para editar este orçamento.');
          await goto('/orcamentos');
          return;
        }
        if (response.status === 404) {
          toast.error(message || 'Orçamento não encontrado.');
          await goto('/orcamentos');
          return;
        }
        throw new Error(message);
      }

      const data = await response.json();
      orcamentoOriginal = data;

      const itensCarregados: ItemOrcamento[] = (Array.isArray(data.itens) ? data.itens : []).map(
        (item: Record<string, unknown>, index: number) => ({
          id:           String(item.id           ?? ''),
          title:        String(item.title        ?? item.descricao   ?? ''),
          product_name: String(item.product_name ?? item.produto     ?? ''),
          item_type:    String(item.item_type    ?? 'servico'),
          quantity:     Number(item.quantity     ?? item.quantidade  ?? 1),
          unit_price:   Number(item.unit_price   ?? item.valor_unitario ?? 0),
          total_amount: Number(item.total_amount ?? item.valor_total ?? 0),
          city_name:    String(item.city_name    ?? item.cidade      ?? ''),
          order_index:  Number(item.order_index  ?? index)
        })
      );

      formData = {
        client_id:         String(data.client_id  ?? ''),
        cliente_nome:      String(data.cliente?.nome   ?? data.cliente ?? ''),
        cliente_email:     String(data.cliente?.email  ?? data.cliente_email ?? ''),
        status:            String(data.status           ?? 'pendente'),
        status_negociacao: String(data.status_negociacao ?? data.status ?? 'novo'),
        currency:          String(data.currency         ?? 'BRL'),
        valid_until:       String(data.valid_until       ?? data.data_validade ?? ''),
        notes:             String(data.notes             ?? data.observacoes  ?? ''),
        itens: itensCarregados.length > 0 ? itensCarregados : [makeItem(0)]
      };
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar orçamento');
      goto('/orcamentos');
    } finally {
      loading = false;
    }
  }

  // ─── Busca lazy de clientes ───────────────────────────────────────────────────
  async function fetchClientes(query: string) {
    if (query.length < 2) { clientesFiltrados = []; return; }
    loadingClientes = true;
    try {
      const params = new URLSearchParams({ q: query, pageSize: '15' });
      const response = await fetch(`/api/v1/clientes/list?${params.toString()}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      clientesFiltrados = Array.isArray(data.items) ? data.items : [];
    } catch {
      clientesFiltrados = [];
    } finally {
      loadingClientes = false;
    }
  }

  function handleSearchInput() {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    showClienteSearch = true;
    searchDebounceTimer = setTimeout(() => fetchClientes(searchClienteQuery), 300);
  }

  function handleSearchFocus() {
    showClienteSearch = true;
    if (searchClienteQuery.length >= 2 && clientesFiltrados.length === 0) {
      void fetchClientes(searchClienteQuery);
    }
  }

  function handleSearchBlur() {
    setTimeout(() => { showClienteSearch = false; }, 200);
  }

  function selecionarCliente(cliente: ClienteOption) {
    formData.client_id    = cliente.id;
    formData.cliente_nome = cliente.nome;
    formData.cliente_email = cliente.email ?? '';
    searchClienteQuery = '';
    showClienteSearch  = false;
    clientesFiltrados  = [];
    delete errors.cliente;
    errors = errors;
  }

  function limparCliente() {
    formData.client_id    = '';
    formData.cliente_nome  = '';
    formData.cliente_email = '';
    searchClienteQuery = '';
    clientesFiltrados  = [];
  }

  // ─── Sincronizar status ───────────────────────────────────────────────────────
  $: formData.status = formData.status_negociacao;

  // ─── Validade ─────────────────────────────────────────────────────────────────
  function setValidadeDias(dias: number) {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    formData.valid_until = data.toISOString().split('T')[0];
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
      // Falha silenciosa: o carregamento tratará 401 explicitamente.
    }
  }

  onMount(() => {
    void (async () => {
      await ensureServerSessionCookie();
      await carregarOrcamento();
    })();
  });

  onDestroy(() => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  });

  // ─── Validação ────────────────────────────────────────────────────────────────
  function validateForm(): boolean {
    errors = {};
    if (!formData.client_id)    errors.cliente    = 'Selecione um cliente';
    if (!formData.valid_until)  errors.valid_until = 'Data de validade é obrigatória';
    const hasItensValidos = formData.itens.some(i => i.title?.trim() && i.total_amount > 0);
    if (!hasItensValidos)       errors.itens      = 'Adicione pelo menos um item válido com descrição e valor';
    return Object.keys(errors).length === 0;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(enviar = false) {
    if (!validateForm()) {
      toast.error('Corrija os erros no formulário');
      return;
    }
    saving = true;
    try {
      const payload = {
        client_id:         formData.client_id,
        status:            enviar ? 'enviado' : formData.status,
        status_negociacao: enviar ? 'enviado' : formData.status_negociacao,
        currency:          formData.currency,
        valid_until:       formData.valid_until,
        notes:             formData.notes,
        total:             valorTotal,
        itens: formData.itens.map(item => ({
          id:           item.id || undefined,
          title:        item.title,
          product_name: item.product_name || item.title,
          item_type:    item.item_type,
          quantity:     item.quantity,
          unit_price:   item.unit_price,
          total_amount: item.total_amount,
          city_name:    item.city_name,
          order_index:  item.order_index
        }))
      };

      const response = await fetch(`/api/v1/orcamentos/${orcamentoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar orçamento');
      }

      toast.success(enviar
        ? 'Orçamento atualizado e enviado ao cliente!'
        : 'Orçamento atualizado com sucesso!');
      goto(`/orcamentos/${orcamentoId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar orçamento');
    } finally {
      saving = false;
    }
  }

  // ─── Formatação ───────────────────────────────────────────────────────────────
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: formData.currency || 'BRL'
    }).format(value || 0);
  }

  const tiposItem = [
    { value: 'servico',  label: 'Serviço' },
    { value: 'pacote',   label: 'Pacote' },
    { value: 'hotel',    label: 'Hotel' },
    { value: 'passagem', label: 'Passagem' },
    { value: 'passeio',  label: 'Passeio' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'seguro',   label: 'Seguro' },
    { value: 'outro',    label: 'Outro' }
  ];

  const statusOptions = [
    { value: 'novo',      label: 'Novo' },
    { value: 'pendente',  label: 'Pendente' },
    { value: 'enviado',   label: 'Enviado' },
    { value: 'aprovado',  label: 'Aprovado' },
    { value: 'rejeitado', label: 'Rejeitado' },
    { value: 'expirado',  label: 'Expirado' }
  ];
</script>

<svelte:head>
  <title>Editar Orçamento | VTUR</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center h-64">
    <Loader2 size={32} class="animate-spin text-orcamentos-600" />
    <span class="ml-2 text-slate-600">Carregando orçamento...</span>
  </div>
{:else}
  <PageHeader
    title="Editar Orçamento"
    subtitle={`Orçamento: ${(orcamentoOriginal?.codigo as string) || orcamentoId.slice(0, 8)}`}
    color="orcamentos"
    breadcrumbs={[
      { label: 'Orçamentos', href: '/orcamentos' },
      { label: (orcamentoOriginal?.codigo as string) || 'Detalhe', href: `/orcamentos/${orcamentoId}` },
      { label: 'Editar' }
    ]}
  />

  <form on:submit|preventDefault={() => handleSubmit(false)} class="space-y-6">

    <!-- ── Dados do Cliente ─────────────────────────────────────────────────── -->
    <Card header="Dados do Cliente" color="orcamentos">
      <div class="space-y-4">
        <div>
          <label for="orcamento-editar-cliente" class="block text-sm font-medium text-slate-700 mb-1">
            Cliente <span class="text-red-500">*</span>
          </label>

          {#if formData.client_id}
            <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div class="w-10 h-10 rounded-full bg-orcamentos-100 flex items-center justify-center flex-shrink-0">
                <User size={20} class="text-orcamentos-600" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-slate-900 truncate">{formData.cliente_nome}</p>
                <p class="text-sm text-slate-500">{formData.cliente_email || 'Sem email'}</p>
              </div>
              <Button variant="ghost" size="sm" type="button" on:click={limparCliente}>
                <X size={16} />
              </Button>
            </div>
          {:else}
            <div class="relative">
              <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="orcamento-editar-cliente"
                type="text"
                bind:value={searchClienteQuery}
                on:input={handleSearchInput}
                on:focus={handleSearchFocus}
                on:blur={handleSearchBlur}
                placeholder="Buscar cliente por nome, email ou CPF..."
                class="vtur-input pl-10 w-full"
                class:border-red-500={errors.cliente}
                autocomplete="off"
              />

              {#if showClienteSearch && searchClienteQuery.length >= 2}
                <div class="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-60 overflow-auto">
                  {#if loadingClientes}
                    <div class="px-4 py-3 text-sm text-slate-500">Buscando...</div>
                  {:else if clientesFiltrados.length > 0}
                    {#each clientesFiltrados as cliente}
                      <button
                        type="button"
                        on:mousedown|preventDefault={() => selecionarCliente(cliente)}
                        class="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <p class="font-medium text-slate-900">{cliente.nome}</p>
                        <p class="text-sm text-slate-500">
                          {cliente.email || 'Sem email'}{cliente.telefone ? ` • ${cliente.telefone}` : ''}
                        </p>
                      </button>
                    {/each}
                  {:else}
                    <div class="px-4 py-3 text-sm text-slate-500">
                      Nenhum cliente encontrado.
                      <a href="/clientes/novo" class="text-orcamentos-600 hover:underline ml-1" target="_self">
                        Cadastrar novo cliente
                      </a>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>

            {#if errors.cliente}
              <p class="mt-1 text-sm text-red-600">{errors.cliente}</p>
            {/if}
          {/if}
        </div>
      </div>
    </Card>

    <!-- ── Dados do Orçamento ───────────────────────────────────────────────── -->
    <Card header="Dados do Orçamento" color="orcamentos">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

        <FieldSelect
          label="Status"
          bind:value={formData.status_negociacao}
          options={statusOptions}
        />

        <div class="flex gap-2 items-start">
          <FieldInput
            label="Válido até"
            required
            type="date"
            bind:value={formData.valid_until}
            error={errors.valid_until}
            class_name="flex-1"
          />
          <div class="flex gap-1 mt-[1.65rem] shrink-0">
            {#each [7, 15, 30] as dias}
              <button
                type="button"
                on:click={() => setValidadeDias(dias)}
                class="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >{dias}d</button>
            {/each}
          </div>
        </div>

        <FieldSelect
          label="Moeda"
          bind:value={formData.currency}
          options={[
            { value: 'BRL', label: 'Real (R$)' },
            { value: 'USD', label: 'Dólar (US$)' },
            { value: 'EUR', label: 'Euro (€)' }
          ]}
        />
      </div>
    </Card>

    <!-- ── Itens ─────────────────────────────────────────────────────────────────── -->
    <Card header="Itens do Orçamento" color="orcamentos">
      <div class="space-y-3">
        {#each formData.itens as item, index}
          <div class="flex gap-3 items-start p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">

              <div class="md:col-span-4">
                <FieldInput
                  id={`orcamento-editar-item-titulo-${index}`}
                  label="Descrição"
                  bind:value={item.title}
                  placeholder="Ex: Passagem Aérea Ida e Volta"
                  required={true}
                  class_name="w-full"
                />
              </div>

              <div class="md:col-span-2">
                <FieldSelect
                  id={`orcamento-editar-item-tipo-${index}`}
                  label="Tipo"
                  bind:value={item.item_type}
                  options={tiposItem}
                  placeholder={null}
                  class_name="w-full"
                />
              </div>

              <div class="md:col-span-2">
                <FieldInput
                  id={`orcamento-editar-item-destino-${index}`}
                  label="Destino"
                  bind:value={item.city_name}
                  placeholder="Cidade"
                  class_name="w-full"
                />
              </div>

              <div class="md:col-span-1">
                <FieldInput
                  id={`orcamento-editar-item-quantidade-${index}`}
                  label="Qtd"
                  type="number"
                  bind:value={item.quantity}
                  min="1"
                  class_name="w-full"
                  on:input={() => recalcularItem(index)}
                />
              </div>

              <div class="md:col-span-2">
                <FieldInput
                  id={`orcamento-editar-item-valor-${index}`}
                  label="Valor Unit."
                  type="number"
                  bind:value={item.unit_price}
                  min="0"
                  step="0.01"
                  class_name="w-full"
                  on:input={() => recalcularItem(index)}
                />
              </div>

              <div class="md:col-span-1">
                <p class="block text-xs font-medium text-slate-500 mb-1">Total</p>
                <div class="px-2 py-2 bg-white rounded-lg text-sm font-semibold text-slate-800 text-right border border-slate-200">
                  {formatCurrency(item.total_amount)}
                </div>
              </div>
            </div>

            {#if formData.itens.length > 1}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                on:click={() => removeItem(index)}
                class_name="mt-5 flex-shrink-0 text-red-400 hover:text-red-600"
                ariaLabel="Remover item"
              >
                <X size={18} />
              </Button>
            {/if}
          </div>
        {/each}

        {#if errors.itens}
          <p class="text-sm text-red-600">{errors.itens}</p>
        {/if}

        <Button type="button" variant="secondary" on:click={addItem}>
          <Plus size={16} class="mr-2" />
          Adicionar Item
        </Button>
      </div>

      <div class="mt-6 pt-4 border-t border-slate-200">
        <div class="flex justify-end">
          <div class="text-right">
            <p class="text-sm text-slate-500">Valor Total do Orçamento</p>
            <p class="text-3xl font-bold text-orcamentos-600">{formatCurrency(valorTotal)}</p>
          </div>
        </div>
      </div>
    </Card>

    <!-- ── Observações ──────────────────────────────────────────────────────── -->
    <Card header="Observações e Condições" color="orcamentos">
      <FieldTextarea
        bind:value={formData.notes}
        rows={4}
        placeholder="Informações adicionais, condições de pagamento, validade da proposta..."
      />
    </Card>

    <!-- ── Ações ────────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-end gap-3">
      <Button type="button" variant="secondary"
        on:click={() => goto(`/orcamentos/${orcamentoId}`)} disabled={saving}>
        <ArrowLeft size={16} class="mr-2" />
        Cancelar
      </Button>

      <Button type="button" variant="secondary"
        on:click={() => handleSubmit(false)} disabled={saving} loading={saving}>
        <Save size={16} class="mr-2" />
        Salvar Alterações
      </Button>

      <Button type="button" variant="primary" color="orcamentos"
        on:click={() => handleSubmit(true)} loading={saving}>
        <Send size={16} class="mr-2" />
        Salvar e Enviar
      </Button>
    </div>

  </form>
{/if}
