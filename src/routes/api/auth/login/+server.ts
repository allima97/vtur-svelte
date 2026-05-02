import { createSupabaseServerClient, getSupabaseAuthStorageKey } from '$lib/db/supabase';
import { verifyTurnstileToken } from '$lib/server/turnstile';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    const turnstileToken = String(body?.turnstile_token || body?.turnstileToken || '').trim();

    if (!email || !password) {
      return json({ error: 'Email e senha obrigatorios.' }, { status: 400 });
    }

    let remoteIp: string | null = null;
    try {
      remoteIp = getClientAddress();
    } catch {
      remoteIp = null;
    }

    const turnstile = await verifyTurnstileToken(turnstileToken, remoteIp);
    if (!turnstile.ok) {
      return json({ error: turnstile.message, codes: turnstile.codes ?? [] }, { status: 403 });
    }

    const supabase = createSupabaseServerClient({
      get: (name) => cookies.get(name),
      getAll: () => cookies.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value })),
      set: (name, value, options) => {
        cookies.set(name, value, { ...options, path: '/' });
      },
      remove: (name, options) => {
        cookies.delete(name, { ...options, path: '/' });
      }
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return json({ error: 'Email ou senha incorretos.' }, { status: 401 });
    }

    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    return json({
      ok: true,
      user: data.user,
      session: data.session,
      storageKey: getSupabaseAuthStorageKey()
    });
  } catch (err) {
    console.error('[auth/login] Erro:', err);
    return json({ error: 'Erro ao fazer login.' }, { status: 500 });
  }
};
