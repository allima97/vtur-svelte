import { json } from '@sveltejs/kit';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { buildRegistrationOptions, toPasskeyErrorResponse } from '$lib/server/passkeys';
import { isSameOriginRequest } from '$lib/server/requestGuards';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  try {
    if (!isSameOriginRequest(event.request)) {
      return json({ error: 'Origem inválida.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

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
