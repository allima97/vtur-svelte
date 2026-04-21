<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    Button,
    Card,
    FieldCheckbox,
    FieldInput,
    FieldRadioGroup,
    FieldSelect,
    FieldTextarea,
    PageHeader
  } from '$lib/components/ui';
  import AcompanhantesManager from '$lib/components/clientes/AcompanhantesManager.svelte';
  import {
    ArrowLeft,
    Calendar,
    FileText,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Save,
    Tag,
    User,
    Users
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import {
    buildClientePayload,
    classificacaoOptions,
    createInitialClienteForm,
    estadosBrasil,
    fillClienteFormFromApi,
    formatCep,
    formatDocumento,
    formatTelefone,
    generoOptions,
    type ClienteFormData,
    validateClienteForm
  } from '$lib/features/clientes/form';

  const clienteId = $page.params.id;

  let formData: ClienteFormData = createInitialClienteForm();
  let loading = true;
  let saving = false;
  let errors: Record<string, string> = {};
  let cepStatus: string | null = null;
  let errorMessage: string | null = null;
  let abaAtiva: 'dados' | 'acompanhantes' = 'dados';

  const tipoPessoaOptions = [
    { value: 'PF', label: 'Pessoa Fisica' },
    { value: 'PJ', label: 'Pessoa Juridica' }
  ];

  const generoSelectOptions = generoOptions.filter(Boolean).map((option) => ({
    value: option,
    label: option
  }));

  const classificacaoSelectOptions = classificacaoOptions.filter(Boolean).map((option) => ({
    value: option,
    label: option
  }));

  const estadosSelectOptions = estadosBrasil.map((estado) => ({
    value: estado.value,
    label: estado.label
  }));

  async function carregarCliente() {
    loading = true;
    errorMessage = null;

    try {
      const response = await fetch(`/api/v1/clientes/${clienteId}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      formData = fillClienteFormFromApi(data);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Erro ao carregar cliente.';
      toast.error(errorMessage);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void carregarCliente();
  });

  function setTipoPessoa(value: 'PF' | 'PJ') {
    formData = {
      ...formData,
      tipo_pessoa: value,
      cpf: formatDocumento(formData.cpf, value),
      genero: value === 'PJ' ? '' : formData.genero,
      nacionalidade: value === 'PJ' ? '' : formData.nacionalidade || 'Brasileira'
    };
  }

  function handleTelefoneInput(field: 'telefone' | 'whatsapp', event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    formData = {
      ...formData,
      [field]: formatTelefone(input.value)
    };
  }

  function handleDocumentoInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    formData = {
      ...formData,
      cpf: formatDocumento(input.value, formData.tipo_pessoa)
    };
  }

  function handleCepInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    formData = {
      ...formData,
      cep: formatCep(input.value)
    };
  }

  async function buscarCepIfNeeded() {
    const digits = String(formData.cep || '').replace(/\D/g, '');
    if (digits.length !== 8) {
      cepStatus = null;
      return;
    }

    try {
      cepStatus = 'Buscando CEP...';
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) {
        throw new Error('CEP invalido ou indisponivel.');
      }

      const data = await response.json();
      if (data?.erro) {
        throw new Error('CEP nao encontrado.');
      }

      formData = {
        ...formData,
        endereco: String(data?.logradouro || formData.endereco || ''),
        cidade: String(data?.localidade || formData.cidade || ''),
        estado: String(data?.uf || formData.estado || '')
      };
      cepStatus = 'Endereco carregado pelo CEP.';
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      cepStatus = 'Nao foi possivel carregar o CEP.';
    }
  }

  async function handleSubmit() {
    errors = {};
    const validation = validateClienteForm(formData);
    if (!validation.valid) {
      errors = validation.errors;
      toast.error(validation.firstError || 'Corrija os erros do formulario.');
      return;
    }

    saving = true;

    try {
      const response = await fetch(`/api/v1/clientes/${clienteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildClientePayload(formData))
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (payload?.errors && typeof payload.errors === 'object') {
          errors = payload.errors;
        }
        throw new Error(payload?.error || 'Erro ao atualizar cliente.');
      }

      toast.success('Cliente atualizado com sucesso.');
      goto(`/clientes/${clienteId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar cliente.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Editar Cliente | VTUR</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center py-20">
    <Loader2 size={36} class="animate-spin text-clientes-600" />
    <span class="ml-3 text-slate-600">Carregando cliente...</span>
  </div>
{:else if errorMessage}
  <div class="space-y-4">
    <div class="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {errorMessage}
    </div>
    <Button variant="secondary" on:click={() => goto('/clientes')}>
      <ArrowLeft size={16} class="mr-2" />
      Voltar para clientes
    </Button>
  </div>
{:else}
  <PageHeader
    title="Editar Cliente"
    subtitle="Mesmo fluxo do cadastro, com aba de acompanhantes para manter o relacionamento operacional."
    breadcrumbs={[
      { label: 'Clientes', href: '/clientes' },
      { label: formData.nome || 'Cliente', href: `/clientes/${clienteId}` },
      { label: 'Editar' }
    ]}
  />

  <div class="mb-6 flex flex-wrap gap-3">
    <Button
      type="button"
      variant={abaAtiva === 'dados' ? 'primary' : 'secondary'}
      color={abaAtiva === 'dados' ? 'clientes' : undefined}
      on:click={() => (abaAtiva = 'dados')}
    >
      <User size={16} class="mr-2" />
      Dados do cliente
    </Button>
    <Button
      type="button"
      variant={abaAtiva === 'acompanhantes' ? 'primary' : 'secondary'}
      color={abaAtiva === 'acompanhantes' ? 'clientes' : undefined}
      on:click={() => (abaAtiva = 'acompanhantes')}
    >
      <Users size={16} class="mr-2" />
      Acompanhantes
    </Button>
  </div>

  {#if abaAtiva === 'dados'}
    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <Card title="Dados cadastrais" color="clientes">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FieldRadioGroup
            label="Tipo de pessoa"
            value={formData.tipo_pessoa}
            options={tipoPessoaOptions}
            on:change={(event) => setTipoPessoa((event.currentTarget as HTMLInputElement).value as 'PF' | 'PJ')}
          />

          <FieldInput
            id="nome"
            label={formData.tipo_pessoa === 'PJ' ? 'Razao social' : 'Nome completo'}
            bind:value={formData.nome}
            icon={User}
            required={true}
            error={errors.nome}
            class_name="lg:col-span-2"
          />

          <FieldInput
            id="cpf"
            label={formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}
            value={formData.cpf}
            required={true}
            error={errors.cpf}
            on:input={handleDocumentoInput}
          />

          <FieldInput
            id="rg"
            label={formData.tipo_pessoa === 'PJ' ? 'Inscricao / IE' : 'RG'}
            bind:value={formData.rg}
          />

          {#if formData.tipo_pessoa === 'PF'}
            <FieldInput id="nascimento" label="Data de nascimento" type="date" bind:value={formData.nascimento} icon={Calendar} />

            <FieldSelect
              id="genero"
              label="Genero"
              bind:value={formData.genero}
              options={generoSelectOptions}
              placeholder="Selecione"
            />

            <FieldInput id="nacionalidade" label="Nacionalidade" bind:value={formData.nacionalidade} />
          {/if}

          <FieldInput id="tipo_cliente" label="Tipo de cliente" bind:value={formData.tipo_cliente} />

          <FieldSelect
            id="classificacao"
            label="Classificacao"
            bind:value={formData.classificacao}
            options={classificacaoSelectOptions}
            placeholder="Selecione"
          />

          <FieldCheckbox
            id="ativo"
            label="Cliente ativo"
            checked={formData.ativo}
            color="clientes"
            class_name="pt-7"
            on:change={(event) => {
              const checked = (event.currentTarget as HTMLInputElement).checked;
              formData = { ...formData, ativo: checked, active: checked };
            }}
          />
        </div>
      </Card>

      <Card title="Contato e relacionamento" color="clientes">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FieldInput
            id="telefone"
            label="Telefone"
            value={formData.telefone}
            type="tel"
            icon={Phone}
            required={true}
            error={errors.telefone}
            on:input={(event) => handleTelefoneInput('telefone', event)}
          />

          <FieldInput
            id="whatsapp"
            label="WhatsApp"
            value={formData.whatsapp}
            type="tel"
            icon={Phone}
            on:input={(event) => handleTelefoneInput('whatsapp', event)}
          />

          <FieldInput
            id="email"
            label="E-mail"
            bind:value={formData.email}
            type="email"
            icon={Mail}
            error={errors.email}
            class_name="lg:col-span-2"
          />

          <FieldInput
            id="tags"
            label="Tags"
            bind:value={formData.tags}
            icon={Tag}
            helper="Separe as tags por virgula."
            class_name="lg:col-span-4"
          />
        </div>
      </Card>

      <Card title="Endereco" color="clientes">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FieldInput
            id="cep"
            label="CEP"
            value={formData.cep}
            icon={MapPin}
            helper={cepStatus || 'Preencha para auto-preencher o endereco.'}
            on:input={handleCepInput}
            on:blur={buscarCepIfNeeded}
          />

          <FieldInput id="endereco" label="Endereco" bind:value={formData.endereco} class_name="lg:col-span-2" />

          <FieldInput id="numero" label="Numero" bind:value={formData.numero} />

          <FieldInput id="complemento" label="Complemento" bind:value={formData.complemento} />

          <FieldInput id="cidade" label="Cidade" bind:value={formData.cidade} />

          <FieldSelect
            id="estado"
            label="Estado"
            bind:value={formData.estado}
            options={estadosSelectOptions}
            placeholder="Selecione"
          />
        </div>
      </Card>

      <Card title="Notas operacionais" color="clientes">
        <FieldTextarea
          id="notas"
          label="Notas"
          bind:value={formData.notas}
          rows={5}
          placeholder="Informacoes adicionais sobre relacionamento, preferencias e historico comercial."
        />
      </Card>

      <div class="flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" on:click={() => goto(`/clientes/${clienteId}`)} disabled={saving}>
          <ArrowLeft size={16} class="mr-2" />
          Cancelar
        </Button>
        <Button type="submit" variant="primary" color="clientes" loading={saving}>
          <Save size={16} class="mr-2" />
          Salvar alteracoes
        </Button>
      </div>
    </form>
  {:else}
    <AcompanhantesManager
      clienteId={clienteId}
      editable={true}
      title="Acompanhantes do cliente"
      subtitle="Cadastro e manutencao dos acompanhantes vinculados a este cliente."
    />
  {/if}
{/if}
