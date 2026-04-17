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
</script>

<div class="vtur-page-header mb-6">
  {#if breadcrumbs.length > 0}
    <nav class="mb-3 flex items-center gap-1.5 text-sm text-slate-500">
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

  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="max-w-2xl">
      <h1 class="text-[1.7rem] font-semibold tracking-tight bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">
        {title}
      </h1>
      {#if subtitle}
        <p class="mt-1 text-sm text-slate-500">{subtitle}</p>
      {/if}
    </div>

    {#if actions.length > 0}
      <div class="flex items-center gap-2">
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
