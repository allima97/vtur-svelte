<script lang="ts">
  export let canEdit = false;
  export let canDelete = false;
  export let deleting = false;

  export let onEdit: (() => void) | undefined = undefined;
  export let onDelete: (() => void) | undefined = undefined;
</script>

<div class="table-actions flex flex-wrap items-center gap-2">
  {#if canEdit}
    <button type="button" class="vtur-button vtur-button--secondary" on:click={onEdit}>
      Editar
    </button>
  {/if}
  {#if canDelete}
    <button type="button" class="vtur-button vtur-button--danger" on:click={onDelete} disabled={deleting}>
      {#if deleting}
        Excluindo...
      {:else}
        Excluir
      {/if}
    </button>
  {/if}
</div>

<style>
  .table-actions button {
    border-radius: 10px;
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    background: #fff;
    color: #374151;
    cursor: pointer;
    font-size: 14px;
  }

  .table-actions button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .vtur-button--danger {
    border-color: #fca5a5;
    background: #fef2f2;
    color: #b91c1c;
  }

  .vtur-button--secondary {
    background: #fff;
    color: #374151;
  }
</style>
