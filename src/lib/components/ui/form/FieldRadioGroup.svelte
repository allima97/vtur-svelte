<script lang="ts">
  import { Helper, Label, Radio } from 'flowbite-svelte';

  export let label: string | null = null;
  export let value = '';
  export let options: Array<{ value: string; label: string; disabled?: boolean }> = [];
  export let required = false;
  export let disabled = false;
  export let error: string | null = null;
  export let helper: string | null = null;
  export let id: string | null = null;
  export let name: string | null = null;
  export let orientation: 'row' | 'column' = 'row';
  export let class_name = '';

  $: fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
</script>

<div class={class_name}>
  {#if label}
    <Label for={fieldId} class="mb-1.5 block text-sm font-medium text-slate-700">
      {label}{#if required}<span class="ml-0.5 text-red-500">*</span>{/if}
    </Label>
  {/if}

  <div class={`rounded-[14px] border px-4 py-3 ${error ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-slate-50'} ${orientation === 'column' ? 'space-y-3' : 'flex flex-wrap gap-4'}`}>
    {#each options as option, index}
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <Radio
          id={`${fieldId || name || 'radio'}-${index}`}
          {name}
          bind:group={value}
          value={option.value}
          disabled={disabled || option.disabled}
          class={error ? 'text-red-600 focus:ring-red-200' : ''}
          on:change
          on:blur
        />
        <span>{option.label}</span>
      </label>
    {/each}
  </div>

  {#if error}
    <Helper class="mt-1 text-red-600">{error}</Helper>
  {:else if helper}
    <Helper class="mt-1 text-slate-500">{helper}</Helper>
  {/if}
</div>
