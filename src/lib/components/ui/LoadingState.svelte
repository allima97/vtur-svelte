<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import type { ComponentType } from 'svelte';

  export let title = 'Carregando dados';
  export let message = 'Aguarde enquanto o sistema busca as informações.';
  export let icon: ComponentType | null = null;
  export let compact = false;
  export let className = '';

  $: Icon = icon || Loader2;
</script>

<div
  class={`flex items-center justify-center ${compact ? 'px-4 py-5' : 'px-6 py-10'} ${className}`}
  role="status"
  aria-live="polite"
>
  <div class="flex max-w-xl items-center gap-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left shadow-sm">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
      <svelte:component this={Icon} size={22} class={Icon === Loader2 ? 'animate-spin' : ''} />
    </div>
    <div class="min-w-0">
      <p class="text-sm font-semibold text-blue-900">{title}</p>
      <p class="mt-0.5 text-sm leading-relaxed text-blue-700">{message}</p>
    </div>
  </div>
</div>
