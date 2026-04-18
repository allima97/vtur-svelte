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

    // Verifica duplicata (case-insensitive)
    const { data: existing } = await client
      .from('roteiro_sugestoes')
      .select('id, uso_count')
      .eq('company_id', companyId)
      .eq('tipo', tipo)
      .ilike('valor', valor)
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
