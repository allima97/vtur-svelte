<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { toast } from '$lib/stores/ui';
  import { ArrowLeft, Plus, Trash2, Save, GripVertical } from 'lucide-svelte';

  type Dia = {
    id?: string;
    ordem: number;
    cidade: string;
    data: string | null;
    descricao: string | null;
  };

  type Roteiro = {
    id: string;
    nome: string;
    duracao: number | null;
    inicio_cidade: string | null;
    fim_cidade: string | null;
    dias: Dia[];
  };

  const roteiroId = $page.params.id;

  let roteiro: Roteiro | null = null;
  let loading = true;
  let saving = false;

  let form = { nome: '', duracao: '', inicio_cidade: '', fim_cidade: '' };
  let dias: Dia[] = [];

  async function load() {
    loading = true;
    try {
      const response = await fetch(`/api/v1/roteiros/${roteiroId}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      roteiro = payload.roteiro;
      if (roteiro) {
        form = {
          nome: roteiro.nome,
          duracao: roteiro.duracao != null ? String(roteiro.duracao) : '',
          inicio_cidade: roteiro.inicio_cidade || '',
          fim_cidade: roteiro.fim_cidade || ''
        };
        dias = roteiro.dias || [];
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar roteiro.');
      goto('/orcamentos/roteiros');
    } finally {
      loading = false;
    }
  }

  function addDia() {
    dias = [...dias, { ordem: dias.length + 1, cidade: '', data: null, descricao: null }];
  }

  function removeDia(index: number) {
    dias = dias.filter((_, i) => i !== index).map((d, i) => ({ ...d, ordem: i + 1 }));
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório.'); return; }
    saving = true;
    try {
      const response = await fetch('/api/v1/roteiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roteiroId,
          nome: form.nome,
          duracao: form.duracao ? Number(form.duracao) : null,
          inicio_cidade: form.inicio_cidade || null,
          fim_cidade: form.fim_cidade || null,
          dias: dias.map((d, i) => ({ ...d, ordem: i + 1 }))
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Roteiro salvo.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>{roteiro?.nome || 'Roteiro'} | VTUR</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>
{:else if roteiro}
  <PageHeader
    title={roteiro.nome}
    subtitle="Edite o roteiro e seus dias de itinerário."
    color="clientes"
    breadcrumbs={[
      { label: 'Orçamentos', href: '/orcamentos' },
      { label: 'Roteiros', href: '/orcamentos/roteiros' },
      { label: roteiro.nome }
    ]}
    actions={[
      { label: 'Voltar', href: '/orcamentos/roteiros', variant: 'secondary', icon: ArrowLeft }
    ]}
  />

  <form on:submit|preventDefault={save} class="space-y-6">
    <Card title="Dados do roteiro" color="clientes">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div class="lg:col-span-2">
          <label class="mb-1 block text-sm font-medium text-slate-700" for="rot-nome">Nome *</label>
          <input id="rot-nome" bind:value={form.nome} class="vtur-input w-full" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="rot-dur">Duração (dias)</label>
          <input id="rot-dur" type="number" min="1" bind:value={form.duracao} class="vtur-input w-full" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="rot-orig">Cidade de origem</label>
          <input id="rot-orig" bind:value={form.inicio_cidade} class="vtur-input w-full" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="rot-dest">Cidade de destino</label>
          <input id="rot-dest" bind:value={form.fim_cidade} class="vtur-input w-full" />
        </div>
      </div>
    </Card>

    <Card title="Itinerário dia a dia" color="clientes">
      <div class="space-y-3 mb-4">
        {#each dias as dia, index}
          <div class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-clientes-100 text-clientes-700 text-sm font-bold flex-shrink-0 mt-1">
              {index + 1}
            </div>
            <div class="flex-1 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Cidade</label>
                <input bind:value={dia.cidade} class="vtur-input w-full" placeholder="Cidade do dia" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Data</label>
                <input type="date" bind:value={dia.data} class="vtur-input w-full" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Descrição</label>
                <input bind:value={dia.descricao} class="vtur-input w-full" placeholder="Atividades do dia" />
              </div>
            </div>
            <button type="button" on:click={() => removeDia(index)} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 mt-1">
              <Trash2 size={15} />
            </button>
          </div>
        {/each}
      </div>

      <Button type="button" variant="secondary" size="sm" on:click={addDia}>
        <Plus size={14} class="mr-1" />
        Adicionar dia
      </Button>
    </Card>

    <div class="flex justify-end gap-3">
      <Button type="button" variant="secondary" on:click={() => goto('/orcamentos/roteiros')}>Cancelar</Button>
      <Button type="submit" variant="primary" color="clientes" loading={saving}>
        <Save size={16} class="mr-2" />
        Salvar roteiro
      </Button>
    </div>
  </form>
{/if}
