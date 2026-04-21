<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/db/supabase';
  import { PageHeader, Card, Button, FormPanel } from '$lib/components/ui';
  import CalculatorModal from '$lib/components/modais/CalculatorModal.svelte';
  import { toast } from '$lib/stores/ui';
  import { ArrowLeft, Calculator, CreditCard, Plus, Receipt, Trash2 } from 'lucide-svelte';

  let currentUser: { id: string; can_assign_vendedor?: boolean } | null = null;
  $: canAssignVendedor = currentUser?.can_assign_vendedor ?? false;

  type Option = {
    id: string;
    nome?: string | null;
    pais_nome?: string | null;
    estado?: string | null;
    uf?: string | null;
    sigla?: string | null;
    subdivisao_nome?: string | null;
    subdivisao?: { nome?: string | null; sigla?: string | null } | null;
    label?: string | null;
    tipo?: string | null;
    tipo_produto?: string | null;
    cidade_id?: string | null;
    todas_as_cidades?: boolean | null;
    destino?: string | null;
    paga_comissao?: boolean | null;
    permite_desconto?: boolean | null;
    desconto_padrao_pct?: number | null;
    ativo?: boolean | null;
    nome_completo?: string | null;
  };

  type Cliente = {
    id: string;
    nome: string;
    cpf?: string | null;
    telefone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
  };

  const vendaId = String($page.params.id || '');
  const today = new Date().toISOString().slice(0, 10);

  let loading = true;
  let saving = false;
  let showCalculator = false;
  let currentStep = 0;
  let clienteInput = '';
  let cidadeInput = '';
  let showClienteOptions = false;
  let showCidadeOptions = false;
  let clienteSearchResults: Cliente[] = [];
  let cidadeSearchResults: Option[] = [];
  let clienteSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let cidadeSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let ensuringCidadeId = '';
  let ensuringProdutoId = '';
  let errors: Record<string, string> = {};
  let lastDestinoCidadeId = '';

  let clientes: Cliente[] = [];
  let cidades: Option[] = [];
  let produtos: Option[] = [];
  let tipos: Option[] = [];
  let tiposPacote: Option[] = [];
  let formasPagamento: Option[] = [];
  let vendedoresEquipe: Option[] = [];

  let venda = {
    vendedor_id: '',
    cliente_id: '',
    destino_id: '',
    destino_cidade_id: '',
    data_lancamento: today,
    data_venda: today,
    data_embarque: '',
    data_final: '',
    desconto_comercial_aplicado: false,
    desconto_comercial_valor: '',
    valor_total: '',
    valor_total_bruto: '',
    valor_total_pago: '',
    valor_taxas: '',
    valor_nao_comissionado: '',
    status: 'pendente',
    cancelada: false,
    notas: ''
  };

  let recibos = [createRecibo(true)];
  let pagamentos = [createPagamento()];

  function createRecibo(principal = false) {
    return {
      principal,
      tipo_produto_id: '',
      produto_id: '',
      produto_resolvido_id: '',
      numero_recibo: '',
      numero_reserva: '',
      tipo_pacote: '',
      valor_total: '',
      valor_taxas: '0',
      valor_du: '0',
      valor_rav: '0',
      data_inicio: '',
      data_fim: '',
      contrato_url: '',
      contrato_path: ''
    };
  }

  function createPagamento() {
    return {
      forma_pagamento_id: '',
      forma_nome: '',
      operacao: '',
      plano: '',
      valor_bruto: '',
      desconto_valor: '',
      valor_total: '',
      parcelas_qtd: 1,
      parcelas_valor: '',
      vencimento_primeira: '',
      paga_comissao: true,
      parcelas: [] as Array<{ numero: string; valor: string; vencimento: string }>
    };
  }

  function parseMoney(value: string | number | null | undefined) {
    const raw = String(value ?? '').trim().replace(/[^\d,.-]/g, '');
    const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  function ensurePrincipalRecibo() {
    if (recibos.length === 0) return;
    if (recibos.some((item) => item.principal)) return;
    recibos = recibos.map((item, index) => ({ ...item, principal: index === 0 }));
  }

  async function loadBase() {
    const response = await fetch('/api/v1/vendas/cadastro-base');
    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    currentUser = data.user ?? null;
    vendedoresEquipe = data.vendedoresEquipe || [];
    clientes = data.clientes || [];
    cidades = data.cidades || [];
    produtos = data.produtos || [];
    tipos = data.tipos || [];
    tiposPacote = (data.tiposPacote || []).filter((item: Option) => item.ativo !== false);
    formasPagamento = data.formasPagamento || [];
  }

  async function loadVenda() {
    const response = await fetch(`/api/v1/vendas/${vendaId}`);
    if (!response.ok) {
      const message = (await response.text()) || 'Erro ao carregar dados da venda.';
      if (response.status === 401) {
        toast.error('Sessão expirada. Faça login novamente para continuar.');
        const next = `${$page.url.pathname}${$page.url.search}`;
        await goto(`/auth/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (response.status === 403) {
        toast.error(message || 'Você não tem permissão para editar esta venda.');
        await goto('/vendas');
        return;
      }
      if (response.status === 404) {
        toast.error(message || 'Venda não encontrada.');
        await goto('/vendas');
        return;
      }
      throw new Error(message);
    }

    const data = await response.json();
    const sale = data || {};
    const statusNormalizado = String(sale?.status || 'pendente') === 'aberto' ? 'pendente' : String(sale?.status || 'pendente');

    venda = {
      vendedor_id: String(sale?.vendedor_id || currentUser?.id || ''),
      cliente_id: String(sale?.cliente_id || ''),
      destino_id: String(sale?.destino_id || ''),
      destino_cidade_id: String(
        sale?.destino_cidade_id ||
          produtos.find((item) => String(item.id) === String(sale?.destino_id || ''))?.cidade_id ||
          ''
      ),
      data_lancamento: String(sale?.data_lancamento || '').slice(0, 10) || today,
      data_venda: String(sale?.data_venda || '').slice(0, 10) || today,
      data_embarque: String(sale?.data_embarque || '').slice(0, 10),
      data_final: String(sale?.data_final || '').slice(0, 10),
      desconto_comercial_aplicado: Boolean(sale?.desconto_comercial_aplicado),
      desconto_comercial_valor: String(sale?.desconto_comercial_valor || ''),
      valor_total: String(sale?.valor_total || ''),
      valor_total_bruto: String(sale?.valor_total_bruto || ''),
      valor_total_pago: String(sale?.valor_total_pago || ''),
      valor_taxas: String(sale?.valor_taxas || ''),
      valor_nao_comissionado: String(sale?.valor_nao_comissionado || ''),
      status: statusNormalizado,
      cancelada: Boolean(sale?.cancelada),
      notas: String(sale?.notas || '')
    };

    const recibosData = Array.isArray(sale?.recibos) ? sale.recibos : [];
    if (recibosData.length > 0) {
      recibos = recibosData.map((item: any, index: number) => {
        const produtoResolvidoId = String(item?.produto_resolvido_id || item?.produto_id || '');
        const produtoRelacionado = produtos.find((p) => String(p.id) === produtoResolvidoId);
        return {
          principal: index === 0,
          tipo_produto_id: String(item?.tipo_produto_id || produtoRelacionado?.tipo_produto || ''),
          produto_id: produtoResolvidoId,
          produto_resolvido_id: produtoResolvidoId,
          numero_recibo: String(item?.numero_recibo || ''),
          numero_reserva: String(item?.numero_reserva || ''),
          tipo_pacote: String(item?.tipo_pacote || ''),
          valor_total: String(item?.valor_total || ''),
          valor_taxas: String(item?.valor_taxas || '0'),
          valor_du: String(item?.valor_du || '0'),
          valor_rav: String(item?.valor_rav || '0'),
          data_inicio: String(item?.data_inicio || '').slice(0, 10),
          data_fim: String(item?.data_fim || '').slice(0, 10),
          contrato_url: String(item?.contrato_url || ''),
          contrato_path: String(item?.contrato_path || '')
        };
      });

      const produtosFaltantes = new Set<string>();
      recibos.forEach((r) => {
        if (r.produto_id && !produtos.some((p) => String(p.id) === r.produto_id)) {
          produtosFaltantes.add(r.produto_id);
        }
      });
      await Promise.all(Array.from(produtosFaltantes).map((id) => ensureProdutoLoaded(id)));
    }

    const paymentsData = Array.isArray(sale?.pagamentos) ? sale.pagamentos : [];
    if (paymentsData.length > 0) {
      pagamentos = paymentsData.map((item: any) => ({
        forma_pagamento_id: String(item?.forma_pagamento_id || ''),
        forma_nome: String(item?.forma_nome || ''),
        operacao: String(item?.operacao || ''),
        plano: String(item?.plano || ''),
        valor_bruto: String(item?.valor_bruto || ''),
        desconto_valor: String(item?.desconto_valor || ''),
        valor_total: String(item?.valor_total || ''),
        parcelas_qtd: Number(item?.parcelas_qtd || 1),
        parcelas_valor: String(item?.parcelas_valor || ''),
        vencimento_primeira: String(item?.vencimento_primeira || '').slice(0, 10),
        paga_comissao: item?.paga_comissao !== false,
        parcelas: Array.isArray(item?.parcelas)
          ? item.parcelas.map((parcela: any, index: number) => ({
              numero: String(parcela?.numero || index + 1),
              valor: String(parcela?.valor || ''),
              vencimento: String(parcela?.vencimento || '').slice(0, 10)
            }))
          : []
      }));
    }

    if (sale.vendedor && !vendedoresEquipe.some((v) => String(v.id) === String(sale.vendedor.id))) {
      vendedoresEquipe = [
        ...vendedoresEquipe,
        { id: String(sale.vendedor.id), nome_completo: sale.vendedor.nome_completo || sale.vendedor.nome }
      ];
    }

    if (sale.cliente) {
      const clienteId = String(sale.cliente.id);
      if (!clientes.some((c) => String(c.id) === clienteId)) {
        clientes = [
          ...clientes,
          {
            id: clienteId,
            nome: sale.cliente.nome,
            cpf: sale.cliente.cpf,
            telefone: sale.cliente.telefone,
            email: sale.cliente.email,
            whatsapp: sale.cliente.whatsapp
          }
        ];
      }
      const clienteEncontrado = clientes.find((c) => String(c.id) === clienteId);
      if (clienteEncontrado) {
        clienteInput = getClienteLabel(clienteEncontrado);
      }
    }

    const reciboPrincipal = recibos.find((r) => r.principal) || recibos[0];
    const destinoDoRecibo = reciboPrincipal?.produto_id || '';
    if (destinoDoRecibo) {
      venda.destino_id = destinoDoRecibo;
    }

    if (venda.destino_id) {
      await ensureProdutoLoaded(venda.destino_id);
      if (!venda.destino_cidade_id) {
        const produtoDestino = produtos.find((p) => String(p.id) === String(venda.destino_id));
        if (produtoDestino?.cidade_id) {
          venda.destino_cidade_id = String(produtoDestino.cidade_id);
        }
      }
      if (venda.destino_cidade_id) {
        await ensureCidadeLoaded(venda.destino_cidade_id);
        const cidade = cidades.find((c) => String(c.id) === String(venda.destino_cidade_id));
        if (cidade) {
          cidadeInput = getCidadeLabel(cidade);
        }
      }
    }

    ensurePrincipalRecibo();
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
          refresh_token: session.refresh_token
        })
      });
    } catch {
      // Falha silenciosa: o carregamento tratará 401 explicitamente.
    }
  }

  onMount(async () => {
    loading = true;
    try {
      await ensureServerSessionCookie();
      await loadBase();
      await loadVenda();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar dados da venda.');
    } finally {
      loading = false;
    }
  });

  function addRecibo() {
    recibos = [...recibos, createRecibo(false)];
    ensurePrincipalRecibo();
  }

  function removeRecibo(index: number) {
    if (recibos.length === 1) return;
    recibos = recibos.filter((_, itemIndex) => itemIndex !== index);
    ensurePrincipalRecibo();
  }

  function markReciboPrincipal(index: number) {
    recibos = recibos.map((item, itemIndex) => ({ ...item, principal: itemIndex === index }));
  }

  function getProdutosByTipo(tipoId: string) {
    return produtos.filter((item) => {
      const matchesTipo = !tipoId || item.tipo === tipoId || item.tipo_produto === tipoId;
      return matchesTipo && isProdutoCompativelCidade(item);
    });
  }

  function isProdutoCompativelCidade(produto: Option) {
    if (!venda.destino_cidade_id) return produto.todas_as_cidades === true;
    if (produto.todas_as_cidades === true) return true;
    return String(produto.cidade_id) === String(venda.destino_cidade_id);
  }

  function updateReciboProduto(index: number) {
    const recibo = recibos[index];
    recibo.produto_resolvido_id = recibo.produto_id;
    if (recibo.principal && recibo.produto_id) {
      venda.destino_id = recibo.produto_id;
    }
    recibos = recibos;
  }

  function addPagamento() {
    pagamentos = [...pagamentos, createPagamento()];
  }

  function removePagamento(index: number) {
    if (pagamentos.length === 1) return;
    pagamentos = pagamentos.filter((_, itemIndex) => itemIndex !== index);
  }

  function syncFormaNome(index: number) {
    const forma = formasPagamento.find((item) => item.id === pagamentos[index].forma_pagamento_id);
    pagamentos[index].forma_nome = String(forma?.nome || '');
    pagamentos[index].paga_comissao = forma?.paga_comissao ?? true;
    pagamentos = pagamentos;
  }

  function rebuildParcelas(index: number) {
    const pagamento = pagamentos[index];
    const quantidade = Math.max(1, Number(pagamento.parcelas_qtd || 1));
    const valorTotal = parseMoney(pagamento.valor_total);
    const valorParcela = quantidade > 0 ? valorTotal / quantidade : 0;
    const inicio = pagamento.vencimento_primeira || '';
    const baseDate = inicio ? new Date(inicio) : null;

    pagamento.parcelas = Array.from({ length: quantidade }).map((_, parcelaIndex) => {
      const vencimento = baseDate
        ? (() => {
            const next = new Date(baseDate);
            next.setMonth(baseDate.getMonth() + parcelaIndex);
            return next.toISOString().slice(0, 10);
          })()
        : '';

      return {
        numero: String(parcelaIndex + 1),
        valor: valorParcela ? valorParcela.toFixed(2) : '',
        vencimento
      };
    });

    pagamento.parcelas_valor = valorParcela ? valorParcela.toFixed(2) : '';
    pagamentos = pagamentos;
  }

  function addParcela(index: number) {
    const pagamento = pagamentos[index];
    pagamento.parcelas = [
      ...pagamento.parcelas,
      {
        numero: String(pagamento.parcelas.length + 1),
        valor: '',
        vencimento: ''
      }
    ];
    pagamento.parcelas_qtd = pagamento.parcelas.length;
    pagamentos = pagamentos;
  }

  function removeParcela(index: number, parcelaIndex: number) {
    const pagamento = pagamentos[index];
    pagamento.parcelas = pagamento.parcelas.filter((_, indexItem) => indexItem !== parcelaIndex);
    pagamento.parcelas = pagamento.parcelas.map((item, itemIndex) => ({
      ...item,
      numero: String(itemIndex + 1)
    }));
    pagamento.parcelas_qtd = Math.max(1, pagamento.parcelas.length || 1);
    pagamentos = pagamentos;
  }

  function getClienteSelecionado() {
    return clientes.find((item) => item.id === venda.cliente_id) || null;
  }

  function getClienteLabel(cliente: Cliente) {
    return `${cliente.nome}${cliente.cpf ? ` • ${cliente.cpf}` : ''}`;
  }

  function getCidadeLabel(cidade: Option) {
    const preferred = String(cidade.label || '').trim();
    if (preferred) return preferred;
    const nome = String(cidade.nome || '').trim();
    const estado = String(
      cidade.estado ||
      cidade.uf ||
      cidade.sigla ||
      cidade.subdivisao_nome ||
      cidade.subdivisao?.sigla ||
      cidade.subdivisao?.nome ||
      ''
    ).trim();
    return estado ? `${nome} (${estado})` : nome;
  }

  function normalizeLookup(value: string | null | undefined) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function mergeCidades(items: Option[]) {
    if (!items.length) return;
    const byId = new Map<string, Option>();
    cidades.forEach((item) => byId.set(String(item.id), item));
    items.forEach((item) => {
      const id = String(item?.id || '').trim();
      if (!id) return;
      byId.set(id, { ...(byId.get(id) || {}), ...item, label: getCidadeLabel({ ...(byId.get(id) || {}), ...item }) });
    });
    cidades = Array.from(byId.values());
  }

  async function ensureCidadeLoaded(cidadeId: string) {
    const id = String(cidadeId || '').trim();
    if (!id) return;
    if (cidades.some((item) => String(item.id) === id)) return;
    if (ensuringCidadeId === id) return;
    ensuringCidadeId = id;
    try {
      const response = await fetch(`/api/v1/vendas/cidades-busca?id=${encodeURIComponent(id)}`);
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.id) mergeCidades([payload]);
    } catch {
      // Mantem a tela funcionando mesmo sem prefetch complementar.
    } finally {
      if (ensuringCidadeId === id) ensuringCidadeId = '';
    }
  }

  async function ensureProdutoLoaded(produtoId: string) {
    const id = String(produtoId || '').trim();
    if (!id) return;
    if (produtos.some((item) => String(item.id) === id)) return;
    if (ensuringProdutoId === id) return;
    ensuringProdutoId = id;
    try {
      const response = await fetch(`/api/v1/produtos/${encodeURIComponent(id)}`);
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.id) {
        const todasAsCidades =
          payload.todas_as_cidades === true ||
          (!payload.cidade_id && payload.todas_as_cidades !== false);
        produtos = [
          ...produtos,
          {
            id: String(payload.id),
            nome: payload.nome,
            cidade_id: payload.cidade_id,
            todas_as_cidades: todasAsCidades,
            tipo: payload.tipo,
            tipo_produto: payload.tipo_produto
          }
        ];
      }
    } catch {
      // Mantem a tela funcionando mesmo sem prefetch complementar.
    } finally {
      if (ensuringProdutoId === id) ensuringProdutoId = '';
    }
  }

  function getClientesFiltrados(input: string) {
    if (clienteSearchResults.length > 0) return clienteSearchResults;
    const term = input.trim().toLowerCase();
    if (!term) return clientes.slice(0, 30);
    return clientes
      .filter((item) => {
        const haystack = [item.nome, item.email, item.telefone, item.whatsapp, item.cpf].join(' ').toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 30);
  }

  function getCidadesFiltradas(input: string) {
    if (cidadeSearchResults.length > 0) return cidadeSearchResults;
    const term = normalizeLookup(input);
    if (!term) return cidades.slice(0, 30);
    return cidades
      .filter((item) =>
        normalizeLookup(
          [item.nome, item.estado, item.uf, item.sigla, item.subdivisao_nome, item.subdivisao?.nome, item.subdivisao?.sigla]
            .filter(Boolean)
            .join(' ')
        ).includes(term)
      )
      .slice(0, 30);
  }

  function applyClienteInput() {
    const selected = clientes.find((item) => getClienteLabel(item) === clienteInput.trim());
    venda.cliente_id = selected?.id || '';
  }

  function applyCidadeInput() {
    const raw = cidadeInput.trim();
    const normalized = normalizeLookup(raw);
    const source = [...cidadeSearchResults, ...cidades];
    const selected = source.find((item) => {
      return (
        normalizeLookup(getCidadeLabel(item)) === normalized ||
        normalizeLookup(String(item.nome || '')) === normalized
      );
    });
    venda.destino_cidade_id = selected?.id || '';
    if (selected?.id) mergeCidades([selected]);
  }

  function selectCliente(cliente: Cliente) {
    venda.cliente_id = cliente.id;
    clienteInput = getClienteLabel(cliente);
    clienteSearchResults = [];
    showClienteOptions = false;
  }

  function selectCidade(cidade: Option) {
    venda.destino_cidade_id = cidade.id;
    cidadeInput = getCidadeLabel(cidade);
    mergeCidades([cidade]);
    cidadeSearchResults = [];
    showCidadeOptions = false;
  }

  function onClienteBlur() {
    setTimeout(() => {
      showClienteOptions = false;
      applyClienteInput();
    }, 120);
  }

  function onCidadeBlur() {
    setTimeout(() => {
      showCidadeOptions = false;
      applyCidadeInput();
    }, 120);
  }

  async function searchClientesRemoto(term: string) {
    const query = term.trim();
    if (query.length < 2) {
      clienteSearchResults = [];
      return;
    }
    try {
      const response = await fetch(`/api/v1/clientes?search=${encodeURIComponent(query)}`);
      if (!response.ok) return;
      const payload = await response.json();
      clienteSearchResults = Array.isArray(payload?.items) ? payload.items.slice(0, 30) : [];
    } catch {
      clienteSearchResults = [];
    }
  }

  async function searchCidadesRemoto(term: string) {
    const query = term.trim();
    if (query.length < 2) {
      cidadeSearchResults = [];
      return;
    }
    try {
      const response = await fetch(`/api/v1/vendas/cidades-busca?q=${encodeURIComponent(query)}&limite=30`);
      if (!response.ok) return;
      const payload = await response.json();
      if (Array.isArray(payload)) {
        cidadeSearchResults = payload.slice(0, 30);
        mergeCidades(cidadeSearchResults);
      } else if (Array.isArray(payload?.items)) {
        cidadeSearchResults = payload.items.slice(0, 30);
        mergeCidades(cidadeSearchResults);
      } else {
        cidadeSearchResults = [];
      }
    } catch {
      cidadeSearchResults = [];
    }
  }

  function validateStep(step: number) {
    errors = {};

    if (step >= 0) {
      if (!venda.vendedor_id) errors.vendedor_id = 'Informe o vendedor.';
      if (!venda.cliente_id) errors.cliente_id = 'Informe o cliente.';
      const possuiProdutoLocal =
        (venda.destino_id &&
          produtos.some(
            (item) =>
              String(item.id) === String(venda.destino_id) &&
              item.todas_as_cidades !== true &&
              Boolean(item.cidade_id)
          )) ||
        recibos.some((recibo) => {
          const produto = produtos.find((item) => String(item.id) === String(recibo.produto_id));
          return Boolean(produto?.cidade_id) && produto?.todas_as_cidades !== true;
        });
      if (possuiProdutoLocal && !venda.destino_cidade_id) {
        errors.destino_cidade_id = 'Selecione a cidade de destino.';
      }
      if (!venda.destino_id) errors.destino_id = 'Informe o destino principal.';
      if (!venda.data_venda) errors.data_venda = 'Informe a data da venda.';
      if (!venda.data_embarque) errors.data_embarque = 'Informe a data de embarque.';
      if (!venda.data_final) errors.data_final = 'Informe a data final.';
      if (venda.data_embarque && venda.data_final && venda.data_final < venda.data_embarque) {
        errors.data_final = 'A data final deve ser igual ou posterior ao embarque.';
      }
    }

    if (step >= 1) {
      if (recibos.length === 0) errors.recibos = 'Inclua ao menos um recibo.';
      if (!recibos.some((item) => item.principal)) errors.recibos_principal = 'Defina um recibo principal.';
      recibos.forEach((recibo, index) => {
        if (!recibo.tipo_produto_id) errors[`recibo_tipo_${index}`] = 'Obrigatório';
        if (!recibo.produto_id) errors[`recibo_produto_${index}`] = 'Obrigatório';
        if (!recibo.numero_recibo) errors[`recibo_numero_${index}`] = 'Obrigatório';
        if (!recibo.tipo_pacote) errors[`recibo_pacote_${index}`] = 'Obrigatório';
        if (!recibo.data_inicio) errors[`recibo_inicio_${index}`] = 'Obrigatório';
        if (!recibo.data_fim) errors[`recibo_fim_${index}`] = 'Obrigatório';
        if (recibo.data_inicio && recibo.data_fim && recibo.data_fim < recibo.data_inicio) {
          errors[`recibo_fim_${index}`] = 'Fim deve ser igual ou após início.';
        }
        if (!recibo.valor_total) errors[`recibo_total_${index}`] = 'Obrigatório';
      });
    }

    if (step >= 2) {
      if (pagamentos.length === 0) errors.pagamentos = 'Inclua ao menos um pagamento.';
      pagamentos.forEach((pagamento, index) => {
        if (!pagamento.forma_pagamento_id && !pagamento.forma_nome) {
          errors[`pagamento_forma_${index}`] = 'Informe a forma de pagamento.';
        }
      });
    }

    return Object.keys(errors).length === 0;
  }

  function goStep(nextStep: number) {
    const bounded = Math.max(0, Math.min(2, nextStep));
    if (bounded > currentStep && !validateStep(currentStep)) {
      toast.error('Revise os campos obrigatórios antes de avançar.');
      return;
    }
    currentStep = bounded;
  }

  function applyValoresCalculadora(resultado: any) {
    venda.valor_total = String(resultado.valorFinal || '');
    venda.valor_total_bruto = String(resultado.valorBruto || '');
    venda.desconto_comercial_aplicado = Number(resultado.descontoValor || 0) > 0;
    venda.desconto_comercial_valor = String(resultado.descontoValor || '');
    venda.valor_taxas = String(resultado.taxas || '');
  }

  async function handleSubmit() {
    if (!validateStep(2)) {
      toast.error('Preencha os campos obrigatórios antes de salvar.');
      return;
    }

    saving = true;

    try {
      const principalRecibo = recibos.find((item) => item.principal) || recibos[0];
      const destinoId = principalRecibo?.produto_id || venda.destino_id;

      const totalRecibos = recibos.reduce((acc, item) => acc + parseMoney(item.valor_total), 0);
      const totalTaxasRecibos = recibos.reduce((acc, item) => acc + parseMoney(item.valor_taxas), 0);
      const totalPago = pagamentos.reduce((acc, item) => acc + parseMoney(item.valor_total), 0);
      const totalNaoComissionado = pagamentos.reduce((acc, item) => {
        return item.paga_comissao === false ? acc + parseMoney(item.valor_total) : acc;
      }, 0);

      const vendaPayload = {
        ...venda,
        destino_id: destinoId,
        valor_total: venda.valor_total || String(Math.max(0, totalPago - totalNaoComissionado).toFixed(2)),
        valor_total_bruto: venda.valor_total_bruto || String(totalRecibos.toFixed(2)),
        valor_total_pago: venda.valor_total_pago || String(totalPago.toFixed(2)),
        valor_taxas: venda.valor_taxas || String(totalTaxasRecibos.toFixed(2)),
        valor_nao_comissionado:
          venda.valor_nao_comissionado || String(totalNaoComissionado.toFixed(2))
      };

      const payload = {
        venda: vendaPayload,
        recibos: recibos.map((item) => ({
          ...item,
          produto_resolvido_id: item.produto_resolvido_id || item.produto_id
        })),
        pagamentos: pagamentos.map((item) => {
          const parcelasQtd = Number(item.parcelas_qtd || item.parcelas.length || 1);
          return {
            ...item,
            parcelas_qtd: parcelasQtd,
            parcelas_valor:
              item.parcelas_valor ||
              (parcelasQtd > 0 ? (parseMoney(item.valor_total) / parcelasQtd).toFixed(2) : ''),
            parcelas:
              Array.isArray(item.parcelas) && item.parcelas.length > 0
                ? item.parcelas
                : []
          };
        })
      };

      const response = await fetch(`/api/v1/vendas/${vendaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Erro ao atualizar venda.');
      }

      toast.success('Venda atualizada com sucesso!');
      goto(`/vendas/${vendaId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao atualizar venda.');
    } finally {
      saving = false;
    }
  }

  $: clienteSelecionado = getClienteSelecionado();
  $: if (clienteSelecionado && clienteInput !== getClienteLabel(clienteSelecionado)) {
    clienteInput = getClienteLabel(clienteSelecionado);
  }
  $: cidadeSelecionada = cidades.find((item) => item.id === venda.destino_cidade_id) || null;
  $: if (venda.destino_cidade_id) {
    ensureCidadeLoaded(venda.destino_cidade_id);
  }
  $: if (cidadeSelecionada && cidadeInput !== getCidadeLabel(cidadeSelecionada)) {
    cidadeInput = getCidadeLabel(cidadeSelecionada);
  }
  $: totalRecibos = recibos.reduce((acc, item) => acc + parseMoney(item.valor_total), 0);
  $: totalTaxas = recibos.reduce((acc, item) => acc + parseMoney(item.valor_taxas), 0);
  $: totalPagamentos = pagamentos.reduce((acc, item) => acc + parseMoney(item.valor_total), 0);
  $: diferencaFinanceira = Number((totalPagamentos - totalRecibos).toFixed(2));
  $: fechamentoFinanceiroOk = Math.abs(diferencaFinanceira) < 0.01;
  $: produtosDestinoFiltrados = produtos.filter((item) => isProdutoCompativelCidade(item));

  $: {
    recibos = recibos.map((recibo) => {
      if (recibo.tipo_produto_id) return recibo;
      if (!recibo.produto_id) return recibo;
      const produto = produtos.find((p) => String(p.id) === String(recibo.produto_id));
      if (!produto) {
        ensureProdutoLoaded(recibo.produto_id);
        return recibo;
      }
      return {
        ...recibo,
        tipo_produto_id: String(produto.tipo_produto || '')
      };
    });
  }
  $: if (venda.destino_cidade_id !== lastDestinoCidadeId) {
    lastDestinoCidadeId = venda.destino_cidade_id;
    recibos = recibos.map((recibo) => {
      if (!recibo.produto_id) return recibo;
      const produto = produtos.find((item) => String(item.id) === String(recibo.produto_id));
      if (!produto || isProdutoCompativelCidade(produto)) return recibo;
      return {
        ...recibo,
        produto_id: '',
        produto_resolvido_id: '',
        principal: false
      };
    });
    ensurePrincipalRecibo();
  }
</script>

<svelte:head>
  <title>Editar Venda | VTUR</title>
</svelte:head>

<PageHeader
  title="Editar Venda"
  subtitle={`Registro ${vendaId.slice(0, 8).toUpperCase()} com fluxo completo de venda, recibos e pagamentos.`}
  breadcrumbs={[
    { label: 'Vendas', href: '/vendas' },
    { label: 'Editar venda' }
  ]}
/>

{#if loading}
  <Card title="Carregando venda" color="vendas">
    <p class="text-sm text-slate-600">Buscando dados da venda, recibos e pagamentos...</p>
  </Card>
{:else}
  <div class="mb-6 rounded-[14px] border border-slate-200 bg-white p-4">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <button type="button" class="rounded-xl border px-4 py-3 text-left {currentStep === 0 ? 'border-vendas-400 bg-vendas-50 text-vendas-700' : 'border-slate-200'}" on:click={() => goStep(0)}>
        <p class="text-xs font-semibold uppercase tracking-wide">Etapa 1</p>
        <p class="font-semibold">Dados da venda</p>
      </button>
      <button type="button" class="rounded-xl border px-4 py-3 text-left {currentStep === 1 ? 'border-vendas-400 bg-vendas-50 text-vendas-700' : 'border-slate-200'}" on:click={() => goStep(1)}>
        <p class="text-xs font-semibold uppercase tracking-wide">Etapa 2</p>
        <p class="font-semibold">Recibos</p>
      </button>
      <button type="button" class="rounded-xl border px-4 py-3 text-left {currentStep === 2 ? 'border-vendas-400 bg-vendas-50 text-vendas-700' : 'border-slate-200'}" on:click={() => goStep(2)}>
        <p class="text-xs font-semibold uppercase tracking-wide">Etapa 3</p>
        <p class="font-semibold">Forma de pagamento</p>
      </button>
    </div>
  </div>

  <form class="space-y-6" on:submit|preventDefault={handleSubmit}>
    {#if currentStep === 0}
      <FormPanel title="Dados da venda" description="Atualize os dados principais da venda" class_name="border-green-200">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {#if canAssignVendedor}
          <div>
            <label for="venda-editar-vendedor" class="mb-1 block text-sm font-medium text-slate-700">Vendedor *</label>
            <select id="venda-editar-vendedor" bind:value={venda.vendedor_id} class="vtur-input w-full" class:border-red-500={errors.vendedor_id}>
              <option value="">Selecione...</option>
              {#each vendedoresEquipe as vendedorEquipe}
                <option value={vendedorEquipe.id}>{vendedorEquipe.nome_completo}</option>
              {/each}
            </select>
            {#if errors.vendedor_id}<p class="mt-1 text-xs text-red-600">{errors.vendedor_id}</p>{/if}
          </div>
          {/if}

          <div class="md:col-span-2">
            <label for="venda-editar-cliente" class="mb-1 block text-sm font-medium text-slate-700">Cliente *</label>
            <div class="relative">
              <input
                id="venda-editar-cliente"
                bind:value={clienteInput}
                on:input={(event) => {
                  const term = String((event.currentTarget as HTMLInputElement)?.value || '');
                  clienteInput = term;
                  venda.cliente_id = '';
                  showClienteOptions = true;
                  if (clienteSearchTimer) clearTimeout(clienteSearchTimer);
                  clienteSearchTimer = setTimeout(() => searchClientesRemoto(term), 180);
                }}
                on:focus={() => (showClienteOptions = true)}
                on:blur={onClienteBlur}
                class="vtur-input w-full"
                class:border-red-500={errors.cliente_id}
                placeholder="Digite para buscar cliente"
              />
              {#if showClienteOptions}
                <div class="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {#if getClientesFiltrados(clienteInput).length === 0}
                    <div class="px-3 py-2 text-sm text-slate-500">Nenhum cliente encontrado</div>
                  {:else}
                    {#each getClientesFiltrados(clienteInput) as cliente}
                      <button
                        type="button"
                        class="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        on:mousedown|preventDefault={() => selectCliente(cliente)}
                      >
                        {getClienteLabel(cliente)}
                      </button>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
            {#if clienteSelecionado}
              <p class="mt-1 text-xs text-slate-500">{clienteSelecionado.email || clienteSelecionado.whatsapp || clienteSelecionado.telefone || 'Cliente selecionado'}</p>
            {/if}
            {#if errors.cliente_id}<p class="mt-1 text-xs text-red-600">{errors.cliente_id}</p>{/if}
          </div>

          <div>
            <label for="venda-editar-cidade" class="mb-1 block text-sm font-medium text-slate-700">Cidade de destino</label>
            <div class="relative">
              <input
                id="venda-editar-cidade"
                bind:value={cidadeInput}
                on:input={(event) => {
                  const term = String((event.currentTarget as HTMLInputElement)?.value || '');
                  cidadeInput = term;
                  venda.destino_cidade_id = '';
                  showCidadeOptions = true;
                  if (cidadeSearchTimer) clearTimeout(cidadeSearchTimer);
                  cidadeSearchTimer = setTimeout(() => searchCidadesRemoto(term), 180);
                }}
                on:focus={() => (showCidadeOptions = true)}
                on:blur={onCidadeBlur}
                class="vtur-input w-full"
                class:border-red-500={errors.destino_cidade_id}
                placeholder="Digite a cidade (ex.: Orlando)"
              />
              {#if showCidadeOptions}
                <div class="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {#if getCidadesFiltradas(cidadeInput).length === 0}
                    <div class="px-3 py-2 text-sm text-slate-500">Nenhuma cidade encontrada</div>
                  {:else}
                    {#each getCidadesFiltradas(cidadeInput) as cidade}
                      <button
                        type="button"
                        class="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        on:mousedown|preventDefault={() => selectCidade(cidade)}
                      >
                        {getCidadeLabel(cidade)}
                      </button>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
            {#if errors.destino_cidade_id}<p class="mt-1 text-xs text-red-600">{errors.destino_cidade_id}</p>{/if}
          </div>

          <div>
            <label for="venda-editar-data-lancamento" class="mb-1 block text-sm font-medium text-slate-700">Lançada em</label>
            <input id="venda-editar-data-lancamento" type="date" bind:value={venda.data_lancamento} class="vtur-input w-full" />
          </div>
          <div>
            <label for="venda-editar-data-venda" class="mb-1 block text-sm font-medium text-slate-700">Data da venda *</label>
            <input id="venda-editar-data-venda" type="date" bind:value={venda.data_venda} class="vtur-input w-full" class:border-red-500={errors.data_venda} />
            {#if errors.data_venda}<p class="mt-1 text-xs text-red-600">{errors.data_venda}</p>{/if}
          </div>
          <div>
            <label for="venda-editar-data-embarque" class="mb-1 block text-sm font-medium text-slate-700">Data de embarque *</label>
            <input id="venda-editar-data-embarque" type="date" bind:value={venda.data_embarque} class="vtur-input w-full" class:border-red-500={errors.data_embarque} />
            {#if errors.data_embarque}<p class="mt-1 text-xs text-red-600">{errors.data_embarque}</p>{/if}
          </div>
          <div>
            <label for="venda-editar-data-final" class="mb-1 block text-sm font-medium text-slate-700">Data final *</label>
            <input id="venda-editar-data-final" type="date" bind:value={venda.data_final} class="vtur-input w-full" class:border-red-500={errors.data_final} />
            {#if errors.data_final}<p class="mt-1 text-xs text-red-600">{errors.data_final}</p>{/if}
          </div>

          <div class="xl:col-span-2">
            <label for="venda-editar-destino-principal" class="mb-1 block text-sm font-medium text-slate-700">Destino principal *</label>
            <select id="venda-editar-destino-principal" bind:value={venda.destino_id} class="vtur-input w-full" class:border-red-500={errors.destino_id}>
              <option value="">Selecione...</option>
              {#each produtosDestinoFiltrados as produto}
                <option value={produto.id}>{produto.nome}</option>
              {/each}
            </select>
            {#if venda.destino_cidade_id && produtosDestinoFiltrados.length === 0}
              <p class="mt-1 text-xs text-amber-700">Nenhum destino disponível para a cidade selecionada.</p>
            {/if}
            {#if errors.destino_id}<p class="mt-1 text-xs text-red-600">{errors.destino_id}</p>{/if}
          </div>

          <div class="flex items-center gap-3 xl:col-span-2 xl:pt-7">
            <label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" bind:checked={venda.desconto_comercial_aplicado} /> Aplicar desconto comercial?</label>
            <input bind:value={venda.desconto_comercial_valor} class="vtur-input w-40" placeholder="Valor do desconto" />
            <Button type="button" variant="secondary" class_name="shrink-0" on:click={() => (showCalculator = true)}>
              <Calculator size={16} class="mr-2" /> Calculadora
            </Button>
          </div>
        </div>
      </FormPanel>
    {/if}

    {#if currentStep === 1}
      <FormPanel title="Recibos da venda" description="Atualize os recibos associados à venda" class_name="border-green-200">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-600">Mantenha os recibos completos com produto, reserva, pacote, DU, RAV, contrato e período.</p>
            {#if errors.recibos}<p class="mt-1 text-xs text-red-600">{errors.recibos}</p>{/if}
            {#if errors.recibos_principal}<p class="mt-1 text-xs text-red-600">{errors.recibos_principal}</p>{/if}
          </div>
          <Button type="button" variant="secondary" on:click={addRecibo}><Plus size={16} class="mr-2" />Adicionar recibo</Button>
        </div>

        <div class="space-y-4">
          {#each recibos as recibo, index}
            <div class="rounded-xl border border-slate-200 p-4">
              <div class="mb-3 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="rounded-lg bg-green-50 p-2 text-green-700"><Receipt size={18} /></div>
                  <p class="font-semibold text-slate-900">Recibo {index + 1}</p>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-xs text-slate-600"><input type="radio" name="recibo-principal" checked={recibo.principal} on:change={() => markReciboPrincipal(index)} /> Principal</label>
                  <Button type="button" variant="ghost" on:click={() => removeRecibo(index)}><Trash2 size={16} /></Button>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label for={`venda-editar-recibo-tipo-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Tipo de produto *</label>
                  <select id={`venda-editar-recibo-tipo-${index}`} bind:value={recibo.tipo_produto_id} class="vtur-input w-full" class:border-red-500={errors[`recibo_tipo_${index}`]}>
                    <option value="">Selecione...</option>
                    {#each tipos as tipo}
                      <option value={tipo.id}>{tipo.nome || tipo.tipo}</option>
                    {/each}
                  </select>
                </div>
                <div>
                  <label for={`venda-editar-recibo-produto-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Produto *</label>
                  <select id={`venda-editar-recibo-produto-${index}`} bind:value={recibo.produto_id} class="vtur-input w-full" class:border-red-500={errors[`recibo_produto_${index}`]} on:change={() => updateReciboProduto(index)}>
                    <option value="">Selecione...</option>
                    {#each getProdutosByTipo(recibo.tipo_produto_id) as produto}
                      <option value={produto.id}>{produto.nome}</option>
                    {/each}
                  </select>
                </div>
                <div>
                  <label for={`venda-editar-recibo-numero-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Número recibo *</label>
                  <input id={`venda-editar-recibo-numero-${index}`} bind:value={recibo.numero_recibo} class="vtur-input w-full" class:border-red-500={errors[`recibo_numero_${index}`]} />
                </div>
                <div>
                  <label for={`venda-editar-recibo-reserva-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Reserva</label>
                  <input id={`venda-editar-recibo-reserva-${index}`} bind:value={recibo.numero_reserva} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-recibo-pacote-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Tipo de pacote *</label>
                  <select id={`venda-editar-recibo-pacote-${index}`} bind:value={recibo.tipo_pacote} class="vtur-input w-full" class:border-red-500={errors[`recibo_pacote_${index}`]}>
                    <option value="">Selecione...</option>
                    {#each tiposPacote as pacote}
                      <option value={pacote.nome || pacote.label}>{pacote.nome || pacote.label}</option>
                    {/each}
                  </select>
                </div>
                <div>
                  <label for={`venda-editar-recibo-inicio-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Data início *</label>
                  <input id={`venda-editar-recibo-inicio-${index}`} type="date" bind:value={recibo.data_inicio} class="vtur-input w-full" class:border-red-500={errors[`recibo_inicio_${index}`]} />
                </div>
                <div>
                  <label for={`venda-editar-recibo-fim-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Data fim *</label>
                  <input id={`venda-editar-recibo-fim-${index}`} type="date" bind:value={recibo.data_fim} class="vtur-input w-full" class:border-red-500={errors[`recibo_fim_${index}`]} />
                </div>
                <div>
                  <label for={`venda-editar-recibo-total-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Valor total *</label>
                  <input id={`venda-editar-recibo-total-${index}`} bind:value={recibo.valor_total} class="vtur-input w-full" class:border-red-500={errors[`recibo_total_${index}`]} />
                </div>
                <div>
                  <label for={`venda-editar-recibo-taxas-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Taxas</label>
                  <input id={`venda-editar-recibo-taxas-${index}`} bind:value={recibo.valor_taxas} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-recibo-du-${index}`} class="mb-1 block text-sm font-medium text-slate-700">DU</label>
                  <input id={`venda-editar-recibo-du-${index}`} bind:value={recibo.valor_du} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-recibo-rav-${index}`} class="mb-1 block text-sm font-medium text-slate-700">RAV</label>
                  <input id={`venda-editar-recibo-rav-${index}`} bind:value={recibo.valor_rav} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-recibo-contrato-url-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Contrato (URL)</label>
                  <input id={`venda-editar-recibo-contrato-url-${index}`} bind:value={recibo.contrato_url} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-recibo-contrato-path-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Contrato (Path)</label>
                  <input id={`venda-editar-recibo-contrato-path-${index}`} bind:value={recibo.contrato_path} class="vtur-input w-full" />
                </div>
              </div>
            </div>
          {/each}
        </div>
      </FormPanel>
    {/if}

    {#if currentStep === 2}
      <FormPanel title="Pagamentos" description="Ajuste os pagamentos e o parcelamento" class_name="border-green-200">
        <div class="mb-4 flex items-center justify-between">
          <p class="text-sm text-slate-600">Configure forma de pagamento, parcelamento e comissionamento por pagamento.</p>
          <Button type="button" variant="secondary" on:click={addPagamento}><Plus size={16} class="mr-2" />Adicionar pagamento</Button>
        </div>

        {#if errors.pagamentos}
          <p class="mb-3 text-xs text-red-600">{errors.pagamentos}</p>
        {/if}

        <div class="space-y-4">
          {#each pagamentos as pagamento, index}
            <div class="rounded-xl border border-slate-200 p-4">
              <div class="mb-3 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="rounded-lg bg-green-50 p-2 text-green-700"><CreditCard size={18} /></div>
                  <p class="font-semibold text-slate-900">Pagamento {index + 1}</p>
                </div>
                <Button type="button" variant="ghost" on:click={() => removePagamento(index)}><Trash2 size={16} /></Button>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label for={`venda-editar-pagamento-forma-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Forma *</label>
                  <select id={`venda-editar-pagamento-forma-${index}`} bind:value={pagamento.forma_pagamento_id} class="vtur-input w-full" class:border-red-500={errors[`pagamento_forma_${index}`]} on:change={() => syncFormaNome(index)}>
                    <option value="">Selecione...</option>
                    {#each formasPagamento as forma}
                      <option value={forma.id}>{forma.nome}</option>
                    {/each}
                  </select>
                  {#if !pagamento.forma_pagamento_id}
                    <input id={`venda-editar-pagamento-forma-manual-${index}`} bind:value={pagamento.forma_nome} class="vtur-input mt-2 w-full" placeholder="Informe a forma manualmente" />
                  {/if}
                </div>
                <div>
                  <label for={`venda-editar-pagamento-operacao-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Operação</label>
                  <input id={`venda-editar-pagamento-operacao-${index}`} bind:value={pagamento.operacao} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-pagamento-plano-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Plano</label>
                  <input id={`venda-editar-pagamento-plano-${index}`} bind:value={pagamento.plano} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-pagamento-bruto-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Valor bruto</label>
                  <input id={`venda-editar-pagamento-bruto-${index}`} bind:value={pagamento.valor_bruto} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-pagamento-desconto-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Desconto</label>
                  <input id={`venda-editar-pagamento-desconto-${index}`} bind:value={pagamento.desconto_valor} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-pagamento-total-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Total</label>
                  <input id={`venda-editar-pagamento-total-${index}`} bind:value={pagamento.valor_total} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-pagamento-parcelas-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Qtd. parcelas</label>
                  <div class="flex gap-2">
                    <input id={`venda-editar-pagamento-parcelas-${index}`} type="number" min="1" bind:value={pagamento.parcelas_qtd} class="vtur-input w-full" />
                    <Button type="button" variant="ghost" on:click={() => rebuildParcelas(index)}>Gerar</Button>
                  </div>
                </div>
                <div>
                  <label for={`venda-editar-pagamento-valor-parcela-${index}`} class="mb-1 block text-sm font-medium text-slate-700">Valor da parcela</label>
                  <input id={`venda-editar-pagamento-valor-parcela-${index}`} bind:value={pagamento.parcelas_valor} class="vtur-input w-full" />
                </div>
                <div>
                  <label for={`venda-editar-pagamento-vencimento-${index}`} class="mb-1 block text-sm font-medium text-slate-700">1º vencimento</label>
                  <input id={`venda-editar-pagamento-vencimento-${index}`} type="date" bind:value={pagamento.vencimento_primeira} class="vtur-input w-full" />
                </div>
                <div class="flex items-end">
                  <label class="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" bind:checked={pagamento.paga_comissao} />
                    Paga comissão
                  </label>
                </div>
              </div>

              <div class="mt-4 rounded-xl border border-slate-200 p-3">
                <div class="mb-3 flex items-center justify-between">
                  <p class="text-sm font-medium text-slate-700">Parcelas</p>
                  <Button type="button" variant="ghost" on:click={() => addParcela(index)}>Adicionar parcela</Button>
                </div>
                {#if pagamento.parcelas.length === 0}
                  <p class="text-xs text-slate-500">Nenhuma parcela cadastrada.</p>
                {:else}
                  <div class="space-y-2">
                    {#each pagamento.parcelas as parcela, parcelaIndex}
                      <div class="grid grid-cols-1 gap-2 md:grid-cols-4">
                        <input bind:value={parcela.numero} class="vtur-input w-full" placeholder="Número" />
                        <input bind:value={parcela.valor} class="vtur-input w-full" placeholder="Valor" />
                        <input type="date" bind:value={parcela.vencimento} class="vtur-input w-full" />
                        <Button type="button" variant="danger" on:click={() => removeParcela(index, parcelaIndex)}>Remover</Button>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </FormPanel>

      <FormPanel title="Resumo e observações" description="Confira totais, status e notas internas" class_name="border-green-200">
        <div class="mb-4 rounded-xl border px-4 py-3 {fechamentoFinanceiroOk ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}">
          {#if fechamentoFinanceiroOk}
            <p class="text-sm font-medium">Recibos e pagamentos estão conciliados.</p>
          {:else}
            <p class="text-sm font-medium">Há diferença entre recibos e pagamentos: {formatMoney(diferencaFinanceira)}</p>
          {/if}
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs uppercase tracking-wide text-slate-500">Total recibos</p>
            <p class="mt-2 text-lg font-semibold text-slate-900">{formatMoney(totalRecibos)}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs uppercase tracking-wide text-slate-500">Taxas</p>
            <p class="mt-2 text-lg font-semibold text-slate-900">{formatMoney(totalTaxas)}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs uppercase tracking-wide text-slate-500">Pagamentos</p>
            <p class="mt-2 text-lg font-semibold text-slate-900">{formatMoney(totalPagamentos)}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs uppercase tracking-wide text-slate-500">Status</p>
            <select bind:value={venda.status} class="vtur-input mt-2 w-full">
              <option value="pendente">Pendente</option>
              <option value="confirmada">Confirmada</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label for="venda-editar-total" class="mb-1 block text-sm font-medium text-slate-700">Valor total da venda</label>
            <input id="venda-editar-total" bind:value={venda.valor_total} class="vtur-input w-full" />
          </div>
          <div>
            <label for="venda-editar-total-bruto" class="mb-1 block text-sm font-medium text-slate-700">Valor total bruto</label>
            <input id="venda-editar-total-bruto" bind:value={venda.valor_total_bruto} class="vtur-input w-full" />
          </div>
          <div>
            <label for="venda-editar-total-pago" class="mb-1 block text-sm font-medium text-slate-700">Valor total pago</label>
            <input id="venda-editar-total-pago" bind:value={venda.valor_total_pago} class="vtur-input w-full" />
          </div>
          <div>
            <label for="venda-editar-nao-comissionado" class="mb-1 block text-sm font-medium text-slate-700">Valor não comissionado</label>
            <input id="venda-editar-nao-comissionado" bind:value={venda.valor_nao_comissionado} class="vtur-input w-full" />
          </div>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <input id="cancelada" type="checkbox" bind:checked={venda.cancelada} />
          <label for="cancelada" class="text-sm font-medium text-slate-700">Venda cancelada</label>
        </div>

        <div class="mt-4">
          <label for="venda-editar-observacoes" class="mb-1 block text-sm font-medium text-slate-700">Observações</label>
          <textarea id="venda-editar-observacoes" bind:value={venda.notas} rows="4" class="vtur-input w-full" placeholder="Observações internas da venda"></textarea>
        </div>
      </FormPanel>
    {/if}

    <div class="flex items-center justify-between gap-3">
      <div class="flex gap-3">
        <Button type="button" variant="secondary" on:click={() => goto('/vendas')}>
          <ArrowLeft size={16} class="mr-2" />Voltar
        </Button>
      </div>
      <div class="flex items-center gap-3">
        {#if currentStep > 0}
          <Button type="button" variant="secondary" on:click={() => goStep(currentStep - 1)}>Etapa anterior</Button>
        {/if}
        {#if currentStep < 2}
          <Button type="button" variant="primary" color="vendas" on:click={() => goStep(currentStep + 1)}>Próxima etapa</Button>
        {:else}
          <Button type="submit" variant="primary" color="vendas" loading={saving}>Salvar alterações</Button>
        {/if}
      </div>
    </div>
  </form>
{/if}

<CalculatorModal
  bind:open={showCalculator}
  valorBruto={parseMoney(venda.valor_total_bruto || venda.valor_total)}
  onClose={() => (showCalculator = false)}
  onConfirm={applyValoresCalculadora}
/>
