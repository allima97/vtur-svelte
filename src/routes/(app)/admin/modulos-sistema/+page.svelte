<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { toast } from '$lib/stores/ui';
  import { RefreshCw, Settings, CheckCircle, XCircle } from 'lucide-svelte';

  type ModuloItem = {
    key: string;
    label: string;
    enabled: boolean;
    reason: string;
  };

  let modulos: ModuloItem[] = [];
  let loading = true;
  let savingKey = '';
  let tableMissing = false;

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/admin/modulos-sistema');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();

      tableMissing = Boolean(payload.table_missing);
      const catalog = payload.catalog || [];
      const disabled = new Set((payload.disabled || []).map((k: string) => k.toLowerCase()));

      modulos = catalog.map((item: any) => ({
        key: item.key,
        label: item.label,
        enabled: !disabled.has(item.key.toLowerCase()),
        reason: ''
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar módulos.');
    } finally {
      loading = false;
    }
  }

  async function toggleModulo(modulo: ModuloItem) {
    savingKey = modulo.key;
    try {
      const response = await fetch('/api/v1/admin/modulos-sistema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_key: modulo.key, enabled: !modulo.enabled })
      });
      if (!response.ok) throw new Error(await response.text());
      modulo.enabled = !modulo.enabled;
      modulos = [...modulos];
      toast.success(`Módulo ${modulo.label} ${modulo.enabled ? 'habilitado' : 'desabilitado'}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar módulo.');
    } finally {
      savingKey = '';
    }
  }

  onMount(load);

  $: habilitados = modulos.filter((m) => m.enabled).length;
  $: desabilitados = modulos.filter((m) => !m.enabled).length;
</script>

<svelte:head>
  <title>Módulos do Sistema | VTUR</title>
</svelte:head>

<PageHeader
  title="Módulos do Sistema"
  subtitle="Habilite ou desabilite módulos para controlar o acesso às funcionalidades."
  breadcrumbs={[
    { label: 'Admin', href: '/admin' },
    { label: 'Módulos do Sistema' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

{#if tableMissing}
  <div class="mb-6 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
    A tabela <code>system_module_settings</code> não existe neste ambiente. Os módulos são exibidos com base no catálogo padrão.
  </div>
{/if}

<div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-slate-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Settings size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total de módulos</p>
      <p class="text-2xl font-bold text-slate-900">{modulos.length}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500"><CheckCircle size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Habilitados</p>
      <p class="text-2xl font-bold text-slate-900">{habilitados}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-red-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"><XCircle size={20} /></div>
    <div>
      <p class="text-sm font-medium text-slate-500">Desabilitados</p>
      <p class="text-2xl font-bold text-slate-900">{desabilitados}</p>
    </div>
  </div>
</div>

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">Carregando módulos...</div>
{:else}
  <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
    {#each modulos as modulo}
      <div class="vtur-card p-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="rounded-lg p-2 {modulo.enabled ? 'bg-green-50' : 'bg-slate-100'}">
            <Settings size={18} class="{modulo.enabled ? 'text-green-600' : 'text-slate-400'}" />
          </div>
          <div>
            <p class="font-medium text-slate-900">{modulo.label}</p>
            <p class="text-xs text-slate-500 font-mono">{modulo.key}</p>
          </div>
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors {modulo.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
          on:click={() => toggleModulo(modulo)}
          disabled={savingKey === modulo.key}
        >
          {#if modulo.enabled}
            <CheckCircle size={14} />
            Ativo
          {:else}
            <XCircle size={14} />
            Inativo
          {/if}
        </button>
      </div>
    {/each}
  </div>
{/if}
