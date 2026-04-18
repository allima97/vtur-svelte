import { json, type RequestEvent } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const body = await event.request.json().catch(() => null);
    if (!body || !body.tipo || !body.valor) {
      return new Response('Dados invalidos.', { status: 400 });
    }

    const tipo = String(body.tipo).trim();
    const valor = String(body.valor).trim();
    if (!tipo || !valor) return new Response('Dados invalidos.', { status: 400 });

    const companyId = scope.companyId;

    let query = client
      .from('roteiro_sugestoes')
      .delete()
      .eq('tipo', tipo)
      .ilike('valor', valor);

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
