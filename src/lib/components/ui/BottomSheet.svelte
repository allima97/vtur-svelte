<script lang="ts">
  import type { Component } from 'svelte';

  export let open = false;
  export let title = '';
  export let maxHeight = 0.85;
  export let snapPoints: number[] = [0.5, 0.85];
  export let startingSnapPoint = 1;
  export let position: 'bottom' | 'top' | 'left' | 'right' = 'bottom';
  export let showHandle = true;
  export let showClose = true;
  export let class_name = '';
  export let onclose: (() => void) | undefined = undefined;

  let Impl: Component | null = null;
  let loadingImpl = false;

  async function ensureBottomSheetLoaded() {
    if (Impl || loadingImpl || typeof window === 'undefined') return;
    loadingImpl = true;
    try {
      Impl = (await import('./BottomSheetImpl.svelte')).default;
    } finally {
      loadingImpl = false;
    }
  }

  $: if (open) {
    void ensureBottomSheetLoaded();
  }
</script>

{#if Impl}
  <svelte:component
    this={Impl}
    bind:open
    {title}
    {maxHeight}
    {snapPoints}
    {startingSnapPoint}
    {position}
    {showHandle}
    {showClose}
    {class_name}
    {onclose}
  >
    <slot />
  </svelte:component>
{/if}
