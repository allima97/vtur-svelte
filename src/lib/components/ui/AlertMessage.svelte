<script lang="ts">
  export let variant: "error" | "success" | "info" | "warning" = "info";
  export let message = "";
</script>

{#if message}
  <div class={`alert-message ${variant}`.trim()}>
    {message}
  </div>
{/if}

<style>
  .alert-message {
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid transparent;
    font-size: 14px;
  }

  .alert-message.info {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #1d4ed8;
  }

  .alert-message.success {
    background: #ecfdf5;
    border-color: #a7f3d0;
    color: #047857;
  }

  .alert-message.warning {
    background: #fffbeb;
    border-color: #fde68a;
    color: #b45309;
  }

  .alert-message.error {
    background: #fef2f2;
    border-color: #fecaca;
    color: #b91c1c;
  }
</style>
