import { json } from '@sveltejs/kit';
import { checkRateLimit } from '$lib/server/rateLimit';
import { toPasskeyErrorResponse, verifyAuthentication } from '$lib/server/passkeys';
import type { RequestHandler } from './$types';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export const POST: RequestHandler = async (event) => {
  try {
    const rateLimit = checkRateLimit(`passkey-login-verify:${event.getClientAddress?.() || 'unknown'}`, {
      max: 30,
      windowMs: 60_000
    });
    if (!rateLimit.allowed) {
      return json(
        { error: 'Muitas tentativas de passkey. Tente novamente em instantes.' },
        {
          status: 429,
          headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) }
        }
      );
    }

    const contentLength = Number(event.request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > 32 * 1024) {
      return json({ error: 'Payload muito grande.' }, { status: 413, headers: NO_STORE_HEADERS });
    }

    const body = await event.request.json().catch(() => ({}));
    const challengeId = String(body?.challengeId || '').trim();
    const response = body?.response;

    if (!challengeId || !response) {
      return json({ error: 'Dados da passkey incompletos.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const sessionPayload = await verifyAuthentication({
      event,
      challengeId,
      response
    });

    return json({ ok: true, ...sessionPayload }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Não foi possível entrar com passkey.');
  }
};
