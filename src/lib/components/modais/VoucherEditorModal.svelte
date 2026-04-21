<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { 
    X, Plus, Trash2, MoveUp, MoveDown, Save, FileText,
    ChevronDown, ChevronUp, Calendar, Hotel, MapPin, Users,
    Info, Plane, Phone, Smartphone, AlertCircle, CheckCircle
  } from 'lucide-svelte';
  import Button from '../ui/Button.svelte';
  import { toast } from '../../stores/ui';
  import { createEmptyVoucherImport, parseSpecialToursCircuitPasteText, parseSpecialToursHotelPaste } from '../../vouchers/import';
  import { normalizeVoucherExtraData, createBlankPassengerDetail, buildPassengerSummary, createBlankAppInfo } from '../../vouchers/extraData';
  import type { VoucherProvider, VoucherDia, VoucherHotel, VoucherRecord, VoucherAssetRecord, VoucherExtraData, VoucherTransferInfo, VoucherAppInfo } from '../../vouchers/types';

  // Tipo local para o formulário do wizard
  interface VoucherForm {
    id: string | null;
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

  export let open = false;
  export let voucher: VoucherRecord | null = null;
  export let companyId: string | null = null;
  export let assets: VoucherAssetRecord[] = [];
  $: assets;

  const dispatch = createEventDispatcher();

  let form: VoucherForm;
  let currentStep = 0;
  let saving = false;
  let savingAsDraft = false;
  let circuitPasteText = '';
  let hotelPasteText = '';
  let activeDayIndexes: number[] = [];
  let activeHotelIndexes: number[] = [];
  let validationErrors: Record<string, string> = {};

  const steps = [
    { label: 'Dados da Viagem', icon: MapPin, description: 'Informações básicas' },
    { label: 'Dia a Dia', icon: Calendar, description: 'Circuito' },
    { label: 'Hotéis', icon: Hotel, description: 'Acomodações' },
    { label: 'Extras', icon: Info, description: 'Traslados e mais' }
  ];

  const providers: { value: VoucherProvider; label: string }[] = [
    { value: 'special_tours', label: 'Special Tours' },
    { value: 'europamundo', label: 'Europamundo' }
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

  const statusOptions = [
    { value: 'Confirmado', label: 'Confirmado' },
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Sob Consulta', label: 'Sob Consulta' },
    { value: 'Não Disponível', label: 'Não Disponível' }
  ];

  function initForm(): VoucherForm {
    const empty = createEmptyVoucherImport('special_tours');
    return {
      id: null,
      provider: empty.provider,
      nome: empty.nome,
      codigo_systur: empty.codigo_systur,
      codigo_fornecedor: empty.codigo_fornecedor,
      reserva_online: empty.reserva_online,
      passageiros: empty.passageiros,
      tipo_acomodacao: empty.tipo_acomodacao,
      operador: empty.operador,
      resumo: empty.resumo,
      data_inicio: empty.data_inicio,
      data_fim: empty.data_fim,
      ativo: true,
      status: 'rascunho',
      extra_data: normalizeVoucherExtraData(empty.extra_data, empty.provider),
      dias: [],
      hoteis: []
    };
  }

  function formFromVoucher(v: VoucherRecord): VoucherForm {
    return {
      id: v.id,
      provider: v.provider,
      nome: v.nome || '',
      codigo_systur: v.codigo_systur || '',
      codigo_fornecedor: v.codigo_fornecedor || '',
      reserva_online: v.reserva_online || '',
      passageiros: v.passageiros || '',
      tipo_acomodacao: v.tipo_acomodacao || '',
      operador: v.operador || '',
      resumo: v.resumo || '',
      data_inicio: v.data_inicio || '',
      data_fim: v.data_fim || '',
      ativo: v.ativo !== false,
      status: (v as any).status || 'finalizado',
      extra_data: normalizeVoucherExtraData(v.extra_data, v.provider),
      dias: (v.voucher_dias || []).map((d, i) => ({ ...d, ordem: d.ordem ?? i })),
      hoteis: (v.voucher_hoteis || []).map((h, i) => ({ ...h, ordem: h.ordem ?? i }))
    };
  }

  $: if (open) {
    form = voucher ? formFromVoucher(voucher) : initForm();
    currentStep = 0;
    circuitPasteText = '';
    hotelPasteText = '';
    activeDayIndexes = [];
    activeHotelIndexes = [];
    validationErrors = {};
  }

  function formatDateBR(value?: string | null) {
    if (!value) return '';
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  function parseDateInput(value: string): string {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
  }

  function addDaysToDate(startDate: string, days: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  function syncDaysWithStartDate() {
    if (!form.data_inicio) return;
    form.dias = form.dias.map((dia, index) => ({
      ...dia,
      data_referencia: addDaysToDate(form.data_inicio, index)
    }));
  }

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
    form.dias = form.dias.filter((_, i) => i !== index).map((d, i) => ({ ...d, ordem: i }));
    activeDayIndexes = activeDayIndexes.filter(i => i !== index).map(i => i > index ? i - 1 : i);
  }

  function moveDay(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= form.dias.length) return;
    const dias = [...form.dias];
    [dias[index], dias[newIndex]] = [dias[newIndex], dias[index]];
    form.dias = dias.map((d, i) => ({ ...d, ordem: i }));
    syncDaysWithStartDate();
  }

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

  function diffNights(start?: string | null, end?: string | null): number | null {
    if (!start || !end) return null;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  }

  function updateHotelDates(index: number, field: 'data_inicio' | 'data_fim', value: string) {
    form.hoteis[index][field] = value;
    form.hoteis[index].noites = diffNights(form.hoteis[index].data_inicio, form.hoteis[index].data_fim);
    form.hoteis = [...form.hoteis];
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
      toast.success('Itinerário importado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar itinerário');
    }
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
      toast.success('Hotéis importados com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar hotéis');
    }
  }

  // ========== PASSAGEIROS ==========
  function addPassenger() {
    const details = form.extra_data.passageiros_detalhes || [];
    form.extra_data = {
      ...form.extra_data,
      passageiros_detalhes: [...details, createBlankPassengerDetail(details.length)]
    };
    form.passageiros = buildPassengerSummary(form.extra_data.passageiros_detalhes);
  }

  function removePassenger(index: number) {
    const details = (form.extra_data.passageiros_detalhes || []).filter((_, i) => i !== index);
    form.extra_data = { ...form.extra_data, passageiros_detalhes: details };
    form.passageiros = buildPassengerSummary(details);
  }

  function updatePassenger(index: number, field: string, value: string) {
    const details = [...(form.extra_data.passageiros_detalhes || [])];
    details[index] = { ...details[index], [field]: value };
    form.extra_data = { ...form.extra_data, passageiros_detalhes: details };
    form.passageiros = buildPassengerSummary(details);
  }

  // ========== APPS RECOMENDADOS ==========
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

  // ========== VALIDAÇÃO ==========
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
    // Só permite voltar ou avançar se passar na validação
    if (step > currentStep && !validateStep(currentStep)) {
      toast.error('Preencha os campos obrigatórios antes de avançar');
      return;
    }
    currentStep = step;
  }

  function nextStep() {
    if (currentStep < steps.length - 1) {
      if (validateStep(currentStep)) {
        currentStep++;
      } else {
        toast.error('Preencha os campos obrigatórios antes de avançar');
      }
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
    }
  }

  // ========== SALVAMENTO ==========
  async function save(finalizar = false) {
    if (!companyId) {
      toast.error('Selecione uma empresa');
      return;
    }
    
    // Validação final
    if (!form.nome.trim()) {
      validationErrors.nome = 'Nome do voucher é obrigatório';
      currentStep = 0;
      toast.error('Informe o nome do voucher');
      return;
    }

    if (finalizar) {
      saving = true;
    } else {
      savingAsDraft = true;
    }
    
    try {
      const payload = {
        ...form,
        company_id: companyId,
        status: finalizar ? 'finalizado' : 'rascunho',
        dias: form.dias,
        hoteis: form.hoteis
      };
      dispatch('save', payload);
    } finally {
      saving = false;
      savingAsDraft = false;
    }
  }

  function close() {
    dispatch('close');
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

  function getStepStatus(stepIndex: number): 'completed' | 'current' | 'pending' {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  }
</script>

{#if open}
  <div 
    class="fixed inset-0 bg-slate-900/50 z-[100] flex items-start justify-center pt-4 pb-4 px-4"
    style="overflow-y: auto;"
    on:click|self={close}
    on:keydown={(event) => event.key === 'Escape' && close()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div 
      class="bg-white rounded-xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col"
      style="max-height: calc(100vh - 32px);"
      role="document"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-clientes-50 to-white">
        <div>
          <h2 class="text-xl font-bold text-slate-900">
            {voucher ? 'Editar Voucher' : 'Novo Voucher'}
          </h2>
          <p class="text-sm text-slate-500">
            {providers.find(p => p.value === form.provider)?.label}
            {#if form.status === 'rascunho'}
              <span class="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                Rascunho
              </span>
            {:else if form.status === 'finalizado'}
              <span class="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                Finalizado
              </span>
            {/if}
          </p>
        </div>
        <button 
          type="button"
          aria-label="Fechar editor de voucher"
          on:click={close}
          class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <!-- Wizard Steps -->
      <div class="bg-slate-50 border-b border-slate-200">
        <div class="flex">
          {#each steps as step, i}
            {@const status = getStepStatus(i)}
            <button
              type="button"
              class="flex-1 py-4 px-2 flex flex-col items-center justify-center gap-1 text-sm font-medium transition-all relative
                {status === 'current' 
                  ? 'bg-white text-clientes-700 border-b-2 border-clientes-500' 
                  : status === 'completed'
                    ? 'text-green-600 hover:bg-green-50'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}"
              on:click={() => goToStep(i)}
            >
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs
                  {status === 'current' 
                    ? 'bg-clientes-500 text-white' 
                    : status === 'completed'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-500'}">
                  {#if status === 'completed'}
                    <CheckCircle size={14} />
                  {:else}
                    {i + 1}
                  {/if}
                </div>
                <span class="hidden sm:inline font-semibold">{step.label}</span>
              </div>
              <span class="text-xs opacity-75 hidden md:inline">{step.description}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 bg-slate-50" style="min-height: 400px;">
        
        <!-- ETAPA 1: Dados da Viagem -->
        {#if currentStep === 0}
          <div class="space-y-6" in:fade={{ duration: 200 }}>
            <!-- Provider -->
            <fieldset class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <legend class="block text-sm font-medium text-slate-700 mb-3">Fornecedor</legend>
              {#if voucher}
                <div class="py-2 px-4 rounded-lg border-2 border-clientes-500 bg-clientes-50 text-clientes-700 inline-block font-medium">
                  {providers.find(p => p.value === form.provider)?.label}
                </div>
                <p class="text-xs text-slate-500 mt-2">O fornecedor não pode ser alterado em um voucher existente.</p>
              {:else}
                <div class="flex gap-3">
                  {#each providers as p}
                    <button
                      type="button"
                      on:click={() => form.provider = p.value}
                      class="flex-1 py-3 px-4 rounded-lg border-2 transition-all font-medium
                        {form.provider === p.value 
                          ? 'border-clientes-500 bg-clientes-50 text-clientes-700 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'}"
                    >
                      {p.label}
                    </button>
                  {/each}
                </div>
              {/if}
            </fieldset>

            <!-- Informações Principais -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText size={20} class="text-clientes-500" />
                Informações Principais
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                  <label for="voucher-modal-nome" class="block text-sm font-medium text-slate-700 mb-1">
                    Nome do Voucher <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="voucher-modal-nome"
                    type="text"
                    bind:value={form.nome}
                    class="vtur-input w-full {validationErrors.nome ? 'border-red-500' : ''}"
                    placeholder="Ex: Circuito Europa 2024"
                  />
                  {#if validationErrors.nome}
                    <p class="text-red-500 text-xs mt-1">{validationErrors.nome}</p>
                  {/if}
                </div>
                
                <div>
                  <label for="voucher-modal-codigo-systur" class="block text-sm font-medium text-slate-700 mb-1">Código SYSTUR</label>
                  <input
                    id="voucher-modal-codigo-systur"
                    type="text"
                    bind:value={form.codigo_systur}
                    class="vtur-input w-full"
                    placeholder="Código interno"
                  />
                </div>
                
                <div>
                  <label for="voucher-modal-codigo-fornecedor" class="block text-sm font-medium text-slate-700 mb-1">Código Fornecedor</label>
                  <input
                    id="voucher-modal-codigo-fornecedor"
                    type="text"
                    bind:value={form.codigo_fornecedor}
                    class="vtur-input w-full"
                    placeholder="Código do fornecedor"
                  />
                </div>
                
                <div>
                  <label for="voucher-modal-reserva-online" class="block text-sm font-medium text-slate-700 mb-1">Reserva Online</label>
                  <input
                    id="voucher-modal-reserva-online"
                    type="text"
                    bind:value={form.reserva_online}
                    class="vtur-input w-full"
                    placeholder="Número da reserva"
                  />
                </div>
                
                <div>
                  <label for="voucher-modal-localizador-agencia" class="block text-sm font-medium text-slate-700 mb-1">Localizador Agência</label>
                  <input
                    id="voucher-modal-localizador-agencia"
                    type="text"
                    bind:value={form.extra_data.localizador_agencia}
                    on:input={(e) => form.extra_data = { ...form.extra_data, localizador_agencia: e.currentTarget.value }}
                    class="vtur-input w-full"
                    placeholder="Localizador da agência"
                  />
                </div>
              </div>
            </div>

            <!-- Datas -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar size={20} class="text-clientes-500" />
                Datas da Viagem
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="voucher-modal-data-inicio" class="block text-sm font-medium text-slate-700 mb-1">
                    Data Início <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="voucher-modal-data-inicio"
                    type="date"
                    bind:value={form.data_inicio}
                    on:change={syncDaysWithStartDate}
                    class="vtur-input w-full {validationErrors.data_inicio ? 'border-red-500' : ''}"
                  />
                  {#if validationErrors.data_inicio}
                    <p class="text-red-500 text-xs mt-1">{validationErrors.data_inicio}</p>
                  {/if}
                </div>
                
                <div>
                  <label for="voucher-modal-data-fim" class="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
                  <input
                    id="voucher-modal-data-fim"
                    type="date"
                    bind:value={form.data_fim}
                    class="vtur-input w-full"
                  />
                </div>
              </div>
            </div>

            <!-- Acomodação e Operador -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="voucher-modal-tipo-acomodacao" class="block text-sm font-medium text-slate-700 mb-1">Tipo de Acomodação</label>
                  <select id="voucher-modal-tipo-acomodacao" bind:value={form.tipo_acomodacao} class="vtur-input w-full">
                    <option value="">Selecione...</option>
                    {#each acomodacaoOptions as opt}
                      <option value={opt}>{opt}</option>
                    {/each}
                  </select>
                </div>
                
                <div>
                  <label for="voucher-modal-operador" class="block text-sm font-medium text-slate-700 mb-1">Operador</label>
                  <input
                    id="voucher-modal-operador"
                    type="text"
                    bind:value={form.operador}
                    class="vtur-input w-full"
                    placeholder="Nome do operador"
                  />
                </div>
              </div>
            </div>

            <!-- Passageiros -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Users size={20} class="text-clientes-500" />
                  Passageiros
                </h3>
                <Button variant="secondary" size="sm" on:click={addPassenger}>
                  <Plus size={14} class="mr-1" />
                  Adicionar Passageiro
                </Button>
              </div>
              
              {#if form.extra_data.passageiros_detalhes?.length}
                <div class="space-y-3">
                  {#each form.extra_data.passageiros_detalhes as passenger, i}
                    <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
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
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="md:col-span-2">
                          <label for={`voucher-modal-passageiro-nome-${i}`} class="block text-xs font-medium text-slate-600 mb-1">Nome Completo</label>
                          <input
                            id={`voucher-modal-passageiro-nome-${i}`}
                            type="text"
                            value={passenger.nome}
                            on:input={(e) => updatePassenger(i, 'nome', e.currentTarget.value)}
                            class="vtur-input w-full"
                            placeholder="Nome do passageiro"
                          />
                        </div>
                        <div>
                          <label for={`voucher-modal-passageiro-passaporte-${i}`} class="block text-xs font-medium text-slate-600 mb-1">Passaporte</label>
                          <input
                            id={`voucher-modal-passageiro-passaporte-${i}`}
                            type="text"
                            value={passenger.passaporte || ''}
                            on:input={(e) => updatePassenger(i, 'passaporte', e.currentTarget.value)}
                            class="vtur-input w-full"
                            placeholder="Número do passaporte"
                          />
                        </div>
                        <div>
                          <label for={`voucher-modal-passageiro-data-${i}`} class="block text-xs font-medium text-slate-600 mb-1">Data Nascimento</label>
                          <input
                            id={`voucher-modal-passageiro-data-${i}`}
                            type="date"
                            value={passenger.data_nascimento || ''}
                            on:input={(e) => updatePassenger(i, 'data_nascimento', e.currentTarget.value)}
                            class="vtur-input w-full"
                          />
                        </div>
                        <div>
                          <label for={`voucher-modal-passageiro-nacionalidade-${i}`} class="block text-xs font-medium text-slate-600 mb-1">Nacionalidade</label>
                          <input
                            id={`voucher-modal-passageiro-nacionalidade-${i}`}
                            type="text"
                            value={passenger.nacionalidade || ''}
                            on:input={(e) => updatePassenger(i, 'nacionalidade', e.currentTarget.value)}
                            class="vtur-input w-full"
                            placeholder="Ex: Brasileira"
                          />
                        </div>
                        <div>
                          <label for={`voucher-modal-passageiro-tipo-${i}`} class="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                          <select
                            id={`voucher-modal-passageiro-tipo-${i}`}
                            value={passenger.tipo || ''}
                            on:change={(e) => updatePassenger(i, 'tipo', e.currentTarget.value)}
                            class="vtur-input w-full"
                          >
                            <option value="">Selecione...</option>
                            <option value="ADT">Adulto</option>
                            <option value="CHD">Criança</option>
                            <option value="INF">Bebê</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <Users size={32} class="mx-auto mb-2 opacity-50" />
                  <p>Nenhum passageiro adicionado</p>
                  <p class="text-sm">Clique em "Adicionar Passageiro" para incluir</p>
                </div>
              {/if}
            </div>

            <!-- Resumo -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <label for="voucher-modal-resumo" class="block text-sm font-medium text-slate-700 mb-2">Resumo da Viagem</label>
              <textarea
                id="voucher-modal-resumo"
                bind:value={form.resumo}
                rows="4"
                class="vtur-input w-full"
                placeholder="Descreva o resumo da viagem..."
              ></textarea>
            </div>
          </div>

        <!-- ETAPA 2: Dia a Dia Circuito -->
        {:else if currentStep === 1}
          <div class="space-y-6" in:fade={{ duration: 200 }}>
            <!-- Import from paste -->
            <div class="bg-blue-50 p-5 rounded-xl border border-blue-200">
              <p class="block text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                <FileText size={16} />
                Importar do Special Tours (colar texto)
              </p>
              <textarea
                bind:value={circuitPasteText}
                rows="4"
                class="vtur-input w-full border-blue-200 focus:border-blue-500"
                placeholder="Cole aqui o itinerário do Special Tours..."
              ></textarea>
              <div class="flex gap-2 mt-3">
                <Button variant="secondary" size="sm" on:click={importCircuitFromPaste}>
                  <FileText size={14} class="mr-1" />
                  Importar Itinerário
                </Button>
                {#if circuitPasteText}
                  <Button variant="ghost" size="sm" on:click={() => circuitPasteText = ''}>
                    Limpar
                  </Button>
                {/if}
              </div>
            </div>

            <!-- Days List -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-slate-900">Dias do Circuito</h3>
                <Button variant="primary" size="sm" on:click={addDay}>
                  <Plus size={14} class="mr-1" />
                  Adicionar Dia
                </Button>
              </div>

              {#if form.dias.length === 0}
                <div class="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <Calendar size={40} class="mx-auto mb-3 opacity-50" />
                  <p class="font-medium">Nenhum dia adicionado</p>
                  <p class="text-sm mt-1">Importe ou adicione manualmente os dias do circuito</p>
                </div>
              {:else}
                <div class="space-y-3">
                  {#each form.dias as dia, i}
                    <div class="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <div class="flex items-stretch justify-between bg-gradient-to-r from-slate-50 to-white transition-colors">
                        <button
                          type="button"
                          class="flex flex-1 items-center gap-4 px-4 py-4 text-left hover:from-slate-100 hover:to-slate-50 transition-colors"
                          on:click={() => toggleDayAccordion(i)}
                          aria-expanded={activeDayIndexes.includes(i)}
                        >
                          <div class="w-10 h-10 rounded-full bg-clientes-100 text-clientes-700 flex items-center justify-center font-bold">
                            {dia.dia_numero}
                          </div>
                          <div>
                            {#if dia.titulo}
                              <p class="font-medium text-slate-900">{dia.titulo}</p>
                            {:else}
                              <p class="font-medium text-slate-400">Dia {dia.dia_numero}</p>
                            {/if}
                            {#if dia.data_referencia}
                              <p class="text-sm text-slate-500">{formatDateBR(dia.data_referencia)}</p>
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
                            class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
                          >
                            <MoveUp size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Mover dia ${i + 1} para baixo`}
                            on:click={() => moveDay(i, 1)}
                            disabled={i === form.dias.length - 1}
                            class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
                          >
                            <MoveDown size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remover dia ${i + 1}`}
                            on:click={() => removeDay(i)}
                            class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {#if activeDayIndexes.includes(i)}
                        <div class="p-4 space-y-4 border-t border-slate-100" transition:slide>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label for={`voucher-modal-dia-titulo-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Título do Dia</label>
                              <input
                                id={`voucher-modal-dia-titulo-${i}`}
                                type="text"
                                bind:value={dia.titulo}
                                class="vtur-input w-full"
                                placeholder="Ex: Lisboa - Chegada"
                              />
                            </div>
                            <div>
                              <label for={`voucher-modal-dia-cidade-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                              <input
                                id={`voucher-modal-dia-cidade-${i}`}
                                type="text"
                                bind:value={dia.cidade}
                                class="vtur-input w-full"
                                placeholder="Nome da cidade"
                              />
                            </div>
                          </div>
                          <div>
                            <label for={`voucher-modal-dia-descricao-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Descrição das Atividades</label>
                            <textarea
                              id={`voucher-modal-dia-descricao-${i}`}
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

        <!-- ETAPA 3: Hotéis Confirmados -->
        {:else if currentStep === 2}
          <div class="space-y-6" in:fade={{ duration: 200 }}>
            <!-- Import from paste -->
            <div class="bg-blue-50 p-5 rounded-xl border border-blue-200">
              <p class="block text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                <FileText size={16} />
                Importar Hotéis do Special Tours (colar texto)
              </p>
              <textarea
                bind:value={hotelPasteText}
                rows="4"
                class="vtur-input w-full border-blue-200 focus:border-blue-500"
                placeholder="Cole aqui a lista de hotéis..."
              ></textarea>
              <div class="flex gap-2 mt-3">
                <Button variant="secondary" size="sm" on:click={importHotelsFromPaste}>
                  <FileText size={14} class="mr-1" />
                  Importar Hotéis
                </Button>
                {#if hotelPasteText}
                  <Button variant="ghost" size="sm" on:click={() => hotelPasteText = ''}>
                    Limpar
                  </Button>
                {/if}
              </div>
            </div>

            <!-- Hotels List -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-slate-900">Hotéis Confirmados</h3>
                <Button variant="primary" size="sm" on:click={addHotel}>
                  <Plus size={14} class="mr-1" />
                  Adicionar Hotel
                </Button>
              </div>

              {#if form.hoteis.length === 0}
                <div class="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <Hotel size={40} class="mx-auto mb-3 opacity-50" />
                  <p class="font-medium">Nenhum hotel adicionado</p>
                  <p class="text-sm mt-1">Importe ou adicione manualmente os hotéis</p>
                </div>
              {:else}
                <div class="space-y-3">
                  {#each form.hoteis as hotel, i}
                    <div class="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <div class="flex items-stretch justify-between bg-gradient-to-r from-slate-50 to-white transition-colors">
                        <button
                          type="button"
                          class="flex flex-1 items-center gap-3 px-4 py-4 text-left hover:from-slate-100 hover:to-slate-50 transition-colors"
                          on:click={() => toggleHotelAccordion(i)}
                          aria-expanded={activeHotelIndexes.includes(i)}
                        >
                          <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                            <Hotel size={20} />
                          </div>
                          <div>
                            <p class="font-medium text-slate-900">{hotel.hotel || `Hotel ${i + 1}`}</p>
                            {#if hotel.cidade}
                              <p class="text-sm text-slate-500">{hotel.cidade}</p>
                            {/if}
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
                            class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
                          >
                            <MoveUp size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Mover hotel ${i + 1} para baixo`}
                            on:click={() => moveHotel(i, 1)}
                            disabled={i === form.hoteis.length - 1}
                            class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
                          >
                            <MoveDown size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remover hotel ${i + 1}`}
                            on:click={() => removeHotel(i)}
                            class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {#if activeHotelIndexes.includes(i)}
                        <div class="p-4 space-y-4 border-t border-slate-100" transition:slide>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label for={`voucher-modal-hotel-cidade-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Cidade *</label>
                              <input
                                id={`voucher-modal-hotel-cidade-${i}`}
                                type="text"
                                bind:value={hotel.cidade}
                                class="vtur-input w-full"
                                placeholder="Nome da cidade"
                              />
                            </div>
                            <div>
                              <label for={`voucher-modal-hotel-nome-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Hotel *</label>
                              <input
                                id={`voucher-modal-hotel-nome-${i}`}
                                type="text"
                                bind:value={hotel.hotel}
                                class="vtur-input w-full"
                                placeholder="Nome do hotel"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label for={`voucher-modal-hotel-endereco-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                            <input
                              id={`voucher-modal-hotel-endereco-${i}`}
                              type="text"
                              bind:value={hotel.endereco}
                              class="vtur-input w-full"
                              placeholder="Endereço completo do hotel"
                            />
                          </div>
                          
                          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label for={`voucher-modal-hotel-checkin-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Check-in</label>
                              <input
                                id={`voucher-modal-hotel-checkin-${i}`}
                                type="date"
                                value={hotel.data_inicio}
                                on:input={(e) => updateHotelDates(i, 'data_inicio', e.currentTarget.value)}
                                class="vtur-input w-full"
                              />
                            </div>
                            <div>
                              <label for={`voucher-modal-hotel-checkout-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Check-out</label>
                              <input
                                id={`voucher-modal-hotel-checkout-${i}`}
                                type="date"
                                value={hotel.data_fim}
                                on:input={(e) => updateHotelDates(i, 'data_fim', e.currentTarget.value)}
                                class="vtur-input w-full"
                              />
                            </div>
                            <div>
                              <label for={`voucher-modal-hotel-noites-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Noites</label>
                              <input
                                id={`voucher-modal-hotel-noites-${i}`}
                                type="number"
                                bind:value={hotel.noites}
                                class="vtur-input w-full bg-slate-100"
                                readonly
                              />
                            </div>
                          </div>
                          
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label for={`voucher-modal-hotel-telefone-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                              <input
                                id={`voucher-modal-hotel-telefone-${i}`}
                                type="text"
                                bind:value={hotel.telefone}
                                class="vtur-input w-full"
                                placeholder="Telefone do hotel"
                              />
                            </div>
                            <div>
                              <label for={`voucher-modal-hotel-contato-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Contato</label>
                              <input
                                id={`voucher-modal-hotel-contato-${i}`}
                                type="text"
                                bind:value={hotel.contato}
                                class="vtur-input w-full"
                                placeholder="Nome do contato"
                              />
                            </div>
                          </div>
                          
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label for={`voucher-modal-hotel-status-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Status</label>
                              <select id={`voucher-modal-hotel-status-${i}`} bind:value={hotel.status} class="vtur-input w-full">
                                <option value="">Selecione...</option>
                                {#each statusOptions as opt}
                                  <option value={opt.value}>{opt.label}</option>
                                {/each}
                              </select>
                            </div>
                          </div>
                          
                          <div>
                            <label for={`voucher-modal-hotel-observacao-${i}`} class="block text-sm font-medium text-slate-700 mb-1">Observação</label>
                            <textarea
                              id={`voucher-modal-hotel-observacao-${i}`}
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

        <!-- ETAPA 4: Extra Data -->
        {:else if currentStep === 3}
          <div class="space-y-6" in:fade={{ duration: 200 }}>
            
            <!-- Traslados -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Plane size={20} class="text-clientes-500" />
                Traslados
              </h3>
              
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Traslado Chegada -->
                <div class="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 class="font-medium text-green-900 mb-3 flex items-center gap-2">
                    <Plane size={16} class="rotate-45" />
                    Traslado Chegada
                  </h4>
                  <div class="space-y-3">
                    <div>
                      <label for="voucher-modal-traslado-chegada-detalhes" class="block text-xs font-medium text-slate-600 mb-1">Detalhes</label>
                      <textarea
                        id="voucher-modal-traslado-chegada-detalhes"
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
                      <label for="voucher-modal-traslado-chegada-notas" class="block text-xs font-medium text-slate-600 mb-1">Notas</label>
                      <textarea
                        id="voucher-modal-traslado-chegada-notas"
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
                      <label for="voucher-modal-traslado-chegada-telefone" class="block text-xs font-medium text-slate-600 mb-1">Telefone Transferista</label>
                      <input
                        id="voucher-modal-traslado-chegada-telefone"
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

                <!-- Traslado Saída -->
                <div class="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 class="font-medium text-orange-900 mb-3 flex items-center gap-2">
                    <Plane size={16} class="-rotate-45" />
                    Traslado Saída
                  </h4>
                  <div class="space-y-3">
                    <div>
                      <label for="voucher-modal-traslado-saida-detalhes" class="block text-xs font-medium text-slate-600 mb-1">Detalhes</label>
                      <textarea
                        id="voucher-modal-traslado-saida-detalhes"
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
                      <label for="voucher-modal-traslado-saida-notas" class="block text-xs font-medium text-slate-600 mb-1">Notas</label>
                      <textarea
                        id="voucher-modal-traslado-saida-notas"
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
                      <label for="voucher-modal-traslado-saida-telefone" class="block text-xs font-medium text-slate-600 mb-1">Telefone Transferista</label>
                      <input
                        id="voucher-modal-traslado-saida-telefone"
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
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <AlertCircle size={20} class="text-amber-500" />
                Informações Importantes
              </h3>
              <textarea
                value={form.extra_data.informacoes_importantes || ''}
                on:input={(e) => form.extra_data = { ...form.extra_data, informacoes_importantes: e.currentTarget.value }}
                rows="5"
                class="vtur-input w-full"
                placeholder="Liste aqui as informações importantes para o passageiro..."
              ></textarea>
            </div>

            <!-- Apps Recomendados -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Smartphone size={20} class="text-clientes-500" />
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
                    <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
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
                          <label for={`voucher-modal-app-nome-${i}`} class="block text-xs font-medium text-slate-600 mb-1">Nome do App</label>
                          <input
                            id={`voucher-modal-app-nome-${i}`}
                            type="text"
                            value={app.nome}
                            on:input={(e) => updateApp(i, 'nome', e.currentTarget.value)}
                            class="vtur-input w-full"
                            placeholder="Ex: Google Tradutor"
                          />
                        </div>
                        <div>
                          <label for={`voucher-modal-app-descricao-${i}`} class="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                          <input
                            id={`voucher-modal-app-descricao-${i}`}
                            type="text"
                            value={app.descricao || ''}
                            on:input={(e) => updateApp(i, 'descricao', e.currentTarget.value)}
                            class="vtur-input w-full"
                            placeholder="Para que serve o app"
                          />
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <Smartphone size={32} class="mx-auto mb-2 opacity-50" />
                  <p>Nenhum app adicionado</p>
                  <p class="text-sm">Adicione apps úteis para a viagem</p>
                </div>
              {/if}
            </div>

            <!-- Emergência -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Phone size={20} class="text-red-500" />
                Contatos de Emergência
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label for="voucher-modal-emergencia-escritorio" class="block text-sm font-medium text-slate-700 mb-1">Escritório</label>
                  <input
                    id="voucher-modal-emergencia-escritorio"
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
                  <label for="voucher-modal-emergencia-24h" class="block text-sm font-medium text-slate-700 mb-1">Emergência 24h</label>
                  <input
                    id="voucher-modal-emergencia-24h"
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
                  <label for="voucher-modal-emergencia-whatsapp" class="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                  <input
                    id="voucher-modal-emergencia-whatsapp"
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
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          {#if currentStep > 0}
            <Button variant="secondary" on:click={prevStep}>
              ← Etapa Anterior
            </Button>
          {/if}
        </div>
        
        <div class="flex gap-3">
          <Button variant="ghost" on:click={close}>
            Cancelar
          </Button>
          
          {#if currentStep < steps.length - 1}
            <Button variant="primary" on:click={nextStep}>
              Próxima Etapa →
            </Button>
          {:else}
            <Button 
              variant="secondary" 
              on:click={() => save(false)}
              disabled={savingAsDraft}
            >
              {#if savingAsDraft}
                <span class="animate-spin mr-2">⏳</span>
                Salvando...
              {:else}
                <Save size={18} class="mr-2" />
                Salvar Rascunho
              {/if}
            </Button>
            
            <Button 
              variant="primary" 
              on:click={() => save(true)}
              disabled={saving}
            >
              {#if saving}
                <span class="animate-spin mr-2">⏳</span>
                Finalizando...
              {:else}
                <CheckCircle size={18} class="mr-2" />
                Finalizar Voucher
              {/if}
            </Button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
