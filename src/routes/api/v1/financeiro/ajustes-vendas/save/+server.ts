import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function parsePercent(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

function isRateioTableMissingError(err: unknown) {
  const code = String((err as any)?.code || '').trim();
  const message = String((err as any)?.message || '').toLowerCase();
  return (
    code === '42P01' &&
    (message.includes('vendas_recibos_rateio') || message.includes('does not exist'))
  );
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ['conciliacao', 'vendas_consulta', 'vendas'],
        3,
        'Sem permissao para editar Ajustes de Vendas.'
      );
    }

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      return json(
        { error: 'Somente gestor/master podem editar Ajustes de Vendas.' },
        { status: 403 }
      );
    }

    const body = await event.request.json().catch(() => null);
    const ajusteId = String(body?.ajuste_id || '').trim();
    const vendaReciboIdRaw = String(body?.venda_recibo_id || '').trim();
    const vendedorDestinoId = String(body?.vendedor_destino_id || '').trim();
    const percentualDestino = parsePercent(body?.percentual_destino);
    const observacao = String(body?.observacao || '').trim();

    const isConciliacao = ajusteId.startsWith('cr:');
    const rawId = ajusteId
      ? ajusteId.replace(/^vr:/, '').replace(/^cr:/, '').trim()
      : vendaReciboIdRaw;

    if (!isUuid(rawId)) {
      return json({ error: 'Identificador do recibo invalido.' }, { status: 400 });
    }

    if (percentualDestino === null || percentualDestino < 0 || percentualDestino >= 100) {
      return json({ error: 'percentual_destino deve ser >= 0 e < 100.' }, { status: 400 });
    }

    const companyId = scope.companyId;
    if (!companyId && !scope.isAdmin) {
      return json({ error: 'company_id nao resolvido.' }, { status: 400 });
    }

    let vendedorOrigemId = '';
    let keyColumn: 'venda_recibo_id' | 'conciliacao_recibo_id' = 'venda_recibo_id';

    if (!isConciliacao) {
      // Recibo de venda normal
      const { data: reciboRow, error: reciboError } = await client
        .from('vendas_recibos')
        .select(
          `
            id,
            venda_id,
            vendas!inner (
              id,
              vendedor_id,
              company_id,
              cancelada
            )
          `
        )
        .eq('id', rawId)
        .eq('vendas.cancelada', false)
        .maybeSingle();

      if (reciboError) throw reciboError;
      if (!reciboRow) return json({ error: 'Recibo nao encontrado.' }, { status: 404 });

      const reciboCompany = String((reciboRow as any)?.vendas?.company_id || '').trim();
      if (!scope.isAdmin && companyId && reciboCompany !== companyId) {
        return json({ error: 'Recibo fora do escopo da empresa.' }, { status: 403 });
      }

      vendedorOrigemId = String((reciboRow as any)?.vendas?.vendedor_id || '').trim();
      keyColumn = 'venda_recibo_id';
    } else {
      // Recibo de conciliação
      const { data: concRow, error: concErr } = await client
        .from('conciliacao_recibos')
        .select('id, company_id, ranking_vendedor_id, venda_id')
        .eq('id', rawId)
        .maybeSingle();

      if (concErr) throw concErr;
      if (!concRow) return json({ error: 'Recibo da conciliacao nao encontrado.' }, { status: 404 });

      const concCompany = String((concRow as any)?.company_id || '').trim();
      if (!scope.isAdmin && companyId && concCompany !== companyId) {
        return json({ error: 'Recibo de conciliacao fora do escopo da empresa.' }, { status: 403 });
      }

      vendedorOrigemId = String((concRow as any)?.ranking_vendedor_id || '').trim();

      // Fallback: buscar vendedor_id na venda associada
      if (!isUuid(vendedorOrigemId)) {
        const vendaId = String((concRow as any)?.venda_id || '').trim();
        if (isUuid(vendaId)) {
          const { data: vendaRow, error: vendaErr } = await client
            .from('vendas')
            .select('id, vendedor_id, company_id, cancelada')
            .eq('id', vendaId)
            .eq('cancelada', false)
            .maybeSingle();
          if (vendaErr) throw vendaErr;
          vendedorOrigemId = String((vendaRow as any)?.vendedor_id || '').trim();
        }
      }

      keyColumn = 'conciliacao_recibo_id';
    }

    if (!isUuid(vendedorOrigemId)) {
      return json({ error: 'Venda sem vendedor valido para rateio.' }, { status: 400 });
    }

    // Limpar rateio quando percentual_destino = 0
    if (percentualDestino === 0) {
      const { error: deleteError } = await client
        .from('vendas_recibos_rateio')
        .delete()
        .eq(keyColumn, rawId)
        .eq('company_id', companyId ?? '');
      if (deleteError) throw deleteError;

      return json({ ok: true, cleared: true });
    }

    if (!isUuid(vendedorDestinoId)) {
      return json({ error: 'vendedor_destino_id invalido.' }, { status: 400 });
    }

    if (vendedorDestinoId === vendedorOrigemId) {
      return json(
        { error: 'O vendedor destino deve ser diferente do vendedor de origem.' },
        { status: 400 }
      );
    }

    // Restrição de gestor: só pode ratear vendas da própria equipe
    if (scope.isGestor) {
      const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
      const equipeSet = new Set(equipeIds.map((id) => String(id || '').trim()));
      if (!equipeSet.has(vendedorOrigemId) || !equipeSet.has(vendedorDestinoId)) {
        return json(
          { error: 'Gestor so pode ratear vendas da propria equipe.' },
          { status: 403 }
        );
      }
    }

    // Confirmar que vendedor destino existe e está ativo na empresa
    const { data: destinoUser, error: destinoError } = await client
      .from('users')
      .select('id, company_id, active')
      .eq('id', vendedorDestinoId)
      .eq('active', true)
      .maybeSingle();
    if (destinoError) throw destinoError;
    if (!destinoUser) {
      return json({ error: 'Vendedor destino nao encontrado ou inativo.' }, { status: 400 });
    }
    if (!scope.isAdmin && destinoUser.company_id !== companyId) {
      return json({ error: 'Vendedor destino fora do escopo da empresa.' }, { status: 403 });
    }

    const percentualOrigem = Math.round((100 - percentualDestino) * 100) / 100;
    if (percentualOrigem <= 0) {
      return json(
        { error: 'percentual_destino invalido: origem deve ficar com percentual > 0.' },
        { status: 400 }
      );
    }

    const payload = {
      venda_recibo_id: keyColumn === 'venda_recibo_id' ? rawId : null,
      conciliacao_recibo_id: keyColumn === 'conciliacao_recibo_id' ? rawId : null,
      company_id: companyId,
      vendedor_origem_id: vendedorOrigemId,
      vendedor_destino_id: vendedorDestinoId,
      percentual_origem: percentualOrigem,
      percentual_destino: percentualDestino,
      ativo: true,
      observacao: observacao || null,
      updated_by: user.id,
      created_by: user.id
    };

    // Upsert: tenta atualizar linha existente; se não houver, insere
    const { data: updatedRows, error: updateError } = await client
      .from('vendas_recibos_rateio')
      .update(payload)
      .eq(keyColumn, rawId)
      .eq('company_id', companyId ?? '')
      .select('id');
    if (updateError) throw updateError;

    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      const { error: insertError } = await client
        .from('vendas_recibos_rateio')
        .insert(payload);
      if (insertError) throw insertError;
    }

    return json({ ok: true });
  } catch (err) {
    if (isRateioTableMissingError(err)) {
      return new Response(
        'Ajustes de Vendas indisponivel: aplique a migration 20260412_vendas_recibos_rateio.sql.',
        { status: 409 }
      );
    }
    return toErrorResponse(err, 'Erro ao salvar ajuste de venda.');
  }
}
