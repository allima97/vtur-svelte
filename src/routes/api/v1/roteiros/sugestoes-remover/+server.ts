import { json, type RequestEvent } from '@sveltejs/kit';
import { rejectCrossOriginRequest, rejectLargePayload } from '$lib/server/requestGuards';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

const MAX_ROTEIRO_SUGESTAO_REMOVE_BODY_BYTES = 16 * 1024;

export async function POST(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const sizeError = rejectLargePayload(event.request, MAX_ROTEIRO_SUGESTAO_REMOVE_BODY_BYTES);
    if (sizeError) return sizeError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const body = await event.request.json().catch(() => null);
    if (!body || !body.tipo || !body.valor) {
      return new Response('Dados invalidos.', { status: 400 });
    }

    const tipo = String(body.tipo).trim().slice(0, 60);
    const valor = String(body.valor).trim().slice(0, 160);
    if (!tipo || !valor) return new Response('Dados invalidos.', { status: 400 });

    const companyId = scope.companyId;

    let query = client
      .from('roteiro_sugestoes')
      .delete()
      .eq('tipo', tipo)
      .eq('valor', valor);

    if (companyId) {
      query = query.eq('company_id', companyId);
    } else {
      query = query.is('company_id', null);
    }

    const { error } = await query;
    if (error) throw error;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao remover sugestao.');
  }
}
