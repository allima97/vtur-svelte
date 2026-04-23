import { createSupabaseServerClient, getSupabaseAuthStorageKey } from '$lib/db/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { access_token, refresh_token } = await request.json();
    
    if (!access_token || !refresh_token) {
      return json({ error: 'Tokens obrigatorios' }, { status: 400 });
    }

    const supabase = createSupabaseServerClient({
      get: (name) => cookies.get(name),
      set: (name, value, options) => {
        cookies.set(name, value, { ...options, path: '/' });
      },
      remove: (name, options) => {
        cookies.delete(name, { ...options, path: '/' });
      }
    });

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (error) {
      console.error('[set-session] Falha ao sincronizar sessao:', error);
      return json({ error: error.message || 'Erro ao definir sessao' }, { status: 401 });
    }

    // Limpa cookies legados que nao sao lidos pelo @supabase/ssr.
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    console.log('[set-session] Sessao sincronizada com sucesso');

    return json({ ok: true, storageKey: getSupabaseAuthStorageKey() });
  } catch (err) {
    console.error('[set-session] Erro:', err);
    return json({ error: 'Erro ao definir sessao' }, { status: 500 });
  }
};
