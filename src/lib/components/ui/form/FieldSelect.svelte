<script lang="ts">
  import { Label, Select } from 'flowbite-svelte';

  export let label: string | null = null;
  export let value: string = '';
  export let options: Array<{ value: string; label: string }> = [];
  export let placeholder: string | null = 'Selecione uma opção';
  export let required = false;
  export let disabled = false;
  export let error: string | null = null;
  export let helper: string | null = null;
  export let class_name = '';
</script>

<div class={class_name}>
  {#if label}
    <Label class="mb-2 {required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}">
      {label}
    </Label>
  {/if}

  <Select
    bind:value
    {disabled}
    {required}
    class={error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
  >
    {#if placeholder}
      <option value="">{placeholder}</option>
    {/if}
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </Select>

  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {:else if helper}
    <p class="mt-1 text-sm text-gray-500">{helper}</p>
  {/if}
</div>
