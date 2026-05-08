<script lang="ts">
  import { Checkbox as FlowbiteCheckbox } from 'flowbite-svelte';

  export let checked = false;
  export let disabled = false;
  export let required = false;
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
    | 'crm'
    | 'clientes'
    | 'vendas'
    | 'financeiro'
    | 'operacao'
    | 'orcamentos'
    | 'comissoes'
    | 'default' = 'blue';
  export let ariaLabel: string | null = null;
  export let class_name = '';

  const colorAlias: Record<string, string> = {
    blue: 'blue',
    green: 'green',
    red: 'red',
    yellow: 'yellow',
    purple: 'purple',
    teal: 'teal',
    orange: 'orange',
    crm: 'purple',
    clientes: 'blue',
    orcamentos: 'blue',
    vendas: 'green',
    financeiro: 'orange',
    operacao: 'teal',
    comissoes: 'orange',
    default: 'blue'
  };

  $: resolvedColor = colorAlias[color] || 'blue';
</script>

<FlowbiteCheckbox
  {id}
  {name}
  {value}
  bind:checked
  {disabled}
  {required}
  color={resolvedColor as any}
  aria-label={ariaLabel ?? undefined}
  class={class_name}
  on:change
  on:blur
  on:focus
  on:click
/>
