<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { Users, RefreshCw, UserCheck, UserX, Search } from 'lucide-svelte';

  type Usuario = {
    id: string;
    nome_completo: string | null;
    email: string | null;
    active: boolean | null;
    uso_individual: boolean;
    company_id: string | null;
    user_types?: { name: string | null } | null;
  };

  type Relacao = {
    gestor_id: string;
    vendedor_id: string;
    ativo: boolean | null;
  };

  type Convite = {
    id: string;
    invited_email: string;
    status: string;
    created_at: string;
    expires_at: string | null;
    invited_by_name: string | null;
  };

  let usuarios: Usuario[] = [];
  let relacoes: Relacao[] = [];
  let convites: Convite[] = [];
  let loading = true;
  let savingId = '';
  let busca = '';

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('equipe', 'edit') || permissoes.can('parametros', 'edit');

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/parametros/equipe');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      usuarios = payload.usuarios || [];
      relacoes = payload.relacoes || [];
      convites = payload.convites || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar equipe.');
    } finally {
      loading = false;
    }
  }

  function isNaEquipe(vendedorId: string): boolean {
    return relacoes.some((r) => r.vendedor_id === vendedorId && r.ativo !== false);
  }

  async function toggleRelacao(vendedorId: string) {
    const ativo = !isNaEquipe(vendedorId);
    savingId = vendedorId;
    try {
      const response = await fetch('/api/v1/parametros/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_relacao', vendedor_id: vendedorId, ativo })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(ativo ? 'Vendedor adicionado à equipe.' : 'Vendedor removido da equipe.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar equipe.');
    } finally {
      savingId = '';
    }
  }

  function getTipoNome(usuario: Usuario): string {
    const tipo = usuario.user_types;
    if (!tipo) return '';
    return String((tipo as any).name || '');
  }

  $: usuariosFiltrados = usuarios.filter((u) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      String(u.nome_completo || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q)
    );
  });

  $: equipeAtual = usuarios.filter((u) => isNaEquipe(u.id));

  onMount(load);
</script>

<svelte:head>
  <title>Equipe | VTUR</title>
</svelte:head>

<PageHeader
  title="Gestão de Equipe"
  subtitle="Gerencie os vendedores da sua equipe e visualize convites pendentes."
  color="financeiro"
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'Equipe' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

<div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
      <Users size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Total de usuários</p>
      <p class="text-2xl font-bold text-slate-900">{usuarios.length}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">
      <UserCheck size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Na equipe</p>
      <p class="text-2xl font-bold text-slate-900">{equipeAtual.length}</p>
    </div>
  </div>
  <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
      <UserX size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Convites pendentes</p>
      <p class="text-2xl font-bold text-slate-900">{convites.filter((c) => c.status === 'pending').length}</p>
    </div>
  </div>
</div>

<Card title="Usuários da empresa" color="financeiro" class="mb-6">
  <div class="mb-4">
    <div class="relative max-w-sm">
      <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input bind:value={busca} class="vtur-input w-full pl-9" placeholder="Buscar por nome ou e-mail..." />
    </div>
  </div>

  {#if loading}
    <div class="py-8 text-center text-sm text-slate-500">Carregando...</div>
  {:else if usuariosFiltrados.length === 0}
    <div class="rounded-[14px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
      Nenhum usuário encontrado.
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">E-mail</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
            <th class="px-4 py-3 text-center font-semibold text-slate-600">Na equipe</th>
            {#if canEdit}
              <th class="px-4 py-3 text-center font-semibold text-slate-600">Ação</th>
            {/if}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          {#each usuariosFiltrados as usuario}
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">{usuario.nome_completo || '-'}</td>
              <td class="px-4 py-3 text-slate-600">{usuario.email || '-'}</td>
              <td class="px-4 py-3 text-slate-600">{getTipoNome(usuario) || '-'}</td>
              <td class="px-4 py-3 text-center">
                {#if isNaEquipe(usuario.id)}
                  <span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Sim</span>
                {:else}
                  <span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Não</span>
                {/if}
              </td>
              {#if canEdit}
                <td class="px-4 py-3 text-center">
                  <Button
                    variant={isNaEquipe(usuario.id) ? 'secondary' : 'primary'}
                    size="sm"
                    color="financeiro"
                    loading={savingId === usuario.id}
                    on:click={() => toggleRelacao(usuario.id)}
                  >
                    {isNaEquipe(usuario.id) ? 'Remover' : 'Adicionar'}
                  </Button>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

{#if convites.length > 0}
  <Card title="Convites pendentes" color="financeiro">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">E-mail convidado</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Convidado por</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Criado em</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Expira em</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          {#each convites as convite}
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 text-slate-900">{convite.invited_email}</td>
              <td class="px-4 py-3 text-slate-600">{convite.invited_by_name || '-'}</td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {convite.status === 'pending' ? 'Pendente' : convite.status}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-600">
                {new Date(convite.created_at).toLocaleDateString('pt-BR')}
              </td>
              <td class="px-4 py-3 text-slate-600">
                {convite.expires_at ? new Date(convite.expires_at).toLocaleDateString('pt-BR') : '-'}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
{/if}
