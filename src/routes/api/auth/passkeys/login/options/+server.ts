import { json } from '@sveltejs/kit';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { checkPersistentRateLimit } from '$lib/server/persistentRateLimit';
import { buildAuthenticationOptions, toPasskeyErrorResponse } from '$lib/server/passkeys';
import { isSameOriginRequest } from '$lib/server/requestGuards';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  try {
    if (!isSameOriginRequest(event.request)) {
      return json({ error: 'Origem inválida.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const contentLength = Number(event.request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > 8 * 1024) {
      return json({ error: 'Payload muito grande.' }, { status: 413, headers: NO_STORE_HEADERS });
    }

    const body = await event.request.json().catch(() => ({}));
    const email = String(body?.email || '').trim();
    const remoteIp = event.getClientAddress?.() || 'unknown';

    const rateLimit = await checkPersistentRateLimit('passkey-login-options', `${remoteIp}:${email.toLowerCase() || 'no-email'}`, {
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

    const payload = await buildAuthenticationOptions(event, email || null);
    return json({ ok: true, ...payload }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Erro ao preparar login por passkey.');
  }
};
