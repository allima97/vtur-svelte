import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

async function hasViagemAccessByResponsavel(client: any, scope: any, userId: string, responsavelUserId?: string | null) {
  const allowedResponsavelIds = !scope.isAdmin
    ? scope.isGestor || scope.isMaster
      ? await resolveScopedVendedorIds(client, scope, null)
      : [userId]
    : await resolveScopedVendedorIds(client, scope, null);

  if (allowedResponsavelIds.length === 0) return scope.isAdmin;

  const responsavelId = String(responsavelUserId || '').trim();
  return responsavelId ? allowedResponsavelIds.includes(responsavelId) : false;
}

async function hasViagemAccessByVenda(client: any, scope: any, userId: string, vendaId?: string | null) {
  const id = String(vendaId || '').trim();
  if (!id) return false;

  const allowedResponsavelIds = !scope.isAdmin
    ? scope.isGestor || scope.isMaster
      ? await resolveScopedVendedorIds(client, scope, null)
      : [userId]
    : await resolveScopedVendedorIds(client, scope, null);

  if (allowedResponsavelIds.length === 0) return scope.isAdmin;

  const { data: venda } = await client
    .from('vendas')
    .select('id, vendedor_id')
    .eq('id', id)
    .maybeSingle();

  const vendedorId = String((venda as any)?.vendedor_id || '').trim();
  return vendedorId ? allowedResponsavelIds.includes(vendedorId) : false;
}

