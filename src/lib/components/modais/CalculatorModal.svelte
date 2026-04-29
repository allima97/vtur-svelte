<script lang="ts">
  import { X, Calculator, TrendingDown } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Tabs from '$lib/components/ui/Tabs.svelte';
  import CalculatorBody from '$lib/components/calculadora/CalculatorBody.svelte';
  import ConcorrenciaTab from '$lib/components/modais/ConcorrenciaTab.svelte';

  // Props
  export let open: boolean = false;
  export let onClose: () => void = () => {};

  // Abas
  let abaAtiva = 'calculadora';
  const abas = [
    { key: 'calculadora', label: 'Calculadora', icon: Calculator },
    { key: 'concorrencia', label: 'Concorrência', icon: TrendingDown },
  ];

  $: if (open) {
    abaAtiva = 'calculadora';
  }
</script>

<svelte:window on:keydown={(event) => {
  if (!open) return;
  if (event.key === 'Escape') {
    onClose();
  }
}} />

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
      <div class="vtur-modal-header border-b border-slate-100 bg-vendas-50">
        <div class="vtur-modal-header__lead">
          <div class="vtur-modal-header__icon bg-vendas-100">
            <Calculator size={24} class="text-vendas-600" />
          </div>
          <div class="vtur-modal-header__copy">
            <h3 class="vtur-modal-header__title">Calculadora</h3>
            <p class="vtur-modal-header__subtitle">Operações rápidas no padrão visual do sistema</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class_name="vtur-modal-header__close p-2"
          ariaLabel="Fechar calculadora"
          on:click={onClose}
        >
          <X size={20} />
        </Button>
      </div>

      <!-- Abas -->
      <div class="vtur-modal-tabs">
        <Tabs items={abas} bind:activeKey={abaAtiva} />
      </div>

      <!-- Content -->
      <div
        class="vtur-modal-body-dense"
        style={abaAtiva === 'calculadora' ? 'padding: 0.875rem 1rem; max-height: none; overflow: visible;' : undefined}
      >

        <!-- Aba Concorrência -->
        {#if abaAtiva === 'concorrencia'}
          <ConcorrenciaTab />
        {:else}
          <CalculatorBody />
        {/if}
      </div>

      <!-- Footer -->
      <div class="vtur-modal-footer vtur-modal-footer--between">
        {#if abaAtiva === 'concorrencia'}
          <div></div>
        {/if}
        <div class="vtur-modal-footer__actions">
          <Button variant="secondary" on:click={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
