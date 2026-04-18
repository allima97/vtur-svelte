<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { toast } from '$lib/stores/ui';
  import { Calendar, Download, Loader2, Plus, RefreshCw, Video, X } from 'lucide-svelte';

  type Consultoria = {
    id: string;
    cliente_id: string | null;
    cliente_nome: string;
    data_hora: string;
    lembrete: string;
    destino: string | null;
    quantidade_pessoas: number;
    orcamento_id: string | null;
    taxa_consultoria: number;
    notas: string | null;
    fechada: boolean;
    fechada_em: string | null;
    created_at: string;
  };

  type ConsultoriaForm = {
    cliente_nome: string;
    data_hora: string;
    lembrete: string;
    destino: string;
    quantidade_pessoas: number;
    taxa_consultoria: number;
    notas: string;
  };

  const lembreteOptions = [
    { value: '15min', label: '15 minutos antes' },
    { value: '30min', label: '30 minutos antes' },
    { value: '1h', label: '1 hora antes' },
    { value: '2h', label: '2 horas antes' },
    { value: '1d', label: '1 dia antes' }
  ];

  const statusOptions = [
    { value: '', label: 'Todas' },
    { value: 'aberta', label: 'Abertas' },
    { value: 'fechada', label: 'Fechadas' }
  ];

  let consultorias: Consultoria[] = $state([]);
  let loading = $state(false);
  let saving = $state(false);
  let showModal = $state(false);
  let editingId = $state<string | null>(null);
  let statusFilter = $state('');

  const defaultForm = (): ConsultoriaForm => ({
    cliente_nome: '',
    data_hora: '',
    lembrete: '15min',
    destino: '',
    quantidade_pessoas: 1,
    taxa_consultoria: 0,
    notas: ''
  });

  let form = $state<ConsultoriaForm>(defaultForm());

  function formatDataHora(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatCurrency(val: number): string {
    if (!val) return '-';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function loadConsultorias() {
    loading = true;
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/v1/consultorias${params}`);
      if (!res.ok) throw new Error(await res.text());
      consultorias = await res.json();
    } catch (err: any) {
      toast.error('Erro ao carregar consultorias: ' + (err?.message ?? err));
    } finally {
      loading = false;
    }
  }

  function openCreate() {
    editingId = null;
    form = defaultForm();
    showModal = true;
  }

  function openEdit(c: Consultoria) {
    editingId = c.id;
    // Converter data_hora ISO para formato datetime-local (YYYY-MM-DDTHH:mm)
    const dt = c.data_hora ? new Date(c.data_hora) : null;
    const dataHoraLocal = dt
      ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}T${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
      : '';
    form = {
      cliente_nome: c.cliente_nome,
      data_hora: dataHoraLocal,
      lembrete: c.lembrete || '15min',
      destino: c.destino || '',
      quantidade_pessoas: c.quantidade_pessoas || 1,
      taxa_consultoria: c.taxa_consultoria || 0,
      notas: c.notas || ''
    };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingId = null;
    form = defaultForm();
  }

  async function saveConsultoria() {
    if (!form.cliente_nome.trim()) {
      toast.error('Nome do cliente é obrigatório.');
      return;
    }
    if (!form.data_hora) {
      toast.error('Data e hora são obrigatórias.');
      return;
    }

    saving = true;
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        cliente_nome: form.cliente_nome.trim(),
        data_hora: new Date(form.data_hora).toISOString(),
        lembrete: form.lembrete,
        destino: form.destino.trim() || null,
        quantidade_pessoas: Number(form.quantidade_pessoas) || 1,
        taxa_consultoria: Number(form.taxa_consultoria) || 0,
        notas: form.notas.trim() || null
      };

      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch('/api/v1/consultorias', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Erro ao salvar consultoria');
      }

      toast.success(editingId ? 'Consultoria atualizada.' : 'Consultoria criada.');
      closeModal();
      await loadConsultorias();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar consultoria.');
    } finally {
      saving = false;
    }
  }

  async function toggleFechada(c: Consultoria) {
    try {
      const res = await fetch('/api/v1/consultorias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id,
          fechada: !c.fechada,
          fechada_em: !c.fechada ? new Date().toISOString() : null
        })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(c.fechada ? 'Consultoria reaberta.' : 'Consultoria fechada.');
      await loadConsultorias();
    } catch (err: any) {
      toast.error('Erro: ' + (err?.message ?? err));
    }
  }

  function exportIcal() {
    window.open('/api/v1/consultorias/ics', '_blank');
  }

  onMount(loadConsultorias);

  $effect(() => {
    // Recarrega quando o filtro muda
    void statusFilter;
    loadConsultorias();
  });

  $derived const filteredConsultorias = consultorias;
</script>

<PageHeader title="Consultoria Online" subtitle="Gerencie agendamentos de consultoria">
  {#snippet actions()}
    <Button variant="outline" size="sm" onclick={exportIcal} title="Exportar calendário">
      <Download class="w-4 h-4 mr-1" />
      iCal
    </Button>
    <Button variant="outline" size="sm" onclick={loadConsultorias} disabled={loading}>
      <RefreshCw class="w-4 h-4 {loading ? 'animate-spin' : ''}" />
    </Button>
    <Button onclick={openCreate}>
      <Plus class="w-4 h-4 mr-1" />
      Nova Consultoria
    </Button>
  {/snippet}
</PageHeader>

<div class="p-4 space-y-4">
  <!-- Filtros -->
  <Card>
    <div class="flex items-center gap-3 flex-wrap">
      <span class="text-sm font-medium text-gray-600">Filtrar por status:</span>
      {#each statusOptions as opt}
        <button
          type="button"
          class="px-3 py-1 rounded-full text-sm border transition-colors {statusFilter === opt.value
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}"
          onclick={() => { statusFilter = opt.value; }}
        >
          {opt.label}
        </button>
      {/each}
      <span class="ml-auto text-sm text-gray-500">{consultorias.length} registro(s)</span>
    </div>
  </Card>

  <!-- Lista -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-blue-500" />
    </div>
  {:else if consultorias.length === 0}
    <EmptyState
      title="Nenhuma consultoria encontrada"
      description="Clique em 'Nova Consultoria' para agendar a primeira."
      icon={Video}
    />
  {:else}
    <div class="space-y-2">
      {#each consultorias as c (c.id)}
        <Card>
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-gray-900">{c.cliente_nome}</span>
                <Badge variant={c.fechada ? 'secondary' : 'success'}>
                  {c.fechada ? 'Fechada' : 'Aberta'}
                </Badge>
                {#if c.destino}
                  <span class="text-sm text-gray-500">— {c.destino}</span>
                {/if}
              </div>
              <div class="flex items-center gap-4 mt-1 text-sm text-gray-600 flex-wrap">
                <span class="flex items-center gap-1">
                  <Calendar class="w-3.5 h-3.5" />
                  {formatDataHora(c.data_hora)}
                </span>
                <span>{c.quantidade_pessoas} pessoa(s)</span>
                {#if c.taxa_consultoria}
                  <span>{formatCurrency(c.taxa_consultoria)}</span>
                {/if}
                {#if c.lembrete}
                  <span class="text-xs bg-gray-100 px-2 py-0.5 rounded">Lembrete: {c.lembrete}</span>
                {/if}
              </div>
              {#if c.notas}
                <p class="text-sm text-gray-500 mt-1 line-clamp-2">{c.notas}</p>
              {/if}
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                class="text-xs px-2 py-1 rounded border border-gray-300 hover:border-blue-400 text-gray-600 hover:text-blue-600 transition-colors"
                onclick={() => openEdit(c)}
              >
                Editar
              </button>
              <button
                type="button"
                class="text-xs px-2 py-1 rounded border transition-colors {c.fechada
                  ? 'border-green-300 text-green-700 hover:bg-green-50'
                  : 'border-orange-300 text-orange-700 hover:bg-orange-50'}"
                onclick={() => toggleFechada(c)}
              >
                {c.fechada ? 'Reabrir' : 'Fechar'}
              </button>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal Nova/Editar Consultoria -->
{#if showModal}
  <Dialog title={editingId ? 'Editar Consultoria' : 'Nova Consultoria'} onclose={closeModal}>
    <form
      onsubmit={(e) => { e.preventDefault(); saveConsultoria(); }}
      class="space-y-4"
    >
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Nome do Cliente <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          bind:value={form.cliente_nome}
          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nome do cliente"
          required
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Data e Hora <span class="text-red-500">*</span>
        </label>
        <input
          type="datetime-local"
          bind:value={form.data_hora}
          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Lembrete</label>
          <select
            bind:value={form.lembrete}
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {#each lembreteOptions as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Qtd. Pessoas</label>
          <input
            type="number"
            bind:value={form.quantidade_pessoas}
            min="1"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Destino</label>
          <input
            type="text"
            bind:value={form.destino}
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Paris, Miami..."
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Taxa de Consultoria (R$)</label>
          <input
            type="number"
            bind:value={form.taxa_consultoria}
            min="0"
            step="0.01"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          bind:value={form.notas}
          rows="3"
          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Observações sobre a consultoria..."
        ></textarea>
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onclick={closeModal} disabled={saving}>
          <X class="w-4 h-4 mr-1" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {#if saving}
            <Loader2 class="w-4 h-4 mr-1 animate-spin" />
            Salvando...
          {:else}
            {editingId ? 'Salvar Alterações' : 'Criar Consultoria'}
          {/if}
        </Button>
      </div>
    </form>
  </Dialog>
{/if}
