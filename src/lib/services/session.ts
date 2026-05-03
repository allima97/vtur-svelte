import { browser } from '$app/environment';
import { supabase } from '$lib/db/supabase';

export async function ensureServerSessionCookie() {
  if (!browser) return;
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) return;

    await fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      })
    });
  } catch {
    // Falha silenciosa: a tela chamadora deve tratar 401/403 no carregamento.
  }
}
