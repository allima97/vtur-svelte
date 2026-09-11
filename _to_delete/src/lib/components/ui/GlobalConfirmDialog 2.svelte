<script lang="ts">
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { confirmState, resolveConfirmAction } from '$lib/stores/confirm';
</script>

{#if $confirmState}
  <ConfirmDialog
    open={true}
    title={$confirmState.title}
    message={$confirmState.message}
    confirmLabel={$confirmState.confirmLabel}
    cancelLabel={$confirmState.cancelLabel}
    confirmVariant={$confirmState.confirmVariant}
    color={$confirmState.color}
    onConfirm={() => resolveConfirmAction(true)}
    onCancel={() => resolveConfirmAction(false)}
  />
{/if}
