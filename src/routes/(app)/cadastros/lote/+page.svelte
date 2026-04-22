<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { toast } from '$lib/stores/ui';
  import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-svelte';

  type TipoProduto = { id: string; nome: string };
  type Subdivisao = { id: string; nome: string };

  let tipos: TipoProduto[] = [];
  let subdivisoes: Subdivisao[] = [];
  let loading = false;
  let saving = false;
  let resultado: { criados: number; atualizados: number; erros: string[] } | null = null;

  // Formulário de lote
  let tipoId = '';
  let subdivisaoId = '';
  let textoProdutos = '';

  async function loadBase() {
    const [tiposRes, subRes] = await Promise.all([
      fetch('/api/v1/tipo-produtos?all=1'),
      fetch('/api/v1/subdivisoes')
    ]);
    if (tiposRes.ok) { const d = await tiposRes.json(); tipos = d.items || []; }
    if (subRes.ok) { const d = await subRes.json(); subdivisoes = d.items || []; }
  }

  async function importarLote() {
    if (!textoProdutos.trim()) { toast.error('Cole a lista de produtos.'); return; }
    if (!tipoId) { toast.error('Selecione o tipo de produto.'); return; }

    const linhas = textoProdutos.split('\n').map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) { toast.error('Nenhuma linha válida encontrada.'); return; }

    saving = true;
    resultado = null;

    try {
      const produtos = linhas.map((nome) => ({
        nome,
        tipo_produto_id: tipoId,
        cidade_id: null,
        todas_as_cidades: true,
        ativo: true
      }));

      const response = await fetch('/api/v1/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtos, subdivisao_id: subdivisaoId || null })
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();

      resultado = {
        criados: data.criados || linhas.length,
        atualizados: data.atualizados || 0,
        erros: data.erros || []
      };

      toast.success(`${resultado.criados} produto(s) importado(s).`);
      textoProdutos = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar produtos.');
    } finally {
      saving = false;
    }
  }

  function downloadTemplate() {
    const csv = 'Nome do Produto\nPacote Europa Clássica\nHotel Copacabana Palace\nPassagem Aérea GRU-LIS';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_produtos.csv';
    link.click();
  }

  onMount(loadBase);
</script>

<svelte:head>
  <title>Importação em Lote | VTUR</title>
</svelte:head>

<PageHeader
  title="Importação em Lote"
  subtitle="Importe múltiplos produtos de uma vez colando a lista ou fazendo upload de arquivo."
  breadcrumbs={[
    { label: 'Cadastros', href: '/cadastros' },
    { label: 'Importação em Lote' }
  ]}
/>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div class="lg:col-span-2 space-y-6">
    <Card title="Configuração da importação">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="lote-tipo">Tipo de produto *</label>
          <select id="lote-tipo" bind:value={tipoId} class="vtur-input w-full">
            <option value="">Selecione uma opção</option>
            {#each tipos as t}
              <option value={t.id}>{t.nome}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="lote-sub">Estado/Subdivisão (opcional)</label>
          <select id="lote-sub" bind:value={subdivisaoId} class="vtur-input w-full">
            <option value="">Todas as cidades</option>
            {#each subdivisoes as s}
              <option value={s.id}>{s.nome}</option>
            {/each}
          </select>
        </div>
      </div>
    </Card>

    <Card title="Lista de produtos">
      <p class="text-sm text-slate-500 mb-3">Cole um produto por linha. O nome será usado diretamente.</p>
      <textarea
        bind:value={textoProdutos}
        rows="12"
        class="vtur-input w-full font-mono text-sm"
        placeholder="Pacote Europa Clássica&#10;Hotel Copacabana Palace&#10;Passagem Aérea GRU-LIS&#10;..."
      ></textarea>
      <p class="mt-1 text-xs text-slate-500">
        {textoProdutos.split('\n').filter((l) => l.trim()).length} produto(s) na lista
      </p>
    </Card>

    <div class="flex justify-end gap-3">
      <Button variant="secondary" on:click={downloadTemplate}>
        <Download size={16} class="mr-2" />
        Baixar template
      </Button>
      <Button variant="primary" loading={saving} on:click={importarLote}>
        <Upload size={16} class="mr-2" />
        Importar produtos
      </Button>
    </div>
  </div>

  <div class="space-y-6">
    <Card title="Instruções">
      <div class="space-y-3 text-sm text-slate-600">
        <p>1. Selecione o <strong>tipo de produto</strong> que será aplicado a todos os itens.</p>
        <p>2. Opcionalmente, selecione um <strong>estado/subdivisão</strong> para vincular os produtos a uma região.</p>
        <p>3. Cole a lista de produtos, <strong>um por linha</strong>.</p>
        <p>4. Clique em <strong>Importar produtos</strong>.</p>
        <p class="text-amber-600">Produtos com o mesmo nome já existentes serão ignorados.</p>
      </div>
    </Card>

    {#if resultado}
      <Card title="Resultado da importação">
        <div class="space-y-3">
          <div class="flex items-center gap-2 text-green-700">
            <CheckCircle size={18} />
            <span class="font-medium">{resultado.criados} criado(s)</span>
          </div>
          {#if resultado.atualizados > 0}
            <div class="flex items-center gap-2 text-blue-700">
              <CheckCircle size={18} />
              <span class="font-medium">{resultado.atualizados} atualizado(s)</span>
            </div>
          {/if}
          {#if resultado.erros.length > 0}
            <div class="space-y-1">
              <div class="flex items-center gap-2 text-red-700">
                <AlertCircle size={18} />
                <span class="font-medium">{resultado.erros.length} erro(s)</span>
              </div>
              {#each resultado.erros as erro}
                <p class="text-xs text-red-600 ml-6">{erro}</p>
              {/each}
            </div>
          {/if}
        </div>
      </Card>
    {/if}
  </div>
</div>
