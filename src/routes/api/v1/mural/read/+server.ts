import { isUuid } from '$lib/server/v1';
import { requireMuralScope } from '../_shared';

export async function POST(event) {
  try {
    const { client } = await requireMuralScope(event);
    const body = await event.request.json();
    const id = String(body?.id || '').trim();
    if (!isUuid(id)) return new Response('ID inválido.', { status: 400 });

    const { error } = await client.rpc('mural_recados_mark_read', { target_id: id });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('Erro mural read:', e);
    return new Response(e?.message || 'Erro ao marcar recado como lido.', { status: 500 });
  }
}
