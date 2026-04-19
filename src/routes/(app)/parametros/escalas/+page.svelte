<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { toast } from '$lib/stores/ui';
  import { RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-svelte';

  type EscalaDia = {
    id: string;
    escala_mes_id: string;
    usuario_id: string;
    data: string;
    tipo: string | null;
    hora_inicio: string | null;
    hora_fim: string | null;
    observacao: string | null;
    usuario?: { nome_completo?: string | null } | null;
  };

  type Usuario = { id: string; nome_completo: string | null; email: string | null };
  type EscalaMes = { id: string; periodo: string; status: string | null };
  type Feriado = { id: string; data: string; nome: string; tipo: string };

  const TIPO_OPCOES = [
    { value: '', label: 'Sem registro' },
    { value: 'TRABALHO', label: 'Trabalho' },
    { value: 'PLANTAO', label: 'Plantão' },
    { value: 'FOLGA', label: 'Folga' },
    { value: 'FERIAS', label: 'Férias' },
    { value: 'LICENCA', label: 'Licença' },
    { value: 'FERIADO', label: 'Feriado' }
  ];

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

  let loading = true;
  let saving = false;
  let meses: EscalaMes[] = [];
  let dias: EscalaDia[] = [];
  let usuarios: Usuario[] = [];
  let feriados: Feriado[] = [];
  let mesAtualId = '';

  let modalOpen = false;
  let selectedCell: { usuario: Usuario; data: string; registro?: EscalaDia | null } | null = null;
  let cellForm = { tipo: '', hora_inicio: '', hora_fim: '', observacao: '' };

  const now = new Date();
  let periodoAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  function buildMonthOptions() {
    const items = [];
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      items.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return items;
  }

  const monthOptions = buildMonthOptions();

  function getDaysInMonth(periodo: string) {
    const [year, month] = periodo.split('-').map(Number);
    const days = [];
    const daysCount = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysCount; d++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(date + 'T00:00:00').getDay();
      days.push({ date, dow, day: d });
    }
    return days;
  }

  function getDiaRegistro(usuarioId: string, data: string): EscalaDia | null {
    return dias.find((d) => d.usuario_id === usuarioId && d.data === data) || null;
  }

  function isFeriado(data: string): Feriado | null {
    return feriados.find((f) => f.data === data) || null;
  }

  async function ensureMes() {
    const response = await fetch('/api/v1/parametros/escalas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ensure_mes', periodo: periodoAtual })
    });
    if (!response.ok) throw new Error(await response.text());
    const payload = await response.json();
    return payload.id;
  }

  async function load() {
    loading = true;
    try {
      const response = await fetch(`/api/v1/parametros/escalas?periodo=${periodoAtual}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      meses = payload.meses || [];
      dias = payload.dias || [];
      usuarios = payload.usuarios || [];
      feriados = payload.feriados || [];

      const mes = meses.find((m) => m.periodo.startsWith(periodoAtual));
      mesAtualId = mes?.id || '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar escalas.');
    } finally {
      loading = false;
    }
  }

  function openCell(usuario: Usuario, data: string) {
    const registro = getDiaRegistro(usuario.id, data);
    selectedCell = { usuario, data, registro };
    cellForm = {
      tipo: registro?.tipo || '',
      hora_inicio: registro?.hora_inicio || '',
      hora_fim: registro?.hora_fim || '',
      observacao: registro?.observacao || ''
    };
    modalOpen = true;
  }

  async function saveCell() {
    if (!selectedCell) return;
    saving = true;
    try {
      let mesId = mesAtualId;
      if (!mesId) {
        mesId = await ensureMes();
        mesAtualId = mesId;
      }

      const response = await fetch('/api/v1/parametros/escalas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_dia',
          escala_mes_id: mesId,
          usuario_id: selectedCell.usuario.id,
          data: selectedCell.data,
          tipo: cellForm.tipo || null,
          hora_inicio: cellForm.hora_inicio || null,
          hora_fim: cellForm.hora_fim || null,
          observacao: cellForm.observacao || null
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Escala salva.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar escala.');
    } finally {
      saving = false;
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
</script>

<svelte:head>
  <title>Escalas | VTUR</title>
</svelte:head>

<PageHeader
  title="Escalas de Trabalho"
  subtitle="Gerencie a escala mensal da equipe com tipos de dia, horários e feriados."
  color="financeiro"
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'Escalas' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<Card color="financeiro" class="mb-6">
  <div class="flex items-center justify-between gap-4">
    <Button variant="secondary" size="sm" on:click={() => navMes(-1)}>
      <ChevronLeft size={16} />
    </Button>
    <div class="flex items-center gap-3">
      <Calendar size={18} class="text-financeiro-600" />
      <span class="text-lg font-semibold text-slate-900 capitalize">{periodoLabel}</span>
    </div>
    <Button variant="secondary" size="sm" on:click={() => navMes(1)}>
      <ChevronRight size={16} />
    </Button>
  </div>
</Card>

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">Carregando escala...</div>
{:else if usuarios.length === 0}
  <Card color="financeiro">
    <div class="py-12 text-center text-slate-500">
      <Calendar size={48} class="mx-auto mb-4 opacity-30" />
      <p>Nenhum usuário encontrado na equipe.</p>
    </div>
  </Card>
{:else}
  <Card color="financeiro" padding="none">
    <div class="overflow-x-auto">
      <table class="min-w-full text-xs">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700 min-w-[160px]">Colaborador</th>
            {#each diasDoMes as { date, dow, day }}
              <th
                class="px-1 py-3 text-center font-medium min-w-[36px] {dow === 0 || dow === 6 ? 'text-red-500' : 'text-slate-600'} {isFeriado(date) ? 'bg-red-50' : ''}"
                title={isFeriado(date)?.nome || ''}
              >
                <div>{day}</div>
                <div class="text-[10px] opacity-60">{'DSTQQSS'[dow]}</div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#each usuarios as usuario}
            <tr class="hover:bg-slate-50/50">
              <td class="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-slate-900 border-r border-slate-100">
                {usuario.nome_completo || usuario.email || 'Usuário'}
              </td>
              {#each diasDoMes as { date, dow }}
                {@const registro = getDiaRegistro(usuario.id, date)}
                {@const feriado = isFeriado(date)}
                <td
                  class="px-0.5 py-1 text-center cursor-pointer hover:bg-financeiro-50 transition-colors {dow === 0 || dow === 6 ? 'bg-slate-50/50' : ''}"
                  on:click={() => openCell(usuario, date)}
                  title={registro ? `${registro.tipo}${registro.hora_inicio ? ' ' + registro.hora_inicio + '-' + registro.hora_fim : ''}` : feriado?.nome || ''}
                >
                  {#if registro?.tipo}
                    <span class="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold {TIPO_COLOR[registro.tipo] || 'bg-slate-100 text-slate-600'}">
                      {TIPO_CODIGO[registro.tipo] || '?'}
                    </span>
                  {:else if feriado}
                    <span class="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold bg-red-100 text-red-600">H</span>
                  {:else}
                    <span class="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] text-slate-300">·</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Legenda -->
    <div class="flex flex-wrap gap-3 px-4 py-3 border-t border-slate-100 text-xs text-slate-600">
      {#each TIPO_OPCOES.filter((t) => t.value) as opt}
        <span class="inline-flex items-center gap-1">
          <span class="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold {TIPO_COLOR[opt.value] || 'bg-slate-100'}">
            {TIPO_CODIGO[opt.value] || '?'}
          </span>
          {opt.label}
        </span>
      {/each}
    </div>
  </Card>
{/if}

<Dialog
  bind:open={modalOpen}
  title={selectedCell ? `${selectedCell.usuario.nome_completo || 'Usuário'} — ${new Date(selectedCell.data + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Escala'}
  color="financeiro"
  size="sm"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText="Salvar"
  loading={saving}
  onConfirm={saveCell}
  onCancel={() => (modalOpen = false)}
>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="esc-tipo">Tipo</label>
      <select id="esc-tipo" bind:value={cellForm.tipo} class="vtur-input w-full">
        {#each TIPO_OPCOES as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    {#if cellForm.tipo === 'TRABALHO' || cellForm.tipo === 'PLANTAO'}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="esc-inicio">Início</label>
          <input id="esc-inicio" type="time" bind:value={cellForm.hora_inicio} class="vtur-input w-full" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="esc-fim">Fim</label>
          <input id="esc-fim" type="time" bind:value={cellForm.hora_fim} class="vtur-input w-full" />
        </div>
      </div>
    {/if}
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="esc-obs">Observação</label>
      <input id="esc-obs" bind:value={cellForm.observacao} class="vtur-input w-full" placeholder="Opcional" />
    </div>
  </div>
</Dialog>
