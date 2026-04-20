<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { PageHeader, Card, Button, Dialog } from '$lib/components/ui';
  import { Dropzone } from 'flowbite-svelte';
  import {
    ArrowLeft,
    Upload,
    FileText,
    AlertCircle,
    CheckCircle,
    X,
    Eye,
    Trash2,
    Plus,
    MapPin,
    Calendar,
    User,
    Ship,
    FileSpreadsheet
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { extractContratosFromText, extractContratosFromPdf, extractPdfText } from '$lib/vendas/contratoCvcExtractor';
  import { extractCruzeiroFromText, extractCruzeiroFromPdf } from '$lib/vendas/cruzeiroExtractor';
  import type { ContratoDraft } from '$lib/vendas/contratoCvcExtractor';

  type ContratoDraftUI = ContratoDraft & { aplica_du?: boolean | null };

  type CidadeSugestao = {
    id: string;
    nome: string;
    subdivisao_nome?: string | null;
    pais_nome?: string | null;
  };

  type Produto = {
    id: string;
    nome: string;
    cidade_id: string | null;
    todas_as_cidades?: boolean | null;
  };

  type TipoPacote = {
    id: string;
    nome: string;
    ativo?: boolean | null;
  };

  type VendedorOption = {
    id: string;
    nome_completo: string | null;
  };

  type CadastroBasePayload = {
    user?: {
      id?: string | null;
      can_assign_vendedor?: boolean;
    } | null;
    vendedoresEquipe?: VendedorOption[];
    produtos?: Produto[];
    tiposPacote?: TipoPacote[];
    warning?: string | null;
  };

  let tipoImportacao: 'cvc' | 'roteiro' = 'cvc';
  let file: File | null = null;
  let selectedFiles: FileList | undefined = undefined;
  let textInput = '';
  let contratos: ContratoDraftUI[] = [];
  let principalIndex = 0;
  let extracting = false;
  let saving = false;
  let previewOpen = false;
  let previewText = '';
  let previewing = false;
  let statusMessage = '';
  let warningMessage = '';
  let duplicateModal: { message: string } | null = null;

  let produtos: Produto[] = [];
  let tiposPacote: TipoPacote[] = [];
  let currentUserId = '';
  let canAssignVendedor = false;
  let vendedoresEquipe: VendedorOption[] = [];
  let vendedorId = '';

  let buscaCidade = '';
  let cidadeId = '';
  let cidadeNome = '';
  let cidadeSelecionadaLabel = '';
  let mostrarSugestoesCidade = false;
  let resultadosCidade: CidadeSugestao[] = [];
  let buscandoCidade = false;
  let cidadeManual = false;

  let buscaDestino = '';
  let destinoId = '';
  let destinoManual = false;

  let dataVenda = '';
  let contatoModalOpen = false;
  let contatoTelefone = '';
  let contatoWhatsapp = '';
  let contatoEmail = '';

  let cidadeAutoIndefinida = false;

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('vendas', 'edit') || permissoes.can('vendas_consulta', 'edit');

  $: produtosFiltrados = cidadeId
    ? produtos.filter(
        (p) => p.cidade_id === cidadeId || p.todas_as_cidades
      )
    : produtos;

  $: principal = contratos[principalIndex] || contratos[0];

  $: {
    const nextFile = selectedFiles?.[0] || null;
    if (nextFile !== file) {
      file = nextFile;
      if (file) textInput = '';
    }
  }

  $: if (principal && !cidadeManual && !cidadeAutoIndefinida) {
    const term = principal.destino || '';
    if (term && !cidadeId) {
      void buscarCidadeInicial(term);
    }
  }

  $: if (principal && isContratoLocacao(principal) && !cidadeAutoIndefinida) {
    void forcarCidadeIndefinida();
  }

  onMount(async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    dataVenda = hoje;
    await loadCadastroBase();
  });

  async function loadCadastroBase() {
    try {
      const response = await fetch('/api/v1/vendas/cadastro-base');
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as CadastroBasePayload;
      currentUserId = payload?.user?.id || '';
      canAssignVendedor = Boolean(payload?.user?.can_assign_vendedor);
      vendedoresEquipe = Array.isArray(payload?.vendedoresEquipe) ? payload.vendedoresEquipe : [];
      produtos = Array.isArray(payload?.produtos) ? payload.produtos : [];
      tiposPacote = Array.isArray(payload?.tiposPacote) ? payload.tiposPacote.filter((item) => item.ativo !== false) : [];
      warningMessage = String(payload?.warning || '').trim();
      vendedorId = currentUserId;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar contexto.');
    }
  }

  async function forcarCidadeIndefinida() {
    try {
      const response = await fetch(`/api/v1/vendas/cidades-busca?q=${encodeURIComponent('Indefinida')}&limite=10`);
      if (!response.ok) return;
      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const match = items.find((item: CidadeSugestao) => normalizeText(item.nome) === 'indefinida');
      if (match?.id) {
        cidadeAutoIndefinida = true;
        cidadeId = match.id;
        cidadeNome = match.nome;
        cidadeSelecionadaLabel = match.subdivisao_nome ? `${match.nome} (${match.subdivisao_nome})` : match.nome;
        buscaCidade = cidadeSelecionadaLabel;
      }
    } catch {
      // ignore
    }
  }

  async function buscarCidadeInicial(termo: string) {
    if (!termo || termo.length < 2) return;
    buscandoCidade = true;
    try {
      const response = await fetch(`/api/v1/vendas/cidades-busca?q=${encodeURIComponent(termo)}&limite=10`);
      if (response.ok) {
        const payload = await response.json();
        const items = Array.isArray(payload?.items) ? payload.items : [];
        if (items.length > 0) {
          const first = items[0] as CidadeSugestao;
          cidadeId = first.id;
          cidadeNome = first.nome;
          cidadeSelecionadaLabel = first.subdivisao_nome ? `${first.nome} (${first.subdivisao_nome})` : first.nome;
          buscaCidade = cidadeSelecionadaLabel;
        }
      }
    } catch {
      // ignore
    } finally {
      buscandoCidade = false;
    }
  }

  async function buscarCidade(query: string) {
    if (!query || query.length < 2) {
      resultadosCidade = [];
      return;
    }
    buscandoCidade = true;
    try {
      const response = await fetch(`/api/v1/vendas/cidades-busca?q=${encodeURIComponent(query)}&limite=20`);
      if (response.ok) {
        const payload = await response.json();
        resultadosCidade = Array.isArray(payload?.items) ? payload.items : [];
      } else {
        resultadosCidade = [];
      }
    } catch {
      resultadosCidade = [];
    } finally {
      buscandoCidade = false;
    }
  }

  let cidadeTimeout: ReturnType<typeof setTimeout> | null = null;
  function onCidadeInput() {
    cidadeManual = true;
    cidadeAutoIndefinida = false;
    mostrarSugestoesCidade = true;
    if (cidadeTimeout) clearTimeout(cidadeTimeout);
    cidadeTimeout = setTimeout(() => {
      void buscarCidade(buscaCidade);
    }, 300);
  }

  function selecionarCidade(cidade: CidadeSugestao) {
    cidadeId = cidade.id;
    cidadeNome = cidade.nome;
    cidadeSelecionadaLabel = cidade.subdivisao_nome ? `${cidade.nome} (${cidade.subdivisao_nome})` : cidade.nome;
    buscaCidade = cidadeSelecionadaLabel;
    mostrarSugestoesCidade = false;
    resultadosCidade = [];
    if (destinoId) {
      const destino = produtos.find((p) => p.id === destinoId);
      if (destino && destino.cidade_id !== cidade.id && !destino.todas_as_cidades) {
        destinoId = '';
        buscaDestino = '';
      }
    }
  }

  function onDestinoInput() {
    destinoManual = true;
    const match = produtosFiltrados.find((p) => normalizeText(p.nome) === normalizeText(buscaDestino));
    if (match) {
      destinoId = match.id;
    }
  }

  function onDestinoBlur() {
    const match = produtosFiltrados.find((p) => normalizeText(p.nome) === normalizeText(buscaDestino));
    if (match) {
      destinoId = match.id;
      buscaDestino = match.nome;
    }
  }

  function clearSelectedFile() {
    selectedFiles = undefined;
    file = null;
  }

  async function handleExtract() {
    if (!file && !textInput.trim()) {
      toast.error('Selecione um PDF ou cole o texto do contrato.');
      return;
    }
    extracting = true;
    statusMessage = '';
    try {
      let result: { contratos: ContratoDraft[]; raw_text: string } | null = null;
      if (tipoImportacao === 'cvc') {
        if (textInput.trim()) {
          result = await extractContratosFromText(textInput.trim());
        } else if (file) {
          result = await extractContratosFromPdf(file);
        }
      } else {
        if (textInput.trim()) {
          result = await extractCruzeiroFromText(textInput.trim());
        } else if (file) {
          result = await extractCruzeiroFromPdf(file);
        }
      }

      if (!result || !result.contratos.length) {
        toast.error('Nenhum contrato encontrado na fonte fornecida.');
        return;
      }

      const novos = result.contratos.map((c) => {
        const normalizedTipoPacote = normalizeText(c.tipo_pacote || '');
        const tipoPacoteMatch = tiposPacote.find((item) => normalizeText(item.nome) === normalizedTipoPacote);
        return {
          ...c,
          tipo_pacote: tipoPacoteMatch?.nome || c.tipo_pacote || (tipoImportacao === 'roteiro' ? 'Cruzeiro' : null),
          aplica_du: c.taxa_du != null && c.taxa_du > 0 ? true : null
        };
      });
      contratos = [...contratos, ...novos];
      statusMessage = contratos.length > 0
        ? `${novos.length} contrato(s) adicionado(s).`
        : `${novos.length} contrato(s) encontrado(s).`;
      toast.success(`${novos.length} contrato(s) extraído(s).`);

      clearSelectedFile();
      textInput = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro na extração.');
    } finally {
      extracting = false;
    }
  }

  async function handlePreview() {
    if (!file) {
      toast.error('Selecione um PDF para pré-visualizar.');
      return;
    }
    previewing = true;
    try {
      const text = await extractPdfText(file, { maxPages: tipoImportacao === 'roteiro' ? 6 : 4 });
      previewText = text;
      previewOpen = true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao extrair texto do PDF.');
    } finally {
      previewing = false;
    }
  }

  function handleDefinirPrincipal(index: number) {
    principalIndex = index;
    cidadeManual = false;
    destinoManual = false;
  }

  function handleRemoverContrato(index: number) {
    contratos = contratos.filter((_, i) => i !== index);
    if (principalIndex >= contratos.length) {
      principalIndex = Math.max(0, contratos.length - 1);
    }
  }

  function handleTipoPacoteChange(index: number, value: string) {
    contratos = contratos.map((c, i) => (i === index ? { ...c, tipo_pacote: value || null } : c));
  }

  function handleCpfChange(index: number, value: string) {
    const digits = value.replace(/\D/g, '');
    const formatted =
      digits.length <= 11
        ? digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        : digits.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    contratos = contratos.map((c, i) =>
      i === index
        ? {
            ...c,
            contratante: { ...c.contratante, cpf: formatted.slice(0, 18) } as any
          }
        : c
    );
  }

  function handleAplicaDuChange(index: number, value: boolean) {
    contratos = contratos.map((c, i) =>
      i === index
        ? {
            ...c,
            aplica_du: value,
            taxa_du: value ? (c.passageiros?.length || 1) * 20 : 0
          }
        : c
    );
  }

  function formatCurrency(value?: number | null) {
    if (value == null || Number.isNaN(Number(value))) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  }

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const base = value.includes('T') ? value.split('T')[0] : value;
    if (base.includes('/')) return base;
    const parts = base.split('-');
    if (parts.length !== 3) return base;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function normalizeText(value: string, opts?: { trim?: boolean; collapseWhitespace?: boolean }) {
    let out = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (opts?.collapseWhitespace) out = out.replace(/\s+/g, ' ');
    if (opts?.trim) out = out.trim();
    return out;
  }

  function isContratoLocacao(contrato: ContratoDraft) {
    const term = normalizeText(contrato.produto_principal || contrato.produto_tipo || contrato.produto_detalhes || '');
    if (term.includes('locacao') || term.includes('locadora')) return true;
    if (term.includes('rent a car') || term.includes('rental car')) return true;
    return term.includes('carro') && term.includes('alug');
  }

  function validateBeforeSave(): string | null {
    if (!cidadeId) return 'Selecione a cidade de destino.';
    if (!buscaDestino.trim()) return 'Informe o destino/principal da venda.';
    if (!isISODate(dataVenda)) return 'Data da venda inválida.';
    if (canAssignVendedor && !vendedorId) return 'Selecione o vendedor.';
    const principalContract = contratos[principalIndex] || contratos[0];
    const cpf = String(principalContract?.contratante?.cpf || '').replace(/\D/g, '');
    if (cpf.length !== 11 && cpf.length !== 14) return 'Informe um CPF/CNPJ válido para o contratante principal.';
    const missingTipo = contratos.find((c) => !c.tipo_pacote && tipoImportacao !== 'roteiro');
    if (missingTipo) return 'Todos os contratos devem ter um tipo de pacote.';
    return null;
  }

  function isISODate(value?: string | null) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
  }

  function openSaveModal() {
    const error = validateBeforeSave();
    if (error) {
      toast.error(error);
      return;
    }
    contatoModalOpen = true;
  }

  async function handleSave(skipContato = false) {
    saving = true;
    try {
      const payload = {
        contratos: contratos.map((c) => ({
          ...c,
          taxa_du: c.aplica_du ? c.taxa_du : 0
        })),
        principalIndex,
        vendedorId: canAssignVendedor ? vendedorId : currentUserId,
        destinoCidadeId: cidadeId,
        destinoProdutoId: destinoId,
        dataVenda,
        clienteTelefone: skipContato ? null : contatoTelefone || null,
        clienteWhatsapp: skipContato ? null : contatoWhatsapp || null,
        clienteEmail: skipContato ? null : contatoEmail || null
      };

      const response = await fetch('/api/v1/vendas/importar-contrato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 409 && (text === 'RECIBO_DUPLICADO' || text === 'RESERVA_DUPLICADA')) {
          duplicateModal = {
            message:
              text === 'RECIBO_DUPLICADO'
                ? 'Recibo já foi cadastrado no sistema. Só é possível cadastrar recibos novos.'
                : 'Reserva já foi cadastrada no sistema. Só é possível cadastrar reservas novas.'
          };
          return;
        }
        throw new Error(text);
      }

      const result = await response.json();
      toast.success('Venda importada com sucesso!');
      contatoModalOpen = false;
      goto(`/vendas?id=${encodeURIComponent(result.venda_id)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar importação.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Importar Contratos | VTUR</title>
</svelte:head>

<PageHeader
  title="Importar Contratos"
  subtitle="Importe contratos CVC ou reservas de cruzeiro para criar vendas automaticamente."
  color="vendas"
  breadcrumbs={[
    { label: 'Vendas', href: '/vendas' },
    { label: 'Importar' }
  ]}
  actions={[
    { label: 'Voltar', href: '/vendas', variant: 'secondary' as const, icon: ArrowLeft }
  ]}
/>

<div class="vtur-page-shell-full space-y-6">
  {#if statusMessage}
    <div class="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      {statusMessage}
    </div>
  {/if}

  {#if warningMessage}
    <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
      {warningMessage}
    </div>
  {/if}

  <!-- Tipo de importação -->
  <Card title="Tipo de importação" color="vendas">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <button
        type="button"
        class={`rounded-xl border p-4 text-left transition ${tipoImportacao === 'cvc' ? 'border-vendas-500 bg-vendas-50' : 'border-slate-200 hover:border-vendas-300'}`}
        on:click={() => (tipoImportacao = 'cvc')}
      >
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-vendas-100 p-2 text-vendas-600"><FileSpreadsheet size={20} /></div>
          <div>
            <p class="font-semibold text-slate-900">Contrato CVC</p>
            <p class="text-sm text-slate-500">Importe contratos de pacotes, hotéis e serviços CVC.</p>
          </div>
        </div>
      </button>
      <button
        type="button"
        class={`rounded-xl border p-4 text-left transition ${tipoImportacao === 'roteiro' ? 'border-vendas-500 bg-vendas-50' : 'border-slate-200 hover:border-vendas-300'}`}
        on:click={() => (tipoImportacao = 'roteiro')}
      >
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-vendas-100 p-2 text-vendas-600"><Ship size={20} /></div>
          <div>
            <p class="font-semibold text-slate-900">Reserva de Cruzeiro</p>
            <p class="text-sm text-slate-500">Importe reservas de cruzeiro (roteiro).</p>
          </div>
        </div>
      </button>
    </div>
  </Card>

  <!-- Fonte do contrato -->
  <Card title="Fonte do contrato" color="vendas">
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <div>
        <div class="mb-1 block text-sm font-medium text-slate-700">Upload de PDF</div>
        <Dropzone
          bind:files={selectedFiles}
          accept=".pdf"
          class="vtur-upload-dropzone"
        >
          <div class="flex flex-col items-center gap-3 px-5 py-6 text-center">
            <div class="vtur-upload-dropzone__icon">
              <FileText size={22} />
            </div>
            <div class="space-y-1">
              <p class="vtur-upload-dropzone__title">Clique para escolher o PDF</p>
              <p class="vtur-upload-dropzone__meta">Upload do contrato no padrão CVC ou reserva de cruzeiro</p>
            </div>
            {#if file}
              <p class="vtur-upload-dropzone__file">{file.name}</p>
            {:else}
              <p class="vtur-upload-dropzone__hint">Aceita apenas `.pdf`</p>
            {/if}
          </div>
        </Dropzone>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" on:click={handlePreview} loading={previewing} disabled={!file}>
            <Eye size={16} class="mr-2" />Pré-visualizar PDF
          </Button>
          <Button type="button" variant="ghost" on:click={clearSelectedFile} disabled={!file}>
            <X size={16} class="mr-2" />Limpar arquivo
          </Button>
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="importar-contrato-texto">Ou cole o texto</label>
        <textarea
          id="importar-contrato-texto"
          bind:value={textInput}
          class="vtur-input h-32 w-full"
          placeholder="Cole aqui o texto do contrato..."
          on:input={() => {
            if (textInput.trim()) clearSelectedFile();
          }}
        ></textarea>
      </div>
    </div>
    <div class="mt-4 flex justify-end">
      <Button type="button" variant="primary" color="vendas" on:click={handleExtract} loading={extracting}>
        <Upload size={16} class="mr-2" />
        {contratos.length > 0 ? 'Adicionar mais recibos' : 'Extrair contratos'}
      </Button>
    </div>
  </Card>

  {#if contratos.length > 0}
    <!-- Contratos identificados -->
    <Card title={`Contratos identificados (${contratos.length})`} color="vendas">
      <div class="space-y-4">
        {#each contratos as contrato, index}
          <div class="rounded-xl border border-slate-200 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-900">
                  {contrato.contratante?.nome || 'Contratante não identificado'}
                  {#if principalIndex === index}
                    <span class="ml-2 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Principal</span>
                  {/if}
                </p>
                <p class="text-sm text-slate-500">
                  Recibo: {contrato.contrato_numero || '-'} • Reserva: {contrato.reserva_numero || '-'} • {formatDate(contrato.data_saida)} a {formatDate(contrato.data_retorno)}
                </p>
              </div>
              <div class="flex gap-2">
                {#if principalIndex !== index}
                  <Button type="button" variant="secondary" on:click={() => handleDefinirPrincipal(index)}>
                    Definir principal
                  </Button>
                {/if}
                <Button type="button" variant="danger" on:click={() => handleRemoverContrato(index)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for={`contrato-cpf-${index}`}>CPF/CNPJ do contratante</label>
                <input
                  id={`contrato-cpf-${index}`}
                  type="text"
                  value={contrato.contratante?.cpf || ''}
                  class="vtur-input w-full"
                  on:input={(e) => handleCpfChange(index, e.currentTarget.value)}
                  maxlength="18"
                />
              </div>
              {#if tipoImportacao !== 'roteiro'}
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for={`contrato-pacote-${index}`}>Tipo de pacote</label>
                  <select
                    id={`contrato-pacote-${index}`}
                    class="vtur-input w-full"
                    value={contrato.tipo_pacote || ''}
                    on:change={(e) => handleTipoPacoteChange(index, e.currentTarget.value)}
                  >
                    <option value="">Selecionar...</option>
                    {#each tiposPacote as tp}
                      <option value={tp.nome}>{tp.nome}</option>
                    {/each}
                  </select>
                </div>
              {:else}
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for={`contrato-pacote-readonly-${index}`}>Tipo de pacote</label>
                  <input id={`contrato-pacote-readonly-${index}`} type="text" value="Cruzeiro" class="vtur-input w-full bg-slate-100" disabled />
                </div>
              {/if}
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for={`contrato-produto-${index}`}>Produto principal</label>
                <input id={`contrato-produto-${index}`} type="text" value={contrato.produto_principal || '-'} class="vtur-input w-full bg-slate-100" disabled />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for={`contrato-destino-${index}`}>Destino</label>
                <input id={`contrato-destino-${index}`} type="text" value={contrato.destino || '-'} class="vtur-input w-full bg-slate-100" disabled />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for={`contrato-total-${index}`}>Total bruto</label>
                <input id={`contrato-total-${index}`} type="text" value={formatCurrency(contrato.total_bruto)} class="vtur-input w-full bg-slate-100" disabled />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for={`contrato-taxas-${index}`}>Taxas</label>
                <input id={`contrato-taxas-${index}`} type="text" value={formatCurrency((contrato.taxas_embarque || 0) + (contrato.taxa_du || 0))} class="vtur-input w-full bg-slate-100" disabled />
              </div>
            </div>

            {#if tipoImportacao === 'cvc' && (!isContratoLocacao(contrato) && (normalizeText(contrato.produto_tipo || '').includes('aereo') || contrato.taxa_du != null))}
              <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="mb-2 text-sm font-medium text-slate-700">Taxa de DU comissionada</p>
                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={contrato.aplica_du === true}
                      on:change={() => handleAplicaDuChange(index, true)}
                    />
                    Sim
                  </label>
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={contrato.aplica_du === false}
                      on:change={() => handleAplicaDuChange(index, false)}
                    />
                    Não
                  </label>
                  <input
                    type="number"
                    class="vtur-input w-32"
                    value={contrato.taxa_du || 0}
                    on:input={(e) => {
                      const val = Number(e.currentTarget.value);
                      contratos = contratos.map((c, i) => (i === index ? { ...c, taxa_du: val } : c));
                    }}
                  />
                </div>
              </div>
            {/if}

            {#if contrato.passageiros && contrato.passageiros.length > 0}
              <div class="mt-4">
                <p class="text-sm font-semibold text-slate-700">Passageiros ({contrato.passageiros.length})</p>
                <div class="mt-2 space-y-1">
                  {#each contrato.passageiros as p}
                    <div class="text-sm text-slate-600">
                      {p.nome || '-'} • CPF: {p.cpf || '-'} • Nasc.: {formatDate(p.nascimento)}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if tipoImportacao === 'roteiro' && contrato.roteiro_reserva}
              <details class="mt-4">
                <summary class="cursor-pointer text-sm font-semibold text-vendas-600">+ Dados do roteiro</summary>
                <div class="mt-2 space-y-1 text-sm text-slate-600">
                  <p><strong>Navio:</strong> {contrato.roteiro_reserva.fornecedores?.[0]?.nome || contrato.roteiro_reserva.fornecedores?.[0]?.hotel_nome || contrato.produto_principal || '-'}</p>
                  <p><strong>Roteiro:</strong> {contrato.roteiro_reserva.roteiro?.descricao || '-'}</p>
                  <p><strong>Origem:</strong> {contrato.roteiro_reserva.origem?.cidade || '-'}</p>
                  <p><strong>Destino:</strong> {contrato.roteiro_reserva.destino?.cidade || '-'}</p>
                </div>
              </details>
            {/if}
          </div>
        {/each}
      </div>
    </Card>

    <!-- Destino principal -->
    <Card title="Destino principal da venda" color="vendas">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div class="relative">
          <label class="mb-1 block text-sm font-medium text-slate-700" for="importar-cidade"><MapPin size={14} class="mr-1 inline" />Cidade</label>
          <input
            id="importar-cidade"
            type="text"
            bind:value={buscaCidade}
            class="vtur-input w-full"
            placeholder="Buscar cidade..."
            on:input={onCidadeInput}
            on:focus={() => (mostrarSugestoesCidade = true)}
            disabled={cidadeAutoIndefinida}
          />
          {#if mostrarSugestoesCidade && (resultadosCidade.length > 0 || buscandoCidade)}
            <div class="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
              {#if buscandoCidade}
                <div class="px-3 py-2 text-sm text-slate-500">Buscando...</div>
              {:else}
                {#each resultadosCidade as cidade}
                  <button
                    type="button"
                    class="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    on:click={() => selecionarCidade(cidade)}
                  >
                    {cidade.nome}{#if cidade.subdivisao_nome}, {cidade.subdivisao_nome}{/if}
                  </button>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="importar-destino">Produto / Destino</label>
          <input
            id="importar-destino"
            type="text"
            bind:value={buscaDestino}
            class="vtur-input w-full"
            placeholder="Selecione o produto..."
            list="destinos-datalist"
            on:input={onDestinoInput}
            on:blur={onDestinoBlur}
          />
          <datalist id="destinos-datalist">
            {#each produtosFiltrados as p}
              <option value={p.nome}>{p.nome}</option>
            {/each}
          </datalist>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="importar-data-venda"><Calendar size={14} class="mr-1 inline" />Data da venda</label>
          <input id="importar-data-venda" type="date" bind:value={dataVenda} class="vtur-input w-full" max={new Date().toISOString().slice(0, 10)} />
        </div>
        {#if canAssignVendedor}
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="importar-vendedor"><User size={14} class="mr-1 inline" />Vendedor</label>
            <select id="importar-vendedor" bind:value={vendedorId} class="vtur-input w-full">
              {#each vendedoresEquipe as v}
                <option value={v.id}>{v.nome_completo}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
    </Card>

    <!-- Ações finais -->
    <div class="flex justify-end gap-3">
      <Button type="button" variant="secondary" on:click={() => goto('/vendas')}>Cancelar</Button>
      <Button type="button" variant="primary" color="vendas" on:click={openSaveModal} loading={saving}>
        <CheckCircle size={16} class="mr-2" />Salvar venda
      </Button>
    </div>
  {/if}
</div>

<!-- Modal de preview -->
<Dialog
  bind:open={previewOpen}
  title="Pré-visualização do PDF"
  size="xl"
  showConfirm={false}
  cancelText="Fechar"
  onCancel={() => (previewOpen = false)}
>
  <textarea class="vtur-input h-96 w-full font-mono text-xs" readonly value={previewText}></textarea>
</Dialog>

<!-- Modal de contato -->
<Dialog
  bind:open={contatoModalOpen}
  title="Contato do cliente"
  size="md"
  showConfirm={false}
  cancelText="Cancelar"
  onCancel={() => (contatoModalOpen = false)}
>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="contato-telefone">Telefone</label>
      <input id="contato-telefone" type="text" bind:value={contatoTelefone} class="vtur-input w-full" placeholder="(00) 0000-0000" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="contato-whatsapp">WhatsApp</label>
      <input id="contato-whatsapp" type="text" bind:value={contatoWhatsapp} class="vtur-input w-full" placeholder="(00) 00000-0000" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="contato-email">E-mail</label>
      <input id="contato-email" type="email" bind:value={contatoEmail} class="vtur-input w-full" placeholder="cliente@email.com" />
    </div>
    <div class="flex justify-end gap-3 pt-2">
      <Button type="button" variant="secondary" on:click={() => handleSave(true)} loading={saving}>
        Informar depois
      </Button>
      <Button type="button" variant="primary" color="vendas" on:click={() => handleSave(false)} loading={saving}>
        Salvar venda
      </Button>
    </div>
  </div>
</Dialog>

<Dialog
  open={duplicateModal !== null}
  title="Duplicidade identificada"
  size="sm"
  showConfirm={false}
  cancelText="Fechar"
  onCancel={() => (duplicateModal = null)}
>
  <p class="text-sm text-slate-600">{duplicateModal?.message}</p>
</Dialog>
