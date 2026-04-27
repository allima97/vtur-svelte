<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { toast } from '$lib/stores/ui';
  import { Calculator, DollarSign, RefreshCw, TrendingUp, Users } from 'lucide-svelte';

  // ─── Tipos ──────────────────────────────────────────────────────────────────
  interface ComissaoItem {
    id: string;
    venda_id: string;
    numero_venda: string;
    vendedor_id: string;
    vendedor: string;
    cliente: string;
    data_venda: string;
    valor_venda: number;
    valor_comissionavel: number;
    percentual_aplicado: number;
    valor_comissao: number;
    status: string;
    mes_referencia: number;
    ano_referencia: number;
  }

  interface VendedorOption {
    id: string;
    nome_completo?: string;
    email?: string;
  }

  // ─── Estado ─────────────────────────────────────────────────────────────────
  let comissoes: ComissaoItem[] = [];
  let vendedores: VendedorOption[] = [];
  let loading = true;

  let filtroMes    = new Date().getMonth() + 1;
  let filtroAno    = new Date().getFullYear();
  let filtroVendedor = '';
  let filtroStatus = 'todas';

  let abortController: AbortController | null = null;

  // ─── KPIs derivados ───────────────────────────────────────────────────────
  $: totalComissoes    = comissoes.reduce((acc, c) => acc + c.valor_comissao, 0);
  $: totalVendas       = comissoes.reduce((acc, c) => acc + c.valor_venda, 0);
  $: pendentes         = comissoes.filter((c) => c.status === 'PENDENTE' || c.status === 'pendente').length;
  $: vendedoresUnicos  = new Set(comissoes.map((c) => c.vendedor_id)).size;

  // ─── Colunas da tabela ──────────────────────────────────────────────────────
  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  const columns = [
    { key: 'numero_venda', label: 'Venda',    sortable: true, width: '120px' },
    { key: 'vendedor',     label: 'Vendedor', sortable: true },
    { key: 'cliente',      label: 'Cliente',  sortable: true },
    {
      key: 'data_venda', label: 'Data', sortable: true, width: '110px',
      formatter: (v: string) => v ? new Date(v).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'valor_venda', label: 'Valor Venda', sortable: true, align: 'right' as const,
      formatter: (v: number) => formatCurrency(v)
    },
    {
      key: 'percentual_aplicado', label: '%', sortable: true, width: '70px', align: 'center' as const,
      formatter: (v: number) => `${v ?? 10}%`
    },
    {
      key: 'valor_comissao', label: 'Comissão', sortable: true, align: 'right' as const,
      formatter: (v: number) => formatCurrency(v)
    },
    {
      key: 'status', label: 'Status', sortable: true, width: '110px',
      formatter: (v: string) => {
        const norm = v?.toLowerCase();
        const styles: Record<string, string> = {
          pendente: 'bg-amber-100 text-amber-700',
          pago:     'bg-green-100 text-green-700',
          cancelada:'bg-red-100 text-red-700'
        };
        const labels: Record<string, string> = {
          pendente: 'Pendente', pago: 'Pago', cancelada: 'Cancelada'
        };
        return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
          styles[norm] ?? 'bg-slate-100 text-slate-600'
        }">${labels[norm] ?? v}</span>`;
      }
    }
  ];

  // ─── Fetch com AbortController ────────────────────────────────────────────────
  async function load() {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    loading = true;
    try {
      const params = new URLSearchParams();
      if (filtroStatus !== 'todas') params.set('status', filtroStatus);
      params.set('mes', String(filtroMes));
      params.set('ano', String(filtroAno));
      if (filtroVendedor) params.set('vendedor_id', filtroVendedor);

      const response = await fetch(
        `/api/v1/financeiro/comissoes/calcular?${params.toString()}`,
        { signal: abortController.signal }
      );
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      comissoes = data.items ?? [];
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar comissões.');
    } finally {
      loading = false;
    }
  }

  async function loadVendedores() {
    try {
      const response = await fetch('/api/v1/financeiro/comissoes/vendedores');
      if (!response.ok) return;
      const data = await response.json();
      vendedores = Array.isArray(data.items) ? data.items : [];
    } catch { /* silencioso */ }
  }

  function handleExport() {
    if (comissoes.length === 0) { toast.info('Nenhuma comissão para exportar.'); return; }
    const headers = ['Venda', 'Vendedor', 'Cliente', 'Data', 'Valor Venda', '%', 'Comissão', 'Status'];
    const rows = comissoes.map((c) => [
      c.numero_venda, c.vendedor, c.cliente,
      c.data_venda ? new Date(c.data_venda).toLocaleDateString('pt-BR') : '',
      c.valor_venda.toFixed(2),
      c.percentual_aplicado ?? 10,
      c.valor_comissao.toFixed(2),
      c.status
    ]);
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fechamento_comissoes_${filtroMes}_${filtroAno}.csv`;
    link.click();
    toast.success('Exportado com sucesso.');
  }

  onMount(async () => {
    await Promise.all([load(), loadVendedores()]);
  });

  onDestroy(() => { if (abortController) abortController.abort(); });

  function buildMonthOptions() {
    return Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' })
    }));
  }

  const statusOptions = [
    { value: 'todas', label: 'Todas' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'pago', label: 'Pagas' },
    { value: 'cancelada', label: 'Canceladas' }
  ];

  $: vendedorOptions = [
    { value: '', label: 'Todos' },
    ...vendedores.map((v) => ({
      value: v.id,
      label: v.nome_completo || v.email || v.id
    }))
  ];
</script>

<svelte:head>
  <title>Fechamento de Comissões | VTUR</title>
</svelte:head>

<PageHeader
  title="Fechamento de Comissões"
  subtitle="Visualize e exporte o fechamento de comissões por período e vendedor."
  color="comissoes"
  breadcrumbs={[
    { label: 'Comissões', href: '/comissoes' },
    { label: 'Fechamento' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<!-- KPIs -->
<div class="vtur-kpi-grid mb-6">
  <KPICard title="Total comissões" value={formatCurrency(totalComissoes)} color="comissoes" icon={DollarSign}  />
  <KPICard title="Total vendas"    value={formatCurrency(totalVendas)}    color="comissoes" icon={TrendingUp}  />
  <KPICard title="Pendentes"       value={pendentes}                       color="comissoes" icon={Calculator}  />
  <KPICard title="Vendedores"      value={vendedoresUnicos}                color="comissoes" icon={Users}       />
</div>

<!-- Filtros -->
<Card color="comissoes" class="mb-6">
  <div class="flex flex-wrap gap-4 items-end">
    <FieldSelect
      id="fech-mes"
      label="Mês"
      bind:value={filtroMes as any}
      options={buildMonthOptions()}
      placeholder={null}
    />
    <FieldInput
      id="fech-ano"
      label="Ano"
      type="number"
      bind:value={filtroAno}
      min="2020"
      max="2100"
      class_name="w-24"
    />
    <FieldSelect
      id="fech-status"
      label="Status"
      bind:value={filtroStatus}
      options={statusOptions}
      placeholder={null}
    />
    <FieldSelect
      id="fech-vendedor"
      label="Vendedor"
      bind:value={filtroVendedor}
      options={vendedorOptions}
      placeholder={null}
    />
    <Button variant="secondary" color="comissoes" on:click={load}>Filtrar</Button>
    <Button variant="secondary" on:click={handleExport}>Exportar CSV</Button>
  </div>
</Card>

<!-- Tabela -->
<DataTable
  {columns}
  data={comissoes}
  color="comissoes"
  {loading}
  title={`Fechamento ${filtroMes}/${filtroAno} — ${comissoes.length} registros`}
  searchable={true}
  exportable={true}
  onExport={handleExport}
  emptyMessage="Nenhuma comissão encontrada para o período"
/>
