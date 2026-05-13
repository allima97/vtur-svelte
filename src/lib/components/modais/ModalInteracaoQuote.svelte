<script lang="ts">
  import { MessageCircle, Phone, Mail, Calendar, Send, Clock } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { Dialog, FieldInput, FieldSelect, FieldTextarea, LoadingState } from '$lib/components/ui';
  import { apiFetch, apiGet } from '$lib/services/api';
  import { toast } from '$lib/stores/ui';
  import { formatDateTime as formatDateTimeValue } from '$lib/utils/formatters';
  import { onMount } from 'svelte';
  
  // Props
  export let open: boolean = false;
  export let orcamentoId: string = '';
  export let clienteNome: string = '';
  export let onClose: () => void = () => {};
  export let onSave: () => void = () => {};

  type InteracaoQuote = {
    tipo: string;
    created_at: string;
    observacoes: string;
    data_agendamento?: string | null;
  };
  
  // Estado
  let loading = false;
  let salvando = false;
  let interacoes: InteracaoQuote[] = [];
  
  let novaInteracao = {
    tipo: 'ligacao' as 'ligacao' | 'email' | 'whatsapp' | 'reuniao' | 'outro',
    status: 'pendente' as 'pendente' | 'aguardando' | 'concluido',
    observacoes: '',
    data_agendamento: '',
    responsavel: ''
  };
  
  const tiposInteracao = [
    { value: 'ligacao', label: 'Ligação', icon: Phone, color: 'text-blue-600' },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
    { value: 'email', label: 'Email', icon: Mail, color: 'text-orange-600' },
    { value: 'reuniao', label: 'Reunião', icon: Calendar, color: 'text-purple-600' },
    { value: 'outro', label: 'Outro', icon: MessageCircle, color: 'text-slate-600' }
  ];
  
  const statusNegociacao = [
    { value: 'novo', label: 'Novo', color: 'bg-slate-100 text-slate-700' },
    { value: 'pendente', label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
    { value: 'aguardando', label: 'Aguardando Cliente', color: 'bg-blue-100 text-blue-700' },
    { value: 'concluido', label: 'Concluído', color: 'bg-green-100 text-green-700' },
    { value: 'rejeitado', label: 'Rejeitado', color: 'bg-red-100 text-red-700' }
  ];
  
  onMount(async () => {
    if (open && orcamentoId) {
      await carregarInteracoes();
    }
  });
  
  async function carregarInteracoes() {
    loading = true;
    try {
      const data = await apiGet<{ interacoes?: InteracaoQuote[] }>('/api/v1/orcamentos/interacao', { quote_id: orcamentoId });
      interacoes = data.interacoes || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar interações.');
    } finally {
      loading = false;
    }
  }
  
  async function salvarInteracao() {
    if (!novaInteracao.observacoes.trim()) {
      toast.error('Digite uma observação');
      return;
    }
    
    salvando = true;
    try {
      await apiFetch('/api/v1/orcamentos/interacao', {
        method: 'POST',
        query: { quote_id: orcamentoId },
        body: {
          ...novaInteracao,
          agendar_proximo_contato: !!novaInteracao.data_agendamento,
          data_proximo_contato: novaInteracao.data_agendamento ? novaInteracao.data_agendamento.split('T')[0] : null,
          hora_proximo_contato: novaInteracao.data_agendamento ? novaInteracao.data_agendamento.split('T')[1]?.substring(0, 5) : null
        }
      });
      
      toast.success('Interação registrada!');
      await carregarInteracoes();
      
      // Limpar formulário
      novaInteracao = {
        tipo: 'ligacao',
        status: 'pendente',
        observacoes: '',
        data_agendamento: '',
        responsavel: ''
      };
      
      onSave();
    } catch (err) {
      toast.error('Erro ao salvar interação');
    } finally {
      salvando = false;
    }
  }
  
  function formatDate(dateString: string): string {
    return formatDateTimeValue(dateString);
  }
  
  function getTipoIcon(tipo: string) {
    const found = tiposInteracao.find(t => t.value === tipo);
    return found?.icon || MessageCircle;
  }
  
  function getTipoColor(tipo: string) {
    const found = tiposInteracao.find(t => t.value === tipo);
    return found?.color || 'text-slate-600';
  }
  
  function getTipoLabel(tipo: string) {
    const found = tiposInteracao.find(t => t.value === tipo);
    return found?.label || tipo;
  }
</script>

<Dialog
  bind:open
  title="Histórico de Interações"
  description={`Cliente: ${clienteNome}`}
  color="clientes"
  size="lg"
  cancelText="Fechar"
  onclose={onClose}
>
  <div class="space-y-6">
        <!-- Nova Interação -->
        <div class="vtur-modal-section-compact bg-slate-50 rounded-xl p-4 mb-6">
          <h4 class="font-medium text-slate-900 mb-4">Registrar Nova Interação</h4>
          
          <div class="space-y-4">
            <!-- Tipo -->
            <fieldset>
              <legend class="block text-sm font-medium text-slate-700 mb-2">Tipo</legend>
              <div class="flex gap-2">
                {#each tiposInteracao.slice(0, 4) as tipo}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    class_name={`flex-1 flex-col gap-1 py-2 text-xs ${novaInteracao.tipo === tipo.value ? 'border-clientes-300 bg-clientes-100 text-clientes-700 hover:!bg-clientes-100' : 'text-slate-600'}`}
                    on:click={() => {
                      novaInteracao.tipo = tipo.value as typeof novaInteracao.tipo;
                    }}
                  >
                    <svelte:component this={tipo.icon} size={16} class={tipo.color} />
                    {tipo.label}
                  </Button>
                {/each}
              </div>
            </fieldset>
            
            <!-- Status -->
            <FieldSelect
              id="interacao-status"
              label="Status"
              bind:value={novaInteracao.status}
              options={statusNegociacao.map((status) => ({ value: status.value, label: status.label }))}
              placeholder={null}
              class_name="w-full"
            />
            
            <FieldInput
              id="interacao-data-agendamento"
              label="Próximo Contato (opcional)"
              type="datetime-local"
              bind:value={novaInteracao.data_agendamento}
              icon={Clock}
              class_name="w-full"
            />
            
            <FieldTextarea
              id="interacao-observacoes"
              label="Observações"
              bind:value={novaInteracao.observacoes}
              rows={3}
              class_name="w-full"
              placeholder="Descreva o contato com o cliente..."
            />
            
            <!-- Botão Salvar -->
            <Button
              variant="primary"
              color="clientes"
              on:click={salvarInteracao}
              loading={salvando}
              class_name="w-full"
            >
              <Send size={16} class="mr-2" />
              Registrar Interação
            </Button>
          </div>
        </div>
        
        <!-- Histórico -->
        <div>
          <h4 class="font-medium text-slate-900 mb-4">Histórico</h4>
          
          {#if loading}
            <LoadingState compact={true} />
          {:else if interacoes.length === 0}
            <div class="text-center py-8 text-slate-500">
              <MessageCircle size={48} class="mx-auto mb-3 opacity-30" />
              <p>Nenhuma interação registrada</p>
            </div>
          {:else}
            <div class="space-y-3">
              {#each interacoes as interacao}
                <div class="vtur-modal-list-item flex gap-3 p-3 bg-slate-50 rounded-lg">
                  <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <svelte:component 
                      this={getTipoIcon(interacao.tipo)} 
                      size={18} 
                      class={getTipoColor(interacao.tipo)} 
                    />
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <span class="font-medium text-slate-900">
                        {getTipoLabel(interacao.tipo)}
                      </span>
                      <span class="text-xs text-slate-500">
                        {formatDate(interacao.created_at)}
                      </span>
                    </div>
                    <p class="text-sm text-slate-700 mt-1">{interacao.observacoes}</p>
                    {#if interacao.data_agendamento}
                      <div class="flex items-center gap-1 mt-2 text-xs text-amber-600">
                        <Clock size={12} />
                        Próximo contato: {formatDate(interacao.data_agendamento)}
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
  </div>
</Dialog>
