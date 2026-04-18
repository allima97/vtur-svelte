<script lang="ts">
  import { ChevronRight, Home } from 'lucide-svelte';
  import Button from './Button.svelte';

  interface Breadcrumb {
    label: string;
    href?: string;
  }

  interface Action {
    label: string;
    onClick?: (e: MouseEvent) => void;
    href?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    icon?: any;
  }

  export let title: string;
  export let subtitle: string | null = null;
  export let breadcrumbs: Breadcrumb[] = [];
  export let actions: Action[] = [];
  export let color: string | null = null;

  const accentClasses: Record<string, string> = {
    clientes: 'from-blue-600 to-cyan-500',
    vendas: 'from-green-600 to-emerald-500',
    financeiro: 'from-orange-600 to-amber-500',
    operacao: 'from-teal-600 to-cyan-500',
    orcamentos: 'from-blue-600 to-indigo-500',
    blue: 'from-blue-600 to-cyan-500',
    green: 'from-green-600 to-emerald-500',
    orange: 'from-orange-600 to-amber-500',
    teal: 'from-teal-600 to-cyan-500'
  };

  $: accentClass = accentClasses[color || ''] || 'from-slate-900 to-slate-500';
</script>

<div class="vtur-page-header mb-6">
  {#if breadcrumbs.length > 0}
    <nav class="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
      <a href="/" class="transition-colors hover:text-slate-900">
        <Home size={14} />
      </a>
      {#each breadcrumbs as crumb, i}
        <ChevronRight size={14} class="text-slate-400" />
        {#if crumb.href && i < breadcrumbs.length - 1}
          <a href={crumb.href} class="transition-colors hover:text-slate-900">
            {crumb.label}
          </a>
        {:else}
          <span class="font-medium text-slate-900">{crumb.label}</span>
        {/if}
      {/each}
    </nav>
  {/if}

  <div class="rounded-[18px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">
    <div class="mb-4 h-1.5 w-20 rounded-full bg-gradient-to-r {accentClass}"></div>

    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="max-w-3xl">
        <h1 class="text-[1.7rem] font-semibold tracking-tight bg-gradient-to-r {accentClass} bg-clip-text text-transparent">
          {title}
        </h1>
        {#if subtitle}
          <p class="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        {/if}
      </div>

      {#if actions.length > 0}
        <div class="flex flex-wrap items-center gap-2 lg:justify-end">
          {#each actions as action}
            {#if action.href}
              <Button href={action.href} variant={action.variant || 'primary'} size="sm">
                {#if action.icon}
                  <svelte:component this={action.icon} size={16} class="mr-1.5" />
                {/if}
                {action.label}
              </Button>
            {:else}
              <Button on:click={(e) => action.onClick?.(e)} variant={action.variant || 'primary'} size="sm">
                {#if action.icon}
                  <svelte:component this={action.icon} size={16} class="mr-1.5" />
                {/if}
                {action.label}
              </Button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
