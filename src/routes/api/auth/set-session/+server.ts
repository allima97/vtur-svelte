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
      getAll: () => cookies.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value })),
      set: (name, value, options) => {
        cookies.set(name, value, { ...options, path: '/' });
      },
      remove: (name, options) => {
        cookies.delete(name, { ...options, path: '/' });
      }
    });

    // Em modo mock/local sem credenciais reais, o cliente pode não expor auth.setSession.
    // Nesses casos, não quebra a navegação e retorna sucesso lógico.
    const setSessionFn = (supabase as any)?.auth?.setSession;
    if (typeof setSessionFn !== 'function') {
      console.warn('[set-session] auth.setSession indisponivel (mock mode ativo).');
      return json({ ok: true, mock: true, storageKey: getSupabaseAuthStorageKey() });
    }

    const { error } = await setSessionFn({
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
