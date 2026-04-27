<script lang="ts">
  import { onMount } from 'svelte';
  import { DollarSign, Percent, Settings, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';

  // ─── Tipos ────────────────────────────────────────────────────────────────
  interface FaixaCredito {
    de: number;   // parcelas de
    ate: number;  // parcelas até
    desconto: number; // %
  }

  interface FormaPagamento {
    id: string;
    label: string;
    tipo: 'simples' | 'credito'; // simples = desconto fixo; credito = faixas
    desconto?: number;
    faixas?: FaixaCredito[];
    maxParcelas?: number;
  }

  interface ConfigFormas {
    padrao: FormaPagamento[];
    ingressos: FormaPagamento[];
  }

  // ─── Formas de pagamento padrão ────────────────────────────────────────────
  const FORMAS_PADRAO_DEFAULT: FormaPagamento[] = [
    { id: 'pix', label: 'PIX QR Code', tipo: 'simples', desconto: 5 },
    { id: 'debito', label: 'Débito', tipo: 'simples', desconto: 3 },
    {
      id: 'credito', label: 'Cartão de Crédito', tipo: 'credito',
      maxParcelas: 12,
      faixas: [
        { de: 1, ate: 2, desconto: 4 },
        { de: 3, ate: 4, desconto: 3.5 },
        { de: 5, ate: 6, desconto: 3 },
        { de: 7, ate: 8, desconto: 2 },
        { de: 9, ate: 10, desconto: 1.5 },
        { de: 11, ate: 12, desconto: 0 },
      ]
    },
    { id: 'deposito', label: 'Depósito Franqueado', tipo: 'simples', desconto: 3 },
    { id: 'boleto', label: 'Boleto à Vista', tipo: 'simples', desconto: 3 },
  ];

  const FORMAS_INGRESSOS_DEFAULT: FormaPagamento[] = [
    { id: 'pix', label: 'PIX QR Code', tipo: 'simples', desconto: 3 },
    { id: 'debito', label: 'Débito', tipo: 'simples', desconto: 3 },
    {
      id: 'credito', label: 'Cartão de Crédito', tipo: 'credito',
      maxParcelas: 8,
      faixas: [
        { de: 1, ate: 2, desconto: 2.5 },
        { de: 3, ate: 4, desconto: 2 },
        { de: 5, ate: 6, desconto: 1.5 },
        { de: 7, ate: 8, desconto: 0 },
      ]
    },
    { id: 'deposito', label: 'Depósito Franqueado', tipo: 'simples', desconto: 3 },
    { id: 'boleto', label: 'Boleto à Vista', tipo: 'simples', desconto: 3 },
  ];

  // ─── Tipos de Pacote ───────────────────────────────────────────────────────
  const TIPOS_PACOTE = [
    { value: '', label: 'Selecione o tipo de pacote' },
    { value: 'pacote', label: 'Pacote' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'passagem', label: 'Passagem Aérea' },
    { value: 'disney', label: 'Ingresso Disney' },
    { value: 'universal', label: 'Ingresso Universal' },
    { value: 'seguro', label: 'Seguro Viagem' },
  ];

  // ─── Estado ────────────────────────────────────────────────────────────────
  let config: ConfigFormas = { padrao: [], ingressos: [] };
  let abaConfig: 'padrao' | 'ingressos' = 'padrao';
  let mostrarConfig = false;

  let calc = {
    valorCVC: 0,
    valorConcorrente: 0,
    descontoAutorizadoPct: 0, // entrada manual do usuário
    tipoPacote: '',
    formaPagamentoId: '',
    parcelas: 1,
    valorTaxas: 0,
  };

  // Nova forma (modal de configuração)
  let novaForma = { label: '', tipo: 'simples' as 'simples' | 'credito', desconto: 0 };

  // ─── Persistência via localStorage ────────────────────────────────────────
  const STORAGE_KEY = 'vtur_concorrencia_formas';

  function carregarConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        config = JSON.parse(saved);
      } else {
        config = { padrao: FORMAS_PADRAO_DEFAULT, ingressos: FORMAS_INGRESSOS_DEFAULT };
      }
    } catch {
      config = { padrao: FORMAS_PADRAO_DEFAULT, ingressos: FORMAS_INGRESSOS_DEFAULT };
    }
  }

  function salvarConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }

  onMount(() => {
    carregarConfig();
  });

  // ─── Derivados ─────────────────────────────────────────────────────────────
  $: ehIngresso = calc.tipoPacote === 'disney' || calc.tipoPacote === 'universal';
  $: formasDisponiveis = ehIngresso ? config.ingressos : config.padrao;

  $: formaSelecionada = formasDisponiveis.find(f => f.id === calc.formaPagamentoId) ?? null;
  $: ehCredito = formaSelecionada?.tipo === 'credito';

  $: maxParcelas = formaSelecionada?.maxParcelas ?? 12;
  $: opcoesParcelas = ehCredito
    ? [
        { value: '1', label: 'À vista (sem parcelamento)' },
        ...Array.from({ length: maxParcelas - 1 }, (_, i) => ({
          value: String(i + 2),
          label: `${i + 2}x`
        }))
      ]
    : [{ value: '1', label: 'À vista' }];

  // Diferença CVC vs Concorrente
  $: diferencaReais = calc.valorCVC - calc.valorConcorrente;
  $: diferencaPct = calc.valorCVC > 0 ? (diferencaReais / calc.valorCVC) * 100 : 0;

  // Desconto autorizado — informado manualmente pelo usuário
  $: descontoAutorizadoReais = calc.valorCVC * (calc.descontoAutorizadoPct / 100);

  // Valor final após concorrência
  $: valorFinalConcorrencia = calc.valorCVC - descontoAutorizadoReais;

  // Desconto da forma de pagamento
  $: descontoFormaPct = (() => {
    if (!formaSelecionada) return 0;
    if (formaSelecionada.tipo === 'simples') return formaSelecionada.desconto ?? 0;
    // crédito: busca faixa pela qtde de parcelas
    const p = calc.parcelas;
    const faixa = formaSelecionada.faixas?.find(f => p >= f.de && p <= f.ate);
    return faixa?.desconto ?? 0;
  })();

  // Taxas sempre excluídas da base de desconto quando informadas
  $: temTaxas = calc.valorTaxas > 0;
  $: baseDesconto = temTaxas
    ? Math.max(0, valorFinalConcorrencia - calc.valorTaxas)
    : valorFinalConcorrencia;

  $: valorDescontoForma = baseDesconto * (descontoFormaPct / 100);
  $: totalAPagar = temTaxas
    ? (baseDesconto - valorDescontoForma) + calc.valorTaxas
    : valorFinalConcorrencia - valorDescontoForma;
  $: valorParcela = calc.parcelas > 1 ? totalAPagar / calc.parcelas : totalAPagar;

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  }
  function fmtPct(v: number) {
    return (v || 0).toFixed(2).replace('.', ',') + '%';
  }

  // Ao mudar tipo do pacote, reseta apenas forma e parcelas
  let tipoPacoteAnterior = '';
  $: if (calc.tipoPacote !== tipoPacoteAnterior) {
    tipoPacoteAnterior = calc.tipoPacote;
    calc.formaPagamentoId = '';
    calc.parcelas = 1;
  }

  function limpar() {
    tipoPacoteAnterior = '';
    calc = {
      valorCVC: 0,
      valorConcorrente: 0,
      descontoAutorizadoPct: 0,
      tipoPacote: '',
      formaPagamentoId: '',
      parcelas: 1,
      valorTaxas: 0,
    };
  }

  // ─── Configuração de Formas ────────────────────────────────────────────────
  function adicionarForma() {
    if (!novaForma.label.trim()) return;
    const id = novaForma.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const forma: FormaPagamento = {
      id,
      label: novaForma.label,
      tipo: novaForma.tipo,
      desconto: novaForma.tipo === 'simples' ? novaForma.desconto : 0,
      faixas: novaForma.tipo === 'credito' ? [] : undefined,
    };
    if (abaConfig === 'padrao') {
      config.padrao = [...config.padrao, forma];
    } else {
      config.ingressos = [...config.ingressos, forma];
    }
    salvarConfig();
    novaForma = { label: '', tipo: 'simples', desconto: 0 };
  }

  function resetForma() {
    novaForma = { label: '', tipo: 'simples', desconto: 0 };
  }

  function removerForma(id: string, grupo: 'padrao' | 'ingressos') {
    if (grupo === 'padrao') {
      config.padrao = config.padrao.filter(f => f.id !== id);
    } else {
      config.ingressos = config.ingressos.filter(f => f.id !== id);
    }
    salvarConfig();
    resetForma();
  }

  function atualizarDesconto(id: string, grupo: 'padrao' | 'ingressos', novoDesc: number) {
    const arr = grupo === 'padrao' ? config.padrao : config.ingressos;
    const idx = arr.findIndex(f => f.id === id);
    if (idx >= 0) arr[idx].desconto = novoDesc;
    config = { ...config };
    salvarConfig();
  }

  function atualizarFaixa(id: string, grupo: 'padrao' | 'ingressos', fi: number, novoDesc: number) {
    const arr = grupo === 'padrao' ? config.padrao : config.ingressos;
    const forma = arr.find(f => f.id === id);
    if (forma?.faixas) forma.faixas[fi].desconto = novoDesc;
    config = { ...config };
    salvarConfig();
  }

  function restaurarPadrao() {
    if (abaConfig === 'padrao') {
      config.padrao = JSON.parse(JSON.stringify(FORMAS_PADRAO_DEFAULT));
    } else {
      config.ingressos = JSON.parse(JSON.stringify(FORMAS_INGRESSOS_DEFAULT));
    }
    salvarConfig();
    config = { ...config };
  }
