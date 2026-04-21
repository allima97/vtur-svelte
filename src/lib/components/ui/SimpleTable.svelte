<script lang="ts">
  import { Table } from 'flowbite-svelte';

  export let title: string | null = null;
  export let header: string | null = null;
  export let color:
    | 'default'
    | 'blue'
    | 'green'
    | 'orange'
    | 'teal'
    | 'clientes'
    | 'vendas'
    | 'financeiro'
    | 'operacao'
    | 'orcamentos'
    | 'comissoes' = 'default';
  export let striped = false;
  export let hoverable = true;
  export let shadow = false;
  export let empty = false;
  export let emptyMessage = 'Nenhum registro encontrado';
  export let class_name = '';
  export let tableClass = '';

  const colorClasses: Record<string, string> = {
    default: 'border-slate-200 before:bg-slate-300',
    blue: 'border-blue-200 before:bg-blue-500',
    green: 'border-green-200 before:bg-green-500',
    orange: 'border-orange-200 before:bg-orange-500',
    teal: 'border-teal-200 before:bg-teal-500',
    clientes: 'border-blue-200 before:bg-blue-500',
    orcamentos: 'border-blue-200 before:bg-blue-500',
    vendas: 'border-green-200 before:bg-green-500',
    financeiro: 'border-orange-200 before:bg-orange-500',
    operacao: 'border-teal-200 before:bg-teal-500',
    comissoes: 'border-orange-200 before:bg-orange-500'
  };
</script>

<div class={`space-y-3 ${class_name}`.trim()}>
  {#if title || header}
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-base font-semibold tracking-tight text-slate-900">{title || header}</h3>
      <slot name="actions" />
    </div>
  {/if}

  <div class={`relative overflow-hidden rounded-[20px] border bg-white before:absolute before:left-0 before:right-0 before:top-0 before:h-1.5 before:rounded-t-[20px] ${colorClasses[color] ?? colorClasses.default} ${shadow ? 'shadow-sm' : ''}`.trim()}>
    <Table striped={striped} hoverable={hoverable} class={`w-full text-sm ${tableClass}`.trim()}>
      <slot />
    </Table>

    {#if empty}
      <div class="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    {/if}
  </div>
</div>
