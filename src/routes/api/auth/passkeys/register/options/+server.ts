import { json } from '@sveltejs/kit';
import { buildRegistrationOptions, toPasskeyErrorResponse } from '$lib/server/passkeys';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  try {
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) {
      return json({ error: 'Sessao invalida.' }, { status: 401 });
    }

    const payload = await buildRegistrationOptions(event, {
      id: user.id,
      email: user.email
    });

    return json({ ok: true, ...payload });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Erro ao preparar cadastro da passkey.');
  }
};
