<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  export let mode: 'produtos' | 'destinos' = 'produtos';
  export let produtoId: string | null = null;

  type Option = {
    id: string;
    nome?: string | null;
    tipo?: string | null;
    nome_fantasia?: string | null;
    nome_completo?: string | null;
    estado?: string | null;
    uf?: string | null;
    subdivisao_nome?: string | null;
    subdivisao?: { nome?: string | null; sigla?: string | null } | null;
  };

  type Tarifa = {
    id?: string;
    acomodacao: string;
    qte_pax: number;
    tipo: string;
    validade_de: string;
    validade_ate: string;
    valor_neto: number;
    padrao: 'Manual' | 'Padrao';
    margem: number | null;
    valor_venda: number;
    moeda: string;
    cambio: number;
    valor_em_reais: number;
  };

  const initialForm = {
    nome: '',
    destino: '',
    cidade_id: '',
    tipo_produto: '',
    atracao_principal: '',
    melhor_epoca: '',
    duracao_sugerida: '',
    nivel_preco: '',
    imagem_url: '',
    informacoes_importantes: '',
    ativo: true,
    fornecedor_id: '',
    fornecedor_label: '',
    todas_as_cidades: false,
    valor_neto: 0,
    margem: 0,
    valor_venda: 0,
    moeda: 'USD',
    cambio: 1,
    valor_em_reais: 0
  };

  let loading = true;
  let saving = false;
  let deleting = false;
  let showDeleteDialog = false;
  let tipos: Option[] = [];
  let cidades: Option[] = [];
  let fornecedores: Option[] = [];
  let destinosSugestoes: string[] = [];
  let atracoesSugestoes: string[] = [];
  let melhoresEpocasSugestoes: string[] = [];
  let form = { ...initialForm };
  let tarifas: Tarifa[] = [];

  $: isCreateMode = !produtoId;
  $: routeBase = mode === 'destinos' ? '/cadastros/destinos' : '/cadastros/produtos';
  $: pageTitle = isCreateMode
    ? mode === 'destinos'
      ? 'Novo destino'
      : 'Novo produto'
    : mode === 'destinos'
      ? 'Editar destino'
      : 'Editar produto';
  $: pageSubtitle = isCreateMode
    ? 'Cadastro operacional consumido por vendas, orçamentos e operação'
    : 'Atualize o cadastro operacional completo do registro';

  $: if (form.moeda === 'BRL') {
    form.cambio = 1;
    form.valor_em_reais = Number(form.valor_venda || 0);
  } else {
    form.valor_em_reais = Number(form.valor_venda || 0) * Number(form.cambio || 1);
  }

  async function loadBase() {
    const response = await fetch('/api/v1/produtos/base?all=1&page=1&pageSize=500');
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    tipos = data.tipos || [];
    cidades = data.cidades || [];
    fornecedores = data.fornecedores || [];
    destinosSugestoes = Array.from(
      new Set((data.destinosProdutos || []).map((item: any) => String(item?.destino || '').trim()).filter(Boolean))
    ) as string[];
    atracoesSugestoes = Array.from(
      new Set((data.destinosProdutos || []).map((item: any) => String(item?.atracao_principal || '').trim()).filter(Boolean))
    ) as string[];
    melhoresEpocasSugestoes = Array.from(
      new Set((data.destinosProdutos || []).map((item: any) => String(item?.melhor_epoca || '').trim()).filter(Boolean))
    ) as string[];
  }

  async function loadProduto() {
    if (!produtoId) return;
    const response = await fetch(`/api/v1/produtos/${produtoId}`);
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const fornecedorLabel = data?.fornecedor?.nome_fantasia || data?.fornecedor?.nome_completo || '';
    form = {
      nome: data.nome || '',
      destino: data.destino || '',
      cidade_id: data.cidade_id || '',
      tipo_produto: data.tipo_produto || '',
      atracao_principal: data.atracao_principal || '',
      melhor_epoca: data.melhor_epoca || '',
      duracao_sugerida: data.duracao_sugerida || '',
      nivel_preco: data.nivel_preco || '',
      imagem_url: data.imagem_url || '',
      informacoes_importantes: data.informacoes_importantes || '',
      ativo: data.ativo !== false,
      fornecedor_id: data.fornecedor_id || '',
      fornecedor_label: fornecedorLabel,
      todas_as_cidades: data.todas_as_cidades === true,
      valor_neto: Number(data.valor_neto || 0),
      margem: data.margem == null ? 0 : Number(data.margem),
      valor_venda: Number(data.valor_venda || 0),
      moeda: data.moeda || 'USD',
      cambio: Number(data.cambio || 1),
      valor_em_reais: Number(data.valor_em_reais || 0)
    };
    tarifas = (data.tarifas || []).map((item: any) => ({
      id: item.id,
      acomodacao: item.acomodacao || '',
      qte_pax: Number(item.qte_pax || 0),
      tipo: item.tipo || '',
      validade_de: item.validade_de ? String(item.validade_de).slice(0, 10) : '',
      validade_ate: item.validade_ate ? String(item.validade_ate).slice(0, 10) : '',
      valor_neto: Number(item.valor_neto || 0),
      padrao: item.padrao === 'Manual' ? 'Manual' : 'Padrao',
      margem: item.margem == null ? null : Number(item.margem),
      valor_venda: Number(item.valor_venda || 0),
      moeda: item.moeda || 'USD',
      cambio: Number(item.cambio || 1),
      valor_em_reais: Number(item.valor_em_reais || 0)
    }));
  }

  onMount(async () => {
    loading = true;
    try {
      await loadBase();
      await loadProduto();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar cadastro de produto.');
      goto(routeBase);
    } finally {
      loading = false;
    }
  });

  function cidadeLabel(id: string) {
    const cidade = cidades.find((item) => item.id === id);
    if (!cidade) return '-';
    const estado =
      cidade.estado ||
      cidade.uf ||
      cidade.subdivisao_nome ||
      cidade.subdivisao?.sigla ||
      cidade.subdivisao?.nome ||
      '';
    return estado ? `${cidade.nome} (${estado})` : cidade.nome || '-';
  }

  function handleFornecedorInput(value: string) {
    form.fornecedor_label = value;
    const normalized = value.trim().toLowerCase();
    const selected = fornecedores.find((item) => {
      const label = (item.nome_fantasia || item.nome_completo || '').trim().toLowerCase();
      return label === normalized;
    });
    form.fornecedor_id = selected?.id || '';
  }

  function addTarifa() {
    tarifas = [
      ...tarifas,
      {
        acomodacao: '',
        qte_pax: 0,
        tipo: '',
        validade_de: '',
        validade_ate: '',
        valor_neto: 0,
        padrao: 'Padrao',
        margem: null,
        valor_venda: 0,
        moeda: form.moeda || 'USD',
        cambio: Number(form.cambio || 1),
        valor_em_reais: 0
      }
    ];
  }

  function removeTarifa(index: number) {
    tarifas = tarifas.filter((_item, current) => current !== index);
  }

  function updateTarifa(index: number, key: keyof Tarifa, value: any) {
    tarifas = tarifas.map((item, current) => {
      if (current !== index) return item;
      const next = { ...item, [key]: value };
      if (next.moeda === 'BRL') {
        next.cambio = 1;
        next.valor_em_reais = Number(next.valor_venda || 0);
      } else {
        next.valor_em_reais = Number(next.valor_venda || 0) * Number(next.cambio || 1);
      }
      return next;
    });
  }

  async function saveTarifas(savedId: string) {
    const response = await fetch('/api/v1/produtos/tarifas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        produto_id: savedId,
        tarifas
      })
    });
    if (!response.ok) throw new Error(await response.text());
  }

  async function handleSubmit() {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório.');
    if (!form.destino.trim()) return toast.error('Destino é obrigatório.');
    if (!form.tipo_produto) return toast.error('Tipo de produto é obrigatório.');
    if (!form.todas_as_cidades && !form.cidade_id) return toast.error('Cidade é obrigatória para produtos por cidade.');

    saving = true;
    try {
      const payload = {
        ...form,
        cidade_id: form.todas_as_cidades ? null : form.cidade_id,
        fornecedor_id: form.fornecedor_id || null,
        margem: form.margem === 0 ? null : form.margem
      };

      const response = await fetch(isCreateMode ? '/api/v1/produtos/create' : `/api/v1/produtos/${produtoId}`, {
        method: isCreateMode ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const savedId = String(data?.data?.id || data?.data?.data?.id || data?.data?.produto?.id || data?.data?.id || produtoId || '');
      if (savedId) await saveTarifas(savedId);

      toast.success(isCreateMode ? 'Cadastro salvo com sucesso.' : 'Cadastro atualizado com sucesso.');
      goto(routeBase);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar cadastro.');
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!produtoId) return;
    deleting = true;
    try {
      const response = await fetch(`/api/v1/produtos/${produtoId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Registro excluído com sucesso.');
      goto(routeBase);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir registro.');
    } finally {
      deleting = false;
      showDeleteDialog = false;
    }
  }
</script>

<svelte:head>
  <title>{pageTitle} | VTUR</title>
</svelte:head>

<PageHeader
  title={pageTitle}
  subtitle={pageSubtitle}
  color="financeiro"
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: mode === 'destinos' ? 'Destinos' : 'Produtos', href: routeBase },
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
      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <label for="produto-tipo" class="mb-1 block text-sm font-medium text-slate-700">Tipo de produto *</label>
          <select id="produto-tipo" bind:value={form.tipo_produto} class="vtur-input w-full">
            <option value="">Selecione...</option>
            {#each tipos as tipo}
              <option value={tipo.id}>{tipo.nome || tipo.tipo}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="produto-destino" class="mb-1 block text-sm font-medium text-slate-700">Destino *</label>
          <input id="produto-destino" bind:value={form.destino} class="vtur-input w-full" list="destinos-list" placeholder="Ex: Disney, Gramado, Global" disabled={form.todas_as_cidades} />
          <datalist id="destinos-list">
            {#each destinosSugestoes as destino}
              <option value={destino}></option>
            {/each}
          </datalist>
        </div>
        <div>
          <label for="produto-abrangencia" class="mb-1 block text-sm font-medium text-slate-700">Abrangência</label>
          <select
            id="produto-abrangencia"
            bind:value={form.todas_as_cidades}
            class="vtur-input w-full"
            on:change={(event) => {
              const isGlobal = event.currentTarget.value === 'true';
              form.todas_as_cidades = isGlobal;
              if (isGlobal) {
                form.cidade_id = '';
                form.destino = 'Global';
              }
            }}
          >
            <option value={false}>Por cidade</option>
            <option value={true}>Global</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label for="produto-nome" class="mb-1 block text-sm font-medium text-slate-700">Nome *</label>
          <input id="produto-nome" bind:value={form.nome} class="vtur-input w-full" placeholder="Ex: Passeio em Paris, Pacote Disney, Hotel em Gramado" />
        </div>
        <div>
          <label for="produto-cidade" class="mb-1 block text-sm font-medium text-slate-700">Cidade {!form.todas_as_cidades ? '*' : ''}</label>
          <select id="produto-cidade" bind:value={form.cidade_id} class="vtur-input w-full" disabled={form.todas_as_cidades}>
            <option value="">Selecione...</option>
            {#each cidades as cidade}
              <option value={cidade.id}>{cidadeLabel(cidade.id)}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="produto-fornecedor" class="mb-1 block text-sm font-medium text-slate-700">Fornecedor</label>
          <input id="produto-fornecedor" bind:value={form.fornecedor_label} class="vtur-input w-full" list="fornecedores-list" placeholder="Opcional" on:input={(event) => handleFornecedorInput(event.currentTarget.value)} />
          <datalist id="fornecedores-list">
            {#each fornecedores as fornecedor}
              <option value={fornecedor.nome_fantasia || fornecedor.nome_completo || ''}></option>
            {/each}
          </datalist>
        </div>
        <div>
          <label for="produto-atracao" class="mb-1 block text-sm font-medium text-slate-700">Atração principal</label>
          <input id="produto-atracao" bind:value={form.atracao_principal} class="vtur-input w-full" list="atracoes-list" placeholder="Opcional" />
          <datalist id="atracoes-list">
            {#each atracoesSugestoes as item}
              <option value={item}></option>
            {/each}
          </datalist>
        </div>
        <div>
          <label for="produto-epoca" class="mb-1 block text-sm font-medium text-slate-700">Melhor época</label>
          <input id="produto-epoca" bind:value={form.melhor_epoca} class="vtur-input w-full" list="epocas-list" placeholder="Opcional" />
          <datalist id="epocas-list">
            {#each melhoresEpocasSugestoes as item}
              <option value={item}></option>
            {/each}
          </datalist>
        </div>

        <div>
          <label for="produto-duracao" class="mb-1 block text-sm font-medium text-slate-700">Duração sugerida</label>
          <input id="produto-duracao" bind:value={form.duracao_sugerida} class="vtur-input w-full" placeholder="Ex: 5 dias / 4 noites" />
        </div>
        <div>
          <label for="produto-nivel" class="mb-1 block text-sm font-medium text-slate-700">Nível de preço</label>
          <select id="produto-nivel" bind:value={form.nivel_preco} class="vtur-input w-full">
            <option value="">Selecione...</option>
            <option value="Economico">Econômico</option>
            <option value="Intermediario">Intermediário</option>
            <option value="Variavel">Variável</option>
            <option value="Premium">Premium</option>
            <option value="Super Premium">Super Premium</option>
          </select>
        </div>
        <div>
          <label for="produto-imagem" class="mb-1 block text-sm font-medium text-slate-700">Imagem</label>
          <input id="produto-imagem" bind:value={form.imagem_url} class="vtur-input w-full" placeholder="URL da imagem" />
        </div>

        <div>
          <label for="produto-valor-neto" class="mb-1 block text-sm font-medium text-slate-700">Valor líquido</label>
          <input id="produto-valor-neto" bind:value={form.valor_neto} type="number" step="0.01" class="vtur-input w-full" />
        </div>
        <div>
          <label for="produto-margem" class="mb-1 block text-sm font-medium text-slate-700">Margem</label>
          <input id="produto-margem" bind:value={form.margem} type="number" step="0.01" class="vtur-input w-full" />
        </div>
        <div>
          <label for="produto-valor-venda" class="mb-1 block text-sm font-medium text-slate-700">Valor de venda</label>
          <input id="produto-valor-venda" bind:value={form.valor_venda} type="number" step="0.01" class="vtur-input w-full" />
        </div>

        <div>
          <label for="produto-moeda" class="mb-1 block text-sm font-medium text-slate-700">Moeda</label>
          <select id="produto-moeda" bind:value={form.moeda} class="vtur-input w-full">
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label for="produto-cambio" class="mb-1 block text-sm font-medium text-slate-700">Câmbio</label>
          <input id="produto-cambio" bind:value={form.cambio} type="number" step="0.0001" class="vtur-input w-full" disabled={form.moeda === 'BRL'} />
        </div>
        <div>
          <label for="produto-valor-reais" class="mb-1 block text-sm font-medium text-slate-700">Valor em reais</label>
          <input id="produto-valor-reais" bind:value={form.valor_em_reais} type="number" step="0.01" class="vtur-input w-full" disabled />
        </div>

        <div class="md:col-span-3">
          <label for="produto-info" class="mb-1 block text-sm font-medium text-slate-700">Informações importantes</label>
          <textarea id="produto-info" bind:value={form.informacoes_importantes} class="vtur-input min-h-[140px] w-full" placeholder="Orientações operacionais, observações de venda, detalhes úteis para voucher e execução"></textarea>
        </div>

        <div>
          <label for="produto-status" class="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select id="produto-status" bind:value={form.ativo} class="vtur-input w-full">
            <option value={true}>Ativo</option>
            <option value={false}>Inativo</option>
          </select>
        </div>
        <div class="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p class="font-medium text-slate-900">Impacto operacional</p>
          <p class="mt-1">Este cadastro alimenta Vendas e listas base. Produtos globais aparecem para qualquer cidade; produtos por cidade dependem do vínculo em `cidade_id`.</p>
        </div>
      </div>
    </Card>

    <Card color="financeiro" class="mb-6">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-slate-900">Tarifas</h3>
          <p class="text-sm text-slate-500">Use tarifas quando o produto exigir grade por acomodação, pax, período e moeda.</p>
        </div>
        <Button type="button" variant="secondary" on:click={addTarifa}>
          <Plus size={16} class="mr-2" />
          Adicionar tarifa
        </Button>
      </div>

      {#if tarifas.length === 0}
        <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          Nenhuma tarifa cadastrada. O produto pode funcionar apenas com os valores base acima.
        </div>
      {:else}
        <div class="space-y-4">
          {#each tarifas as tarifa, index}
            <div class="rounded-xl border border-slate-200 p-4">
              <div class="mb-4 flex items-center justify-between">
                <p class="font-medium text-slate-900">Tarifa {index + 1}</p>
                <button type="button" class="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" on:click={() => removeTarifa(index)}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                <input class="vtur-input w-full" placeholder="Acomodação" value={tarifa.acomodacao} on:input={(e) => updateTarifa(index, 'acomodacao', e.currentTarget.value)} />
                <input class="vtur-input w-full" placeholder="Tipo" value={tarifa.tipo} on:input={(e) => updateTarifa(index, 'tipo', e.currentTarget.value)} />
                <input class="vtur-input w-full" type="number" min="0" placeholder="Qtd pax" value={tarifa.qte_pax} on:input={(e) => updateTarifa(index, 'qte_pax', Number(e.currentTarget.value || 0))} />
                <select class="vtur-input w-full" value={tarifa.padrao} on:change={(e) => updateTarifa(index, 'padrao', e.currentTarget.value)}>
                  <option value="Padrao">Padrão</option>
                  <option value="Manual">Manual</option>
                </select>
                <input class="vtur-input w-full" type="date" value={tarifa.validade_de} on:input={(e) => updateTarifa(index, 'validade_de', e.currentTarget.value)} />
                <input class="vtur-input w-full" type="date" value={tarifa.validade_ate} on:input={(e) => updateTarifa(index, 'validade_ate', e.currentTarget.value)} />
                <input class="vtur-input w-full" type="number" step="0.01" placeholder="Valor líquido" value={tarifa.valor_neto} on:input={(e) => updateTarifa(index, 'valor_neto', Number(e.currentTarget.value || 0))} />
                <input class="vtur-input w-full" type="number" step="0.01" placeholder="Margem" value={tarifa.margem ?? ''} on:input={(e) => updateTarifa(index, 'margem', e.currentTarget.value === '' ? null : Number(e.currentTarget.value))} />
                <input class="vtur-input w-full" type="number" step="0.01" placeholder="Valor de venda" value={tarifa.valor_venda} on:input={(e) => updateTarifa(index, 'valor_venda', Number(e.currentTarget.value || 0))} />
                <select class="vtur-input w-full" value={tarifa.moeda} on:change={(e) => updateTarifa(index, 'moeda', e.currentTarget.value)}>
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <input class="vtur-input w-full" type="number" step="0.0001" placeholder="Câmbio" value={tarifa.cambio} on:input={(e) => updateTarifa(index, 'cambio', Number(e.currentTarget.value || 1))} disabled={tarifa.moeda === 'BRL'} />
                <input class="vtur-input w-full" type="number" step="0.01" placeholder="Valor em reais" value={tarifa.valor_em_reais} disabled />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-3">
        <Button variant="secondary" type="button" on:click={() => goto(routeBase)}>
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
        Salvar cadastro
      </Button>
    </div>
  </form>
{/if}

<Dialog
  bind:open={showDeleteDialog}
  title="Excluir cadastro"
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
    Tem certeza que deseja excluir este registro? Se houver vínculos com vendas, orçamentos ou operação, a exclusão pode ser bloqueada pelo banco.
  </p>
</Dialog>
