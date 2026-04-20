<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { toast } from '$lib/stores/ui';
  import { RefreshCw, Users, LayoutGrid, XCircle } from 'lucide-svelte';

  type UserPermissionRow = {
    id: string;
    nome: string;
    email: string | null;
    tipo: string;
    empresa: string;
    ativos: number;
  };

  let loading = true;
  let rows: UserPermissionRow[] = [];
  let globalModules: Array<{ module_key: string; enabled: boolean }> = [];
  let systemModuleCatalog: Array<{ key: string; label: string }> = [];
  let savingGlobal = false;

  const columns = [
    {
      key: 'nome',
      label: 'Usuario',
      sortable: true,
      formatter: (_value: unknown, row: UserPermissionRow) => `
        <div>
          <p class="font-medium text-slate-900">${row.nome}</p>
          <p class="text-xs text-slate-500">${row.email || '-'}</p>
        </div>
      `
    },
    { key: 'tipo', label: 'Perfil', sortable: true },
    { key: 'empresa', label: 'Empresa', sortable: true },
    {
      key: 'ativos',
      label: 'Modulos ativos',
      sortable: true,
      formatter: (value: number) =>
        `<span class="inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">${value || 0}</span>`
    }
  ];

  function getGlobalEnabled(moduleKey: string) {
    const row = globalModules.find((item) => item.module_key === moduleKey);
    return row ? row.enabled !== false : true;
  }

  async function loadPage() {
    loading = true;
    try {
      const response = await fetch('/api/v1/admin/permissoes');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      rows = payload.items || [];
      globalModules = (payload.global_modules || []).map((item: any) => ({
        module_key: item.module_key,
        enabled: item.enabled !== false
      }));
      systemModuleCatalog = payload.system_module_catalog || [];
    } catch (err) {
      console.error(err);
      toast.error('Nao foi possivel carregar o painel de permissoes.');
      rows = [];
      globalModules = [];
      systemModuleCatalog = [];
    } finally {
      loading = false;
    }
  }

  async function saveGlobalModules() {
    savingGlobal = true;
    try {
      const response = await fetch('/api/v1/admin/permissoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'global',
          settings: systemModuleCatalog.map((item) => ({
            module_key: item.key,
            enabled: getGlobalEnabled(item.key)
          }))
        })
      });

      if (!response.ok) throw new Error(await response.text());
      toast.success('Modulos globais atualizados.');
      await loadPage();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar modulos globais.');
    } finally {
      savingGlobal = false;
    }
  }

  onMount(loadPage);
</script>

<svelte:head>
  <title>Permissoes | VTUR</title>
</svelte:head>

<PageHeader
  title="Permissoes"
  subtitle="Controle por usuario e configuracao global dos modulos administrativos."
  breadcrumbs={[
    { label: 'Administracao', href: '/admin' },
    { label: 'Permissoes' }
  ]}
  actions={[{ label: 'Atualizar', onClick: loadPage, variant: 'secondary', icon: RefreshCw }]}
/>

<div class="space-y-6">
  <div class="vtur-kpi-grid vtur-kpi-grid-3">
    <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Users size={20} /></div>
      <div><p class="text-sm font-medium text-slate-500">Usuários no painel</p><p class="text-2xl font-bold text-slate-900">{rows.length}</p></div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><LayoutGrid size={20} /></div>
      <div><p class="text-sm font-medium text-slate-500">Módulos globais</p><p class="text-2xl font-bold text-slate-900">{systemModuleCatalog.length}</p></div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-red-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"><XCircle size={20} /></div>
      <div><p class="text-sm font-medium text-slate-500">Módulos desabilitados</p><p class="text-2xl font-bold text-slate-900">{systemModuleCatalog.filter((item) => !getGlobalEnabled(item.key)).length}</p></div>
    </div>
  </div>

  <Card color="financeiro" title="Disponibilidade global dos modulos">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {#each systemModuleCatalog as item}
        <label class="flex items-center justify-between rounded-xl border border-slate-200 p-4">
          <div>
            <p class="font-medium text-slate-900">{item.label}</p>
            <p class="text-xs text-slate-500">{item.key}</p>
          </div>
          <input
            type="checkbox"
            checked={getGlobalEnabled(item.key)}
            on:change={(event) => {
              const checked = event.currentTarget.checked;
              const current = globalModules.find((row) => row.module_key === item.key);
              if (current) {
                current.enabled = checked;
                globalModules = [...globalModules];
              } else {
                globalModules = [...globalModules, { module_key: item.key, enabled: checked }];
              }
            }}
          />
        </label>
      {/each}
    </div>

    <div class="mt-4">
      <Button variant="primary" color="financeiro" on:click={saveGlobalModules} loading={savingGlobal}>
        Salvar disponibilidade global
      </Button>
    </div>
  </Card>

  <DataTable
    title="Usuarios por permissao"
    color="financeiro"
    {loading}
    {columns}
    data={rows}
    emptyMessage="Nenhum usuario com permissao administrativa encontrado."
    onRowClick={(row: UserPermissionRow) => goto(`/admin/permissoes/${row.id}`)}
  />

  <Card color="financeiro">
    <p class="text-sm text-slate-600">
      O clique na linha abre o editor completo de permissoes do usuario. A disponibilidade global
      acima controla bloqueios de modulo para todo o sistema.
    </p>
  </Card>
</div>
