<script lang="ts">
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import {
    ArrowLeft,
    Calendar,
    FileText,
    Mail,
    MapPin,
    Phone,
    Save,
    Tag,
    User
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import {
    buildClientePayload,
    classificacaoOptions,
    createInitialClienteForm,
    estadosBrasil,
    formatCep,
    formatDocumento,
    formatTelefone,
    generoOptions,
    type ClienteFormData,
    validateClienteForm
  } from '$lib/features/clientes/form';

  let formData: ClienteFormData = createInitialClienteForm();
  let loading = false;
  let errors: Record<string, string> = {};
  let cepStatus: string | null = null;

  function updateField<Key extends keyof ClienteFormData>(field: Key, value: ClienteFormData[Key]) {
    formData = {
      ...formData,
      [field]: value
    };
  }

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
    updateField(field, formatTelefone(input.value));
  }

  function handleDocumentoInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    updateField('cpf', formatDocumento(input.value, formData.tipo_pessoa));
  }

  function handleCepInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    updateField('cep', formatCep(input.value));
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

    loading = true;

    try {
      const response = await fetch('/api/v1/clientes/create', {
        method: 'POST',
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
        throw new Error(payload?.error || 'Erro ao cadastrar cliente.');
      }

      toast.success('Cliente cadastrado com sucesso.');
      const createdId = String(payload?.data?.id || '').trim();
      if (createdId) {
        goto(`/clientes/${createdId}`);
      } else {
        goto('/clientes');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar cliente.');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Novo Cliente | VTUR</title>
</svelte:head>

<PageHeader
  title="Novo Cliente"
  subtitle="Cadastro completo com dados pessoais, contato, endereco, classificacao e notas operacionais."
  breadcrumbs={[
    { label: 'Clientes', href: '/clientes' },
    { label: 'Novo Cliente' }
  ]}
/>

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
            placeholder={formData.tipo_pessoa === 'PJ' ? 'Razao social do cliente' : 'Nome completo do cliente'}
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
          placeholder={formData.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
        />
        {#if errors.cpf}
          <p class="mt-1 text-sm text-red-600">{errors.cpf}</p>
        {/if}
      </div>

      <div>
        <label for="rg" class="mb-1 block text-sm font-medium text-slate-700">
          {formData.tipo_pessoa === 'PJ' ? 'Inscricao / IE' : 'RG'}
        </label>
        <input
          id="rg"
          bind:value={formData.rg}
          class="vtur-input w-full"
          placeholder={formData.tipo_pessoa === 'PJ' ? 'Documento complementar' : 'Documento de identidade'}
        />
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
        <input
          id="tipo_cliente"
          bind:value={formData.tipo_cliente}
          class="vtur-input w-full"
          placeholder="passageiro"
        />
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
            placeholder="(00) 00000-0000"
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
            placeholder="(00) 00000-0000"
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
            placeholder="cliente@exemplo.com"
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
          <input
            id="tags"
            bind:value={formData.tags}
            class="vtur-input w-full pl-10"
            placeholder="vip, aniversario, indicacao"
          />
        </div>
        <p class="mt-1 text-xs text-slate-500">Separe as tags por virgula, como no fluxo do app legado.</p>
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
            placeholder="00000-000"
          />
        </div>
        <p class="mt-1 text-xs text-slate-500">{cepStatus || 'Preencha para auto-preencher o endereco.'}</p>
      </div>

      <div class="lg:col-span-2">
        <label for="endereco" class="mb-1 block text-sm font-medium text-slate-700">Endereco</label>
        <input id="endereco" bind:value={formData.endereco} class="vtur-input w-full" placeholder="Rua, avenida, etc." />
      </div>

      <div>
        <label for="numero" class="mb-1 block text-sm font-medium text-slate-700">Numero</label>
        <input id="numero" bind:value={formData.numero} class="vtur-input w-full" placeholder="123" />
      </div>

      <div>
        <label for="complemento" class="mb-1 block text-sm font-medium text-slate-700">Complemento</label>
        <input id="complemento" bind:value={formData.complemento} class="vtur-input w-full" placeholder="Apto, sala, bloco" />
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
        placeholder="Informacoes de relacionamento, preferencias, observacoes comerciais e contexto do cliente."
      ></textarea>
    </div>
  </Card>

  <div class="flex items-center justify-end gap-3">
    <Button type="button" variant="secondary" on:click={() => goto('/clientes')} disabled={loading}>
      <ArrowLeft size={16} class="mr-2" />
      Cancelar
    </Button>
    <Button type="submit" variant="primary" color="clientes" loading={loading}>
      <Save size={16} class="mr-2" />
      Salvar cliente
    </Button>
  </div>
</form>
