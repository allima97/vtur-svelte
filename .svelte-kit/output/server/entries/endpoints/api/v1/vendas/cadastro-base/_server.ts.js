import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, h as fetchGestorEquipeIdsComGestor, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function isAllowedSellerTipo(tipoNome) {
  const tipo = String(tipoNome || "").toUpperCase();
  return tipo.includes("VENDEDOR") || tipo.includes("GESTOR") || tipo.includes("MASTER");
}
function safeRows(result, options) {
  const err = result?.error;
  if (err) {
    return [];
  }
  return result?.data || [];
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["vendas_consulta", "vendas", "vendas_cadastro"], 1, "Sem acesso a Vendas.");
    }
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get("empresa_id"));
    const activeCompanyIds = companyIds.length > 0 ? companyIds : scope.companyId ? [scope.companyId] : [];
    let vendedoresEquipe = [
      { id: scope.userId, nome_completo: scope.nome || "Você" }
    ];
    let clientes = [];
    let cidades = [];
    let produtos = [];
    let tipos = [];
    let tiposPacote = [];
    let formasPagamento = [];
    if (scope.isGestor && scope.companyId) {
      const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
      if (equipeIds.length > 0) {
        const { data } = await client.from("users").select("id, nome_completo, user_types(name)").in("id", equipeIds).eq("active", true).order("nome_completo");
        vendedoresEquipe = (data || []).filter((row) => isAllowedSellerTipo(row?.user_types?.name));
      }
    } else if (scope.isMaster && activeCompanyIds.length > 0) {
      const { data } = await client.from("users").select("id, nome_completo, user_types(name)").in("company_id", activeCompanyIds).eq("active", true).order("nome_completo");
      vendedoresEquipe = (data || []).filter((row) => isAllowedSellerTipo(row?.user_types?.name));
    }
    let clientesQuery = client.from("clientes").select("id, nome, cpf, telefone, email, whatsapp, company_id").order("nome", { ascending: true }).limit(5e3);
    if (activeCompanyIds.length > 0) clientesQuery = clientesQuery.in("company_id", activeCompanyIds);
    const cidadesQuery = client.from("cidades").select("id, nome, subdivisao:subdivisoes(nome, codigo_admin1)").order("nome", { ascending: true }).limit(5e3);
    const produtosQuery = client.from("produtos").select("id, nome, cidade_id, tipo_produto, destino, todas_as_cidades, ativo, informacoes_importantes, fornecedor_id").order("nome", { ascending: true }).limit(2e3);
    const tiposQuery = client.from("tipo_produtos").select("id, nome, tipo").order("nome", { ascending: true }).limit(200);
    const pacotesQuery = client.from("tipo_pacotes").select("id, nome, ativo").order("nome", { ascending: true }).limit(200);
    const formasQuery = client.from("formas_pagamento").select("id, nome, paga_comissao, permite_desconto, desconto_padrao_pct").order("nome", { ascending: true }).limit(200);
    const [
      clientesRes,
      cidadesRes,
      produtosRes,
      tiposRes,
      pacotesRes,
      formasRes
    ] = await Promise.all([
      clientesQuery,
      cidadesQuery,
      produtosQuery,
      tiposQuery,
      pacotesQuery,
      formasQuery
    ]);
    clientes = safeRows(clientesRes);
    const cidadesRaw = safeRows(cidadesRes);
    cidades = cidadesRaw.map((row) => {
      const sub = row?.subdivisao;
      const estado = sub?.codigo_admin1 || sub?.nome || null;
      return {
        id: row.id,
        nome: row.nome,
        subdivisao: sub,
        estado,
        label: estado ? `${row?.nome || ""} (${estado})` : row?.nome || ""
      };
    });
    produtos = safeRows(produtosRes);
    tipos = safeRows(tiposRes);
    tiposPacote = safeRows(pacotesRes);
    formasPagamento = safeRows(formasRes);
    const warningParts = [];
    if (clientesRes?.error) warningParts.push("clientes");
    if (cidadesRes?.error) warningParts.push("cidades");
    if (produtosRes?.error) warningParts.push("produtos");
    if (tiposRes?.error) warningParts.push("tipo_produtos");
    if (pacotesRes?.error) warningParts.push("tipo_pacotes");
    if (formasRes?.error) warningParts.push("formas_pagamento");
    const warning = warningParts.length > 0 ? `Falha parcial em: ${warningParts.join(", ")}` : null;
    return json({
      user: {
        id: scope.userId,
        papel: scope.papel,
        company_id: scope.companyId,
        uso_individual: scope.usoIndividual,
        is_gestor: scope.isGestor,
        can_assign_vendedor: scope.isGestor || scope.isMaster || scope.isAdmin
      },
      vendedoresEquipe,
      clientes,
      cidades,
      produtos: produtos.filter((row) => row?.ativo !== false).map((row) => ({
        ...row,
        todas_as_cidades: row?.todas_as_cidades === true || !row?.cidade_id && row?.todas_as_cidades !== false
      })),
      tipos,
      tiposPacote,
      formasPagamento,
      warning
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar base do cadastro de vendas.");
  }
}
export {
  GET
};
