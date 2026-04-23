import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['viagens', 'operacao'], 2, 'Sem acesso a Viagens.');
    }

    const body = await event.request.json();
    const origem = String(body?.origem || '').trim();
    const destino = String(body?.destino || '').trim();
    const dataInicio = String(body?.data_inicio || '').trim();
    const dataFim = String(body?.data_fim || '').trim() || null;
    const statusRaw = String(body?.status || 'planejada').trim().toLowerCase();
    const status = ['planejada', 'programada', 'confirmada', 'em_viagem', 'em_andamento', 'concluida', 'cancelada'].includes(statusRaw)
      ? statusRaw
      : 'planejada';
    const clienteId = String(body?.cliente_id || '').trim();
    const observacoes = String(body?.observacoes || '').trim() || null;
    const followUpText = String(body?.follow_up_text || '').trim() || null;
    const followUpFechado = Boolean(body?.follow_up_fechado);
    const requestedCompanyId = isUuid(body?.company_id) ? String(body.company_id) : null;

    if (!origem || !destino || !dataInicio || !clienteId) {
      return json({ error: 'Dados obrigatorios ausentes.' }, { status: 400 });
    }

    const { data: clienteRow, error: clienteError } = await client
      .from('clientes')
      .select('id, company_id')
      .eq('id', clienteId)
      .maybeSingle();

    if (clienteError) throw clienteError;
    if (!clienteRow?.id) {
      return json({ error: 'Cliente não encontrado.' }, { status: 400 });
    }

    const scopedCompanyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
    const clienteCompanyId = isUuid(clienteRow.company_id) ? String(clienteRow.company_id) : null;
    const companyId =
      clienteCompanyId ||
      scopedCompanyIds[0] ||
      scope.companyId ||
      scope.companyIds[0] ||
      null;

    if (!companyId) {
      return json({ error: 'Não foi possível determinar a empresa da viagem.' }, { status: 400 });
    }

    if (!scope.isAdmin && scope.companyIds.length > 0 && !scope.companyIds.includes(companyId)) {
      return json({ error: 'Sem acesso ao cliente selecionado.' }, { status: 403 });
    }

    const payload = {
      company_id: companyId,
      responsavel_user_id: user.id,
      cliente_id: clienteId,
      origem,
      destino,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status,
      observacoes,
      follow_up_text: followUpText,
      follow_up_fechado: followUpFechado,
      orcamento_id: null
    };

    const { data, error } = await client
      .from('viagens')
      .insert(payload)
      .select('id, cliente_id, origem, destino, data_inicio, data_fim, status')
      .single();

    if (error) throw error;

    return json({ ok: true, viagem: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao criar viagem.');
  }
}
