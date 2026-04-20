import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, i as isUuid, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const viagemId = String(event.url.searchParams.get("id") || event.params?.id || "").trim();
    if (!isUuid(viagemId)) return json({ error: "ID de viagem inválido." }, { status: 400 });
    const { data: viagem, error: viagemError } = await client.from("viagens").select(`
        id, company_id, venda_id, orcamento_id, cliente_id,
        responsavel_user_id, origem, destino, data_inicio, data_fim,
        status, observacoes, follow_up_text, follow_up_fechado,
        created_at, updated_at,
        cliente:clientes!cliente_id(id, nome, email, telefone, whatsapp, nascimento, cpf),
        responsavel:users!responsavel_user_id(id, nome_completo, email),
        venda:vendas!venda_id(
          id, numero_venda, valor_total, valor_total_pago, status, data_venda,
          recibos:vendas_recibos(
            id, numero_recibo, numero_reserva, tipo_pacote, valor_total, valor_taxas,
            data_inicio, data_fim, contrato_url,
            produto_resolvido:produtos!produto_resolvido_id(id, nome)
          ),
          pagamentos:vendas_pagamentos(
            id, forma_nome, valor_total, parcelas_qtd, vencimento_primeira, paga_comissao
          )
        )
      `).eq("id", viagemId).maybeSingle();
    if (viagemError) throw viagemError;
    if (!viagem) return json({ error: "Viagem não encontrada." }, { status: 404 });
    const companyIds = resolveScopedCompanyIds(scope, viagem.company_id);
    if (!scope.isAdmin && !companyIds.includes(viagem.company_id)) {
      return json({ error: "Viagem fora do escopo." }, { status: 403 });
    }
    if (scope.usoIndividual && viagem.responsavel_user_id && viagem.responsavel_user_id !== user.id) {
      return json({ error: "Sem acesso a esta viagem." }, { status: 403 });
    }
    const { data: acompanhantes } = await client.from("cliente_acompanhantes").select("id, nome_completo, cpf, data_nascimento, grau_parentesco, telefone").eq("cliente_id", viagem.cliente_id || "").eq("ativo", true).limit(20);
    const { data: vouchers } = viagem.venda_id ? await client.from("vouchers").select("id, nome, provider, codigo_fornecedor, data_inicio, data_fim, ativo").eq("company_id", viagem.company_id).limit(20) : { data: [] };
    return json({
      viagem: {
        ...viagem,
        passageiros: acompanhantes || [],
        vouchers: vouchers || [],
        historico: []
      }
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar dossie da viagem.");
  }
}
export {
  GET
};
