<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/db/supabase';
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

  // ─── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    loading = true;
    try {
      const [roteiroRes, sugestoesRes] = await Promise.all([
        fetch(`/api/v1/roteiros/${roteiroId}`),
        fetch('/api/v1/roteiros/sugestoes-busca').catch(() => null),
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
        const res = await fetch(`/api/v1/clientes?q=${encodeURIComponent(gerarClienteQ)}&limit=8`);
        if (!res.ok) return;
        const data = await res.json();
        gerarClienteResults = data.clientes || data || [];
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
      const lines = aereoImportText.split('\n').filter(l => l.trim());
      const imported: RotTransporte[] = lines.map((line, idx) => {
        const t = newTransporte(idx);
        t.trecho = line.trim();
        return t;
      });
      transportes = reorder([...transportes, ...imported]);
      aereoImportText = '';
      aereoImportMsg = `${imported.length} linha(s) importada(s). Revise os campos.`;
    } catch {
      aereoImportError = 'Não foi possível importar.';
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
      <div class="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
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
      <div class="flex justify-end border-t border-slate-100 px-6 py-4">
        <Button type="button" variant="secondary" on:click={() => { showDiasBusca = false; }}>Fechar</Button>
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
