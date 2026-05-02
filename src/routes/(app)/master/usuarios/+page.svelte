<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldSelect } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { Plus, RefreshCw, Users, UserCheck, UserX, UserCog } from 'lucide-svelte';

  type Usuario = {
    id: string;
    nome: string;
    email: string | null;
    telefone?: string | null;
    cidade?: string | null;
    estado?: string | null;
    tipo: string;
    tipo_id?: string | null;
    empresa: string;
    empresa_id?: string | null;
    ativo: boolean;
    uso_individual: boolean;
    created_by_gestor: boolean;
    participa_ranking: boolean;
    created_at?: string | null;
    updated_at?: string | null;
  };

  let loading = true;
  let usuarios: Usuario[] = [];
  let filtroTipo = '';
  let filtroStatus = '';
  let filtroEmpresa = '';
  let filtroEscopo = '';

  function formatDateTime(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  function userCell(row: Usuario) {
    const initials = row.nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');

    return `
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">
          ${initials || 'U'}
        </div>
        <div class="min-w-0">
          <p class="truncate font-medium text-slate-900">${row.nome}</p>
          <p class="truncate text-xs text-slate-500">${row.email || '-'}</p>
        </div>
      </div>
    `;
  }

  function badge(label: string, tone: 'gray' | 'green' | 'yellow' | 'red' | 'blue') {
    const classes = {
      gray: 'bg-slate-100 text-slate-700',
      green: 'bg-emerald-100 text-emerald-700',
      yellow: 'bg-amber-100 text-amber-700',
      red: 'bg-rose-100 text-rose-700',
      blue: 'bg-blue-100 text-blue-700'
    };

    return `<span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ${classes[tone]}">${label}</span>`;
  }

  const columns = [
    { key: 'nome', label: 'Usuario', sortable: true, formatter: (_value: unknown, row: Usuario) => userCell(row) },
    { key: 'tipo', label: 'Perfil', sortable: true, formatter: (value: string) => badge(value || 'OUTRO', 'blue') },
    { key: 'empresa', label: 'Empresa', sortable: true },
    {
      key: 'escopo',
      label: 'Escopo',
      sortable: true,
      formatter: (_value: unknown, row: Usuario) =>
        row.uso_individual
          ? badge('Individual', 'yellow')
          : row.created_by_gestor
            ? badge('Equipe gestor', 'gray')
            : badge('Corporativo', 'green')
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      formatter: (_value: unknown, row: Usuario) => badge(row.ativo ? 'Ativo' : 'Inativo', row.ativo ? 'green' : 'red')
    },
    {
      key: 'ranking',
      label: 'Ranking',
      sortable: true,
      formatter: (_value: unknown, row: Usuario) => badge(row.participa_ranking ? 'Participa' : 'Nao participa', row.participa_ranking ? 'green' : 'gray')
    },
    {
      key: 'updated_at',
      label: 'Atualizado',
      sortable: true,
      formatter: (value: string) => formatDateTime(value)
    }
  ];

  async function loadUsuarios() {
    loading = true;
    try {
      const response = await fetch('/api/v1/admin/usuarios');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      usuarios = payload.items || [];
    } catch (err) {
      console.error(err);
      toast.error('Nao foi possivel carregar os usuarios administrativos.');
      usuarios = [];
    } finally {
      loading = false;
    }
  }

  $: empresas = Array.from(new Set(usuarios.map((row) => row.empresa).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  $: filteredUsuarios = usuarios.filter((row) => {
    if (filtroTipo && row.tipo !== filtroTipo) return false;
    if (filtroStatus && String(row.ativo) !== filtroStatus) return false;
    if (filtroEmpresa && row.empresa !== filtroEmpresa) return false;
    if (filtroEscopo === 'individual' && !row.uso_individual) return false;
    if (filtroEscopo === 'corporativo' && row.uso_individual) return false;
    return true;
  });

  $: stats = {
    total: usuarios.length,
    ativos: usuarios.filter((row) => row.ativo).length,
    inativos: usuarios.filter((row) => !row.ativo).length,
    individuais: usuarios.filter((row) => row.uso_individual).length
  };

  onMount(loadUsuarios);
</script>

<svelte:head>
  <title>Usuarios Master | VTUR</title>
</svelte:head>

<PageHeader
  title="Usuarios Master"
  subtitle="Listagem consolidada do escopo master com papel, empresa, escopo e status real."
  breadcrumbs={[
    { label: 'Master', href: '/master' },
    { label: 'Usuarios' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: loadUsuarios, variant: 'secondary', icon: RefreshCw },
    { label: 'Novo usuario', href: '/master/usuarios/novo', variant: 'primary', icon: Plus }
  ]}
/>

<div class="space-y-6">
  <div class="vtur-kpi-grid mb-6">
    <div class="vtur-kpi-card border-t-[3px] border-t-slate-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Users size={20} /></div>
      <div><p class="text-sm font-medium text-slate-500">Total</p><p class="text-2xl font-bold text-slate-900">{stats.total}</p></div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><UserCheck size={20} /></div>
      <div><p class="text-sm font-medium text-slate-500">Ativos</p><p class="text-2xl font-bold text-slate-900">{stats.ativos}</p></div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-red-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"><UserX size={20} /></div>
      <div><p class="text-sm font-medium text-slate-500">Inativos</p><p class="text-2xl font-bold text-slate-900">{stats.inativos}</p></div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><UserCog size={20} /></div>
      <div><p class="text-sm font-medium text-slate-500">Uso individual</p><p class="text-2xl font-bold text-slate-900">{stats.individuais}</p></div>
    </div>
  </div>

  <Card color="financeiro" title="Filtros">
    <div class="grid gap-4 md:grid-cols-4">
      <FieldSelect
        id="usuarios-tipo"
        label="Perfil"
        bind:value={filtroTipo}
        options={Array.from(new Set(usuarios.map((row) => row.tipo))).sort((a, b) => a.localeCompare(b)).map((tipo) => ({ value: tipo, label: tipo }))}
        placeholder="Todos"
        class_name="w-full"
      />

      <FieldSelect
        id="usuarios-status"
        label="Status"
        bind:value={filtroStatus}
        options={[
          { value: 'true', label: 'Ativo' },
          { value: 'false', label: 'Inativo' }
        ]}
        placeholder="Todos"
        class_name="w-full"
      />

      <FieldSelect
        id="usuarios-empresa"
        label="Empresa"
        bind:value={filtroEmpresa}
        options={empresas.map((empresa) => ({ value: empresa, label: empresa }))}
        placeholder="Todas"
        class_name="w-full"
      />

      <FieldSelect
        id="usuarios-escopo"
        label="Escopo"
        bind:value={filtroEscopo}
        options={[
          { value: 'corporativo', label: 'Corporativo' },
          { value: 'individual', label: 'Individual' }
        ]}
        placeholder="Todos"
        class_name="w-full"
      />
    </div>
  </Card>

  <DataTable
    title="Usuarios administrados"
    color="financeiro"
    {loading}
    {columns}
    data={filteredUsuarios}
    emptyMessage="Nenhum usuario encontrado para o escopo atual."
    onRowClick={(row: Usuario) => goto(`/master/usuarios/${row.id}`)}
  />

  <Card color="financeiro">
    <p class="text-sm text-slate-600">
      Abertura do registro ocorre pelo clique na linha. O detalhe concentra edicao, acoes sensiveis,
      vinculo de empresa, papel, ranking, disparo de aviso, redefinicao de senha e reset de 2FA.
    </p>
  </Card>
</div>
