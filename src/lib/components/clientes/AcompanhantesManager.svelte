<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { toast } from '$lib/stores/ui';
  import { Calendar, FileText, Phone, Save, Trash2, UserPlus, Users } from 'lucide-svelte';

  type Acompanhante = {
    id: string;
    nome_completo: string;
    cpf: string | null;
    telefone: string | null;
    grau_parentesco: string | null;
    rg: string | null;
    data_nascimento: string | null;
    observacoes: string | null;
    ativo: boolean;
  };

  type AcompanhanteForm = {
    nome_completo: string;
    cpf: string;
    telefone: string;
    grau_parentesco: string;
    rg: string;
    data_nascimento: string;
    observacoes: string;
    ativo: boolean;
  };

  export let clienteId = '';
  export let editable = false;
  export let title = 'Acompanhantes';
  export let subtitle = 'Relacionamentos e passageiros vinculados ao cliente.';

  let acompanhantes: Acompanhante[] = [];
  let loading = false;
  let saving = false;
  let deleting = false;
  let errorMessage: string | null = null;
  let selectedId = '';
  let loadedClienteId = '';

  const parentescoOptions = [
    '',
    'Conjuge',
    'Filho(a)',
    'Pai/Mae',
    'Irmao(a)',
    'Amigo(a)',
    'Colega',
    'Outro'
  ];

  function createInitialForm(): AcompanhanteForm {
    return {
      nome_completo: '',
      cpf: '',
      telefone: '',
      grau_parentesco: '',
      rg: '',
      data_nascimento: '',
      observacoes: '',
      ativo: true
    };
  }

  let form = createInitialForm();

  $: if (clienteId && clienteId !== loadedClienteId) {
    loadedClienteId = clienteId;
    void loadAcompanhantes();
  }

  function fillForm(item: Acompanhante) {
    form = {
      nome_completo: String(item.nome_completo || ''),
      cpf: String(item.cpf || ''),
      telefone: String(item.telefone || ''),
      grau_parentesco: String(item.grau_parentesco || ''),
      rg: String(item.rg || ''),
      data_nascimento: String(item.data_nascimento || '').slice(0, 10),
      observacoes: String(item.observacoes || ''),
      ativo: item.ativo !== false
    };
  }

  async function loadAcompanhantes() {
    if (!clienteId) return;

    loading = true;
    errorMessage = null;

    try {
      const response = await fetch(`/api/v1/clientes/${clienteId}/acompanhantes`);
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = await response.json();
      acompanhantes = Array.isArray(payload?.items) ? payload.items : [];

      if (selectedId) {
        const selected = acompanhantes.find((item) => item.id === selectedId);
        if (selected) {
          fillForm(selected);
        } else {
          selectedId = '';
          form = createInitialForm();
        }
      }
    } catch (error) {
      acompanhantes = [];
      errorMessage = error instanceof Error ? error.message : 'Erro ao carregar acompanhantes.';
    } finally {
      loading = false;
    }
  }

  function handleRowClick(item: Acompanhante) {
    selectedId = item.id;
    fillForm(item);
  }

  function novoAcompanhante() {
    selectedId = '';
    form = createInitialForm();
    errorMessage = null;
  }

  async function salvarAcompanhante() {
    if (!clienteId || !editable) return;

    if (!form.nome_completo.trim()) {
      toast.error('Informe o nome completo do acompanhante.');
      return;
    }

    saving = true;
    errorMessage = null;

    try {
      const method = selectedId ? 'PATCH' : 'POST';
      const url = selectedId
        ? `/api/v1/clientes/${clienteId}/acompanhantes/${selectedId}`
        : `/api/v1/clientes/${clienteId}/acompanhantes`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast.success(selectedId ? 'Acompanhante atualizado.' : 'Acompanhante cadastrado.');
      await loadAcompanhantes();
      if (!selectedId) {
        novoAcompanhante();
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Erro ao salvar acompanhante.';
      toast.error(errorMessage);
    } finally {
      saving = false;
    }
  }

  async function excluirAcompanhante() {
    if (!clienteId || !editable || !selectedId) return;
    if (!window.confirm('Deseja remover este acompanhante?')) return;

    deleting = true;
    errorMessage = null;

    try {
      const response = await fetch(
        `/api/v1/clientes/${clienteId}/acompanhantes/${selectedId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast.success('Acompanhante removido.');
      novoAcompanhante();
      await loadAcompanhantes();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Erro ao remover acompanhante.';
      toast.error(errorMessage);
    } finally {
      deleting = false;
    }
  }
</script>

<Card {title} color="clientes">
  <div class="space-y-4">
    <p class="text-sm text-slate-500">{subtitle}</p>

    {#if errorMessage}
      <div class="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {errorMessage}
      </div>
    {/if}

    <div class="overflow-x-auto rounded-[18px] border border-slate-200">
      <table class="w-full text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Parentesco</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Telefone</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Nascimento</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          {#if loading}
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-slate-500">Carregando acompanhantes...</td>
            </tr>
          {:else if acompanhantes.length === 0}
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-slate-500">Nenhum acompanhante cadastrado.</td>
            </tr>
          {:else}
            {#each acompanhantes as item}
              <tr
                class="cursor-pointer transition-colors hover:bg-slate-50"
                class:bg-clientes-50={item.id === selectedId}
                on:click={() => handleRowClick(item)}
              >
                <td class="px-4 py-3">
                  <div class="font-medium text-slate-900">{item.nome_completo}</div>
                  <div class="text-xs text-slate-500">{item.cpf || '-'}</div>
                </td>
                <td class="px-4 py-3 text-slate-700">{item.grau_parentesco || '-'}</td>
                <td class="px-4 py-3 text-slate-700">{item.telefone || '-'}</td>
                <td class="px-4 py-3 text-slate-700">
                  {item.data_nascimento ? new Date(item.data_nascimento).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td class="px-4 py-3">
                  <span
                    class={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    {#if editable}
      <div class="rounded-[18px] border border-slate-200 bg-white p-5">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">
              {selectedId ? 'Editar acompanhante' : 'Novo acompanhante'}
            </h3>
            <p class="text-sm text-slate-500">Clique na linha para editar ou cadastre um novo acompanhante.</p>
          </div>

          <div class="flex gap-2">
            <Button type="button" variant="secondary" on:click={novoAcompanhante}>
              <UserPlus size={16} class="mr-2" />
              Novo
            </Button>
            {#if selectedId}
              <Button type="button" variant="ghost" on:click={excluirAcompanhante} disabled={deleting}>
                <Trash2 size={16} class="mr-2" />
                Excluir
              </Button>
            {/if}
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <label for="acomp-nome" class="mb-1 block text-sm font-medium text-slate-700">Nome completo *</label>
            <input id="acomp-nome" bind:value={form.nome_completo} class="vtur-input w-full" placeholder="Nome do acompanhante" />
          </div>

          <div>
            <label for="acomp-parentesco" class="mb-1 block text-sm font-medium text-slate-700">Parentesco</label>
            <select id="acomp-parentesco" bind:value={form.grau_parentesco} class="vtur-input w-full">
              {#each parentescoOptions as option}
                <option value={option}>{option || 'Selecione'}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="acomp-cpf" class="mb-1 block text-sm font-medium text-slate-700">CPF</label>
            <input id="acomp-cpf" bind:value={form.cpf} class="vtur-input w-full" placeholder="CPF do acompanhante" />
          </div>

          <div>
            <label for="acomp-telefone" class="mb-1 block text-sm font-medium text-slate-700">Telefone</label>
            <div class="relative">
              <Phone size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="acomp-telefone" bind:value={form.telefone} class="vtur-input w-full pl-10" placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div>
            <label for="acomp-nascimento" class="mb-1 block text-sm font-medium text-slate-700">Data de nascimento</label>
            <div class="relative">
              <Calendar size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="acomp-nascimento" bind:value={form.data_nascimento} type="date" class="vtur-input w-full pl-10" />
            </div>
          </div>

          <div>
            <label for="acomp-rg" class="mb-1 block text-sm font-medium text-slate-700">RG</label>
            <input id="acomp-rg" bind:value={form.rg} class="vtur-input w-full" placeholder="Documento adicional" />
          </div>

          <div class="lg:col-span-2">
            <label for="acomp-observacoes" class="mb-1 block text-sm font-medium text-slate-700">Observacoes</label>
            <div class="relative">
              <FileText size={16} class="absolute left-3 top-3 text-slate-400" />
              <textarea
                id="acomp-observacoes"
                bind:value={form.observacoes}
                rows="3"
                class="vtur-input w-full pl-10"
                placeholder="Informacoes adicionais sobre o acompanhante..."
              ></textarea>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-7">
            <input id="acomp-ativo" type="checkbox" bind:checked={form.ativo} class="h-4 w-4 rounded border-slate-300 text-clientes-600" />
            <label for="acomp-ativo" class="text-sm text-slate-700">Acompanhante ativo</label>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <Button type="button" variant="primary" color="clientes" on:click={salvarAcompanhante} loading={saving}>
            <Save size={16} class="mr-2" />
            {selectedId ? 'Salvar alteracoes' : 'Salvar acompanhante'}
          </Button>
        </div>
      </div>
    {:else if acompanhantes.length === 0}
      <div class="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        <Users size={24} class="mx-auto mb-2 text-slate-400" />
        Nenhum acompanhante vinculado a este cliente.
      </div>
    {/if}
  </div>
</Card>
