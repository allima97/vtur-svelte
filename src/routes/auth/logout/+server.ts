import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function isSameSiteLogoutRequest(request: Request) {
  const fetchSite = String(request.headers.get('sec-fetch-site') || '').toLowerCase();
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (!origin && !referer) return true;

  const url = new URL(request.url);
  const expectedOrigin = url.origin;
  if (origin && origin !== expectedOrigin) return false;
  if (referer) {
    try {
      if (new URL(referer).origin !== expectedOrigin) return false;
    } catch {
      return false;
    }
  }

  return true;
}

export const GET: RequestHandler = async ({ request, locals: { supabase } }) => {
  if (!isSameSiteLogoutRequest(request)) {
    throw redirect(302, '/auth/login');
  }

  await supabase.auth.signOut();
  throw redirect(302, '/auth/login');
};

export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
  if (!isSameSiteLogoutRequest(request)) {
    return json({ error: 'Origem inválida.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  await supabase.auth.signOut();
  return json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
};
