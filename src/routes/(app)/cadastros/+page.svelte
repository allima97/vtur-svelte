<script lang="ts">
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { 
    MapPin, Package, Building2, Route, 
    ArrowRight, Plus, Search
  } from 'lucide-svelte';

  const cadastros = [
    {
      titulo: 'Destinos',
      descricao: 'Gerencie destinos turísticos, cidades e países',
      icone: MapPin,
      cor: 'financeiro',
      rota: '/cadastros/destinos',
      stats: '45 destinos',
      acao: 'Novo Destino'
    },
    {
      titulo: 'Produtos',
      descricao: 'Pacotes, passeios, serviços e produtos vendidos',
      icone: Package,
      cor: 'financeiro',
      rota: '/cadastros/produtos',
      stats: '128 produtos',
      acao: 'Novo Produto'
    },
    {
      titulo: 'Fornecedores',
      descricao: 'Hotéis, companhias aéreas, operadoras locais',
      icone: Building2,
      cor: 'financeiro',
      rota: '/cadastros/fornecedores',
      stats: '32 fornecedores',
      acao: 'Novo Fornecedor'
    },
    {
      titulo: 'Circuitos',
      descricao: 'Roteiros pré-montados e pacotes combinados',
      icone: Route,
      cor: 'financeiro',
      rota: '/cadastros/circuitos',
      stats: '18 circuitos',
      acao: 'Novo Circuito'
    }
  ];
</script>

<svelte:head>
  <title>Cadastros | VTUR</title>
</svelte:head>

<PageHeader 
  title="Cadastros"
  subtitle="Gerenciamento de dados mestres"
  color="financeiro"
  breadcrumbs={[{ label: 'Cadastros' }]}
/>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    {#each cadastros as item}
    <Card color="financeiro" class="group hover:shadow-lg transition-all duration-200">
      <div class="flex items-start gap-4">
        <div 
          class="p-4 rounded-xl"
          style="background-color: var(--color-financeiro-50);"
        >
          <svelte:component 
            this={item.icone} 
            size={28} 
            class="text-financeiro-600"
          />
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-900">{item.titulo}</h3>
            <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-financeiro-50 text-financeiro-700">
              {item.stats}
            </span>
          </div>
          <p class="text-sm text-slate-500 mt-1 mb-4">{item.descricao}</p>
          
          <div class="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              color="financeiro"
              on:click={() => goto(item.rota)}
            >
              <Search size={16} />
              Consultar
            </Button>
            <span class="text-slate-300">|</span>
            <Button
              variant="ghost"
              size="sm"
              color="financeiro"
              on:click={() => goto(`${item.rota}/novo`)}
            >
              <Plus size={16} />
              {item.acao}
            </Button>
            <span class="ml-auto">
              <ArrowRight size={16} class="text-slate-400 group-hover:text-financeiro-500 group-hover:translate-x-1 transition-all" />
            </span>
          </div>
        </div>
      </div>
    </Card>
  {/each}
</div>
