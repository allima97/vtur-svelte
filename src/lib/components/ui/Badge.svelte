<script lang="ts">
  import { Badge as FlowbiteBadge } from 'flowbite-svelte';

  export let color: 'gray' | 'dark' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'indigo' | 'teal' | 'operacao' | 'clientes' | 'vendas' | 'financeiro' | 'orcamentos' | 'comissoes' = 'gray';
  export let size: 'sm' | 'md' = 'md';
  export let dot = false;
  export let outline = false;
  export let className = '';

  // Módulos → flowbite-svelte Badge cores
  const colorAlias: Record<string, string> = {
    operacao: 'teal',
    clientes: 'blue',
    orcamentos: 'blue',
    vendas: 'green',
    financeiro: 'yellow',
    comissoes: 'yellow'
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs'
  };

  $: resolvedColor = (colorAlias[color] || color) as any;
</script>

<FlowbiteBadge
  color={resolvedColor}
  border={outline}
  rounded
  class="{sizeClasses[size]} font-medium {className} inline-flex items-center gap-1"
>
  {#if dot}
    <span class="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80"></span>
  {/if}
  <slot />
</FlowbiteBadge>
