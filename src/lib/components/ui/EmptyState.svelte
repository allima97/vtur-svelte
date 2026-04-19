<script lang="ts">
  export let title = 'Nenhum resultado encontrado';
  export let message = 'Não há dados para exibir no momento.';
  export let icon: any = null; // componente Lucide opcional
</script>

<div class="flex flex-col items-center justify-center px-6 py-14 text-center">
  {#if icon}
    <svelte:component this={icon} size={40} class="mb-4 text-slate-300" />
  {:else}
    <!-- Inbox vazio — ícone genérico de caixa */-->
    <svg class="mb-4 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  {/if}
  <h3 class="mb-1 text-base font-semibold text-slate-800">{title}</h3>
  <p class="mb-4 max-w-sm text-sm text-slate-500">{message}</p>
  <slot />
</div>
