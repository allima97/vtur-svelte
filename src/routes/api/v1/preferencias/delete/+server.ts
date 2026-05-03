import { isUuid } from '$lib/server/v1';
import { requirePreferenciasScope, safeJsonParse } from '../_shared';

export async function POST(event) {
  try {
    const { client, user, scope } = await requirePreferenciasScope(event, 4);
    const body = safeJsonParse(await event.request.text()) as any;
    const id = String(body?.id || '').trim();
    if (!isUuid(id)) return new Response('id invalido.', { status: 400 });

    let query = client.from('minhas_preferencias').delete().eq('id', id);
    if (!scope.isAdmin) query = query.eq('created_by', user.id);

    const { data, error } = await query.select('id').maybeSingle();
    if (error) throw error;
    if (!data) return new Response('Preferência não encontrada.', { status: 404 });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Erro preferencias/delete', err);
    return new Response('Erro ao excluir preferência.', { status: 500 });
  }
}