async function hasViagemAccessByCliente(client: any, scope: any, userId: string, clienteId?: string | null) {
  const id = String(clienteId || '').trim();
  if (!id) return false;

  const allowedResponsavelIds = !scope.isAdmin
    ? scope.isGestor || scope.isMaster
      ? await resolveScopedVendedorIds(client, scope, null)
      : [userId]
    : await resolveScopedVendedorIds(client, scope, null);

  if (allowedResponsavelIds.length === 0) return scope.isAdmin;

  // Clientes relacionados a vendas do vendedor/equipe
  const { data: vendaCliente } = await client
    .from('vendas')
    .select('id')
    .eq('cliente_id', id)
    .in('vendedor_id', allowedResponsavelIds)
    .maybeSingle();
  if (vendaCliente?.id) return true;

  // Fallback para cliente criado pelo vendedor/equipe
  const { data: cliente, error: clienteError } = await client
    .from('clientes')
    .select('id, created_by')
    .eq('id', id)
    .maybeSingle();
  if (!clienteError) {
    const createdBy = String((cliente as any)?.created_by || '').trim();
    if (createdBy && allowedResponsavelIds.includes(createdBy)) return true;
  }

  return false;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_viagens', 'viagens', 'operacao'], 1, 'Sem acesso a Viagens.');
    }

    const { id } = event.params;
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));

    const { data: viagem, error } = await client
      .from('viagens')
      .select(`
        id,
        venda_id,
        orcamento_id,
        cliente_id,
        company_id,
        responsavel_user_id,
        origem,
        destino,
        data_inicio,
        data_fim,
        status,
        observacoes,
        follow_up_text,
        follow_up_fechado,
        recibo_id,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return json({ error: 'Viagem não encontrada' }, { status: 404 });
      }
      throw error;
    }

    if (companyIds.length > 0 && !companyIds.includes(viagem.company_id)) {
      return json({ error: 'Sem acesso a esta viagem' }, { status: 403 });
    }

    const hasResponsavelAccess = await hasViagemAccessByResponsavel(client, scope, user.id, viagem.responsavel_user_id);
    const hasVendaAccess = await hasViagemAccessByVenda(client, scope, user.id, viagem.venda_id);
    const hasClienteAccess = await hasViagemAccessByCliente(client, scope, user.id, viagem.cliente_id);
    if (!hasResponsavelAccess && !hasVendaAccess && !hasClienteAccess) {
      return json({ error: 'Sem acesso a esta viagem' }, { status: 403 });
    }

    let cliente = null;
    if (viagem.cliente_id) {
      const { data: clienteData } = await client
        .from('clientes')
        .select('id, nome, email, telefone, whatsapp')
        .eq('id', viagem.cliente_id)
        .single();
      cliente = clienteData;
    }

    let venda = null;
    if (viagem.venda_id) {
      const { data: vendaData } = await client
        .from('vendas')
        .select('id, valor_total, valor_total_pago, status, data_venda')
        .eq('id', viagem.venda_id)
        .single();

      if (vendaData) {
        venda = { ...vendaData } as any;

        const { data: recibosData } = await client
          .from('vendas_recibos')
          .select(`
            id,
            produto_id,
            produto_resolvido_id,
            numero_recibo,
            numero_reserva,
            tipo_pacote,
            valor_total,
            valor_taxas,
            data_inicio,
            data_fim,
            contrato_url
          `)
          .eq('venda_id', viagem.venda_id);

        const produtoIds = [...new Set((recibosData || [])
          .map((r: any) => r.produto_id || r.produto_resolvido_id)
          .filter(Boolean))];

        const produtosMap = new Map<string, string>();
        if (produtoIds.length > 0) {
          const { data: produtosData } = await client
            .from('produtos')
            .select('id, nome')
            .in('id', produtoIds);
          (produtosData || []).forEach((p: any) => produtosMap.set(p.id, p.nome));
        }

        venda.recibos = (recibosData || []).map((r: any) => ({
          ...r,
          produto_nome: produtosMap.get(r.produto_id || r.produto_resolvido_id) || 'Produto'
        }));
      }
    }

    let recibo = null;
    if (viagem.recibo_id) {
      const { data: reciboData } = await client
        .from('vendas_recibos')
        .select('id, numero_recibo, numero_reserva, valor_total, data_inicio, data_fim')
        .eq('id', viagem.recibo_id)
        .single();
      recibo = reciboData;
    }

    // Vouchers vinculados à company da viagem (sem filtro de venda_id — comportamento original mantido)
    const { data: vouchers } = viagem.venda_id
      ? await client
          .from('vouchers')
          .select('id, nome, provider, codigo_systur, codigo_fornecedor, data_inicio, data_fim, ativo')
          .eq('company_id', viagem.company_id)
          .limit(20)
      : { data: [] };

    const { data: passageiros } = await client
      .from('viagem_passageiros')
      .select(`
        id, viagem_id, cliente_id, papel, observacoes, created_at,
        cliente:clientes!cliente_id(id, nome, cpf, telefone, data_nascimento:nascimento)
      `)
      .eq('viagem_id', id)
      .order('created_at', { ascending: true });

    return json({
      viagem: { ...viagem, cliente, venda, recibo, vouchers: vouchers || [], passageiros: passageiros || [] }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar viagem.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_viagens', 'viagens', 'operacao'], 2, 'Sem permissão para editar viagens.');
    }

    const { id } = event.params;
    const body = await event.request.json();
    const companyIds = resolveScopedCompanyIds(scope, body.company_id);

    const { data: existing, error: checkError } = await client
      .from('viagens')
      .select('id, company_id, responsavel_user_id, venda_id, cliente_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return json({ error: 'Viagem não encontrada' }, { status: 404 });
    }

    if (companyIds.length > 0 && !companyIds.includes(existing.company_id)) {
      return json({ error: 'Sem acesso a esta viagem' }, { status: 403 });
    }

    const hasResponsavelAccess = await hasViagemAccessByResponsavel(client, scope, user.id, (existing as any)?.responsavel_user_id);
    const hasVendaAccess = await hasViagemAccessByVenda(client, scope, user.id, (existing as any)?.venda_id ?? null);
    const hasClienteAccess = await hasViagemAccessByCliente(client, scope, user.id, (existing as any)?.cliente_id ?? null);
    if (!hasResponsavelAccess && !hasVendaAccess && !hasClienteAccess) {
      return json({ error: 'Sem acesso a esta viagem' }, { status: 403 });
    }

    const allowedFields = [
      'data_inicio', 'data_fim', 'status',
      'observacoes', 'follow_up_text', 'follow_up_fechado', 'responsavel_user_id'
    ];

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) updateData[field] = body[field];
    });

    const { data, error } = await client
      .from('viagens')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return json({ viagem: data, message: 'Viagem atualizada com sucesso' });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar viagem.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_viagens', 'viagens', 'operacao'], 3, 'Sem permissão para excluir viagens.');
    }

    const { id } = event.params;
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('company_id'));

    // ✅ Guard: não-admin deve ter empresa identificada
    if (!scope.isAdmin && companyIds.length === 0) {
      return json({ error: 'Informe company_id para excluir viagem.' }, { status: 400 });
    }

    const { data: existing, error: checkError } = await client
      .from('viagens')
      .select('id, company_id, responsavel_user_id, venda_id, cliente_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return json({ error: 'Viagem não encontrada' }, { status: 404 });
    }

    if (companyIds.length > 0 && !companyIds.includes(existing.company_id)) {
      return json({ error: 'Sem acesso a esta viagem' }, { status: 403 });
    }

    const hasResponsavelAccess = await hasViagemAccessByResponsavel(client, scope, user.id, (existing as any)?.responsavel_user_id);
    const hasVendaAccess = await hasViagemAccessByVenda(client, scope, user.id, (existing as any)?.venda_id ?? null);
    const hasClienteAccess = await hasViagemAccessByCliente(client, scope, user.id, (existing as any)?.cliente_id ?? null);
    if (!hasResponsavelAccess && !hasVendaAccess && !hasClienteAccess) {
      return json({ error: 'Sem acesso a esta viagem' }, { status: 403 });
    }

    const { error } = await client.from('viagens').delete().eq('id', id);
    if (error) throw error;

    return json({ message: 'Viagem excluída com sucesso' });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir viagem.');
  }
}
