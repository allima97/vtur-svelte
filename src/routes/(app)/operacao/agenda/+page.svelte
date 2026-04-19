<script lang="ts">
  import { onMount } from 'svelte';
  import { Calendar } from '@fullcalendar/core';
  import interactionPlugin from '@fullcalendar/interaction';
  import dayGridPlugin from '@fullcalendar/daygrid';
  import timeGridPlugin from '@fullcalendar/timegrid';
  import ptBrLocale from '@fullcalendar/core/locales/pt-br';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { toast } from '$lib/stores/ui';
  import {
    CalendarDays,
    Clock3,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    UserRound
  } from 'lucide-svelte';

  type AgendaItem = {
    id: string;
    title: string;
    start: string;
    end: string | null;
    descricao: string | null;
    allDay: boolean;
    source?: 'evento' | 'birthday';
  };

  type EventForm = {
    titulo: string;
    startDate: string;
    endDate: string;
    allDay: boolean;
    startTime: string;
    endTime: string;
    descricao: string;
  };

  const listColumns = [
    { key: 'title', label: 'Assunto', sortable: true },
    { key: 'sourceLabel', label: 'Origem', sortable: true },
    { key: 'dateLabel', label: 'Data', sortable: true },
    { key: 'descricao', label: 'Descricao', sortable: true }
  ];

  const todayIso = (() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  })();

  const defaultEventForm = (): EventForm => ({
    titulo: '',
    startDate: todayIso,
    endDate: todayIso,
    allDay: true,
    startTime: '09:00',
    endTime: '10:00',
    descricao: ''
  });

  let calendarEl: HTMLElement;
  let calendar: Calendar | null = null;
  let loading = true;
  let refreshing = false;
  let items: AgendaItem[] = [];
  let visibleRange = { inicio: todayIso, fim: todayIso };
  let searchQuery = '';

  let eventModalOpen = false;
  let eventLoading = false;
  let eventSaving = false;
  let selectedEventId: string | null = null;
  let selectedEventSource: AgendaItem['source'] = 'evento';
  let eventForm = defaultEventForm();

  function formatDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function formatLocalDateTime(date: Date) {
    return `${formatDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function formatDateTimeLabel(value?: string | null, allDay = false) {
    if (!value) return '-';
    if (allDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: allDay ? undefined : '2-digit',
      minute: allDay ? undefined : '2-digit'
    });
  }

  function splitDateTime(value?: string | null) {
    if (!value) return { date: todayIso, time: '09:00' };
    if (!value.includes('T')) return { date: value, time: '09:00' };
    const [date, time] = value.split('T');
    return { date, time: time.slice(0, 5) };
  }

  function toCalendarEvent(item: AgendaItem) {
    const isBirthday = item.source === 'birthday' || item.id.startsWith('birthday:');
    return {
      id: item.id,
      title: item.title,
      start: item.start,
      end: item.end || undefined,
      allDay: item.allDay,
      editable: !isBirthday,
      backgroundColor: isBirthday ? '#f59e0b' : '#0f766e',
      borderColor: isBirthday ? '#d97706' : '#0f766e',
      extendedProps: {
        descricao: item.descricao,
        source: item.source || (isBirthday ? 'birthday' : 'evento')
      }
    };
  }

  async function syncCalendarEvents() {
    if (!calendar) return;
    calendar.removeAllEvents();
    calendar.addEventSource(items.map(toCalendarEvent));
  }

  async function loadRange(inicio: string, fim: string, silent = false) {
    if (!silent) loading = true;
    refreshing = true;

    try {
      const response = await fetch(`/api/v1/agenda/range?inicio=${inicio}&fim=${fim}`, {
        credentials: 'same-origin'
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao carregar agenda.');
      }

      visibleRange = { inicio, fim };
      items = Array.isArray(payload?.items) ? payload.items : [];
      await syncCalendarEvents();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar agenda.');
      items = [];
      await syncCalendarEvents();
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  function initializeCalendar() {
    if (!calendarEl) return;

    calendar = new Calendar(calendarEl, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      locale: ptBrLocale,
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      height: 'auto',
      editable: true,
      selectable: true,
      dayMaxEvents: true,
      datesSet: async (info) => {
        const start = formatDate(info.start);
        const endDate = new Date(info.end.getTime());
        endDate.setDate(endDate.getDate() - 1);
        const end = formatDate(endDate);
        await loadRange(start, end, true);
      },
      select: (info) => {
        openCreateModal({
          startDate: info.startStr.split('T')[0],
          endDate: (info.endStr || info.startStr).split('T')[0],
          allDay: info.allDay,
          startTime: info.allDay ? '09:00' : info.startStr.split('T')[1]?.slice(0, 5) || '09:00',
          endTime: info.allDay ? '10:00' : info.endStr?.split('T')[1]?.slice(0, 5) || '10:00'
        });
      },
      eventClick: (info) => {
        const found = items.find((item) => item.id === info.event.id);
        if (!found) return;
        openExistingEvent(found);
      },
      eventDrop: async (info) => {
        try {
          await updateFromCalendarEvent(info.event);
          toast.success('Evento reposicionado.');
        } catch (error) {
          console.error(error);
          info.revert();
          toast.error(error instanceof Error ? error.message : 'Erro ao mover evento.');
        }
      },
      eventResize: async (info) => {
        try {
          await updateFromCalendarEvent(info.event);
          toast.success('Periodo atualizado.');
        } catch (error) {
          console.error(error);
          info.revert();
          toast.error(error instanceof Error ? error.message : 'Erro ao atualizar evento.');
        }
      }
    });

    calendar.render();
  }

  function eventToPayload(event: any) {
    const allDay = Boolean(event.allDay);
    const startDate = event.start ? formatDate(event.start) : todayIso;
    let endDate = event.end ? formatDate(event.end) : startDate;

    if (allDay && event.end) {
      const adjusted = new Date(event.end.getTime());
      adjusted.setDate(adjusted.getDate() - 1);
      endDate = formatDate(adjusted);
    }

    return {
      start_date: startDate,
      end_date: endDate,
      start_at: !allDay && event.start ? formatLocalDateTime(event.start) : null,
      end_at: !allDay && event.end ? formatLocalDateTime(event.end) : null,
      all_day: allDay
    };
  }

  async function updateFromCalendarEvent(event: any) {
    if (String(event.id || '').startsWith('birthday:')) {
      throw new Error('Aniversarios sao somente leitura.');
    }

    const response = await fetch(`/api/v1/agenda/update?id=${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(eventToPayload(event))
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || 'Erro ao atualizar evento.');
    }

    await loadRange(visibleRange.inicio, visibleRange.fim, true);
  }

  function openCreateModal(
    preset: Partial<EventForm> = {}
  ) {
    selectedEventId = null;
    selectedEventSource = 'evento';
    eventForm = {
      ...defaultEventForm(),
      ...preset
    };
    eventModalOpen = true;
  }

  function openExistingEvent(item: AgendaItem) {
    const start = splitDateTime(item.start);
    const end = splitDateTime(item.end || item.start);
    selectedEventId = item.id;
    selectedEventSource = item.source || (item.id.startsWith('birthday:') ? 'birthday' : 'evento');
    eventForm = {
      titulo: item.title,
      startDate: start.date,
      endDate: end.date || start.date,
      allDay: item.allDay,
      startTime: start.time || '09:00',
      endTime: end.time || '10:00',
      descricao: item.descricao || ''
    };
    eventModalOpen = true;
  }

  async function saveEvent() {
    if (!eventForm.titulo.trim()) {
      toast.error('Informe o titulo do evento.');
      return;
    }

    if (selectedEventSource === 'birthday') {
      toast.error('Aniversarios sao somente leitura.');
      return;
    }

    eventSaving = true;
    try {
      const body = {
        titulo: eventForm.titulo,
        descricao: eventForm.descricao || null,
        start_date: eventForm.startDate,
        end_date: eventForm.endDate || eventForm.startDate,
        start_at: eventForm.allDay ? null : `${eventForm.startDate}T${eventForm.startTime}`,
        end_at: eventForm.allDay ? null : `${eventForm.endDate || eventForm.startDate}T${eventForm.endTime}`,
        all_day: eventForm.allDay
      };

      const response = await fetch(selectedEventId ? `/api/v1/agenda/update?id=${selectedEventId}` : '/api/v1/agenda/create', {
        method: selectedEventId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body)
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao salvar evento.');
      }

      toast.success(selectedEventId ? 'Evento atualizado.' : 'Evento criado.');
      eventModalOpen = false;
      eventForm = defaultEventForm();
      selectedEventId = null;
      await loadRange(visibleRange.inicio, visibleRange.fim, true);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar evento.');
    } finally {
      eventSaving = false;
    }
  }

  async function deleteEvent() {
    if (!selectedEventId) return;
    if (!window.confirm('Deseja excluir este evento?')) return;

    try {
      const response = await fetch(`/api/v1/agenda/delete?id=${selectedEventId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao excluir evento.');
      }

      toast.success('Evento excluido.');
      eventModalOpen = false;
      selectedEventId = null;
      eventForm = defaultEventForm();
      await loadRange(visibleRange.inicio, visibleRange.fim, true);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir evento.');
    }
  }

  onMount(() => {
    initializeCalendar();
  });

  $: if (calendarEl && !calendar) {
    initializeCalendar();
  }

  $: visibleRows = items
    .map((item) => {
      const sourceLabel =
        item.source === 'birthday' || item.id.startsWith('birthday:') ? 'Aniversario' : 'Evento';
      return {
        ...item,
        sourceLabel,
        dateLabel: item.allDay
          ? formatDateTimeLabel(item.start, true)
          : `${formatDateTimeLabel(item.start)}${item.end ? ` ate ${formatDateTimeLabel(item.end)}` : ''}`
      };
    })
    .filter((row) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return [row.title, row.descricao || '', row.sourceLabel, row.dateLabel].join(' ').toLowerCase().includes(query);
    })
    .sort((left, right) => String(left.start).localeCompare(String(right.start)));

  $: resumo = {
    total: items.filter((item) => !String(item.id).startsWith('birthday:')).length,
    aniversarios: items.filter((item) => String(item.id).startsWith('birthday:')).length,
    hoje: items.filter((item) => String(item.start).startsWith(todayIso)).length,
    proximos7: items.filter((item) => {
      const parsed = new Date(String(item.start));
      if (Number.isNaN(parsed.getTime())) return false;
      const diff = parsed.getTime() - new Date(`${todayIso}T00:00:00`).getTime();
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    }).length
  };
</script>

<svelte:head>
  <title>Agenda | VTUR</title>
</svelte:head>

<PageHeader
  title="Agenda"
  subtitle="Agenda operacional pessoal, com eventos reais e aniversarios da empresa como no fluxo legado."
  color="operacao"
  breadcrumbs={[
    { label: 'Operacao', href: '/operacao' },
    { label: 'Agenda' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: () => loadRange(visibleRange.inicio, visibleRange.fim, true), variant: 'secondary', icon: RefreshCw },
    { label: 'Novo evento', onClick: () => openCreateModal(), variant: 'primary', icon: Plus }
  ]}
/>

<div class="vtur-kpi-grid mb-6">
  <KPICard title="Eventos" value={resumo.total} color="operacao" icon={CalendarDays} />
  <KPICard title="Hoje" value={resumo.hoje} color="operacao" icon={Clock3} />
  <KPICard title="Proximos 7 dias" value={resumo.proximos7} color="operacao" icon={CalendarDays} />
  <KPICard title="Aniversarios" value={resumo.aniversarios} color="operacao" icon={UserRound} />
</div>

<Card color="operacao" padding="none" class="mb-6">
  <div class="border-b border-slate-100 px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
    <div>
      <h3 class="text-lg font-semibold text-slate-900">Calendario</h3>
      <p class="text-sm text-slate-500">
        Faixa atual: {visibleRange.inicio} ate {visibleRange.fim}
      </p>
    </div>
    <div class="flex items-center gap-2">
      {#if refreshing}
        <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <Loader2 size={14} class="animate-spin" />
          Atualizando
        </span>
      {/if}
      <Badge color="operacao" size="sm">Eventos pessoais</Badge>
      <Badge color="yellow" size="sm">Aniversarios</Badge>
    </div>
  </div>

  <div class="relative min-h-[42rem]">
    <div bind:this={calendarEl} class="p-4 md:p-5 min-h-[42rem]"></div>
    {#if loading}
      <div class="absolute inset-0 flex items-center justify-center gap-3 bg-white/80 text-slate-500 backdrop-blur-sm">
        <Loader2 size={20} class="animate-spin" />
        Carregando agenda...
      </div>
    {/if}
  </div>
</Card>

<Card color="operacao">
  <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
    <div>
      <h3 class="text-lg font-semibold text-slate-900">Compromissos do periodo</h3>
      <p class="text-sm text-slate-500">Lista operacional do intervalo visivel no calendario.</p>
    </div>
    <div class="relative max-w-md w-full">
      <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        bind:value={searchQuery}
        class="vtur-input w-full pl-9"
        placeholder="Buscar por assunto, data ou descricao"
      />
    </div>
  </div>

  <DataTable
    columns={listColumns}
    data={visibleRows}
    color="operacao"
    loading={false}
    searchable={false}
    filterable={false}
    exportable={false}
    onRowClick={(row) => openExistingEvent(row)}
    emptyMessage="Nenhum compromisso encontrado para o periodo"
  />
</Card>

<Dialog
  bind:open={eventModalOpen}
  title={selectedEventId ? 'Detalhe do evento' : 'Novo evento'}
  color="operacao"
  size="lg"
  showCancel={true}
  cancelText="Fechar"
  showConfirm={false}
  loading={eventSaving}
  onCancel={() => {
    eventModalOpen = false;
    selectedEventId = null;
    selectedEventSource = 'evento';
    eventForm = defaultEventForm();
  }}
>
  {#if eventLoading}
    <div class="flex items-center justify-center gap-3 py-10 text-slate-500">
      <Loader2 size={18} class="animate-spin" />
      Carregando...
    </div>
  {:else if selectedEventSource === 'birthday'}
    <div class="space-y-4">
      <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <h4 class="font-semibold text-amber-900">{eventForm.titulo}</h4>
        <p class="mt-1 text-sm text-amber-700">Evento gerado automaticamente para aniversario da empresa.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span class="block text-xs uppercase tracking-wide text-slate-400">Data</span>
          <strong class="text-slate-900">{formatDateTimeLabel(eventForm.startDate, true)}</strong>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span class="block text-xs uppercase tracking-wide text-slate-400">Descricao</span>
          <strong class="text-slate-900">{eventForm.descricao || 'Aniversario'}</strong>
        </div>
      </div>
    </div>
  {:else}
    <div class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1" for="agenda-title">Assunto</label>
          <input id="agenda-title" bind:value={eventForm.titulo} class="vtur-input w-full" placeholder="Titulo do compromisso" />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1" for="agenda-description">Descricao</label>
          <textarea
            id="agenda-description"
            bind:value={eventForm.descricao}
            class="vtur-input w-full"
            rows="4"
            placeholder="Detalhes do compromisso"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1" for="agenda-start-date">Data inicial</label>
          <input id="agenda-start-date" type="date" bind:value={eventForm.startDate} class="vtur-input w-full" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1" for="agenda-end-date">Data final</label>
          <input id="agenda-end-date" type="date" bind:value={eventForm.endDate} class="vtur-input w-full" />
        </div>

        <div class="md:col-span-2">
          <label class="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" bind:checked={eventForm.allDay} class="rounded border-slate-300" />
            Dia inteiro
          </label>
        </div>

        {#if !eventForm.allDay}
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1" for="agenda-start-time">Inicio</label>
            <input id="agenda-start-time" type="time" bind:value={eventForm.startTime} class="vtur-input w-full" />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1" for="agenda-end-time">Fim</label>
            <input id="agenda-end-time" type="time" bind:value={eventForm.endTime} class="vtur-input w-full" />
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <svelte:fragment slot="actions">
    {#if selectedEventSource !== 'birthday'}
      <Button variant="primary" loading={eventSaving} on:click={saveEvent}>
        {#if selectedEventId}
          Salvar evento
        {:else}
          Criar evento
        {/if}
      </Button>
      {#if selectedEventId}
        <Button variant="danger" on:click={deleteEvent}>Excluir</Button>
      {/if}
    {/if}
  </svelte:fragment>
</Dialog>
