<script lang="ts">
  import { onDestroy } from 'svelte';
  import { toast } from "$lib/stores/ui";

  let toasts = [];
  const unsubscribe = toast.subscribe((value) => {
    toasts = value;
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

<div class="toast-container">
  {#each toasts as toastItem (toastItem.id)}
    <div class={`toast ${toastItem.type}`}>
      {toastItem.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1000;
  }

  .toast {
    padding: 12px 14px;
    border-radius: 10px;
    color: #fff;
    font-size: 14px;
    min-width: 200px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .toast.success {
    background: #16a34a;
  }

  .toast.error {
    background: #dc2626;
  }

  .toast.info {
    background: #2563eb;
  }

  .toast.warning {
    background: #d97706;
  }
</style>
