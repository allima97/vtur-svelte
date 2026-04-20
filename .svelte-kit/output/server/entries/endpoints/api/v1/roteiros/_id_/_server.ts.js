import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = event.params.id;
    if (!isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    let query = client.from("roteiro_personalizado").select("id, nome, duracao, inicio_cidade, fim_cidade, inclui_texto, nao_inclui_texto, informacoes_importantes, created_by, company_id, created_at, updated_at").eq("id", id);
    if (!scope.isAdmin && !scope.isGestor && !scope.isMaster) {
      query = query.eq("created_by", scope.userId);
    } else if (scope.companyId && !scope.isAdmin && !scope.isMaster) {
      query = query.eq("company_id", scope.companyId);
    }
    const { data: roteiro, error: roteiroError } = await query.maybeSingle();
    if (roteiroError) throw roteiroError;
    if (!roteiro) return json({ error: "Roteiro não encontrado." }, { status: 404 });
    const [dias, hoteis, passeios, transportes, investimentos, pagamentos] = await Promise.all([
      client.from("roteiro_dia").select("id, ordem, cidade, data, descricao, percurso").eq("roteiro_id", id).order("ordem").limit(100),
      client.from("roteiro_hotel").select("id, roteiro_id, cidade, hotel, data_inicio, data_fim, noites, apto, categoria, regime, ordem, endereco, qtd_apto, tipo_tarifa, qtd_adultos, qtd_criancas, valor_original, valor_final").eq("roteiro_id", id).order("ordem").limit(100),
      client.from("roteiro_passeio").select("id, roteiro_id, cidade, passeio, data_inicio, data_fim, tipo, ingressos, ordem, fornecedor, qtd_adultos, qtd_criancas, valor_original, valor_final").eq("roteiro_id", id).order("ordem").limit(100),
      client.from("roteiro_transporte").select("id, roteiro_id, tipo, fornecedor, descricao, data_inicio, data_fim, categoria, observacao, ordem, trecho, cia_aerea, data_voo, classe_reserva, hora_saida, aeroporto_saida, duracao_voo, tipo_voo, hora_chegada, aeroporto_chegada, tarifa_nome, qtd_adultos, qtd_criancas, valor_total, taxas").eq("roteiro_id", id).order("ordem").limit(100),
      client.from("roteiro_investimento").select("id, roteiro_id, tipo, valor_por_pessoa, qtd_apto, valor_por_apto, ordem").eq("roteiro_id", id).order("ordem").limit(50),
      client.from("roteiro_pagamento").select("id, roteiro_id, servico, valor_total_com_taxas, taxas, forma_pagamento, ordem").eq("roteiro_id", id).order("ordem").limit(50)
    ]);
    return json({
      roteiro: {
        ...roteiro,
        dias: dias.data || [],
        hoteis: hoteis.data || [],
        passeios: passeios.data || [],
        transportes: transportes.data || [],
        investimentos: investimentos.data || [],
        pagamentos: pagamentos.data || []
      }
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar roteiro.");
  }
}
export {
  GET
};
