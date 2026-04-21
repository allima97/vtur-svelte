<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    Button,
    Card,
    FieldInput,
    FieldSelect,
    FieldTextarea,
    PageHeader
  } from '$lib/components/ui';
  import { 
    Plus, ArrowLeft, Loader2, Save, CheckCircle, ChevronRight, 
    ChevronLeft, MapPin, Calendar, Hotel, Info, FileText,
    Users, Trash2, MoveUp, MoveDown, ChevronDown, ChevronUp,
    Plane, Phone, Smartphone, AlertCircle
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { fade, slide } from 'svelte/transition';
  import { 
    createEmptyVoucherImport, 
    parseSpecialToursCircuitPasteText, 
    parseSpecialToursHotelPaste 
  } from '$lib/vouchers/import';
  import { 
    normalizeVoucherExtraData, 
    createBlankPassengerDetail, 
    buildPassengerSummary, 
    createBlankAppInfo 
  } from '$lib/vouchers/extraData';
  import type { 
    VoucherProvider, 
    VoucherDia, 
    VoucherHotel, 
    VoucherExtraData 
  } from '$lib/vouchers/types';

  // Tipo para o formulário do wizard
  interface WizardForm {
    provider: VoucherProvider;
    nome: string;
    codigo_systur: string;
    codigo_fornecedor: string;
    reserva_online: string;
    passageiros: string;
    tipo_acomodacao: string;
    operador: string;
    resumo: string;
    data_inicio: string;
    data_fim: string;
    ativo: boolean;
    status: 'rascunho' | 'finalizado' | 'cancelado';
    extra_data: VoucherExtraData;
    dias: VoucherDia[];
    hoteis: VoucherHotel[];
  }

  let currentStep = 0;
  let loading = true;
  let saving = false;
  let companyId: string | null = null;
  
  // Textos de importação
  let circuitPasteText = '';
  let hotelPasteText = '';
  
  // Accordion states
  let activeDayIndexes: number[] = [];
  let activeHotelIndexes: number[] = [];
  
  // Validação
  let validationErrors: Record<string, string> = {};

  const steps = [
    { id: 0, label: 'Dados da Viagem', icon: MapPin, description: 'Informações básicas do voucher' },
    { id: 1, label: 'Dia a Dia', icon: Calendar, description: 'Itinerário do circuito' },
    { id: 2, label: 'Hotéis', icon: Hotel, description: 'Acomodações confirmadas' },
    { id: 3, label: 'Extras', icon: Info, description: 'Traslados e informações adicionais' }
  ];

  const providers: { value: VoucherProvider; label: string; color: string }[] = [
    { value: 'special_tours', label: 'Special Tours', color: 'bg-blue-500' },
    { value: 'europamundo', label: 'Europamundo', color: 'bg-orange-500' }
  ];

  const acomodacaoOptions = [
    'Duplo',
    'Triplo',
    'Quádruplo',
    'Individual',
    'Casal',
    'Família (2 adultos + 1 criança)',
    'Família (2 adultos + 2 crianças)'
  ];

  const hotelStatusOptions = [
    { value: 'Confirmado', label: 'Confirmado' },
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Sob Consulta', label: 'Sob Consulta' },
    { value: 'Não Disponível', label: 'Não Disponível' }
  ];

  const acomodacaoSelectOptions = acomodacaoOptions.map((opt) => ({ value: opt, label: opt }));
  const passengerTypeOptions = [
    { value: 'ADT', label: 'Adulto' },
    { value: 'CHD', label: 'Criança' },
    { value: 'INF', label: 'Bebê' }
  ];

  // Formulário inicial
  let form: WizardForm = {
    provider: 'special_tours',
    nome: '',
    codigo_systur: '',
    codigo_fornecedor: '',
    reserva_online: '',
    passageiros: '',
    tipo_acomodacao: '',
    operador: '',
    resumo: '',
    data_inicio: '',
    data_fim: '',
    ativo: true,
    status: 'rascunho',
    extra_data: normalizeVoucherExtraData({}, 'special_tours'),
    dias: [],
    hoteis: []
  };

  onMount(async () => {
    await loadUserContext();
    loading = false;
  });

  async function loadUserContext() {
    try {
      const response = await fetch('/api/v1/user/context');
      if (response.ok) {
        const data = await response.json();
        companyId = data.company_id;
      }
    } catch (err) {
      console.error('Erro ao carregar contexto:', err);
    }
  }

  // ============ HELPERS ============
  function formatDateBR(value?: string | null) {
    if (!value) return '';
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  function addDaysToDate(startDate: string, days: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  function diffNights(start?: string | null, end?: string | null): number | null {
    if (!start || !end) return null;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  }

  // ============ ETAPA 1: DADOS DA VIAGEM ============
  function syncDaysWithStartDate() {
    if (!form.data_inicio) return;
    form.dias = form.dias.map((dia, index) => ({
      ...dia,
      data_referencia: addDaysToDate(form.data_inicio, index)
    }));
  }

  // ============ PASSAGEIROS ============
  function addPassenger() {
    const details = form.extra_data.passageiros_detalhes || [];
    form.extra_data = {
      ...form.extra_data,
      passageiros_detalhes: [...details, createBlankPassengerDetail(details.length)]
    };
    updatePassageirosSummary();
  }

  function removePassenger(index: number) {
    const details = (form.extra_data.passageiros_detalhes || []).filter((_, i) => i !== index);
    form.extra_data = { ...form.extra_data, passageiros_detalhes: details };
    updatePassageirosSummary();
  }

  function updatePassenger(index: number, field: string, value: string) {
    const details = [...(form.extra_data.passageiros_detalhes || [])];
    details[index] = { ...details[index], [field]: value };
    form.extra_data = { ...form.extra_data, passageiros_detalhes: details };
    updatePassageirosSummary();
  }

  function updatePassageirosSummary() {
    form.passageiros = buildPassengerSummary(form.extra_data.passageiros_detalhes || []);
  }

  // ============ ETAPA 2: DIAS ============
  function addDay() {
    const nextNum = form.dias.length + 1;
    form.dias = [...form.dias, {
      dia_numero: nextNum,
      titulo: '',
      descricao: '',
      data_referencia: form.data_inicio ? addDaysToDate(form.data_inicio, form.dias.length) : null,
      cidade: null,
      ordem: form.dias.length
    }];
    activeDayIndexes = [...activeDayIndexes, form.dias.length - 1];
  }

  function removeDay(index: number) {
    form.dias = form.dias.filter((_, i) => i !== index).map((d, i) => ({ ...d, dia_numero: i + 1, ordem: i }));
    activeDayIndexes = activeDayIndexes.filter(i => i !== index).map(i => i > index ? i - 1 : i);
    syncDaysWithStartDate();
  }

  function moveDay(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= form.dias.length) return;
    const dias = [...form.dias];
    [dias[index], dias[newIndex]] = [dias[newIndex], dias[index]];
    form.dias = dias.map((d, i) => ({ ...d, dia_numero: i + 1, ordem: i }));
    syncDaysWithStartDate();
  }

  function importCircuitFromPaste() {
    if (!circuitPasteText.trim()) {
      toast.error('Cole o itinerário antes de importar');
      return;
    }
    try {
      const imported = parseSpecialToursCircuitPasteText(circuitPasteText);
      form.dias = imported.dias.map((d, i) => ({ ...d, ordem: i }));
      form.hoteis = [...form.hoteis, ...imported.hoteis.map((h, i) => ({ ...h, ordem: form.hoteis.length + i }))];
      syncDaysWithStartDate();
      circuitPasteText = '';
      toast.success(`Itinerário importado: ${imported.dias.length} dias e ${imported.hoteis.length} hotéis`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar itinerário');
    }
  }

  // ============ ETAPA 3: HOTÉIS ============
  function addHotel() {
    form.hoteis = [...form.hoteis, {
      cidade: '',
      hotel: '',
      endereco: '',
      data_inicio: '',
      data_fim: '',
      noites: null,
      telefone: '',
      contato: '',
      status: '',
      observacao: '',
      ordem: form.hoteis.length
    }];
    activeHotelIndexes = [...activeHotelIndexes, form.hoteis.length - 1];
  }

  function removeHotel(index: number) {
    form.hoteis = form.hoteis.filter((_, i) => i !== index).map((h, i) => ({ ...h, ordem: i }));
    activeHotelIndexes = activeHotelIndexes.filter(i => i !== index).map(i => i > index ? i - 1 : i);
  }

  function moveHotel(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= form.hoteis.length) return;
    const hoteis = [...form.hoteis];
    [hoteis[index], hoteis[newIndex]] = [hoteis[newIndex], hoteis[index]];
    form.hoteis = hoteis.map((h, i) => ({ ...h, ordem: i }));
  }

  function updateHotelDates(index: number, field: 'data_inicio' | 'data_fim', value: string) {
    form.hoteis[index][field] = value;
    form.hoteis[index].noites = diffNights(form.hoteis[index].data_inicio, form.hoteis[index].data_fim);
    form.hoteis = [...form.hoteis];
  }

  function importHotelsFromPaste() {
    if (!hotelPasteText.trim()) {
      toast.error('Cole a lista de hotéis antes de importar');
      return;
    }
    try {
      const imported = parseSpecialToursHotelPaste(hotelPasteText);
      form.hoteis = [...form.hoteis, ...imported.hoteis.map((h, i) => ({ ...h, ordem: form.hoteis.length + i }))];
      hotelPasteText = '';
      toast.success(`${imported.hoteis.length} hotéis importados`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar hotéis');
    }
  }

  // ============ ETAPA 4: APPS ============
  function addApp() {
    const apps = form.extra_data.apps_recomendados || [];
    form.extra_data = {
      ...form.extra_data,
      apps_recomendados: [...apps, createBlankAppInfo(apps.length)]
    };
  }

  function removeApp(index: number) {
    const apps = (form.extra_data.apps_recomendados || []).filter((_, i) => i !== index);
    form.extra_data = { ...form.extra_data, apps_recomendados: apps };
  }

  function updateApp(index: number, field: string, value: string) {
    const apps = [...(form.extra_data.apps_recomendados || [])];
    apps[index] = { ...apps[index], [field]: value };
    form.extra_data = { ...form.extra_data, apps_recomendados: apps };
  }

  // ============ NAVEGAÇÃO E VALIDAÇÃO ============
  function validateStep(step: number): boolean {
    validationErrors = {};
    
    if (step === 0) {
      if (!form.nome.trim()) {
        validationErrors.nome = 'Nome do voucher é obrigatório';
      }
      if (!form.data_inicio) {
        validationErrors.data_inicio = 'Data de início é obrigatória';
      }
    }
    
    return Object.keys(validationErrors).length === 0;
  }

  function goToStep(step: number) {
    if (step > currentStep && !validateStep(currentStep)) {
      toast.error('Preencha os campos obrigatórios antes de avançar');
      return;
    }
    currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextStep() {
    if (currentStep < steps.length - 1) {
      if (validateStep(currentStep)) {
        currentStep++;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error('Preencha os campos obrigatórios antes de avançar');
      }
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function getStepStatus(stepIndex: number): 'completed' | 'current' | 'pending' {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  }

  function toggleDayAccordion(index: number) {
    if (activeDayIndexes.includes(index)) {
      activeDayIndexes = activeDayIndexes.filter(i => i !== index);
    } else {
      activeDayIndexes = [...activeDayIndexes, index];
    }
  }

  function toggleHotelAccordion(index: number) {
    if (activeHotelIndexes.includes(index)) {
      activeHotelIndexes = activeHotelIndexes.filter(i => i !== index);
    } else {
      activeHotelIndexes = [...activeHotelIndexes, index];
    }
  }

  // ============ SALVAMENTO ============
  async function saveVoucher(finalizar = false) {
    if (!companyId) {
      toast.error('Selecione uma empresa');
      return;
    }
    
    if (!form.nome.trim()) {
      validationErrors.nome = 'Nome do voucher é obrigatório';
      currentStep = 0;
      toast.error('Informe o nome do voucher');
      return;
    }

    saving = true;
    
    try {
      const payload = {
        company_id: companyId,
        provider: form.provider,
        nome: form.nome,
        codigo_systur: form.codigo_systur || null,
        codigo_fornecedor: form.codigo_fornecedor || null,
        reserva_online: form.reserva_online || null,
        passageiros: form.passageiros || null,
        tipo_acomodacao: form.tipo_acomodacao || null,
        operador: form.operador || null,
        resumo: form.resumo || null,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        ativo: true,
        status: finalizar ? 'finalizado' : 'rascunho',
        extra_data: form.extra_data,
        dias: form.dias,
        hoteis: form.hoteis
      };

      const response = await fetch('/api/v1/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar voucher');
      }

      const result = await response.json();
      
      toast.success(finalizar ? 'Voucher finalizado com sucesso!' : 'Rascunho salvo com sucesso!');
      goto('/operacao/vouchers');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar voucher');
      console.error(err);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Novo Voucher | VTUR</title>
</svelte:head>

<PageHeader 
  title="Novo Voucher"
  subtitle="Crie um voucher completo em 4 etapas"
  color="clientes"
  breadcrumbs={[
    { label: 'Operação', href: '/operacao' },
    { label: 'Vouchers', href: '/operacao/vouchers' },
    { label: 'Novo' }
  ]}
  actions={[
    {
      label: 'Voltar',
      href: '/operacao/vouchers',
      variant: 'secondary',
      icon: ArrowLeft
    }
  ]}
/>

{#if loading}
  <div class="flex items-center justify-center py-20">
    <Loader2 size={40} class="animate-spin text-clientes-500" />
  </div>
{:else}
  <div class="max-w-6xl mx-auto pb-20">
    <!-- Wizard Steps -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
      <div class="flex flex-wrap">
        {#each steps as step, i}
          {@const status = getStepStatus(i)}
          <button
            type="button"
            class="flex-1 min-w-[140px] py-4 px-3 flex flex-col items-center justify-center gap-2 text-sm font-medium transition-all relative
              {status === 'current' 
                ? 'bg-clientes-50 text-clientes-700' 
                : status === 'completed'
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-white text-slate-400 hover:bg-slate-50'}"
            on:click={() => goToStep(i)}
          >
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg
              {status === 'current' 
                ? 'bg-clientes-500 text-white shadow-lg' 
                : status === 'completed'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 text-slate-500'}">
              <svelte:component this={step.icon} size={20} />
            </div>
            <div class="text-center">
              <p class="font-semibold hidden sm:block">{step.label}</p>
              <p class="text-xs opacity-75 hidden md:block">{step.description}</p>
            </div>
            {#if status === 'current'}
              <div class="absolute bottom-0 left-0 right-0 h-1 bg-clientes-500"></div>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Conteúdo do Wizard -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
      
      <!-- ETAPA 1: DADOS DA VIAGEM -->
      {#if currentStep === 0}
        <div in:fade={{ duration: 200 }}>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-xl bg-clientes-100 text-clientes-600 flex items-center justify-center">
              <MapPin size={24} />
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900">Dados da Viagem</h2>
              <p class="text-slate-500">Informações básicas do voucher</p>
            </div>
          </div>

          <div class="space-y-6">
            <!-- Fornecedor -->
            <fieldset class="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <legend class="block text-sm font-medium text-slate-700 mb-3">Fornecedor *</legend>
              <div class="flex flex-wrap gap-3">
                {#each providers as p}
                  <button
                    type="button"
                    on:click={() => form.provider = p.value}
                    class="flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all
                      {form.provider === p.value 
                        ? 'border-clientes-500 bg-clientes-50 text-clientes-700 shadow-md' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'}"
                  >
                    <div class="w-4 h-4 rounded-full {p.color}"></div>
                    <span class="font-medium">{p.label}</span>
                  </button>
                {/each}
              </div>
            </fieldset>

            <!-- Informações Principais -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldInput
                id="voucher-nome"
                label="Nome do Voucher"
                bind:value={form.nome}
                required={true}
                error={validationErrors.nome}
                placeholder="Ex: Circuito Europa 2024 - Lisboa, Madrid e Paris"
                class_name="md:col-span-2"
              />

              <FieldInput
                id="voucher-codigo-systur"
                label="Código SYSTUR"
                bind:value={form.codigo_systur}
                placeholder="Código interno"
              />

              <FieldInput
                id="voucher-codigo-fornecedor"
                label="Código Fornecedor"
                bind:value={form.codigo_fornecedor}
                placeholder="Código do fornecedor"
              />

              <FieldInput
                id="voucher-reserva-online"
                label="Reserva Online"
                bind:value={form.reserva_online}
                placeholder="Número da reserva"
              />

              <FieldInput
                id="voucher-localizador-agencia"
                label="Localizador Agência"
                value={form.extra_data.localizador_agencia || ''}
                placeholder="Localizador"
                on:input={(e) => form.extra_data = { ...form.extra_data, localizador_agencia: (e.currentTarget as HTMLInputElement).value }}
              />
            </div>

            <!-- Datas -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-blue-50 rounded-xl border border-blue-100">
              <FieldInput
                id="voucher-data-inicio"
                label="Data Início"
                type="date"
                bind:value={form.data_inicio}
                required={true}
                error={validationErrors.data_inicio}
                on:change={syncDaysWithStartDate}
              />

              <FieldInput
                id="voucher-data-fim"
                label="Data Fim"
                type="date"
                bind:value={form.data_fim}
              />
            </div>

            <!-- Acomodação e Operador -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldSelect
                id="voucher-tipo-acomodacao"
                label="Tipo de Acomodação"
                bind:value={form.tipo_acomodacao}
                options={acomodacaoSelectOptions}
                placeholder="Selecione..."
              />

              <FieldInput
                id="voucher-operador"
                label="Operador Responsável"
                bind:value={form.operador}
                placeholder="Nome do operador"
              />
            </div>

            <!-- Passageiros -->
            <div class="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-slate-900 flex items-center gap-2">
                  <Users size={18} class="text-clientes-500" />
                  Passageiros
                </h3>
                <Button variant="secondary" size="sm" on:click={addPassenger}>
                  <Plus size={14} class="mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {#if form.extra_data.passageiros_detalhes?.length}
                <div class="space-y-3">
                  {#each form.extra_data.passageiros_detalhes as passenger, i}
                    <div class="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-slate-700">Passageiro {i + 1}</span>
                        <button
                          type="button"
                          aria-label={`Remover passageiro ${i + 1}`}
                          on:click={() => removePassenger(i)}
                          class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <FieldInput
                          id={`voucher-passageiro-nome-${i}`}
                          label="Nome Completo"
                          value={passenger.nome}
                          placeholder="Nome do passageiro"
                          class_name="md:col-span-2"
                          on:input={(e) => updatePassenger(i, 'nome', (e.currentTarget as HTMLInputElement).value)}
                        />
                        <FieldInput
                          id={`voucher-passageiro-passaporte-${i}`}
                          label="Passaporte"
                          value={passenger.passaporte || ''}
                          placeholder="Número"
                          on:input={(e) => updatePassenger(i, 'passaporte', (e.currentTarget as HTMLInputElement).value)}
                        />
                        <FieldInput
                          id={`voucher-passageiro-data-${i}`}
                          label="Data Nasc."
                          type="date"
                          value={passenger.data_nascimento || ''}
                          on:input={(e) => updatePassenger(i, 'data_nascimento', (e.currentTarget as HTMLInputElement).value)}
                        />
                        <FieldInput
                          id={`voucher-passageiro-nacionalidade-${i}`}
                          label="Nacionalidade"
                          value={passenger.nacionalidade || ''}
                          placeholder="Ex: Brasileira"
                          on:input={(e) => updatePassenger(i, 'nacionalidade', (e.currentTarget as HTMLInputElement).value)}
                        />
                        <FieldSelect
                          id={`voucher-passageiro-tipo-${i}`}
                          label="Tipo"
                          value={passenger.tipo || ''}
                          options={passengerTypeOptions}
                          placeholder="Selecione"
                          on:change={(e) => updatePassenger(i, 'tipo', (e.currentTarget as HTMLSelectElement).value)}
                        />
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                  <Users size={32} class="mx-auto mb-2 opacity-50" />
                  <p class="text-sm">Nenhum passageiro adicionado</p>
                  <Button variant="ghost" size="sm" class_name="mt-2" on:click={addPassenger}>
                    <Plus size={14} class="mr-1" />
                    Adicionar Passageiro
                  </Button>
                </div>
              {/if}
            </div>

            <!-- Resumo -->
            <FieldTextarea
              id="voucher-resumo"
              label="Resumo da Viagem"
              bind:value={form.resumo}
              rows={4}
              placeholder="Descreva o resumo da viagem..."
            />
          </div>
        </div>

      <!-- ETAPA 2: DIA A DIA -->
      {:else if currentStep === 1}
        <div in:fade={{ duration: 200 }}>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900">Dia a Dia do Circuito</h2>
              <p class="text-slate-500">Itinerário detalhado da viagem</p>
            </div>
          </div>

          <div class="space-y-6">
            <!-- Import -->
            <div class="p-5 bg-blue-50 rounded-xl border border-blue-200">
              <h3 class="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <FileText size={18} />
                Importar Itinerário
              </h3>
              <FieldTextarea
                bind:value={circuitPasteText}
                rows={4}
                placeholder="Cole aqui o itinerário do Special Tours..."
              />
              <div class="flex gap-2 mt-3">
                <Button variant="secondary" size="sm" on:click={importCircuitFromPaste}>
                  <FileText size={14} class="mr-1" />
                  Importar
                </Button>
                {#if circuitPasteText}
                  <Button variant="ghost" size="sm" on:click={() => circuitPasteText = ''}>
                    Limpar
                  </Button>
                {/if}
              </div>
            </div>

            <!-- Lista de Dias -->
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-slate-900">Dias do Circuito ({form.dias.length})</h3>
                <Button variant="primary" size="sm" on:click={addDay}>
                  <Plus size={14} class="mr-1" />
                  Adicionar Dia
                </Button>
              </div>

              {#if form.dias.length === 0}
                <div class="text-center py-12 text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                  <Calendar size={48} class="mx-auto mb-3 opacity-50" />
                  <p class="font-medium">Nenhum dia adicionado</p>
                  <p class="text-sm mt-1">Importe ou adicione os dias do circuito</p>
                </div>
              {:else}
                <div class="space-y-3">
                  {#each form.dias as dia, i}
                    <div class="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div class="flex items-stretch justify-between bg-slate-50 transition-colors">
                        <button
                          type="button"
                          class="flex flex-1 items-center gap-4 px-4 py-4 text-left hover:bg-slate-100 transition-colors"
                          on:click={() => toggleDayAccordion(i)}
                          aria-expanded={activeDayIndexes.includes(i)}
                        >
                          <div class="w-10 h-10 rounded-full bg-clientes-500 text-white flex items-center justify-center font-bold">
                            {dia.dia_numero}
                          </div>
                          <div>
                            <p class="font-medium text-slate-900">{dia.titulo || `Dia ${dia.dia_numero}`}</p>
                            {#if dia.data_referencia}
                              <p class="text-sm text-slate-500">{formatDateBR(dia.data_referencia)} • {dia.cidade || 'Sem cidade'}</p>
                            {/if}
                          </div>
                          <svelte:component 
                            this={activeDayIndexes.includes(i) ? ChevronUp : ChevronDown} 
                            size={20} 
                            class="text-slate-400 ml-auto"
                          />
                        </button>
                        <div class="flex items-center gap-2 px-4">
                          <button
                            type="button"
                            aria-label={`Mover dia ${i + 1} para cima`}
                            on:click={() => moveDay(i, -1)}
                            disabled={i === 0}
                            class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30"
                          >
                            <MoveUp size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Mover dia ${i + 1} para baixo`}
                            on:click={() => moveDay(i, 1)}
                            disabled={i === form.dias.length - 1}
                            class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30"
                          >
                            <MoveDown size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remover dia ${i + 1}`}
                            on:click={() => removeDay(i)}
                            class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {#if activeDayIndexes.includes(i)}
                        <div class="p-4 space-y-4 border-t border-slate-100" transition:slide>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label for={`voucher-dia-titulo-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Título do Dia</label>
                              <input
                                id={`voucher-dia-titulo-${i}`}
                                type="text"
                                bind:value={dia.titulo}
                                class="vtur-input w-full"
                                placeholder="Ex: Lisboa - Chegada"
                              />
                            </div>
                            <div>
                              <label for={`voucher-dia-cidade-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                              <input
                                id={`voucher-dia-cidade-${i}`}
                                type="text"
                                bind:value={dia.cidade}
                                class="vtur-input w-full"
                                placeholder="Nome da cidade"
                              />
                            </div>
                          </div>
                          <div>
                            <label for={`voucher-dia-descricao-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Descrição das Atividades</label>
                            <textarea
                              id={`voucher-dia-descricao-${i}`}
                              bind:value={dia.descricao}
                              rows="5"
                              class="vtur-input w-full"
                              placeholder="Descreva as atividades do dia..."
                            ></textarea>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>

      <!-- ETAPA 3: HOTÉIS -->
      {:else if currentStep === 2}
        <div in:fade={{ duration: 200 }}>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Hotel size={24} />
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900">Hotéis Confirmados</h2>
              <p class="text-slate-500">Acomodações durante a viagem</p>
            </div>
          </div>

          <div class="space-y-6">
            <!-- Import -->
            <div class="p-5 bg-blue-50 rounded-xl border border-blue-200">
              <h3 class="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <FileText size={18} />
                Importar Hotéis
              </h3>
              <FieldTextarea
                bind:value={hotelPasteText}
                rows={4}
                placeholder="Cole aqui a lista de hotéis..."
              />
              <div class="flex gap-2 mt-3">
                <Button variant="secondary" size="sm" on:click={importHotelsFromPaste}>
                  <FileText size={14} class="mr-1" />
                  Importar
                </Button>
                {#if hotelPasteText}
                  <Button variant="ghost" size="sm" on:click={() => hotelPasteText = ''}>
                    Limpar
                  </Button>
                {/if}
              </div>
            </div>

            <!-- Lista de Hotéis -->
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-slate-900">Hotéis ({form.hoteis.length})</h3>
                <Button variant="primary" size="sm" on:click={addHotel}>
                  <Plus size={14} class="mr-1" />
                  Adicionar Hotel
                </Button>
              </div>

              {#if form.hoteis.length === 0}
                <div class="text-center py-12 text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                  <Hotel size={48} class="mx-auto mb-3 opacity-50" />
                  <p class="font-medium">Nenhum hotel adicionado</p>
                  <p class="text-sm mt-1">Importe ou adicione os hotéis</p>
                </div>
              {:else}
                <div class="space-y-3">
                  {#each form.hoteis as hotel, i}
                    <div class="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div class="flex items-stretch justify-between bg-slate-50 transition-colors">
                        <button
                          type="button"
                          class="flex flex-1 items-center gap-4 px-4 py-4 text-left hover:bg-slate-100 transition-colors"
                          on:click={() => toggleHotelAccordion(i)}
                          aria-expanded={activeHotelIndexes.includes(i)}
                        >
                          <div class="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Hotel size={20} />
                          </div>
                          <div>
                            <p class="font-medium text-slate-900">{hotel.hotel || `Hotel ${i + 1}`}</p>
                            <p class="text-sm text-slate-500">{hotel.cidade || 'Sem cidade'} • {hotel.noites || 0} noites</p>
                          </div>
                          <svelte:component 
                            this={activeHotelIndexes.includes(i) ? ChevronUp : ChevronDown} 
                            size={20} 
                            class="text-slate-400 ml-auto"
                          />
                        </button>
                        <div class="flex items-center gap-2 px-4">
                          <button
                            type="button"
                            aria-label={`Mover hotel ${i + 1} para cima`}
                            on:click={() => moveHotel(i, -1)}
                            disabled={i === 0}
                            class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30"
                          >
                            <MoveUp size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Mover hotel ${i + 1} para baixo`}
                            on:click={() => moveHotel(i, 1)}
                            disabled={i === form.hoteis.length - 1}
                            class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30"
                          >
                            <MoveDown size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remover hotel ${i + 1}`}
                            on:click={() => removeHotel(i)}
                            class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {#if activeHotelIndexes.includes(i)}
                        <div class="p-4 space-y-4 border-t border-slate-100" transition:slide>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label for={`voucher-hotel-cidade-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Cidade *</label>
                              <input
                                id={`voucher-hotel-cidade-${i}`}
                                type="text"
                                bind:value={hotel.cidade}
                                class="vtur-input w-full"
                                placeholder="Nome da cidade"
                              />
                            </div>
                            <div>
                              <label for={`voucher-hotel-nome-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Hotel *</label>
                              <input
                                id={`voucher-hotel-nome-${i}`}
                                type="text"
                                bind:value={hotel.hotel}
                                class="vtur-input w-full"
                                placeholder="Nome do hotel"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label for={`voucher-hotel-endereco-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                            <input
                              id={`voucher-hotel-endereco-${i}`}
                              type="text"
                              bind:value={hotel.endereco}
                              class="vtur-input w-full"
                              placeholder="Endereço completo"
                            />
                          </div>
                          
                          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label for={`voucher-hotel-checkin-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Check-in</label>
                              <input
                                id={`voucher-hotel-checkin-${i}`}
                                type="date"
                                value={hotel.data_inicio}
                                on:input={(e) => updateHotelDates(i, 'data_inicio', e.currentTarget.value)}
                                class="vtur-input w-full"
                              />
                            </div>
                            <div>
                              <label for={`voucher-hotel-checkout-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Check-out</label>
                              <input
                                id={`voucher-hotel-checkout-${i}`}
                                type="date"
                                value={hotel.data_fim}
                                on:input={(e) => updateHotelDates(i, 'data_fim', e.currentTarget.value)}
                                class="vtur-input w-full"
                              />
                            </div>
                            <div>
                              <label for={`voucher-hotel-noites-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Noites</label>
                              <input
                                id={`voucher-hotel-noites-${i}`}
                                type="number"
                                bind:value={hotel.noites}
                                class="vtur-input w-full bg-slate-100"
                                readonly
                              />
                            </div>
                          </div>
                          
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label for={`voucher-hotel-telefone-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                              <input
                                id={`voucher-hotel-telefone-${i}`}
                                type="text"
                                bind:value={hotel.telefone}
                                class="vtur-input w-full"
                                placeholder="Telefone do hotel"
                              />
                            </div>
                            <div>
                              <label for={`voucher-hotel-contato-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Contato</label>
                              <input
                                id={`voucher-hotel-contato-${i}`}
                                type="text"
                                bind:value={hotel.contato}
                                class="vtur-input w-full"
                                placeholder="Nome do contato"
                              />
                            </div>
                          </div>
                          
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label for={`voucher-hotel-status-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Status</label>
                              <select id={`voucher-hotel-status-${i}`} bind:value={hotel.status} class="vtur-input w-full">
                                <option value="">Selecione...</option>
                                {#each hotelStatusOptions as opt}
                                  <option value={opt.value}>{opt.label}</option>
                                {/each}
                              </select>
                            </div>
                          </div>
                          
                          <div>
                            <label for={`voucher-hotel-observacao-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Observação</label>
                            <textarea
                              id={`voucher-hotel-observacao-${i}`}
                              bind:value={hotel.observacao}
                              rows="2"
                              class="vtur-input w-full"
                              placeholder="Observações sobre o hotel..."
                            ></textarea>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>

      <!-- ETAPA 4: EXTRA DATA -->
      {:else if currentStep === 3}
        <div in:fade={{ duration: 200 }}>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Info size={24} />
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900">Informações Adicionais</h2>
              <p class="text-slate-500">Traslados, apps e contatos de emergência</p>
            </div>
          </div>

          <div class="space-y-6">
            <!-- Traslados -->
            <div class="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <h3 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Plane size={20} class="text-clientes-500" />
                Traslados
              </h3>
              
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Chegada -->
                <div class="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 class="font-medium text-green-900 mb-3 flex items-center gap-2">
                    <Plane size={16} class="rotate-45" />
                    Traslado Chegada
                  </h4>
                  <div class="space-y-3">
                    <div>
                      <label for="voucher-traslado-chegada-detalhes" class="block text-xs font-medium text-slate-600 mb-1">Detalhes</label>
                      <textarea
                        id="voucher-traslado-chegada-detalhes"
                        value={form.extra_data.traslado_chegada?.detalhes || ''}
                        on:input={(e) => form.extra_data = { 
                          ...form.extra_data, 
                          traslado_chegada: { 
                            ...(form.extra_data.traslado_chegada || {}), 
                            detalhes: e.currentTarget.value 
                          } 
                        }}
                        rows="3"
                        class="vtur-input w-full border-green-200"
                        placeholder="Detalhes do traslado de chegada..."
                      ></textarea>
                    </div>
                    <div>
                      <label for="voucher-traslado-chegada-notas" class="block text-xs font-medium text-slate-600 mb-1">Notas</label>
                      <textarea
                        id="voucher-traslado-chegada-notas"
                        value={form.extra_data.traslado_chegada?.notas || ''}
                        on:input={(e) => form.extra_data = { 
                          ...form.extra_data, 
                          traslado_chegada: { 
                            ...(form.extra_data.traslado_chegada || {}), 
                            notas: e.currentTarget.value 
                          } 
                        }}
                        rows="2"
                        class="vtur-input w-full border-green-200"
                        placeholder="Notas importantes..."
                      ></textarea>
                    </div>
                    <div>
                      <label for="voucher-traslado-chegada-telefone" class="block text-xs font-medium text-slate-600 mb-1">Telefone Transferista</label>
                      <input
                        id="voucher-traslado-chegada-telefone"
                        type="text"
                        value={form.extra_data.traslado_chegada?.telefone_transferista || ''}
                        on:input={(e) => form.extra_data = { 
                          ...form.extra_data, 
                          traslado_chegada: { 
                            ...(form.extra_data.traslado_chegada || {}), 
                            telefone_transferista: e.currentTarget.value 
                          } 
                        }}
                        class="vtur-input w-full border-green-200"
                        placeholder="+34 999 999 999"
                      />
                    </div>
                  </div>
                </div>

                <!-- Saída -->
                <div class="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 class="font-medium text-orange-900 mb-3 flex items-center gap-2">
                    <Plane size={16} class="-rotate-45" />
                    Traslado Saída
                  </h4>
                  <div class="space-y-3">
                    <div>
                      <label for="voucher-traslado-saida-detalhes" class="block text-xs font-medium text-slate-600 mb-1">Detalhes</label>
                      <textarea
                        id="voucher-traslado-saida-detalhes"
                        value={form.extra_data.traslado_saida?.detalhes || ''}
                        on:input={(e) => form.extra_data = { 
                          ...form.extra_data, 
                          traslado_saida: { 
                            ...(form.extra_data.traslado_saida || {}), 
                            detalhes: e.currentTarget.value 
                          } 
                        }}
                        rows="3"
                        class="vtur-input w-full border-orange-200"
                        placeholder="Detalhes do traslado de saída..."
                      ></textarea>
                    </div>
                    <div>
                      <label for="voucher-traslado-saida-notas" class="block text-xs font-medium text-slate-600 mb-1">Notas</label>
                      <textarea
                        id="voucher-traslado-saida-notas"
                        value={form.extra_data.traslado_saida?.notas || ''}
                        on:input={(e) => form.extra_data = { 
                          ...form.extra_data, 
                          traslado_saida: { 
                            ...(form.extra_data.traslado_saida || {}), 
                            notas: e.currentTarget.value 
                          } 
                        }}
                        rows="2"
                        class="vtur-input w-full border-orange-200"
                        placeholder="Notas importantes..."
                      ></textarea>
                    </div>
                    <div>
                      <label for="voucher-traslado-saida-telefone" class="block text-xs font-medium text-slate-600 mb-1">Telefone Transferista</label>
                      <input
                        id="voucher-traslado-saida-telefone"
                        type="text"
                        value={form.extra_data.traslado_saida?.telefone_transferista || ''}
                        on:input={(e) => form.extra_data = { 
                          ...form.extra_data, 
                          traslado_saida: { 
                            ...(form.extra_data.traslado_saida || {}), 
                            telefone_transferista: e.currentTarget.value 
                          } 
                        }}
                        class="vtur-input w-full border-orange-200"
                        placeholder="+34 999 999 999"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Informações Importantes -->
            <div class="p-5 bg-amber-50 rounded-xl border border-amber-200">
              <h3 class="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <AlertCircle size={20} />
                Informações Importantes
              </h3>
              <textarea
                value={form.extra_data.informacoes_importantes || ''}
                on:input={(e) => form.extra_data = { ...form.extra_data, informacoes_importantes: e.currentTarget.value }}
                rows="5"
                class="vtur-input w-full border-amber-200"
                placeholder="Liste aqui as informações importantes para o passageiro..."
              ></textarea>
            </div>

            <!-- Apps -->
            <div class="p-5 bg-blue-50 rounded-xl border border-blue-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-blue-900 flex items-center gap-2">
                  <Smartphone size={20} />
                  Apps Recomendados
                </h3>
                <Button variant="secondary" size="sm" on:click={addApp}>
                  <Plus size={14} class="mr-1" />
                  Adicionar App
                </Button>
              </div>
              
              {#if form.extra_data.apps_recomendados?.length}
                <div class="space-y-3">
                  {#each form.extra_data.apps_recomendados as app, i}
                    <div class="p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                      <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-slate-700">App {i + 1}</span>
                        <button
                          type="button"
                          aria-label={`Remover app ${i + 1}`}
                          on:click={() => removeApp(i)}
                          class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label for={`voucher-app-nome-${i}`} class="block text-xs font-medium text-slate-600 mb-1">Nome</label>
                          <input
                            id={`voucher-app-nome-${i}`}
                            type="text"
                            value={app.nome}
                            on:input={(e) => updateApp(i, 'nome', e.currentTarget.value)}
                            class="vtur-input w-full"
                            placeholder="Ex: Google Tradutor"
                          />
                        </div>
                        <div>
                          <label for={`voucher-app-descricao-${i}`} class="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                          <input
                            id={`voucher-app-descricao-${i}`}
                            type="text"
                            value={app.descricao || ''}
                            on:input={(e) => updateApp(i, 'descricao', e.currentTarget.value)}
                            class="vtur-input w-full"
                            placeholder="Para que serve"
                          />
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-6 text-blue-400 border-2 border-dashed border-blue-300 rounded-lg">
                  <Smartphone size={32} class="mx-auto mb-2 opacity-50" />
                  <p class="text-sm">Nenhum app adicionado</p>
                </div>
              {/if}
            </div>

            <!-- Emergência -->
            <div class="p-5 bg-red-50 rounded-xl border border-red-200">
              <h3 class="font-semibold text-red-900 mb-4 flex items-center gap-2">
                <Phone size={20} />
                Contatos de Emergência
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label for="voucher-emergencia-escritorio" class="block text-sm font-medium text-slate-700 mb-1">Escritório</label>
                  <input
                    id="voucher-emergencia-escritorio"
                    type="text"
                    value={form.extra_data.emergencia?.escritorio || ''}
                    on:input={(e) => form.extra_data = { 
                      ...form.extra_data, 
                      emergencia: { 
                        ...(form.extra_data.emergencia || {}), 
                        escritorio: e.currentTarget.value 
                      } 
                    }}
                    class="vtur-input w-full"
                    placeholder="+55 11 9999-9999"
                  />
                </div>
                <div>
                  <label for="voucher-emergencia-24h" class="block text-sm font-medium text-slate-700 mb-1">Emergência 24h</label>
                  <input
                    id="voucher-emergencia-24h"
                    type="text"
                    value={form.extra_data.emergencia?.emergencia_24h || ''}
                    on:input={(e) => form.extra_data = { 
                      ...form.extra_data, 
                      emergencia: { 
                        ...(form.extra_data.emergencia || {}), 
                        emergencia_24h: e.currentTarget.value 
                      } 
                    }}
                    class="vtur-input w-full"
                    placeholder="+34 652 99 00 47"
                  />
                </div>
                <div>
                  <label for="voucher-emergencia-whatsapp" class="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                  <input
                    id="voucher-emergencia-whatsapp"
                    type="text"
                    value={form.extra_data.emergencia?.whatsapp || ''}
                    on:input={(e) => form.extra_data = { 
                      ...form.extra_data, 
                      emergencia: { 
                        ...(form.extra_data.emergencia || {}), 
                        whatsapp: e.currentTarget.value 
                      } 
                    }}
                    class="vtur-input w-full"
                    placeholder="+55 11 99999-9999"
                  />
                </div>
              </div>
            </div>

            <!-- Preview Final -->
            <div class="p-5 bg-clientes-50 rounded-xl border border-clientes-200">
              <h3 class="font-semibold text-clientes-900 mb-4">Resumo do Voucher</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div class="p-3 bg-white rounded-lg">
                  <p class="text-2xl font-bold text-clientes-600">{form.dias.length}</p>
                  <p class="text-sm text-slate-600">Dias</p>
                </div>
                <div class="p-3 bg-white rounded-lg">
                  <p class="text-2xl font-bold text-clientes-600">{form.hoteis.length}</p>
                  <p class="text-sm text-slate-600">Hotéis</p>
                </div>
                <div class="p-3 bg-white rounded-lg">
                  <p class="text-2xl font-bold text-clientes-600">{form.extra_data.passageiros_detalhes?.length || 0}</p>
                  <p class="text-sm text-slate-600">Passageiros</p>
                </div>
                <div class="p-3 bg-white rounded-lg">
                  <p class="text-2xl font-bold text-clientes-600">{form.extra_data.apps_recomendados?.length || 0}</p>
                  <p class="text-sm text-slate-600">Apps</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Navegação -->
      <div class="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
        <div>
          {#if currentStep > 0}
            <Button variant="secondary" on:click={prevStep}>
              <ChevronLeft size={18} class="mr-1" />
              Etapa Anterior
            </Button>
          {:else}
            <Button variant="secondary" href="/operacao/vouchers">
              <ArrowLeft size={18} class="mr-1" />
              Voltar
            </Button>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-500 hidden sm:inline">
            Etapa {currentStep + 1} de {steps.length}
          </span>
        </div>

        <div class="flex gap-3">
          {#if currentStep < steps.length - 1}
            <Button variant="primary" on:click={nextStep}>
              Próxima Etapa
              <ChevronRight size={18} class="ml-1" />
            </Button>
          {:else}
            <Button 
              variant="secondary" 
              on:click={() => saveVoucher(false)}
              disabled={saving}
            >
              {#if saving}
                <Loader2 size={18} class="mr-2 animate-spin" />
              {:else}
                <Save size={18} class="mr-2" />
              {/if}
              Salvar Rascunho
            </Button>
            
            <Button 
              variant="primary" 
              on:click={() => saveVoucher(true)}
              disabled={saving}
            >
              {#if saving}
                <Loader2 size={18} class="mr-2 animate-spin" />
              {:else}
                <CheckCircle size={18} class="mr-2" />
              {/if}
              Finalizar Voucher
            </Button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
