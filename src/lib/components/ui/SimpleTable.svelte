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
    | 'purple'
    | 'crm'
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

  // color prop mantido para compatibilidade com páginas existentes — sem efeito visual
</script>

<div class={`space-y-3 ${class_name}`.trim()}>
  {#if title || header}
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-base font-semibold tracking-tight text-slate-900">{title || header}</h3>
      <slot name="actions" />
    </div>
  {/if}

  <div class={`overflow-hidden vtur-table-shell ${shadow ? 'shadow-sm' : ''}`.trim()}>
    <Table striped={striped} hoverable={hoverable} class={`w-full text-sm table-mobile-cards ${tableClass}`.trim()}>
      <slot />
    </Table>

    {#if empty}
      <div class="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    {/if}
  </div>
</div>
