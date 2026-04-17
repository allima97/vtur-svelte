<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { Plus, RefreshCw } from 'lucide-svelte';

  type Empresa = {
    id: string;
    nome_empresa: string;
    nome_fantasia: string;
    cnpj: string;
    cidade: string;
    estado: string;
    active: boolean;
    billing?: {
      status?: string;
      valor_mensal?: number | null;
      plan?: { nome?: string | null } | null;
    } | null;
    master_links: number;
  };

  let loading = true;
  let rows: Empresa[] = [];

  function badge(label: string, tone: 'green' | 'yellow' | 'red' | 'gray') {
    const classes = {
      green: 'bg-emerald-100 text-emerald-700',
      yellow: 'bg-amber-100 text-amber-700',
      red: 'bg-rose-100 text-rose-700',
      gray: 'bg-slate-100 text-slate-700'
    };
    return `<span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ${classes[tone]}">${label}</span>`;
  }

  const columns = [
    {
      key: 'nome_fantasia',
      label: 'Empresa',
      sortable: true,
      formatter: (_value: unknown, row: Empresa) => `
        <div>
          <p class="font-medium text-slate-900">${row.nome_fantasia || row.nome_empresa}</p>
          <p class="text-xs text-slate-500">${row.cnpj || 'Sem CNPJ'}</p>
        </div>
      `
    },
    {
      key: 'local',
      label: 'Cidade',
      sortable: true,
      formatter: (_value: unknown, row: Empresa) => `${row.cidade || '-'}${row.estado ? ` / ${row.estado}` : ''}`
    },
    {
      key: 'billing',
      label: 'Billing',
      sortable: true,
      formatter: (_value: unknown, row: Empresa) => {
        const status = String(row.billing?.status || '').toLowerCase();
        if (!status) return badge('Sem billing', 'gray');
        if (status === 'active') return badge('Ativo', 'green');
        if (status === 'trial') return badge('Trial', 'yellow');
        if (status === 'past_due' || status === 'suspended') return badge(status, 'red');
        return badge(status, 'gray');
      }
    },
    {
      key: 'plan',
      label: 'Plano',
      sortable: true,
      formatter: (_value: unknown, row: Empresa) => row.billing?.plan?.nome || '-'
    },
    {
      key: 'master_links',
      label: 'Masters',
      sortable: true
    }
  ];

  async function loadPage() {
    loading = true;
    try {
      const response = await fetch('/api/v1/admin/empresas');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      rows = payload.items || [];
    } catch (err) {
      console.error(err);
      toast.error('Nao foi possivel carregar as empresas.');
    } finally {
      loading = false;
    }
  }

  $: stats = {
    total: rows.length,
    ativas: rows.filter((row) => row.active).length,
    billingAtivo: rows.filter((row) => String(row.billing?.status || '').toLowerCase() === 'active').length,
    masters: rows.reduce((sum, row) => sum + Number(row.master_links || 0), 0)
  };

  onMount(loadPage);
</script>

<svelte:head>
  <title>Empresas | VTUR</title>
</svelte:head>

<PageHeader
  title="Empresas"
  subtitle="Cadastro corporativo, billing e escopo master por empresa."
  breadcrumbs={[
    { label: 'Administracao', href: '/admin' },
    { label: 'Empresas' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: loadPage, variant: 'secondary', icon: RefreshCw },
    { label: 'Nova empresa', href: '/admin/empresas/nova', variant: 'primary', icon: Plus }
  ]}
/>

<div class="space-y-6">
  <div class="grid gap-4 md:grid-cols-4">
    <Card color="financeiro">
      <p class="text-sm text-slate-500">Total</p>
      <p class="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
    </Card>
    <Card color="financeiro">
      <p class="text-sm text-slate-500">Ativas</p>
      <p class="mt-2 text-3xl font-semibold text-emerald-600">{stats.ativas}</p>
    </Card>
    <Card color="financeiro">
      <p class="text-sm text-slate-500">Billing ativo</p>
      <p class="mt-2 text-3xl font-semibold text-slate-900">{stats.billingAtivo}</p>
    </Card>
    <Card color="financeiro">
      <p class="text-sm text-slate-500">Vinculos master</p>
      <p class="mt-2 text-3xl font-semibold text-slate-900">{stats.masters}</p>
    </Card>
  </div>

  <DataTable
    title="Empresas administradas"
    color="financeiro"
    {loading}
    {columns}
    data={rows}
    emptyMessage="Nenhuma empresa encontrada."
    onRowClick={(row: Empresa) => goto(`/admin/empresas/${row.id}`)}
  />
</div>
