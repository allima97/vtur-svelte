import { json } from '@sveltejs/kit';
import { toPasskeyErrorResponse, verifyAuthentication } from '$lib/server/passkeys';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json().catch(() => ({}));
    const challengeId = String(body?.challengeId || '').trim();
    const response = body?.response;

    if (!challengeId || !response) {
      return json({ error: 'Dados da passkey incompletos.' }, { status: 400 });
    }

    const sessionPayload = await verifyAuthentication({
      event,
      challengeId,
      response
    });

    return json({ ok: true, ...sessionPayload });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Não foi possível entrar com passkey.');
  }
};
