<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { toast } from '$lib/stores/ui';
  import { RefreshCw, DollarSign, Building2 } from 'lucide-svelte';

  type BillingRow = {
    id: string;
    company_id: string;
    company_nome: string;
    plan_nome: string | null;
    status: string;
    valor_mensal: number | null;
    ultimo_pagamento: string | null;
    proximo_vencimento: string | null;
  };

  const STATUS_LABELS: Record<string, string> = {
    active: 'Ativa', trial: 'Trial', past_due: 'Atrasada',
    suspended: 'Suspensa', canceled: 'Cancelada'
  };

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-700', trial: 'bg-blue-100 text-blue-700',
    past_due: 'bg-amber-100 text-amber-700', suspended: 'bg-orange-100 text-orange-700',
    canceled: 'bg-red-100 text-red-700'
  };

  let billings: BillingRow[] = [];
  let loading = true;
  let modalOpen = false;
  let saving = false;
  let selectedBilling: BillingRow | null = null;

  let form = { status: 'active', valor_mensal: '', ultimo_pagamento: '', proximo_vencimento: '' };

  const columns = [
    { key: 'company_nome', label: 'Empresa', sortable: true },
    { key: 'plan_nome', label: 'Plano', sortable: true, formatter: (v: string | null) => v || '-' },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '120px',
      formatter: (v: string) => `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[v] || 'bg-slate-100 text-slate-600'}">${STATUS_LABELS[v] || v}</span>`
    },
    {
      key: 'valor_mensal',
      label: 'Mensalidade',
      sortable: true,
      align: 'right' as const,
      formatter: (v: number | null) => v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '-'
    },
    {
      key: 'proximo_vencimento',
      label: 'Próx. Vencimento',
      sortable: true,
      width: '140px',
      formatter: (v: string | null) => {
        if (!v) return '-';
        const d = new Date(v + 'T00:00:00');
        const hoje = new Date();
        const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const label = d.toLocaleDateString('pt-BR');
        if (diff < 0) return `<span class="text-red-600 font-medium">${label}</span>`;
        if (diff <= 7) return `<span class="text-amber-600 font-medium">${label}</span>`;
        return label;
      }
    }
  ];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/admin/empresas');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      billings = (payload.items || []).map((item: any) => ({
        id: item.id,
        company_id: item.id,
        company_nome: item.nome_fantasia || item.nome_empresa || 'Empresa',
        plan_nome: item.billing?.plan?.nome || null,
        status: item.billing?.status || 'trial',
        valor_mensal: item.billing?.valor_mensal || null,
        ultimo_pagamento: item.billing?.ultimo_pagamento || null,
        proximo_vencimento: item.billing?.proximo_vencimento || null
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar dados financeiros.');
    } finally {
      loading = false;
    }
  }

  function openEdit(row: BillingRow) {
    selectedBilling = row;
    form = {
      status: row.status,
      valor_mensal: row.valor_mensal != null ? String(row.valor_mensal) : '',
      ultimo_pagamento: row.ultimo_pagamento || '',
      proximo_vencimento: row.proximo_vencimento || ''
    };
    modalOpen = true;
  }

  async function save() {
    if (!selectedBilling) return;
    saving = true;
    try {
      const response = await fetch('/api/v1/admin/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedBilling.company_id,
          billing_status: form.status,
          billing_valor_mensal: form.valor_mensal ? Number(form.valor_mensal) : null,
          billing_ultimo_pagamento: form.ultimo_pagamento || null,
          billing_proximo_vencimento: form.proximo_vencimento || null
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Billing atualizado.');
      modalOpen = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  onMount(load);

  $: ativas = billings.filter((b) => b.status === 'active').length;
  $: atrasadas = billings.filter((b) => b.status === 'past_due').length;
  $: totalMrr = billings.filter((b) => b.status === 'active').reduce((acc, b) => acc + (b.valor_mensal || 0), 0);
</script>

<svelte:head>
  <title>Financeiro Admin | VTUR</title>
</svelte:head>

<PageHeader
  title="Financeiro Admin"
  subtitle="Gerencie o billing e status de assinatura das empresas."
  breadcrumbs={[
    { label: 'Admin', href: '/admin' },
    { label: 'Financeiro' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><Building2 size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Empresas ativas</p>
      <p class="text-2xl font-bold text-slate-900">{ativas}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><Building2 size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Atrasadas</p>
      <p class="text-2xl font-bold text-slate-900">{atrasadas}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><DollarSign size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">MRR (ativas)</p>
      <p class="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMrr)}</p>
    </div>
  </div>
</div>

<DataTable
  {columns}
  data={billings}
  color="financeiro"
  {loading}
  title="Billing por empresa"
  searchable={true}
  emptyMessage="Nenhuma empresa encontrada"
  onRowClick={(row) => openEdit(row)}
/>

<Dialog
  bind:open={modalOpen}
  title={selectedBilling ? `Billing — ${selectedBilling.company_nome}` : 'Billing'}
  color="financeiro"
  size="md"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText="Salvar"
  loading={saving}
  onConfirm={save}
  onCancel={() => (modalOpen = false)}
>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="bill-status">Status</label>
      <select id="bill-status" bind:value={form.status} class="vtur-input w-full">
        {#each Object.entries(STATUS_LABELS) as [key, label]}
          <option value={key}>{label}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="bill-valor">Mensalidade (R$)</label>
      <input id="bill-valor" type="number" step="0.01" bind:value={form.valor_mensal} class="vtur-input w-full" placeholder="0,00" />
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="bill-ultimo">Último pagamento</label>
        <input id="bill-ultimo" type="date" bind:value={form.ultimo_pagamento} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="bill-proximo">Próx. vencimento</label>
        <input id="bill-proximo" type="date" bind:value={form.proximo_vencimento} class="vtur-input w-full" />
      </div>
    </div>
  </div>
</Dialog>
