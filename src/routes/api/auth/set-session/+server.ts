import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { access_token, refresh_token } = await request.json();
    
    if (!access_token || !refresh_token) {
      return json({ error: 'Tokens obrigatorios' }, { status: 400 });
    }
    
    // Configurações do cookie
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Salva os tokens nos cookies que o Supabase SSR client espera
    // São os nomes padrão: sb-access-token e sb-refresh-token
    cookies.set('sb-access-token', access_token, {
      path: '/',
      httpOnly: true, // SSR can read, client-side JS cannot access for security
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });
    
    cookies.set('sb-refresh-token', refresh_token, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 dias
    });
    
    console.log('[set-session] Cookies configurados com sucesso');
    
    return json({ ok: true });
  } catch (err) {
    console.error('[set-session] Erro:', err);
    return json({ error: 'Erro ao definir sessao' }, { status: 500 });
  }
};
