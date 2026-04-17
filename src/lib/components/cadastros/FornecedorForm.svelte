<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { ArrowLeft, Save, Trash2 } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  export let fornecedorId: string | null = null;

  type CidadeBusca = {
    id: string;
    nome: string;
    subdivisao_nome?: string | null;
    pais_nome?: string | null;
    label?: string | null;
  };

  const initialForm = {
    nome_completo: '',
    nome_fantasia: '',
    localizacao: 'brasil',
    cnpj: '',
    cep: '',
    cidade: '',
    estado: '',
    telefone: '',
    whatsapp: '',
    telefone_emergencia: '',
    responsavel: '',
    tipo_faturamento: 'pre_pago',
    principais_servicos: '',
    ativo: true
  };

  let loading = true;
  let saving = false;
  let deleting = false;
  let showDeleteDialog = false;
  let form = { ...initialForm };
  let cidadeBusca = '';
  let resultadosCidade: CidadeBusca[] = [];
  let buscandoCidade = false;
  let erroCidadeBusca = '';
  let showCidadeOptions = false;
  let produtosRelacionados: any[] = [];
  let vouchersRelacionados: any[] = [];
  let cidadeSearchTimer: ReturnType<typeof setTimeout> | null = null;

  $: isCreateMode = !fornecedorId;
  $: title = isCreateMode ? 'Novo fornecedor' : 'Editar fornecedor';

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  }

  async function loadFornecedor() {
    if (!fornecedorId) return;
    const response = await fetch(`/api/v1/fornecedores/${fornecedorId}`);
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    const data = result.data;
    form = {
      nome_completo: data.nome_completo || '',
      nome_fantasia: data.nome_fantasia || '',
      localizacao: data.localizacao || 'brasil',
      cnpj: data.cnpj || '',
      cep: data.cep || '',
      cidade: data.cidade || '',
      estado: data.estado || '',
      telefone: data.telefone || '',
      whatsapp: data.whatsapp || '',
      telefone_emergencia: data.telefone_emergencia || '',
      responsavel: data.responsavel || '',
      tipo_faturamento: data.tipo_faturamento || 'pre_pago',
      principais_servicos: data.principais_servicos || '',
      ativo: data.ativo !== false
    };
    cidadeBusca = data.cidade ? (data.estado ? `${data.cidade} (${data.estado})` : data.cidade) : '';
    produtosRelacionados = data.produtos || [];
    vouchersRelacionados = data.vouchers || [];
  }

  onMount(async () => {
    try {
      if (fornecedorId) await loadFornecedor();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar fornecedor.');
      goto('/cadastros/fornecedores');
    } finally {
      loading = false;
    }
  });

  function handleCidadeInput(value: string) {
    cidadeBusca = value;
    showCidadeOptions = true;
    form.cidade = '';
    form.estado = '';
    loadCidadeOptions();
  }

  function selectCidade(cidade: CidadeBusca) {
    form.cidade = cidade.nome || '';
    form.estado = cidade.subdivisao_nome || '';
    cidadeBusca = cidade.label || (cidade.subdivisao_nome ? `${cidade.nome} (${cidade.subdivisao_nome})` : cidade.nome);
    resultadosCidade = [];
    showCidadeOptions = false;
    erroCidadeBusca = '';
  }

  async function loadCidadeOptions() {
    if (cidadeSearchTimer) clearTimeout(cidadeSearchTimer);

    if (!showCidadeOptions || cidadeBusca.trim().length < 2) {
      resultadosCidade = [];
      buscandoCidade = false;
      erroCidadeBusca = '';
      return;
    }

    const query = cidadeBusca.trim();
    cidadeSearchTimer = setTimeout(async () => {
      buscandoCidade = true;
      erroCidadeBusca = '';
      try {
        const response = await fetch(`/api/v1/vendas/cidades-busca?q=${encodeURIComponent(query)}&limite=10`);
        if (!response.ok) throw new Error(await response.text());
        resultadosCidade = (await response.json()) || [];
      } catch (err) {
        console.error(err);
        resultadosCidade = [];
        erroCidadeBusca = 'Erro ao buscar cidades.';
      } finally {
        buscandoCidade = false;
      }
    }, 300);
  }

  async function handleSubmit() {
    if (!form.nome_completo.trim()) return toast.error('Nome completo é obrigatório.');
    if (!form.nome_fantasia.trim()) return toast.error('Nome fantasia é obrigatório.');
    if (!form.cidade.trim()) return toast.error('Cidade é obrigatória.');
    if (!form.estado.trim()) return toast.error('Estado é obrigatório.');
    if (!form.telefone.trim()) return toast.error('Telefone é obrigatório.');
    if (!form.whatsapp.trim()) return toast.error('WhatsApp é obrigatório.');
    if (!form.telefone_emergencia.trim()) return toast.error('Telefone de emergência é obrigatório.');
    if (!form.responsavel.trim()) return toast.error('Responsável é obrigatório.');
    if (!form.principais_servicos.trim()) return toast.error('Principais serviços são obrigatórios.');
    if (form.localizacao === 'brasil' && !form.cnpj.trim()) return toast.error('CNPJ é obrigatório para fornecedores do Brasil.');
    if (form.localizacao === 'brasil' && !form.cep.trim()) return toast.error('CEP é obrigatório para fornecedores do Brasil.');

    saving = true;
    try {
      const response = await fetch(isCreateMode ? '/api/v1/fornecedores/create' : `/api/v1/fornecedores/${fornecedorId}`, {
        method: isCreateMode ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success(isCreateMode ? 'Fornecedor cadastrado com sucesso.' : 'Fornecedor atualizado com sucesso.');
      goto('/cadastros/fornecedores');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar fornecedor.');
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!fornecedorId) return;
    deleting = true;
    try {
      const response = await fetch(`/api/v1/fornecedores/${fornecedorId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Fornecedor excluído com sucesso.');
      goto('/cadastros/fornecedores');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao excluir fornecedor.');
    } finally {
      deleting = false;
      showDeleteDialog = false;
    }
  }
</script>

<svelte:head>
  <title>{title} | VTUR</title>
</svelte:head>

<PageHeader
  title={title}
  subtitle="Centralize contato, faturamento, localização e serviços do parceiro em um único cadastro"
  color="financeiro"
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: 'Fornecedores', href: '/cadastros/fornecedores' },
    { label: isCreateMode ? 'Novo' : 'Editar' }
  ]}
/>

{#if loading}
  <div class="flex justify-center py-12">
    <div class="h-12 w-12 animate-spin rounded-full border-b-2 border-financeiro-600"></div>
  </div>
{:else}
  <form on:submit|preventDefault={handleSubmit}>
    <Card color="financeiro" class="mb-6">
      <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <button type="button" class="rounded-xl border px-4 py-3 text-left transition" class:border-financeiro-500={form.localizacao === 'brasil'} on:click={() => (form.localizacao = 'brasil')}>
          <div class="font-medium text-slate-900">Brasil</div>
          <div class="text-sm text-slate-500">Usa CNPJ, CEP e cidade nacional.</div>
        </button>
        <button type="button" class="rounded-xl border px-4 py-3 text-left transition" class:border-financeiro-500={form.localizacao === 'exterior'} on:click={() => (form.localizacao = 'exterior')}>
          <div class="font-medium text-slate-900">Exterior</div>
          <div class="text-sm text-slate-500">Permite cadastro internacional sem exigir documento fiscal brasileiro.</div>
        </button>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label for="forn-nome-completo" class="mb-1 block text-sm font-medium text-slate-700">Nome completo</label>
          <input id="forn-nome-completo" bind:value={form.nome_completo} class="vtur-input w-full" placeholder="Razão social" />
        </div>
        <div>
          <label for="forn-fantasia" class="mb-1 block text-sm font-medium text-slate-700">Nome fantasia</label>
          <input id="forn-fantasia" bind:value={form.nome_fantasia} class="vtur-input w-full" placeholder="Nome comercial" />
        </div>

        {#if form.localizacao === 'brasil'}
          <div>
            <label for="forn-cnpj" class="mb-1 block text-sm font-medium text-slate-700">CNPJ</label>
            <input id="forn-cnpj" bind:value={form.cnpj} class="vtur-input w-full" placeholder="00.000.000/0000-00" />
          </div>
          <div>
            <label for="forn-cep" class="mb-1 block text-sm font-medium text-slate-700">CEP</label>
            <input id="forn-cep" bind:value={form.cep} class="vtur-input w-full" placeholder="00000-000" />
          </div>
        {/if}

        <div class="relative">
          <label for="forn-cidade" class="mb-1 block text-sm font-medium text-slate-700">Cidade</label>
          <input id="forn-cidade" value={cidadeBusca} class="vtur-input w-full" placeholder="Buscar cidade..." on:input={(e) => handleCidadeInput(e.currentTarget.value)} on:focus={() => (showCidadeOptions = true)} on:blur={() => setTimeout(() => (showCidadeOptions = false), 150)} />
          {#if showCidadeOptions}
            <div class="absolute z-10 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {#if buscandoCidade}
                <div class="px-3 py-2 text-sm text-slate-500">Buscando cidades...</div>
              {:else if erroCidadeBusca}
                <div class="px-3 py-2 text-sm text-red-500">{erroCidadeBusca}</div>
              {:else if resultadosCidade.length === 0}
                <div class="px-3 py-2 text-sm text-slate-500">Nenhuma cidade encontrada.</div>
              {:else}
                {#each resultadosCidade as cidade}
                  <button type="button" class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" on:mousedown|preventDefault={() => selectCidade(cidade)}>
                    <div class="font-medium text-slate-900">{cidade.label || cidade.nome}</div>
                    {#if cidade.pais_nome}
                      <div class="text-xs text-slate-500">{cidade.pais_nome}</div>
                    {/if}
                  </button>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
        <div>
          <label for="forn-estado" class="mb-1 block text-sm font-medium text-slate-700">Estado</label>
          <input id="forn-estado" bind:value={form.estado} class="vtur-input w-full" placeholder="UF / região" readonly />
        </div>

        <div>
          <label for="forn-telefone" class="mb-1 block text-sm font-medium text-slate-700">Telefone</label>
          <input id="forn-telefone" value={form.telefone} class="vtur-input w-full" on:input={(e) => (form.telefone = formatPhone(e.currentTarget.value))} />
        </div>
        <div>
          <label for="forn-whatsapp" class="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label>
          <input id="forn-whatsapp" value={form.whatsapp} class="vtur-input w-full" on:input={(e) => (form.whatsapp = formatPhone(e.currentTarget.value))} />
        </div>
        <div>
          <label for="forn-emergencia" class="mb-1 block text-sm font-medium text-slate-700">Telefone emergência</label>
          <input id="forn-emergencia" value={form.telefone_emergencia} class="vtur-input w-full" on:input={(e) => (form.telefone_emergencia = formatPhone(e.currentTarget.value))} />
        </div>
        <div>
          <label for="forn-responsavel" class="mb-1 block text-sm font-medium text-slate-700">Responsável</label>
          <input id="forn-responsavel" bind:value={form.responsavel} class="vtur-input w-full" placeholder="Pessoa de contato" />
        </div>

        <div>
          <label for="forn-faturamento" class="mb-1 block text-sm font-medium text-slate-700">Tipo de faturamento</label>
          <select id="forn-faturamento" bind:value={form.tipo_faturamento} class="vtur-input w-full">
            <option value="pre_pago">Pré-pago</option>
            <option value="semanal">Semanal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="mensal">Mensal</option>
          </select>
        </div>
        <div>
          <label for="forn-status" class="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select id="forn-status" bind:value={form.ativo} class="vtur-input w-full">
            <option value={true}>Ativo</option>
            <option value={false}>Inativo</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label for="forn-servicos" class="mb-1 block text-sm font-medium text-slate-700">Principais serviços</label>
          <textarea id="forn-servicos" bind:value={form.principais_servicos} rows="4" class="vtur-input w-full" placeholder="Descreva serviços, especialidades, janelas de atendimento e observações relevantes"></textarea>
        </div>
      </div>
    </Card>

    {#if !isCreateMode}
      <Card color="financeiro" class="mb-6">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 class="text-lg font-semibold text-slate-900">Produtos vinculados</h3>
            {#if produtosRelacionados.length === 0}
              <p class="mt-2 text-sm text-slate-500">Nenhum produto vinculado.</p>
            {:else}
              <div class="mt-3 space-y-2">
                {#each produtosRelacionados as produto}
                  <div class="rounded-lg border border-slate-200 p-3">
                    <div class="font-medium text-slate-900">{produto.nome}</div>
                    <div class="text-sm text-slate-500">{produto.destino || 'Sem destino'} · {produto.ativo === false ? 'Inativo' : 'Ativo'}</div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
          <div>
            <h3 class="text-lg font-semibold text-slate-900">Vouchers recentes</h3>
            {#if vouchersRelacionados.length === 0}
              <p class="mt-2 text-sm text-slate-500">Nenhum voucher recente.</p>
            {:else}
              <div class="mt-3 space-y-2">
                {#each vouchersRelacionados as voucher}
                  <div class="rounded-lg border border-slate-200 p-3">
                    <div class="font-medium text-slate-900">{voucher.codigo || voucher.id}</div>
                    <div class="text-sm text-slate-500">{voucher.status || 'Sem status'}{voucher.data_utilizacao ? ` · ${new Date(voucher.data_utilizacao).toLocaleDateString('pt-BR')}` : ''}</div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </Card>
    {/if}

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-3">
        <Button variant="secondary" type="button" on:click={() => goto('/cadastros/fornecedores')}>
          <ArrowLeft size={18} class="mr-2" />
          Voltar
        </Button>
        {#if !isCreateMode}
          <Button variant="ghost" type="button" on:click={() => (showDeleteDialog = true)}>
            <Trash2 size={18} class="mr-2" />
            Excluir
          </Button>
        {/if}
      </div>
      <Button variant="primary" color="financeiro" type="submit" loading={saving}>
        <Save size={18} class="mr-2" />
        Salvar fornecedor
      </Button>
    </div>
  </form>
{/if}

<Dialog
  bind:open={showDeleteDialog}
  title="Excluir fornecedor"
  size="sm"
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText={deleting ? 'Excluindo...' : 'Excluir'}
  onConfirm={handleDelete}
  onCancel={() => (showDeleteDialog = false)}
>
  <p class="text-slate-600">
    Tem certeza que deseja excluir este fornecedor? Se houver produtos vinculados, a exclusão será bloqueada.
  </p>
</Dialog>
