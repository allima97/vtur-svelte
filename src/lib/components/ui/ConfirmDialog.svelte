<script lang="ts">
  import { Modal } from 'flowbite-svelte';
  import { ExclamationCircleSolid } from 'flowbite-svelte-icons';
  import Button from './Button.svelte';

  export let open = false;
  export let title = 'Confirmar ação';
  export let message = 'Tem certeza de que deseja continuar?';
  export let confirmLabel = 'Confirmar';
  export let cancelLabel = 'Cancelar';
  export let confirmVariant: 'primary' | 'danger' = 'primary';
  export let loading = false;

  export let onConfirm: (() => void) | undefined = undefined;
  export let onCancel: (() => void) | undefined = undefined;

  function handleCancel() {
    open = false;
    onCancel?.();
  }

  function handleConfirm() {
    onConfirm?.();
  }
</script>

<Modal bind:open size="sm" autoclose={false} class="z-[1200]">
  <div class="flex flex-col items-center gap-4 py-2 text-center">
    <ExclamationCircleSolid class="h-12 w-12 text-amber-400" />
    <h3 class="text-lg font-semibold text-slate-900">{title}</h3>
    {#if message}
      <p class="text-sm leading-relaxed text-slate-500">{message}</p>
    {/if}
    <slot />
    <div class="vtur-confirm-dialog__actions mt-2">
      <Button variant="secondary" on:click={handleCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant={confirmVariant}
        on:click={handleConfirm}
        {loading}
      >
        {confirmLabel}
      </Button>
    </div>
  </div>
</Modal>
