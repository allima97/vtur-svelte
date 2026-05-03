import { isUuid } from '$lib/server/v1';
import { assertCompanyAccess, requireMuralScope } from '../_shared';

export async function POST(event) {
  try {
    const { client, user, scope } = await requireMuralScope(event);
    const body = await event.request.json();
    const id = String(body?.id || '').trim();
    if (!isUuid(id)) return new Response('ID inválido.', { status: 400 });

    const { data: recado, error: recadoError } = await client
      .from('mural_recados')
      .select('id, company_id, receiver_id')
      .eq('id', id)
      .maybeSingle();
    if (recadoError) throw recadoError;
    if (!recado) return new Response('Recado não encontrado.', { status: 404 });

    const denied = await assertCompanyAccess(client, scope, String(recado.company_id || '').trim());
    if (denied) return denied;

    if (recado.receiver_id && recado.receiver_id !== user.id) {
      return new Response('Sem permissão para marcar este recado.', { status: 403 });
    }

    const { error } = await client
      .from('mural_recados_leituras')
      .upsert(
        {
          company_id: recado.company_id,
          recado_id: id,
          user_id: user.id,
          read_at: new Date().toISOString()
        },
        { onConflict: 'recado_id,user_id' }
      );
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('Erro mural read:', e);
    return new Response('Erro ao marcar recado como lido.', { status: 500 });
  }
}
