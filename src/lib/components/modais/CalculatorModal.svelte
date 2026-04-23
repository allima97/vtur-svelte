<script lang="ts">
  import { X, Calculator, Percent, DollarSign } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  
  // Props
  export let open: boolean = false;
  export let valorBruto: number = 0;
  export let onClose: () => void = () => {};
  export let onConfirm: (resultado: CalculoResultado) => void = () => {};
  
  interface CalculoResultado {
    valorBruto: number;
    descontoValor: number;
    descontoPercentual: number;
    taxas: number;
    comissaoPercentual: number;
    comissaoValor: number;
    valorFinal: number;
    parcelas: number;
    valorParcela: number;
  }
  
  // Estado do cálculo
  let calc = {
    valorBruto: valorBruto || 0,
    descontoTipo: 'percentual' as 'percentual' | 'valor',
    descontoPercentual: 0,
    descontoValor: 0,
    taxas: 0,
    comissaoPercentual: 10, // Padrão 10%
    parcelas: 1
  };
  
  // Valores calculados
  $: valorDesconto = calc.descontoTipo === 'percentual' 
    ? (calc.valorBruto * calc.descontoPercentual / 100)
    : calc.descontoValor;
  
  $: valorFinal = calc.valorBruto - valorDesconto - calc.taxas;
  
  $: comissaoValor = (valorFinal * calc.comissaoPercentual / 100);
  
  $: valorParcela = calc.parcelas > 1 ? (valorFinal / calc.parcelas) : valorFinal;
  $: parcelasValue = String(calc.parcelas);
  
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }
  
  function handleConfirm() {
    const resultado: CalculoResultado = {
      valorBruto: calc.valorBruto,
      descontoValor: valorDesconto,
      descontoPercentual: calc.descontoPercentual,
      taxas: calc.taxas,
      comissaoPercentual: calc.comissaoPercentual,
      comissaoValor: comissaoValor,
      valorFinal: valorFinal,
      parcelas: calc.parcelas,
      valorParcela: valorParcela
    };
    
    onConfirm(resultado);
    toast.success('Valores aplicados!');
    onClose();
  }
  
  function aplicarDescontoSugerido(percentual: number) {
    calc.descontoTipo = 'percentual';
    calc.descontoPercentual = percentual;
  }
  
  function limpar() {
    calc = {
      valorBruto: valorBruto || 0,
      descontoTipo: 'percentual',
      descontoPercentual: 0,
      descontoValor: 0,
      taxas: 0,
      comissaoPercentual: 10,
      parcelas: 1
    };
  }
</script>

