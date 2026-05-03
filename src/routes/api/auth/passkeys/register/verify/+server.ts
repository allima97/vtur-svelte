import { json } from '@sveltejs/kit';
import { toPasskeyErrorResponse, verifyRegistration } from '$lib/server/passkeys';
import type { RequestHandler } from './$types';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export const POST: RequestHandler = async (event) => {
  try {
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) {
      return json({ error: 'Sessao invalida.' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const contentLength = Number(event.request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > 32 * 1024) {
      return json({ error: 'Payload muito grande.' }, { status: 413, headers: NO_STORE_HEADERS });
    }

    const body = await event.request.json().catch(() => ({}));
    const challengeId = String(body?.challengeId || '').trim();
    const response = body?.response;
    const name = String(body?.name || 'Passkey').trim();

    if (!challengeId || !response) {
      return json({ error: 'Dados da passkey incompletos.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    await verifyRegistration({
      event,
      user: { id: user.id, email: user.email },
      challengeId,
      response,
      name
    });

    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Erro ao cadastrar passkey.');
  }
};
