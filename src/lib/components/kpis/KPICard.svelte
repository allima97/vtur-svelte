<script lang="ts">
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
    blue: 'vtur-kpi-card--blue',
    green: 'vtur-kpi-card--green',
    orange: 'vtur-kpi-card--orange',
    teal: 'vtur-kpi-card--teal',
    clientes: 'vtur-kpi-card--clientes',
    vendas: 'vtur-kpi-card--vendas',
    financeiro: 'vtur-kpi-card--financeiro',
    operacao: 'vtur-kpi-card--operacao',
    orcamentos: 'vtur-kpi-card--orcamentos'
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

<article class="vtur-kpi-card {colorClasses[color]}">
  <div class="flex items-start justify-between">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        {#if icon}
          <div class="p-2 rounded-lg mb-2 {iconBgClasses[color]}">
            <svelte:component this={icon} size={20} />
          </div>
        {/if}
        <h3 class="vtur-kpi-card__title">{title}</h3>
      </div>
      
      {#if loading}
        <div class="flex items-center gap-2 mt-2">
          <Loader2 size={20} class="animate-spin text-slate-400" />
          <span class="text-slate-400">Carregando...</span>
        </div>
      {:else}
        <div class="mt-1">
          <span class="vtur-kpi-card__value break-words">{value}</span>
        </div>

        {#if subtitle}
          <p class="vtur-kpi-card__subtext">{subtitle}</p>
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
</article>
