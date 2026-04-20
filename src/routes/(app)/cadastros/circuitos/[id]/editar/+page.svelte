<script lang="ts">
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { Route, Save, ArrowLeft } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  let saving = false;
  let circuito = {
    codigo: 'CIR-001',
    nome: 'Rota das Emoções',
    tipo: 'nacional' as 'nacional' | 'internacional',
    dias: 7,
    noites: 6,
    descricao: 'Circuito incrível pelo Nordeste',
    preco_base: 3200,
    vagas: 20,
    saidas: 'Ter, Sab',
    guia: true,
    ativo: true
  };

  async function handleSubmit() {
    saving = true;
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success('Circuito atualizado com sucesso!');
    goto('/cadastros/circuitos');
  }

  function handleCancel() {
    goto('/cadastros/circuitos');
  }
</script>

<svelte:head>
  <title>Editar Circuito | VTUR</title>
</svelte:head>

<PageHeader 
  title="Editar Circuito"
  subtitle="Atualizar informações do circuito"
  color="financeiro"
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: 'Circuitos', href: '/cadastros/circuitos' },
    { label: 'Editar' }
  ]}
/>

<form on:submit|preventDefault={handleSubmit}>
  <Card color="financeiro" class="mb-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="circuito-codigo" class="block text-sm font-medium text-slate-700 mb-1">Código *</label>
        <div class="relative">
          <Route size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="circuito-codigo" type="text" bind:value={circuito.codigo} class="vtur-input w-full pl-10" required />
        </div>
      </div>

      <div>
        <label for="circuito-nome" class="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
        <input id="circuito-nome" type="text" bind:value={circuito.nome} class="vtur-input w-full" required />
      </div>

      <div>
        <label for="circuito-tipo" class="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
        <select id="circuito-tipo" bind:value={circuito.tipo} class="vtur-input w-full">
          <option value="nacional">Nacional</option>
          <option value="internacional">Internacional</option>
        </select>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="circuito-dias" class="block text-sm font-medium text-slate-700 mb-1">Dias</label>
          <input id="circuito-dias" type="number" bind:value={circuito.dias} min="1" class="vtur-input w-full" />
        </div>
        <div>
          <label for="circuito-noites" class="block text-sm font-medium text-slate-700 mb-1">Noites</label>
          <input id="circuito-noites" type="number" bind:value={circuito.noites} min="1" class="vtur-input w-full" />
        </div>
      </div>

      <div>
        <label for="circuito-preco-base" class="block text-sm font-medium text-slate-700 mb-1">Preço Base</label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
          <input id="circuito-preco-base" type="number" bind:value={circuito.preco_base} min="0" step="0.01" class="vtur-input w-full pl-10" />
        </div>
      </div>

      <div>
        <label for="circuito-vagas" class="block text-sm font-medium text-slate-700 mb-1">Vagas</label>
        <input id="circuito-vagas" type="number" bind:value={circuito.vagas} min="1" class="vtur-input w-full" />
      </div>

      <div>
        <label for="circuito-saidas" class="block text-sm font-medium text-slate-700 mb-1">Dias de Saída</label>
        <input id="circuito-saidas" type="text" bind:value={circuito.saidas} class="vtur-input w-full" />
      </div>

      <div>
        <p class="block text-sm font-medium text-slate-700 mb-1">Guia</p>
        <div class="flex items-center gap-4 mt-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" bind:group={circuito.guia} value={true} class="w-4 h-4 text-financeiro-600" />
            <span class="text-sm text-slate-700">Sim</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" bind:group={circuito.guia} value={false} class="w-4 h-4 text-slate-600" />
            <span class="text-sm text-slate-700">Não</span>
          </label>
        </div>
      </div>

      <div class="md:col-span-2">
        <label for="circuito-descricao" class="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
        <textarea id="circuito-descricao" bind:value={circuito.descricao} rows="4" class="vtur-input w-full"></textarea>
      </div>
    </div>
  </Card>

  <div class="flex items-center justify-end gap-3">
    <Button variant="secondary" on:click={handleCancel}>
      <ArrowLeft size={18} class="mr-2" />
      Voltar
    </Button>
    <Button variant="primary" color="financeiro" type="submit" disabled={saving}>
      {#if saving}
        <span class="animate-spin mr-2">⟳</span>
        Salvando...
      {:else}
        <Save size={18} class="mr-2" />
        Salvar Alterações
      {/if}
    </Button>
  </div>
</form>
