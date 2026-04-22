<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldSelect } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { Save, CheckCircle, User, Phone, MapPin } from 'lucide-svelte';

  let loading = true;
  let saving = false;
  let cepStatus: string | null = null;

  let form = {
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    telefone: '',
    whatsapp: '',
    cep: '',
    endereco: '',
    numero: '',
    cidade: '',
    estado: '',
    uso_individual: null as boolean | null
  };

  const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/user/profile');
      if (!response.ok) throw new Error(await response.text());
      const perfil = await response.json();
      form = {
        nome_completo: perfil.nome_completo || '',
        cpf: perfil.cpf || '',
        data_nascimento: perfil.data_nascimento || '',
        telefone: perfil.telefone || '',
        whatsapp: perfil.whatsapp || '',
        cep: perfil.cep || '',
        endereco: perfil.endereco || '',
        numero: perfil.numero || '',
        cidade: perfil.cidade || '',
        estado: perfil.estado || '',
        uso_individual: perfil.uso_individual
      };
    } catch (err) {
      toast.error('Erro ao carregar perfil.');
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
      form = { ...form, endereco: data.logradouro || form.endereco, cidade: data.localidade || form.cidade, estado: data.uf || form.estado };
      cepStatus = 'Endereço carregado.';
    } catch {
      cepStatus = 'CEP não encontrado.';
    }
  }

  async function save() {
    if (!form.nome_completo.trim()) { toast.error('Nome completo obrigatório.'); return; }
    if (!form.telefone.trim()) { toast.error('Telefone obrigatório.'); return; }
    if (form.uso_individual === null) { toast.error('Informe o tipo de uso do sistema.'); return; }

    saving = true;
    try {
      const response = await fetch('/api/v1/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Perfil completado com sucesso!');
      goto('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    } finally {
      saving = false;
    }
  }

  onMount(load);

  $: camposFaltando = [
    !form.nome_completo.trim() && 'Nome completo',
    !form.cpf.trim() && 'CPF',
    !form.data_nascimento && 'Data de nascimento',
    !form.telefone.trim() && 'Telefone',
    !form.cep.trim() && 'CEP',
    !form.numero.trim() && 'Número',
    !form.cidade.trim() && 'Cidade',
    !form.estado.trim() && 'Estado',
    form.uso_individual === null && 'Tipo de uso'
  ].filter(Boolean);
</script>

<svelte:head>
  <title>Completar Perfil | VTUR</title>
</svelte:head>

<PageHeader
  title="Complete seu Perfil"
  subtitle="Preencha os dados obrigatórios para acessar todos os recursos do sistema."
  breadcrumbs={[{ label: 'Onboarding' }]}
/>

{#if camposFaltando.length > 0}
  <div class="mb-6 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3">
    <p class="text-sm font-medium text-amber-800">Campos obrigatórios pendentes:</p>
    <p class="mt-1 text-sm text-amber-700">{camposFaltando.join(', ')}</p>
  </div>
{:else}
  <div class="mb-6 rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2">
    <CheckCircle size={18} class="text-green-600" />
    <p class="text-sm font-medium text-green-800">Todos os campos obrigatórios estão preenchidos!</p>
  </div>
{/if}

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>
{:else}
  <form on:submit|preventDefault={save} class="space-y-6">
    <Card title="Dados pessoais">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FieldInput id="ob-nome" label="Nome completo" required bind:value={form.nome_completo} placeholder="Seu nome completo" icon={User} class_name="lg:col-span-2 w-full" />
        <FieldInput id="ob-cpf" label="CPF" required bind:value={form.cpf} placeholder="000.000.000-00" maxlength={14} class_name="w-full" />
        <FieldInput id="ob-nascimento" label="Data de nascimento" required type="date" bind:value={form.data_nascimento} class_name="w-full" />
        <FieldInput id="ob-telefone" label="Telefone" required bind:value={form.telefone} placeholder="(00) 00000-0000" icon={Phone} class_name="w-full" />
        <FieldInput id="ob-whatsapp" label="WhatsApp" bind:value={form.whatsapp} placeholder="(00) 00000-0000" class_name="w-full" />
      </div>
    </Card>

    <Card title="Tipo de uso *">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label class="flex items-start gap-3 rounded-xl border p-4 cursor-pointer {form.uso_individual === false ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}">
          <input type="radio" bind:group={form.uso_individual} value={false} class="mt-0.5" />
          <div>
            <p class="font-medium text-slate-900">Uso corporativo</p>
            <p class="text-sm text-slate-500">Faço parte de uma equipe ou agência.</p>
          </div>
        </label>
        <label class="flex items-start gap-3 rounded-xl border p-4 cursor-pointer {form.uso_individual === true ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}">
          <input type="radio" bind:group={form.uso_individual} value={true} class="mt-0.5" />
          <div>
            <p class="font-medium text-slate-900">Uso individual</p>
            <p class="text-sm text-slate-500">Trabalho de forma independente.</p>
          </div>
        </label>
      </div>
    </Card>

    <Card title="Endereço">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FieldInput id="ob-cep" label="CEP" required bind:value={form.cep} placeholder="00000-000" maxlength={9} icon={MapPin} on:blur={buscarCep} class_name="w-full" />
        {#if cepStatus}<p class="text-xs text-slate-500">{cepStatus}</p>{/if}
        <FieldInput id="ob-endereco" label="Endereço" bind:value={form.endereco} class_name="lg:col-span-2 w-full" />
        <FieldInput id="ob-numero" label="Número" required bind:value={form.numero} placeholder="123" class_name="w-full" />
        <FieldInput id="ob-cidade" label="Cidade" required bind:value={form.cidade} class_name="w-full" />
        <FieldSelect
          id="ob-estado"
          label="Estado"
          required
          bind:value={form.estado}
          options={ESTADOS.map(uf => ({ value: uf, label: uf }))}
          placeholder="Selecione uma opção"
          class_name="w-full"
        />
      </div>
    </Card>

    <div class="flex justify-end gap-3">
      <Button type="button" variant="secondary" on:click={() => goto('/')}>Pular por agora</Button>
      <Button type="submit" variant="primary" loading={saving}>
        <Save size={16} class="mr-2" />
        Salvar e continuar
      </Button>
    </div>
  </form>
{/if}
