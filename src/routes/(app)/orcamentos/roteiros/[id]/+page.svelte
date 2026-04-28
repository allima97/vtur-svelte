<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/db/supabase';
  import { construirLinkWhatsApp } from '$lib/whatsapp';
  import { mergeImportedRoteiroAereo, parseImportedRoteiroAereo } from '$lib/roteiroAereoImport';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Tabs from '$lib/components/ui/Tabs.svelte';
  import { FieldDatalistInput, FieldInput, FieldSelect, FieldTextarea } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { ArrowLeft, Plus, Trash2, Save, ChevronUp, ChevronDown, FileText, DollarSign, RefreshCw } from 'lucide-svelte';

  // ─── Types ─────────────────────────────────────────────────────────────────
  type RotDia = {
    id?: string;
    ordem: number;
    cidade: string;
    percurso: string;
    data: string;
    descricao: string;
  };

  type RotHotel = {
    id?: string;
    ordem: number;
    cidade: string;
    hotel: string;
    endereco: string;
    data_inicio: string;
    data_fim: string;
    noites: number | null;
    qtd_apto: number | null;
    apto: string;
    categoria: string;
    regime: string;
    tipo_tarifa: string;
    qtd_adultos: number | null;
    qtd_criancas: number | null;
    valor_original: number | null;
    valor_final: number | null;
  };

  type RotPasseio = {
    id?: string;
    ordem: number;
    cidade: string;
    passeio: string;
    fornecedor: string;
    data_inicio: string;
    data_fim: string;
    tipo: string;
    ingressos: string;
    qtd_adultos: number | null;
    qtd_criancas: number | null;
    valor_original: number | null;
    valor_final: number | null;
  };

  type RotTransporte = {
    id?: string;
    ordem: number;
    tipo: string;
    fornecedor: string;
    descricao: string;
    data_inicio: string;
    data_fim: string;
    categoria: string;
    observacao: string;
    trecho: string;
    cia_aerea: string;
    data_voo: string;
    classe_reserva: string;
    hora_saida: string;
    aeroporto_saida: string;
    duracao_voo: string;
    tipo_voo: string;
    hora_chegada: string;
    aeroporto_chegada: string;
    tarifa_nome: string;
    qtd_adultos: number | null;
    qtd_criancas: number | null;
    valor_total: number | null;
    taxas: number | null;
  };

  type RotInvestimento = {
    id?: string;
    ordem: number;
    tipo: string;
    valor_por_pessoa: number | null;
    qtd_apto: number | null;
    valor_por_apto: number | null;
  };

  type RotPagamento = {
    id?: string;
    ordem: number;
    servico: string;
    forma_pagamento: string;
    valor_total_com_taxas: number | null;
    taxas: number | null;
  };

  type PdfSettings = {
    consultor_nome?: string;
    filial_nome?: string;
    endereco_linha1?: string;
    endereco_linha2?: string;
    endereco_linha3?: string;
    telefone?: string;
    whatsapp?: string;
    whatsapp_codigo_pais?: string;
    email?: string;
    rodape_texto?: string;
    logo_url?: string;
    logo_path?: string;
    imagem_complementar_url?: string;
    imagem_complementar_path?: string;
  };

  type PreviewPdfAssets = {
    logoUrl: string | null;
    qrUrl: string | null;
    complementUrl: string | null;
  };

  // ─── Constants ─────────────────────────────────────────────────────────────
  const ABAS = [
    { id: 'itinerario', label: 'Itinerário' },
    { id: 'hoteis', label: 'Hotéis' },
    { id: 'passeios', label: 'Passeios' },
    { id: 'transporte', label: 'Aéreo' },
    { id: 'investimento', label: 'Investimento' },
    { id: 'pagamento', label: 'Pagamento' },
    { id: 'inclusoes', label: 'Inclusões' },
    { id: 'informacoes', label: 'Informações' },
  ] as const;

  type AbaId = (typeof ABAS)[number]['id'];

  const HOTEL_REGIME_OPTIONS = ['Café da manhã', 'Meia pensão', 'Pensão completa', 'All-inclusive', 'Apenas hospedagem'];
  const HOTEL_CATEGORIA_OPTIONS = ['1 estrela', '2 estrelas', '3 estrelas', '4 estrelas', '5 estrelas', 'Boutique', 'Pousada', 'Resort'];
  const PASSEIO_TIPO_OPTIONS = ['Passeio', 'Transfer', 'Seguro Viagem', 'Serviço', 'Ingresso', 'Outro'];
  const TRANSPORTE_TIPO_OPTIONS = ['Aéreo', 'Terrestre', 'Marítimo', 'Ferroviário'];
  const TRANSPORTE_TIPO_VOO_OPTIONS = ['Nacional', 'Internacional'];
  const INVESTIMENTO_TIPO_OPTIONS = ['Por pessoa', 'Por casal', 'Por família', 'Por apto'];
  const PAGAMENTO_SERVICO_OPTIONS = ['Pacote Completo', 'Passagem Aérea', 'Hospedagem', 'Passeios e Serviços', 'Seguro Viagem', 'Demais Serviços'];

  // ─── Page state ────────────────────────────────────────────────────────────
  const roteiroId = $page.params.id;

  let loading = $state(true);
  let saving = $state(false);
  let previewingPdf = $state(false);
  let abaAtiva: AbaId = $state('itinerario');

  // Form fields
  let nome = $state('');
  let duracao = $state('');
  let inicioCidade = $state('');
  let fimCidade = $state('');
  let incluiTexto = $state('');
  let naoIncluiTexto = $state('');
  let informacoesImportantes = $state('');

  // Lists
  let dias: RotDia[] = $state([]);
  let hoteis: RotHotel[] = $state([]);
  let passeios: RotPasseio[] = $state([]);
  let transportes: RotTransporte[] = $state([]);
  let investimentos: RotInvestimento[] = $state([]);
  let pagamentos: RotPagamento[] = $state([]);
  let pdfSettings: PdfSettings = $state({});

  // Sugestões
  let sugestoes: Record<string, string[]> = $state({});

  // Modals
  let showGerarModal = $state(false);
  let gerarClienteQ = $state('');
  let gerarClienteResults: { id: string; nome: string; email?: string; whatsapp?: string }[] = $state([]);
  let gerarClienteSel: { id: string; nome: string; email?: string; whatsapp?: string } | null = $state(null);
  let gerarClienteNome = $state('');
  let gerarLoading = $state(false);
  let gerarClienteLoading = $state(false);

  let showDiasBusca = $state(false);
  let diasBuscaQ = $state('');
  let diasBuscaCidade = $state('');
  let diasBuscaResults: any[] = $state([]);
  let diasBuscaLoading = $state(false);
  let showDiasImport = $state(false);
  let diasImportText = $state('');
  let diasImportMsg: string | null = $state(null);
  let diasImportError: string | null = $state(null);

  // Import text
  let hotelImportText = $state('');
  let hotelImportMsg: string | null = $state(null);
  let hotelImportError: string | null = $state(null);
  let passeioImportText = $state('');
  let passeioImportMsg: string | null = $state(null);
  let passeioImportError: string | null = $state(null);
  let aereoImportText = $state('');
  let aereoImportMsg: string | null = $state(null);
  let aereoImportError: string | null = $state(null);

  // ─── Counts for tab badges ─────────────────────────────────────────────────
  let tabCounts = $derived({
    itinerario: dias.filter(d => d.cidade || d.percurso || d.data || d.descricao).length,
    hoteis: hoteis.filter(h => h.cidade || h.hotel || h.data_inicio || h.apto || h.categoria).length,
    passeios: passeios.filter(p => p.cidade || p.passeio || p.data_inicio || p.tipo).length,
    transporte: transportes.filter(t => t.trecho || t.cia_aerea || t.data_voo || t.tipo).length,
    investimento: investimentos.filter(i => i.tipo || Number(i.valor_por_pessoa) > 0 || Number(i.valor_por_apto) > 0).length,
    pagamento: pagamentos.filter(p => p.servico || p.forma_pagamento || Number(p.valor_total_com_taxas) > 0).length,
    inclusoes: (incluiTexto.split('\n').filter(l => l.trim()).length) + (naoIncluiTexto.split('\n').filter(l => l.trim()).length),
    informacoes: informacoesImportantes.split('\n').filter(l => l.trim()).length,
  });

  // ─── Totals ────────────────────────────────────────────────────────────────
  let totalPagamento = $derived(pagamentos.reduce((s, p) => s + Number(p.valor_total_com_taxas || 0), 0));
  let totalInvestimento = $derived(investimentos.reduce((s, i) => s + Number(i.valor_por_pessoa || 0), 0));

  // ─── Factory functions ─────────────────────────────────────────────────────
  function newDia(ordem: number): RotDia {
    return { ordem, cidade: '', percurso: '', data: '', descricao: '' };
  }
  function newHotel(ordem: number): RotHotel {
    return { ordem, cidade: '', hotel: '', endereco: '', data_inicio: '', data_fim: '', noites: null, qtd_apto: null, apto: '', categoria: '', regime: '', tipo_tarifa: '', qtd_adultos: null, qtd_criancas: null, valor_original: null, valor_final: null };
  }
  function newPasseio(ordem: number): RotPasseio {
    return { ordem, cidade: '', passeio: '', fornecedor: '', data_inicio: '', data_fim: '', tipo: 'Passeio', ingressos: '', qtd_adultos: null, qtd_criancas: null, valor_original: null, valor_final: null };
  }
  function newTransporte(ordem: number): RotTransporte {
    return { ordem, tipo: 'Aéreo', fornecedor: '', descricao: '', data_inicio: '', data_fim: '', categoria: '', observacao: '', trecho: '', cia_aerea: '', data_voo: '', classe_reserva: '', hora_saida: '', aeroporto_saida: '', duracao_voo: '', tipo_voo: 'Internacional', hora_chegada: '', aeroporto_chegada: '', tarifa_nome: '', qtd_adultos: null, qtd_criancas: null, valor_total: null, taxas: null };
  }
  function newInvestimento(ordem: number): RotInvestimento {
    return { ordem, tipo: '', valor_por_pessoa: null, qtd_apto: null, valor_por_apto: null };
  }
  function newPagamento(ordem: number): RotPagamento {
    return { ordem, servico: '', forma_pagamento: '', valor_total_com_taxas: null, taxas: null };
  }

  // ─── List operations ───────────────────────────────────────────────────────
  function reorder<T extends { ordem: number }>(arr: T[]): T[] {
    return arr.map((item, i) => ({ ...item, ordem: i }));
  }

  function addItem<T extends { ordem: number }>(list: T[], newFn: (o: number) => T, afterIndex: number = list.length - 1): T[] {
    const next = [...list];
    next.splice(afterIndex + 1, 0, newFn(afterIndex + 1));
    return reorder(next);
  }

  function removeItem<T extends { ordem: number }>(list: T[], index: number): T[] {
    return reorder(list.filter((_, i) => i !== index));
  }

  function moveUp<T extends { ordem: number }>(list: T[], index: number): T[] {
    if (index === 0) return list;
    const next = [...list];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    return reorder(next);
  }

  function moveDown<T extends { ordem: number }>(list: T[], index: number): T[] {
    if (index === list.length - 1) return list;
    const next = [...list];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    return reorder(next);
  }

  function updateItem<T>(list: T[], index: number, patch: Partial<T>): T[] {
    return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
  }

  // ─── Hotel auto-calc noites ────────────────────────────────────────────────
  function calcNoites(dataInicio: string, dataFim: string): number | null {
    if (!dataInicio || !dataFim) return null;
    const start = new Date(dataInicio);
    const end = new Date(dataFim);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
    return diff > 0 ? diff : null;
  }

  function onHotelDateChange(index: number, field: 'data_inicio' | 'data_fim', value: string) {
    const hotel = hoteis[index];
    const updated = { ...hotel, [field]: value };
    const noites = calcNoites(
      field === 'data_inicio' ? value : hotel.data_inicio,
      field === 'data_fim' ? value : hotel.data_fim
    );
    hoteis = updateItem(hoteis, index, { [field]: value, noites: noites ?? updated.noites });
  }

  function onAereoValorChange(index: number, field: 'valor_total' | 'taxas', rawValue: string) {
    const v = rawValue === '' ? null : Number(rawValue);
    const num = v !== null && isFinite(v) ? v : null;
    transportes = updateItem(transportes, index, { [field]: num });
  }

  function onInvestimentoChange(index: number, field: keyof RotInvestimento, rawValue: string) {
    const num = rawValue === '' ? null : Number(rawValue);
    const v = num !== null && isFinite(num) ? num : null;
    if (field === 'valor_por_pessoa' || field === 'qtd_apto') {
      const inv = investimentos[index];
      const vpp = field === 'valor_por_pessoa' ? (v ?? 0) : Number(inv.valor_por_pessoa ?? 0);
      const qa = field === 'qtd_apto' ? (v ?? 0) : Number(inv.qtd_apto ?? 0);
      const vpa = vpp * qa;
      investimentos = updateItem(investimentos, index, { [field]: v, valor_por_apto: vpa > 0 ? vpa : null });
    } else {
      investimentos = updateItem(investimentos, index, { [field]: v } as any);
    }
  }

  function normalizeImportLine(value: string): string {
    return String(value || '')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isImportSectionHeader(line: string): boolean {
    const normalized = normalizeImportLine(line)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return (
      normalized === 'itinerario' ||
      normalized === 'itinerario de viagem' ||
      normalized === 'dia a dia' ||
      normalized === 'roteiro' ||
      normalized === 'programacao'
    );
  }

  function parseDiaHeader(line: string): { dia: number | null; titulo: string } | null {
    const normalized = normalizeImportLine(line);
    if (!normalized || isImportSectionHeader(normalized)) return null;

    const patterns = [
      /^dia\s*(\d+)[ºoª]?\s*[:\-.–—]?\s*(.*)$/i,
      /^(\d+)[ºoª]?\s*dia\s*[:\-.–—]?\s*(.*)$/i,
      /^(\d+)[ºoª]?\s*[:\-.–—]\s*(.*)$/i
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        return {
          dia: Number(match[1]) || null,
          titulo: normalizeImportLine(match[2])
        };
      }
    }

    return null;
  }

  function isImportStopHeader(line: string): boolean {
    const normalized = normalizeImportLine(line)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return (
      normalized.startsWith('servicos inclusos') ||
      normalized.startsWith('informacoes importantes') ||
      normalized.startsWith('formas de pagamento') ||
      normalized === 'importante' ||
      normalized.startsWith('importante ') ||
      normalized.startsWith('outros servicos')
    );
  }

  function mapImportedTitleToDia(ordem: number, tituloBruto: string, descricaoLinhas: string[]): RotDia {
    const titulo = normalizeImportLine(tituloBruto);
    const descricao = descricaoLinhas.map((line) => normalizeImportLine(line)).filter(Boolean).join('\n');
    const routeParts = titulo
      .split(/\s(?:->|→|\/|\-|–|—)\s/)
      .map((part) => normalizeImportLine(part))
      .filter(Boolean);

    const cidade = routeParts.length > 0 ? routeParts[0] : titulo;
    const percurso = routeParts.length > 1 ? titulo : '';

    return {
      ...newDia(ordem),
      ordem,
      cidade,
      percurso,
      descricao
    };
  }

  function parseDiasImportText(text: string): RotDia[] {
    const raw = String(text || '').replace(/\r/g, '').trim();
    if (!raw) return [];

    const lines = raw.split('\n');
    const parsed: RotDia[] = [];

    let started = false;
    let expectingTitleFromNextLine = false;
    let currentTitle = '';
    let currentDescription: string[] = [];

    const commitCurrent = () => {
      if (!currentTitle.trim() && currentDescription.length === 0) return;
      parsed.push(mapImportedTitleToDia(parsed.length, currentTitle || `Dia ${parsed.length + 1}`, currentDescription));
      currentTitle = '';
      currentDescription = [];
    };

    for (const rawLine of lines) {
      const line = normalizeImportLine(rawLine);
      if (!line) continue;
      if (isImportSectionHeader(line)) continue;

      if (started && isImportStopHeader(line)) {
        break;
      }

      const header = parseDiaHeader(line);
      if (header) {
        started = true;
        commitCurrent();
        currentTitle = header.titulo;
        currentDescription = [];
        expectingTitleFromNextLine = !currentTitle;
        continue;
      }

      if (!started) {
        continue;
      }

      if (expectingTitleFromNextLine) {
        currentTitle = line;
        expectingTitleFromNextLine = false;
        continue;
      }

      if (!currentTitle) {
        currentTitle = line;
      } else {
        currentDescription.push(line);
      }
    }

    commitCurrent();

    if (parsed.length > 0) {
      return reorder(parsed);
    }

    const blocks = raw
      .split(/\n{2,}/)
      .map((block) => block.split('\n').map((line) => normalizeImportLine(line)).filter(Boolean))
      .filter((block) => block.length > 0);

    return reorder(
      blocks.map((block, index) => {
        const [titulo, ...descricaoLinhas] = block;
        return mapImportedTitleToDia(index, titulo || `Dia ${index + 1}`, descricaoLinhas);
      })
    );
  }

  function handleImportDiasText() {
    diasImportMsg = null;
    diasImportError = null;

    if (!diasImportText.trim()) {
      diasImportError = 'Cole o texto do dia a dia do circuito.';
      return;
    }

    const imported = parseDiasImportText(diasImportText);
    if (imported.length === 0) {
      diasImportError = 'Nenhum dia foi identificado. Use linhas como "Dia 1 - Chegada" ou blocos separados por linha em branco.';
      return;
    }

    dias = imported;
    duracao = String(imported.length);
    diasImportMsg = `${imported.length} dia(s) montado(s) automaticamente.`;
    toast.success(`${imported.length} dia(s) importado(s) para o roteiro.`);
    showDiasImport = false;
    diasImportText = '';
  }

  // ─── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    loading = true;
    try {
      const [roteiroRes, sugestoesRes, settingsRes] = await Promise.all([
        fetch(`/api/v1/roteiros/${roteiroId}`),
        fetch('/api/v1/roteiros/sugestoes-busca').catch(() => null),
        fetch('/api/v1/parametros/orcamentos-pdf').catch(() => null),
      ]);

      if (!roteiroRes.ok) {
        const message = (await roteiroRes.text()) || 'Erro ao carregar roteiro.';
        if (roteiroRes.status === 401) {
          toast.error('Sessão expirada. Faça login novamente para continuar.');
          const next = `${$page.url.pathname}${$page.url.search}`;
          await goto(`/auth/login?next=${encodeURIComponent(next)}`);
          return;
        }
        if (roteiroRes.status === 403) {
          toast.error(message || 'Você não tem permissão para acessar este roteiro.');
          await goto('/orcamentos/roteiros');
          return;
        }
        if (roteiroRes.status === 404) {
          toast.error(message || 'Roteiro não encontrado.');
          await goto('/orcamentos/roteiros');
          return;
        }
        throw new Error(message);
      }
      const payload = await roteiroRes.json();
      const r = payload.roteiro;

      nome = r.nome || '';
      duracao = r.duracao != null ? String(r.duracao) : '';
      inicioCidade = r.inicio_cidade || '';
      fimCidade = r.fim_cidade || '';
      incluiTexto = r.inclui_texto || '';
      naoIncluiTexto = r.nao_inclui_texto || '';
      informacoesImportantes = r.informacoes_importantes || '';

      dias = (r.dias || []).map((d: any) => ({
        ...newDia(d.ordem ?? 0),
        ...d,
        percurso: d.percurso || '',
        data: d.data || '',
        descricao: d.descricao || '',
      }));
      hoteis = (r.hoteis || []).map((h: any) => ({ ...newHotel(h.ordem ?? 0), ...h }));
      passeios = (r.passeios || []).map((p: any) => ({ ...newPasseio(p.ordem ?? 0), ...p }));
      transportes = (r.transportes || []).map((t: any) => ({ ...newTransporte(t.ordem ?? 0), ...t }));
      investimentos = (r.investimentos || []).map((i: any) => ({ ...newInvestimento(i.ordem ?? 0), ...i }));
      pagamentos = (r.pagamentos || []).map((p: any) => ({ ...newPagamento(p.ordem ?? 0), ...p }));

      if (sugestoesRes?.ok) {
        const sData = await sugestoesRes.json();
        sugestoes = sData || {};
      }

      if (settingsRes?.ok) {
        const settingsData = await settingsRes.json();
        pdfSettings = settingsData?.settings || {};
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar roteiro.');
    } finally {
      loading = false;
    }
  }

  // ─── Save ──────────────────────────────────────────────────────────────────
  async function save() {
    if (!nome.trim()) { toast.error('Nome obrigatório.'); return; }
    saving = true;
    try {
      const response = await fetch('/api/v1/roteiros/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roteiroId,
          nome: nome.trim(),
          duracao: duracao ? Number(duracao) : null,
          inicio_cidade: inicioCidade.trim() || null,
          fim_cidade: fimCidade.trim() || null,
          inclui_texto: incluiTexto || null,
          nao_inclui_texto: naoIncluiTexto || null,
          informacoes_importantes: informacoesImportantes || null,
          dias: dias.map((d, i) => ({ ...d, ordem: i })),
          hoteis: hoteis.map((h, i) => ({ ...h, ordem: i })),
          passeios: passeios.map((p, i) => ({ ...p, ordem: i })),
          transportes: transportes.map((t, i) => ({ ...t, ordem: i })),
          investimentos: investimentos.map((inv, i) => ({ ...inv, ordem: i })),
          pagamentos: pagamentos.map((p, i) => ({ ...p, ordem: i })),
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Roteiro salvo com sucesso!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  // ─── Buscar dias no banco ──────────────────────────────────────────────────
  async function buscarDias() {
    diasBuscaLoading = true;
    try {
      const params = new URLSearchParams();
      if (diasBuscaQ) params.set('q', diasBuscaQ);
      if (diasBuscaCidade) params.set('cidade', diasBuscaCidade);
      const res = await fetch(`/api/v1/roteiros/dias-busca?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      diasBuscaResults = data.dias || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao buscar dias.');
    } finally {
      diasBuscaLoading = false;
    }
  }

  function addDiaBanco(dia: any) {
    const nextItem: RotDia = {
      percurso: String(dia.percurso || '').trim(),
      cidade: String(dia.cidade || '').trim(),
      data: String(dia.data || '').trim(),
      descricao: String(dia.descricao || '').trim(),
      ordem: dias.length,
    };
    dias = [...dias, nextItem];
    showDiasBusca = false;
  }

  // ─── Gerar orçamento ───────────────────────────────────────────────────────
  let clienteSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (!showGerarModal || !gerarClienteQ || gerarClienteQ.length < 2) {
      gerarClienteResults = [];
      return;
    }
    if (clienteSearchTimeout) clearTimeout(clienteSearchTimeout);
    clienteSearchTimeout = setTimeout(async () => {
      gerarClienteLoading = true;
      try {
        const res = await fetch(`/api/v1/clientes?search=${encodeURIComponent(gerarClienteQ)}`);
        if (!res.ok) return;
        const data = await res.json();
        gerarClienteResults = data.items || data.clientes || data || [];
      } finally {
        gerarClienteLoading = false;
      }
    }, 300);
  });

  async function handleGerarOrcamento() {
    const clientName = gerarClienteSel?.nome || gerarClienteNome.trim();
    if (!clientName) { toast.error('Informe o nome do cliente.'); return; }
    gerarLoading = true;
    try {
      const res = await fetch('/api/v1/roteiros/gerar-orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roteiro_id: roteiroId,
          client_id: gerarClienteSel?.id || null,
          client_name: clientName,
          client_whatsapp: gerarClienteSel?.whatsapp || null,
          client_email: gerarClienteSel?.email || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      goto(`/orcamentos/${data.quote_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar orçamento.');
      gerarLoading = false;
    }
  }

  // ─── Import hotel text (simple parser) ────────────────────────────────────
  function handleImportHotelText() {
    hotelImportMsg = null;
    hotelImportError = null;
    if (!hotelImportText.trim()) {
      hotelImportError = 'Cole o texto com os dados dos hotéis.';
      return;
    }
    try {
      const lines = hotelImportText.split('\n').filter(l => l.trim());
      const imported: RotHotel[] = lines.map((line, idx) => {
        const h = newHotel(idx);
        h.hotel = line.trim();
        return h;
      });
      hoteis = reorder([...hoteis, ...imported]);
      hotelImportText = '';
      hotelImportMsg = `${imported.length} linha(s) importada(s). Revise os campos.`;
    } catch {
      hotelImportError = 'Não foi possível importar.';
    }
  }

  function handleImportPasseioText() {
    passeioImportMsg = null;
    passeioImportError = null;
    if (!passeioImportText.trim()) {
      passeioImportError = 'Cole o texto com os dados dos passeios.';
      return;
    }
    try {
      const lines = passeioImportText.split('\n').filter(l => l.trim());
      const imported: RotPasseio[] = lines.map((line, idx) => {
        const p = newPasseio(idx);
        p.passeio = line.trim();
        return p;
      });
      passeios = reorder([...passeios, ...imported]);
      passeioImportText = '';
      passeioImportMsg = `${imported.length} linha(s) importada(s). Revise os campos.`;
    } catch {
      passeioImportError = 'Não foi possível importar.';
    }
  }

  function handleImportAereoText() {
    aereoImportMsg = null;
    aereoImportError = null;
    if (!aereoImportText.trim()) {
      aereoImportError = 'Cole o texto com os dados das passagens.';
      return;
    }
    try {
      const imported = parseImportedRoteiroAereo(aereoImportText, new Date());
      if (imported.length === 0) {
        aereoImportError = 'Nenhum trecho aéreo foi identificado no texto colado.';
        return;
      }

      const existingImported = transportes.map((item, index) => ({
        trecho: item.trecho || '',
        cia_aerea: item.cia_aerea || '',
        data_voo: item.data_voo || item.data_inicio || '',
        data_inicio: item.data_inicio || item.data_voo || '',
        data_fim: item.data_fim || item.data_voo || '',
        classe_reserva: item.classe_reserva || '',
        hora_saida: item.hora_saida || '',
        aeroporto_saida: item.aeroporto_saida || '',
        duracao_voo: item.duracao_voo || '',
        tipo_voo: item.tipo_voo || '',
        hora_chegada: item.hora_chegada || '',
        aeroporto_chegada: item.aeroporto_chegada || '',
        tarifa_nome: item.tarifa_nome || '',
        reembolso_tipo: '',
        qtd_adultos: Number(item.qtd_adultos || 0),
        qtd_criancas: Number(item.qtd_criancas || 0),
        taxas: Number(item.taxas || 0),
        valor_total: Number(item.valor_total || 0),
        ordem: index
      }));

      const merged = mergeImportedRoteiroAereo(existingImported, imported);
      transportes = reorder(
        merged.map((item, idx) => ({
          ...newTransporte(idx),
          ordem: idx,
          tipo: 'Aéreo',
          trecho: item.trecho || '',
          cia_aerea: item.cia_aerea || '',
          data_voo: item.data_voo || '',
          data_inicio: item.data_inicio || item.data_voo || '',
          data_fim: item.data_fim || item.data_voo || '',
          classe_reserva: item.classe_reserva || '',
          hora_saida: item.hora_saida || '',
          aeroporto_saida: item.aeroporto_saida || '',
          duracao_voo: item.duracao_voo || '',
          tipo_voo: item.tipo_voo || '',
          hora_chegada: item.hora_chegada || '',
          aeroporto_chegada: item.aeroporto_chegada || '',
          tarifa_nome: item.tarifa_nome || '',
          qtd_adultos: item.qtd_adultos || null,
          qtd_criancas: item.qtd_criancas || null,
          taxas: item.taxas || null,
          valor_total: item.valor_total || null
        }))
      );
      aereoImportText = '';
      aereoImportMsg = `${imported.length} trecho(s) aéreo(s) importado(s). Revise os campos.`;
    } catch {
      aereoImportError = 'Não foi possível importar.';
    }
  }

  function escapePreviewHtml(value: string | number | null | undefined) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildPreviewList(items: string[]) {
    const filtered = items.map((item) => String(item || '').trim()).filter(Boolean);
    if (filtered.length === 0) {
      return '<p class="empty">Nenhum conteúdo informado.</p>';
    }
    return `<ul>${filtered.map((item) => `<li>${escapePreviewHtml(item)}</li>`).join('')}</ul>`;
  }

  function buildPreviewCards<T>(items: T[], render: (item: T, index: number) => string) {
    if (items.length === 0) {
      return '<p class="empty">Nenhum conteúdo informado.</p>';
    }
    return items.map(render).join('');
  }

  function formatPreviewDate(value: string | null | undefined) {
    const normalized = String(value || '').trim();
    if (!normalized) return '';

    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}-${month}-${year}`;
    }

    const isoDateTimeMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T.*$/);
    if (isoDateTimeMatch) {
      const [, year, month, day] = isoDateTimeMatch;
      return `${day}-${month}-${year}`;
    }

    return normalized;
  }

  function buildPreviewSection(title: string, content: string) {
    if (!content.trim()) return '';
    return `<section class="section"><h2>${escapePreviewHtml(title)}</h2><div class="grid">${content}</div></section>`;
  }

  function buildPreviewRawSection(title: string, content: string, sectionClass = '') {
    if (!content.trim()) return '';
    const className = ['section', sectionClass].filter(Boolean).join(' ');
    return `<section class="${className}"><h2>${escapePreviewHtml(title)}</h2>${content}</section>`;
  }

  function buildPreviewListSection(title: string, items: string[]) {
    const filtered = items.map((item) => String(item || '').trim()).filter(Boolean);
    if (filtered.length === 0) return '';
    return `<section class="section"><h2>${escapePreviewHtml(title)}</h2>${buildPreviewList(filtered)}</section>`;
  }

  function buildPreviewTable(headers: string[], rows: string[][], className = '') {
    if (rows.length === 0) return '';
    return `<div class="preview-table-wrap ${escapePreviewHtml(className)}"><table class="preview-table ${escapePreviewHtml(className)}">
      <thead>
        <tr>${headers.map((header) => `<th>${escapePreviewHtml(header)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${escapePreviewHtml(cell || '-')}</td>`).join('')}</tr>`)
          .join('')}
      </tbody>
    </table></div>`;
  }

  function splitTrechoCities(value: string | null | undefined) {
    const parts = String(value || '')
      .split(/\s+-\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    return {
      origem: parts[0] || '',
      destino: parts[1] || '',
    };
  }

  function resolvePreviewAirlineIata(value: string | null | undefined) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('lufthansa')) return 'LH';
    if (normalized.includes('latam')) return 'LA';
    if (normalized.includes('gol')) return 'G3';
    if (normalized.includes('azul')) return 'AD';
    if (normalized.includes('sky')) return 'H2';
    if (normalized.includes('tap')) return 'TP';
    if (normalized.includes('iberia')) return 'IB';
    if (normalized.includes('air france')) return 'AF';
    if (normalized.includes('klm')) return 'KL';
    if (normalized.includes('emirates')) return 'EK';
    if (normalized.includes('qatar')) return 'QR';
    if (normalized.includes('turkish')) return 'TK';
    return String(value || '').trim().slice(0, 3).toUpperCase();
  }

  function formatFlightCity(value: string | null | undefined) {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    return normalized
      .split(/\s*-\s*/)
      .map((part) => part.trim())
      .filter(Boolean)[0] || normalized;
  }

  function formatFlightPlace(city: string | null | undefined, airportCode: string | null | undefined) {
    const cityLabel = formatFlightCity(city);
    const code = String(airportCode || '').trim().toUpperCase();
    if (cityLabel && code) return `${cityLabel} (${code})`;
    if (cityLabel) return cityLabel;
    if (code) return code;
    return '';
  }

  function buildPreviewFlightTable(items: RotTransporte[]) {
    if (items.length === 0) return '';

    const airlineLegend = new Map<string, string>();
    const rows = items
      .map((item) => {
        const trecho = splitTrechoCities(item.trecho || '');
        const ciaCompleta = String(item.cia_aerea || '').trim();
        const cia = resolvePreviewAirlineIata(ciaCompleta) || ciaCompleta || 'AÉREO';
        if (ciaCompleta && cia && cia !== ciaCompleta.toUpperCase()) {
          airlineLegend.set(cia, ciaCompleta);
        }
        const origem = formatFlightPlace(trecho.origem, item.aeroporto_saida) || '-';
        const destino = formatFlightPlace(trecho.destino, item.aeroporto_chegada) || '-';
        const horarios = [String(item.hora_saida || '').trim(), String(item.hora_chegada || '').trim()].filter(Boolean).join(' / ') || '-';

        return [
          cia,
          origem,
          formatPreviewDate(item.data_voo || item.data_inicio),
          destino,
          formatPreviewDate(item.data_fim || item.data_voo || item.data_inicio),
          horarios,
        ];
      })
      .filter((row) => row.length > 0);

    const legendHtml = airlineLegend.size > 0
      ? `<div class="preview-legend">${Array.from(airlineLegend.entries()).map(([code, name]) => `<div><b>${escapePreviewHtml(code)}</b> = ${escapePreviewHtml(name)}</div>`).join('')}</div>`
      : '';

    return `${buildPreviewTable(['Cia', 'Origem', 'Saída', 'Destino', 'Chegada', 'Horários'], rows, 'flight-preview-table')}${legendHtml}`;
  }

  function extractStoragePath(url?: string | null): string | null {
    if (!url) return null;
    const marker = '/quotes/';
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  }

  function blobToDataUrl(blob: Blob, fallbackMime?: string): Promise<string> {
    return new Promise((resolve) => {
      let finalBlob = blob;
      if (fallbackMime && (!blob.type || blob.type === 'application/octet-stream')) {
        finalBlob = new Blob([blob], { type: fallbackMime });
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(finalBlob);
    });
  }

  function guessMimeFromPath(path: string): string {
    const lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    return 'image/png';
  }

  async function storageImageToDataUrl(path?: string | null, url?: string | null): Promise<string | null> {
    const storagePath = path || extractStoragePath(url);
    if (!storagePath) return null;

    try {
      const { data: blob, error } = await supabase.storage.from('quotes').download(storagePath);
      if (error || !blob) return null;
      const dataUrl = await blobToDataUrl(blob, guessMimeFromPath(storagePath));
      return dataUrl || null;
    } catch {
      return null;
    }
  }

  async function externalImageToDataUrl(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob, 'image/png');
      return dataUrl || null;
    } catch {
      return null;
    }
  }

  async function resolvePreviewPdfAssets(): Promise<PreviewPdfAssets> {
    const whatsappLink = construirLinkWhatsApp(pdfSettings.whatsapp, pdfSettings.whatsapp_codigo_pais);
    const qrSource = whatsappLink
      ? `https://quickchart.io/qr?size=200&margin=1&text=${encodeURIComponent(whatsappLink)}`
      : null;

    const [logoUrl, complementUrl, qrUrl] = await Promise.all([
      storageImageToDataUrl(pdfSettings.logo_path, pdfSettings.logo_url),
      storageImageToDataUrl(pdfSettings.imagem_complementar_path, pdfSettings.imagem_complementar_url),
      qrSource ? externalImageToDataUrl(qrSource) : Promise.resolve(null),
    ]);

    return { logoUrl, complementUrl, qrUrl };
  }

  function buildRoteiroPreviewHtml(assets: PreviewPdfAssets = { logoUrl: null, qrUrl: null, complementUrl: null }) {
    const diasItems = dias.filter((dia) => dia.cidade || dia.percurso || dia.data || dia.descricao);
    const diasHtml = diasItems.length > 0
      ? buildPreviewCards(
      diasItems,
      (dia, index) => `
        <article class="card">
          <h3>Dia ${index + 1} - ${escapePreviewHtml(dia.cidade || dia.percurso || 'Sem título')}</h3>
          ${dia.data ? `<p class="meta">${escapePreviewHtml(formatPreviewDate(dia.data))}</p>` : ''}
          ${dia.percurso && dia.percurso !== dia.cidade ? `<p class="meta">${escapePreviewHtml(dia.percurso)}</p>` : ''}
          ${dia.descricao ? `<p>${escapePreviewHtml(dia.descricao).replace(/\n/g, '<br>')}</p>` : '<p class="empty">Sem descrição.</p>'}
        </article>`
    ) : '';

    const transportesItems = transportes.filter((item) => item.trecho || item.cia_aerea || item.data_voo);
    const transportesHtml = transportesItems.length > 0
      ? buildPreviewFlightTable(transportesItems)
      : '';

    const hoteisItems = hoteis.filter((item) => item.hotel || item.cidade);
    const groupedHoteis = Array.from(
      hoteisItems.reduce((map, item) => {
        const key = String(item.cidade || 'Hotéis').trim() || 'Hotéis';
        if (!map.has(key)) map.set(key, [] as RotHotel[]);
        map.get(key)?.push(item);
        return map;
      }, new Map<string, RotHotel[]>())
    );
    const hoteisHtml = groupedHoteis.length > 0
      ? groupedHoteis
          .map(([cidade, itens]) => {
            const rows = itens.map((item) => [
              String(item.hotel || '').trim() || '-',
              formatPreviewDate(item.data_inicio) || '-',
              formatPreviewDate(item.data_fim) || '-',
              Number(item.noites || 0) > 0 ? String(Number(item.noites || 0)) : '-',
              String(item.apto || '').trim() || '-',
              String(item.regime || '').trim() || '-',
            ]);
            return `<div class="preview-group-block"><div class="preview-group-title">${escapePreviewHtml(cidade)}</div>${buildPreviewTable(['Nome hotel', 'Início', 'Fim', 'Noites', 'Acomodação', 'Regime'], rows, 'hotel-preview-table')}</div>`;
          })
          .join('')
      : '';

    const passeiosItems = passeios.filter((item) => item.passeio || item.cidade);
    const groupedPasseios = Array.from(
      passeiosItems.reduce((map, item) => {
        const key = String(item.cidade || 'Serviços').trim() || 'Serviços';
        if (!map.has(key)) map.set(key, [] as RotPasseio[]);
        map.get(key)?.push(item);
        return map;
      }, new Map<string, RotPasseio[]>())
    );
    const passeiosHtml = groupedPasseios.length > 0
      ? groupedPasseios
          .map(([cidade, itens]) => {
            const rows = itens.map((item) => {
              const dataInicio = formatPreviewDate(item.data_inicio);
              const dataFim = formatPreviewDate(item.data_fim);
              const data = dataInicio && dataFim && dataInicio !== dataFim ? `${dataInicio} a ${dataFim}` : dataInicio || dataFim || '-';
              return [data, String(item.passeio || '').trim() || '-', String(item.ingressos || '').trim() || '-'];
            });
            return `<div class="preview-group-block"><div class="preview-group-title">${escapePreviewHtml(cidade)}</div>${buildPreviewTable(['Data', 'Descrição', 'Ingressos'], rows, 'passeio-preview-table')}</div>`;
          })
          .join('')
      : '';

    const investimentoRows = investimentos
      .filter((item) => item.tipo || Number(item.valor_por_pessoa || 0) > 0 || Number(item.valor_por_apto || 0) > 0)
      .map((item) => [
        String(item.tipo || '').trim() || '-',
        Number(item.valor_por_pessoa || 0) > 0 ? `R$ ${formatBRL(Number(item.valor_por_pessoa || 0))}` : '-',
        Number(item.qtd_apto || 0) > 0 ? String(Number(item.qtd_apto || 0)) : '-',
        Number(item.valor_por_apto || 0) > 0 ? `R$ ${formatBRL(Number(item.valor_por_apto || 0))}` : '-',
      ]);
    const investimentoHtml = investimentoRows.length > 0
      ? buildPreviewTable(['Tipo', 'Valor por Pessoa', 'Qte Paxs', 'Valor total por Apto'], investimentoRows, 'investimento-preview-table')
      : '';

    const pagamentosItems = pagamentos.filter((item) => item.servico || item.valor_total_com_taxas);
    const pagamentosHtml = pagamentosItems.length > 0
      ? buildPreviewCards(
      pagamentosItems,
      (item) => `<article class="card compact"><h3>${escapePreviewHtml(item.servico || 'Pagamento')}</h3><p>${escapePreviewHtml([item.forma_pagamento, item.valor_total_com_taxas != null ? `R$ ${formatBRL(Number(item.valor_total_com_taxas || 0))}` : ''].filter(Boolean).join(' • '))}</p></article>`
    ) : '';

    const includesSection = buildPreviewListSection('O roteiro inclui', incluiTexto.split('\n'));
    const excludesSection = buildPreviewListSection('O roteiro não inclui', naoIncluiTexto.split('\n'));
    const infoSection = buildPreviewListSection('Informações importantes', informacoesImportantes.split('\n'));

    const footerLines = String(pdfSettings.rodape_texto || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const rightLines = [
      pdfSettings.consultor_nome ? `Consultor: ${pdfSettings.consultor_nome}` : '',
      pdfSettings.telefone ? `Telefone: ${pdfSettings.telefone}` : '',
      pdfSettings.whatsapp ? `WhatsApp: ${pdfSettings.whatsapp}` : '',
      pdfSettings.email ? `E-mail: ${pdfSettings.email}` : '',
    ].filter(Boolean);

    const citiesLine = [inicioCidade, fimCidade].filter(Boolean).join(' • ');
    const periodText = (() => {
      const firstDia = diasItems.find((item) => item.data)?.data || transportesItems.find((item) => item.data_voo || item.data_inicio)?.data_voo || transportesItems.find((item) => item.data_inicio)?.data_inicio || '';
      const lastDia = [...diasItems].reverse().find((item) => item.data)?.data || [...transportesItems].reverse().find((item) => item.data_fim || item.data_voo || item.data_inicio)?.data_fim || '';
      const start = formatPreviewDate(firstDia);
      const end = formatPreviewDate(lastDia);
      if (start && end && start !== end) return `${start} a ${end}`;
      return start || end || '';
    })();

    const headerCardHtml = `
      <section class="preview-header-card">
        <table class="preview-header-table">
          <tbody>
            <tr>
              <td class="preview-header-left">
                ${assets.logoUrl ? `<img src="${escapePreviewHtml(assets.logoUrl)}" class="preview-logo" alt="Logo" />` : ''}
                <div class="preview-header-copy">
                  ${pdfSettings.filial_nome ? `<div>${escapePreviewHtml(`Filial: ${pdfSettings.filial_nome}`)}</div>` : ''}
                  ${pdfSettings.endereco_linha1 ? `<div>${escapePreviewHtml(pdfSettings.endereco_linha1)}</div>` : ''}
                  ${pdfSettings.endereco_linha2 ? `<div>${escapePreviewHtml(pdfSettings.endereco_linha2)}</div>` : ''}
                  ${pdfSettings.endereco_linha3 ? `<div>${escapePreviewHtml(pdfSettings.endereco_linha3)}</div>` : ''}
                </div>
              </td>
              <td class="preview-header-right">
                <table class="preview-header-right-inner">
                  <tbody>
                    <tr>
                      <td class="preview-right-lines">
                        ${assets.qrUrl ? '<div class="preview-qr-label">Aponte para o QR Code abaixo e chame o consultor:</div>' : ''}
                        ${rightLines.map((line) => `<div>${escapePreviewHtml(line)}</div>`).join('')}
                      </td>
                      ${assets.qrUrl ? `<td class="preview-qr-cell"><img src="${escapePreviewHtml(assets.qrUrl)}" class="preview-qr" alt="QR Code WhatsApp" /></td>` : ''}
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="preview-header-divider"></div>
      </section>`;

    const titleCardHtml = `
      <section class="preview-title-card">
        <div class="preview-title-kicker">Roteiro Personalizado</div>
        <div class="preview-title-name">${escapePreviewHtml(nome || 'Roteiro')}</div>
        ${citiesLine ? `<div class="preview-title-meta"><b>Cidades:</b> ${escapePreviewHtml(citiesLine)}</div>` : ''}
        ${periodText ? `<div class="preview-title-meta"><b>Período:</b> ${escapePreviewHtml(periodText)}</div>` : ''}
      </section>`;

    const footerHtml = footerLines.length > 0
      ? `<section class="preview-footer-card"><div>${footerLines.map((line) => escapePreviewHtml(line)).join('<br/>')}</div>${assets.complementUrl ? `<div class="preview-complement-img"><img src="${escapePreviewHtml(assets.complementUrl)}" alt="Imagem complementar" /></div>` : ''}</section>`
      : '';

    return `<!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapePreviewHtml(nome || 'Roteiro')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
            .shell { max-width: 960px; margin: 0 auto; padding: 24px; }
            .toolbar { position: sticky; top: 0; display: flex; justify-content: flex-end; gap: 12px; padding: 16px 0; background: #f8fafc; }
            .toolbar button { border: 0; border-radius: 999px; padding: 10px 16px; background: #0f766e; color: white; cursor: pointer; }
            .preview-header-card, .preview-title-card, .preview-footer-card, .section { background: white; border: 1px solid #d1d5db; border-radius: 12px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }
            .preview-header-card { padding: 12px 14px; margin: 0 0 12px 0; }
            .preview-header-table { width: 100%; border-collapse: separate; border-spacing: 0; }
            .preview-header-left, .preview-header-right { vertical-align: top; }
            .preview-header-left { width: 52%; }
            .preview-header-right { width: 48%; font-size: 11px; color: #334155; }
            .preview-header-right-inner { width: 100%; border-collapse: separate; border-spacing: 0; }
            .preview-logo { max-width: 120px; max-height: 56px; width: auto; height: auto; object-fit: contain; }
            .preview-header-copy { font-size: 11px; color: #0f172a; margin: 8px 0 0 0; }
            .preview-right-lines { vertical-align: top; }
            .preview-qr-label { font-size: 9px; color: #475569; margin: 0 0 5px 0; }
            .preview-qr-cell { vertical-align: top; text-align: right; width: 76px; }
            .preview-qr { width: 66px; height: 66px; }
            .preview-header-divider { height: 1px; background: #dbe3f0; margin: 10px 0 0 0; }
            .preview-title-card { padding: 14px 16px; margin: 0 0 14px 0; }
            .preview-title-kicker { font-size: 18px; font-weight: 700; color: #1a2cc8; }
            .preview-title-name { font-size: 15px; font-weight: 700; color: #0f172a; margin: 6px 0 0 0; }
            .preview-title-meta { font-size: 12px; color: #334155; margin: 6px 0 0 0; }
            .section { margin-top: 24px; background: white; border-radius: 18px; padding: 22px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }
            .section h2 { margin: 0 0 16px; font-size: 18px; }
            .grid { display: grid; gap: 12px; }
            .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; }
            .card.compact h3 { margin-bottom: 6px; }
            .card h3 { margin: 0 0 8px; font-size: 15px; }
            .card p { margin: 0; line-height: 1.55; white-space: normal; }
            .preview-table-wrap { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 14px; }
            .preview-table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .preview-table thead th { text-align: left; padding: 8px; border-bottom: 1px solid #cbd5e1; background: #eef2ff; color: #1e3a8a; }
            .preview-table tbody td { padding: 8px; border-bottom: 1px solid #e2e8f0; color: #475569; vertical-align: top; }
            .preview-table tbody tr:last-child td { border-bottom: 0; }
            .preview-group-block { margin: 0 0 12px 0; }
            .preview-group-title { font-size: 15px; font-weight: 700; color: #334155; margin: 0 0 10px 0; }
            .preview-legend { margin-top: 10px; font-size: 11px; color: #334155; }
            .preview-legend div + div { margin-top: 4px; }
            .preview-footer-card { padding: 12px 14px; margin: 0 0 12px 0; font-size: 10px; color: #64748b; }
            .preview-complement-img { margin: 12px 0 0 0; text-align: center; }
            .preview-complement-img img { max-height: 170px; max-width: 100%; }
            .hotel-preview-table.preview-table { font-size: 13px; }
            .hotel-preview-table.preview-table thead th { font-size: 12px; }
            .hotel-preview-table.preview-table tbody td { font-size: 13px; }
            .flight-preview-table.preview-table { font-size: 13px; }
            .flight-preview-table.preview-table thead th { font-size: 12px; }
            .flight-preview-table.preview-table tbody td { font-size: 13px; }
            .meta { color: #475569; font-size: 13px; margin-bottom: 8px !important; }
            .empty { color: #64748b; font-style: italic; }
            ul { margin: 0; padding-left: 18px; }
            li { margin: 0 0 6px; }
            @media print {
              @page { margin: 12mm; }
              body { background: white; }
              .toolbar { display: none; }
              .shell { max-width: none; padding: 0; }
              .preview-header-card, .preview-title-card, .preview-footer-card, .section { box-shadow: none; border-radius: 0; }
              .preview-title-card, .section { padding: 12px 14px 18px; }
              .preview-table-wrap { border-radius: 0; }
              .section { break-inside: auto; page-break-inside: auto; }
              .section h2 { break-after: avoid; page-break-after: avoid; }
              .preview-header-card,
              .preview-title-card,
              .preview-footer-card,
              .card,
              .preview-group-block,
              .preview-table-wrap,
              .preview-complement-img,
              .preview-header-table,
              .preview-header-right-inner {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="shell">
            <div class="toolbar"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div>
            ${headerCardHtml}
            ${titleCardHtml}
            ${buildPreviewSection('Itinerário Detalhado', diasHtml)}
            ${buildPreviewRawSection('Hotéis Sugeridos', hoteisHtml, 'preview-hotels-section')}
            ${buildPreviewRawSection('Passeios e Serviços', passeiosHtml, 'preview-passeios-section')}
            ${buildPreviewRawSection('Passagem Aérea', transportesHtml, 'preview-airfare-section')}
            ${buildPreviewRawSection('Investimento', investimentoHtml, 'preview-investimento-section')}
            ${buildPreviewSection('Pagamento', pagamentosHtml)}
            ${buildPreviewListSection('O que está incluído', incluiTexto.split('\n'))}
            ${buildPreviewListSection('O que não está incluído', naoIncluiTexto.split('\n'))}
            ${buildPreviewListSection('Informações Importantes', informacoesImportantes.split('\n'))}
            ${footerHtml}
          </div>
        </body>
      </html>`;
  }

  async function handlePreviewPdf() {
    if (!browser) return;
    previewingPdf = true;
    try {
      const assets = await resolvePreviewPdfAssets();
      const html = buildRoteiroPreviewHtml(assets);
      const previewUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const previewWindow = window.open(previewUrl, '_blank');
      if (!previewWindow) {
        throw new Error('Não foi possível abrir a prévia do PDF. Verifique o bloqueador de pop-up.');
      }
      window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
      previewWindow.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao visualizar PDF.');
    } finally {
      previewingPdf = false;
    }
  }

  function formatBRL(value: number | null | undefined): string {
    if (value == null) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  async function ensureServerSessionCookie() {
    if (!browser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      });
    } catch {
      // Falha silenciosa: a tela ainda tentará carregar e tratará 401 explicitamente.
    }
  }

  onMount(async () => {
    await ensureServerSessionCookie();
    await load();
  });
</script>

<svelte:head>
  <title>{nome || 'Roteiro'} | VTUR</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>
{:else}
  <PageHeader
    title={nome || 'Roteiro'}
    subtitle="Edite o roteiro personalizado com hotéis, passeios, aéreo, itinerário, investimento e pagamento."
    color="clientes"
    breadcrumbs={[
      { label: 'Orçamentos', href: '/orcamentos' },
      { label: 'Roteiros', href: '/orcamentos/roteiros' },
      { label: nome || 'Roteiro' }
    ]}
    actions={[
      { label: 'Voltar', href: '/orcamentos/roteiros', variant: 'secondary', icon: ArrowLeft }
    ]}
  />

  <!-- ─── Cabeçalho do roteiro ──────────────────────────────────────────── -->
  <Card title="Dados do roteiro" color="clientes" class="mb-4">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      <div class="lg:col-span-2">
        <FieldInput label="Nome" required bind:value={nome} placeholder="Nome do roteiro" id="rot-nome" />
      </div>
      <div>
        <FieldInput label="Duração (dias)" type="number" min="1" bind:value={duracao} placeholder="Ex: 7" id="rot-dur" />
      </div>
      <div>
        <FieldDatalistInput
          id="rot-orig"
          label="Cidade / Início"
          bind:value={inicioCidade}
          placeholder="Ex: São Paulo"
          options={sugestoes['cidade'] || []}
          class_name="w-full"
          listId="sugestoes-cidade"
        />
        <datalist id="sugestoes-cidade">
          {#each (sugestoes['cidade'] || []) as s}<option value={s}></option>{/each}
        </datalist>
      </div>
      <div>
        <FieldDatalistInput
          id="rot-dest"
          label="Cidade / Fim"
          bind:value={fimCidade}
          placeholder="Ex: Lisboa"
          options={sugestoes['cidade'] || []}
          class_name="w-full"
          listId="sugestoes-cidade"
        />
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <Button type="button" variant="secondary" size="sm" on:click={() => goto('/orcamentos/roteiros')}>Cancelar</Button>
      <Button type="button" variant="secondary" size="sm" loading={previewingPdf} on:click={handlePreviewPdf}>
        <FileText size={14} class="mr-1" />
        Visualizar PDF
      </Button>
      <Button type="button" variant="primary" color="clientes" size="sm" loading={saving} on:click={save}>
        <Save size={14} class="mr-1" />
        Salvar roteiro
      </Button>
      <Button type="button" variant="secondary" size="sm" on:click={() => { showGerarModal = true; }}>
        <DollarSign size={14} class="mr-1" />
        Gerar Orçamento
      </Button>
    </div>
  </Card>

  <!-- ─── Abas ──────────────────────────────────────────────────────────── -->
  <Tabs
    className="mb-4"
    bind:activeKey={abaAtiva}
    items={ABAS.map((aba) => ({
      key: aba.id,
      label: aba.label,
      badge: tabCounts[aba.id] > 0 ? tabCounts[aba.id] : null
    }))}
  />

  <!-- ──────────────────── ABA: ITINERÁRIO ───────────────────────────────── -->
  {#if abaAtiva === 'itinerario'}
    <Card title="Itinerário dia a dia" color="clientes">
      <div class="mb-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" on:click={() => { showDiasImport = true; diasImportError = null; diasImportMsg = null; }}>
          <FileText size={13} class="mr-1" />
          Importar dia a dia
        </Button>
        <Button type="button" variant="secondary" size="sm" on:click={() => { showDiasBusca = true; }}>
          Buscar dias no banco
        </Button>
        <Button type="button" variant="secondary" size="sm" on:click={() => { dias = addItem(dias, newDia); }}>
          <Plus size={13} class="mr-1" />
          Adicionar dia
        </Button>
      </div>

      {#if dias.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhum dia adicionado. Clique em "Adicionar dia" ou "Buscar dias no banco".</p>
      {:else}
        <div class="space-y-2">
          {#each dias as dia, index}
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div class="mb-2 flex items-center justify-between">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-clientes-100 text-xs font-bold text-clientes-700">
                  {index + 1}
                </span>
                <div class="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === 0}
                    ariaLabel="Mover dia para cima"
                    title="Mover dia para cima"
                    on:click={() => { dias = moveUp(dias, index); }}
                  >
                    <ChevronUp size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === dias.length - 1}
                    ariaLabel="Mover dia para baixo"
                    title="Mover dia para baixo"
                    on:click={() => { dias = moveDown(dias, index); }}
                  >
                    <ChevronDown size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-red-600"
                    ariaLabel="Remover dia"
                    title="Remover dia"
                    on:click={() => { dias = removeItem(dias, index); }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FieldDatalistInput
                  label="Cidade"
                  bind:value={dia.cidade}
                  placeholder="Cidade"
                  options={sugestoes['cidade'] || []}
                  class_name="w-full"
                  listId="sugestoes-cidade"
                />
                <FieldInput
                  label="Percurso"
                  bind:value={dia.percurso}
                  placeholder="Ex: São Paulo → Lisboa"
                  class_name="w-full"
                />
                <FieldInput
                  label="Data"
                  type="date"
                  bind:value={dia.data}
                  class_name="w-full"
                />
                <FieldInput
                  label="Descrição"
                  bind:value={dia.descricao}
                  placeholder="Atividades do dia"
                  class_name="w-full"
                />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>

  <!-- ──────────────────── ABA: HOTÉIS ──────────────────────────────────── -->
  {:else if abaAtiva === 'hoteis'}
    <Card title="Hotéis" color="clientes">
      <div class="mb-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" on:click={() => { hoteis = addItem(hoteis, newHotel); }}>
          <Plus size={13} class="mr-1" />
          Adicionar hotel
        </Button>
      </div>

      {#if hoteis.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhum hotel adicionado.</p>
      {:else}
        <div class="space-y-3">
          {#each hoteis as hotel, index}
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">Hotel {index + 1}</span>
                <div class="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === 0}
                    ariaLabel="Mover hotel para cima"
                    title="Mover hotel para cima"
                    on:click={() => { hoteis = moveUp(hoteis, index); }}
                  >
                    <ChevronUp size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === hoteis.length - 1}
                    ariaLabel="Mover hotel para baixo"
                    title="Mover hotel para baixo"
                    on:click={() => { hoteis = moveDown(hoteis, index); }}
                  >
                    <ChevronDown size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-red-600"
                    ariaLabel="Remover hotel"
                    title="Remover hotel"
                    on:click={() => { hoteis = removeItem(hoteis, index); }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                <div class="col-span-2">
                  <FieldDatalistInput
                    label="Cidade"
                    bind:value={hotel.cidade}
                    placeholder="Cidade"
                    options={sugestoes['cidade'] || []}
                    class_name="w-full"
                    listId="sugestoes-cidade"
                  />
                </div>
                <div class="col-span-2">
                  <FieldInput
                    label="Hotel"
                    bind:value={hotel.hotel}
                    placeholder="Nome do hotel"
                    class_name="w-full"
                  />
                </div>
                <div class="col-span-2">
                  <FieldInput
                    label="Endereço"
                    bind:value={hotel.endereco}
                    placeholder="Endereço"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Data entrada"
                    type="date"
                    value={hotel.data_inicio}
                    class_name="w-full"
                    on:change={(e) => onHotelDateChange(index, 'data_inicio', (e.target as HTMLInputElement).value)}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Data saída"
                    type="date"
                    value={hotel.data_fim}
                    class_name="w-full"
                    on:change={(e) => onHotelDateChange(index, 'data_fim', (e.target as HTMLInputElement).value)}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Noites"
                    type="number"
                    value={hotel.noites ?? ''}
                    class_name="w-full"
                    placeholder="Auto"
                    on:input={(e) => { hoteis = updateItem(hoteis, index, { noites: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Qtd. aptos"
                    type="number"
                    value={hotel.qtd_apto ?? ''}
                    class_name="w-full"
                    on:input={(e) => { hoteis = updateItem(hoteis, index, { qtd_apto: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Apto (tipo)"
                    bind:value={hotel.apto}
                    placeholder="Ex: Duplo"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldSelect
                    label="Categoria"
                    bind:value={hotel.categoria}
                    options={HOTEL_CATEGORIA_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldSelect
                    label="Regime"
                    bind:value={hotel.regime}
                    options={HOTEL_REGIME_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Tipo tarifa"
                    bind:value={hotel.tipo_tarifa}
                    placeholder="Ex: Cortesia"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Adultos"
                    type="number"
                    value={hotel.qtd_adultos ?? ''}
                    class_name="w-full"
                    on:input={(e) => { hoteis = updateItem(hoteis, index, { qtd_adultos: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Crianças"
                    type="number"
                    value={hotel.qtd_criancas ?? ''}
                    class_name="w-full"
                    on:input={(e) => { hoteis = updateItem(hoteis, index, { qtd_criancas: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Valor original (R$)"
                    type="number"
                    value={hotel.valor_original ?? ''}
                    class_name="w-full"
                    on:input={(e) => { hoteis = updateItem(hoteis, index, { valor_original: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Valor final (R$)"
                    type="number"
                    value={hotel.valor_final ?? ''}
                    class_name="w-full"
                    on:input={(e) => { hoteis = updateItem(hoteis, index, { valor_final: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Import por texto -->
      <div class="mt-6 rounded-xl border border-dashed border-slate-300 p-4">
        <p class="mb-2 text-sm font-medium text-slate-600">Importar hotéis por texto</p>
        <FieldTextarea bind:value={hotelImportText} rows={4} class_name="w-full" monospace={true}
          placeholder="Cole o texto com dados dos hotéis (um por linha ou texto livre)…" />
        <div class="mt-2 flex items-center gap-3">
          <Button type="button" variant="secondary" size="sm" on:click={handleImportHotelText}>Importar</Button>
          {#if hotelImportMsg}<span class="text-xs text-green-600">{hotelImportMsg}</span>{/if}
          {#if hotelImportError}<span class="text-xs text-red-600">{hotelImportError}</span>{/if}
        </div>
      </div>
    </Card>

  <!-- ──────────────────── ABA: PASSEIOS ────────────────────────────────── -->
  {:else if abaAtiva === 'passeios'}
    <Card title="Passeios e Serviços" color="clientes">
      <div class="mb-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" on:click={() => { passeios = addItem(passeios, newPasseio); }}>
          <Plus size={13} class="mr-1" />
          Adicionar passeio
        </Button>
      </div>

      {#if passeios.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhum passeio adicionado.</p>
      {:else}
        <div class="space-y-3">
          {#each passeios as passeio, index}
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">Passeio {index + 1}</span>
                <div class="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === 0}
                    ariaLabel="Mover passeio para cima"
                    title="Mover passeio para cima"
                    on:click={() => { passeios = moveUp(passeios, index); }}
                  >
                    <ChevronUp size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === passeios.length - 1}
                    ariaLabel="Mover passeio para baixo"
                    title="Mover passeio para baixo"
                    on:click={() => { passeios = moveDown(passeios, index); }}
                  >
                    <ChevronDown size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-red-600"
                    ariaLabel="Remover passeio"
                    title="Remover passeio"
                    on:click={() => { passeios = removeItem(passeios, index); }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                <div class="col-span-2">
                  <FieldDatalistInput
                    label="Cidade"
                    bind:value={passeio.cidade}
                    placeholder="Cidade"
                    options={sugestoes['cidade'] || []}
                    class_name="w-full"
                    listId="sugestoes-cidade"
                  />
                </div>
                <div class="col-span-2">
                  <FieldInput
                    label="Passeio / Serviço"
                    bind:value={passeio.passeio}
                    placeholder="Nome do passeio"
                    class_name="w-full"
                  />
                </div>
                <div class="col-span-2">
                  <FieldInput
                    label="Fornecedor"
                    bind:value={passeio.fornecedor}
                    placeholder="Fornecedor"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Data início"
                    type="date"
                    bind:value={passeio.data_inicio}
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Data fim"
                    type="date"
                    bind:value={passeio.data_fim}
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldSelect
                    label="Tipo"
                    bind:value={passeio.tipo}
                    options={PASSEIO_TIPO_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                    placeholder={null}
                    class_name="w-full"
                  />
                </div>
                {#if passeio.tipo === 'Ingresso' || passeio.tipo === 'Passeio'}
                  <div>
                    <FieldInput
                      label="Ingressos"
                      bind:value={passeio.ingressos}
                      placeholder="Ex: Sim / Incluso"
                      class_name="w-full"
                    />
                  </div>
                {/if}
                <div>
                  <FieldInput
                    label="Adultos"
                    type="number"
                    value={passeio.qtd_adultos ?? ''}
                    class_name="w-full"
                    on:input={(e) => { passeios = updateItem(passeios, index, { qtd_adultos: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Crianças"
                    type="number"
                    value={passeio.qtd_criancas ?? ''}
                    class_name="w-full"
                    on:input={(e) => { passeios = updateItem(passeios, index, { qtd_criancas: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Valor original (R$)"
                    type="number"
                    value={passeio.valor_original ?? ''}
                    class_name="w-full"
                    on:input={(e) => { passeios = updateItem(passeios, index, { valor_original: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Valor final (R$)"
                    type="number"
                    value={passeio.valor_final ?? ''}
                    class_name="w-full"
                    on:input={(e) => { passeios = updateItem(passeios, index, { valor_final: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="mt-6 rounded-xl border border-dashed border-slate-300 p-4">
        <p class="mb-2 text-sm font-medium text-slate-600">Importar passeios por texto</p>
        <FieldTextarea bind:value={passeioImportText} rows={4} class_name="w-full" monospace={true}
          placeholder="Cole o texto com dados dos passeios (um por linha ou texto livre)…" />
        <div class="mt-2 flex items-center gap-3">
          <Button type="button" variant="secondary" size="sm" on:click={handleImportPasseioText}>Importar</Button>
          {#if passeioImportMsg}<span class="text-xs text-green-600">{passeioImportMsg}</span>{/if}
          {#if passeioImportError}<span class="text-xs text-red-600">{passeioImportError}</span>{/if}
        </div>
      </div>
    </Card>

  <!-- ──────────────────── ABA: AÉREO ───────────────────────────────────── -->
  {:else if abaAtiva === 'transporte'}
    <Card title="Passagem Aérea" color="clientes">
      <div class="mb-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" on:click={() => { transportes = addItem(transportes, newTransporte); }}>
          <Plus size={13} class="mr-1" />
          Adicionar trecho
        </Button>
      </div>

      {#if transportes.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhum trecho aéreo adicionado.</p>
      {:else}
        <div class="space-y-3">
          {#each transportes as transporte, index}
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">Trecho {index + 1}</span>
                <div class="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === 0}
                    ariaLabel="Mover trecho para cima"
                    title="Mover trecho para cima"
                    on:click={() => { transportes = moveUp(transportes, index); }}
                  >
                    <ChevronUp size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === transportes.length - 1}
                    ariaLabel="Mover trecho para baixo"
                    title="Mover trecho para baixo"
                    on:click={() => { transportes = moveDown(transportes, index); }}
                  >
                    <ChevronDown size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-red-600"
                    ariaLabel="Remover trecho"
                    title="Remover trecho"
                    on:click={() => { transportes = removeItem(transportes, index); }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                <div>
                  <FieldSelect
                    label="Tipo"
                    bind:value={transporte.tipo}
                    options={TRANSPORTE_TIPO_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                    placeholder={null}
                    class_name="w-full"
                  />
                </div>
                <div class="col-span-2">
                  <FieldInput
                    label="Trecho"
                    bind:value={transporte.trecho}
                    placeholder="Ex: GRU → LIS"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Cia. Aérea"
                    bind:value={transporte.cia_aerea}
                    placeholder="Ex: LATAM"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Data do voo"
                    type="date"
                    bind:value={transporte.data_voo}
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldSelect
                    label="Tipo voo"
                    bind:value={transporte.tipo_voo}
                    options={TRANSPORTE_TIPO_VOO_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                    placeholder={null}
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Classe reserva"
                    bind:value={transporte.classe_reserva}
                    placeholder="Ex: Econômica"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Hora saída"
                    bind:value={transporte.hora_saida}
                    placeholder="HH:MM"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Aeroporto saída"
                    bind:value={transporte.aeroporto_saida}
                    placeholder="Ex: GRU"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Duração voo"
                    bind:value={transporte.duracao_voo}
                    placeholder="Ex: 11h30"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Hora chegada"
                    bind:value={transporte.hora_chegada}
                    placeholder="HH:MM"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Aeroporto chegada"
                    bind:value={transporte.aeroporto_chegada}
                    placeholder="Ex: LIS"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Tarifa"
                    bind:value={transporte.tarifa_nome}
                    placeholder="Ex: Light"
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Adultos"
                    type="number"
                    value={transporte.qtd_adultos ?? ''}
                    class_name="w-full"
                    on:input={(e) => { transportes = updateItem(transportes, index, { qtd_adultos: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Crianças"
                    type="number"
                    value={transporte.qtd_criancas ?? ''}
                    class_name="w-full"
                    on:input={(e) => { transportes = updateItem(transportes, index, { qtd_criancas: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Valor total (R$)"
                    type="number"
                    value={transporte.valor_total ?? ''}
                    class_name="w-full"
                    on:input={(e) => onAereoValorChange(index, 'valor_total', (e.target as HTMLInputElement).value)}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Taxas (R$)"
                    type="number"
                    value={transporte.taxas ?? ''}
                    class_name="w-full"
                    on:input={(e) => onAereoValorChange(index, 'taxas', (e.target as HTMLInputElement).value)}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Categoria"
                    bind:value={transporte.categoria}
                    placeholder="Ex: Executiva"
                    class_name="w-full"
                  />
                </div>
                <div class="col-span-2">
                  <FieldInput
                    label="Observação"
                    bind:value={transporte.observacao}
                    placeholder="Observações"
                    class_name="w-full"
                  />
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="mt-6 rounded-xl border border-dashed border-slate-300 p-4">
        <p class="mb-2 text-sm font-medium text-slate-600">Importar passagens por texto</p>
        <FieldTextarea bind:value={aereoImportText} rows={4} class_name="w-full" monospace={true}
          placeholder="Cole o texto com dados das passagens (um trecho por linha ou texto livre)…" />
        <div class="mt-2 flex items-center gap-3">
          <Button type="button" variant="secondary" size="sm" on:click={handleImportAereoText}>Importar</Button>
          {#if aereoImportMsg}<span class="text-xs text-green-600">{aereoImportMsg}</span>{/if}
          {#if aereoImportError}<span class="text-xs text-red-600">{aereoImportError}</span>{/if}
        </div>
      </div>
    </Card>

  <!-- ──────────────────── ABA: INVESTIMENTO ────────────────────────────── -->
  {:else if abaAtiva === 'investimento'}
    <Card title="Investimento" color="clientes">
      <div class="mb-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" on:click={() => { investimentos = addItem(investimentos, newInvestimento); }}>
          <Plus size={13} class="mr-1" />
          Adicionar linha
        </Button>
      </div>

      {#if investimentos.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhuma linha de investimento adicionada.</p>
      {:else}
        <div class="space-y-3">
          {#each investimentos as inv, index}
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">Linha {index + 1}</span>
                <div class="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === 0}
                    ariaLabel="Mover linha de investimento para cima"
                    title="Mover linha de investimento para cima"
                    on:click={() => { investimentos = moveUp(investimentos, index); }}
                  >
                    <ChevronUp size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === investimentos.length - 1}
                    ariaLabel="Mover linha de investimento para baixo"
                    title="Mover linha de investimento para baixo"
                    on:click={() => { investimentos = moveDown(investimentos, index); }}
                  >
                    <ChevronDown size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-red-600"
                    ariaLabel="Remover linha de investimento"
                    title="Remover linha de investimento"
                    on:click={() => { investimentos = removeItem(investimentos, index); }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <FieldSelect
                    label="Tipo"
                    bind:value={inv.tipo}
                    options={INVESTIMENTO_TIPO_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                    class_name="w-full"
                  />
                </div>
                <div>
                  <FieldInput
                    label="Valor por pessoa (R$)"
                    type="number"
                    value={inv.valor_por_pessoa ?? ''}
                    class_name="w-full"
                    on:input={(e) => onInvestimentoChange(index, 'valor_por_pessoa', (e.target as HTMLInputElement).value)}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Qtd. aptos"
                    type="number"
                    value={inv.qtd_apto ?? ''}
                    class_name="w-full"
                    on:input={(e) => onInvestimentoChange(index, 'qtd_apto', (e.target as HTMLInputElement).value)}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Valor por apto (R$)"
                    type="number"
                    value={inv.valor_por_apto ?? ''}
                    class_name="w-full"
                    helper="(calc.)"
                    readonly
                  />
                </div>
              </div>
            </div>
          {/each}
        </div>

        <div class="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-right text-sm font-medium text-slate-700">
          Total por pessoa: <span class="text-clientes-700 font-bold">R$ {formatBRL(totalInvestimento)}</span>
        </div>
      {/if}
    </Card>

  <!-- ──────────────────── ABA: PAGAMENTO ───────────────────────────────── -->
  {:else if abaAtiva === 'pagamento'}
    <Card title="Pagamento" color="clientes">
      <div class="mb-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" on:click={() => { pagamentos = addItem(pagamentos, newPagamento); }}>
          <Plus size={13} class="mr-1" />
          Adicionar linha
        </Button>
      </div>

      {#if pagamentos.length === 0}
        <p class="py-6 text-center text-sm text-slate-400">Nenhuma linha de pagamento adicionada.</p>
      {:else}
        <div class="space-y-3">
          {#each pagamentos as pag, index}
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">Linha {index + 1}</span>
                <div class="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === 0}
                    ariaLabel="Mover linha de pagamento para cima"
                    title="Mover linha de pagamento para cima"
                    on:click={() => { pagamentos = moveUp(pagamentos, index); }}
                  >
                    <ChevronUp size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-slate-600"
                    disabled={index === pagamentos.length - 1}
                    ariaLabel="Mover linha de pagamento para baixo"
                    title="Mover linha de pagamento para baixo"
                    on:click={() => { pagamentos = moveDown(pagamentos, index); }}
                  >
                    <ChevronDown size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class_name="text-slate-400 hover:text-red-600"
                    ariaLabel="Remover linha de pagamento"
                    title="Remover linha de pagamento"
                    on:click={() => { pagamentos = removeItem(pagamentos, index); }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="col-span-2">
                  <FieldSelect
                    label="Serviço"
                    bind:value={pag.servico}
                    options={[
                      ...PAGAMENTO_SERVICO_OPTIONS.map((opt) => ({ value: opt, label: opt })),
                      ...pagamentos
                        .map((p) => p.servico)
                        .filter((s) => s && !PAGAMENTO_SERVICO_OPTIONS.includes(s))
                        .map((custom) => ({ value: custom, label: custom }))
                    ]}
                    class_name="w-full"
                  />
                </div>
                <div class="col-span-2">
                  <FieldDatalistInput
                    label="Forma de pagamento"
                    bind:value={pag.forma_pagamento}
                    placeholder="Ex: Crédito, PIX, Boleto"
                    options={sugestoes['forma_pagamento'] || []}
                    class_name="w-full"
                    listId="sugestoes-forma-pagamento"
                  />
                  <datalist id="sugestoes-forma-pagamento">
                    {#each (sugestoes['forma_pagamento'] || []) as s}<option value={s}></option>{/each}
                  </datalist>
                </div>
                <div>
                  <FieldInput
                    label="Valor total com taxas (R$)"
                    type="number"
                    value={pag.valor_total_com_taxas ?? ''}
                    class_name="w-full"
                    on:input={(e) => { pagamentos = updateItem(pagamentos, index, { valor_total_com_taxas: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
                <div>
                  <FieldInput
                    label="Taxas (R$)"
                    type="number"
                    value={pag.taxas ?? ''}
                    class_name="w-full"
                    on:input={(e) => { pagamentos = updateItem(pagamentos, index, { taxas: Number((e.target as HTMLInputElement).value) || null }); }}
                  />
                </div>
              </div>
            </div>
          {/each}
        </div>

        <div class="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-right text-sm font-medium text-slate-700">
          Total: <span class="text-clientes-700 font-bold">R$ {formatBRL(totalPagamento)}</span>
        </div>
      {/if}
    </Card>

  <!-- ──────────────────── ABA: INCLUSÕES ───────────────────────────────── -->
  {:else if abaAtiva === 'inclusoes'}
    <Card title="Inclusões / Não inclusões" color="clientes">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label class="vtur-label" for="inclui">O roteiro inclui</label>
          <FieldTextarea
            id="inclui"
            bind:value={incluiTexto}
            rows={12}
            class_name="w-full"
            monospace={true}
            placeholder="Uma inclusão por linha&#10;Ex: Passagem aérea&#10;Hotel com café da manhã&#10;Transfer aeroporto/hotel"
          />
          <p class="mt-1 text-xs text-slate-400">{incluiTexto.split('\n').filter(l => l.trim()).length} linha(s)</p>
        </div>
        <div>
          <label class="vtur-label" for="nao-inclui">O roteiro NÃO inclui</label>
          <FieldTextarea
            id="nao-inclui"
            bind:value={naoIncluiTexto}
            rows={12}
            class_name="w-full"
            monospace={true}
            placeholder="Uma exclusão por linha&#10;Ex: Despesas pessoais&#10;Passeios opcionais&#10;Vistos"
          />
          <p class="mt-1 text-xs text-slate-400">{naoIncluiTexto.split('\n').filter(l => l.trim()).length} linha(s)</p>
        </div>
      </div>
    </Card>

  <!-- ──────────────────── ABA: INFORMAÇÕES ─────────────────────────────── -->
  {:else if abaAtiva === 'informacoes'}
    <Card title="Informações importantes" color="clientes">
      <label class="vtur-label" for="info-imp">Informações importantes</label>
      <FieldTextarea
        id="info-imp"
        bind:value={informacoesImportantes}
        rows={20}
        class_name="w-full"
        monospace={true}
        placeholder="Documentos necessários, dicas, políticas de cancelamento, informações de bagagem, etc."
      />
      <p class="mt-1 text-xs text-slate-400">{informacoesImportantes.split('\n').filter(l => l.trim()).length} linha(s)</p>
    </Card>
  {/if}

  <!-- ─── Botão salvar flutuante ─────────────────────────────────────────── -->
  <div class="mt-6 flex justify-end gap-3">
    <Button type="button" variant="secondary" on:click={() => goto('/orcamentos/roteiros')}>Cancelar</Button>
    <Button type="button" variant="secondary" loading={previewingPdf} on:click={handlePreviewPdf}>
      <FileText size={16} class="mr-2" />
      Visualizar PDF
    </Button>
    <Button type="button" variant="primary" color="clientes" loading={saving} on:click={save}>
      <Save size={16} class="mr-2" />
      Salvar roteiro
    </Button>
  </div>
{/if}

<!-- ─── Modal: Gerar Orçamento ──────────────────────────────────────────── -->
{#if showGerarModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl">
      <div class="border-b border-slate-100 px-6 py-4">
        <h2 class="text-base font-semibold text-slate-800">Gerar Orçamento</h2>
        <p class="mt-0.5 text-sm text-slate-500">Informe o cliente para criar o orçamento a partir deste roteiro.</p>
      </div>
      <div class="px-6 py-4 space-y-4">
        <div>
          <label class="vtur-label" for="gerar-q">Buscar cliente</label>
          <FieldInput id="gerar-q" class_name="w-full" bind:value={gerarClienteQ} placeholder="Digite o nome…" />
          {#if gerarClienteLoading}
            <p class="mt-1 text-xs text-slate-400">Buscando…</p>
          {:else if gerarClienteResults.length > 0}
            <ul class="mt-1 rounded-lg border border-slate-200 bg-white shadow">
              {#each gerarClienteResults as cliente}
                <li>
                  <Button
                    type="button"
                    variant="ghost"
                    class_name={`w-full justify-start rounded-none px-3 py-2 text-left text-sm hover:!bg-slate-50 ${gerarClienteSel?.id === cliente.id ? 'bg-clientes-50 font-medium text-clientes-700 hover:!bg-clientes-50' : ''}`}
                    on:click={() => { gerarClienteSel = cliente; gerarClienteQ = cliente.nome; gerarClienteResults = []; }}
                  >
                    {cliente.nome}
                    {#if cliente.email}<span class="ml-2 text-xs text-slate-400">{cliente.email}</span>{/if}
                  </Button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
        {#if !gerarClienteSel}
          <div>
            <FieldInput label="Ou informe o nome do cliente" bind:value={gerarClienteNome} placeholder="Nome do cliente" id="gerar-nome" />
          </div>
        {:else}
          <div class="rounded-lg bg-clientes-50 px-3 py-2 text-sm text-clientes-700">
            Cliente selecionado: <strong>{gerarClienteSel.nome}</strong>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              class_name="ml-2 !px-0 !py-0 text-xs text-slate-400 underline hover:!bg-transparent hover:!text-slate-500"
              on:click={() => { gerarClienteSel = null; gerarClienteQ = ''; }}
            >
              Remover
            </Button>
          </div>
        {/if}
      </div>
      <div class="vtur-modal-footer">
        <Button type="button" variant="secondary" on:click={() => { showGerarModal = false; gerarLoading = false; }}>
          Cancelar
        </Button>
        <Button type="button" variant="primary" color="clientes" loading={gerarLoading} on:click={handleGerarOrcamento}>
          <DollarSign size={14} class="mr-1" />
          Gerar Orçamento
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- ─── Modal: Buscar dias no banco ────────────────────────────────────── -->
{#if showDiasBusca}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
      <div class="border-b border-slate-100 px-6 py-4">
        <h2 class="text-base font-semibold text-slate-800">Buscar dias no banco</h2>
        <p class="mt-0.5 text-sm text-slate-500">Reutilize descrições de dias de outros roteiros.</p>
      </div>
      <div class="px-6 py-4 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <FieldInput label="Texto" bind:value={diasBuscaQ} placeholder="Palavra-chave…" id="db-q" />
          </div>
          <div>
            <label class="vtur-label" for="db-cidade">Cidade</label>
            <FieldDatalistInput
              id="db-cidade"
              label="Cidade"
              bind:value={diasBuscaCidade}
              placeholder="Filtrar por cidade"
              options={sugestoes['cidade'] || []}
              listId="sugestoes-cidade"
            />
          </div>
        </div>
        <Button type="button" variant="primary" color="clientes" size="sm" loading={diasBuscaLoading} on:click={buscarDias}>
          Buscar
        </Button>

        {#if diasBuscaResults.length > 0}
          <div class="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            {#each diasBuscaResults as dia}
              <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-0">
                <div class="text-sm">
                  <span class="font-medium text-slate-700">{dia.cidade || '—'}</span>
                  {#if dia.data}<span class="ml-2 text-xs text-slate-400">{dia.data}</span>{/if}
                  {#if dia.percurso}<p class="text-xs text-slate-500 mt-0.5">{dia.percurso}</p>{/if}
                  {#if dia.descricao}<p class="mt-0.5 text-xs text-slate-600 line-clamp-2">{dia.descricao}</p>{/if}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  class_name="shrink-0 border border-clientes-200 bg-clientes-100 !px-2.5 !py-1 text-xs font-medium text-clientes-700 hover:!bg-clientes-200"
                  on:click={() => addDiaBanco(dia)}
                >
                  Usar
                </Button>
              </div>
            {/each}
          </div>
        {:else if !diasBuscaLoading}
          <p class="text-center text-sm text-slate-400 py-4">Nenhum resultado. Tente buscar acima.</p>
        {/if}
      </div>
      <div class="vtur-modal-footer">
        <Button type="button" variant="secondary" on:click={() => { showDiasBusca = false; }}>Fechar</Button>
      </div>
    </div>
  </div>
{/if}

<!-- ─── Modal: Importar dia a dia ─────────────────────────────────────── -->
{#if showDiasImport}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
      <div class="border-b border-slate-100 px-6 py-4">
        <h2 class="text-base font-semibold text-slate-800">Importar dia a dia do circuito</h2>
        <p class="mt-0.5 text-sm text-slate-500">Cole o texto do circuito e o sistema monta os dias automaticamente.</p>
      </div>
      <div class="space-y-3 px-6 py-4">
        <FieldTextarea
          bind:value={diasImportText}
          rows={12}
          class_name="w-full"
          monospace={true}
          placeholder={"Dia 1 - Chegada em Lisboa\nRecepção no aeroporto e traslado ao hotel.\n\nDia 2 - Lisboa\nCity tour e tarde livre."}
        />
        <p class="text-xs text-slate-500">
          Formatos aceitos: <strong>Dia 1 - Título</strong>, <strong>1º Dia - Título</strong> ou blocos separados por linha em branco.
        </p>
        {#if diasImportMsg}<p class="text-xs text-green-600">{diasImportMsg}</p>{/if}
        {#if diasImportError}<p class="text-xs text-red-600">{diasImportError}</p>{/if}
      </div>
      <div class="vtur-modal-footer">
        <Button type="button" variant="secondary" on:click={() => { showDiasImport = false; diasImportError = null; diasImportMsg = null; }}>
          Cancelar
        </Button>
        <Button type="button" variant="primary" color="clientes" on:click={handleImportDiasText}>
          Importar dias
        </Button>
      </div>
    </div>
  </div>
{/if}

<style lang="postcss">
  :global(.vtur-label) {
    @apply mb-1 block text-sm font-medium text-slate-700;
  }
  :global(.vtur-label-xs) {
    @apply mb-1 block text-xs font-medium text-slate-600;
  }
</style>
