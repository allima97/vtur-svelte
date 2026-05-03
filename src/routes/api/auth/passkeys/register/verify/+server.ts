import { json } from '@sveltejs/kit';
import { toPasskeyErrorResponse, verifyRegistration } from '$lib/server/passkeys';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  try {
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) {
      return json({ error: 'Sessao invalida.' }, { status: 401 });
    }

    const body = await event.request.json().catch(() => ({}));
    const challengeId = String(body?.challengeId || '').trim();
    const response = body?.response;
    const name = String(body?.name || 'Passkey').trim();

    if (!challengeId || !response) {
      return json({ error: 'Dados da passkey incompletos.' }, { status: 400 });
    }

    await verifyRegistration({
      event,
      user: { id: user.id, email: user.email },
      challengeId,
      response,
      name
    });

    return json({ ok: true });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Erro ao cadastrar passkey.');
  }
};
