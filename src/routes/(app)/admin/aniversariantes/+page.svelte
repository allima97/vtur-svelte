<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { BottomSheet, FieldSelect, LoadingState } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { Gift, RefreshCw, SlidersHorizontal, Users } from 'lucide-svelte';
  import { apiGet } from '$lib/services/api';
  import { parseISODateParts } from '$lib/date';
  import { toUserMessage } from '$lib/utils/errors';

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
  let showFilterSheet = false;

  async function load() {
    loading = true;
    try {
      const payload = await apiGet<{ items?: Colaborador[] }>('/api/v1/users/aniversariantes', { month: mesSelecionado });
      colaboradores = payload.items || [];
    } catch (err) {
      toast.error(toUserMessage(err, 'Erro ao carregar aniversariantes.'));
    } finally {
      loading = false;
    }
  }

  function formatBirthDate(value: string | null) {
    const parts = parseISODateParts(value);
    if (!parts) return '-';
    return `${String(parts.day).padStart(2, '0')} de ${MESES[parts.month - 1].toLowerCase()}`;
  }

  onMount(load);

  $: hoje = colaboradores.reduce((total, colaborador) => total + (colaborador.aniversario_hoje ? 1 : 0), 0);
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

<!-- Mobile: botão de filtros -->
<div class="mb-4 sm:hidden">
  <Button variant="secondary" class_name="w-full" on:click={() => (showFilterSheet = true)}>
    <SlidersHorizontal size={16} class="mr-2" />
    Filtros
    {#if mesSelecionado !== String(new Date().getMonth() + 1)}
      <span class="ml-2 inline-flex h-2 w-2 rounded-full bg-pink-500"></span>
    {/if}
  </Button>
</div>

<Card class="mb-6 hidden sm:block">
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

<BottomSheet bind:open={showFilterSheet} title="Filtrar aniversariantes">
  <div class="space-y-4">
    <FieldSelect
      id="mes-colab-mobile"
      label="Mês"
      bind:value={mesSelecionado}
      options={MESES.map((mes, i) => ({ value: String(i + 1), label: mes }))}
      placeholder=""
      class_name="w-full"
      on:change={load}
    />
  </div>
  <Button variant="primary" class_name="w-full mt-2" on:click={() => (showFilterSheet = false)}>Aplicar filtros</Button>
</BottomSheet>

{#if loading}
  <LoadingState />
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
                {formatBirthDate(colab.data_nascimento)}
              </p>
            {/if}
          </div>
        </div>
      </Card>
    {/each}
  </div>
{/if}
