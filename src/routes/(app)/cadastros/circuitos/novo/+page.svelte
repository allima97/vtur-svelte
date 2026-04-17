<script lang="ts">
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { Route, Save, ArrowLeft, Plus, Trash2 } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  let saving = false;
  let circuito = {
    codigo: '',
    nome: '',
    tipo: 'nacional',
    dias: 5,
    noites: 4,
    descricao: '',
    preco_base: 0,
    vagas: 20,
    saidas: '',
    guia: true,
    ativo: true
  };

  let roteiro: Array<{ dia: number; titulo: string; descricao: string; refeicoes: string[] }> = [
    { dia: 1, titulo: 'Chegada', descricao: '', refeicoes: [] },
    { dia: 2, titulo: '', descricao: '', refeicoes: [] }
  ];

  let destinosSelecionados: string[] = [''];
  const destinosDisponiveis = ['Rio de Janeiro', 'Salvador', 'Gramado', 'Fortaleza', 'Paris', 'Lisboa', 'Barcelona', 'Cancún', 'Porto Seguro', 'Florianópolis'];

  async function handleSubmit() {
    if (!circuito.nome.trim() || !circuito.codigo.trim()) {
      toast.error('Código e nome são obrigatórios');
      return;
    }
    
    saving = true;
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast.success('Circuito cadastrado com sucesso!');
    goto('/cadastros/circuitos');
  }

  function handleCancel() {
    goto('/cadastros/circuitos');
  }

  function addDestino() {
    destinosSelecionados = [...destinosSelecionados, ''];
  }

  function removeDestino(index: number) {
    destinosSelecionados = destinosSelecionados.filter((_, i) => i !== index);
  }

  function addDiaRoteiro() {
    roteiro = [...roteiro, { dia: roteiro.length + 1, titulo: '', descricao: '', refeicoes: [] }];
  }

  function removeDiaRoteiro(index: number) {
    roteiro = roteiro.filter((_, i) => i !== index).map((r, i) => ({ ...r, dia: i + 1 }));
  }

  function toggleRefeicao(diaIndex: number, refeicao: string) {
    const dia = roteiro[diaIndex];
    if (dia.refeicoes.includes(refeicao)) {
      dia.refeicoes = dia.refeicoes.filter(r => r !== refeicao);
    } else {
      dia.refeicoes = [...dia.refeicoes, refeicao];
    }
    roteiro = [...roteiro];
  }
</script>

<svelte:head>
  <title>Novo Circuito | VTUR</title>
</svelte:head>

<PageHeader 
  title="Novo Circuito"
  subtitle="Cadastrar novo roteiro ou pacote combinado"
  color="financeiro"
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: 'Circuitos', href: '/cadastros/circuitos' },
    { label: 'Novo' }
  ]}
/>

