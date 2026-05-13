import { json } from '@sveltejs/kit';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { checkPersistentRateLimit } from '$lib/server/persistentRateLimit';
import { toPasskeyErrorResponse, verifyAuthentication } from '$lib/server/passkeys';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import type { RequestHandler } from './$types';

const MAX_PASSKEY_VERIFY_BODY_BYTES = 32 * 1024;
type AuthenticationResponsePayload = Parameters<typeof verifyAuthentication>[0]['response'];

export const POST: RequestHandler = async (event) => {
  try {
    const originError = rejectCrossOriginRequest(event.request, 'Origem inválida.');
    if (originError) return originError;

    const rateLimit = await checkPersistentRateLimit('passkey-login-verify', event.getClientAddress?.() || 'unknown', {
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

    const bodyResult = await readJsonBodyLimited(event.request, MAX_PASSKEY_VERIFY_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.data && typeof bodyResult.data === 'object'
      ? (bodyResult.data as Record<string, unknown>)
      : {};
    const challengeId = String(body?.challengeId || '').trim();
    const response = body?.response as AuthenticationResponsePayload | undefined;

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
