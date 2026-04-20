import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, i as isUuid, h as fetchGestorEquipeIdsComGestor, t as toErrorResponse } from "../../../../../../chunks/v1.js";
import { n as normalizeText } from "../../../../../../chunks/normalizeText.js";
function toISODateLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}
function normalizeCpf(value) {
  return String(value || "").replace(/\D/g, "");
}
function formatCpf(value) {
  const digits = normalizeCpf(value);
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
function parseMoney(value) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Number(value);
}
function sanitizeOptionalContact(value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}
function buildPagamentoKey(pagamento) {
  const forma = normalizeText(pagamento.forma || "").toUpperCase();
  const valorRef = pagamento.total != null ? pagamento.total : pagamento.valor_bruto != null ? pagamento.valor_bruto : 0;
  const valor = Number(valorRef).toFixed(2);
  const parcelas = (pagamento.parcelas || []).map((parcela) => {
    const numero = String(parcela.numero || "");
    const val = Number(parcela.valor).toFixed(2);
    const vencimento = parcela.vencimento || "";
    return `${numero}:${val}:${vencimento}`;
  }).join("|");
  return `${forma}|${valor}|${parcelas}`;
}
function dedupePagamentos(pagamentos) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  pagamentos.forEach((pagamento) => {
    if (!pagamento?.forma) return;
    const key = buildPagamentoKey(pagamento);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(pagamento);
  });
  return result;
}
function sanitizeDestinoTerm(destino) {
  if (!destino) return "";
  let term = destino.replace(/\s+/g, " ").trim();
  if (!term) return "";
  term = term.replace(/\s*[-–—]\s*\d+\s*dia\(s\).*$/i, "");
  term = term.replace(/\s*[-–—]\s*\d+\s*noite\(s\).*$/i, "");
  term = term.replace(/\s*\/\s*\d+\s*dia\(s\).*$/i, "");
  term = term.replace(/\s*\/\s*\d+\s*noite\(s\).*$/i, "");
  return term.trim();
}
function isLocacaoCarroTerm(value) {
  const term = normalizeText(value || "");
  if (!term) return false;
  if (term.includes("locacao") || term.includes("locadora")) return true;
  if (term.includes("rent a car") || term.includes("rental car")) return true;
  return term.includes("carro") && term.includes("alug");
}
function isContratoLocacao(contrato) {
  return isLocacaoCarroTerm(contrato.produto_principal) || isLocacaoCarroTerm(contrato.produto_tipo) || isLocacaoCarroTerm(contrato.produto_detalhes);
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function findWordBoundaryMatch(rows, termo) {
  if (!rows.length) return null;
  const normalizedTerm = normalizeText(termo, { trim: true, collapseWhitespace: true });
  if (!normalizedTerm) return null;
  const regex = new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`, "i");
  const exact = rows.find((row) => {
    const nome = normalizeText(row.nome || "", { trim: true, collapseWhitespace: true });
    return regex.test(nome);
  });
  return exact?.id || null;
}
async function findCidadeIdByTerm(client, termo) {
  const direct = await client.from("cidades").select("id, nome").ilike("nome", termo).maybeSingle();
  if (direct.data?.id) return direct.data.id;
  const prefix = await client.from("cidades").select("id, nome").ilike("nome", `${termo}%`).limit(5);
  if (prefix.data?.[0]?.id) return prefix.data[0].id;
  const contains = await client.from("cidades").select("id, nome").ilike("nome", `%${termo}%`).limit(10);
  return findWordBoundaryMatch(contains.data || [], termo);
}
async function findCidadeIdByDestinoTerm(client, termo) {
  const direct = await client.from("produtos").select("cidade_id, nome").ilike("nome", termo).maybeSingle();
  if (direct.data?.cidade_id) return direct.data.cidade_id;
  const prefix = await client.from("produtos").select("cidade_id, nome").ilike("nome", `${termo}%`).limit(5);
  if (prefix.data?.[0]?.cidade_id) return prefix.data[0].cidade_id;
  const contains = await client.from("produtos").select("cidade_id, nome").ilike("nome", `%${termo}%`).limit(10);
  const matchId = findWordBoundaryMatch(
    (contains.data || []).map((row) => ({ id: row.cidade_id, nome: row.nome })),
    termo
  );
  return matchId || null;
}
async function findClienteByDocumento(client, documento) {
  const documentoDigits = normalizeCpf(documento);
  const candidatos = documentoDigits.length === 11 ? [
    documentoDigits,
    `${documentoDigits.slice(0, 3)}.${documentoDigits.slice(3, 6)}.${documentoDigits.slice(6, 9)}-${documentoDigits.slice(9, 11)}`
  ] : documentoDigits.length === 14 ? [
    documentoDigits,
    `${documentoDigits.slice(0, 2)}.${documentoDigits.slice(2, 5)}.${documentoDigits.slice(5, 8)}/${documentoDigits.slice(8, 12)}-${documentoDigits.slice(12, 14)}`
  ] : [documentoDigits];
  const selectCols = "id, cpf, nome, nascimento, endereco, numero, cidade, estado, cep, rg, telefone, whatsapp, email";
  const { data } = await client.from("clientes").select(selectCols).in("cpf", candidatos).limit(10);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}
async function resolveClienteImport(client, scope, params) {
  const cpf = normalizeCpf(params.cpf);
  const nome = String(params.nome || "").trim() || null;
  const nascimento = isISODate(params.nascimento) ? params.nascimento : null;
  const existing = await findClienteByDocumento(client, cpf);
  if (existing) {
    const updates = {};
    if (params.endereco && !existing.endereco) updates.endereco = params.endereco;
    if (params.numero && !existing.numero) updates.numero = params.numero;
    if (params.cidade && !existing.cidade) updates.cidade = params.cidade;
    if (params.estado && !existing.estado) updates.estado = params.estado;
    if (params.cep && !existing.cep) updates.cep = params.cep;
    if (params.rg && !existing.rg) updates.rg = params.rg;
    if (Object.keys(updates).length > 0) {
      await client.from("clientes").update(updates).eq("id", existing.id);
    }
    return existing;
  }
  const { data: created, error: insertError } = await client.from("clientes").insert({
    cpf: formatCpf(cpf),
    nome: nome || "Cliente sem nome",
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
  }).select("id, cpf, nome, nascimento, endereco, numero, cidade, estado, cep, rg, telefone, whatsapp, email").single();
  if (insertError) throw insertError;
  return created;
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json();
    const contratos = Array.isArray(body?.contratos) ? body.contratos : [];
    const principalIndex = Number(body?.principalIndex || 0);
    const dataVenda = String(body?.dataVenda || "").trim();
    const vendedorId = String(body?.vendedorId || "").trim() || user.id;
    const destinoCidadeId = String(body?.destinoCidadeId || "").trim() || null;
    const destinoProdutoId = String(body?.destinoProdutoId || "").trim() || null;
    const clienteTelefone = sanitizeOptionalContact(body?.clienteTelefone);
    const clienteWhatsapp = sanitizeOptionalContact(body?.clienteWhatsapp);
    const clienteEmail = sanitizeOptionalContact(body?.clienteEmail);
    if (!contratos.length) {
      return new Response("Nenhum contrato para salvar.", { status: 400 });
    }
    if (!isISODate(dataVenda)) {
      return new Response("Data da venda inválida.", { status: 400 });
    }
    const hoje = toISODateLocal(/* @__PURE__ */ new Date());
    const dataLancamento = dataVenda > hoje ? hoje : dataVenda;
    const companyId = scope.companyId;
    if (!companyId) {
      return new Response("Usuário sem company_id para salvar venda.", { status: 400 });
    }
    if (!isUuid(vendedorId)) {
      return new Response("Vendedor inválido.", { status: 400 });
    }
    if (vendedorId !== user.id && !scope.isAdmin && !scope.isMaster) {
      if (scope.isGestor) {
        const equipeIds = await fetchGestorEquipeIdsComGestor(client, user.id);
        if (!equipeIds.includes(vendedorId)) {
          return new Response("Vendedor fora da equipe do gestor.", { status: 403 });
        }
      } else {
        return new Response("Sem permissão para atribuir venda a outro vendedor.", { status: 403 });
      }
    }
    const principal = contratos[principalIndex] || contratos[0];
    const cpfPrincipal = normalizeCpf(principal.contratante?.cpf);
    if (!cpfPrincipal || cpfPrincipal.length < 11) {
      return new Response("CPF/CNPJ do contratante principal é obrigatório.", { status: 400 });
    }
    const documentos = new Set(contratos.map((c) => normalizeCpf(c.contratante?.cpf)));
    if (documentos.size > 1) {
      return new Response("Importação contém contratos de documentos diferentes. Importe separadamente.", { status: 400 });
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
      const { data: indefinida } = await client.from("cidades").select("id").ilike("nome", "Indefinida").maybeSingle();
      if (!indefinida?.id) {
        return new Response("Cidade 'Indefinida' não encontrada. Cadastre antes de importar locação.", { status: 400 });
      }
      cidadeId = indefinida.id;
    }
    if (!cidadeId) {
      return new Response("Selecione a cidade de destino para continuar.", { status: 400 });
    }
    const clientePrincipal = await resolveClienteImport(client, scope, {
      cpf: principal.contratante?.cpf || "",
      nome: principal.contratante?.nome,
      nascimento: principal.contratante?.nascimento,
      endereco: principal.contratante?.endereco,
      numero: principal.contratante?.numero,
      cidade: principal.contratante?.cidade,
      estado: principal.contratante?.uf,
      cep: principal.contratante?.cep,
      rg: principal.contratante?.rg
    });
    const contatos = {};
    if (clienteTelefone) contatos.telefone = clienteTelefone;
    if (clienteWhatsapp) contatos.whatsapp = clienteWhatsapp;
    if (clienteEmail) contatos.email = clienteEmail;
    if (Object.keys(contatos).length > 0) {
      await client.from("clientes").update(contatos).eq("id", clientePrincipal.id);
    }
    const totalBruto = contratos.reduce((sum, c) => sum + parseMoney(c.total_bruto), 0);
    const totalPago = contratos.reduce((sum, c) => sum + parseMoney(c.total_pago), 0);
    const totalTaxas = contratos.reduce((sum, c) => sum + parseMoney(c.taxas_embarque) + parseMoney(c.taxa_du), 0);
    const { data: venda, error: vendaError } = await client.from("vendas").insert({
      vendedor_id: vendedorId,
      cliente_id: clientePrincipal.id,
      destino_id: destinoProdutoId,
      destino_cidade_id: cidadeId,
      company_id: companyId,
      data_lancamento: dataLancamento,
      data_venda: dataVenda,
      data_embarque: principal.data_saida || null,
      data_final: principal.data_retorno || null,
      desconto_comercial_aplicado: false,
      desconto_comercial_valor: 0,
      valor_total_bruto: totalBruto,
      valor_total_pago: totalPago,
      valor_taxas: totalTaxas,
      status: "aberto",
      cancelada: false
    }).select("id").single();
    if (vendaError || !venda) throw vendaError || new Error("Erro ao criar venda.");
    const allPagamentos = [];
    for (const contrato of contratos) {
      const { data: recibo, error: reciboError } = await client.from("vendas_recibos").insert({
        venda_id: venda.id,
        produto_id: null,
        produto_resolvido_id: destinoProdutoId,
        numero_recibo: contrato.contrato_numero || null,
        numero_reserva: contrato.reserva_numero || null,
        tipo_pacote: contrato.tipo_pacote || null,
        valor_total: parseMoney(contrato.total_bruto),
        valor_taxas: parseMoney(contrato.taxas_embarque),
        valor_du: parseMoney(contrato.taxa_du),
        data_inicio: contrato.data_saida || null,
        data_fim: contrato.data_retorno || null,
        contrato_path: null,
        contrato_url: null
      }).select("id").single();
      if (reciboError || !recibo) throw reciboError || new Error("Erro ao criar recibo.");
      if (contrato.pagamentos?.length) {
        allPagamentos.push(...contrato.pagamentos);
      }
      const { data: viagem, error: viagemError } = await client.from("viagens").insert({
        venda_id: venda.id,
        recibo_id: recibo.id,
        cliente_id: clientePrincipal.id,
        responsavel_user_id: vendedorId,
        company_id: companyId,
        origem: null,
        destino: principal.destino || null,
        data_inicio: contrato.data_saida || null,
        data_fim: contrato.data_retorno || null,
        status: "confirmada",
        observacoes: null
      }).select("id").single();
      if (viagemError || !viagem) throw viagemError || new Error("Erro ao criar viagem.");
      const passageiros = (contrato.passageiros || []).filter(
        (p) => String(p.nome || "").trim() && normalizeCpf(p.cpf).length >= 11
      );
      for (const p of passageiros) {
        const cpf = normalizeCpf(p.cpf);
        let passageiroCliente = await findClienteByDocumento(client, cpf);
        if (!passageiroCliente) {
          const { data: created } = await client.from("clientes").insert({
            cpf: formatCpf(cpf),
            nome: String(p.nome || "").trim() || "Passageiro",
            nascimento: isISODate(p.nascimento) ? p.nascimento : null,
            company_id: companyId,
            created_by: user.id,
            ativo: true
          }).select("id").single();
          passageiroCliente = created;
        }
        if (passageiroCliente) {
          await client.from("viagem_passageiros").insert({
            viagem_id: viagem.id,
            cliente_id: passageiroCliente.id,
            company_id: companyId,
            papel: "passageiro",
            created_by: user.id
          });
        }
      }
    }
    const dedupedPagamentos = dedupePagamentos(allPagamentos);
    for (const pagamento of dedupedPagamentos) {
      let formaId = null;
      const formaNome = String(pagamento.forma || "").trim();
      if (formaNome) {
        const { data: existingForma } = await client.from("formas_pagamento").select("id").ilike("nome", formaNome).maybeSingle();
        if (existingForma?.id) {
          formaId = existingForma.id;
        } else {
          const { data: novaForma } = await client.from("formas_pagamento").insert({ nome: formaNome, ativo: true, company_id: companyId }).select("id").single();
          if (novaForma?.id) formaId = novaForma.id;
        }
      }
      await client.from("vendas_pagamentos").insert({
        venda_id: venda.id,
        company_id: companyId,
        forma_pagamento_id: formaId,
        forma_nome: formaNome || null,
        operacao: pagamento.operacao || null,
        plano: pagamento.plano || null,
        valor_bruto: parseMoney(pagamento.valor_bruto),
        desconto_valor: parseMoney(pagamento.desconto),
        valor_total: parseMoney(pagamento.total),
        parcelas: Array.isArray(pagamento.parcelas) && pagamento.parcelas.length > 0 ? pagamento.parcelas : null,
        parcelas_qtd: pagamento.parcelas?.length || null,
        parcelas_valor: pagamento.parcelas?.length ? parseMoney(pagamento.parcelas[0].valor) : parseMoney(pagamento.total || pagamento.valor_bruto),
        vencimento_primeira: pagamento.parcelas?.[0]?.vencimento || null,
        paga_comissao: null
      });
    }
    const valorNaoComissionado = 0;
    const valorTotal = Math.max(totalPago - valorNaoComissionado, 0);
    await client.from("vendas").update({ valor_nao_comissionado: valorNaoComissionado, valor_total: valorTotal }).eq("id", venda.id);
    return json({ venda_id: venda.id });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar importação de contrato.");
  }
}
export {
  POST
};
