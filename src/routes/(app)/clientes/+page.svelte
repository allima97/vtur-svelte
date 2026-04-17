<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { CalendarDays, Plus, Users, Wallet, ShoppingBag } from 'lucide-svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { toast } from '$lib/stores/ui';

  type Cliente = {
    id: string;
    nome: string;
    cpf: string | null;
    documento: string;
    email: string | null;
    telefone: string | null;
    whatsapp: string | null;
    contato: string;
    data_nascimento: string | null;
    cidade: string | null;
    estado: string | null;
    cidade_uf: string;
    classificacao: string | null;
    tipo_pessoa: string;
    tipo_cliente: string;
    tags: string[];
    tags_text: string;
    status: 'ativo' | 'inativo' | 'prospect';
    ultima_compra: string | null;
    total_gasto: number;
    total_viagens: number;
    total_orcamentos: number;
    aniversario_hoje: boolean;
    ativo: boolean;
    created_at: string | null;
  };

  let clientes: Cliente[] = [];
  let loading = true;
  let errorMessage: string | null = null;

  const columns = [
    {
      key: 'nome',
      label: 'Cliente',
      sortable: true,
      formatter: (_value: string, row: Cliente) => {
        const aniversario = row.aniversario_hoje
          ? '<span class="ml-2 rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-700">Aniversario</span>'
          : '';
        const tags = row.tags.length
          ? `<div class="mt-1 text-xs text-slate-500">${row.tags.join(', ')}</div>`
          : '';
        return `<div><div class="font-semibold text-slate-900">${row.nome}${aniversario}</div><div class="text-xs text-slate-500">${row.email || 'Sem e-mail'}</div>${tags}</div>`;
      }
    },
    {
      key: 'documento',
      label: 'CPF/CNPJ',
      sortable: true
    },
    {
      key: 'contato',
      label: 'Contato',
      sortable: true,
      formatter: (_value: string, row: Cliente) =>
        `<div><div>${row.whatsapp || row.telefone || '-'}</div><div class="text-xs text-slate-500">${row.email || 'Sem e-mail'}</div></div>`
    },
    {
      key: 'cidade_uf',
      label: 'Cidade/UF',
      sortable: true,
      formatter: (value: string) => value || '-'
    },
    {
      key: 'tipo_pessoa',
      label: 'Tipo',
      sortable: true,
      formatter: (value: string, row: Cliente) =>
        `${value === 'PJ' ? 'PJ' : 'PF'} · ${row.tipo_cliente || 'passageiro'}`
    },
    {
      key: 'classificacao',
      label: 'Classificacao',
      sortable: true,
      formatter: (value: string | null) => value || '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      formatter: (value: string, row: Cliente) => {
        const styles = {
          ativo: 'bg-green-100 text-green-700',
          inativo: 'bg-red-100 text-red-700',
          prospect: 'bg-blue-100 text-blue-700'
        };
        const labels = {
          ativo: 'Ativo',
          inativo: 'Inativo',
          prospect: 'Prospect'
        };
        const extra = row.total_viagens > 0 ? ` · ${row.total_viagens} viagens` : '';
        return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value as keyof typeof styles]}">${labels[value as keyof typeof labels]}${extra}</span>`;
      }
    },
    {
      key: 'total_gasto',
      label: 'Total Gasto',
      sortable: true,
      align: 'right' as const,
      formatter: (value: number) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value || 0)
    },
    {
      key: 'ultima_compra',
      label: 'Ultima Compra',
      sortable: true,
      formatter: (value: string | null, row: Cliente) =>
        value
          ? `${new Date(value).toLocaleDateString('pt-BR')} · ${row.total_orcamentos} orc.`
          : row.total_orcamentos > 0
            ? `Sem venda · ${row.total_orcamentos} orc.`
            : '-'
    }
  ];

  $: statusAtivos = clientes.filter((item) => item.status === 'ativo').length;
  $: aniversariantesHoje = clientes.filter((item) => item.aniversario_hoje).length;
  $: totalCarteira = clientes.reduce((acc, item) => acc + Number(item.total_gasto || 0), 0);
  $: clientesComViagem = clientes.filter((item) => item.total_viagens > 0).length;

  $: filters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
        { value: 'prospect', label: 'Prospect' }
      ]
    },
    {
      key: 'estado',
      label: 'Estado',
      type: 'select' as const,
      options: Array.from(
        new Set(
          clientes
            .map((cliente) => String(cliente.estado || '').trim())
            .filter(Boolean)
        )
      )
        .sort((left, right) => left.localeCompare(right, 'pt-BR'))
        .map((uf) => ({ value: uf, label: uf }))
    },
    {
      key: 'tipo_pessoa',
      label: 'Tipo de Pessoa',
      type: 'select' as const,
      options: [
        { value: 'PF', label: 'Pessoa Fisica' },
        { value: 'PJ', label: 'Pessoa Juridica' }
      ]
    },
    {
      key: 'classificacao',
      label: 'Classificacao',
      type: 'select' as const,
      options: ['A', 'B', 'C', 'D', 'E'].map((item) => ({ value: item, label: item }))
    },
    {
      key: 'aniversario_hoje',
      label: 'Aniversariante Hoje',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Sim' },
        { value: 'false', label: 'Nao' }
      ]
    }
  ];

  async function loadClientes() {
    loading = true;
    errorMessage = null;

    try {
      const response = await fetch('/api/v1/clientes/list?all=1');
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = await response.json();
      clientes = Array.isArray(payload?.items) ? payload.items : [];
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Erro ao carregar clientes.';
      clientes = [];
      toast.error(errorMessage);
    } finally {
      loading = false;
    }
  }

  function handleRowClick(row: Cliente) {
    goto(`/clientes/${row.id}`);
  }

  function handleExport() {
    toast.info('Exportacao ainda pendente. A listagem real de clientes ja esta conectada.');
  }

  onMount(() => {
    void loadClientes();
  });
</script>

<svelte:head>
  <title>Clientes | VTUR</title>
</svelte:head>

<PageHeader
  title="Clientes"
  subtitle="Carteira de clientes com contato, historico comercial e relacionamento com vendas e orcamentos."
  breadcrumbs={[{ label: 'Clientes' }]}
  actions={[
    {
      label: 'Novo Cliente',
      href: '/clientes/novo',
      variant: 'primary',
      icon: Plus
    }
  ]}
/>

{#if errorMessage}
  <div class="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {errorMessage}
  </div>
{/if}

<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <KPICard title="Clientes na carteira" value={clientes.length} color="clientes" icon={Users} />
  <KPICard title="Relacionamento ativo" value={statusAtivos} color="clientes" icon={ShoppingBag} />
  <KPICard title="Aniversariantes hoje" value={aniversariantesHoje} color="clientes" icon={CalendarDays} />
  <KPICard
    title="Total gasto consolidado"
    value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCarteira)}
    color="clientes"
    icon={Wallet}
  />
</div>

<div class="mb-6 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_14px_34px_rgba(9,17,46,0.06)]">
  <strong class="text-slate-900">{clientesComViagem}</strong> clientes com historico de viagens e{' '}
  <strong class="text-slate-900">{clientes.length - clientesComViagem}</strong> ainda em fase de prospeccao ou sem venda concluida.
</div>

<DataTable
  {columns}
  data={clientes}
  color="clientes"
  {loading}
  title="Carteira de Clientes"
  {filters}
  searchable={true}
  filterable={true}
  exportable={true}
  onRowClick={handleRowClick}
  onExport={handleExport}
  emptyMessage="Nenhum cliente encontrado para o escopo atual"
/>
