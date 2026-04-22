<script lang="ts">
  import { Label, Select, Helper } from 'flowbite-svelte';

  export let label: string | null = null;
  export let srLabel = false;
  export let value: string = '';
  export let options: Array<{ value: string; label: string; disabled?: boolean }> = [];
  export let placeholder: string | null = 'Selecione uma opção';
  export let required = false;
  export let disabled = false;
  export let error: string | null = null;
  export let helper: string | null = null;
  export let id: string | null = null;
  export let name: string | null = null;
  export let class_name = '';

  $: fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
</script>

<div class={class_name}>
  {#if label}
    <Label for={fieldId} class="{srLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-slate-700'}">
      {label}{#if required}<span class="ml-0.5 text-red-500">*</span>{/if}
    </Label>
  {/if}

  <Select
    id={fieldId}
    {name}
    bind:value
    {disabled}
    {required}
    class="vtur-input text-sm {error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'focus:ring-blue-200'}"
    on:change
    on:blur
  >
    {#if placeholder}
      <option value="">{placeholder}</option>
    {/if}
    {#each options as option}
      <option value={option.value} disabled={option.disabled}>{option.label}</option>
    {/each}
  </Select>

  {#if error}
    <Helper class="mt-1 text-red-600">{error}</Helper>
  {:else if helper}
    <Helper class="mt-1 text-slate-500">{helper}</Helper>
  {/if}
</div>
