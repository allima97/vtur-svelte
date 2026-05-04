import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { checkPersistentRateLimit } from '$lib/server/persistentRateLimit';
import { isSameOriginRequest } from '$lib/server/requestGuards';
import { verifyTurnstileToken } from '$lib/server/turnstile';
import { logServerError } from '$lib/server/v1';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    if (!isSameOriginRequest(request)) {
      return json({ error: 'Origem inválida.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    let remoteIp: string | null = null;
    try {
      remoteIp = getClientAddress();
    } catch {
      remoteIp = null;
    }

    const rateLimit = await checkPersistentRateLimit('turnstile-verify', remoteIp || 'unknown', {
      max: 120,
      windowMs: 60_000
    });
    if (!rateLimit.allowed) {
      return json(
        { error: 'Muitas validações. Tente novamente em instantes.' },
        {
          status: 429,
          headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) }
        }
      );
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > 4 * 1024) {
      return json({ error: 'Payload muito grande.' }, { status: 413, headers: NO_STORE_HEADERS });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return json({ error: 'Payload invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const token = String(body?.turnstile_token || body?.turnstileToken || '').trim();

    const result = await verifyTurnstileToken(token, remoteIp);
    if (!result.ok) {
      return json({ error: result.message, codes: result.codes ?? [] }, { status: 403, headers: NO_STORE_HEADERS });
    }

    return json({ ok: true, skipped: result.skipped ?? false }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logServerError('[turnstile/verify] erro ao validar desafio', err);
    return json({ error: 'Erro ao validar desafio de segurança.' }, { status: 500, headers: NO_STORE_HEADERS });
  }
};