{#if open}
  <div 
    class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
    on:click|self={onClose}
    on:keydown={(event) => event.key === 'Escape' && onClose()}
    role="dialog"
    aria-modal="true"
    tabindex="0"
  >
    <div 
      class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-slate-100 bg-vendas-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-vendas-100 flex items-center justify-center">
            <Calculator size={24} class="text-vendas-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-slate-900">Calculadora de Valores</h3>
            <p class="text-sm text-slate-500">Calcule comissões, descontos e parcelas</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class_name="p-2"
          ariaLabel="Fechar calculadora"
          on:click={onClose}
        >
          <X size={20} />
        </Button>
      </div>
      
      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[60vh]">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Coluna Esquerda - Entradas -->
          <div class="space-y-4">
            <!-- Valor Bruto -->
            <FieldInput
              id="calc-valor-bruto"
              label="Valor Bruto"
              type="number"
              bind:value={calc.valorBruto}
              min="0"
              step="0.01"
              placeholder="0,00"
              icon={DollarSign}
            />
            
            <!-- Desconto -->
            <fieldset>
              <legend class="block text-sm font-medium text-slate-700 mb-1">
                Desconto
              </legend>
              <div class="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={calc.descontoTipo === 'percentual' ? 'primary' : 'secondary'}
                  color="vendas"
                  class_name="flex-1"
                  on:click={() => calc.descontoTipo = 'percentual'}
                >
                  <Percent size={14} class="inline mr-1" />
                  %
                </Button>
                <Button
                  type="button"
                  variant={calc.descontoTipo === 'valor' ? 'primary' : 'secondary'}
                  color="vendas"
                  class_name="flex-1"
                  on:click={() => calc.descontoTipo = 'valor'}
                >
                  <DollarSign size={14} class="inline mr-1" />
                  R$
                </Button>
              </div>
              {#if calc.descontoTipo === 'percentual'}
                <FieldInput
                  id="calc-desconto-percentual"
                  type="number"
                  bind:value={calc.descontoPercentual}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0,00"
                  icon={Percent}
                />
                <!-- Descontos sugeridos -->
                <div class="flex gap-1 mt-2">
                  {#each [5, 10, 15, 20] as pct}
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      class_name="px-2 py-1"
                      on:click={() => aplicarDescontoSugerido(pct)}
                    >
                      {pct}%
                    </Button>
                  {/each}
                  </div>
              {:else}
                <FieldInput
                  id="calc-desconto-valor"
                  type="number"
                  bind:value={calc.descontoValor}
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  icon={DollarSign}
                />
              {/if}
            </fieldset>
            
            <!-- Taxas -->
            <FieldInput
              id="calc-taxas"
              label="Taxas (cartão, etc.)"
              type="number"
              bind:value={calc.taxas}
              min="0"
              step="0.01"
              placeholder="0,00"
              icon={DollarSign}
            />
            
            <!-- Comissão -->
            <FieldInput
              id="calc-comissao"
              label="% Comissão"
              type="number"
              bind:value={calc.comissaoPercentual}
              min="0"
              max="100"
              step="0.01"
              placeholder="10,00"
              icon={Percent}
            />
            
            <!-- Parcelas -->
            <FieldSelect
              id="calc-parcelas"
              label="Número de Parcelas"
              bind:value={parcelasValue}
              placeholder={null}
              options={[
                { value: '1', label: 'À vista' },
                ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({ value: String(num), label: `${num}x` }))
              ]}
              on:change={() => {
                calc.parcelas = Number(parcelasValue);
              }}
            />
          </div>
          
          <!-- Coluna Direita - Resultados -->
          <div class="bg-slate-50 rounded-xl p-4 space-y-4">
            <h4 class="font-medium text-slate-900">Resumo</h4>
            
            <!-- Valor Bruto -->
            <div class="flex justify-between items-center py-2 border-b border-slate-200">
              <span class="text-slate-600">Valor Bruto</span>
              <span class="font-medium text-slate-900">{formatCurrency(calc.valorBruto)}</span>
            </div>
            
            <!-- Desconto -->
            <div class="flex justify-between items-center py-2 border-b border-slate-200">
              <span class="text-red-600">Desconto</span>
              <span class="font-medium text-red-600">-{formatCurrency(valorDesconto)}</span>
            </div>
            
            <!-- Taxas -->
            <div class="flex justify-between items-center py-2 border-b border-slate-200">
              <span class="text-orange-600">Taxas</span>
              <span class="font-medium text-orange-600">-{formatCurrency(calc.taxas)}</span>
            </div>
            
            <!-- Valor Final -->
            <div class="flex justify-between items-center py-3 bg-vendas-100 rounded-lg px-3">
              <span class="font-semibold text-vendas-900">Valor Final</span>
              <span class="font-bold text-xl text-vendas-700">{formatCurrency(valorFinal)}</span>
            </div>
            
            <!-- Comissão -->
            <div class="flex justify-between items-center py-2 border-b border-slate-200">
              <span class="text-slate-600">Comissão ({calc.comissaoPercentual}%)</span>
              <span class="font-medium text-slate-900">{formatCurrency(comissaoValor)}</span>
            </div>
            
            <!-- Parcelas -->
            {#if calc.parcelas > 1}
              <div class="bg-blue-50 rounded-lg p-3">
                <div class="flex justify-between items-center">
                  <span class="text-blue-700">{calc.parcelas}x de</span>
                  <span class="font-bold text-blue-800">{formatCurrency(valorParcela)}</span>
                </div>
                <p class="text-xs text-blue-600 mt-1">sem juros</p>
              </div>
            {/if}
            
            <!-- Lucro/Receita -->
            <div class="flex justify-between items-center py-2 pt-4 border-t-2 border-slate-200">
              <span class="font-semibold text-slate-900">Receita Líquida</span>
              <span class="font-bold text-lg text-green-600">{formatCurrency(valorFinal - comissaoValor)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="vtur-modal-footer vtur-modal-footer--between">
        <Button variant="ghost" on:click={limpar}>
          Limpar
        </Button>
        <div class="vtur-modal-footer__actions">
          <Button variant="secondary" on:click={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" color="vendas" on:click={handleConfirm}>
            Aplicar Valores
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
