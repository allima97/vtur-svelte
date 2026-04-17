<script lang="ts">
  export let page = 1;
  export let total = 0;
  export let pageSize = 10;

  export let onPrev: (() => void) | undefined = undefined;
  export let onNext: (() => void) | undefined = undefined;

  $: totalPages = Math.max(1, Math.ceil(total / pageSize));
  $: start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  $: end = Math.min(page * pageSize, total);
</script>

{#if total > 0}
  <nav class="pagination-controls" aria-label="Paginação">
    <div class="summary">
      Exibindo {start}-{end} de {total}
    </div>

    <div class="actions">
      <button type="button" disabled={page <= 1} on:click={onPrev}>
        Anterior
      </button>
      <span>Página {page} de {totalPages}</span>
      <button type="button" disabled={page >= totalPages} on:click={onNext}>
        Próxima
      </button>
    </div>
  </nav>
{/if}

<style>
  .pagination-controls {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .summary {
    color: #6b7280;
    font-size: 14px;
  }

  .actions {
    display: inline-flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  button {
    border: 1px solid #d1d5db;
    background: #fff;
    color: #374151;
    border-radius: 10px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  span {
    font-size: 13px;
    color: #374151;
  }
</style>
