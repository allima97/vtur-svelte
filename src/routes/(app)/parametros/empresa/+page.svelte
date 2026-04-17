<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { Building2, Save, Loader2 } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  type Empresa = {
    id: string;
    nome_empresa: string | null;
    nome_fantasia: string | null;
    cnpj: string | null;
    ie: string | null;
    im: string | null;
    email: string | null;
    telefone: string | null;
    website: string | null;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    logo_url: string | null;
  };

  let loading = true;
  let saving = false;
  let empresa: Empresa | null = null;

  let form = {
    nome_empresa: '',
    nome_fantasia: '',
    cnpj: '',
    ie: '',
    im: '',
    email: '',
    telefone: '',
    website: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: ''
  };

  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/parametros/empresa');
      if (!response.ok) throw new Error(await response.text());
      empresa = await response.json();
      if (empresa) {
        form = {
          nome_empresa: empresa.nome_empresa || '',
          nome_fantasia: empresa.nome_fantasia || '',
          cnpj: empresa.cnpj || '',
          ie: empresa.ie || '',
          im: empresa.im || '',
          email: empresa.email || '',
          telefone: empresa.telefone || '',
          website: empresa.website || '',
          endereco: empresa.endereco || '',
          numero: empresa.numero || '',
          complemento: empresa.complemento || '',
          bairro: empresa.bairro || '',
          cidade: empresa.cidade || '',
          estado: empresa.estado || '',
          cep: empresa.cep || ''
        };
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar dados da empresa.');
    } finally {
      loading = false;
    }
  }

  async function handleSubmit() {
    saving = true;
    try {
      const response = await fetch('/api/v1/parametros/empresa', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Dados da empresa atualizados com sucesso.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar dados da empresa.');
    } finally {
      saving = false;
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Dados da Empresa | VTUR</title>
</svelte:head>

<PageHeader
  title="Dados da Empresa"
  subtitle="Informações cadastrais e fiscais da empresa."
  color="financeiro"
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'Empresa' }
  ]}
/>

{#if loading}
  <div class="flex items-center justify-center py-20">
    <Loader2 size={28} class="animate-spin text-slate-400" />
    <span class="ml-3 text-slate-600">Carregando...</span>
  </div>
{:else}
  <form on:submit|preventDefault={handleSubmit} class="space-y-6">
    <!-- Identidade Visual -->
    <Card title="Identidade Visual" color="financeiro">
      <div class="flex items-center gap-6">
        <div class="flex h-20 w-20 items-center justify-center rounded-xl bg-financeiro-100">
          {#if empresa?.logo_url}
            <img src={empresa.logo_url} alt="Logo" class="h-full w-full rounded-xl object-contain" />
          {:else}
            <Building2 size={36} class="text-financeiro-600" />
          {/if}
        </div>
        <div>
          <p class="text-sm font-medium text-slate-700">Logo da Empresa</p>
          <p class="mt-1 text-xs text-slate-500">Para alterar o logo, entre em contato com o administrador do sistema.</p>
        </div>
      </div>
    </Card>

    <!-- Dados Cadastrais -->
    <Card title="Dados Cadastrais" color="financeiro">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="md:col-span-2">
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-razao">Razão Social</label>
          <input id="emp-razao" type="text" bind:value={form.nome_empresa} class="vtur-input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-fantasia">Nome Fantasia</label>
          <input id="emp-fantasia" type="text" bind:value={form.nome_fantasia} class="vtur-input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-cnpj">CNPJ</label>
          <input id="emp-cnpj" type="text" bind:value={form.cnpj} placeholder="00.000.000/0000-00" class="vtur-input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-ie">Inscrição Estadual</label>
          <input id="emp-ie" type="text" bind:value={form.ie} class="vtur-input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-im">Inscrição Municipal</label>
          <input id="emp-im" type="text" bind:value={form.im} class="vtur-input w-full" />
        </div>
      </div>
    </Card>

    <!-- Contato -->
    <Card title="Contato" color="financeiro">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-email">E-mail</label>
          <input id="emp-email" type="email" bind:value={form.email} class="vtur-input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-telefone">Telefone</label>
          <input id="emp-telefone" type="text" bind:value={form.telefone} placeholder="(00) 0000-0000" class="vtur-input w-full" />
        </div>

        <div class="md:col-span-2">
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-website">Website</label>
          <input id="emp-website" type="url" bind:value={form.website} placeholder="https://" class="vtur-input w-full" />
        </div>
      </div>
    </Card>

    <!-- Endereço -->
    <Card title="Endereço" color="financeiro">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div class="lg:col-span-2">
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-endereco">Endereço</label>
          <input id="emp-endereco" type="text" bind:value={form.endereco} class="vtur-input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-numero">Número</label>
          <input id="emp-numero" type="text" bind:value={form.numero} class="vtur-input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-complemento">Complemento</label>
          <input id="emp-complemento" type="text" bind:value={form.complemento} class="vtur-input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-bairro">Bairro</label>
          <input id="emp-bairro" type="text" bind:value={form.bairro} class="vtur-input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-cidade">Cidade</label>
          <input id="emp-cidade" type="text" bind:value={form.cidade} class="vtur-input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-estado">Estado</label>
          <select id="emp-estado" bind:value={form.estado} class="vtur-input w-full">
            <option value="">Selecione</option>
            {#each estados as uf}
              <option value={uf}>{uf}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="emp-cep">CEP</label>
          <input id="emp-cep" type="text" bind:value={form.cep} placeholder="00000-000" class="vtur-input w-full" />
        </div>
      </div>
    </Card>

    <div class="flex items-center justify-end gap-3">
      <Button type="button" variant="secondary" on:click={() => history.back()} disabled={saving}>Cancelar</Button>
      <Button type="submit" variant="primary" color="financeiro" loading={saving}>
        <Save size={16} class="mr-2" />
        Salvar Alterações
      </Button>
    </div>
  </form>
{/if}