</script>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- CONTEÚDO DA ABA CONCORRÊNCIA                                            -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<div class="space-y-6">

  <!-- ── Cabeçalho da seção ────────────────────────────────────────────── -->
  <div class="flex items-center justify-between">
    <div>
      <h4 class="text-base font-semibold text-slate-800">Análise de Concorrência</h4>
      <p class="text-xs text-slate-500 mt-0.5">Compare valores e calcule o melhor preço final para o cliente</p>
    </div>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class_name="gap-1.5 text-slate-500 hover:text-indigo-600"
      on:click={() => mostrarConfig = !mostrarConfig}
    >
      <Settings size={15} />
      <span class="text-xs font-medium">Formas de Pagamento</span>
    </Button>
  </div>

  <!-- ── Painel de Configuração de Formas ─────────────────────────────── -->
  {#if mostrarConfig}
    <div class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h5 class="text-sm font-semibold text-indigo-800">⚙️ Configurar Formas de Pagamento</h5>
        <div class="flex gap-2">
          <Button type="button" variant="ghost" size="xs"
            class_name={abaConfig === 'padrao' ? 'bg-white border border-indigo-200 text-indigo-700' : 'text-slate-500'}
            on:click={() => abaConfig = 'padrao'}>
            Pacotes / Hotel / Aéreo / Seguro
          </Button>
          <Button type="button" variant="ghost" size="xs"
            class_name={abaConfig === 'ingressos' ? 'bg-white border border-indigo-200 text-indigo-700' : 'text-slate-500'}
            on:click={() => abaConfig = 'ingressos'}>
            Ingressos (Disney / Universal)
          </Button>
        </div>
      </div>

      <!-- Lista de formas existentes -->
      <div class="space-y-2">
        {#each (abaConfig === 'padrao' ? config.padrao : config.ingressos) as forma (forma.id)}
          <div class="bg-white rounded-lg border border-slate-100 p-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-medium text-slate-700 flex-1">{forma.label}</span>
              {#if forma.tipo === 'simples'}
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500">Desconto:</span>
                  <input
                    type="number"
                    min="0" max="100" step="0.5"
                    value={forma.desconto}
                    on:change={(e) => atualizarDesconto(forma.id, abaConfig, Number((e.target as HTMLInputElement).value))}
                    class="w-16 text-sm text-center border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <span class="text-xs text-slate-500">%</span>
                </div>
              {:else}
                <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Crédito (faixas)</span>
              {/if}
              <Button type="button" variant="ghost" size="xs" class_name="text-red-400 hover:text-red-600 p-1"
                on:click={() => removerForma(forma.id, abaConfig)}>
                <Trash2 size={14} />
              </Button>
            </div>
            <!-- Faixas de crédito -->
            {#if forma.tipo === 'credito' && forma.faixas}
              <div class="mt-2 grid grid-cols-2 gap-2">
                {#each forma.faixas as faixa, fi}
                  <div class="flex items-center gap-2 text-xs text-slate-600">
                    <span class="w-28">{faixa.de === faixa.ate ? `${faixa.de}x` : `${faixa.de} a ${faixa.ate}x`}:</span>
                    <input
                      type="number" min="0" max="100" step="0.5"
                      value={faixa.desconto}
                      on:change={(e) => atualizarFaixa(forma.id, abaConfig, fi, Number((e.target as HTMLInputElement).value))}
                      class="w-14 text-center border border-slate-200 rounded-md px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <span>%</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Adicionar nova forma -->
      <div class="border-t border-indigo-100 pt-3 space-y-2">
        <p class="text-xs font-semibold text-indigo-700">Adicionar nova forma de pagamento:</p>
        <div class="flex gap-2 items-end">
          <div class="flex-1">
            <input
              type="text"
              bind:value={novaForma.label}
              placeholder="Nome da forma (ex: Transferência)"
              class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <select
            bind:value={novaForma.tipo}
            class="text-sm border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="simples">Desconto fixo</option>
            <option value="credito">Crédito (faixas)</option>
          </select>
          {#if novaForma.tipo === 'simples'}
            <div class="flex items-center gap-1">
              <input
                type="number" min="0" max="100" step="0.5"
                bind:value={novaForma.desconto}
                class="w-16 text-sm text-center border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <span class="text-xs text-slate-500">%</span>
            </div>
          {/if}
          <Button type="button" variant="primary" color="vendas" size="sm" on:click={adicionarForma}>
            <Plus size={14} />
          </Button>
        </div>
      </div>

      <div class="flex justify-end">
        <Button type="button" variant="ghost" size="xs" class_name="text-slate-500 text-xs"
          on:click={restaurarPadrao}>
          Restaurar padrão
        </Button>
      </div>
    </div>
  {/if}

  <!-- ── Grid principal ────────────────────────────────────────────────── -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

    <!-- ════ Coluna esquerda — Entradas ════ -->
    <div class="space-y-4">

      <!-- Valores CVC e Concorrente -->
      <div class="grid grid-cols-2 gap-3">
        <FieldInput
          id="conc-valor-cvc"
          label="Valor CVC (R$)"
          type="number"
          bind:value={calc.valorCVC}
          min="0"
          step="0.01"
          placeholder="0,00"
          icon={DollarSign}
        />
        <FieldInput
          id="conc-valor-concorrente"
          label="Valor Concorrente (R$)"
          type="number"
          bind:value={calc.valorConcorrente}
          min="0"
          step="0.01"
          placeholder="0,00"
          icon={DollarSign}
        />
      </div>

      <!-- Desconto Autorizado CVC — entrada manual -->
      <FieldInput
        id="conc-desconto-autorizado"
        label="Desconto Autorizado CVC (%)"
        type="number"
        bind:value={calc.descontoAutorizadoPct}
        min="0"
        max="100"
        step="0.01"
        placeholder="0,00"
        icon={Percent}
      />

      <!-- Tipo de Pacote -->
      <FieldSelect
        id="conc-tipo-pacote"
        label="Tipo de Pacote"
        bind:value={calc.tipoPacote}
        options={TIPOS_PACOTE}
        placeholder={null}
      />

      <!-- Taxas — sempre visível, padrão 0 -->
      <FieldInput
        id="conc-taxas"
        label="Taxas (R$)"
        type="number"
        bind:value={calc.valorTaxas}
        min="0"
        step="0.01"
        placeholder="0,00"
        icon={DollarSign}
        helper={temTaxas ? `Desconto aplicado sobre ${fmt(baseDesconto)} (sem taxas). Taxas somadas ao final.` : 'Deixe 0 se não houver taxas'}
      />

      <!-- Forma de Pagamento — dropdown -->
      {#if calc.tipoPacote}
        <FieldSelect
          id="conc-forma-pagamento"
          label="Forma de Pagamento"
          bind:value={calc.formaPagamentoId}
          placeholder="Selecione a forma de pagamento"
          options={formasDisponiveis.map(f => ({ value: f.id, label: f.label }))}
          on:change={() => { calc.parcelas = 1; }}
        />

        <!-- Painel visual: desconto(s) da forma selecionada -->
        {#if formaSelecionada}
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">

            {#if formaSelecionada.tipo === 'simples'}
              <!-- Forma simples: um único card de desconto -->
              <div class="flex items-center justify-between rounded-lg bg-white border border-indigo-200 px-3 py-2.5">
                <div>
                  <p class="text-xs text-slate-500">Desconto</p>
                  <p class="text-sm font-bold text-indigo-700">{fmtPct(formaSelecionada.desconto ?? 0)}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-slate-500">Total a pagar</p>
                  <p class="text-sm font-bold text-green-700">{fmt(totalAPagar)}</p>
                </div>
              </div>

            {:else if formaSelecionada.faixas}
              <!-- Cartão de crédito: um card por faixa, clicável para selecionar parcelas -->
              <p class="text-xs font-semibold text-slate-500 mb-1">Escolha o número de parcelas:</p>
              <div class="grid grid-cols-2 gap-2">
                {#each formaSelecionada.faixas as faixa}
                  {#each Array.from({ length: faixa.ate - faixa.de + 1 }, (_, i) => faixa.de + i) as p}
                    {@const descontoP = faixa.desconto}
                    {@const baseP = temTaxas ? Math.max(0, valorFinalConcorrencia - calc.valorTaxas) : valorFinalConcorrencia}
                    {@const totalP = temTaxas
                      ? (baseP - baseP * descontoP / 100) + calc.valorTaxas
                      : valorFinalConcorrencia - valorFinalConcorrencia * descontoP / 100}
                    {@const parcelaP = p > 1 ? totalP / p : totalP}
                    {@const ativo = calc.parcelas === p}
                    <button
                      type="button"
                      on:click={() => calc.parcelas = p}
                      class="rounded-lg border px-3 py-2 text-left transition-all
                        {ativo
                          ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'}"
                    >
                      <p class="text-xs font-semibold {ativo ? 'text-indigo-700' : 'text-slate-600'}">
                        {p === 1 ? 'À vista' : `${p}x`}
                      </p>
                      <p class="text-xs {ativo ? 'text-indigo-500' : 'text-slate-400'}">
                        Desconto {descontoP > 0 ? fmtPct(descontoP) : '—'}
                      </p>
                      <p class="text-xs font-bold {ativo ? 'text-green-700' : 'text-slate-500'} mt-0.5">
                        {p > 1 ? `${p}x ${fmt(parcelaP)}` : fmt(totalP)}
                      </p>
                    </button>
                  {/each}
                {/each}
              </div>
            {/if}

          </div>
        {/if}
      {/if}

    </div>

    <!-- ════ Coluna direita — Resultados ════ -->
    <div class="space-y-3">

      <!-- Bloco: Comparativo -->
      <div class="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
        <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Resumo</h5>

        <div class="flex justify-between items-center py-1.5 border-b border-slate-100">
          <span class="text-sm text-slate-600">Valor CVC</span>
          <span class="font-semibold text-slate-800">{fmt(calc.valorCVC)}</span>
        </div>
        <div class="flex justify-between items-center py-1.5 border-b border-slate-100">
          <span class="text-sm text-slate-600">Valor Concorrente</span>
          <span class="font-semibold text-slate-800">{fmt(calc.valorConcorrente)}</span>
        </div>

        {#if calc.valorCVC > 0 && calc.valorConcorrente > 0}
          <!-- Diferença -->
          <div class="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span class="text-sm text-red-600">Diferença ({fmtPct(diferencaPct)})</span>
            <span class="font-semibold text-red-600">{fmt(diferencaReais)}</span>
          </div>

          <!-- Desconto Autorizado -->
          <div class="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span class="text-sm text-amber-700">Desconto Autorizado CVC ({fmtPct(calc.descontoAutorizadoPct)})</span>
            <span class="font-semibold text-amber-700">{fmt(descontoAutorizadoReais)}</span>
          </div>

          <!-- Valor Final após Concorrência -->
          <div class="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2.5 flex justify-between items-center mt-1">
            <span class="text-sm font-bold text-indigo-800">Valor Final após Concorrência</span>
            <span class="font-bold text-lg text-indigo-700">{fmt(valorFinalConcorrencia)}</span>
          </div>
        {:else}
          <div class="rounded-lg bg-slate-100 px-3 py-3 flex items-center gap-2 text-slate-400">
            <AlertTriangle size={16} />
            <span class="text-xs">Informe os valores CVC e Concorrente</span>
          </div>
        {/if}
      </div>

      <!-- Bloco: Total a Pagar — aparece assim que forma selecionada -->
      {#if calc.formaPagamentoId && calc.valorCVC > 0 && calc.valorConcorrente > 0}
        <div class="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
          <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pagamento — {formaSelecionada?.label}{ehCredito && calc.parcelas > 1 ? ` (${calc.parcelas}x)` : ''}</h5>

          <div class="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span class="text-sm text-slate-600">Valor após Concorrência</span>
            <span class="font-semibold text-slate-800">{fmt(valorFinalConcorrencia)}</span>
          </div>

          {#if temTaxas}
            <div class="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span class="text-sm text-slate-500">(-) Taxas (excluídas da base)</span>
              <span class="font-medium text-orange-600">-{fmt(calc.valorTaxas)}</span>
            </div>
            <div class="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span class="text-sm text-slate-500">Base de desconto</span>
              <span class="font-medium text-slate-700">{fmt(baseDesconto)}</span>
            </div>
          {/if}

          <div class="flex justify-between items-start py-1.5 border-b border-slate-100 gap-2">
            <div class="flex flex-col">
              <span class="text-sm text-slate-600">
                Desconto {formaSelecionada?.label}{ehCredito && calc.parcelas > 1 ? ` ${calc.parcelas}x` : ''}
              </span>
              <span class="text-xs text-slate-400">({fmtPct(descontoFormaPct)} sobre o valor após concorrência)</span>
            </div>
            <span class="font-semibold text-green-600 whitespace-nowrap">-{fmt(valorDescontoForma)}</span>
          </div>

          {#if temTaxas}
            <div class="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span class="text-sm text-slate-500">(+) Taxas somadas ao total</span>
              <span class="font-medium text-orange-600">+{fmt(calc.valorTaxas)}</span>
            </div>
          {/if}

          <!-- Total a Pagar -->
          <div class="rounded-lg bg-green-100 border border-green-200 px-3 py-3 mt-1">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm font-bold text-green-800">Total a Pagar</p>
                <p class="text-xs text-green-600">
                  {#if ehCredito && calc.parcelas > 1}
                    {calc.parcelas}x de {fmt(valorParcela)}
                  {:else}
                    À vista
                  {/if}
                </p>
              </div>
              <span class="font-bold text-2xl text-green-700">{fmt(totalAPagar)}</span>
            </div>
          </div>

          <!-- Economia do cliente -->
          {#if calc.valorCVC > totalAPagar}
            <div class="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
              <CheckCircle size={15} class="text-emerald-600 flex-shrink-0" />
              <div>
                <p class="text-xs font-semibold text-emerald-700">Economia do cliente</p>
                <p class="text-xs text-emerald-600">{fmt(calc.valorCVC - totalAPagar)}</p>
                <p class="text-xs text-emerald-500">{fmtPct((calc.valorCVC - totalAPagar) / calc.valorCVC * 100)} sobre o preço original CVC</p>
              </div>
            </div>
          {/if}
        </div>
      {/if}

    </div>
  </div>

  <!-- Botão Limpar -->
  <div class="flex justify-start pt-2">
    <Button type="button" variant="ghost" size="sm" on:click={limpar} class_name="text-slate-500">
      Limpar campos
    </Button>
  </div>
</div>
