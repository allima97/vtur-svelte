<script lang="ts">
  import { Card } from 'flowbite-svelte';
  import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-svelte';
  import type { ComponentType } from 'svelte';
  
  export let title: string;
  export let value: string | number;
  export let subtitle: string = '';
  export let trend: number | null = null;
  export let trendLabel: string = '';
  export let loading: boolean = false;
  export let icon: ComponentType | null = null;
  export let color: 'blue' | 'green' | 'orange' | 'teal' | 'clientes' | 'vendas' | 'financeiro' | 'operacao' | 'orcamentos' = 'blue';
  
  const colorClasses = {
    blue: 'border-l-blue-500 bg-white',
    green: 'border-l-green-500 bg-white',
    orange: 'border-l-orange-500 bg-white',
    teal: 'border-l-teal-500 bg-white',
    clientes: 'border-l-blue-500 bg-white',
    vendas: 'border-l-green-500 bg-white',
    financeiro: 'border-l-orange-500 bg-white',
    operacao: 'border-l-teal-500 bg-white',
    orcamentos: 'border-l-blue-500 bg-white',
  };
  
  const iconBgClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    teal: 'bg-teal-100 text-teal-600',
    clientes: 'bg-blue-100 text-blue-600',
    vendas: 'bg-green-100 text-green-600',
    financeiro: 'bg-orange-100 text-orange-600',
    operacao: 'bg-teal-100 text-teal-600',
    orcamentos: 'bg-blue-100 text-blue-600',
  };
  
  $: isPositive = trend !== null && trend > 0;
  $: isNegative = trend !== null && trend < 0;
</script>

<Card class="border-l-4 {colorClasses[color]} hover:shadow-lg transition-shadow shadow-sm border border-slate-200">
  <div class="flex items-start justify-between">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        {#if icon}
          <div class="p-2 rounded-lg mb-2 {iconBgClasses[color]}">
            <svelte:component this={icon} size={20} />
          </div>
        {/if}
        <h3 class="text-sm font-medium text-slate-500">{title}</h3>
      </div>
      
      {#if loading}
        <div class="flex items-center gap-2 mt-2">
          <Loader2 size={20} class="animate-spin text-slate-400" />
          <span class="text-slate-400">Carregando...</span>
        </div>
      {:else}
        <div class="mt-1">
          <span class="text-2xl font-bold text-slate-900 break-words">{value}</span>
        </div>

        {#if subtitle}
          <p class="mt-1 text-xs text-slate-500">{subtitle}</p>
        {/if}
        
        {#if trend !== null}
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span 
              class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full"
              class:bg-green-100={isPositive}
              class:text-green-700={isPositive}
              class:bg-red-100={isNegative}
              class:text-red-700={isNegative}
              class:bg-slate-100={!isPositive && !isNegative}
              class:text-slate-600={!isPositive && !isNegative}
            >
              {#if isPositive}
                <TrendingUp size={12} class="mr-1" />
              {:else if isNegative}
                <TrendingDown size={12} class="mr-1" />
              {:else}
                <Minus size={12} class="mr-1" />
              {/if}
              {Math.abs(trend)}%
            </span>
            {#if trendLabel}
              <span class="text-xs text-slate-400">{trendLabel}</span>
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</Card>
