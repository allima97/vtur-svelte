import { json, error } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import {
  buildVendaPayload,
  ensureAssignableActiveSeller,
  ensureReciboReservaUnicos,
  syncVendaChildren
} from '$lib/server/vendasSave';

function mapSyncChildrenError(err: unknown) {
  const code = String((err as any)?.code || '').trim();
  const message = String((err as any)?.message || '').trim();
  const detail = String((err as any)?.details || '').trim();
  const lowered = `${message} ${detail}`.toLowerCase();

  if (message === 'RECIBO_INVALIDO') {
    return { status: 400, body: { code: 'RECIBO_INVALIDO', error: 'Recibo invalido: selecione um tipo/produto valido.' } };
  }

  if (code === '22P02') {
    if (lowered.includes('uuid')) {
      return {
        status: 400,
        body: {
          code: 'UUID_INVALIDO',
          error: 'Dados invalidos no payload (UUID mal formatado em recibos ou pagamentos).'
        }
      };
    }
    return {
      status: 400,
      body: {
        code: 'TIPO_INVALIDO',
        error: 'Dados invalidos no payload (formato numerico ou de data incorreto). Verifique valores como valor_total, taxas, parcelas, etc.'
      }
    };
  }

  if (code === '23503') {
    return {
      status: 400,
      body: {
        code: 'REFERENCIA_INVALIDA',
        error: 'Algum item referencia cadastro inexistente (produto, forma de pagamento ou relacao associada).'
      }
    };
  }

  if (code === '23502') {
    return {
      status: 400,
      body: {
        code: 'CAMPO_OBRIGATORIO_AUSENTE',
        error: 'Faltam campos obrigatorios para salvar os recibos/pagamentos da venda.'
      }
    };
  }

  if (code === '23505') {
    return {
      status: 409,
      body: {
        code: 'DUPLICIDADE',
        error: 'Conflito de dados duplicados ao sincronizar a venda.'
      }
    };
  }

  if (code === '42883') {
    return {
      status: 500,
      body: {
        code: 'RPC_NAO_ENCONTRADA',
        error: 'Funcao sync_venda_children nao encontrada no banco. Verifique se a migration foi aplicada.'
      }
    };
  }

  if (code === 'P0001') {
    return {
      status: 400,
      body: {
        code: 'REGRA_VIOLADA',
        error: message || 'Uma regra de negocio foi violada ao sincronizar a venda.'
      }
    };
  }

  return null;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && !scope.isMaster) ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 1, 'Sem acesso a Vendas.');

    const id = String(event.params.id || '').trim();
    if (!isUuid(id)) {
      return json({ error: 'ID invalido.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get('vendedor_id'));
    const shouldApplySellerScope = !scope.isGestor && !scope.isMaster;

    const selectClauses = [
      `*, cliente:clientes!vendas_cliente_id_fkey(id,nome,cpf,telefone,email,whatsapp), vendedor:users!vendas_vendedor_id_fkey(id,nome_completo), destino:produtos!vendas_destino_id_fkey(id,nome), destino_cidade:cidades!vendas_destino_cidade_id_fkey(id,nome), recibos:vendas_recibos(*, destino_cidade:cidades!destino_cidade_id(id,nome), produto_resolvido:produtos!produto_resolvido_id(id,nome), tipo_produtos:tipo_produtos!produto_id(id,nome,tipo)), pagamentos:vendas_pagamentos!vendas_pagamentos_venda_id_fkey(*)`,
      `id, numero_venda, vendedor_id, cliente_id, company_id, data_venda, data_embarque, data_final, valor_total, valor_total_bruto, valor_taxas, cancelada, notas, cliente:clientes!vendas_cliente_id_fkey(id,nome,cpf,telefone,email,whatsapp), vendedor:users!vendas_vendedor_id_fkey(id,nome_completo), destino:produtos!vendas_destino_id_fkey(id,nome), destino_cidade:cidades!vendas_destino_cidade_id_fkey(id,nome), recibos:vendas_recibos(id, venda_id, produto_id, produto_resolvido_id, destino_cidade_id, numero_recibo, numero_recibo_normalizado, numero_reserva, tipo_pacote, valor_total, valor_taxas, valor_du, valor_rav, data_inicio, data_fim, destino_cidade:cidades!destino_cidade_id(id,nome), produto_resolvido:produtos!produto_resolvido_id(id,nome), tipo_produtos:tipo_produtos(id,nome,tipo)), pagamentos:vendas_pagamentos!vendas_pagamentos_venda_id_fkey(*)`
    ];

    let data: any = null;
    let lastError: any = null;

    for (const selectClause of selectClauses) {
      let query = client.from('vendas').select(selectClause).eq('id', id);
      if (companyIds.length > 0) query = query.in('company_id', companyIds);
      if (shouldApplySellerScope && vendedorIds.length > 0) query = query.in('vendedor_id', vendedorIds);

      const result = await query.maybeSingle();
      if (!result.error) {
        data = result.data;
        lastError = null;
        break;
      }
      lastError = result.error;
    }

    if (lastError) throw lastError;
    if (!data) throw error(404, 'Venda não encontrada.');
    return json(data);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar venda.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && !scope.isMaster) ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 3, 'Sem permissão para editar vendas.');

    const id = String(event.params.id || '').trim();
    if (!isUuid(id)) {
      return json({ error: 'ID invalido.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get('vendedor_id'));
    const shouldApplySellerScope = !scope.isGestor && !scope.isMaster;

    let saleScopeQuery = client.from('vendas').select('id, company_id').eq('id', id);
    if (companyIds.length > 0) saleScopeQuery = saleScopeQuery.in('company_id', companyIds);
    if (shouldApplySellerScope && vendedorIds.length > 0) saleScopeQuery = saleScopeQuery.in('vendedor_id', vendedorIds);

    const { data: saleScopeData, error: saleScopeError } = await saleScopeQuery.maybeSingle();
    if (saleScopeError) throw saleScopeError;
    if (!saleScopeData?.id) throw error(404, 'Venda não encontrada.');

    const targetCompanyId = String((saleScopeData as { company_id?: string | null })?.company_id || '').trim() || null;
    if (!isUuid(targetCompanyId || '')) {
      return json(
        {
          code: 'VENDA_SEM_EMPRESA',
          error: 'Venda sem empresa vinculada. Atualize o cadastro da venda antes de editar recibos/pagamentos.'
        },
        { status: 400 }
      );
    }

    const body = await event.request.json();
    const venda = body?.venda || body || {};
    const recibos = Array.isArray(body?.recibos) ? body.recibos : [];
    const pagamentos = Array.isArray(body?.pagamentos) ? body.pagamentos : [];
    console.error('[PATCH venda] body parsed. recibos:', recibos.length, 'pagamentos:', pagamentos.length);

    const vendedorId = String(venda?.vendedor_id || '').trim() || scope.userId;
    const deniedSeller = await ensureAssignableActiveSeller(client, scope, vendedorId);
    if (!isUuid(vendedorId) || deniedSeller) {
      return json({ error: deniedSeller || 'Vendedor invalido.' }, { status: 400 });
    }

    const clienteId = String(venda?.cliente_id || '').trim();
    if (!isUuid(clienteId)) {
      return json({ error: 'Cliente invalido.' }, { status: 400 });
    }

    const destinationId = String(venda?.destino_id || '').trim();
    if (!isUuid(destinationId)) {
      return json({ error: 'Destino invalido.' }, { status: 400 });
    }

    if (!Array.isArray(recibos) || recibos.length === 0) {
      return json({ error: 'Inclua ao menos um recibo.' }, { status: 400 });
    }

    const normalizeReceiptKey = (value?: string | null) =>
      String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normalizeReservaKey = (value?: string | null) =>
      String(value || '').trim().toLowerCase().replace(/\s+/g, '');

    const payloadReceiptKeys = Array.from(
      new Set(recibos.map((item: any) => normalizeReceiptKey(item?.numero_recibo)).filter(Boolean))
    ).sort();
    const payloadReservaKeys = Array.from(
      new Set(recibos.map((item: any) => normalizeReservaKey(item?.numero_reserva)).filter(Boolean))
    ).sort();

    const { data: currentRecibos, error: currentRecibosError } = await client
      .from('vendas_recibos')
      .select('numero_recibo, numero_recibo_normalizado, numero_reserva')
      .eq('venda_id', id);
    if (currentRecibosError) throw currentRecibosError;

    const currentReceiptKeys = Array.from(
      new Set(
        (currentRecibos || [])
          .map((row: any) =>
            normalizeReceiptKey(row?.numero_recibo_normalizado || row?.numero_recibo)
          )
          .filter(Boolean)
      )
    ).sort();
    const currentReservaKeys = Array.from(
      new Set((currentRecibos || []).map((row: any) => normalizeReservaKey(row?.numero_reserva)).filter(Boolean))
    ).sort();

    const sameReceiptSet =
      payloadReceiptKeys.length === currentReceiptKeys.length &&
      payloadReceiptKeys.every((value, index) => value === currentReceiptKeys[index]);
    const sameReservaSet =
      payloadReservaKeys.length === currentReservaKeys.length &&
      payloadReservaKeys.every((value, index) => value === currentReservaKeys[index]);

    if (!sameReceiptSet || !sameReservaSet) {
      try {
        await ensureReciboReservaUnicos({
          client,
          companyId: targetCompanyId,
          clienteId,
          ignoreVendaId: id,
          recibos
        });
      } catch (err) {
        const code = err instanceof Error ? err.message : 'Erro ao validar recibos.';
        if (code === 'RECIBO_DUPLICADO') {
          return json({ code, error: 'Recibo já utilizado em outra venda da empresa.' }, { status: 409 });
        }
        if (code === 'RESERVA_DUPLICADA') {
          return json({ code, error: 'Reserva já vinculada a outro recibo/venda.' }, { status: 409 });
        }
        throw err;
      }
    }

    let payload;
    try {
      payload = buildVendaPayload(venda, vendedorId, clienteId, destinationId, targetCompanyId);
      console.error('[PATCH venda] buildVendaPayload ok:', JSON.stringify(payload));
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      console.error('[PATCH venda] buildVendaPayload error:', code, err);
      if (code === 'DATA_VENDA_INVALIDA') {
        return json({ error: 'Data da venda invalida.' }, { status: 400 });
      }
      throw err;
    }

    let query = client.from('vendas').update(payload).eq('id', id);
    if (companyIds.length > 0) query = query.in('company_id', companyIds);
    if (shouldApplySellerScope && vendedorIds.length > 0) query = query.in('vendedor_id', vendedorIds);
    const { data, error: updateError } = await query.select('id').maybeSingle();
    if (updateError) {
      console.error('[PATCH venda] update vendas error:', updateError);
      throw updateError;
    }
    if (!data?.id) throw error(404, 'Venda não encontrada.');
    console.error('[PATCH venda] update vendas ok. id:', data.id);

    try {
      console.error('[PATCH venda] syncVendaChildren payload:', JSON.stringify({
        vendaId: data.id,
        companyId: targetCompanyId,
        clienteId,
        vendedorId,
        recibosCount: recibos.length,
        pagamentosCount: pagamentos.length,
        recibos: recibos.slice(0, 2),
        pagamentos: pagamentos.slice(0, 2)
      }, null, 2));
      await syncVendaChildren({
        client,
        vendaId: data.id,
        companyId: targetCompanyId,
        clienteId,
        vendedorId,
        userId: user.id,
        recibos,
        pagamentos
      });
    } catch (syncError) {
      console.error('[PATCH venda] syncVendaChildren error:', syncError);
      const mapped = mapSyncChildrenError(syncError);
      if (mapped) {
        return json(mapped.body, { status: mapped.status });
      }
      throw syncError;
    }

    return json({ ok: true, venda_id: data.id });
  } catch (err) {
    console.error('[PATCH venda] catch geral:', err);
    return toErrorResponse(err, 'Erro ao atualizar venda.');
  }
}
