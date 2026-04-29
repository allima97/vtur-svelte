<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    PageHeader,
    Card,
    Button,
    Dialog,
    FieldCheckbox,
    FieldInput,
    FieldRadioGroup,
    FieldSelect,
    FieldTextarea,
  } from '$lib/components/ui';
  import CidadeAutocomplete from '$lib/components/vendas/CidadeAutocomplete.svelte';
  import {
    ArrowLeft,
    Upload,
    AlertCircle,
    CheckCircle,
    X,
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
  import { extractContratosFromText } from '$lib/vendas/contratoCvcExtractor';
  import { extractCruzeiroFromText } from '$lib/vendas/cruzeiroExtractor';
  import { extractRexturFromText } from '$lib/vendas/facialRexturExtractor';
  import { extractFacialCvcFromText } from '$lib/vendas/facialCvcExtractor';
  import type { ContratoDraft } from '$lib/vendas/contratoCvcExtractor';

  type ContratoDraftUI = ContratoDraft & {
    aplica_du?: boolean | null;
    produto_resolvido_id?: string | null;
    destino_cidade_id?: string | null;
    usar_cidade_padrao?: boolean;
  };

  type CidadeSugestao = {
    id: string;
    nome: string;
    subdivisao_nome?: string | null;
    pais_nome?: string | null;
    estado?: string | null;
    label?: string | null;
    grau_importancia?: number | null;
  };

  type Produto = {
    id: string;
    nome: string;
    cidade_id: string | null;
    tipo_produto?: string | null;
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
    cidades?: CidadeSugestao[];
    warning?: string | null;
  };

  let tipoImportacao: 'cvc' | 'roteiro' | 'facial_rextur' | 'facial_cvc' = 'cvc';
  let textInput = '';
  let contratos: ContratoDraftUI[] = [];
  let principalIndex = 0;
  let extracting = false;
  let saving = false;
  let statusMessage = '';
  let warningMessage = '';
  let duplicateModal: { message: string } | null = null;

  let produtos: Produto[] = [];
  let tiposPacote: TipoPacote[] = [];
  let cidadesDisponiveis: CidadeSugestao[] = [];
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

  let dataVenda = '';
  let contatoModalOpen = false;
  let contatoTelefone = '';
  let contatoWhatsapp = '';
  let contatoEmail = '';

  // Modal de CPF para importações sem CPF (Facial Rextur / Facial CVC)
  let cpfModalOpen = false;
  let cpfModalInput = '';
  let cpfModalResolve: (() => void) | null = null;

  function aguardarCpfModal(): Promise<void> {
    cpfModalInput = '';
    cpfModalOpen = true;
    return new Promise((resolve) => {
      cpfModalResolve = resolve;
    });
  }

  function confirmarCpfModal() {
    cpfModalOpen = false;
    cpfModalResolve?.();
    cpfModalResolve = null;
  }

  let cidadeAutoIndefinida = false;

  const aplicaDuOptions = [
    { value: 'true', label: 'Sim' },
    { value: 'false', label: 'Nao' }
  ];

  $: canEdit = !$permissoes.ready || $permissoes.isSystemAdmin || permissoes.can('vendas', 'edit') || permissoes.can('vendas_consulta', 'edit');

  $: produtosFiltrados = cidadeId
    ? produtos.filter(
        (p) => p.cidade_id === cidadeId || p.todas_as_cidades
      )
    : produtos;

  $: principal = contratos[principalIndex] || contratos[0];
  $: tiposPacoteOptions = tiposPacote.map((tp) => ({ value: tp.nome, label: tp.nome }));
  $: vendedorOptions = vendedoresEquipe.map((v) => ({
    value: v.id,
    label: v.nome_completo || 'Sem nome'
  }));

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

  function getCidadeImportanceRank(cidade: CidadeSugestao) {
    const parsed = Number(cidade?.grau_importancia);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 9999;
  }

  function getCidadeSearchScore(cidade: CidadeSugestao, input: string) {
    const term = normalizeText(input || '');
    if (!term) return 100;

    const nome = normalizeText(cidade.nome || '');
    const label = normalizeText(getCidadeLabel(cidade));
    const estado = normalizeText(cidade.subdivisao_nome || cidade.estado || '');
    const full = `${nome} ${estado}`.trim();

    if (nome === term) return 0;
    if (label === term) return 1;
    if (nome.startsWith(term)) return 2;
    if (label.startsWith(term)) return 3;
    if (estado && estado.startsWith(term)) return 4;
    if (full.includes(term)) return 5;
    return 10;
  }

  function sortCidades(items: CidadeSugestao[], input = '') {
    return [...items].sort((a, b) => {
      const scoreDiff = getCidadeSearchScore(a, input) - getCidadeSearchScore(b, input);
      if (scoreDiff !== 0) return scoreDiff;

      const importanceDiff = getCidadeImportanceRank(a) - getCidadeImportanceRank(b);
      if (importanceDiff !== 0) return importanceDiff;

      const nomeDiff = String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' });
      if (nomeDiff !== 0) return nomeDiff;

      return String(a.subdivisao_nome || a.estado || '').localeCompare(String(b.subdivisao_nome || b.estado || ''), 'pt-BR', {
        sensitivity: 'base'
      });
    });
  }

  function parseCidadeItems(payload: any): CidadeSugestao[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  }

  function getCidadeLabel(cidade: CidadeSugestao) {
    const preferred = String(cidade?.label || '').trim();
    if (preferred) return preferred;
    const estado = String(cidade?.subdivisao_nome || cidade?.estado || '').trim();
    return estado ? `${cidade.nome} (${estado})` : cidade.nome;
  }

  function mergeCidadesDisponiveis(items: Array<{
    id: string;
    nome?: string | null;
    subdivisao_nome?: string | null;
    pais_nome?: string | null;
    estado?: string | null;
    label?: string | null;
    grau_importancia?: number | null;
  }>) {
    if (!items.length) return;
    const byId = new Map<string, CidadeSugestao>();
    cidadesDisponiveis.forEach((cidade) => byId.set(String(cidade.id), cidade));
    items.forEach((cidade) => {
      const cidadeIdAtual = String(cidade?.id || '').trim();
      if (!cidadeIdAtual) return;
      byId.set(cidadeIdAtual, {
        ...(byId.get(cidadeIdAtual) || {}),
        nome: String(cidade.nome || byId.get(cidadeIdAtual)?.nome || ''),
        ...cidade
      } as CidadeSugestao);
    });
    cidadesDisponiveis = sortCidades(Array.from(byId.values()));
  }

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
      cidadesDisponiveis = sortCidades(Array.isArray(payload?.cidades) ? payload.cidades : []);
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
      const items = sortCidades(parseCidadeItems(payload), 'Indefinida');
      mergeCidadesDisponiveis(items);
      const match = items.find((item: CidadeSugestao) => normalizeText(item.nome) === 'indefinida');
      if (match?.id) {
        cidadeAutoIndefinida = true;
        cidadeId = match.id;
        cidadeNome = match.nome;
        cidadeSelecionadaLabel = getCidadeLabel(match);
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
        const items = sortCidades(parseCidadeItems(payload), termo);
        mergeCidadesDisponiveis(items);
        if (items.length > 0) {
          const first = items[0] as CidadeSugestao;
          cidadeId = first.id;
          cidadeNome = first.nome;
          cidadeSelecionadaLabel = getCidadeLabel(first);
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
        resultadosCidade = sortCidades(parseCidadeItems(payload), query);
        mergeCidadesDisponiveis(resultadosCidade);
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
    cidadeSelecionadaLabel = getCidadeLabel(cidade);
    buscaCidade = cidadeSelecionadaLabel;
    mostrarSugestoesCidade = false;
    resultadosCidade = [];
    contratos = contratos.map((contrato) => {
      if (contrato.usar_cidade_padrao === false) return contrato;
      return {
        ...contrato,
        produto_resolvido_id: guessProdutoId(contrato, cidade.id) || contrato.produto_resolvido_id || null
      };
    });
  }

  function getCidadeContratoId(contrato: ContratoDraftUI) {
    return contrato.usar_cidade_padrao === false ? String(contrato.destino_cidade_id || '') : cidadeId;
  }

  function getCidadeNomeById(cidadeIdAtual: string) {
    if (!cidadeIdAtual) return 'Não informada';
    const cidade = cidadesDisponiveis.find((item) => item.id === cidadeIdAtual) || resultadosCidade.find((item) => item.id === cidadeIdAtual);
    if (!cidade) return cidadeIdAtual;
    return getCidadeLabel(cidade);
  }

  function getProdutosPorCidade(cidadeIdAtual: string) {
    return cidadeIdAtual
      ? produtos.filter((p) => p.cidade_id === cidadeIdAtual || p.todas_as_cidades)
      : produtos;
  }

  function guessProdutoId(contrato: ContratoDraftUI, cidadeIdAtual: string) {
    const candidates = [
      contrato.produto_principal,
      contrato.produto_tipo,
      contrato.produto_detalhes
    ]
      .map((value) => normalizeText(String(value || ''), { trim: true, collapseWhitespace: true }))
      .filter(Boolean);

    if (candidates.length === 0) return '';

    const produtosDisponiveis = getProdutosPorCidade(cidadeIdAtual);
    for (const term of candidates) {
      const exact = produtosDisponiveis.find((produto) => normalizeText(produto.nome, { trim: true, collapseWhitespace: true }) === term);
      if (exact?.id) return exact.id;
      const partial = produtosDisponiveis.find((produto) => normalizeText(produto.nome, { trim: true, collapseWhitespace: true }).includes(term) || term.includes(normalizeText(produto.nome, { trim: true, collapseWhitespace: true })));
      if (partial?.id) return partial.id;
    }

    return '';
  }

  function syncContratoCidade(index: number, cidadeIdAtual: string) {
    contratos = contratos.map((contrato, itemIndex) => {
      if (itemIndex !== index) return contrato;
      const produtoAtual = String(contrato.produto_resolvido_id || '');
      const produtosDisponiveis = getProdutosPorCidade(cidadeIdAtual);
      const produtoCompativel = produtoAtual
        ? produtosDisponiveis.some((produto) => produto.id === produtoAtual)
        : false;
      return {
        ...contrato,
        destino_cidade_id: cidadeIdAtual,
        produto_resolvido_id: produtoCompativel ? produtoAtual : guessProdutoId(contrato, cidadeIdAtual)
      };
    });
  }

  function toggleContratoCidadePadrao(index: number, checked: boolean) {
    contratos = contratos.map((contrato, itemIndex) => {
      if (itemIndex !== index) return contrato;
      const nextCidade = checked ? cidadeId : String(contrato.destino_cidade_id || cidadeId || '');
      const produtosDisponiveis = getProdutosPorCidade(nextCidade);
      const produtoAtual = String(contrato.produto_resolvido_id || '');
      return {
        ...contrato,
        usar_cidade_padrao: checked,
        destino_cidade_id: checked ? null : nextCidade,
        produto_resolvido_id:
          produtoAtual && produtosDisponiveis.some((produto) => produto.id === produtoAtual)
            ? produtoAtual
            : guessProdutoId(contrato, nextCidade)
      };
    });
  }

  async function handleExtract() {
    if (!textInput.trim()) {
      toast.error('Cole o texto do contrato para continuar.');
      return;
    }
    extracting = true;
    statusMessage = '';
    try {
      let result: { contratos: ContratoDraft[]; raw_text: string } | null = null;

      if (tipoImportacao === 'cvc') {
        result = await extractContratosFromText(textInput.trim());
      } else if (tipoImportacao === 'roteiro') {
        result = await extractCruzeiroFromText(textInput.trim());
      } else if (tipoImportacao === 'facial_rextur') {
        result = extractRexturFromText(textInput.trim());
      } else if (tipoImportacao === 'facial_cvc') {
        result = extractFacialCvcFromText(textInput.trim());
      }

      if (!result || !result.contratos.length) {
        toast.error('Nenhum contrato encontrado no texto informado.');
        return;
      }

      // Facial Rextur e Facial CVC não têm CPF — solicitar antes de continuar
      const semCpf = tipoImportacao === 'facial_rextur' || tipoImportacao === 'facial_cvc';
      if (semCpf) {
        extracting = false; // libera o botão enquanto aguarda modal
        await aguardarCpfModal();
        const cpfDigits = cpfModalInput.replace(/\D/g, '');
        if (cpfDigits.length !== 11 && cpfDigits.length !== 14) {
          toast.error('CPF/CNPJ inválido. Importação cancelada.');
          return;
        }
        // Injetar CPF em todos os contratos extraídos
        result.contratos = result.contratos.map(c => ({
          ...c,
          contratante: { ...c.contratante, cpf: cpfDigits } as any
        }));
        extracting = true;
      }

      const isFacial = tipoImportacao === 'facial_rextur' || tipoImportacao === 'facial_cvc';

      // Para facial: encontrar o produto "Passagem Facial" na lista (todas as cidades ou cidade atual)
      const produtoPassagemFacialId = isFacial
        ? (produtos.find(p =>
            normalizeText(p.nome, { trim: true, collapseWhitespace: true }) === 'passagem facial'
          )?.id || '')
        : '';

      const novos = result.contratos.map((c) => {
        const normalizedTipoPacote = normalizeText(c.tipo_pacote || '');
        const tipoPacoteMatch = tiposPacote.find((item) => normalizeText(item.nome) === normalizedTipoPacote);
        const cidadeContratoId = isContratoLocacao(c) ? cidadeId : '';
        // Facial: sempre "Passagem Facial" — não tenta mapear nos tipos cadastrados
        const tipoPacoteFinal = isFacial
          ? 'Passagem Facial'
          : tipoPacoteMatch?.nome || c.tipo_pacote || (tipoImportacao === 'roteiro' ? 'Cruzeiro' : null);
        const produtoFinal = isFacial
          ? produtoPassagemFacialId || guessProdutoId({ ...c, produto_principal: 'Passagem Facial' }, cidadeContratoId || cidadeId)
          : guessProdutoId(c, cidadeContratoId || cidadeId);
        return {
          ...c,
          produto_principal: isFacial ? 'Passagem Facial' : c.produto_principal,
          tipo_pacote: tipoPacoteFinal,
          aplica_du: c.taxa_du != null && c.taxa_du > 0 ? true : null,
          usar_cidade_padrao: true,
          destino_cidade_id: cidadeContratoId || null,
          produto_resolvido_id: produtoFinal
        };
      });
      contratos = [...contratos, ...novos];
      statusMessage = contratos.length > 0
        ? `${novos.length} contrato(s) adicionado(s).`
        : `${novos.length} contrato(s) encontrado(s).`;
      toast.success(`${novos.length} contrato(s) extraído(s).`);

      textInput = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro na extração.');
    } finally {
      extracting = false;
    }
  }

  function handleDefinirPrincipal(index: number) {
    principalIndex = index;
    cidadeManual = false;
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
    if (!isISODate(dataVenda)) return 'Data da venda inválida.';
    if (canAssignVendedor && !vendedorId) return 'Selecione o vendedor.';
    const principalContract = contratos[principalIndex] || contratos[0];
    const cpf = String(principalContract?.contratante?.cpf || '').replace(/\D/g, '');
    if (cpf.length !== 11 && cpf.length !== 14) return 'Informe um CPF/CNPJ válido para o contratante principal.';
    const skipTipo = tipoImportacao === 'roteiro' || tipoImportacao === 'facial_rextur' || tipoImportacao === 'facial_cvc';
    const missingTipo = contratos.find((c) => !c.tipo_pacote && !skipTipo);
    if (missingTipo) return 'Todos os contratos devem ter um tipo de pacote.';
    const missingProduto = contratos.find((c) => !c.produto_resolvido_id);
    if (missingProduto) return 'Selecione o produto de cada recibo antes de salvar.';
    const missingCidade = contratos.find((c) => !getCidadeContratoId(c));
    if (missingCidade) return 'Selecione a cidade de todos os recibos antes de salvar.';
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
          taxa_du: c.aplica_du ? c.taxa_du : 0,
          destino_cidade_id: getCidadeContratoId(c),
          produto_resolvido_id: c.produto_resolvido_id || null
        })),
        principalIndex,
        vendedorId: canAssignVendedor ? vendedorId : currentUserId,
        destinoCidadeId: cidadeId,
        dataVenda,
        tipoImportacao,
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
      <Button
        variant={tipoImportacao === 'cvc' ? 'selected' : 'secondary'}
        color="vendas"
        class_name="rounded-xl"
        on:click={() => (tipoImportacao = 'cvc')}
      >
        <div class="flex items-center gap-3 w-full">
          <div class="rounded-lg bg-vendas-100 p-2 text-vendas-600"><FileSpreadsheet size={20} /></div>
          <div>
            <p class="font-semibold text-slate-900">Contrato CVC</p>
            <p class="text-sm text-slate-500">Importe contratos de pacotes, hotéis e serviços CVC.</p>
          </div>
        </div>
      </Button>
      <Button
        variant={tipoImportacao === 'roteiro' ? 'selected' : 'secondary'}
        color="vendas"
        class_name="rounded-xl"
        on:click={() => (tipoImportacao = 'roteiro')}
      >
        <div class="flex items-center gap-3 w-full">
          <div class="rounded-lg bg-vendas-100 p-2 text-vendas-600"><Ship size={20} /></div>
          <div>
            <p class="font-semibold text-slate-900">Reserva de Cruzeiro</p>
            <p class="text-sm text-slate-500">Importe reservas de cruzeiro (roteiro).</p>
          </div>
        </div>
      </Button>
      <Button
        variant={tipoImportacao === 'facial_rextur' ? 'selected' : 'secondary'}
        color="vendas"
        class_name="rounded-xl"
        on:click={() => (tipoImportacao = 'facial_rextur')}
      >
        <div class="flex items-center gap-3 w-full">
          <div class="rounded-lg bg-vendas-100 p-2 text-vendas-600"><User size={20} /></div>
          <div>
            <p class="font-semibold text-slate-900">Facial Rextur</p>
            <p class="text-sm text-slate-500">Importe reservas da Rextur (Reserva Fácil).</p>
          </div>
        </div>
      </Button>
      <Button
        variant={tipoImportacao === 'facial_cvc' ? 'selected' : 'secondary'}
        color="vendas"
        class_name="rounded-xl"
        on:click={() => (tipoImportacao = 'facial_cvc')}
      >
        <div class="flex items-center gap-3 w-full">
          <div class="rounded-lg bg-vendas-100 p-2 text-vendas-600"><MapPin size={20} /></div>
          <div>
            <p class="font-semibold text-slate-900">Facial CVC</p>
            <p class="text-sm text-slate-500">Importe bilhetes aéreos do Facial CVC.</p>
          </div>
        </div>
      </Button>
    </div>
  </Card>

  <!-- Fonte do contrato -->
  <Card title="Texto do contrato" color="vendas">
    {#if tipoImportacao === 'facial_rextur'}
      <div class="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        <AlertCircle size={16} class="mt-0.5 shrink-0 text-amber-600" />
        <span>O <strong>CPF do contratante</strong> não consta na Reserva Fácil Rextur. Após extrair, será solicitado antes de salvar.</span>
      </div>
    {:else if tipoImportacao === 'facial_cvc'}
      <div class="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        <AlertCircle size={16} class="mt-0.5 shrink-0 text-amber-600" />
        <span>O <strong>CPF do contratante</strong> não consta no Facial CVC. Após extrair, será solicitado antes de salvar.</span>
      </div>
    {/if}
    <FieldTextarea
      id="importar-contrato-texto"
      label="Cole o texto do contrato"
      bind:value={textInput}
      rows={8}
      placeholder={tipoImportacao === 'facial_rextur'
        ? 'Cole aqui o texto da Reserva Fácil Rextur...'
        : tipoImportacao === 'facial_cvc'
        ? 'Cole aqui o texto do bilhete aéreo CVC...'
        : 'Cole aqui o texto do contrato CVC ou reserva de cruzeiro...'}
    />
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
                    <span class="ml-2 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Base do cliente</span>
                  {/if}
                </p>
                <p class="text-sm text-slate-500">
                  Recibo: {contrato.contrato_numero || '-'} • Reserva: {contrato.reserva_numero || '-'} • {formatDate(contrato.data_saida)} a {formatDate(contrato.data_retorno)}
                </p>
              </div>
              <div class="flex gap-2">
                {#if principalIndex !== index}
                  <Button type="button" variant="secondary" on:click={() => handleDefinirPrincipal(index)}>
                    Usar como base
                  </Button>
                {/if}
                <Button type="button" variant="danger" on:click={() => handleRemoverContrato(index)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FieldInput
                id={`contrato-cpf-${index}`}
                label="CPF/CNPJ do contratante"
                value={contrato.contratante?.cpf || ''}
                maxlength={18}
                on:input={(e) => handleCpfChange(index, (e.currentTarget as HTMLInputElement).value)}
              />
              {#if tipoImportacao === 'cvc'}
                <FieldSelect
                  id={`contrato-pacote-${index}`}
                  label="Tipo de pacote"
                  value={contrato.tipo_pacote || ''}
                  options={tiposPacoteOptions}
                  placeholder="Selecionar..."
                  on:change={(e) => handleTipoPacoteChange(index, (e.currentTarget as HTMLSelectElement).value)}
                />
              {:else}
                <FieldInput
                  id={`contrato-pacote-readonly-${index}`}
                  label="Tipo de pacote"
                  value={contrato.tipo_pacote || (tipoImportacao === 'roteiro' ? 'Cruzeiro' : 'Aéreo')}
                  disabled={true}
                />
              {/if}
              {#if tipoImportacao === 'facial_rextur' || tipoImportacao === 'facial_cvc'}
                <FieldInput
                  id={`contrato-produto-readonly-${index}`}
                  label="Produto do recibo"
                  value="Passagem Facial"
                  disabled={true}
                />
              {:else}
                <FieldSelect
                  id={`contrato-produto-${index}`}
                  label="Produto do recibo"
                  value={contrato.produto_resolvido_id || ''}
                  options={getProdutosPorCidade(getCidadeContratoId(contrato)).map((produto) => ({ value: produto.id, label: produto.nome }))}
                  placeholder="Selecione uma opção"
                  helper="Produto é individual do recibo. Destino continua sendo a cidade da viagem."
                  on:change={(e) => {
                    const value = (e.currentTarget as HTMLSelectElement).value;
                    contratos = contratos.map((c, i) => (i === index ? { ...c, produto_resolvido_id: value || null } : c));
                  }}
                />
              {/if}
              <FieldInput id={`contrato-destino-${index}`} label="Destino" value={contrato.destino || '-'} disabled={true} />
              <FieldInput id={`contrato-total-${index}`} label="Total bruto" value={formatCurrency(contrato.total_bruto)} disabled={true} />
              <FieldInput
                id={`contrato-taxas-${index}`}
                label="Taxas"
                value={formatCurrency((contrato.taxas_embarque || 0) + (contrato.taxa_du || 0))}
                disabled={true}
              />
            </div>

            <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <FieldCheckbox
                  id={`contrato-cidade-padrao-${index}`}
                  label="Usar cidade padrão da venda neste recibo"
                  checked={contrato.usar_cidade_padrao !== false}
                  color="vendas"
                  on:change={(event) => toggleContratoCidadePadrao(index, (event.currentTarget as HTMLInputElement).checked)}
                />
                <p class="text-xs text-slate-500">
                  Cidade deste recibo:
                  <strong class="text-slate-700">{getCidadeNomeById(getCidadeContratoId(contrato))}</strong>
                </p>
              </div>
              {#if contrato.usar_cidade_padrao === false}
                <div class="mt-3">
                  <CidadeAutocomplete
                    id={`contrato-cidade-${index}`}
                    value={String(contrato.destino_cidade_id || '')}
                    label="Cidade deste recibo"
                    required={true}
                    cities={cidadesDisponiveis}
                    on:loaded={(event) => mergeCidadesDisponiveis(event.detail)}
                    on:select={(event) => syncContratoCidade(index, String(event.detail?.id || ''))}
                  />
                </div>
              {/if}
            </div>

            {#if (tipoImportacao === 'cvc' || tipoImportacao === 'facial_rextur' || tipoImportacao === 'facial_cvc') && (!isContratoLocacao(contrato) && contrato.taxa_du != null && contrato.taxa_du > 0)}
              <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="mb-2 text-sm font-medium text-slate-700">Taxa de DU comissionada</p>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_140px] md:items-end">
                  <FieldRadioGroup
                    label="Comissionar DU"
                    value={contrato.aplica_du === true ? 'true' : 'false'}
                    options={aplicaDuOptions}
                    on:change={(event) => handleAplicaDuChange(index, (event.currentTarget as HTMLInputElement).value === 'true')}
                  />
                  <FieldInput
                    label="Valor DU"
                    type="number"
                    value={String(contrato.taxa_du || 0)}
                    on:input={(e) => {
                      const val = Number((e.currentTarget as HTMLInputElement).value);
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

    <Card title="Cidade padrão da venda" color="vendas">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div class="relative">
          <FieldInput
            id="importar-cidade"
            label="Cidade"
            bind:value={buscaCidade}
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
                  <Button
                    type="button"
                    variant="unstyled"
                    size="sm"
                    class_name="block w-full rounded-none px-3 py-2 text-left text-sm hover:bg-slate-50"
                    on:click={() => selecionarCidade(cidade)}
                  >
                    {cidade.nome}{#if cidade.subdivisao_nome}, {cidade.subdivisao_nome}{/if}
                  </Button>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
        <FieldInput
          id="importar-data-venda"
          label="Data da venda"
          type="date"
          bind:value={dataVenda}
          max={new Date().toISOString().slice(0, 10)}
        />
        {#if canAssignVendedor}
          <FieldSelect
            id="importar-vendedor"
            label="Vendedor"
            bind:value={vendedorId}
            options={vendedorOptions}
            placeholder={null}
          />
        {/if}
      </div>
      <p class="mt-3 text-xs text-slate-500">A cidade definida aqui é aplicada automaticamente em todos os recibos. Se um recibo precisar de outra cidade, ajuste diretamente no card do recibo.</p>
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

<!-- Modal de CPF (Facial Rextur / Facial CVC) -->
<Dialog
  bind:open={cpfModalOpen}
  title="CPF do contratante"
  size="sm"
  showConfirm={false}
  cancelText="Cancelar"
  onCancel={() => { cpfModalOpen = false; cpfModalResolve = null; }}
>
  <div class="space-y-4">
    <div class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
      <AlertCircle size={15} class="mt-0.5 shrink-0 text-amber-600" />
      <span>O documento não contém CPF. Informe o CPF do contratante para continuar a importação.</span>
    </div>
    <FieldInput
      id="cpf-modal-input"
      label="CPF do contratante *"
      bind:value={cpfModalInput}
      placeholder="000.000.000-00"
    />
    <div class="flex justify-end gap-3 pt-2">
      <Button type="button" variant="primary" color="vendas" on:click={confirmarCpfModal}
        disabled={cpfModalInput.replace(/\D/g, '').length < 11}>
        Confirmar e continuar
      </Button>
    </div>
  </div>
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
    <FieldInput id="contato-telefone" label="Telefone" bind:value={contatoTelefone} placeholder="(00) 0000-0000" />
    <FieldInput id="contato-whatsapp" label="WhatsApp" bind:value={contatoWhatsapp} placeholder="(00) 00000-0000" />
    <FieldInput id="contato-email" label="E-mail" type="email" bind:value={contatoEmail} placeholder="cliente@email.com" />
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
