import { json, type RequestEvent } from '@sveltejs/kit';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  sanitizePostgrestSearchTerm,
  toErrorResponse
} from '$lib/server/v1';

const MAX_ROTEIRO_SUGESTAO_BODY_BYTES = 16 * 1024;

export async function POST(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_ROTEIRO_SUGESTAO_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : null;
    if (!body || !body.tipo || !body.valor) {
      return new Response('Dados invalidos.', { status: 400 });
    }

    const tipo = String(body.tipo).trim().slice(0, 60);
    const valor = String(body.valor).trim().slice(0, 160);
    if (!tipo || !valor) return new Response('Dados invalidos.', { status: 400 });
    const valorBusca = sanitizePostgrestSearchTerm(valor, 160);
    if (!valorBusca) return new Response('Dados invalidos.', { status: 400 });

    const companyId = scope.companyId;

    // Verifica duplicata (case-insensitive)
    const { data: existing } = await client
      .from('roteiro_sugestoes')
      .select('id, uso_count')
      .eq('company_id', companyId)
      .eq('tipo', tipo)
      .ilike('valor', valorBusca)
      .maybeSingle();

    if (existing) {
      // Já existe – incrementa contagem de uso
      await client
        .from('roteiro_sugestoes')
        .update({
          uso_count: ((existing as any).uso_count || 1) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', (existing as any).id);

      return json({ ok: true, novo: false });
    }

    // Insere novo
    const { error } = await client.from('roteiro_sugestoes').insert({
      company_id: companyId,
      tipo,
      valor,
      uso_count: 1
    });
    if (error) throw error;

    return json({ ok: true, novo: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar sugestao.');
  }
}
