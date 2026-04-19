<script lang="ts">
  import { Button as FlowbiteButton } from 'flowbite-svelte';

  export let variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' = 'primary';
  export let size: 'xs' | 'sm' | 'md' | 'lg' = 'md';
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
  export let loading = false;
  export let disabled = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let href: string | undefined = undefined;
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
    vendas: 'teal',
    financeiro: 'orange',
    operacao: 'teal',
    comissoes: 'orange'
  };

  const sizeClasses: Record<string, string> = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base'
  };

  const variantClasses: Record<string, string> = {
    primary:
      'border-transparent bg-[#2457a6] text-white hover:bg-[#1f4b90] focus:ring-blue-200 shadow-[0_10px_24px_rgba(36,87,166,0.18)]',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-200',
    outline:
      'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-200',
    ghost:
      'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200 shadow-none',
    danger:
      'border-transparent bg-red-600 text-white hover:bg-red-700 focus:ring-red-200 shadow-[0_10px_24px_rgba(220,38,38,0.18)]'
  };

  $: resolvedColor = colorAlias[color] || 'blue';
  $: buttonClasses = `vtur-button inline-flex items-center justify-center rounded-xl font-semibold tracking-[0.01em] transition-all duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses[size]} ${variantClasses[variant]} ${class_name}`;
</script>

{#if href}
  <FlowbiteButton
    {href}
    {size}
    color={resolvedColor as any}
    disabled={disabled || loading}
    class={buttonClasses}
    on:click
  >
    {#if loading}
      <svg class="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
    {/if}
    <slot />
  </FlowbiteButton>
{:else}
  <FlowbiteButton
    {type}
    {size}
    color={resolvedColor as any}
    disabled={disabled || loading}
    class={buttonClasses}
    on:click
  >
    {#if loading}
      <svg class="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
    {/if}
    <slot />
  </FlowbiteButton>
{/if}
