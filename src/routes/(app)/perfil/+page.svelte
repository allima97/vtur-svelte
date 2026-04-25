<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { Save, User, Phone, MapPin, Mail, Building2, Loader2 } from 'lucide-svelte';

  type Perfil = {
    id: string;
    nome_completo: string | null;
    assinatura_exibicao: string | null;
    cpf: string | null;
    data_nascimento: string | null;
    telefone: string | null;
    whatsapp: string | null;
    rg: string | null;
    cep: string | null;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    cidade: string | null;
    estado: string | null;
    email: string;
    uso_individual: boolean | null;
    avatar_url: string | null;
    company_id: string | null;
    cargo: string | null;
    company?: {
      nome_empresa?: string | null;
      nome_fantasia?: string | null;
      cnpj?: string | null;
    } | null;
  };

  let perfil: Perfil | null = null;
  let loading = true;
  let saving = false;
  let cepStatus: string | null = null;

  let form = {
    nome_completo: '',
    assinatura_exibicao: '',
    cpf: '',
    data_nascimento: '',
    telefone: '',
    whatsapp: '',
    rg: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    cidade: '',
    estado: '',
    cargo: '',
    uso_individual: null as boolean | null
  };

  const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/user/profile');
      if (!response.ok) throw new Error(await response.text());
      perfil = await response.json();
      if (perfil) {
        form = {
          nome_completo: perfil.nome_completo || '',
          assinatura_exibicao: perfil.assinatura_exibicao || '',
          cpf: perfil.cpf || '',
          data_nascimento: perfil.data_nascimento || '',
          telefone: perfil.telefone || '',
          whatsapp: perfil.whatsapp || '',
          rg: perfil.rg || '',
          cep: perfil.cep || '',
          endereco: perfil.endereco || '',
          numero: perfil.numero || '',
          complemento: perfil.complemento || '',
          cidade: perfil.cidade || '',
          estado: perfil.estado || '',
          cargo: perfil.cargo || '',
          uso_individual: perfil.uso_individual
        };
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar perfil.');
    } finally {
      loading = false;
    }
  }

  async function buscarCep() {
    const digits = String(form.cep || '').replace(/\D/g, '');
    if (digits.length !== 8) { cepStatus = null; return; }
    cepStatus = 'Buscando CEP...';
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (data?.erro) throw new Error('CEP não encontrado.');
      form = {
        ...form,
        endereco: data.logradouro || form.endereco,
        complemento: data.complemento || form.complemento,
        cidade: data.localidade || form.cidade,
        estado: data.uf || form.estado
      };
      cepStatus = 'Endereço carregado.';
    } catch {
      cepStatus = 'CEP não encontrado.';
    }
  }

  async function save() {
    if (!form.nome_completo.trim()) { toast.error('Nome completo obrigatório.'); return; }

    saving = true;
    try {
      const response = await fetch('/api/v1/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Perfil atualizado com sucesso.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    } finally {
      saving = false;
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Meu Perfil | VTUR</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center py-20">
    <Loader2 size={32} class="animate-spin text-slate-400" />
    <span class="ml-3 text-slate-600">Carregando perfil...</span>
  </div>
{:else}
  <PageHeader
    title="Meu Perfil"
    subtitle="Dados pessoais, contato e endereço do seu cadastro no sistema."
    breadcrumbs={[{ label: 'Perfil' }]}
  />

  <form on:submit|preventDefault={save} class="space-y-6">
    {#if perfil?.company}
      <Card title="Empresa" color="clientes">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Building2 size={22} class="text-slate-500" />
          </div>
          <div>
            <p class="font-semibold text-slate-900">{perfil.company.nome_fantasia || perfil.company.nome_empresa || 'Empresa'}</p>
            {#if perfil.company.cnpj}
              <p class="text-sm text-slate-500">CNPJ: {perfil.company.cnpj}</p>
            {/if}
          </div>
        </div>
      </Card>
    {/if}

    <Card title="Dados pessoais" color="clientes">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FieldInput id="perfil-nome" label="Nome completo" required bind:value={form.nome_completo} placeholder="Seu nome completo" icon={User} class_name="lg:col-span-2 w-full" />
        <FieldInput id="perfil-cargo" label="Cargo" bind:value={form.cargo} placeholder="Ex: Consultor de Viagens" class_name="w-full" />
        <FieldInput id="perfil-assinatura" label="Assinatura de exibição" bind:value={form.assinatura_exibicao} placeholder="Nome para exibição em documentos" class_name="w-full" />
        <FieldInput id="perfil-cpf" label="CPF" bind:value={form.cpf} placeholder="000.000.000-00" maxlength={14} mask="cpf" class_name="w-full" />
        <FieldInput id="perfil-rg" label="RG" bind:value={form.rg} placeholder="Documento de identidade" mask="rg" class_name="w-full" />
        <FieldInput id="perfil-nascimento" label="Data de nascimento" type="date" bind:value={form.data_nascimento} class_name="w-full" />
        <FieldInput
          id="perfil-email"
          label="E-mail"
          type="email"
          value={perfil?.email || ''}
          disabled={true}
          icon={Mail}
          helper="O e-mail não pode ser alterado aqui."
          class_name="w-full"
        />
      </div>
    </Card>

    <Card title="Contato" color="clientes">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldInput id="perfil-telefone" label="Telefone" bind:value={form.telefone} placeholder="(00) 0000-0000" mask="phone" icon={Phone} class_name="w-full" />
        <FieldInput id="perfil-whatsapp" label="WhatsApp" bind:value={form.whatsapp} placeholder="(00) 00000-0000" mask="phone" icon={Phone} class_name="w-full" />
      </div>
    </Card>

    <Card title="Endereço" color="clientes">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FieldInput id="perfil-cep" label="CEP" bind:value={form.cep} placeholder="00000-000" maxlength={9} mask="cep" icon={MapPin} on:blur={buscarCep} class_name="w-full" />
        {#if cepStatus}
          <p class="text-xs text-slate-500">{cepStatus}</p>
        {/if}
        <FieldInput id="perfil-endereco" label="Endereço" bind:value={form.endereco} placeholder="Rua, avenida..." class_name="lg:col-span-2 w-full" />
        <FieldInput id="perfil-numero" label="Número" bind:value={form.numero} placeholder="123" class_name="w-full" />
        <FieldInput id="perfil-complemento" label="Complemento" bind:value={form.complemento} placeholder="Apto, sala..." class_name="w-full" />
        <FieldInput id="perfil-cidade" label="Cidade" bind:value={form.cidade} class_name="w-full" />
        <FieldSelect
          id="perfil-estado"
          label="Estado"
          bind:value={form.estado}
          options={ESTADOS.map(uf => ({ value: uf, label: uf }))}
          placeholder="Selecione uma opção"
          class_name="w-full"
        />
      </div>
    </Card>

    <div class="flex items-center justify-end gap-3">
      <Button type="submit" variant="primary" loading={saving}>
        <Save size={16} class="mr-2" />
        Salvar perfil
      </Button>
    </div>
  </form>
{/if}