<form on:submit|preventDefault={handleSubmit}>
  <Card header="Informações Básicas" color="financeiro" class="mb-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Código -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">
          Código <span class="text-red-500">*</span>
        </label>
        <div class="relative">
          <Route size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            bind:value={circuito.codigo}
            placeholder="Ex: CIR-001"
            class="vtur-input w-full pl-10"
            required
          />
        </div>
      </div>

      <!-- Nome -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">
          Nome do Circuito <span class="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          bind:value={circuito.nome}
          placeholder="Ex: Rota das Emoções"
          class="vtur-input w-full"
          required
        />
      </div>

      <!-- Tipo -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
        <select bind:value={circuito.tipo} class="vtur-input w-full">
          <option value="nacional">Nacional</option>
          <option value="internacional">Internacional</option>
        </select>
      </div>

      <!-- Duração -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Dias</label>
          <input type="number" bind:value={circuito.dias} min="1" class="vtur-input w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Noites</label>
          <input type="number" bind:value={circuito.noites} min="1" class="vtur-input w-full" />
        </div>
      </div>

      <!-- Preço Base -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Preço Base</label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
          <input 
            type="number" 
            bind:value={circuito.preco_base}
            placeholder="0,00"
            min="0"
            step="0.01"
            class="vtur-input w-full pl-10"
          />
        </div>
      </div>

      <!-- Vagas -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Vagas por Saída</label>
        <input type="number" bind:value={circuito.vagas} min="1" class="vtur-input w-full" />
      </div>

      <!-- Saídas -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Dias de Saída</label>
        <input 
          type="text" 
          bind:value={circuito.saidas}
          placeholder="Ex: Ter, Sab / Semanal / Quinzenal"
          class="vtur-input w-full"
        />
      </div>

      <!-- Guia -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Guia Acompanhante</label>
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

      <!-- Status -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <div class="flex items-center gap-4 mt-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" bind:group={circuito.ativo} value={true} class="w-4 h-4 text-financeiro-600" />
            <span class="text-sm text-slate-700">Ativo</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" bind:group={circuito.ativo} value={false} class="w-4 h-4 text-slate-600" />
            <span class="text-sm text-slate-700">Inativo</span>
          </label>
        </div>
      </div>

      <!-- Descrição -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-slate-700 mb-1">Descrição Geral</label>
        <textarea 
          bind:value={circuito.descricao}
          rows="3"
          placeholder="Descrição do circuito, principais atrativos..."
          class="vtur-input w-full"
        ></textarea>
      </div>
    </div>
  </Card>

  <Card header="Destinos do Circuito" color="financeiro" class="mb-6">
    <div class="space-y-3">
      {#each destinosSelecionados as destino, index}
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 flex items-center justify-center bg-financeiro-100 text-financeiro-700 rounded-full font-medium text-sm">
            {index + 1}
          </span>
          <select bind:value={destinosSelecionados[index]} class="vtur-input flex-1">
            <option value="">Selecione um destino...</option>
            {#each destinosDisponiveis as d}
              <option value={d}>{d}</option>
            {/each}
          </select>
          {#if destinosSelecionados.length > 1}
            <button
              type="button"
              on:click={() => removeDestino(index)}
              class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          {/if}
        </div>
      {/each}
      <button
        type="button"
        on:click={addDestino}
        class="flex items-center gap-2 text-financeiro-600 hover:text-financeiro-700 font-medium text-sm mt-4"
      >
        <Plus size={18} />
        Adicionar Destino
      </button>
    </div>
  </Card>

  <Card header="Roteiro Diário" color="financeiro" class="mb-6">
    <div class="space-y-6">
      {#each roteiro as dia, index}
        <div class="p-4 border border-slate-200 rounded-lg bg-slate-50">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 flex items-center justify-center bg-financeiro-500 text-white rounded-full font-bold">
                D{dia.dia}
              </span>
              <input 
                type="text" 
                bind:value={dia.titulo}
                placeholder="Título do dia"
                class="vtur-input bg-white"
              />
            </div>
            {#if roteiro.length > 1}
              <button
                type="button"
                on:click={() => removeDiaRoteiro(index)}
                class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            {/if}
          </div>
          
          <div class="ml-13">
            <textarea 
              bind:value={dia.descricao}
              rows="2"
              placeholder="Descrição das atividades do dia..."
              class="vtur-input w-full bg-white mb-3"
            ></textarea>
            
            <div class="flex items-center gap-4">
              <span class="text-sm font-medium text-slate-700">Refeições incluídas:</span>
              {#each ['Café', 'Almoço', 'Jantar'] as refeicao}
                <label class="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={dia.refeicoes.includes(refeicao)}
                    on:change={() => toggleRefeicao(index, refeicao)}
                    class="w-4 h-4 text-financeiro-600 rounded"
                  />
                  <span class="text-sm text-slate-600">{refeicao}</span>
                </label>
              {/each}
            </div>
          </div>
        </div>
      {/each}
      
      <button
        type="button"
        on:click={addDiaRoteiro}
        class="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-financeiro-300 text-financeiro-600 hover:border-financeiro-500 hover:bg-financeiro-50 rounded-lg transition-colors font-medium"
      >
        <Plus size={20} />
        Adicionar Dia
      </button>
    </div>
  </Card>

  <!-- Botões -->
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
        Salvar Circuito
      {/if}
    </Button>
  </div>
</form>
