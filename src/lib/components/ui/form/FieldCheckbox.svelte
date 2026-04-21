<script lang="ts">
  import { Checkbox, Helper } from 'flowbite-svelte';

  export let label: string | null = null;
  export let checked = false;
  export let disabled = false;
  export let required = false;
  export let error: string | null = null;
  export let helper: string | null = null;
  export let id: string | null = null;
  export let name: string | null = null;
  export let value = 'on';
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
  <div class="flex items-start gap-3">
    <Checkbox
      id={fieldId}
      {name}
      {value}
      bind:checked
      {disabled}
      {required}
      color={resolvedColor as any}
      class={error ? 'text-red-600 focus:ring-red-200' : ''}
      on:change
      on:blur
      on:focus
      on:click
    />

    <div class="min-w-0 pt-0.5">
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
  </div>
</div>
