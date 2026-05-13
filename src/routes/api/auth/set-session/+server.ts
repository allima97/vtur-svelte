import { createSupabaseServerClient, getSupabaseAuthStorageKey } from '$lib/db/supabase';
import { dev } from '$app/environment';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import { logServerError } from '$lib/server/v1';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_SET_SESSION_BODY_BYTES = 16 * 1024;

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const originError = rejectCrossOriginRequest(request, 'Origem inválida.');
    if (originError) return originError;

    const bodyResult = await readJsonBodyLimited(request, MAX_SET_SESSION_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.data as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return json({ error: 'Payload invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { access_token, refresh_token } = body as { access_token?: string; refresh_token?: string };
    
    if (!access_token || !refresh_token) {
      return json({ error: 'Tokens obrigatorios' }, { status: 400, headers: NO_STORE_HEADERS });
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
    if (typeof supabase?.auth?.setSession !== 'function') {
      if (dev) console.warn('[set-session] auth.setSession indisponivel (mock mode ativo).');
      return json({ ok: true, mock: true, storageKey: getSupabaseAuthStorageKey() }, { headers: NO_STORE_HEADERS });
    }

    // Chama diretamente em supabase.auth para preservar o contexto 'this' do GoTrueClient
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (error) {
      logServerError('[set-session] falha ao sincronizar sessao', error);
      return json({ error: 'Sessao invalida ou expirada.' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    // Limpa cookies legados que nao sao lidos pelo @supabase/ssr.
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    return json({ ok: true, storageKey: getSupabaseAuthStorageKey() }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logServerError('[set-session] erro ao definir sessao', err);
    return json({ error: 'Erro ao definir sessao' }, { status: 500, headers: NO_STORE_HEADERS });
  }
};
