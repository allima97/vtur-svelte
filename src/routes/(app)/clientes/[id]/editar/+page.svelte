<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
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
          <div>
            <p class="mb-2 block text-sm font-medium text-slate-700">Tipo de pessoa</p>
            <div class="flex gap-4 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  checked={formData.tipo_pessoa === 'PF'}
                  on:change={() => setTipoPessoa('PF')}
                  class="h-4 w-4 text-clientes-600"
                />
                Pessoa Fisica
              </label>
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  checked={formData.tipo_pessoa === 'PJ'}
                  on:change={() => setTipoPessoa('PJ')}
                  class="h-4 w-4 text-clientes-600"
                />
                Pessoa Juridica
              </label>
            </div>
          </div>

          <div class="lg:col-span-2">
            <label for="nome" class="mb-1 block text-sm font-medium text-slate-700">
              {formData.tipo_pessoa === 'PJ' ? 'Razao social' : 'Nome completo'} *
            </label>
            <div class="relative">
              <User size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="nome"
                bind:value={formData.nome}
                class="vtur-input w-full pl-10"
                class:border-red-500={errors.nome}
              />
            </div>
            {#if errors.nome}
              <p class="mt-1 text-sm text-red-600">{errors.nome}</p>
            {/if}
          </div>

          <div>
            <label for="cpf" class="mb-1 block text-sm font-medium text-slate-700">
              {formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'} *
            </label>
            <input
              id="cpf"
              value={formData.cpf}
              on:input={handleDocumentoInput}
              class="vtur-input w-full"
              class:border-red-500={errors.cpf}
            />
            {#if errors.cpf}
              <p class="mt-1 text-sm text-red-600">{errors.cpf}</p>
            {/if}
          </div>

          <div>
            <label for="rg" class="mb-1 block text-sm font-medium text-slate-700">
              {formData.tipo_pessoa === 'PJ' ? 'Inscricao / IE' : 'RG'}
            </label>
            <input id="rg" bind:value={formData.rg} class="vtur-input w-full" />
          </div>

          {#if formData.tipo_pessoa === 'PF'}
            <div>
              <label for="nascimento" class="mb-1 block text-sm font-medium text-slate-700">Data de nascimento</label>
              <div class="relative">
                <Calendar size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="nascimento" type="date" bind:value={formData.nascimento} class="vtur-input w-full pl-10" />
              </div>
            </div>

            <div>
              <label for="genero" class="mb-1 block text-sm font-medium text-slate-700">Genero</label>
              <select id="genero" bind:value={formData.genero} class="vtur-input w-full">
                {#each generoOptions as option}
                  <option value={option}>{option || 'Selecione'}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="nacionalidade" class="mb-1 block text-sm font-medium text-slate-700">Nacionalidade</label>
              <input id="nacionalidade" bind:value={formData.nacionalidade} class="vtur-input w-full" />
            </div>
          {/if}

          <div>
            <label for="tipo_cliente" class="mb-1 block text-sm font-medium text-slate-700">Tipo de cliente</label>
            <input id="tipo_cliente" bind:value={formData.tipo_cliente} class="vtur-input w-full" />
          </div>

          <div>
            <label for="classificacao" class="mb-1 block text-sm font-medium text-slate-700">Classificacao</label>
            <select id="classificacao" bind:value={formData.classificacao} class="vtur-input w-full">
              {#each classificacaoOptions as option}
                <option value={option}>{option || 'Selecione'}</option>
              {/each}
            </select>
          </div>

          <div class="flex items-center gap-2 pt-7">
            <input
              id="ativo"
              type="checkbox"
              checked={formData.ativo}
              on:change={(event) => {
                const checked = (event.currentTarget as HTMLInputElement).checked;
                formData = { ...formData, ativo: checked, active: checked };
              }}
              class="h-4 w-4 rounded border-slate-300 text-clientes-600"
            />
            <label for="ativo" class="text-sm text-slate-700">Cliente ativo</label>
          </div>
        </div>
      </Card>

      <Card title="Contato e relacionamento" color="clientes">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label for="telefone" class="mb-1 block text-sm font-medium text-slate-700">Telefone *</label>
            <div class="relative">
              <Phone size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="telefone"
                value={formData.telefone}
                on:input={(event) => handleTelefoneInput('telefone', event)}
                class="vtur-input w-full pl-10"
                class:border-red-500={errors.telefone}
              />
            </div>
            {#if errors.telefone}
              <p class="mt-1 text-sm text-red-600">{errors.telefone}</p>
            {/if}
          </div>

          <div>
            <label for="whatsapp" class="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label>
            <div class="relative">
              <Phone size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
              <input
                id="whatsapp"
                value={formData.whatsapp}
                on:input={(event) => handleTelefoneInput('whatsapp', event)}
                class="vtur-input w-full pl-10"
              />
            </div>
          </div>

          <div class="lg:col-span-2">
            <label for="email" class="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
            <div class="relative">
              <Mail size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                bind:value={formData.email}
                class="vtur-input w-full pl-10"
                class:border-red-500={errors.email}
              />
            </div>
            {#if errors.email}
              <p class="mt-1 text-sm text-red-600">{errors.email}</p>
            {/if}
          </div>

          <div class="lg:col-span-4">
            <label for="tags" class="mb-1 block text-sm font-medium text-slate-700">Tags</label>
            <div class="relative">
              <Tag size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="tags" bind:value={formData.tags} class="vtur-input w-full pl-10" />
            </div>
            <p class="mt-1 text-xs text-slate-500">Separe as tags por virgula.</p>
          </div>
        </div>
      </Card>

      <Card title="Endereco" color="clientes">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label for="cep" class="mb-1 block text-sm font-medium text-slate-700">CEP</label>
            <div class="relative">
              <MapPin size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="cep"
                value={formData.cep}
                on:input={handleCepInput}
                on:blur={buscarCepIfNeeded}
                class="vtur-input w-full pl-10"
              />
            </div>
            <p class="mt-1 text-xs text-slate-500">{cepStatus || 'Preencha para auto-preencher o endereco.'}</p>
          </div>

          <div class="lg:col-span-2">
            <label for="endereco" class="mb-1 block text-sm font-medium text-slate-700">Endereco</label>
            <input id="endereco" bind:value={formData.endereco} class="vtur-input w-full" />
          </div>

          <div>
            <label for="numero" class="mb-1 block text-sm font-medium text-slate-700">Numero</label>
            <input id="numero" bind:value={formData.numero} class="vtur-input w-full" />
          </div>

          <div>
            <label for="complemento" class="mb-1 block text-sm font-medium text-slate-700">Complemento</label>
            <input id="complemento" bind:value={formData.complemento} class="vtur-input w-full" />
          </div>

          <div>
            <label for="cidade" class="mb-1 block text-sm font-medium text-slate-700">Cidade</label>
            <input id="cidade" bind:value={formData.cidade} class="vtur-input w-full" />
          </div>

          <div>
            <label for="estado" class="mb-1 block text-sm font-medium text-slate-700">Estado</label>
            <select id="estado" bind:value={formData.estado} class="vtur-input w-full">
              <option value="">Selecione</option>
              {#each estadosBrasil as estado}
                <option value={estado.value}>{estado.label}</option>
              {/each}
            </select>
          </div>
        </div>
      </Card>

      <Card title="Notas operacionais" color="clientes">
        <div class="relative">
          <FileText size={18} class="absolute left-3 top-3 text-slate-400" />
          <textarea
            id="notas"
            bind:value={formData.notas}
            rows="5"
            class="vtur-input w-full pl-10"
            placeholder="Informacoes adicionais sobre relacionamento, preferencias e historico comercial."
          ></textarea>
        </div>
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
