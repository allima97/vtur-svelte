import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

// Espelha o contrato de vtur-app/src/pages/api/v1/vendas/cadastro-save.ts
// Aceita POST com payload { venda, recibos, pagamentos } e persiste tudo em transação sequencial.

function isValidUUID(value: unknown): boolean {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas_cadastro', 'vendas'], 1, 'Sem acesso ao cadastro de Vendas.');
    }

    const body = await event.request.json();
    const { venda, recibos = [], pagamentos = [] } = body ?? {};

    // Validações mínimas
    if (!venda || typeof venda !== 'object') {
      return json({ error: 'Payload inválido: campo "venda" obrigatório.' }, { status: 400 });
    }
    if (!isValidUUID(venda.cliente_id)) {
      return json({ error: 'cliente_id inválido ou ausente.' }, { status: 400 });
    }
    if (!Array.isArray(recibos) || recibos.length === 0) {
      return json({ error: 'Pelo menos um recibo é obrigatório.' }, { status: 400 });
    }

    // Resolver vendedor_id: vendedor pode salvar apenas para si; gestor/master/admin podem atribuir
    const canAssign = scope.isGestor || scope.isMaster || scope.isAdmin;
    const vendedorId = canAssign && isValidUUID(venda.vendedor_id) ? venda.vendedor_id : scope.userId;

    // Montar payload da venda
    const vendaPayload: Record<string, unknown> = {
      cliente_id: venda.cliente_id,
      vendedor_id: vendedorId,
      company_id: scope.companyId ?? venda.company_id ?? null,
      data_venda: venda.data_venda ?? new Date().toISOString().slice(0, 10),
      data_embarque: venda.data_embarque ?? null,
      data_final: venda.data_final ?? null,
      destino_id: isValidUUID(venda.destino_id) ? venda.destino_id : null,
      destino_cidade_id: isValidUUID(venda.destino_cidade_id) ? venda.destino_cidade_id : null,
      valor_total: Number(venda.valor_total ?? 0),
      valor_total_bruto: Number(venda.valor_total_bruto ?? venda.valor_total ?? 0),
      valor_taxas: Number(venda.valor_taxas ?? 0),
      desconto_comercial: Number(venda.desconto_comercial ?? 0),
      observacoes: venda.observacoes ?? null,
      contrato_url: venda.contrato_url ?? null,
      contrato_path: venda.contrato_path ?? null,
      cancelada: false
    };

    // Inserir venda
    const { data: vendaData, error: vendaError } = await client
      .from('vendas')
      .insert(vendaPayload)
      .select('id')
      .single();

    if (vendaError) throw vendaError;
    const vendaId = vendaData.id;

    // Inserir recibos
    const recibosPayload = recibos.map((r: any, idx: number) => ({
      venda_id: vendaId,
      numero_recibo: r.numero_recibo ?? null,
      numero_reserva: r.numero_reserva ?? null,
      tipo_pacote: r.tipo_pacote ?? null,
      tipo_produto_id: isValidUUID(r.tipo_produto_id) ? r.tipo_produto_id : null,
      produto_resolvido_id: isValidUUID(r.produto_resolvido_id) ? r.produto_resolvido_id : null,
      data_inicio: r.data_inicio ?? null,
      data_fim: r.data_fim ?? null,
      valor_total: Number(r.valor_total ?? 0),
      valor_taxas: Number(r.valor_taxas ?? 0),
      valor_du: Number(r.valor_du ?? 0),
      valor_rav: Number(r.valor_rav ?? 0),
      is_principal: r.is_principal === true || idx === 0,
      company_id: scope.companyId ?? null
    }));

    const { error: recibosError } = await client.from('vendas_recibos').insert(recibosPayload);
    if (recibosError) throw recibosError;

    // Inserir pagamentos (opcional)
    if (pagamentos.length > 0) {
      const pagamentosPayload = pagamentos.map((p: any) => ({
        venda_id: vendaId,
        forma_pagamento_id: isValidUUID(p.forma_pagamento_id) ? p.forma_pagamento_id : null,
        valor: Number(p.valor ?? 0),
        parcelas_qtd: Number(p.parcelas_qtd ?? 1),
        parcelas_valor: Number(p.parcelas_valor ?? p.valor ?? 0),
        data_pagamento: p.data_pagamento ?? null,
        observacoes: p.observacoes ?? null,
        company_id: scope.companyId ?? null
      }));

      const { error: pagamentosError } = await client.from('vendas_pagamentos').insert(pagamentosPayload);
      if (pagamentosError) throw pagamentosError;
    }

    return json({ success: true, venda_id: vendaId }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar cadastro de venda.');
  }
}
