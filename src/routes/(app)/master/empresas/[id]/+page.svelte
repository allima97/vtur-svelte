<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/db/supabase';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect, FieldCheckbox } from '$lib/components/ui';
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

  async function ensureServerSessionCookie() {
    if (!browser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
      });
    } catch {
      // Falha silenciosa: o carregamento tratará 401 explicitamente.
    }
  }

  async function loadPage() {
    loading = true;
    try {
      await ensureServerSessionCookie();
      if (isCreateMode) {
        toast.error('O escopo master nao pode criar empresas.');
        await goto('/master/empresas');
        return;
      } else {
        const response = await fetch(`/api/v1/admin/empresas/${$page.params.id}`);
        if (!response.ok) {
          const message = (await response.text()) || 'Nao foi possivel carregar a empresa.';
          if (response.status === 401) {
            toast.error('Sessão expirada. Faça login novamente para continuar.');
            const next = `${$page.url.pathname}${$page.url.search}`;
            await goto(`/auth/login?session_expired=1&next=${encodeURIComponent(next)}`);
            return;
          }
          if (response.status === 403) {
            toast.error(message || 'Você não tem permissão para acessar esta empresa.');
            await goto('/master/empresas');
            return;
          }
          if (response.status === 404) {
            toast.error(message || 'Empresa não encontrada.');
            await goto('/master/empresas');
            return;
          }
          throw new Error(message);
        }
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
        await goto(`/master/empresas/${payload.id}`);
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
  <title>{isCreateMode ? 'Nova empresa' : form.nome_fantasia || 'Empresa'} | Master | VTUR</title>
</svelte:head>

<PageHeader
  title={isCreateMode ? 'Nova empresa' : form.nome_fantasia || 'Empresa'}
  subtitle="Cadastro corporativo acessivel ao master, com billing e portfolio vinculado."
  breadcrumbs={[
    { label: 'Master', href: '/master' },
    { label: 'Empresas', href: '/master/empresas' },
    { label: isCreateMode ? 'Nova' : form.nome_fantasia || 'Detalhe' }
  ]}
/>

<div class="space-y-6">
  <Card color="financeiro" title="Dados da empresa">
    <div class="grid gap-4 md:grid-cols-2">
      <FieldInput id="empresa-legal" label="Nome da empresa" bind:value={form.nome_empresa} class_name="w-full" />
      <FieldInput id="empresa-fantasia" label="Nome fantasia" bind:value={form.nome_fantasia} class_name="w-full" />
      <FieldInput id="empresa-cnpj" label="CNPJ" bind:value={form.cnpj} mask="cnpj" class_name="w-full" />
      <FieldInput id="empresa-telefone" label="Telefone" bind:value={form.telefone} mask="phone" class_name="w-full" />
      <FieldInput id="empresa-endereco" label="Endereco" bind:value={form.endereco} class_name="md:col-span-2 w-full" />
      <FieldInput id="empresa-cidade" label="Cidade" bind:value={form.cidade} class_name="w-full" />
      <FieldInput id="empresa-estado" label="Estado" bind:value={form.estado} class_name="w-full" />
      <FieldCheckbox label="Empresa ativa" bind:checked={form.active} helper="Controla uso operacional do tenant." class_name="rounded-xl border border-slate-200 p-4" />
    </div>
  </Card>

  <Card color="financeiro" title="Billing">
    <div class="grid gap-4 md:grid-cols-2">
      <FieldSelect
        id="billing-status"
        label="Status"
        bind:value={form.billing_status}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'trial', label: 'Trial' },
          { value: 'past_due', label: 'Past due' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'canceled', label: 'Canceled' }
        ]}
        placeholder=""
        class_name="w-full"
      />

      <FieldSelect
        id="billing-plan"
        label="Plano"
        bind:value={form.billing_plan_id}
        options={[{ value: '', label: 'Sem plano' }, ...plans.map((plan) => ({ value: plan.id, label: plan.nome || '' }))]}
        placeholder=""
        class_name="w-full"
      />

      <FieldInput id="billing-valor" label="Valor mensal" bind:value={form.billing_valor_mensal} class_name="w-full" />
      <FieldInput id="billing-ultimo" label="Ultimo pagamento" type="date" bind:value={form.billing_ultimo_pagamento} class_name="w-full" />
      <FieldInput id="billing-proximo" label="Proximo vencimento" type="date" bind:value={form.billing_proximo_vencimento} class_name="w-full" />
    </div>
  </Card>

  {#if !isCreateMode}
    <Card color="financeiro" title="Portfolio master">
      <div class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_auto]">
          <FieldSelect
            id="link-master"
            label="Master"
            bind:value={newLink.master_id}
            options={mastersDisponiveis.map(m => ({ value: m.id, label: m.nome_completo }))}
            placeholder="Selecione uma opção"
            class_name="w-full"
          />
          <FieldSelect
            id="link-status"
            label="Status"
            bind:value={newLink.status}
            options={[
              { value: 'approved', label: 'Approved' },
              { value: 'pending', label: 'Pending' },
              { value: 'rejected', label: 'Rejected' }
            ]}
            placeholder=""
            class_name="w-full"
          />
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
                <FieldSelect
                  id={`status-${link.id}`}
                  label="Status"
                  value={link.status}
                  options={[
                    { value: 'approved', label: 'Approved' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'rejected', label: 'Rejected' }
                  ]}
                  placeholder=""
                  class_name="w-full"
                  on:change={(event) => updateMasterLink(link.id, (event.target as HTMLSelectElement).value)}
                />
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
    <Button variant="secondary" href="/master/empresas">Voltar</Button>
    <Button variant="primary" color="financeiro" on:click={saveCompany} loading={saving}>Salvar empresa</Button>
  </div>
</div>
