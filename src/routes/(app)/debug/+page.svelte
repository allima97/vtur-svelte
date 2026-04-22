<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { Bug, RefreshCw, CheckCircle, XCircle } from 'lucide-svelte';

  let debugData: any = null;
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    await loadDebugData();
  });

  async function loadDebugData() {
    loading = true;
    error = null;
    try {
      const response = await fetch('/api/v1/debug/permissions');
      if (!response.ok) {
        throw new Error('Erro ao carregar dados de debug');
      }
      debugData = await response.json();
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function formatJSON(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
</script>

<svelte:head>
  <title>Debug - Permissões | VTUR</title>
</svelte:head>

<div class="p-6">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <PageHeader
        title="Debug de Permissões"
        subtitle="Informações de diagnóstico do usuário"
        color="gray"
      />
    </div>
    <Button 
      variant="secondary"
      disabled={loading}
      on:click={loadDebugData}
    >
      <RefreshCw size={18} class={loading ? 'animate-spin' : ''} />
      Atualizar
    </Button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      {error}
    </div>
  {:else if debugData}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <!-- Usuário -->
      <Card title="Usuário" icon={CheckCircle}>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-500">ID:</span>
            <span class="font-mono text-xs">{debugData.usuario?.id}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Nome:</span>
            <span>{debugData.usuario?.nome || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Email:</span>
            <span>{debugData.usuario?.email}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Company ID:</span>
            <span class="font-mono text-xs">{debugData.usuario?.company_id || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">User Type ID:</span>
            <span class="font-mono text-xs">{debugData.usuario?.user_type_id || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Uso Individual:</span>
            <span>{debugData.usuario?.uso_individual ? 'Sim' : 'Não'}</span>
          </div>
        </div>
      </Card>

      <!-- Scope -->
      <Card title="Scope (Permissões Calculadas)" icon={CheckCircle}>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Papel:</span>
            <span class="font-medium">{debugData.scope?.papel}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-2">
              {#if debugData.scope?.isAdmin}
                <CheckCircle size={16} class="text-green-500" />
              {:else}
                <XCircle size={16} class="text-slate-300" />
              {/if}
              <span class={debugData.scope?.isAdmin ? 'text-green-700' : 'text-slate-400'}>Admin</span>
            </div>
            <div class="flex items-center gap-2">
              {#if debugData.scope?.isMaster}
                <CheckCircle size={16} class="text-green-500" />
              {:else}
                <XCircle size={16} class="text-slate-300" />
              {/if}
              <span class={debugData.scope?.isMaster ? 'text-green-700' : 'text-slate-400'}>Master</span>
            </div>
            <div class="flex items-center gap-2">
              {#if debugData.scope?.isGestor}
                <CheckCircle size={16} class="text-green-500" />
              {:else}
                <XCircle size={16} class="text-slate-300" />
              {/if}
              <span class={debugData.scope?.isGestor ? 'text-green-700' : 'text-slate-400'}>Gestor</span>
            </div>
            <div class="flex items-center gap-2">
              {#if debugData.scope?.isVendedor}
                <CheckCircle size={16} class="text-green-500" />
              {:else}
                <XCircle size={16} class="text-slate-300" />
              {/if}
              <span class={debugData.scope?.isVendedor ? 'text-green-700' : 'text-slate-400'}>Vendedor</span>
            </div>
          </div>
          <div class="pt-2 border-t border-slate-100">
            <span class="text-slate-500">Company IDs:</span>
            <div class="mt-1 font-mono text-xs bg-slate-50 p-2 rounded">
              {JSON.stringify(debugData.scope?.companyIds)}
            </div>
          </div>
        </div>
      </Card>

      <!-- Permissões Detalhadas -->
      <Card title="Permissões do Banco" icon={CheckCircle}>
        {#if debugData.permissoes_detalhadas && debugData.permissoes_detalhadas.length > 0}
          <div class="space-y-2">
            {#each debugData.permissoes_detalhadas as perm}
              <div class="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span class="font-medium">{perm.modulo}</span>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-slate-500">Nível {perm.nivel}</span>
                  {#if perm.company_id}
                    <span class="text-xs font-mono bg-slate-200 px-2 py-0.5 rounded">
                      {perm.company_id.slice(0, 8)}...
                    </span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-slate-500 text-sm">Nenhuma permissão encontrada no banco</p>
        {/if}
      </Card>

      <!-- Empresas -->
      <Card title="Empresas Disponíveis" icon={CheckCircle}>
        {#if debugData.empresas_disponiveis && debugData.empresas_disponiveis.length > 0}
          <div class="space-y-2 max-h-60 overflow-y-auto">
            {#each debugData.empresas_disponiveis as empresa}
              <div class="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                <span>{empresa.nome_fantasia}</span>
                <span class="font-mono text-xs text-slate-400">{empresa.id.slice(0, 8)}...</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-slate-500 text-sm">Nenhuma empresa encontrada</p>
        {/if}
      </Card>

      <!-- Sample Clientes -->
      <Card title="Sample de Clientes (últimos 5)" icon={CheckCircle} class="lg:col-span-2">
        {#if debugData.sample_clientes && debugData.sample_clientes.length > 0}
          <div class="space-y-2">
            {#each debugData.sample_clientes as cliente}
              <div class="flex items-center justify-between p-3 bg-slate-50 rounded">
                <div>
                  <p class="font-medium">{cliente.nome}</p>
                  <p class="text-xs text-slate-500 font-mono">ID: {cliente.id}</p>
                </div>
                <div class="text-right text-sm">
                  <p class="text-slate-500">
                    Company: <span class="font-mono">{cliente.company_id ? cliente.company_id.slice(0, 8) + '...' : 'N/A'}</span>
                  </p>
                  <p class="text-slate-500">
                    Created by: <span class="font-mono">{cliente.created_by ? cliente.created_by.slice(0, 8) + '...' : 'N/A'}</span>
                  </p>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-slate-500 text-sm">Nenhum cliente encontrado</p>
        {/if}
      </Card>

      <!-- JSON Completo -->
      <Card title="JSON Completo" icon={Bug} class="lg:col-span-2">
        <pre class="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">{formatJSON(debugData)}</pre>
      </Card>
    </div>
  {/if}
</div>
