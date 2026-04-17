<script lang="ts">
  import { X, Calculator, Percent, DollarSign, CreditCard } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
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
    on:click={onClose}
    role="dialog"
    aria-modal="true"
  >
    <div 
      class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      on:click|stopPropagation
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
        <button
          on:click={onClose}
          class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[60vh]">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Coluna Esquerda - Entradas -->
          <div class="space-y-4">
            <!-- Valor Bruto -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Valor Bruto
              </label>
              <div class="relative">
                <DollarSign size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  bind:value={calc.valorBruto}
                  min="0"
                  step="0.01"
                  class="vtur-input pl-10 w-full"
                  placeholder="0,00"
                />
              </div>
            </div>
            
            <!-- Desconto -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Desconto
              </label>
              <div class="flex gap-2 mb-2">
                <button
                  type="button"
                  on:click={() => calc.descontoTipo = 'percentual'}
                  class="flex-1 py-2 px-3 text-sm rounded-lg border transition-colors {calc.descontoTipo === 'percentual' ? 'bg-vendas-100 border-vendas-300 text-vendas-700' : 'bg-white border-slate-200 text-slate-600'}"
                >
                  <Percent size={14} class="inline mr-1" />
                  %
                </button>
                <button
                  type="button"
                  on:click={() => calc.descontoTipo = 'valor'}
                  class="flex-1 py-2 px-3 text-sm rounded-lg border transition-colors {calc.descontoTipo === 'valor' ? 'bg-vendas-100 border-vendas-300 text-vendas-700' : 'bg-white border-slate-200 text-slate-600'}"
                >
                  <DollarSign size={14} class="inline mr-1" />
                  R$
                </button>
              </div>
              {#if calc.descontoTipo === 'percentual'}
                <div class="relative">
                  <Percent size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    bind:value={calc.descontoPercentual}
                    min="0"
                    max="100"
                    step="0.01"
                    class="vtur-input pl-10 w-full"
                    placeholder="0,00"
                  />
                </div>
                <!-- Descontos sugeridos -->
                <div class="flex gap-1 mt-2">
                  {#each [5, 10, 15, 20] as pct}
                    <button
                      type="button"
                      on:click={() => aplicarDescontoSugerido(pct)}
                      class="px-2 py-1 text-xs bg-slate-100 hover:bg-vendas-100 text-slate-600 hover:text-vendas-700 rounded transition-colors"
                    >
                      {pct}%
                    </button>
                  {/each}
                </div>
              {:else}
                <div class="relative">
                  <DollarSign size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    bind:value={calc.descontoValor}
                    min="0"
                    step="0.01"
                    class="vtur-input pl-10 w-full"
                    placeholder="0,00"
                  />
                </div>
              {/if}
            </div>
            
            <!-- Taxas -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Taxas (cartão, etc.)
              </label>
              <div class="relative">
                <DollarSign size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  bind:value={calc.taxas}
                  min="0"
                  step="0.01"
                  class="vtur-input pl-10 w-full"
                  placeholder="0,00"
                />
              </div>
            </div>
            
            <!-- Comissão -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                % Comissão
              </label>
              <div class="relative">
                <Percent size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  bind:value={calc.comissaoPercentual}
                  min="0"
                  max="100"
                  step="0.01"
                  class="vtur-input pl-10 w-full"
                  placeholder="10,00"
                />
              </div>
            </div>
            
            <!-- Parcelas -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Número de Parcelas
              </label>
              <div class="relative">
                <CreditCard size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  bind:value={calc.parcelas}
                  class="vtur-input pl-10 w-full"
                >
                  <option value={1}>À vista</option>
                  {#each [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as num}
                    <option value={num}>{num}x</option>
                  {/each}
                </select>
              </div>
            </div>
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
      <div class="flex items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
        <Button variant="ghost" on:click={limpar}>
          Limpar
        </Button>
        <div class="flex gap-3">
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
