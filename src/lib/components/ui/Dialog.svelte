<script lang="ts">
  import { X, Loader2 } from 'lucide-svelte';
  import type { ModuleColor } from '$lib/theme/colors';
  import Button from './Button.svelte';
  
  // Props
  export let open: boolean = false;
  export let title: string = '';
  export let size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
  export let color: 'clientes' | 'orcamentos' | 'operacao' | 'financeiro' | 'vendas' | 'blue' | 'green' | 'orange' | 'teal' = 'blue';
  export let dismissable: boolean = true;
  export let respectAppShell: boolean = false;
  
  // Botões de ação
  export let showCancel: boolean = true;
  export let cancelText: string = 'Cancelar';
  export let showConfirm: boolean = false;
  export let confirmText: string = 'Confirmar';
  export let confirmVariant: 'primary' | 'danger' = 'primary';
  export let loading: boolean = false;
  
  // Eventos
  export let onCancel: ((e?: Event) => void) | undefined = undefined;
  export let onConfirm: ((e?: Event) => void) | undefined = undefined;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100vw-22rem)]'
  };
  
  function handleCancel() {
    if (onCancel) onCancel();
    open = false;
  }
  
  function handleConfirm() {
    if (onConfirm) onConfirm();
    if (!loading) open = false;
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && dismissable) {
      handleCancel();
    }
  }
  
  function handleBackdropClick() {
    if (dismissable) {
      handleCancel();
    }
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-slate-900/50 z-[1100] flex items-center justify-center p-4"
    class:dialog-shell={respectAppShell}
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="button"
    tabindex="-1"
    aria-label="Fechar modal"
  >
    <!-- Modal -->
    <div 
      class="bg-white rounded-xl shadow-xl w-full {sizeClasses[size]} {size === 'full' ? 'max-h-[90vh]' : 'max-h-[90vh]'} overflow-hidden"
      on:click|stopPropagation
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-slate-100">
        <h3 class="text-lg font-semibold text-slate-900">{title}</h3>
        {#if dismissable}
          <button
            on:click={handleCancel}
            class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        {/if}
      </div>
      
      <!-- Content -->
      <div class="p-4 {size === 'full' ? 'overflow-y-auto max-h-[72vh]' : 'overflow-y-auto max-h-[60vh]'}">
        <slot />
      </div>
      
      <!-- Footer -->
      {#if showCancel || showConfirm}
        <div class="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
          {#if showCancel}
            <Button
              variant="secondary"
              on:click={handleCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
          {/if}
          {#if showConfirm}
            <Button
              variant={confirmVariant}
              color={confirmVariant === 'primary' ? color : undefined}
              on:click={handleConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
          {/if}
          <slot name="actions" />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @media (min-width: 1024px) {
    .dialog-shell {
      top: var(--vtur-topbar-height);
      left: calc(1rem + var(--vtur-sidebar-width) + 1rem);
      right: 0;
      bottom: 0;
      width: calc(100vw - (1rem + var(--vtur-sidebar-width) + 1rem));
      padding: 1rem;
      padding-top: 1rem;
      justify-content: center;
      align-items: center;
    }
  }
</style>
