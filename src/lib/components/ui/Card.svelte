<script lang="ts">
  export let title: string | null = null;
  export let header: string | null = null;
  export let color: 'default' | 'blue' | 'green' | 'orange' | 'teal' | 'clientes' | 'vendas' | 'financeiro' | 'operacao' | 'orcamentos' = 'default';
  export let padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
  
  const colorClasses = {
    default: 'border-slate-200',
    blue: 'border-blue-200',
    green: 'border-green-200',
    orange: 'border-orange-200',
    teal: 'border-teal-200',
    clientes: 'border-blue-200',
    vendas: 'border-green-200',
    financeiro: 'border-orange-200',
    operacao: 'border-teal-200',
    orcamentos: 'border-blue-200',
  };

  const accentClasses = {
    default: '',
    blue: 'before:bg-blue-500',
    green: 'before:bg-green-500',
    orange: 'before:bg-orange-500',
    teal: 'before:bg-teal-500',
    clientes: 'before:bg-blue-500',
    vendas: 'before:bg-green-500',
    financeiro: 'before:bg-orange-500',
    operacao: 'before:bg-teal-500',
    orcamentos: 'before:bg-blue-500',
  };
  
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };
</script>

<div class="relative overflow-hidden rounded-[14px] border bg-white shadow-[0_14px_34px_rgba(9,17,46,0.06)] before:absolute before:left-0 before:right-0 before:top-0 before:h-1 {colorClasses[color]} {accentClasses[color]} {$$props.class || ''}">
  {#if title || header}
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 bg-gradient-to-b from-slate-100/60 to-white">
      <h3 class="text-lg font-bold text-slate-900 tracking-tight">{title || header}</h3>
      <slot name="actions" />
    </div>
  {/if}
  <div class="{paddingClasses[padding]}">
    <slot />
  </div>
</div>
