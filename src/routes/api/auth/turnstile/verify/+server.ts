import { verifyTurnstileToken } from '$lib/server/turnstile';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    const body = await request.json();
    const token = String(body?.turnstile_token || body?.turnstileToken || '').trim();

    let remoteIp: string | null = null;
    try {
      remoteIp = getClientAddress();
    } catch {
      remoteIp = null;
    }

    const result = await verifyTurnstileToken(token, remoteIp);
    if (!result.ok) {
      return json({ error: result.message, codes: result.codes ?? [] }, { status: 403 });
    }

    return json({ ok: true, skipped: result.skipped ?? false });
  } catch (err) {
    console.error('[turnstile/verify] Erro:', err);
    return json({ error: 'Erro ao validar desafio de segurança.' }, { status: 500 });
  }
};
