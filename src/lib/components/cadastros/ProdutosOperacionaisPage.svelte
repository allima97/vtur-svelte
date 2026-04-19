<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { Package, MapPin, Globe2, Hotel, Plus } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  export let mode: 'produtos' | 'destinos' = 'produtos';

  type Produto = {
    id: string;
    nome: string;
    destino?: string | null;
    cidade_id?: string | null;
    tipo_produto?: string | null;
    ativo?: boolean | null;
    fornecedor_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    todas_as_cidades?: boolean | null;
  };

  type Option = {
    id: string;
    nome?: string | null;
    tipo?: string | null;
    nome_fantasia?: string | null;
    nome_completo?: string | null;
    subdivisao?: { nome?: string | null; sigla?: string | null } | null;
    subdivisao_nome?: string | null;
    estado?: string | null;
    uf?: string | null;
    pais?: string | null;
  };

  let loading = true;
  let produtos: Produto[] = [];
  let tipos: Option[] = [];
  let cidades: Option[] = [];
  let fornecedores: Option[] = [];
  let search = '';
  let filtroTipo = '';
  let filtroStatus = '';
  let filtroAbrangencia = '';

  async function loadBase() {
    loading = true;
    try {
      const response = await fetch('/api/v1/produtos/base?all=1&page=1&pageSize=500');
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      produtos = data.produtos || [];
      tipos = data.tipos || [];
      cidades = data.cidades || [];
      fornecedores = data.fornecedores || [];
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar base de produtos.');
    } finally {
      loading = false;
    }
  }

  onMount(loadBase);

  function formatCidade(cidadeId?: string | null) {
    if (!cidadeId) return '-';
    const cidade = cidades.find((item) => item.id === cidadeId);
    if (!cidade) return '-';
    const estado =
      cidade.estado ||
      cidade.uf ||
      cidade.subdivisao_nome ||
      cidade.subdivisao?.sigla ||
      cidade.subdivisao?.nome ||
      '';
    return estado ? `${cidade.nome} (${estado})` : cidade.nome || '-';
  }

  function formatTipo(tipoId?: string | null) {
    const tipo = tipos.find((item) => item.id === tipoId);
    return tipo?.nome || tipo?.tipo || '-';
  }

  function formatFornecedor(fornecedorId?: string | null) {
    const fornecedor = fornecedores.find((item) => item.id === fornecedorId);
    return fornecedor?.nome_fantasia || fornecedor?.nome_completo || '-';
  }

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
  }

  function statusBadge(value?: boolean | null) {
    return value !== false
      ? '<span class="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Ativo</span>'
      : '<span class="inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600">Inativo</span>';
  }

  function abrangenciaBadge(row: Produto) {
    return row.todas_as_cidades
      ? '<span class="inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700">Global</span>'
      : '<span class="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">Por cidade</span>';
  }

  $: rows = produtos.map((produto) => ({
    ...produto,
    tipo_nome: formatTipo(produto.tipo_produto),
    cidade_nome: formatCidade(produto.cidade_id),
    fornecedor_nome: formatFornecedor(produto.fornecedor_id)
  }));

  $: filteredRows = rows.filter((produto) => {
    const term = search.trim().toLowerCase();
    if (term) {
      const haystack = [
        produto.nome,
        produto.destino,
        produto.tipo_nome,
        produto.cidade_nome,
        produto.fornecedor_nome
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    if (filtroTipo && produto.tipo_produto !== filtroTipo) return false;
    if (filtroStatus === 'ativo' && produto.ativo === false) return false;
    if (filtroStatus === 'inativo' && produto.ativo !== false) return false;
    if (filtroAbrangencia === 'global' && produto.todas_as_cidades !== true) return false;
    if (filtroAbrangencia === 'cidade' && produto.todas_as_cidades === true) return false;
    return true;
  });

  $: stats = {
    total: produtos.length,
    ativos: produtos.filter((item) => item.ativo !== false).length,
    globais: produtos.filter((item) => item.todas_as_cidades === true).length,
    hospedagem: produtos.filter((item) => {
      const tipo = formatTipo(item.tipo_produto).toLowerCase();
      return ['hotel', 'pousada', 'resort', 'flat'].some((keyword) => tipo.includes(keyword));
    }).length
  };

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'tipo_nome', label: 'Tipo', sortable: true, width: '180px' },
    { key: 'destino', label: 'Destino', sortable: true, width: '180px' },
    { key: 'cidade_nome', label: 'Cidade', sortable: true, width: '180px' },
    { key: 'fornecedor_nome', label: 'Fornecedor', sortable: true, width: '180px' },
    { key: 'todas_as_cidades', label: 'Abrangência', sortable: true, width: '120px', formatter: (_value: any, row: Produto) => abrangenciaBadge(row) },
    { key: 'ativo', label: 'Status', sortable: true, width: '110px', formatter: (value: boolean) => statusBadge(value) },
    { key: 'updated_at', label: 'Atualizado', sortable: true, width: '120px', formatter: (value: string) => formatDate(value) }
  ];

  $: routeBase = mode === 'destinos' ? '/cadastros/destinos' : '/cadastros/produtos';
  $: title = mode === 'destinos' ? 'Destinos' : 'Produtos';
  $: subtitle =
    mode === 'destinos'
      ? 'Base operacional compartilhada com produtos, vendas e orçamentos'
      : 'Base operacional de produtos, destinos e atributos consumidos pela operação';
