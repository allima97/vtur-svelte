<script lang="ts">
  export let title: string | null = null;
  export let header: string | null = null;
  export let color: 'default' | 'blue' | 'green' | 'orange' | 'teal' | 'purple' | 'crm' | 'clientes' | 'vendas' | 'financeiro' | 'operacao' | 'orcamentos' | 'comissoes' = 'default';
  export let padding: 'none' | 'sm' | 'md' | 'lg' = 'md';

  const colorClasses: Record<string, string> = {
    default: 'border-slate-200',
    blue: 'border-blue-200',
    green: 'border-green-200',
    orange: 'border-orange-200',
    teal: 'border-teal-200',
    purple: 'border-purple-200',
    crm: 'border-purple-200',
    clientes: 'border-blue-200',
    vendas: 'border-green-200',
    financeiro: 'border-orange-200',
    operacao: 'border-teal-200',
    orcamentos: 'border-blue-200',
    comissoes: 'border-orange-200'
  };

  const accentClasses: Record<string, string> = {
    default: 'before:bg-slate-300',
    blue: 'before:bg-blue-500',
    green: 'before:bg-green-500',
    orange: 'before:bg-orange-500',
    teal: 'before:bg-teal-500',
    purple: 'before:bg-purple-500',
    crm: 'before:bg-purple-500',
    clientes: 'before:bg-blue-500',
    vendas: 'before:bg-green-500',
    financeiro: 'before:bg-orange-500',
    operacao: 'before:bg-teal-500',
    orcamentos: 'before:bg-blue-500',
    comissoes: 'before:bg-orange-500'
  };

  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6'
  };
</script>

<div class="vtur-card relative overflow-hidden before:absolute before:left-0 before:right-0 before:top-0 before:h-1.5 before:rounded-t-[18px] {colorClasses[color] ?? colorClasses.default} {accentClasses[color] ?? accentClasses.default} {$$props.class || ''}">
  {#if title || header}
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-gradient-to-b from-slate-50 via-slate-50/85 to-white px-5 py-4">
      <h3 class="text-base font-semibold tracking-tight text-slate-900">{title || header}</h3>
      <slot name="actions" />
    </div>
  {/if}
  <div class="{paddingClasses[padding] ?? paddingClasses.md}">
    <slot />
  </div>
</div>
