<script lang="ts">
  import { Input, Label, Helper } from 'flowbite-svelte';

  export let label: string | null = null;
  export let value: string | number = '';
  export let placeholder: string = '';
  export let type: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'tel' | 'time' | 'url' = 'text';
  export let required = false;
  export let disabled = false;
  export let readonly = false;
  export let error: string | null = null;
  export let helper: string | null = null;
  export let icon: any = null;
  export let prefix: string | null = null;
  export let suffix: string | null = null;
  export let id: string | null = null;
  export let name: string | null = null;
  export let list: string | null = null;
  export let min: string | null = null;
  export let max: string | null = null;
  export let step: string | null = null;
  export let maxlength: number | null = null;
  export let class_name = '';

  $: fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
</script>

<div class={class_name}>
  {#if label}
    <Label for={fieldId} class="mb-1.5 block text-sm font-medium text-slate-700">
      {label}{#if required}<span class="ml-0.5 text-red-500">*</span>{/if}
    </Label>
  {/if}

  <div class="relative w-full">
    {#if prefix}
      <span class="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-slate-400 select-none">{prefix}</span>
    {/if}
    {#if icon}
      <Input
        id={fieldId}
        {name}
        {list}
        {type}
        bind:value
        {placeholder}
        {disabled}
        {required}
        {readonly}
        {min}
        {max}
        {step}
        {maxlength}
        wrapperClass="relative w-full"
        color={error ? 'red' : 'base'}
        class="text-sm {prefix ? 'pl-8' : ''} {suffix ? 'pr-8' : ''} {error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'focus:ring-blue-200'}"
        on:input
        on:change
        on:blur
        on:focus
      >
        <svelte:component this={icon} slot="left" class="h-4 w-4 text-slate-400" />
      </Input>
    {:else}
      <Input
        id={fieldId}
        {name}
        {list}
        {type}
        bind:value
        {placeholder}
        {disabled}
        {required}
        {readonly}
        {min}
        {max}
        {step}
        {maxlength}
        wrapperClass="relative w-full"
        color={error ? 'red' : 'base'}
        class="text-sm {prefix ? 'pl-8' : ''} {suffix ? 'pr-8' : ''} {error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'focus:ring-blue-200'}"
        on:input
        on:change
        on:blur
        on:focus
      />
    {/if}
    {#if suffix}
      <span class="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-sm text-slate-400 select-none">{suffix}</span>
    {/if}
  </div>

  {#if error}
    <Helper class="mt-1 text-red-600">{error}</Helper>
  {:else if helper}
    <Helper class="mt-1 text-slate-500">{helper}</Helper>
  {/if}
</div>