</script>

<svelte:head>
  <title>{title} | VTUR</title>
</svelte:head>

<PageHeader
  title={title}
  subtitle={subtitle}
  color="financeiro"
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: title }
  ]}
  actions={[
    { label: mode === 'destinos' ? 'Novo destino' : 'Novo produto', onClick: () => goto(`${routeBase}/novo`), variant: 'primary', icon: Plus }
  ]}
/>

<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Package size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Total</p><p class="text-2xl font-bold text-slate-900">{stats.total}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><MapPin size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Ativos</p><p class="text-2xl font-bold text-slate-900">{stats.ativos}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Globe2 size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Globais</p><p class="text-2xl font-bold text-slate-900">{stats.globais}</p></div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-violet-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500"><Hotel size={20} /></div>
    <div><p class="text-sm font-medium text-slate-500">Hospedagem</p><p class="text-2xl font-bold text-slate-900">{stats.hospedagem}</p></div>
  </div>
</div>

<Card color="financeiro" class="mb-6">
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
    <div>
      <label for="produtos-busca" class="mb-1 block text-sm font-medium text-slate-700">Buscar</label>
      <input id="produtos-busca" bind:value={search} class="vtur-input w-full" placeholder="Nome, destino, tipo, cidade..." />
    </div>
    <div>
      <label for="produtos-tipo" class="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
      <select id="produtos-tipo" bind:value={filtroTipo} class="vtur-input w-full">
        <option value="">Todos</option>
        {#each tipos as tipo}
          <option value={tipo.id}>{tipo.nome || tipo.tipo}</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="produtos-status" class="mb-1 block text-sm font-medium text-slate-700">Status</label>
      <select id="produtos-status" bind:value={filtroStatus} class="vtur-input w-full">
        <option value="">Todos</option>
        <option value="ativo">Ativo</option>
        <option value="inativo">Inativo</option>
      </select>
    </div>
    <div>
      <label for="produtos-abrangencia" class="mb-1 block text-sm font-medium text-slate-700">Abrangência</label>
      <select id="produtos-abrangencia" bind:value={filtroAbrangencia} class="vtur-input w-full">
        <option value="">Todas</option>
        <option value="global">Global</option>
        <option value="cidade">Por cidade</option>
      </select>
    </div>
  </div>
</Card>

<DataTable
  {columns}
  data={filteredRows}
  color="financeiro"
  {loading}
  title={`Base de ${title.toLowerCase()}`}
  searchable={false}
  filterable={false}
  exportable={false}
  onRowClick={(row) => goto(`${routeBase}/${row.id}/editar`)}
  emptyMessage={`Nenhum ${mode === 'destinos' ? 'destino' : 'produto'} encontrado.`}
/>
