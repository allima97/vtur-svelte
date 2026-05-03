import { json } from '@sveltejs/kit';
import { buildRegistrationOptions, toPasskeyErrorResponse } from '$lib/server/passkeys';
import type { RequestHandler } from './$types';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export const POST: RequestHandler = async (event) => {
  try {
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) {
      return json({ error: 'Sessao invalida.' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const payload = await buildRegistrationOptions(event, {
      id: user.id,
      email: user.email
    });

    return json({ ok: true, ...payload }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Erro ao preparar cadastro da passkey.');
  }
};
