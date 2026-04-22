<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { toast } from '$lib/stores/ui';
  import { auth } from '$lib/stores/auth';
  import { Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-svelte';

  type EscalaDia = {
    id: string;
    data: string;
    tipo: string | null;
    hora_inicio: string | null;
    hora_fim: string | null;
    observacao: string | null;
  };

  type Feriado = { id: string; data: string; nome: string; tipo: string };

  const TIPO_CODIGO: Record<string, string> = {
    TRABALHO: 'T', PLANTAO: 'P', FOLGA: 'F', FERIAS: 'X', LICENCA: 'L', FERIADO: 'H'
  };

  const TIPO_COLOR: Record<string, string> = {
    TRABALHO: 'bg-green-100 text-green-700',
    PLANTAO: 'bg-blue-100 text-blue-700',
    FOLGA: 'bg-slate-100 text-slate-600',
    FERIAS: 'bg-amber-100 text-amber-700',
    LICENCA: 'bg-purple-100 text-purple-700',
    FERIADO: 'bg-red-100 text-red-700'
  };

  const TIPO_LABEL: Record<string, string> = {
    TRABALHO: 'Trabalho', PLANTAO: 'Plantão', FOLGA: 'Folga',
    FERIAS: 'Férias', LICENCA: 'Licença', FERIADO: 'Feriado'
  };

  let loading = true;
  let dias: EscalaDia[] = [];
  let feriados: Feriado[] = [];

  const now = new Date();
  let periodoAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  function getDaysInMonth(periodo: string) {
    const [year, month] = periodo.split('-').map(Number);
    const daysCount = new Date(year, month, 0).getDate();
    return Array.from({ length: daysCount }, (_, i) => {
      const d = i + 1;
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return { date, dow: new Date(date + 'T00:00:00').getDay(), day: d };
    });
  }

  function getDia(data: string): EscalaDia | null {
    return dias.find((d) => d.data === data) || null;
  }

  function isFeriado(data: string): Feriado | null {
    return feriados.find((f) => f.data === data) || null;
  }

  async function load() {
    loading = true;
    try {
      const response = await fetch(`/api/v1/parametros/escalas?periodo=${periodoAtual}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      const userId = $auth.user?.id;
      dias = (payload.dias || []).filter((d: any) => d.usuario_id === userId);
      feriados = payload.feriados || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar escala.');
    } finally {
      loading = false;
    }
  }

  function navMes(delta: number) {
    const [year, month] = periodoAtual.split('-').map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    periodoAtual = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    load();
  }

  onMount(load);

  $: diasDoMes = getDaysInMonth(periodoAtual);
  $: periodoLabel = new Date(periodoAtual + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  $: diasTrabalhados = dias.filter((d) => d.tipo === 'TRABALHO' || d.tipo === 'PLANTAO').length;
  $: diasFolga = dias.filter((d) => d.tipo === 'FOLGA' || d.tipo === 'FERIAS' || d.tipo === 'LICENCA').length;
</script>

<svelte:head>
  <title>Minha Escala | VTUR</title>
</svelte:head>

<PageHeader
  title="Minha Escala"
  subtitle="Visualize sua escala de trabalho mensal."
  breadcrumbs={[
    { label: 'Perfil', href: '/perfil' },
    { label: 'Minha Escala' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<Card class="mb-6">
  <div class="flex items-center justify-between gap-4">
    <Button variant="secondary" size="sm" on:click={() => navMes(-1)}>
      <ChevronLeft size={16} />
    </Button>
    <div class="flex items-center gap-3">
      <Calendar size={18} class="text-slate-500" />
      <span class="text-lg font-semibold text-slate-900 capitalize">{periodoLabel}</span>
    </div>
    <Button variant="secondary" size="sm" on:click={() => navMes(1)}>
      <ChevronRight size={16} />
    </Button>
  </div>
</Card>

<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><Calendar size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Dias trabalhados</p>
      <p class="text-2xl font-bold text-slate-900">{diasTrabalhados}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-slate-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Calendar size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Folgas / Ferias</p>
      <p class="text-2xl font-bold text-slate-900">{diasFolga}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-red-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"><Calendar size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Feriados no mes</p>
      <p class="text-2xl font-bold text-slate-900">{feriados.filter((f) => f.data.startsWith(periodoAtual)).length}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-slate-300">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><Calendar size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Sem registro</p>
      <p class="text-2xl font-bold text-slate-900">{diasDoMes.length - diasTrabalhados - diasFolga}</p>
    </div>
  </div>
</div>

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">Carregando escala...</div>
{:else}
  <Card padding="none">
    <div class="overflow-x-visible md:overflow-x-auto">
      <table class="min-w-full text-sm table-mobile-cards">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Data</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Dia</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Horário</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Observação</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#each diasDoMes as { date, dow, day }}
            {@const registro = getDia(date)}
            {@const feriado = isFeriado(date)}
            <tr class="{dow === 0 || dow === 6 ? 'bg-slate-50/50' : ''} {feriado ? 'bg-red-50/30' : ''}">
              <td class="px-4 py-2 text-slate-700">
                {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </td>
              <td class="px-4 py-2 text-slate-500 text-xs">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dow]}
                {#if feriado}
                  <span class="ml-1 text-red-500">({feriado.nome})</span>
                {/if}
              </td>
              <td class="px-4 py-2">
                {#if registro?.tipo}
                  <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold {TIPO_COLOR[registro.tipo] || 'bg-slate-100 text-slate-600'}">
                    {TIPO_LABEL[registro.tipo] || registro.tipo}
                  </span>
                {:else if feriado}
                  <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-600">Feriado</span>
                {:else}
                  <span class="text-slate-300 text-xs">—</span>
                {/if}
              </td>
              <td class="px-4 py-2 text-slate-600 text-xs">
                {#if registro?.hora_inicio && registro?.hora_fim}
                  {registro.hora_inicio.slice(0, 5)} – {registro.hora_fim.slice(0, 5)}
                {:else}
                  —
                {/if}
              </td>
              <td class="px-4 py-2 text-slate-500 text-xs">{registro?.observacao || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap gap-3 px-4 py-3 border-t border-slate-100 text-xs text-slate-600">
      {#each Object.entries(TIPO_LABEL) as [key, label]}
        <span class="inline-flex items-center gap-1">
          <span class="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold {TIPO_COLOR[key] || 'bg-slate-100'}">
            {TIPO_CODIGO[key] || '?'}
          </span>
          {label}
        </span>
      {/each}
    </div>
  </Card>
{/if}
