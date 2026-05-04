import type { RequestEvent } from '@sveltejs/kit';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readTextBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import { getAdminClient, logServerError, requireAuthenticatedUser } from '$lib/server/v1';
import { normalizeMenuPrefs } from '$lib/server/menuPrefs';

const JSON_NO_STORE_HEADERS = {
  'Content-Type': 'application/json',
  ...NO_STORE_HEADERS
};

const TEXT_NO_STORE_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  ...NO_STORE_HEADERS
};

const MAX_PREFS_BODY_BYTES = 16 * 1024;

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
      headers: JSON_NO_STORE_HEADERS
    });
  } catch (err: any) {
    logServerError('[menu/prefs] falha ao carregar preferencias', err);
    return new Response('Erro ao carregar preferencias do menu.', { status: 500, headers: TEXT_NO_STORE_HEADERS });
  }
}

export async function POST(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;

    const user = await requireAuthenticatedUser(event);
    const client = getAdminClient();

    const textResult = await readTextBodyLimited(event.request, MAX_PREFS_BODY_BYTES);
    if (!textResult.ok) {
      return new Response('Payload muito grande.', { status: 413, headers: TEXT_NO_STORE_HEADERS });
    }

    const rawBody = textResult.text;
    if (rawBody.length > MAX_PREFS_BODY_BYTES) {
      return new Response('Payload muito grande.', { status: 413, headers: TEXT_NO_STORE_HEADERS });
    }

    const body = safeJsonParse(rawBody) as any;
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
      headers: JSON_NO_STORE_HEADERS
    });
  } catch (err: any) {
    logServerError('[menu/prefs] falha ao salvar preferencias', err);
    return new Response('Erro ao salvar preferencias do menu.', { status: 500, headers: TEXT_NO_STORE_HEADERS });
  }
}
