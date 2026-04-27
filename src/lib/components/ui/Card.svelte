<script lang="ts">
  /*
   * Card — visual limpo e uniforme.
   * A prop `color` é mantida para não quebrar nenhum uso existente,
   * mas não gera mais accent bar colorida. Todos os cards têm a mesma
   * borda sutil em slate, sem variação por módulo.
   */
  export let title: string | null = null;
  export let header: string | null = null;
  export let color: 'default' | 'blue' | 'green' | 'orange' | 'teal' | 'purple' | 'crm' | 'clientes' | 'vendas' | 'financeiro' | 'operacao' | 'orcamentos' | 'comissoes' = 'default';
  export let padding: 'none' | 'sm' | 'md' | 'lg' = 'md';

  $: color;

  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6'
  };
</script>

<!--
  Card limpo: sem barra colorida no topo, borda uniforme slate, header neutro.
  A prop color permanece aceita (compatibilidade) sem efeito visual diferenciado.
-->
<div class="vtur-card {$$props.class || ''}">
  {#if title || header}
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <h3 class="text-sm font-semibold tracking-tight text-slate-800">{title || header}</h3>
      <slot name="actions" />
    </div>
  {/if}
  <div class="{paddingClasses[padding] ?? paddingClasses.md}">
    <slot />
  </div>
</div>
