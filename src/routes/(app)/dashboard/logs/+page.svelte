<script lang="ts">
  import { onMount } from 'svelte';
  import { FileText, RefreshCw } from 'lucide-svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import LoadingState from '$lib/components/ui/LoadingState.svelte';
  import SimpleTable from '$lib/components/ui/SimpleTable.svelte';
  import PaginationControls from '$lib/components/ui/PaginationControls.svelte';
  import { FieldInput } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';
  import { formatDateTime } from '$lib/utils/formatters';

  type LogUsuario = {
    nome_completo: string | null;
    email: string | null;
  } | null;

  type LogItem = {
    id: string;
    modulo: string | null;
    acao: string | null;
    detalhes: unknown;
    user_id: string | null;
    ip: string | null;
    created_at: string | null;
    usuario?: LogUsuario;
  };

  type LogsPayload = {
    items?: LogItem[];
    total?: number;
    page?: number;
    pageSize?: number;
  };

  let loading = true;
  let logs: LogItem[] = [];
  let total = 0;
  let page = 1;
  let pageSize = 50;
  let tipo = '';
  let userId = '';

  function formatDetails(value: unknown) {
    if (!value) return '-';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function userLabel(log: LogItem) {
    return log.usuario?.nome_completo || log.usuario?.email || log.user_id || '-';
  }

  async function loadLogs(nextPage = page) {
    loading = true;
    try {
      const payload = await apiGet<LogsPayload>('/api/v1/admin/logs', {
        page: nextPage,
        pageSize,
        tipo,
        user_id: userId
      });
      logs = payload.items || [];
      total = Number(payload.total || 0);
      page = Number(payload.page || nextPage);
      pageSize = Number(payload.pageSize || pageSize);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar logs administrativos.');
    } finally {
      loading = false;
    }
  }

  function applyFilters() {
    void loadLogs(1);
  }

  function nextPage() {
    if (page * pageSize >= total) return;
    void loadLogs(page + 1);
  }

  function prevPage() {
    if (page <= 1) return;
    void loadLogs(page - 1);
  }

  onMount(() => loadLogs(1));
</script>

<svelte:head>
  <title>Logs administrativos | VTUR</title>
</svelte:head>

<PageHeader
  title="Logs administrativos"
  subtitle="Auditoria técnica e trilha de eventos do sistema."
  breadcrumbs={[
    { label: 'Admin', href: '/admin' },
    { label: 'Logs' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: () => loadLogs(page), variant: 'secondary', icon: RefreshCw }
  ]}
/>

<div class="space-y-6">
  <Card title="Filtros">
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
      <FieldInput
        id="log-modulo"
        label="Módulo"
        bind:value={tipo}
        placeholder="Ex.: admin, vendas, conciliacao"
      />
      <FieldInput
        id="log-user"
        label="ID do usuário"
        bind:value={userId}
        placeholder="UUID do usuário"
      />
      <Button variant="primary" color="financeiro" on:click={applyFilters}>
        <FileText size={16} class="mr-2" />
        Filtrar
      </Button>
    </div>
  </Card>

  {#if loading}
    <LoadingState />
  {:else}
    <SimpleTable
      title="Eventos"
      empty={logs.length === 0}
      emptyMessage="Nenhum log encontrado para os filtros atuais."
    >
      <thead>
        <tr>
          <th>Data</th>
          <th>Módulo</th>
          <th>Ação</th>
          <th>Usuário</th>
          <th>IP</th>
          <th>Detalhes</th>
        </tr>
      </thead>
      <tbody>
        {#each logs as log}
          <tr>
            <td class="whitespace-nowrap">{formatDateTime(log.created_at)}</td>
            <td>
              <Badge color="yellow" size="sm">{log.modulo || '-'}</Badge>
            </td>
            <td class="font-medium text-slate-900">{log.acao || '-'}</td>
            <td class="max-w-[240px] truncate">{userLabel(log)}</td>
            <td class="font-mono text-xs text-slate-500">{log.ip || '-'}</td>
            <td class="max-w-[420px] truncate text-xs text-slate-500">
              {formatDetails(log.detalhes)}
            </td>
          </tr>
        {/each}
      </tbody>
    </SimpleTable>

    <PaginationControls {page} {total} {pageSize} onPrev={prevPage} onNext={nextPage} />
  {/if}
</div>
