import { json } from '@sveltejs/kit';
import { buildRegistrationOptions } from '$lib/server/passkeys';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  const { session, user } = await event.locals.safeGetSession();
  if (!session || !user) {
    return json({ error: 'Sessao invalida.' }, { status: 401 });
  }

  const payload = await buildRegistrationOptions(event, {
    id: user.id,
    email: user.email
  });

  return json({ ok: true, ...payload });
};
