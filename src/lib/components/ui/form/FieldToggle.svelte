<script lang="ts">
  import { Helper, Toggle } from 'flowbite-svelte';

  export let label: string | null = null;
  export let checked = false;
  export let disabled = false;
  export let id: string | null = null;
  export let name: string | null = null;
  export let helper: string | null = null;
  export let error: string | null = null;
  export let size: 'small' | 'default' | 'large' = 'default';
  export let color:
    | 'blue'
    | 'green'
    | 'red'
    | 'yellow'
    | 'purple'
    | 'teal'
    | 'orange'
    | 'clientes'
    | 'vendas'
    | 'financeiro'
    | 'operacao'
    | 'orcamentos'
    | 'comissoes' = 'blue';
  export let class_name = '';

  const colorAlias: Record<string, string> = {
    blue: 'blue',
    green: 'green',
    red: 'red',
    yellow: 'yellow',
    purple: 'purple',
    teal: 'teal',
    orange: 'orange',
    clientes: 'blue',
    orcamentos: 'blue',
    vendas: 'green',
    financeiro: 'orange',
    operacao: 'teal',
    comissoes: 'orange'
  };

  $: fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  $: resolvedColor = colorAlias[color] || 'blue';
</script>

<div class={class_name}>
  <div class="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
    <div class="min-w-0">
      {#if label}
        <label for={fieldId} class="block cursor-pointer text-sm font-medium text-slate-700">
          {label}
        </label>
      {/if}

      {#if error}
        <Helper class="mt-1 text-red-600">{error}</Helper>
      {:else if helper}
        <Helper class="mt-1 text-slate-500">{helper}</Helper>
      {/if}
    </div>

    <Toggle
      id={fieldId}
      {name}
      bind:checked
      {disabled}
      {size}
      color={resolvedColor as any}
      on:change
      on:blur
      on:focus
      on:click
    />
  </div>
</div>
