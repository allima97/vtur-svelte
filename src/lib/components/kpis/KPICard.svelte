<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import type { ComponentType } from 'svelte';

  export let title: string;
  export let value: string | number = '';
  export let subtitle: string = '';
  export let loading: boolean = false;
  export let icon: ComponentType | null = null;
  export let color: 'blue' | 'green' | 'orange' | 'teal' | 'violet' | 'slate' = 'blue';

  const iconBg: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-500',
    green:  'bg-green-50 text-green-500',
    orange: 'bg-orange-50 text-orange-500',
    teal:   'bg-teal-50 text-teal-500',
    violet: 'bg-violet-50 text-violet-500',
    slate:  'bg-slate-100 text-slate-500',
  };

  const borderColor: Record<string, string> = {
    blue:   'border-t-blue-400',
    green:  'border-t-green-400',
    orange: 'border-t-orange-400',
    teal:   'border-t-teal-400',
    violet: 'border-t-violet-400',
    slate:  'border-t-slate-300',
  };
</script>

<!--
  KPI Card padronizado — altura mínima fixa, layout consistente.
  Estrutura: borda superior colorida → ícone → título → valor
-->
<div
  class="vtur-kpi-card flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md border-t-[3px] {borderColor[color]}"
  style="min-height: 116px;"
>
  {#if loading}
    <div class="flex h-full w-full flex-col items-start gap-2">
      <div class="h-9 w-9 animate-pulse rounded-xl bg-slate-100"></div>
      <div class="h-3 w-24 animate-pulse rounded bg-slate-100"></div>
      <div class="h-7 w-16 animate-pulse rounded bg-slate-100"></div>
    </div>
  {:else}
    <!-- Ícone -->
    {#if icon}
      <div class="flex h-10 w-10 items-center justify-center rounded-xl {iconBg[color]}">
        <svelte:component this={icon} size={20} strokeWidth={2} />
      </div>
    {/if}

    <!-- Título + Valor -->
    <div class="min-w-0 flex-1">
      <p class="mb-1 text-sm font-medium leading-tight text-slate-500">{title}</p>
      <p class="text-2xl font-bold leading-tight text-slate-900">{value}</p>
      {#if subtitle}
        <p class="mt-1 text-xs text-slate-400">{subtitle}</p>
      {/if}
    </div>
  {/if}
</div>
