import { json, error } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse,
  fetchGestorEquipeIdsComGestor,
  isUuid
} from '$lib/server/v1';
import { normalizeText } from '$lib/normalizeText';
import type { ContratoDraft, PassageiroDraft, PagamentoDraft } from '$lib/vendas/contratoCvcExtractor';
import { ensureReciboReservaUnicos, calcularStatusPeriodo } from '$lib/server/vendasSave';

const DEFAULT_NAO_COMISSIONAVEIS = [
  'credito diversos',
  'credito pax',
  'credito passageiro',
  'credito de viagem',
  'credipax',
  'vale viagem',
  'carta de credito',
  'credito'
];

function toISODateLocal(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isISODate(value?: string | null) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

function normalizeCpf(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function formatCpf(value: string) {
  const digits = normalizeCpf(value);
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function parseMoney(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Number(value);
}

function sanitizeOptionalContact(value?: string | null) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function buildPagamentoKey(pagamento: PagamentoDraft) {
  const forma = normalizeText(pagamento.forma || '').toUpperCase();
  const valorRef =
    pagamento.total != null ? pagamento.total : pagamento.valor_bruto != null ? pagamento.valor_bruto : 0;
  const valor = Number(valorRef).toFixed(2);
  const parcelas = (pagamento.parcelas || [])
    .map((parcela) => {
      const numero = String(parcela.numero || '');
      const val = Number(parcela.valor).toFixed(2);
      const vencimento = parcela.vencimento || '';
      return `${numero}:${val}:${vencimento}`;
    })
    .join('|');
  return `${forma}|${valor}|${parcelas}`;
}

function dedupePagamentos(pagamentos: PagamentoDraft[]) {
  const seen = new Set<string>();
  const result: PagamentoDraft[] = [];
  pagamentos.forEach((pagamento) => {
    if (!pagamento?.forma) return;
    const key = buildPagamentoKey(pagamento);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(pagamento);
  });
  return result;
}

function calcularTotalPagamentos(pagamentos: PagamentoDraft[]) {
  return pagamentos.reduce((acc, pagamento) => {
    const bruto = parseMoney(pagamento.valor_bruto);
    const desconto = parseMoney(pagamento.desconto);
    const total = parseMoney(pagamento.total);
    if (pagamento.total != null && (bruto <= 0 || total <= bruto * 1.05)) {
      return acc + total;
    }
    if (bruto > 0) return acc + Math.max(bruto - desconto, 0);
    return acc;
  }, 0);
}

async function carregarTermosNaoComissionaveis(client: any): Promise<string[]> {
  try {
    const { data, error } = await client
      .from('parametros_pagamentos_nao_comissionaveis')
      .select('termo, termo_normalizado, ativo')
      .eq('ativo', true)
      .order('termo', { ascending: true });
    if (error) throw error;

    const termos = (data || [])
      .map((row: any) => normalizeText(row?.termo_normalizado || row?.termo))
      .filter(Boolean);

    return termos.length > 0 ? Array.from(new Set(termos)) : DEFAULT_NAO_COMISSIONAVEIS.map((termo) => normalizeText(termo));
  } catch {
    return DEFAULT_NAO_COMISSIONAVEIS.map((termo) => normalizeText(termo));
  }
}

function isFormaNaoComissionavel(nome?: string | null, termos?: string[]) {
  const normalized = normalizeText(nome || '');
  if (!normalized) return false;
  if (normalized.includes('cartao') && normalized.includes('credito')) return false;
  const base = termos && termos.length > 0 ? termos : DEFAULT_NAO_COMISSIONAVEIS.map((termo) => normalizeText(termo));
  return base.some((termo) => termo && normalized.includes(termo));
}

function guessPagaComissaoDefault(forma: string, termosNaoComissionaveis?: string[]) {
  const normalized = normalizeText(forma || '');
  const isCartaoCredito = normalized.includes('cartao') && normalized.includes('credito');
  if (isFormaNaoComissionavel(forma, termosNaoComissionaveis)) return false;
  if (isCartaoCredito) return true;
  if (normalized.includes('credito')) return false;
  if (normalized.includes('credipax')) return false;
  if (normalized.includes('credito pax')) return false;
  if (normalized.includes('vale viagem')) return false;
  if (normalized.includes('credito de viagem')) return false;
  return true;
}

function sanitizeDestinoTerm(destino?: string | null) {
  if (!destino) return '';
  let term = destino.replace(/\s+/g, ' ').trim();
  if (!term) return '';
  term = term.replace(/\s*[-–—]\s*\d+\s*dia\(s\).*$/i, '');
  term = term.replace(/\s*[-–—]\s*\d+\s*noite\(s\).*$/i, '');
  term = term.replace(/\s*\/\s*\d+\s*dia\(s\).*$/i, '');
  term = term.replace(/\s*\/\s*\d+\s*noite\(s\).*$/i, '');
  return term.trim();
}

function isLocacaoCarroTerm(value?: string | null) {
  const term = normalizeText(value || '');
  if (!term) return false;
  if (term.includes('locacao') || term.includes('locadora')) return true;
  if (term.includes('rent a car') || term.includes('rental car')) return true;
  return term.includes('carro') && term.includes('alug');
}

function isContratoLocacao(contrato: ContratoDraft) {
  return (
    isLocacaoCarroTerm(contrato.produto_principal) ||
    isLocacaoCarroTerm(contrato.produto_tipo) ||
    isLocacaoCarroTerm(contrato.produto_detalhes)
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findWordBoundaryMatch(rows: { id: string; nome: string | null }[], termo: string) {
  if (!rows.length) return null;
  const normalizedTerm = normalizeText(termo, { trim: true, collapseWhitespace: true });
  if (!normalizedTerm) return null;
  const regex = new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`, 'i');
  const exact = rows.find((row) => {
    const nome = normalizeText(row.nome || '', { trim: true, collapseWhitespace: true });
    return regex.test(nome);
  });
  return exact?.id || null;
}

async function findCidadeIdByTerm(client: any, termo: string) {
  const direct = await client.from('cidades').select('id, nome').ilike('nome', termo).maybeSingle();
  if (direct.data?.id) return direct.data.id;

  const prefix = await client.from('cidades').select('id, nome').ilike('nome', `${termo}%`).limit(5);
  if (prefix.data?.[0]?.id) return prefix.data[0].id;

  const contains = await client.from('cidades').select('id, nome').ilike('nome', `%${termo}%`).limit(10);
  return findWordBoundaryMatch((contains.data || []) as { id: string; nome: string | null }[], termo);
}

async function findCidadeIdByDestinoTerm(client: any, termo: string) {
  // Busca em produtos (tabela real) pelo nome do destino
  const direct = await client.from('produtos').select('cidade_id, nome').ilike('nome', termo).maybeSingle();
  if (direct.data?.cidade_id) return direct.data.cidade_id;

  const prefix = await client.from('produtos').select('cidade_id, nome').ilike('nome', `${termo}%`).limit(5);
  if (prefix.data?.[0]?.cidade_id) return prefix.data[0].cidade_id;

  const contains = await client.from('produtos').select('cidade_id, nome').ilike('nome', `%${termo}%`).limit(10);
  const matchId = findWordBoundaryMatch(
    (contains.data || []).map((row: any) => ({ id: row.cidade_id, nome: row.nome })) as {
      id: string;
      nome: string | null;
    }[],
    termo
  );
  return matchId || null;
}

async function findClienteByDocumento(client: any, documento: string) {
  const documentoDigits = normalizeCpf(documento);
  const candidatos =
    documentoDigits.length === 11
      ? [
          documentoDigits,
          `${documentoDigits.slice(0, 3)}.${documentoDigits.slice(3, 6)}.${documentoDigits.slice(6, 9)}-${documentoDigits.slice(9, 11)}`,
        ]
      : documentoDigits.length === 14
        ? [
            documentoDigits,
            `${documentoDigits.slice(0, 2)}.${documentoDigits.slice(2, 5)}.${documentoDigits.slice(5, 8)}/${documentoDigits.slice(8, 12)}-${documentoDigits.slice(12, 14)}`,
          ]
        : [documentoDigits];
  const selectCols = 'id, cpf, nome, nascimento, endereco, numero, cidade, estado, cep, rg, telefone, whatsapp, email';

  const { data } = await client.from('clientes').select(selectCols).in('cpf', candidatos).limit(10);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function resolveClienteImport(client: any, scope: any, params: {
  cpf: string;
  nome?: string | null;
  nascimento?: string | null;
  endereco?: string | null;
  numero?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  rg?: string | null;
}) {
  const cpf = normalizeCpf(params.cpf);
  const nome = String(params.nome || '').trim() || null;
  const nascimento = isISODate(params.nascimento) ? params.nascimento : null;

  const existing = await findClienteByDocumento(client, cpf);
  if (existing) {
    const updates: any = {};
    if (params.endereco && !existing.endereco) updates.endereco = params.endereco;
    if (params.numero && !existing.numero) updates.numero = params.numero;
    if (params.cidade && !existing.cidade) updates.cidade = params.cidade;
    if (params.estado && !existing.estado) updates.estado = params.estado;
    if (params.cep && !existing.cep) updates.cep = params.cep;
    if (params.rg && !existing.rg) updates.rg = params.rg;
    if (Object.keys(updates).length > 0) {
      await client.from('clientes').update(updates).eq('id', existing.id);
    }
    return existing;
  }

  const { data: created, error: insertError } = await client
    .from('clientes')
    .insert({
      cpf: formatCpf(cpf),
      nome: nome || 'Cliente sem nome',
      nascimento,
      endereco: params.endereco || null,
      numero: params.numero || null,
      cidade: params.cidade || null,
      estado: params.estado || null,
      cep: params.cep || null,
      rg: params.rg || null,
      company_id: scope.companyId,
      created_by: scope.userId,
      ativo: true
    })
    .select('id, cpf, nome, nascimento, endereco, numero, cidade, estado, cep, rg, telefone, whatsapp, email')
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const body = await event.request.json();
    const contratos: ContratoDraft[] = Array.isArray(body?.contratos) ? body.contratos : [];
    const principalIndex = Number(body?.principalIndex || 0);
    const dataVenda = String(body?.dataVenda || '').trim();
    const vendedorId = String(body?.vendedorId || '').trim() || user.id;
    const destinoCidadeId = String(body?.destinoCidadeId || '').trim() || null;
    const destinoProdutoId = String(body?.destinoProdutoId || '').trim() || null;
    const clienteTelefone = sanitizeOptionalContact(body?.clienteTelefone);
    const clienteWhatsapp = sanitizeOptionalContact(body?.clienteWhatsapp);
    const clienteEmail = sanitizeOptionalContact(body?.clienteEmail);

    if (!contratos.length) {
      return new Response('Nenhum contrato para salvar.', { status: 400 });
    }
    if (!isISODate(dataVenda)) {
      return new Response('Data da venda inválida.', { status: 400 });
    }
    const hoje = toISODateLocal(new Date());
    const dataLancamento = dataVenda > hoje ? hoje : dataVenda;

    const companyId = scope.companyId;
    if (!companyId) {
      return new Response('Usuário sem company_id para salvar venda.', { status: 400 });
    }

    if (!isUuid(vendedorId)) {
      return new Response('Vendedor inválido.', { status: 400 });
    }

    if (vendedorId !== user.id && !scope.isAdmin && !scope.isMaster) {
      if (scope.isGestor) {
        const equipeIds = await fetchGestorEquipeIdsComGestor(client, user.id);
        if (!equipeIds.includes(vendedorId)) {
          return new Response('Vendedor fora da equipe do gestor.', { status: 403 });
        }
      } else {
        return new Response('Sem permissão para atribuir venda a outro vendedor.', { status: 403 });
      }
    }

    const principal = contratos[principalIndex] || contratos[0];
    const cpfPrincipal = normalizeCpf(principal.contratante?.cpf);
    if (!cpfPrincipal || cpfPrincipal.length < 11) {
      return new Response('CPF/CNPJ do contratante principal é obrigatório.', { status: 400 });
    }

    const documentos = new Set(contratos.map((c) => normalizeCpf(c.contratante?.cpf)));
    if (documentos.size > 1) {
      return new Response('Importação contém contratos de documentos diferentes. Importe separadamente.', { status: 400 });
    }

    let cidadeId = destinoCidadeId;
    if (!cidadeId && principal.destino) {
      const term = sanitizeDestinoTerm(principal.destino);
      if (term) {
        cidadeId = await findCidadeIdByDestinoTerm(client, term);
        if (!cidadeId) {
          cidadeId = await findCidadeIdByTerm(client, term);
        }
      }
    }

    if (isContratoLocacao(principal)) {
      const { data: indefinida } = await client.from('cidades').select('id').ilike('nome', 'Indefinida').maybeSingle();
      if (!indefinida?.id) {
        return new Response("Cidade 'Indefinida' não encontrada. Cadastre antes de importar locação.", { status: 400 });
      }
      cidadeId = indefinida.id;
    }

    if (!cidadeId) {
      return new Response('Selecione a cidade de destino para continuar.', { status: 400 });
    }

    const clientePrincipal = await resolveClienteImport(client, scope, {
      cpf: principal.contratante?.cpf || '',
      nome: principal.contratante?.nome,
      nascimento: principal.contratante?.nascimento,
      endereco: principal.contratante?.endereco,
      numero: principal.contratante?.numero,
      cidade: principal.contratante?.cidade,
      estado: principal.contratante?.uf,
      cep: principal.contratante?.cep,
      rg: principal.contratante?.rg
    });

    const contatos: any = {};
    if (clienteTelefone) contatos.telefone = clienteTelefone;
    if (clienteWhatsapp) contatos.whatsapp = clienteWhatsapp;
    if (clienteEmail) contatos.email = clienteEmail;
    if (Object.keys(contatos).length > 0) {
      await client.from('clientes').update(contatos).eq('id', clientePrincipal.id);
    }

    try {
      await ensureReciboReservaUnicos({
        client,
        companyId,
        clienteId: clientePrincipal.id,
        recibos: contratos.map((contrato) => ({
          numero_recibo: contrato.contrato_numero || null,
          numero_reserva: contrato.reserva_numero || null
        }))
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'Erro ao validar duplicidade.';
      if (code === 'RECIBO_DUPLICADO' || code === 'RESERVA_DUPLICADA') {
        return new Response(code, { status: 409 });
      }
      throw err;
    }

    const termosNaoComissionaveis = await carregarTermosNaoComissionaveis(client);

    const datasInicio = contratos.map((contrato) => contrato.data_saida).filter(Boolean) as string[];
    const datasFim = contratos.map((contrato) => contrato.data_retorno).filter(Boolean) as string[];
    const dataInicioVenda = datasInicio.length ? datasInicio.sort()[0] : principal.data_saida || null;
    const dataFimVenda = datasFim.length ? datasFim.sort().slice(-1)[0] : principal.data_retorno || null;

    const totalBruto = contratos.reduce((sum, c) => sum + parseMoney(c.total_bruto), 0);
    const totalPago = contratos.reduce((sum, c) => sum + parseMoney(c.total_pago), 0);
    const totalTaxas = contratos.reduce((sum, c) => sum + parseMoney(c.taxas_embarque), 0);
    const descontoComercial = contratos.reduce((sum, c) => sum + parseMoney((c as any).desconto_comercial), 0);
    const pagamentosDedup = dedupePagamentos(contratos.flatMap((c) => c.pagamentos || []));
    const totalPagoFallback = pagamentosDedup.length ? calcularTotalPagamentos(pagamentosDedup) : 0;
    const totalPagoFinal = totalPago > 0 ? totalPago : totalPagoFallback;

    const produtoIds = Array.from(
      new Set(
        contratos
          .map((contrato: any) => String(contrato?.produto_resolvido_id || '').trim() || destinoProdutoId || '')
          .filter(Boolean)
      )
    );

    if (produtoIds.length === 0) {
      return new Response('Selecione o produto de cada recibo para continuar.', { status: 400 });
    }

    const { data: produtosSelecionados, error: produtosSelecionadosError } = await client
      .from('produtos')
      .select('id, nome, tipo_produto, cidade_id, todas_as_cidades')
      .in('id', produtoIds);
    if (produtosSelecionadosError) throw produtosSelecionadosError;

    const produtosMap = new Map(
      (produtosSelecionados || []).map((produto: any) => [String(produto.id), produto])
    );

    const cidadeIds = Array.from(
      new Set(
        contratos
          .map((contrato: any) => String(contrato?.destino_cidade_id || '').trim() || cidadeId || '')
          .filter(Boolean)
      )
    );
    const cidadeNomeMap = new Map<string, string>();
    if (cidadeIds.length > 0) {
      const { data: cidadesData, error: cidadesError } = await client
        .from('cidades')
        .select('id, nome')
        .in('id', cidadeIds);
      if (cidadesError) throw cidadesError;
      (cidadesData || []).forEach((cidade: any) => {
        cidadeNomeMap.set(String(cidade.id), String(cidade.nome || '').trim());
      });
    }

    const produtoVendaId =
      String((contratos[0] as any)?.produto_resolvido_id || '').trim() ||
      destinoProdutoId ||
      produtoIds[0] ||
      null;

    if (!produtoVendaId || !produtosMap.has(produtoVendaId)) {
      return new Response('Produto de referência da venda inválido.', { status: 400 });
    }

    const { data: venda, error: vendaError } = await client
      .from('vendas')
      .insert({
        vendedor_id: vendedorId,
        cliente_id: clientePrincipal.id,
        destino_id: produtoVendaId,
        destino_cidade_id: cidadeId,
        company_id: companyId,
        data_lancamento: dataLancamento,
        data_venda: dataVenda,
        data_embarque: dataInicioVenda,
        data_final: dataFimVenda,
        desconto_comercial_aplicado: descontoComercial > 0,
        desconto_comercial_valor: descontoComercial || null,
        valor_total_bruto: totalBruto || null,
        valor_total_pago: totalPagoFinal || null,
        valor_taxas: totalTaxas || null,
        status: 'aberto',
        cancelada: false
      })
      .select('id')
      .single();

    if (vendaError || !venda) throw vendaError || new Error('Erro ao criar venda.');

    const allPagamentos: PagamentoDraft[] = [];

    for (const contrato of contratos) {
      const produtoReciboId = String((contrato as any)?.produto_resolvido_id || '').trim() || destinoProdutoId || '';
      const produtoRecibo = produtosMap.get(produtoReciboId);
      if (!produtoRecibo?.id) {
        return new Response('Produto do recibo inválido.', { status: 400 });
      }

      const reciboCidadeId = String((contrato as any)?.destino_cidade_id || '').trim() || cidadeId || null;
      const tipoProdutoId = String((produtoRecibo as any)?.tipo_produto || '').trim() || null;

      const { data: recibo, error: reciboError } = await client
        .from('vendas_recibos')
        .insert({
          venda_id: venda.id,
          produto_id: tipoProdutoId,
          produto_resolvido_id: produtoRecibo.id,
          destino_cidade_id: reciboCidadeId,
          numero_recibo: contrato.contrato_numero || null,
          numero_reserva: contrato.reserva_numero || null,
          tipo_pacote: contrato.tipo_pacote || null,
          valor_total: parseMoney(contrato.total_pago ?? contrato.total_bruto),
          valor_taxas: parseMoney(contrato.taxas_embarque),
          valor_du: parseMoney(contrato.taxa_du),
          data_inicio: contrato.data_saida || null,
          data_fim: contrato.data_retorno || null,
          contrato_path: null,
          contrato_url: null
        })
        .select('id')
        .single();

      if (reciboError || !recibo) throw reciboError || new Error('Erro ao criar recibo.');

      if (contrato.pagamentos?.length) {
        allPagamentos.push(...contrato.pagamentos);
      }

      const statusViagem = calcularStatusPeriodo(contrato.data_saida || null, contrato.data_retorno || null);

      const { data: viagem, error: viagemError } = await client
        .from('viagens')
        .insert({
          venda_id: venda.id,
          recibo_id: recibo.id,
          cliente_id: clientePrincipal.id,
          responsavel_user_id: vendedorId,
          company_id: companyId,
          origem: null,
          destino: cidadeNomeMap.get(String(reciboCidadeId || '')) || sanitizeDestinoTerm(contrato.destino || principal.destino || '') || null,
          data_inicio: contrato.data_saida || null,
          data_fim: contrato.data_retorno || null,
          status: statusViagem,
          observacoes: null
        })
        .select('id')
        .single();

      if (viagemError || !viagem) throw viagemError || new Error('Erro ao criar viagem.');

      const passageiros = (contrato.passageiros || []).filter(
        (p) => String(p.nome || '').trim() && normalizeCpf(p.cpf).length >= 11
      );

      for (const p of passageiros) {
        const cpf = normalizeCpf(p.cpf);
        let passageiroCliente = await findClienteByDocumento(client, cpf);
        if (!passageiroCliente) {
          const { data: created } = await client
            .from('clientes')
            .insert({
              cpf: formatCpf(cpf),
              nome: String(p.nome || '').trim() || 'Passageiro',
              nascimento: isISODate(p.nascimento) ? p.nascimento : null,
              company_id: companyId,
              created_by: user.id,
              ativo: true
            })
            .select('id')
            .single();
          passageiroCliente = created;
        }

        if (passageiroCliente) {
          await client.from('viagem_passageiros').insert({
            viagem_id: viagem.id,
            cliente_id: passageiroCliente.id,
            company_id: companyId,
            papel: 'passageiro',
            created_by: user.id
          });
        }
      }
    }

    const dedupedPagamentos = dedupePagamentos(allPagamentos);
    let totalCreditosNaoComissionados = 0;
    for (const pagamento of dedupedPagamentos) {
      let formaId: string | null = null;
      let pagaComissao: boolean | null = null;
      const formaNome = String(pagamento.forma || '').trim();
      if (formaNome) {
        const { data: existingForma } = await client
          .from('formas_pagamento')
          .select('id, paga_comissao, permite_desconto')
          .ilike('nome', formaNome)
          .maybeSingle();
        if (existingForma?.id) {
          formaId = existingForma.id;
          pagaComissao = existingForma.paga_comissao ?? true;
        } else {
          const { data: novaForma } = await client
            .from('formas_pagamento')
            .insert({
              nome: formaNome,
              ativo: true,
              company_id: companyId,
              paga_comissao: guessPagaComissaoDefault(formaNome, termosNaoComissionaveis),
              permite_desconto: Boolean(parseMoney(pagamento.desconto) > 0)
            })
            .select('id, paga_comissao')
            .single();
          if (novaForma?.id) {
            formaId = novaForma.id;
            pagaComissao = novaForma.paga_comissao ?? true;
          }
        }
      }

      const valorBruto = parseMoney(pagamento.valor_bruto);
      const descontoValor = parseMoney(pagamento.desconto);
      const valorTotalPagamento =
        pagamento.total != null ? parseMoney(pagamento.total) : valorBruto > 0 ? Math.max(valorBruto - descontoValor, 0) : 0;
      const pagamentoComissionavel = isFormaNaoComissionavel(formaNome, termosNaoComissionaveis)
        ? false
        : pagaComissao ?? true;

      if (!pagamentoComissionavel) {
        totalCreditosNaoComissionados += valorBruto || valorTotalPagamento || 0;
      }

      await client.from('vendas_pagamentos').insert({
        venda_id: venda.id,
        company_id: companyId,
        forma_pagamento_id: formaId,
        forma_nome: formaNome || null,
        operacao: pagamento.operacao || null,
        plano: pagamento.plano || null,
        valor_bruto: valorBruto || null,
        desconto_valor: descontoValor || null,
        valor_total: valorTotalPagamento || null,
        parcelas: Array.isArray(pagamento.parcelas) && pagamento.parcelas.length > 0 ? pagamento.parcelas : null,
        parcelas_qtd: pagamento.parcelas?.length || null,
        parcelas_valor: pagamento.parcelas?.length
          ? parseMoney(pagamento.parcelas[0].valor)
          : valorTotalPagamento || valorBruto || null,
        vencimento_primeira: pagamento.parcelas?.[0]?.vencimento || null,
        paga_comissao: pagamentoComissionavel
      });
    }

    const valorNaoComissionado = totalCreditosNaoComissionados || null;
    const valorTotal = totalPagoFinal > 0 ? Math.max(totalPagoFinal - totalCreditosNaoComissionados, 0) : 0;
    await client
      .from('vendas')
      .update({ valor_nao_comissionado: valorNaoComissionado, valor_total: valorTotal || null })
      .eq('id', venda.id);

    return json({ venda_id: venda.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar importação de contrato.');
  }
}
