<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { Building2, MapPin, Phone, Wallet, Plus } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  type Fornecedor = {
    id: string;
    nome_completo?: string | null;
    nome_fantasia?: string | null;
    localizacao?: string | null;
    cidade?: string | null;
    estado?: string | null;
    telefone?: string | null;
    whatsapp?: string | null;
    telefone_emergencia?: string | null;
    responsavel?: string | null;
    tipo_faturamento?: string | null;
    principais_servicos?: string | null;
    ativo?: boolean | null;
    produtos_vinculados?: number;
  };

  let loading = true;
  let fornecedores: Fornecedor[] = [];
  let busca = '';
  let filtroStatus = '';
  let filtroLocalizacao = '';
  let filtroFaturamento = '';

  async function loadFornecedores() {
    loading = true;
    try {
      const response = await fetch('/api/v1/fornecedores');
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      fornecedores = data.items || [];
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar fornecedores.');
    } finally {
      loading = false;
    }
  }

  onMount(loadFornecedores);

  function normalize(value?: string | null) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function formatLocalizacao(value?: string | null) {
    return value === 'exterior' ? 'Exterior' : 'Brasil';
  }

  function formatFaturamento(value?: string | null) {
    switch (String(value || '')) {
      case 'pre_pago':
        return 'Pré-pago';
      case 'semanal':
        return 'Semanal';
      case 'quinzenal':
        return 'Quinzenal';
      case 'mensal':
        return 'Mensal';
      default:
        return value || '-';
    }
  }

  function statusBadge(value?: boolean | null) {
    return value !== false
      ? '<span class="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Ativo</span>'
      : '<span class="inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600">Inativo</span>';
  }

  $: rows = fornecedores.map((item) => ({
    ...item,
    parceiro_nome: item.nome_fantasia || item.nome_completo || '-',
    local_label: `${formatLocalizacao(item.localizacao)}${item.cidade ? ` - ${item.cidade}` : ''}${item.estado ? `/${item.estado}` : ''}`,
    faturamento_label: formatFaturamento(item.tipo_faturamento),
    contato_label: item.responsavel || '-',
    servicos_label: item.principais_servicos && item.principais_servicos.length > 80 ? `${item.principais_servicos.slice(0, 80)}...` : item.principais_servicos || '-'
  }));

  $: filteredRows = rows.filter((item) => {
    const termo = normalize(busca);
    if (termo) {
      const haystack = normalize([
        item.parceiro_nome,
        item.nome_completo,
        item.responsavel,
        item.telefone,
        item.whatsapp,
        item.local_label,
        item.servicos_label
      ].join(' '));
      if (!haystack.includes(termo)) return false;
    }
    if (filtroStatus === 'ativo' && item.ativo === false) return false;
    if (filtroStatus === 'inativo' && item.ativo !== false) return false;
    if (filtroLocalizacao && item.localizacao !== filtroLocalizacao) return false;
    if (filtroFaturamento && item.tipo_faturamento !== filtroFaturamento) return false;
    return true;
  });

  $: stats = {
    total: fornecedores.length,
    ativos: fornecedores.filter((item) => item.ativo !== false).length,
    exterior: fornecedores.filter((item) => item.localizacao === 'exterior').length,
    vinculados: fornecedores.filter((item) => (item.produtos_vinculados || 0) > 0).length
  };

  const columns = [
    { key: 'parceiro_nome', label: 'Nome fantasia', sortable: true },
    { key: 'local_label', label: 'Local', sortable: true, width: '220px' },
    { key: 'faturamento_label', label: 'Faturamento', sortable: true, width: '140px' },
    { key: 'telefone', label: 'Telefone', sortable: true, width: '150px' },
    { key: 'whatsapp', label: 'WhatsApp', sortable: true, width: '150px' },
    { key: 'telefone_emergencia', label: 'Emergência', sortable: true, width: '150px' },
    { key: 'servicos_label', label: 'Serviços', sortable: false },
    { key: 'ativo', label: 'Status', sortable: true, width: '110px', formatter: (value: boolean) => statusBadge(value) }
  ];
</script>

<svelte:head>
  <title>Fornecedores | VTUR</title>
</svelte:head>

<PageHeader
  title="Fornecedores"
  subtitle="Cadastros de apoio operacional usados por produtos, operação e fluxo comercial"
  color="financeiro"
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: 'Fornecedores' }
  ]}
  actions={[
    { label: 'Novo fornecedor', onClick: () => goto('/cadastros/fornecedores/novo'), variant: 'primary', icon: Plus }
  ]}
/>

<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Building2 size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Total</p><p class="text-2xl font-bold text-slate-900">{stats.total}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><Phone size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Ativos</p><p class="text-2xl font-bold text-slate-900">{stats.ativos}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><MapPin size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Exterior</p><p class="text-2xl font-bold text-slate-900">{stats.exterior}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-violet-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500"><Wallet size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Com produtos</p><p class="text-2xl font-bold text-slate-900">{stats.vinculados}</p></div>
  </div>
</div>

<Card color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
    <div>
      <label for="forn-busca" class="mb-1 block text-sm font-medium text-slate-700">Buscar</label>
      <input id="forn-busca" bind:value={busca} class="vtur-input w-full" placeholder="Fantasia, razão social, responsável..." />
    </div>
    <div>
      <label for="forn-status" class="mb-1 block text-sm font-medium text-slate-700">Status</label>
      <select id="forn-status" bind:value={filtroStatus} class="vtur-input w-full">
        <option value="">Todos</option>
        <option value="ativo">Ativo</option>
        <option value="inativo">Inativo</option>
      </select>
    </div>
    <div>
      <label for="forn-local" class="mb-1 block text-sm font-medium text-slate-700">Localização</label>
      <select id="forn-local" bind:value={filtroLocalizacao} class="vtur-input w-full">
        <option value="">Todas</option>
        <option value="brasil">Brasil</option>
        <option value="exterior">Exterior</option>
      </select>
    </div>
    <div>
      <label for="forn-fat" class="mb-1 block text-sm font-medium text-slate-700">Faturamento</label>
      <select id="forn-fat" bind:value={filtroFaturamento} class="vtur-input w-full">
        <option value="">Todos</option>
        <option value="pre_pago">Pré-pago</option>
        <option value="semanal">Semanal</option>
        <option value="quinzenal">Quinzenal</option>
        <option value="mensal">Mensal</option>
      </select>
    </div>
  </div>
</Card>

<DataTable
  {columns}
  data={filteredRows}
  color="financeiro"
  {loading}
  title="Base de fornecedores"
  searchable={false}
  filterable={false}
  exportable={false}
  onRowClick={(row) => goto(`/cadastros/fornecedores/${row.id}/editar`)}
  emptyMessage="Nenhum fornecedor encontrado."
/>
