<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldSelect } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { Gift, RefreshCw, Users } from 'lucide-svelte';

  type Colaborador = {
    id: string;
    nome_completo: string | null;
    email: string | null;
    data_nascimento: string | null;
    role: string;
    company_id: string | null;
    company_nome: string | null;
    aniversario_hoje: boolean;
  };

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  let colaboradores: Colaborador[] = [];
  let loading = true;
  let mesSelecionado = String(new Date().getMonth() + 1);

  async function load() {
    loading = true;
    try {
      const response = await fetch(`/api/v1/users/aniversariantes?month=${mesSelecionado}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      colaboradores = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar aniversariantes.');
    } finally {
      loading = false;
    }
  }

  onMount(load);

  $: hoje = colaboradores.filter((c) => c.aniversario_hoje).length;
</script>

<svelte:head>
  <title>Aniversariantes da Equipe | VTUR</title>
</svelte:head>

<PageHeader
  title="Aniversariantes da Equipe"
  subtitle="Colaboradores com aniversário no mês selecionado."
  breadcrumbs={[
    { label: 'Admin', href: '/admin' },
    { label: 'Aniversariantes' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<Card class="mb-6">
  <div class="flex items-center gap-4">
    <FieldSelect
      id="mes-colab"
      label="Mês"
      bind:value={mesSelecionado}
      options={MESES.map((mes, i) => ({ value: String(i + 1), label: mes }))}
      placeholder=""
      class_name="w-48"
      on:change={load}
    />
    {#if hoje > 0}
      <span class="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
        <Gift size={12} />
        {hoje} aniversariante(s) hoje!
      </span>
    {/if}
  </div>
</Card>

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>
{:else if colaboradores.length === 0}
  <Card>
    <div class="flex flex-col items-center justify-center py-12 text-slate-500">
      <Users size={48} class="mb-4 opacity-30" />
      <p>Nenhum colaborador com aniversário em {MESES[Number(mesSelecionado) - 1]}.</p>
    </div>
  </Card>
{:else}
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each colaboradores as colab}
      <Card class="{colab.aniversario_hoje ? 'border-2 border-pink-300 bg-pink-50/30' : ''}">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-semibold text-lg flex-shrink-0">
            {(colab.nome_completo || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="font-semibold text-slate-900 truncate">{colab.nome_completo || 'Colaborador'}</p>
              {#if colab.aniversario_hoje}
                <Gift size={14} class="text-pink-500 flex-shrink-0" />
              {/if}
            </div>
            <p class="text-xs text-slate-500">{colab.role || 'Colaborador'}</p>
            {#if colab.company_nome}
              <p class="text-xs text-slate-400">{colab.company_nome}</p>
            {/if}
            {#if colab.data_nascimento}
              <p class="text-xs text-slate-600 mt-1">
                {new Date(colab.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </p>
            {/if}
          </div>
        </div>
      </Card>
    {/each}
  </div>
{/if}
