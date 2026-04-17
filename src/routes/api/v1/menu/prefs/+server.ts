import type { RequestEvent } from '@sveltejs/kit';
import { requireAuthenticatedUser } from '$lib/server/v1';
import { getAdminClient } from '$lib/server/v1';
import { normalizeMenuPrefs } from '$lib/server/menuPrefs';

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function GET(event: RequestEvent) {
  try {
    const user = await requireAuthenticatedUser(event);
    const client = getAdminClient();

    const { data, error } = await client
      .from('menu_prefs')
      .select('prefs, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;

    const prefs = normalizeMenuPrefs(data?.prefs);

    return new Response(JSON.stringify({ prefs, updated_at: data?.updated_at ?? null }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
        Vary: 'Cookie'
      }
    });
  } catch (err: any) {
    console.error('Erro menu/prefs GET', err);
    return new Response('Erro ao carregar preferencias do menu.', { status: 500 });
  }
}

export async function POST(event: RequestEvent) {
  try {
    const user = await requireAuthenticatedUser(event);
    const client = getAdminClient();

    const body = safeJsonParse(await event.request.text()) as any;
    const nextPrefs = normalizeMenuPrefs(body?.prefs);

    const payload = {
      user_id: user.id,
      prefs: nextPrefs as any,
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from('menu_prefs').upsert(payload, {
      onConflict: 'user_id'
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Erro menu/prefs POST', err);
    return new Response('Erro ao salvar preferencias do menu.', { status: 500 });
  }
}
