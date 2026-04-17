<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { toast } from '$lib/stores/ui';
  import { CalendarDays, MessageCircle, RefreshCw, Gift } from 'lucide-svelte';

  type Aniversariante = {
    id: string;
    nome: string;
    nascimento: string;
    telefone: string | null;
    whatsapp: string | null;
    email: string | null;
    aniversario_hoje: boolean;
    pessoa_tipo: 'cliente';
  };

  let aniversariantes: Aniversariante[] = [];
  let loading = true;
  let diasAfrente = 30;

  const columns = [
    {
      key: 'nome',
      label: 'Cliente',
      sortable: true,
      formatter: (v: string, row: Aniversariante) => {
        const badge = row.aniversario_hoje
          ? '<span class="ml-2 inline-flex rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-700">Hoje!</span>'
          : '';
        return `<div class="font-medium text-slate-900">${v}${badge}</div>`;
      }
    },
    {
      key: 'nascimento',
      label: 'Aniversário',
      sortable: true,
      width: '130px',
      formatter: (v: string) => {
        if (!v) return '-';
        const d = new Date(v + 'T00:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
      }
    },
    {
      key: 'whatsapp',
      label: 'Contato',
      sortable: false,
      formatter: (v: string | null, row: Aniversariante) => {
        const contato = v || row.telefone;
        if (!contato) return row.email || '-';
        const phone = contato.replace(/\D/g, '');
        return `<a href="https://wa.me/${phone}" target="_blank" class="inline-flex items-center gap-1 text-green-600 hover:underline text-xs">${contato}</a>`;
      }
    }
  ];

  async function load() {
    loading = true;
    try {
      const response = await fetch(`/api/v1/dashboard/aniversariantes?dias=${diasAfrente}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      aniversariantes = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar aniversariantes.');
    } finally {
      loading = false;
    }
  }

  onMount(load);

  $: hoje = aniversariantes.filter((a) => a.aniversario_hoje).length;
  $: proximos7 = aniversariantes.filter((a) => {
    if (!a.nascimento) return false;
    const d = new Date(a.nascimento + 'T00:00:00');
    const now = new Date();
    for (let i = 0; i <= 7; i++) {
      const check = new Date(now);
      check.setDate(now.getDate() + i);
      if (d.getMonth() === check.getMonth() && d.getDate() === check.getDate()) return true;
    }
    return false;
  }).length;
</script>

<svelte:head>
  <title>Aniversariantes | VTUR</title>
</svelte:head>

<PageHeader
  title="Aniversariantes"
  subtitle="Clientes com aniversário nos próximos dias — oportunidade de relacionamento."
  color="clientes"
  breadcrumbs={[{ label: 'Aniversariantes' }]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
  <KPICard title="Aniversário hoje" value={hoje} color="clientes" icon={Gift} />
  <KPICard title="Próximos 7 dias" value={proximos7} color="clientes" icon={CalendarDays} />
  <KPICard title={`Próximos ${diasAfrente} dias`} value={aniversariantes.length} color="clientes" icon={CalendarDays} />
</div>

<Card color="clientes" class="mb-6">
  <div class="flex items-center gap-4">
    <label class="text-sm font-medium text-slate-700" for="dias-afrente">Mostrar próximos</label>
    <select id="dias-afrente" bind:value={diasAfrente} on:change={load} class="vtur-input">
      <option value={7}>7 dias</option>
      <option value={15}>15 dias</option>
      <option value={30}>30 dias</option>
      <option value={60}>60 dias</option>
      <option value={90}>90 dias</option>
    </select>
  </div>
</Card>

<DataTable
  {columns}
  data={aniversariantes}
  color="clientes"
  {loading}
  title="Aniversariantes"
  searchable={true}
  emptyMessage="Nenhum aniversariante encontrado no período"
  onRowClick={(row) => goto(`/clientes/${row.id}`)}
/>
