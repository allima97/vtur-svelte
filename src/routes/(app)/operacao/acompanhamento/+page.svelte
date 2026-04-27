<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { FieldCheckbox, FieldInput, FieldSelect, FieldTextarea } from '$lib/components/ui';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { toast } from '$lib/stores/ui';
  import { CalendarDays, ExternalLink, Loader2, MessageCircle, RefreshCw, Search } from 'lucide-svelte';

  type FollowUpItem = {
    id: string;
    venda_id: string | null;
    cliente_id: string | null;
    cliente_nome: string;
    cliente_whatsapp: string | null;
    cliente_telefone: string | null;
    destino_nome: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    data_embarque: string | null;
    data_final: string | null;
    vendedor_id: string | null;
    follow_up_fechado: boolean;
    follow_up_text: string | null;
    updated_at: string | null;
  };

  const columns = [
    { key: 'cliente_nome', label: 'Cliente', sortable: true },
    { key: 'destino_nome', label: 'Destino', sortable: true },
    { key: 'retornoLabel', label: 'Retorno', sortable: true },
    { key: 'embarqueLabel', label: 'Embarque', sortable: true },
    { key: 'statusLabel', label: 'Status', sortable: true },
    { key: 'followUpResumo', label: 'Follow-up', sortable: true }
  ];

  const todayIso = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  function thirtyDaysAgo() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  let loading = true;
  let saving = false;
  let errorMessage: string | null = null;
  let searchQuery = '';
  let statusFilter = 'abertos';
  let inicio = thirtyDaysAgo();
  let fim = todayIso;
  let items: FollowUpItem[] = [];

  let modalOpen = false;
  let selectedItem: FollowUpItem | null = null;
  let form = {
    texto: '',
    fechado: false
  };

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR');
  }

  function sanitizePhone(value?: string | null) {
    return String(value || '').replace(/\D/g, '');
  }

  async function loadFollowUps() {
    loading = true;
    errorMessage = null;

    try {
      const params = new URLSearchParams({
        inicio,
        fim,
        status: statusFilter
      });

      const response = await fetch(`/api/v1/dashboard/follow-ups?${params.toString()}`, {
        credentials: 'same-origin'
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao carregar follow-ups.');
      }

      items = Array.isArray(payload?.items) ? payload.items : [];
    } catch (error) {
      console.error(error);
      errorMessage = error instanceof Error ? error.message : 'Erro ao carregar follow-ups.';
      items = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadFollowUps();
  });

  $: rows = items
    .map((item) => ({
      ...item,
      retornoLabel: formatDate(item.data_fim || item.data_final),
      embarqueLabel: formatDate(item.data_inicio || item.data_embarque),
      statusLabel: item.follow_up_fechado ? 'Fechado' : 'Aberto',
      followUpResumo: item.follow_up_text?.trim() ? item.follow_up_text.trim() : 'Sem anotacao'
    }))
    .filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return [
        item.cliente_nome,
        item.destino_nome || '',
        item.followUpResumo,
        item.statusLabel
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

  $: resumo = {
    total: items.length,
    atrasados: items.filter((item) => !item.follow_up_fechado && String(item.data_fim || item.data_final || '') < todayIso).length,
    semTexto: items.filter((item) => !String(item.follow_up_text || '').trim()).length,
    fechados: items.filter((item) => item.follow_up_fechado).length
  };

  function openItem(item: FollowUpItem) {
    selectedItem = item;
    form = {
      texto: item.follow_up_text || '',
      fechado: Boolean(item.follow_up_fechado)
    };
    modalOpen = true;
  }

  async function saveFollowUp() {
    if (!selectedItem) return;

    saving = true;
    try {
      const response = await fetch(`/api/v1/viagens/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          follow_up_text: form.texto.trim() || null,
          follow_up_fechado: form.fechado
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao salvar follow-up.');
      }

      toast.success('Follow-up atualizado.');
      modalOpen = false;
      selectedItem = null;
      await loadFollowUps();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar follow-up.');
    } finally {
      saving = false;
    }
  }

  function currentWhatsAppLink(item: FollowUpItem) {
    const phone = sanitizePhone(item.cliente_whatsapp || item.cliente_telefone);
    if (!phone) return null;
    return `https://wa.me/${phone}`;
  }
</script>

<svelte:head>
  <title>Acompanhamento | VTUR</title>
</svelte:head>

<PageHeader
  title="Acompanhamento"
  subtitle="Follow-up operacional derivado de viagens e vendas, respeitando escopo por perfil."
  color="operacao"
  breadcrumbs={[
    { label: 'Operacao', href: '/operacao' },
    { label: 'Acompanhamento' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: loadFollowUps, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<div class="vtur-kpi-grid mb-6">
  <KPICard title="Itens no periodo" value={resumo.total} color="operacao" icon={CalendarDays} />
  <KPICard title="Atrasados" value={resumo.atrasados} color="operacao" icon={CalendarDays} />
  <KPICard title="Sem texto" value={resumo.semTexto} color="operacao" icon={Search} />
  <KPICard title="Fechados" value={resumo.fechados} color="operacao" icon={ExternalLink} />
</div>

<Card color="operacao" class="mb-6">
  <div class="grid grid-cols-1 lg:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))] gap-4">
    <FieldInput
      id="follow-search"
      label="Busca"
      bind:value={searchQuery}
      class_name="w-full"
      placeholder="Cliente, destino ou texto do follow-up"
      icon={Search}
    />

    <FieldSelect
      id="follow-status"
      label="Status"
      bind:value={statusFilter}
      options={[
        { value: 'abertos', label: 'Abertos' },
        { value: 'todos', label: 'Todos' },
        { value: 'fechados', label: 'Fechados' }
      ]}
      placeholder={null}
      class_name="w-full"
    />

    <FieldInput id="follow-start" label="Inicio" type="date" bind:value={inicio} class_name="w-full" />

    <FieldInput id="follow-end" label="Fim" type="date" bind:value={fim} min={inicio || null} class_name="w-full" />
  </div>

  <div class="mt-4 flex flex-wrap gap-2">
    <Button variant="primary" size="sm" on:click={loadFollowUps}>Aplicar periodo</Button>
    <Button
      variant="ghost"
      size="sm"
      on:click={() => {
        searchQuery = '';
        statusFilter = 'abertos';
        inicio = thirtyDaysAgo();
        fim = todayIso;
      }}
    >
      Limpar filtros
    </Button>
  </div>
</Card>

<Card color="operacao">
  {#if loading}
    <div class="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 size={20} class="animate-spin" />
      Carregando acompanhamento...
    </div>
  {:else if errorMessage}
    <div class="py-8 text-sm text-red-600">{errorMessage}</div>
  {:else}
    <DataTable
      columns={columns}
      data={rows}
      color="operacao"
      loading={false}
      searchable={false}
      filterable={false}
      exportable={false}
      onRowClick={(row) => openItem(row)}
      emptyMessage="Nenhum follow-up encontrado para o periodo"
    />
  {/if}
</Card>

<Dialog
  bind:open={modalOpen}
  title="Detalhe do acompanhamento"
  color="operacao"
  size="lg"
  showCancel={true}
  cancelText="Fechar"
  showConfirm={false}
  loading={saving}
  onCancel={() => {
    modalOpen = false;
    selectedItem = null;
  }}
>
  {#if selectedItem}
    <div class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span class="block text-xs uppercase tracking-wide text-slate-400">Cliente</span>
          <strong class="text-slate-900">{selectedItem.cliente_nome}</strong>
          {#if selectedItem.destino_nome}
            <p class="mt-1 text-sm text-slate-600">{selectedItem.destino_nome}</p>
          {/if}
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span class="block text-xs uppercase tracking-wide text-slate-400">Periodo da viagem</span>
          <strong class="text-slate-900">
            {formatDate(selectedItem.data_inicio || selectedItem.data_embarque)} ate {formatDate(selectedItem.data_fim || selectedItem.data_final)}
          </strong>
          <div class="mt-2 flex flex-wrap gap-2">
            {#if form.fechado}
              <Badge color="green" size="sm">Fechado</Badge>
            {:else}
              <Badge color="yellow" size="sm">Aberto</Badge>
            {/if}
          </div>
        </div>
      </div>

      <FieldTextarea
        id="follow-text"
        label="Texto do follow-up"
        bind:value={form.texto}
        class_name="w-full"
        rows={6}
        placeholder="Registre aqui o retorno operacional, feedback do cliente e proximos passos."
      />

      <div class="flex flex-wrap items-center gap-4">
        <FieldCheckbox label="Marcar follow-up como fechado" bind:checked={form.fechado} color="operacao" />
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <h4 class="text-sm font-semibold text-slate-900 mb-2">Vinculos operacionais</h4>
        <div class="flex flex-wrap gap-2">
          {#if selectedItem.cliente_id}
            <Button href={`/clientes/${selectedItem.cliente_id}`} variant="secondary" size="sm">
              Cliente
            </Button>
          {/if}
          {#if selectedItem.venda_id}
            <Button href={`/vendas/${selectedItem.venda_id}`} variant="secondary" size="sm">
              Venda
            </Button>
          {/if}
          <Button href={`/operacao/viagens/${selectedItem.id}`} variant="secondary" size="sm">
            Viagem
          </Button>
          {#if currentWhatsAppLink(selectedItem)}
            <Button href={currentWhatsAppLink(selectedItem) || undefined} variant="secondary" size="sm">
              <MessageCircle size={14} class="mr-1.5" />
              WhatsApp
            </Button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <svelte:fragment slot="actions">
    <Button variant="primary" loading={saving} on:click={saveFollowUp}>Salvar follow-up</Button>
  </svelte:fragment>
</Dialog>
