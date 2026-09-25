<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let position: 'center' | 'top' = 'center';
  export let zIndex = 'z-50';
  export let padding = 'p-4';
  export let scroll = false;
  export let backdropClass = 'bg-slate-900/50';
  export let class_name = '';
  export let onclose: ((event?: Event) => void) | undefined = undefined;

  const dispatch = createEventDispatcher<{ close: Event | undefined }>();

  // Ao abrir, o foco vai para a janela (Esc funciona de imediato); ao fechar,
  // volta para o elemento que estava focado antes.
  function manageFocus(node: HTMLElement) {
    const previous = document.activeElement as HTMLElement | null;
    if (!node.contains(document.activeElement)) node.focus();
    return {
      destroy() {
        if (previous && document.contains(previous)) previous.focus();
      }
    };
  }

  function close(event?: Event) {
    open = false;
    onclose?.(event);
    dispatch('close', event);
  }

  $: alignment = position === 'top' ? 'items-start' : 'items-center';
  $: overflowStyle = scroll ? 'overflow-y: auto;' : undefined;
</script>

{#if open}
  <div
    class={`fixed inset-0 ${backdropClass} ${zIndex} flex ${alignment} justify-center ${padding} ${class_name}`.trim()}
    style={overflowStyle}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    use:manageFocus
    on:click|self={close}
    on:keydown={(event) => event.key === 'Escape' && close(event)}
  >
    <slot />
  </div>
{/if}
