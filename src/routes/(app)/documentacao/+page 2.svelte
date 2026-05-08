<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { FileText, ExternalLink, BookOpen, HelpCircle } from 'lucide-svelte';

  const docs = [
    {
      titulo: 'Guia de Vendas',
      descricao: 'Como cadastrar vendas, recibos e formas de pagamento.',
      icone: FileText,
      href: null
    },
    {
      titulo: 'Conciliação',
      descricao: 'Como importar e conciliar recibos com vendas.',
      icone: FileText,
      href: null
    },
    {
      titulo: 'Comissões',
      descricao: 'Regras de comissionamento, metas e fechamento.',
      icone: FileText,
      href: null
    },
    {
      titulo: 'Orçamentos',
      descricao: 'Criação de orçamentos, roteiros e envio ao cliente.',
      icone: BookOpen,
      href: null
    },
    {
      titulo: 'Vouchers',
      descricao: 'Importação e gestão de vouchers Special Tours e Europamundo.',
      icone: FileText,
      href: null
    },
    {
      titulo: 'Suporte',
      descricao: 'Entre em contato com o suporte técnico.',
      icone: HelpCircle,
      href: 'mailto:suporte@vtur.com.br'
    }
  ];
</script>

<svelte:head>
  <title>Documentação | VTUR</title>
</svelte:head>

<PageHeader
  title="Documentação"
  subtitle="Guias e referências para uso do sistema VTUR."
  breadcrumbs={[{ label: 'Documentação' }]}
/>

<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
  {#each docs as doc}
    <Card class="group hover:shadow-lg transition-all duration-200">
      <div class="flex items-start gap-4">
        <div class="rounded-xl bg-slate-100 p-3 group-hover:bg-blue-50 transition-colors">
          <svelte:component this={doc.icone} size={22} class="text-slate-500 group-hover:text-blue-600 transition-colors" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-slate-900 mb-1">{doc.titulo}</h3>
          <p class="text-sm text-slate-500">{doc.descricao}</p>
          {#if doc.href}
            <a href={doc.href} class="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
              Acessar
              <ExternalLink size={14} />
            </a>
          {:else}
            <span class="mt-3 inline-flex items-center gap-1 text-xs text-slate-400">Em breve</span>
          {/if}
        </div>
      </div>
    </Card>
  {/each}
</div>
