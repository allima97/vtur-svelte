import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { syncViagemStatusIfNeeded } from '$lib/server/viagensStatus';

function vendedorOwnsViagem(userId: string, viagem: any) {
  const responsavelId = String(viagem?.responsavel_user_id || '').trim();
  const vendedorId = String(viagem?.venda?.vendedor_id || '').trim();
  return responsavelId === userId || vendedorId === userId;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const viagemId = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(viagemId)) return json({ error: 'ID de viagem inválido.' }, { status: 400 });

    const { data: viagem, error: viagemError } = await client
      .from('viagens')
      .select(`
        id, company_id, venda_id, orcamento_id, cliente_id,
        responsavel_user_id, origem, destino, data_inicio, data_fim,
        status, observacoes, follow_up_text, follow_up_fechado,
        created_at, updated_at,
        cliente:clientes!cliente_id(id, nome, email, telefone, whatsapp, nascimento, cpf),
        responsavel:users!responsavel_user_id(id, nome_completo, email),
        venda:vendas!venda_id(
          id, vendedor_id, numero_venda, valor_total, valor_total_pago, status, data_venda,
          recibos:vendas_recibos(
            id, numero_recibo, numero_reserva, tipo_pacote, valor_total, valor_taxas,
            data_inicio, data_fim, contrato_url,
            produto_resolvido:produtos!produto_resolvido_id(id, nome)
          ),
          pagamentos:vendas_pagamentos(
            id, forma_nome, valor_total, parcelas_qtd, vencimento_primeira, paga_comissao
          )
        )
      `)
      .eq('id', viagemId)
      .maybeSingle();

    if (viagemError) throw viagemError;
    if (!viagem) return json({ error: 'Viagem não encontrada.' }, { status: 404 });

    // ✅ Ownership compatível com MASTER (múltiplos companyIds)
    const companyIds = resolveScopedCompanyIds(scope, viagem.company_id);
    if (!scope.isAdmin && !companyIds.includes(viagem.company_id)) {
      return json({ error: 'Viagem fora do escopo.' }, { status: 403 });
    }

    if (scope.isVendedor && !vendedorOwnsViagem(user.id, viagem)) {
      return json({ error: 'Sem acesso a esta viagem.' }, { status: 403 });
    }

    const statusAtual = await syncViagemStatusIfNeeded(client, viagem as any);
    const viagemComStatus = { ...viagem, status: statusAtual };

    const { data: acompanhantes } = await client
      .from('cliente_acompanhantes')
      .select('id, nome_completo, cpf, data_nascimento, grau_parentesco, telefone')
      .eq('cliente_id', viagem.cliente_id || '')
      .eq('ativo', true)
      .limit(20);

    const { data: vouchers } = viagemComStatus.venda_id
      ? await client
          .from('vouchers')
          .select('id, nome, provider, codigo_fornecedor, data_inicio, data_fim, ativo')
          .eq('company_id', viagemComStatus.company_id)
          .limit(20)
      : { data: [] };

    return json({
      viagem: {
        ...viagemComStatus,
        passageiros: acompanhantes || [],
        vouchers: vouchers || [],
        historico: []
      }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar dossie da viagem.');
  }
}
