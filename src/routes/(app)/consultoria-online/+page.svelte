<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect, FieldTextarea } from '$lib/components/ui';
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

  let consultorias: Consultoria[] = [];
  let loading = false;
  let saving = false;
  let showModal = false;
  let editingId: string | null = null;
  let statusFilter = '';

  function defaultForm(): ConsultoriaForm {
    return {
      cliente_nome: '',
      data_hora: '',
      lembrete: '15min',
      destino: '',
      quantidade_pessoas: 1,
      taxa_consultoria: 0,
      notas: ''
    };
  }

  let form: ConsultoriaForm = defaultForm();

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
    if (!form.cliente_nome.trim()) { toast.error('Nome do cliente é obrigatório.'); return; }
    if (!form.data_hora) { toast.error('Data e hora são obrigatórias.'); return; }

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

  // Recarrega quando o filtro muda
  $: statusFilter, void (typeof window !== 'undefined' && loadConsultorias());

  onMount(loadConsultorias);
</script>

<PageHeader
  title="Consultoria Online"
  subtitle="Gerencie agendamentos de consultoria"
  color="operacao"
  actions={[
    { label: 'Nova Consultoria', onClick: openCreate, variant: 'primary', icon: Plus }
  ]}
/>

<div class="space-y-4">
  <!-- Filtros -->
  <Card>
    <div class="flex flex-wrap items-center gap-3">
      <span class="text-sm font-medium text-slate-600">Filtrar por status:</span>
      {#each statusOptions as opt}
        <Button
          variant={statusFilter === opt.value ? 'primary' : 'outline'}
          size="sm"
          class_name="rounded-full"
          on:click={() => { statusFilter = opt.value; }}
        >
          {opt.label}
        </Button>
      {/each}
      <div class="ml-auto flex items-center gap-2">
        <span class="text-sm text-slate-500">{consultorias.length} registro(s)</span>
        <Button
          variant="ghost"
          size="xs"
          disabled={loading}
          title="Atualizar"
          on:click={loadConsultorias}
        >
          <RefreshCw size={15} class={loading ? 'animate-spin' : ''} />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          title="Exportar iCal"
          on:click={exportIcal}
        >
          <Download size={15} />
        </Button>
      </div>
    </div>
  </Card>

  <!-- Lista -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Loader2 size={32} class="animate-spin text-blue-500" />
    </div>
  {:else if consultorias.length === 0}
    <EmptyState
      title="Nenhuma consultoria encontrada"
      message="Clique em 'Nova Consultoria' para agendar a primeira."
      icon={Video}
    />
  {:else}
    <div class="space-y-2">
      {#each consultorias as c (c.id)}
        <Card>
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-slate-900">{c.cliente_nome}</span>
                <Badge color={c.fechada ? 'gray' : 'teal'} dot>
                  {c.fechada ? 'Fechada' : 'Aberta'}
                </Badge>
                {#if c.destino}
                  <span class="text-sm text-slate-500">— {c.destino}</span>
                {/if}
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span class="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDataHora(c.data_hora)}
                </span>
                <span>{c.quantidade_pessoas} pessoa(s)</span>
                {#if c.taxa_consultoria}
                  <span>{formatCurrency(c.taxa_consultoria)}</span>
                {/if}
                {#if c.lembrete}
                  <span class="rounded bg-slate-100 px-2 py-0.5 text-xs">Lembrete: {c.lembrete}</span>
                {/if}
              </div>
              {#if c.notas}
                <p class="mt-1 line-clamp-2 text-sm text-slate-500">{c.notas}</p>
              {/if}
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="primary" on:click={() => openEdit(c)}>
                Editar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                color={c.fechada ? 'green' : 'orange'}
                on:click={() => toggleFechada(c)}
              >
                {c.fechada ? 'Reabrir' : 'Fechar'}
              </Button>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal Nova/Editar Consultoria -->
<Dialog
  bind:open={showModal}
  title={editingId ? 'Editar Consultoria' : 'Nova Consultoria'}
  size="lg"
  color="operacao"
  onCancel={closeModal}
>
  <form
    on:submit|preventDefault={saveConsultoria}
    class="space-y-4"
  >
    <FieldInput
      id="cliente_nome"
      label="Nome do Cliente"
      bind:value={form.cliente_nome}
      placeholder="Nome do cliente"
      required
    />

    <FieldInput
      id="data_hora"
      label="Data e Hora"
      type="datetime-local"
      bind:value={form.data_hora}
      required
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FieldSelect
        id="lembrete"
        label="Lembrete"
        bind:value={form.lembrete}
        options={lembreteOptions}
        placeholder={null}
      />
      <FieldInput
        id="qtd_pessoas"
        label="Qtd. Pessoas"
        type="number"
        bind:value={form.quantidade_pessoas}
        min="1"
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FieldInput
        id="destino"
        label="Destino"
        bind:value={form.destino}
        placeholder="Ex: Paris, Miami..."
      />
      <FieldInput
        id="taxa"
        label="Taxa de Consultoria (R$)"
        type="number"
        bind:value={form.taxa_consultoria}
        min="0"
        step="0.01"
      />
    </div>

    <FieldTextarea
      id="notas"
      label="Notas"
      bind:value={form.notas}
      rows={3}
      placeholder="Observações sobre a consultoria..."
    />

    <div class="flex justify-end gap-2 border-t pt-3">
      <Button type="button" variant="secondary" on:click={closeModal} disabled={saving}>
        <X size={16} class="mr-1" />
        Cancelar
      </Button>
      <Button type="submit" variant="primary" color="operacao" loading={saving}>
        {editingId ? 'Salvar Alterações' : 'Criar Consultoria'}
      </Button>
    </div>
  </form>
</Dialog>
