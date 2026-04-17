<script lang="ts">
  export let open = false;
  export let title = "Confirmar ação";
  export let message = "Tem certeza de que deseja continuar?";
  export let confirmLabel = "Confirmar";
  export let cancelLabel = "Cancelar";

  export let onConfirm: (() => void) | undefined = undefined;
  export let onCancel: (() => void) | undefined = undefined;
</script>

{#if open}
  <div class="dialog-backdrop" role="presentation">
    <div
      class="dialog-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div class="dialog-copy">
        <h3 id="confirm-dialog-title">{title}</h3>
        <p id="confirm-dialog-description">{message}</p>
      </div>

      <div class="dialog-actions">
        <button type="button" class="secondary" on:click={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" class="primary" on:click={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 39, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    z-index: 1200;
  }

  .dialog-card {
    width: min(100%, 420px);
    background: #fff;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
    display: grid;
    gap: 18px;
  }

  .dialog-copy {
    display: grid;
    gap: 8px;
  }

  h3 {
    margin: 0;
    color: #111827;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
    line-height: 1.5;
  }

  .dialog-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  button {
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 14px;
    cursor: pointer;
    border: 1px solid #d1d5db;
  }

  .secondary {
    background: #fff;
    color: #374151;
  }

  .primary {
    background: #111827;
    color: #fff;
    border-color: #111827;
  }
</style>
