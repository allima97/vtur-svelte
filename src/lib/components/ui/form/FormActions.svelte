<script lang="ts">
  import Button from '../Button.svelte';

  export let saving = false;
  export let submitLabel: string = 'Salvar';
  export let cancelLabel: string = 'Cancelar';
  export let onSubmit: (() => void) | undefined = undefined;
  export let onCancel: (() => void) | undefined = undefined;
</script>

<div class="form-actions flex flex-wrap items-center gap-3">
  <Button type="button" variant="primary" loading={saving} on:click={onSubmit}>
    {saving ? 'Salvando...' : submitLabel}
  </Button>
  <Button type="button" variant="secondary" on:click={onCancel}>
    {cancelLabel}
  </Button>
</div>
