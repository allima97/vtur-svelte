<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { toast } from '$lib/stores/ui';

  const emptyForm = {
    id: '',
    nome_empresa: '',
    nome_fantasia: '',
    cnpj: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    active: true,
    billing_status: 'active',
    billing_plan_id: '',
    billing_valor_mensal: '',
    billing_ultimo_pagamento: '',
    billing_proximo_vencimento: ''
  };

  let loading = true;
  let saving = false;
  let linkSaving = false;
  let form = { ...emptyForm };
  let plans: any[] = [];
  let masterLinks: any[] = [];
  let mastersDisponiveis: any[] = [];
  let newLink = {
    master_id: '',
    status: 'approved'
  };
  let lastLoadedId = '';

  $: isCreateMode = $page.params.id === 'nova';

  async function loadPage() {
    loading = true;
    try {
      if (isCreateMode) {
        form = { ...emptyForm };
        plans = [];
        masterLinks = [];
        mastersDisponiveis = [];
      } else {
        const response = await fetch(`/api/v1/admin/empresas/${$page.params.id}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();

        form = {
          id: payload.empresa.id,
          nome_empresa: payload.empresa.nome_empresa || '',
          nome_fantasia: payload.empresa.nome_fantasia || '',
          cnpj: payload.empresa.cnpj || '',
          telefone: payload.empresa.telefone || '',
          endereco: payload.empresa.endereco || '',
          cidade: payload.empresa.cidade || '',
          estado: payload.empresa.estado || '',
          active: payload.empresa.active !== false,
          billing_status: payload.billing?.status || 'active',
          billing_plan_id: payload.billing?.plan_id || '',
          billing_valor_mensal:
            payload.billing?.valor_mensal == null ? '' : String(payload.billing.valor_mensal),
          billing_ultimo_pagamento: payload.billing?.ultimo_pagamento || '',
          billing_proximo_vencimento: payload.billing?.proximo_vencimento || ''
        };
        plans = payload.plans || [];
        masterLinks = payload.master_links || [];
        mastersDisponiveis = payload.masters_disponiveis || [];
      }
    } catch (err) {
      console.error(err);
      toast.error('Nao foi possivel carregar a empresa.');
    } finally {
      loading = false;
    }
  }

  async function saveCompany() {
    saving = true;
    try {
      const response = await fetch('/api/v1/admin/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      toast.success('Empresa salva com sucesso.');

      if (isCreateMode && payload.id) {
        await goto(`/admin/empresas/${payload.id}`);
      } else {
        await loadPage();
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar empresa.');
    } finally {
      saving = false;
    }
  }

  async function saveMasterLink() {
    linkSaving = true;
    try {
      const response = await fetch('/api/v1/admin/master-empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_id: newLink.master_id,
          company_id: form.id,
          status: newLink.status
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Vinculo master criado.');
      newLink = { master_id: '', status: 'approved' };
      await loadPage();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar vinculo master.');
    } finally {
      linkSaving = false;
    }
  }

  async function updateMasterLink(id: string, status: string) {
    try {
      const response = await fetch('/api/v1/admin/master-empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id,
          status
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Vinculo master atualizado.');
      await loadPage();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar vinculo.');
    }
  }

  async function deleteMasterLink(id: string) {
    try {
      const response = await fetch('/api/v1/admin/master-empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Vinculo master removido.');
      await loadPage();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao remover vinculo.');
    }
  }

  $: if ($page.params.id && $page.params.id !== lastLoadedId) {
    lastLoadedId = $page.params.id;
    loadPage();
  }
</script>

<svelte:head>
  <title>{isCreateMode ? 'Nova empresa' : form.nome_fantasia || 'Empresa'} | VTUR</title>
</svelte:head>

<PageHeader
  title={isCreateMode ? 'Nova empresa' : form.nome_fantasia || 'Empresa'}
  subtitle="Cadastro corporativo com status de billing e portfolio master."
  breadcrumbs={[
    { label: 'Administracao', href: '/admin' },
    { label: 'Empresas', href: '/admin/empresas' },
    { label: isCreateMode ? 'Nova' : form.nome_fantasia || 'Detalhe' }
  ]}
/>

<div class="space-y-6">
  <Card color="financeiro" title="Dados da empresa">
    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-legal">Nome da empresa</label>
        <input id="empresa-legal" bind:value={form.nome_empresa} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-fantasia">Nome fantasia</label>
        <input id="empresa-fantasia" bind:value={form.nome_fantasia} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-cnpj">CNPJ</label>
        <input id="empresa-cnpj" bind:value={form.cnpj} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-telefone">Telefone</label>
        <input id="empresa-telefone" bind:value={form.telefone} class="vtur-input w-full" />
      </div>
      <div class="md:col-span-2">
        <label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-endereco">Endereco</label>
        <input id="empresa-endereco" bind:value={form.endereco} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-cidade">Cidade</label>
        <input id="empresa-cidade" bind:value={form.cidade} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-estado">Estado</label>
        <input id="empresa-estado" bind:value={form.estado} class="vtur-input w-full" />
      </div>
      <label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
        <input type="checkbox" bind:checked={form.active} />
        <div>
          <p class="font-medium text-slate-900">Empresa ativa</p>
          <p class="text-sm text-slate-500">Controla uso operacional do tenant.</p>
        </div>
      </label>
    </div>
  </Card>

  <Card color="financeiro" title="Billing">
    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="billing-status">Status</label>
        <select id="billing-status" bind:value={form.billing_status} class="vtur-input w-full">
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="past_due">Past due</option>
          <option value="suspended">Suspended</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="billing-plan">Plano</label>
        <select id="billing-plan" bind:value={form.billing_plan_id} class="vtur-input w-full">
          <option value="">Sem plano</option>
          {#each plans as plan}
            <option value={plan.id}>{plan.nome}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="billing-valor">Valor mensal</label>
        <input id="billing-valor" bind:value={form.billing_valor_mensal} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="billing-ultimo">Ultimo pagamento</label>
        <input id="billing-ultimo" type="date" bind:value={form.billing_ultimo_pagamento} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="billing-proximo">Proximo vencimento</label>
        <input id="billing-proximo" type="date" bind:value={form.billing_proximo_vencimento} class="vtur-input w-full" />
      </div>
    </div>
  </Card>

  {#if !isCreateMode}
    <Card color="financeiro" title="Portfolio master">
      <div class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_auto]">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="link-master">Master</label>
            <select id="link-master" bind:value={newLink.master_id} class="vtur-input w-full">
              <option value="">Selecione</option>
              {#each mastersDisponiveis as master}
                <option value={master.id}>{master.nome_completo}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="link-status">Status</label>
            <select id="link-status" bind:value={newLink.status} class="vtur-input w-full">
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div class="lg:self-end">
            <Button variant="primary" color="financeiro" on:click={saveMasterLink} loading={linkSaving}>
              Adicionar vinculo
            </Button>
          </div>
        </div>

        <div class="space-y-3">
          {#each masterLinks as link}
            <div class="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_160px_auto_auto]">
              <div>
                <p class="font-medium text-slate-900">{link.master?.nome_completo || link.master_id}</p>
                <p class="text-xs text-slate-500">{link.master?.email || '-'}</p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for={`status-${link.id}`}>Status</label>
                <select
                  id={`status-${link.id}`}
                  class="vtur-input w-full"
                  value={link.status}
                  on:change={(event) => updateMasterLink(link.id, event.currentTarget.value)}
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div class="lg:self-end">
                <Button variant="danger" on:click={() => deleteMasterLink(link.id)}>Excluir</Button>
              </div>
            </div>
          {/each}

          {#if masterLinks.length === 0}
            <p class="text-sm text-slate-500">Nenhum vinculo master cadastrado.</p>
          {/if}
        </div>
      </div>
    </Card>
  {/if}

  <div class="flex flex-wrap gap-3">
    <Button variant="secondary" href="/admin/empresas">Voltar</Button>
    <Button variant="primary" color="financeiro" on:click={saveCompany} loading={saving}>Salvar empresa</Button>
  </div>
</div>
