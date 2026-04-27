<script lang="ts">
  import Button from './Button.svelte';

  export let canEdit = false;
  export let canDelete = false;
  export let deleting = false;

  export let onEdit: (() => void) | undefined = undefined;
  export let onDelete: (() => void) | undefined = undefined;
</script>

<div class="table-actions flex flex-wrap items-center gap-2">
  {#if canEdit}
    <Button type="button" variant="primary" size="sm" on:click={() => onEdit?.()}>
      Editar
    </Button>
  {/if}
  {#if canDelete}
    <Button type="button" variant="danger" size="sm" on:click={() => onDelete?.()} disabled={deleting}>
      {#if deleting}
        Excluindo...
      {:else}
        Excluir
      {/if}
    </Button>
  {/if}
</div>
